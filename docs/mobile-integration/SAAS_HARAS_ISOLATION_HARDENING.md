# SaaS Haras Isolation Hardening (Web + Mobile)

## Objetivo
Garantir isolamento multi-tenant real por haras para todos os perfis operacionais (criador, veterinario, peao/funcionario), impedindo leitura cruzada de dados entre clientes.

## Premissa de seguranca
- Um usuario autenticado deve visualizar apenas dados do(s) haras ao qual pertence.
- O vinculo de pertencimento considera:
  - `profiles.haras_id`
  - `haras_members` com status ativo

## Implementacoes aplicadas

### 1) Funcoes canonicas de autorizacao
- `public.user_belongs_to_haras(p_haras_id uuid)`
  - Retorna `true` quando o usuario autenticado pertence ao haras.
- `public.user_can_manage_haras_data(p_haras_id uuid)`
  - Retorna `true` quando o usuario pertence ao haras e tem role de gestao (`admin`, `criador`, `veterinario`, `funcionario`, `assessor`, `acessor`).
- `public.user_can_manage_haras_admin(p_haras_id uuid)`
  - Retorna `true` para gestao administrativa de haras por `admin`/`criador` do proprio haras.
- `public.is_admin_user()`
  - Retorna `true` apenas para perfil `admin`.

### 2) Hardening de profile e membership
- `profiles_update_own_policy` endurecida para impedir alteracao de:
  - `role`
  - `haras_id`
  pelo proprio usuario.
- RLS habilitada em `haras_members` com politicas:
  - leitura do proprio vinculo e leitura de equipe por roles autorizadas no mesmo haras
  - escrita restrita a `admin`/`criador` do mesmo haras

### 3) Tabelas operacionais com SELECT baseado em pertencimento canonico
Politicas de leitura atualizadas para usar `user_belongs_to_haras(...)` em:
- `tasks`
- `task_executions`
- `pending_validations`
- `animals`
- `events`
- `gestations`
- `reproductive_events`
- `reproductive_exams`
- `health_records`
- `vet_tasks`

### 4) Tabelas com `haras_id` que estavam sem RLS
RLS habilitada e politicas criadas (select por pertencimento + write por role de gestao) para:
- `auction_registrations`
- `auctions`
- `coverings`
- `haras_roles`
- `haras_settings`
- `import_history`
- `inseminations`
- `notifications`
- `ovulations`
- `reports`
- `reproduction_protocol_applications`
- `reproduction_protocols`
- `sales`
- `service_orders`
- `storage_files`
- `system_alerts`
- `transactions`

### 5) Tabelas sem `haras_id` com acesso sensivel
- `haras`: RLS habilitada
  - select por pertencimento ao proprio haras
  - update por `admin`/`criador` do proprio haras
  - insert restrito a `admin`/`criador`
- `reproduction_protocol_steps`: RLS habilitada com validacao via join em `reproduction_protocols.haras_id`
- `profile_settings`: RLS habilitada (somente proprio usuario)
- `integrations`, `platform_metrics`, `sync_logs`, `admin_notifications`: RLS admin-only
- `subscription_plans`: leitura autenticada + escrita admin-only

## Resultado de auditoria apos hardening
- Todas as tabelas `public` estao com RLS habilitada.
- Delegacao de tarefas no criador migrada para fonte canonica de equipe (`list_haras_assignable_members`).

## Validacoes recomendadas (homologacao)

### Isolamento entre haras
- Login com veterinario do Haras A:
  - Confirmar que `animals`, `tasks`, `events` retornam apenas Haras A.
- Login com peao do Haras B:
  - Confirmar que nao acessa dados do Haras A.

### Delegacao de tarefas
- Criador do Haras A:
  - Lista responsaveis do Haras A (peao, veterinario, funcionario)
  - Nao lista membros do Haras B

### Fluxo peao
- Peao visualiza apenas tarefas do seu haras
- Execucao permitida somente para tarefas atribuidas a ele

## Pendencias de seguranca (advisors)
- Funcoes antigas sem `search_path` fixo (WARN do advisor)
- Leaked password protection desabilitado no Auth

## Proximos passos
1. Rodar suite de QA multi-perfil (web e mobile) por haras.
2. Endurecer funcoes legadas sem `search_path` fixo.
3. Habilitar leaked password protection no projeto Auth.
