# Plano de Execucao - Delegacao de Tarefas (Criador)

## Objetivo
Garantir que o criador consiga delegar tarefas para toda a equipe elegivel do haras (nao apenas para si), mantendo paridade web/mobile e seguranca de acesso.

## Problema atual
- A listagem de responsaveis no mobile depende de `profiles`.
- A politica atual de `profiles` permite `SELECT` apenas do proprio usuario.
- Resultado pratico: o criador enxerga apenas ele mesmo para delegacao.

## Diretriz tecnica
- Vinculo canonico de equipe: `haras_members` (status ativo).
- Exposicao de membros delegaveis: RPC segura (Security Definer) com validacao de acesso por haras.
- Web e mobile devem consumir o mesmo contrato de dados para responsaveis.

## Fases

### Fase 1 - Auditoria e contrato
Status: `implementado`
- Definir membros elegiveis por role (`admin`, `criador`, `veterinario`, `funcionario`, `peao`, `employee`).
- Definir acesso ao endpoint apenas para usuarios vinculados ao haras.

### Fase 2 - Backend canonico (RPC)
Status: `implementado`
- Criar funcao `public.list_haras_assignable_members(p_haras_id uuid)`.
- Validar se usuario autenticado pertence ao haras (via `profiles` ou `haras_members` ativo).
- Retornar membros ativos com dados necessarios para UI:
  - `id`
  - `full_name`
  - `email`
  - `role`
  - `membership_status`
- Conceder `GRANT EXECUTE` para `authenticated`.

### Fase 3 - Mobile
Status: `implementado`
- Atualizar `tasksService.listAssignableMembers()` para usar RPC.
- Preservar fallback de label (`full_name`, `email`, `role`) na UI de rotina do criador.

### Fase 4 - QA de paridade
Status: `pendente`
- Validar com conta criador + pelo menos 2 membros ativos no mesmo haras.
- Confirmar que membros de outro haras nao aparecem.
- Confirmar delegacao e reatribuicao funcionando no mobile e no web.

## Checklist de aceite
- [x] Criador lista equipe elegivel do proprio haras.
- [x] Mobile usa fonte canonica de membros delegaveis.
- [x] Endpoint protegido por validacao de vinculo ao haras.
- [ ] Paridade web/mobile homologada com massa real.
- [ ] Teste regressivo de delegacao (criador -> peao/vet/funcionario).

## Riscos e mitigacoes
- Risco: divergencia entre `profiles.haras_id` e `haras_members`.
  - Mitigacao: validacao na RPC por ambas as fontes e priorizacao de `haras_members` ativo para retorno.
- Risco: mudanca futura de RLS em `haras_members`.
  - Mitigacao: manter RPC como camada de contrato para app.

## Proximos passos recomendados
1. Criar endpoint equivalente no web (se ainda nao usar o mesmo contrato).
2. Evoluir para uma view/RPC unica para listagem de tarefas com `responsible_name` consistente.
3. Executar hardening de politicas RLS de `tasks`/`task_executions` usando `haras_members` como referencia canonica.
