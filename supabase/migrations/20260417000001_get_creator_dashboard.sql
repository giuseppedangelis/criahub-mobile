-- PERF-01 (D-14/D-15): RPC agregada para o Creator Dashboard do mobile.
--
-- Substitui 11+ round-trips feitos por src/services/dashboard.ts por uma
-- única chamada RPC que retorna CreatorDashboardData (counters + activity +
-- warnings). SECURITY INVOKER garante que RLS do chamador continua em
-- vigor — a função NÃO escala privilégios.
--
-- Shape do retorno (jsonb):
--   {
--     counters: {
--       totalAnimals, activeGestations, pendingServices, animalsNeedingCare,
--       atHaras, away, monthlyRevenue, monthlyExpenses
--     },
--     activity: [ { id, type, title, detail, date, amount?, variant? }, ... ],
--     warnings: []  -- sempre vazio pelo SQL; cliente adiciona warnings só
--                     em casos de fallback/erro
--   }
--
-- IDs em activity são prefixados:
--   - "tx-<uuid>" para transactions
--   - "ev-<uuid>" para events
--   - "tk-<uuid>" para tasks
--   - "rp-<uuid>" para reproductive_events

create or replace function public.get_creator_dashboard(
  p_haras_id uuid,
  p_activity_limit int default 10
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_next_month date := (date_trunc('month', (now() at time zone 'utc')) + interval '1 month')::date;
  v_total_animals int;
  v_at_haras int;
  v_away int;
  v_active_gestations int;
  v_pending_services int;
  v_care_count int;
  v_monthly_revenue numeric;
  v_monthly_expenses numeric;
  v_activity jsonb;
begin
  -- total de animais ativos + presença em paralelo lógico
  select
    count(*) filter (where status = 'Ativo'),
    count(*) filter (where status = 'Ativo' and is_at_haras is true),
    count(*) filter (where status = 'Ativo' and is_at_haras is false)
  into v_total_animals, v_at_haras, v_away
  from public.animals
  where haras_id = p_haras_id;

  -- gestações em andamento
  select count(*)
  into v_active_gestations
  from public.gestations
  where haras_id = p_haras_id
    and status ilike 'em andamento%';

  -- serviços pendentes (events)
  select count(*)
  into v_pending_services
  from public.events
  where haras_id = p_haras_id
    and status = 'Pendente'
    and data_inicio >= v_today;

  -- animais precisando de cuidado: vacinas atrasadas UNION status_manejo em
  -- tratamento/observação/coleta. Deduplicamos por animal_id via union.
  with care_ids as (
    select animal_id as id
    from public.vaccines
    where haras_id = p_haras_id
      and data_proxima_dose is not null
      and data_proxima_dose < v_today
    union
    select id
    from public.animals
    where haras_id = p_haras_id
      and status = 'Ativo'
      and status_manejo in ('Em tratamento', 'Em observacao', 'Em coleta')
  )
  select count(distinct id)
  into v_care_count
  from care_ids
  where id is not null;

  -- financeiro mensal
  select
    coalesce(sum(case when lower(tipo) = 'receita' then coalesce(valor, 0) else 0 end), 0),
    coalesce(sum(case when lower(tipo) = 'despesa' then coalesce(valor, 0) else 0 end), 0)
  into v_monthly_revenue, v_monthly_expenses
  from public.transactions
  where haras_id = p_haras_id
    and data_transacao >= v_month_start
    and data_transacao < v_next_month;

  -- atividade recente: CTE por fonte com LIMIT local, UNION ALL, sort final
  with tx as (
    select
      'tx-' || id::text as id,
      'transaction'::text as type,
      coalesce(descricao,
        case when lower(coalesce(tipo, '')) = 'receita' then 'Receita' else 'Despesa' end
      ) as title,
      tipo as detail,
      coalesce(data_transacao::text, created_at::text) as date,
      coalesce(valor, 0)::numeric as amount,
      case
        when lower(coalesce(tipo, '')) = 'receita' then 'income'
        else 'expense'
      end as variant
    from public.transactions
    where haras_id = p_haras_id
    order by data_transacao desc nulls last, created_at desc
    limit p_activity_limit
  ),
  ev as (
    select
      'ev-' || id::text as id,
      'event'::text as type,
      coalesce(titulo, tipo, 'Evento') as title,
      nullif(concat_ws(' • ', tipo, status), '') as detail,
      coalesce(data_inicio::text, created_at::text) as date,
      null::numeric as amount,
      case when lower(coalesce(status, '')) = 'pendente' then 'pending' else 'done' end as variant
    from public.events
    where haras_id = p_haras_id
    order by data_inicio desc nulls last, created_at desc
    limit p_activity_limit
  ),
  tk as (
    select
      'tk-' || id::text as id,
      'task'::text as type,
      coalesce(title, 'Tarefa') as title,
      status as detail,
      coalesce(completed_at::text, due_date::text, created_at::text) as date,
      null::numeric as amount,
      case when lower(coalesce(status, '')) = 'concluida' then 'done' else 'pending' end as variant
    from public.tasks
    where haras_id = p_haras_id
    order by created_at desc
    limit p_activity_limit
  ),
  rp as (
    select
      'rp-' || id::text as id,
      'reproduction'::text as type,
      case event_type
        when 'cobertura' then 'Cobertura'
        when 'inseminacao' then 'Inseminação'
        when 'coleta_ovulos' then 'Coleta de óvulos'
        when 'transferencia_embriao' then 'Transferência de embrião'
        when 'diagnostico_gestacao' then 'Diagnóstico de gestação'
        when 'parto' then 'Parto'
        when 'aborto' then 'Aborto'
        when 'ovulacao' then 'Ovulação'
        when 'aplicacao_p4' then 'Aplicação P4'
        else coalesce(event_type, 'Evento reprodutivo')
      end as title,
      observations as detail,
      coalesce(event_date::text, created_at::text) as date,
      null::numeric as amount,
      'info'::text as variant
    from public.reproductive_events
    where haras_id = p_haras_id
    order by event_date desc nulls last, created_at desc
    limit p_activity_limit
  ),
  merged as (
    select * from tx
    union all select * from ev
    union all select * from tk
    union all select * from rp
  ),
  sorted as (
    select jsonb_build_object(
      'id', id,
      'type', type,
      'title', title,
      'detail', detail,
      'date', date,
      'amount', amount,
      'variant', variant
    ) as item
    from merged
    order by date desc nulls last
    limit p_activity_limit
  )
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into v_activity
  from sorted;

  return jsonb_build_object(
    'counters', jsonb_build_object(
      'totalAnimals', coalesce(v_total_animals, 0),
      'activeGestations', coalesce(v_active_gestations, 0),
      'pendingServices', coalesce(v_pending_services, 0),
      'animalsNeedingCare', coalesce(v_care_count, 0),
      'atHaras', coalesce(v_at_haras, 0),
      'away', coalesce(v_away, 0),
      'monthlyRevenue', coalesce(v_monthly_revenue, 0),
      'monthlyExpenses', coalesce(v_monthly_expenses, 0)
    ),
    'activity', coalesce(v_activity, '[]'::jsonb),
    'warnings', '[]'::jsonb
  );
end;
$$;

comment on function public.get_creator_dashboard(uuid, int) is
  'PERF-01: dashboard agregado do criador — substitui ~11 round-trips do mobile. SECURITY INVOKER preserva RLS do chamador.';

grant execute on function public.get_creator_dashboard(uuid, int) to authenticated;
