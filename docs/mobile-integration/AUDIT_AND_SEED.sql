-- Mobile integration audit + minimal seed for homologation
-- Run in Supabase SQL editor against NON-PRODUCTION first.

-- 1) Quick tenant audit
select role, count(*) as total, count(*) filter (where haras_id is null) as sem_haras
from profiles
group by role
order by total desc;

select p.email, p.role, p.haras_id as profile_haras_id, hm.haras_id as member_haras_id, hm.status
from profiles p
left join haras_members hm on hm.user_id = p.id
where p.role in ('criador', 'veterinario', 'peao', 'funcionario')
order by p.role, p.email;

-- 2) Data coverage per module
select 'animals' as table_name, count(*)::int as total from animals
union all select 'events', count(*)::int from events
union all select 'reproductive_events', count(*)::int from reproductive_events
union all select 'gestations', count(*)::int from gestations
union all select 'tasks', count(*)::int from tasks
union all select 'documents', count(*)::int from documents
union all select 'animal_videos', count(*)::int from animal_videos
union all select 'awards', count(*)::int from awards
union all select 'health_records', count(*)::int from health_records
order by table_name;

-- 3) Minimal seed for one haras (idempotent)
-- Replace this UUID when needed.
with seed_haras as (
  select '5d6f9306-4c3b-42f3-b2fd-f42282254c89'::uuid as haras_id
),
mare as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Fêmea'
  order by nome asc
  limit 1
),
stallion as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Macho'
  order by nome asc
  limit 1
)
insert into events (haras_id, titulo, descricao, data_inicio, tipo, status, local, responsavel, animal_id)
select
  s.haras_id,
  'Revisão de casco',
  'Evento de validação para agenda mobile',
  now() + interval '1 day',
  'Casqueamento',
  'Pendente',
  'Piquete 3',
  'Equipe Vet',
  m.id
from seed_haras s
join mare m on true
where not exists (
  select 1 from events e
  where e.haras_id = s.haras_id and e.titulo = 'Revisão de casco'
);

with seed_haras as (
  select '5d6f9306-4c3b-42f3-b2fd-f42282254c89'::uuid as haras_id
),
mare as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Fêmea'
  order by nome asc
  limit 1
),
stallion as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Macho'
  order by nome asc
  limit 1
)
insert into reproductive_events (haras_id, animal_id, mare_id, stallion_id, event_type, event_date, status, observations)
select
  s.haras_id,
  m.id,
  m.id,
  st.id,
  'inseminacao',
  current_date,
  'Pendente',
  'Evento reprodutivo para validação'
from seed_haras s
join mare m on true
join stallion st on true
where not exists (
  select 1 from reproductive_events r
  where r.haras_id = s.haras_id and r.observations = 'Evento reprodutivo para validação'
);

with seed_haras as (
  select '5d6f9306-4c3b-42f3-b2fd-f42282254c89'::uuid as haras_id
),
mare as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Fêmea'
  order by nome asc
  limit 1
),
stallion as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Macho'
  order by nome asc
  limit 1
)
insert into gestations (haras_id, egua_id, garanhao_id, data_diagnostico, data_prevista_parto, status, tipo_diagnostico, observacoes)
select
  s.haras_id,
  m.id,
  st.id,
  current_date,
  current_date + interval '330 day',
  'Em andamento',
  'Ultrassom',
  'Gestação de validação'
from seed_haras s
join mare m on true
join stallion st on true
where not exists (
  select 1 from gestations g
  where g.haras_id = s.haras_id and g.observacoes = 'Gestação de validação'
);

with seed_haras as (
  select '5d6f9306-4c3b-42f3-b2fd-f42282254c89'::uuid as haras_id
),
mare as (
  select id from animals
  where haras_id = (select haras_id from seed_haras) and sexo = 'Fêmea'
  order by nome asc
  limit 1
)
insert into tasks (haras_id, title, due_date, status, priority, observations, animal_id, task_type, auto_generated)
select
  s.haras_id,
  'Check clínico semanal',
  current_date + interval '3 day',
  'pendente',
  'media',
  'Tarefa de validação do painel veterinário mobile',
  m.id,
  'check_clinico',
  false
from seed_haras s
join mare m on true
where not exists (
  select 1 from tasks t
  where t.haras_id = s.haras_id and t.title = 'Check clínico semanal'
);
