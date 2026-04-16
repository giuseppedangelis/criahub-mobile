# Phase 2: RLS Haras Scope & Permissions - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fecha três vazamentos cross-haras identificados no audit, todos P0 bloqueantes para submit pré-loja:

1. **RLS-01** — `getAnimalNamesMap` (usada no dashboard do vet + inventário de sêmen) passa a filtrar por `haras_id` explicitamente. Hoje confia só em RLS; com vet vinculado a 2 harás, nomes do haras errado vazam para a UI do haras ativo.
2. **RLS-02** — `fetchRelative` (genealogia de pai/mãe na ficha do animal) passa a filtrar por `haras_id` explicitamente. Hoje um pai/mãe do outro haras aparece na ficha mesmo com RLS configurada.
3. **PERM-01** — `canTogglePresence` em `AnimalDetailScreen` passa a usar whitelist (`criador || veterinário`) em vez de `!isFieldStaffRole(role)` — o check atual libera o toggle para `unknown`, `admin`, `assessor`, `advisor` por exclusão.

Fora de escopo desta fase:
- Warning `{ warnings: string[] }` distinguindo "RLS bloqueou" de "não cadastrado" (RLS-03 → Phase 5).
- Auditoria ampla de outras lookups suspeitas em `src/services/*.ts` (deferred — se aparecer, vira backlog 999.x).
- Mudanças em RLS policies do Supabase (DB-side) — fix é 100% client-side nesta fase.
- Hot-swap de haras ativo (AUTH-02 → Phase 5).
- Bloqueio visual de assessor/admin em outras telas (PERM-02 → Phase 5).

</domain>

<decisions>
## Implementation Decisions

### PERM-01 — Toggle de presença

- **D-01:** Substituir `!isFieldStaffRole(role)` por whitelist explícita `isCreatorRole(role) || isVeterinaryRole(role)` em `src/screens/AnimalDetailScreen.tsx:140`. Comentário acima do check cita RLS alinhada: "animals UPDATE aceita criador/veterinário". Admin/assessor/advisor ficam de fora — eles hoje são bloqueados em `isMobileSupportedRole` (redirecionados para `/unsupported`), e a decisão é tratá-los como fora do escopo móvel até que PERM-02 (Phase 5) reavalie caso a caso.
- **D-02:** Nenhuma mudança em `src/lib/roles.ts`. Os helpers `isCreatorRole`/`isVeterinaryRole`/`isFieldStaffRole` já existem e são o canônico. Não criar novo helper combinado (ex.: `canTogglePresence`) — o check inline é pequeno e self-documenting.

### RLS-01 — getAnimalNamesMap escopada por haras

- **D-03:** Trocar assinatura de `getAnimalNamesMap(ids: string[])` para `getAnimalNamesMap(ids: string[], harasId: string)` em `src/services/veterinary.ts:63-68`. Arg obrigatório (não opcional com default) para garantir que qualquer caller futuro seja forçado a fornecer o escopo.
- **D-04:** Query passa a ser `.from("animals").select("id, nome").eq("haras_id", harasId).in("id", ids)`. A ordem dos filtros (`.eq` antes de `.in`) não importa para o resultado, mas segue o padrão de outros services do repo que filtram por haras primeiro.
- **D-05:** Ambos callsites em `veterinary.ts` (L483 dentro de `getVetDashboard`, L530 dentro de `getSemenInventory`) já recebem `harasId: string` como parâmetro do método exposto. A mudança é propagar esse valor no call de `getAnimalNamesMap`.

### RLS-02 — fetchRelative escopado

- **D-06:** Trocar assinatura de `fetchRelative(id: string | null)` para `fetchRelative(id: string | null, harasId: string)` em `src/services/animals.ts:128-148`. Arg obrigatório igual RLS-01. `id` continua nullable (pode não ter pai/mãe cadastrado), `harasId` sempre presente.
- **D-07:** Query passa a ser `.from("animals").select("id, nome, registro").eq("haras_id", harasId).eq("id", id).maybeSingle()`. A adição de `.eq("haras_id", harasId)` antes do `.eq("id", id)` garante filtro cross-haras. `maybeSingle` preservado — retorna `null` se não existir ou se RLS/filtro bloquear.
- **D-08:** Único caller (`animalsService.getById` em L239-265) passa `data.haras_id` — o haras do próprio animal-filho — para ambas chamadas `fetchRelative(data.pai_id, data.haras_id)` e `fetchRelative(data.mae_id, data.haras_id)`. Regra de domínio CriaHub: se o filho está no haras X, pai/mãe também estão no X (ou não estão cadastrados no sistema).

### RLS-02 — comportamento quando relativo existe em outro haras

- **D-09:** Quando o pai/mãe existe no DB mas em outro `haras_id`, `fetchRelative` retorna `null` silenciosamente (mesmo comportamento que "pai não cadastrado"). Nenhum warning, nenhum log — a UX diferenciada entre os dois casos vai ser entregue por RLS-03 na Phase 5 via array de warnings.
- **D-10:** Este é um choice deliberado por escopo. O audit listou RLS-03 como P1 separado justamente porque distinguir os dois casos exige mudança de API pública (`getById` retornando warnings), e não é bloqueante para submit.

### Scope guard

- **D-11:** Não auditar outras lookups em `src/services/*.ts` nesta fase. O audit de 2026-04-16 listou só esses 2 helpers. Se durante a implementação surgir um terceiro callsite óbvio, deve ser capturado como `/gsd-add-backlog` (novo REQ 999.x), não inflado nesta fase.
- **D-12:** Não mexer em RLS policies no Supabase. O fix é client-side: adicionar `.eq("haras_id", ...)` serve como "belt + suspenders" além da RLS, protegendo contra qualquer caso onde RLS possa ser permissiva demais (ex.: vet com 2 memberships ativas).

### Claude's Discretion

- **D-13:** Mensagens de commit — Claude escolhe entre `fix(02-*)` ou `refactor(02-*)` conforme o caso, mantendo formato dos commits da Phase 1.
- **D-14:** Teste local via simulator depois dos fixes — Claude sugere um roteiro no checkpoint human-verify mas não agenda rodar `npm run typecheck` (classifier pode estar fora — mesmo padrão da Phase 1).

### Folded Todos
(Nenhum — workspace não tem todos pendentes)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/PROJECT.md` — contexto do produto, constraints
- `.planning/REQUIREMENTS.md` §RLS-01, §RLS-02, §PERM-01 — aceitação
- `.planning/ROADMAP.md` §"Phase 2: RLS Haras Scope & Permissions" — success criteria (4 itens)

### Codebase — arquivos que vão ser alterados
- `src/services/veterinary.ts` — `getAnimalNamesMap` (L63-68), callers em L483 e L530. Assinatura muda: adicionar `harasId: string`.
- `src/services/animals.ts` — `fetchRelative` (L128-148), caller em `getById` L249-252. Assinatura muda: adicionar `harasId: string`.
- `src/screens/AnimalDetailScreen.tsx:140` — `canTogglePresence` passa a ser whitelist explícita.

### Codebase — arquivos de apoio (consulta)
- `src/lib/roles.ts` — helpers `isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole` (já existem)
- `src/services/animal-details.ts:208-212` — padrão de warnings que RLS-03 vai seguir na Phase 5 (não usar agora)
- `src/services/base.ts` — `handleSupabaseError` (já importado pelos dois services)
- `.planning/codebase/CONCERNS.md` §"getAnimalNamesMap queries across haras boundary" — descrição original do bug

### Sem dependência externa
- Sem edge functions, sem migrations Supabase, sem mudanças em RLS policies.
- Sem novos pacotes npm.
- Sem mudanças em `app.config.ts` ou `app.json`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`isCreatorRole` / `isVeterinaryRole` em `src/lib/roles.ts`** — helpers prontos, usados em várias telas. PERM-01 compõe dois deles.
- **`handleSupabaseError` em `src/services/base.ts`** — já consumido pelos dois services que vão ser editados. Sem mudança.
- **Padrão `.eq("haras_id", harasId)` antes de outros filtros** — já é o padrão em `animalsService.list` (L196), `animalsService.update` (L307), `dashboardService.*` e outros. RLS-01 e RLS-02 passam a seguir o mesmo padrão.

### Established Patterns
- **Services são funções puras que recebem `harasId` explicitamente** — não usam `useAuth` (não são hooks). Acertar o arg no call-time é a convenção.
- **Helpers privados de service (não exportados) podem mudar assinatura livremente** — `getAnimalNamesMap` e `fetchRelative` não são exportados fora do seu módulo (scan confirmou), então zero risco de callers externos.
- **Filters podem encadear `.eq` + `.in`** — Supabase-js retorna o mesmo resultset, não há ordenação semântica entre eles.

### Integration Points
- **`AnimalDetailScreen.tsx:140`** — linha única trocada. Sem refactor estrutural da tela.
- **`veterinary.ts` L63-68** — helper privado + 2 callers no mesmo arquivo. Uma mudança, duas propagações.
- **`animals.ts` L128-148** — helper privado + 1 caller (`getById`). Uma mudança, uma propagação.

### Escopo do diff
Estimativa: ~10 linhas alteradas em 3 arquivos. Zero arquivos novos, zero pacotes novos.

</code_context>

<specifics>
## Specific Ideas

- **Código da whitelist em PERM-01**:
  ```tsx
  // RLS: animals UPDATE aceita criador/veterinário (peão, assessor e admin ficam fora).
  const canTogglePresence = isCreatorRole(role) || isVeterinaryRole(role);
  ```

- **Assinatura de `getAnimalNamesMap`**:
  ```ts
  async function getAnimalNamesMap(ids: string[], harasId: string) {
    if (ids.length === 0) return new Map<string, string>();
    const { data, error } = await supabase
      .from("animals")
      .select("id, nome")
      .eq("haras_id", harasId)
      .in("id", ids);
    if (error) handleSupabaseError(error);
    return new Map((data ?? []).map((item) => [item.id, item.nome]));
  }
  ```

- **Assinatura de `fetchRelative`**:
  ```ts
  async function fetchRelative(id: string | null, harasId: string): Promise<AnimalRelative | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from("animals")
      .select("id, nome, registro")
      .eq("haras_id", harasId)
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return { id: data.id, name: data.nome, registry_number: data.registro ?? null };
  }
  ```

- **Caller update em `animalsService.getById`**:
  ```ts
  const [father, mother] = await Promise.all([
    fetchRelative(data.pai_id ?? null, data.haras_id),
    fetchRelative(data.mae_id ?? null, data.haras_id),
  ]);
  ```

</specifics>

<deferred>
## Deferred Ideas

- **RLS-03 warnings array em `fetchRelative`** — distinguir "pai não cadastrado" de "pai em outro haras". Migra `getById` para retornar `{ animal, warnings }` igual `animal-details.ts`. Phase 5.
- **Auditoria de outras lookups de `animals` sem haras_id** — varrer `src/services/*.ts` com grep `.from("animals")` e validar cada callsite. Se virar prioridade, abrir REQ 999.x.
- **RLS-04 storage `animal-photos` bucket privado + signed URL** — Phase 6.
- **RLS-05 ABCCMM imutável enforced no DB (trigger/grants)** — Phase 6.
- **PERM-02 auditoria de outras permissões que podem vazar para assessor/admin** — Phase 5.
- **Hot-swap de haras ativo (AUTH-02)** — Phase 5.
- **Testes automatizados de RLS/permissions** — TEST-01 na Phase 5 inclui smoke tests de roles + haras scope.

### Reviewed Todos (not folded)
(Nenhum — workspace não tem todos pendentes)

</deferred>

---

*Phase: 02-rls-haras-scope*
*Context gathered: 2026-04-16*
