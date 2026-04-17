-- RLS-05: bloquear UPDATE de campos oficiais (ABCCMM) no DB quando abccmm_rowid IS NOT NULL.
-- Cliente-side já respeita via AnimalEditModal.tsx; este trigger é belt+suspenders para
-- caso alguém bypasse a UI. Permite UPDATE dos outros campos mesmo em animais oficiais.
--
-- Aplicado via MCP em 2026-04-17. Commit gravado no repo para paridade de migration history.

create or replace function public.enforce_abccmm_immutability()
returns trigger
language plpgsql
security invoker
as $$
begin
  if NEW.abccmm_rowid is null then
    return NEW;
  end if;

  if OLD.nome is distinct from NEW.nome then
    raise exception 'ABCCMM fields are immutable: nome cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.registro is distinct from NEW.registro then
    raise exception 'ABCCMM fields are immutable: registro cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.chip is distinct from NEW.chip then
    raise exception 'ABCCMM fields are immutable: chip cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.sexo is distinct from NEW.sexo then
    raise exception 'ABCCMM fields are immutable: sexo cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.categoria is distinct from NEW.categoria then
    raise exception 'ABCCMM fields are immutable: categoria cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.data_nascimento is distinct from NEW.data_nascimento then
    raise exception 'ABCCMM fields are immutable: data_nascimento cannot change for animals with abccmm_rowid set.';
  end if;
  if OLD.pelagem is distinct from NEW.pelagem then
    raise exception 'ABCCMM fields are immutable: pelagem cannot change for animals with abccmm_rowid set.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists animals_enforce_abccmm_immutability on public.animals;

create trigger animals_enforce_abccmm_immutability
  before update on public.animals
  for each row
  execute function public.enforce_abccmm_immutability();

comment on function public.enforce_abccmm_immutability() is
  'RLS-05: bloqueia alteração dos campos oficiais ABCCMM (nome, registro, chip, sexo, categoria, data_nascimento, pelagem) quando abccmm_rowid IS NOT NULL. Permite update de outros campos.';
