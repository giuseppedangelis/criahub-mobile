# Phase 5: P1 Cleanup - Context

**Gathered:** 2026-04-17
**Status:** Ready for execution (split em batches 5a + 5b + 5d; 5c MONO-01 deferred)

<domain>
## Phase Boundary

15 REQs P1 do audit — melhorias de UX, performance, paridade, e tests. Não bloqueiam submit mas são pré-requisito para a release estável pós-loja.

**Split em 4 batches execução:**
- **5a Quick wins:** UX-01 (Linking fallback), UX-02 (EmptyState RLS), UX-03 (ImagePicker SDK 55), OWN-01 (bulk upsert), OWN-02 (presence override protection), PAR-01 (enum single source), PAR-03 (bucket consistency), RLS-03 (genealogy warnings)
- **5b Arquitetura:** AUTH-02 (hot-swap haras), PERF-01 (dashboard RPC), OFFLINE-03 (background fetch), OFFLINE-04 (optimistic concurrency)
- **5c Code quality:** PERM-02 (assessor audit), MONO-01 (VeterinaryScreen decomposition) — **DEFERRED para milestone próprio**
- **5d Tests:** TEST-01 (Jest + smoke tests)

Fora de escopo desta fase: 5c (PERM-02, MONO-01) — dívida de code quality, ficará para próximo milestone.

</domain>

<decisions>
## Implementation Decisions

### Batch 5a — Quick wins

#### UX-01 — Linking fallback
- **D-01:** Em `AnimalDetailScreen.tsx:244-248`, trocar o `if (!canOpen) return;` silencioso por `Alert.alert("Não foi possível abrir", "O link parece inválido ou não há app para abri-lo.\n\n{url}")`. Espelha padrão de `AccountScreen.tsx:232-245`.

#### UX-02 — EmptyState quando RLS bloqueia
- **D-02:** Em `AnimalDetailScreen.tsx:229-242`, adicionar ramo `if (!isLoading && !animal && !error)` que renderiza `EmptyState title="Acesso negado" description="Este animal não pertence ao haras ativo ou você não tem permissão para visualizá-lo."`.
- Ramo atual (`error || !animal`) fica só para erro real. Quando RLS bloqueia, Supabase retorna `data: null, error: null`.

#### UX-03 — ImagePicker.MediaTypeOptions → ["images"]
- **D-03:** Três callsites (`FieldHomeScreen.tsx:57`, `FieldHomeHubScreen.tsx:34`, `TaskExecutionModal.tsx:52`). Trocar `mediaTypes: ImagePicker.MediaTypeOptions.Images` por `mediaTypes: ["images"]`. Padrão já adotado no resto do repo.

#### OWN-01 — Bulk upsert de cotistas
- **D-04:** Em `src/services/ownership.ts:146-204`, substituir loop de UPDATE/INSERT + loop de deactivation por:
  - `await supabase.from("animal_ownership_shares").upsert(rows, { onConflict: "id" })` para shares existentes e novos.
  - `await supabase.from("animal_ownership_shares").update({ is_active: false, end_date: today }).in("id", idsToDeactivate)` em lote único.
- Shares novos (sem id) entram com `null` no id; banco gera via default `gen_random_uuid()`.
- **D-05:** Sem nova migration — usar primary key `id` como conflict target. Não exige unique constraint em `(animal_id, cotista_profile_id)`; o INSERT novo sem id sempre cria row nova, UPDATE via upsert batente só em id.

#### OWN-02 — Presence override protection
- **D-06:** Em `src/services/ownership.ts:212-215`, só forçar `is_at_haras=false, presence_manual_override=false` se nenhuma das shares novas/editadas foi marcada como manual-override recente OU se o animal ainda não tinha `presence_manual_override=true`.
- Simplificação: adicionar check `if (animalAtual?.presence_manual_override !== true)` antes do UPDATE que sobrescreve presença. Se usuário acabou de tocar no toggle de presença manual, skip o UPDATE automático.
- Não pede confirmação via Alert — silencia. Se o usuário tocou manual, manual wins.

#### PAR-01 — Enum single source
- **D-07:** Criar entry `REPRODUCTIVE_EVENT_LABELS` em `src/types/domain.ts` (não novo arquivo `src/domain/enums.ts`):
  ```ts
  export const REPRODUCTIVE_EVENT_LABELS: Record<string, string> = {
    cobertura: "Cobertura",
    inseminacao: "Inseminação",
    transferencia_embriao: "Transferência de embrião",
    parto: "Parto",
    aborto: "Aborto",
    diagnostico_gestacao: "Diagnóstico de gestação",
    ovulacao: "Ovulação",
  };
  ```
- Atualizar `src/services/animal-details.ts:82-92` e `src/services/dashboard.ts:37-45` para importar e usar `REPRODUCTIVE_EVENT_LABELS`.

#### PAR-03 — Bucket consistency
- **D-08:** Padronizar mobile em `animal-photos` (bucket predominante no codebase). Se `src/services/health.ts:66-73` usa `animals` ou outro, alinhar para `animal-photos`. Marcar TODO inline na função pra confirmar com `criahub-web-v2` em milestone futuro.

#### RLS-03 — Genealogy warnings
- **D-09:** Expandir retorno de `fetchRelative` (em `animals.ts`) para incluir warning quando `error` existir distinto de "not found". Na verdade, já que decidimos D-02 do Phase 2 (return null silencioso), aqui só muda o shape:
  - `fetchRelative` agora retorna `{ relative: AnimalRelative | null, warning: string | null }`.
  - Se query erro genuíno (RLS bloqueou, network) → `warning: "Pai/mãe pode existir em outro haras ou sem permissão de acesso."`
  - Se simplesmente não existe → `{ relative: null, warning: null }`.
- **D-10:** `animalsService.getById` agrega os warnings em `genealogy.warnings: string[]` no `Animal`. Type `Animal.genealogy` ganha campo opcional `warnings?: string[]`. Nenhuma UI consome ainda — só fica disponível. RLS-04 futura pode renderizar.

### Batch 5b — Arquitetura

#### AUTH-02 — Hot-swap haras
- **D-11:** Adicionar função `listUserHaras(userId)` em `src/lib/haras.ts` que retorna `[{ haras_id, haras_name, role }...]` de `haras_members` + `haras` join.
- **D-12:** Adicionar `hotSwapHaras(harasId: string)` no `AuthContext.tsx` — valida que usuário tem membership ativo no haras alvo, atualiza `setHarasId(harasId)`, invalida React Query cache via `queryClient.clear()`.
- **D-13:** Em `AccountScreen.tsx`, se o usuário tem `haras.length > 1`, adicionar dropdown/modal de troca ANTES do botão "Excluir minha conta". Usar `OptionSearchSelect` já existente.

#### PERF-01 — Dashboard RPC agregada
- **D-14:** Criar RPC no Supabase `get_creator_dashboard(p_haras_id uuid)` que executa em 1 query o que `dashboard.ts:276-300` faz em ~11. Retorna JSON com `{ animais_total, animais_condominio, animais_ativos, animais_inativos, partos_ultimos_30d, cobertas_pendentes, exames_pendentes, eventos_proximos, ... }`.
- **D-15:** Migration via MCP. `dashboardService.get` passa a chamar `supabase.rpc("get_creator_dashboard", { p_haras_id: harasId })`.
- **D-16:** Remove os chamadas sequenciais existentes. Mantém `staleTime: 60s` no query client.

#### OFFLINE-03 — Background fetch
- **D-17:** Adicionar `expo-background-fetch` ao `package.json`. Configurar task `criahub-offline-sync` que roda `fieldService.flushOfflineQueue()` + `veterinaryService.flushOfflineQueue()` a cada 15min quando online.
- **D-18:** Registro da task em `src/contexts/AppProviders.tsx` ou em hook dedicado `useBackgroundSync`. Um entry point, não duplicar.

#### OFFLINE-04 — Optimistic concurrency
- **D-19:** Adicionar `updated_at` checked ao flush de field e vet. Quando enfileirar, capturar `item.payload.__updated_at_at_enqueue = currentRecord.updated_at`. No flush, query inclui `.eq("updated_at", item.payload.__updated_at_at_enqueue)`. Se 0 rows afetadas, marca item como `dead` (conflict) em vez de retentar — evita ressuscitar state stale.

### Batch 5d — Tests

#### TEST-01 — Jest setup + smoke tests
- **D-20:** Instalar `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`. Criar `jest.config.js` usando preset `jest-expo`.
- **D-21:** 4 arquivos de teste (pontuais):
  - `src/lib/__tests__/roles.test.ts` — testa `isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole`, `isMobileSupportedRole`.
  - `src/services/__tests__/field-offline.test.ts` — testa `buildFieldActionFingerprint` (bucket de minuto), enqueue dedup dentro/fora da janela, `MAX_RETRIES` → dead.
  - `src/services/__tests__/ownership.test.ts` — testa validação 100%, upsert bulk, presence override respect.
  - `src/services/__tests__/animals-scope.test.ts` — testa `fetchRelative` com/sem harasId, `getAnimalNamesMap` scoped.
- **D-22:** `package.json` ganha script `"test": "jest"`. Mocks de `@react-native-async-storage/async-storage`, `@supabase/supabase-js`, `expo-notifications` via `jest.setup.js`.

### Deferred (Batch 5c)
- **PERM-02 — Assessor audit:** PERM-01 da Phase 2 já fechou o leak mais grave (toggle de presença). Outras permissões que podem vazar para assessor/admin/advisor ficam para milestone de code quality dedicado.
- **MONO-01 — VeterinaryScreen decomposition:** 1539 linhas → 7-10 arquivos. Escopo de 3h+, code quality pura, zero risco funcional. Próximo milestone.

### Claude's Discretion
- **D-23:** Se algum REQ do 5b ou 5d revelar complexidade inesperada durante execução, Claude pausa e pergunta antes de continuar.
- **D-24:** Commits atômicos por REQ. Se dois REQs tocam o mesmo arquivo em sequência, pode agrupar em um commit se fizer sentido semântico.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — 15 REQs deste batch
- `.planning/ROADMAP.md` §"Phase 5: P1 Cleanup"
- `.planning/phases/01-auth-notifications-security/` — padrão de signOut + onAuthStateChange usado em AUTH-02
- `.planning/phases/02-rls-haras-scope/02-CONTEXT.md` — D-09/D-10 estabelecem que fetchRelative retorna null silencioso (complementa RLS-03)
- `.planning/phases/03-offline-queue-hardening/` — infra de fila offline expandida em OFFLINE-03/04
- `.planning/phases/04-apple-account-deletion/` — AccountScreen modificado, padrão de Alert + signOut
- `.planning/codebase/CONCERNS.md` — bugs originais

</canonical_refs>

<deferred>
## Deferred Ideas

- **PERM-02** audit amplo de permissões assessor/admin — code quality milestone
- **MONO-01** VeterinaryScreen decomposition — code quality milestone
- **Extração de buildRetryAtIso compartilhado** (Phase 3 D-15) — code quality milestone
- **Confirmar bucket correto com criahub-web-v2** (PAR-03 D-08) — milestone de paridade

</deferred>

---

*Phase: 05-p1-cleanup*
*Context gathered: 2026-04-17*
