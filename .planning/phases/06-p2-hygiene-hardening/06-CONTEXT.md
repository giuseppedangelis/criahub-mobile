# Phase 6: P2 Hygiene & Hardening - Context

**Gathered:** 2026-04-17
**Status:** Ready for execution (MONO-02 deferred)

<domain>
## Phase Boundary

9 REQs P2 de prevenção e hardening. MONO-02 (FieldHomeScreen decomposition — 1299 linhas) adiado pro milestone de code quality (mesmo critério de MONO-01).

**Entrega:**
- RLS-04, RLS-05: storage + DB hardening
- OFFLINE-05: banner global offline
- PERF-02: cap de upload 2000px
- UX-04, UX-05: typed routes + biometria no financeiro
- PAR-02: category unknown surface
- SEC-01, SEC-02: Zod em RPCs + env hardening

Fora de escopo: MONO-02 (decomposição de FieldHomeScreen) e retenção regulatória de dados pós-exclusão.

</domain>

<decisions>
## Implementation Decisions

### RLS-04 — Storage enumeration protection
- **D-01:** Adicionar nonce UUID no path do storage: `${harasId}/animals/${animalId}/${crypto.randomUUID()}_${fileName}`. Callsite primário em `src/services/animal-media.ts:40`. Não migrar bucket pra privado (milestone próprio).
- **D-02:** Onde houver outros uploads no mesmo bucket (avatar, field birth/issue), aplicar mesmo padrão. `crypto.randomUUID()` é polyfilled no RN via `expo-crypto` OU nativo em Node; testar se RN 0.81 expõe globalmente. Se não, usar `Date.now() + Math.random().toString(36).slice(2, 10)` como fallback (mesma entropia efetiva).

### RLS-05 — ABCCMM imutability enforcement no DB
- **D-03:** Migration nova: trigger `BEFORE UPDATE ON public.animals` que bloqueia alteração dos campos oficiais (`nome`, `registro`, `chip`, `sexo`, `categoria`, `data_nascimento`, `pelagem`) quando `abccmm_rowid IS NOT NULL`. Raise exception `'ABCCMM fields are immutable for animals imported from ABCCMM registry.'`.
- **D-04:** Trigger só verifica se o valor realmente mudou (`OLD.<col> IS DISTINCT FROM NEW.<col>`) — permite UPDATE de outros campos mesmo em animais oficiais.

### OFFLINE-05 — Banner global offline
- **D-05:** Componente novo `src/components/ui/OfflineBanner.tsx` que escuta `NetInfo.addEventListener` e renderiza barra fixa no topo quando `isConnected === false`.
- **D-06:** Montado em `src/contexts/AppProviders.tsx` (ou raíz do `app/_layout.tsx`) como irmão do Stack, posicionado absolute top com `zIndex` alto.
- **D-07:** Texto: "Sem conexão. Mudanças ficam pendentes até voltar online." Fundo laranja theme `warning`. Altura pequena (~28px).

### PERF-02 — Upload image cap 2000px
- **D-08:** Adicionar `expo-image-manipulator` ao `package.json`. Helper novo `src/lib/image-upload.ts` que expõe `resizeForUpload(uri: string, maxDimension = 2000): Promise<string>` — retorna URI da imagem redimensionada.
- **D-09:** Aplicar antes de todos os uploads via `launchImageLibraryAsync`/`launchCameraAsync`. Callsites: `profile.ts` (avatar), `animal-media.ts` (animal photos), `field.ts` (birth/issue), `tasks.ts` (task exec), `health.ts` (documentos — só se for imagem, check MIME).

### UX-04 — Typed routes (remove `as any`)
- **D-10:** Substituir `router.push("/(app)/..." as any)` por `router.push({ pathname: "/(app)/..." })` (object form é inferido pelo Expo Router). Callsites: `AccountScreen.tsx:212,217` (financeiro, equipe), `CreatorDashboardScreen.tsx:187,249`, `CreatorNoticesScreen.tsx:100`.
- **D-11:** Se algum destino ainda não existir no filesystem (rota futura), manter cast até ser criado + TODO inline.

### UX-05 — Biometria no /financeiro
- **D-12:** Adicionar `expo-local-authentication` ao `package.json`. Hook novo `src/hooks/useBiometricGate.ts` que expõe `{ isAuthenticated, requireAuth, isHardwareAvailable, isEnrolled }`. `requireAuth` chama `LocalAuthentication.authenticateAsync` e seta `isAuthenticated=true` por 5min.
- **D-13:** `CreatorFinancialScreen.tsx` renderiza content apenas se `isAuthenticated === true`. Se não, renderiza `EmptyState` + `AppButton label="Autenticar"` que chama `requireAuth`.
- **D-14:** Se device não suporta biometria (`!isHardwareAvailable || !isEnrolled`), passa direto sem gate (graceful — não trava user).

### PAR-02 — Category unknown
- **D-15:** `src/services/animals.ts:84` — trocar `const mappedCategory = CATEGORY_MAPPING_DB_TO_APP[row.categoria] ?? "potro";` por `"unknown"`. Checar o tipo `AnimalCategory` em `src/types/domain.ts` e adicionar `"unknown"` se não existir. Log warning via `console.warn("[animals] unknown category from DB:", row.categoria)` quando cai no fallback.

### SEC-01 — Zod nas RPCs
- **D-16:** `src/services/team.ts:184-202` (`set_haras_member_status` e `remove_haras_member`) — adicionar schemas Zod para os retornos. Exemplo: `const RpcResultSchema = z.object({ ok: z.boolean().optional(), error: z.string().optional() })`. Parse + handle `ZodError` com mensagem amigável.

### SEC-02 — app.json JWT cleanup
- **D-17:** `app.json` — remover chaves `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` hardcoded. Garantir que `app.config.ts:110-111` (via `process.env` + dotenv) é a única fonte. Verificar que `src/config/env.ts` lê via `Constants.expoConfig.extra` e não tem fallback pra `app.json`.

### Claude's Discretion
- **D-18:** Ordem dos commits pode variar conforme surgir dependência entre edits (ex.: PAR-02 depende de tipo `AnimalCategory` incluir `"unknown"` — commit combinado).

### Scope guards
- **D-19:** NÃO mexer em MONO-02 (deferred).
- **D-20:** NÃO fazer refactor agressivo do fluxo existente; só os patches listados.

</decisions>

<canonical_refs>
- `.planning/REQUIREMENTS.md` §RLS-04, RLS-05, OFFLINE-05, PERF-02, UX-04, UX-05, PAR-02, SEC-01, SEC-02
- `.planning/ROADMAP.md` §"Phase 6: P2 Hygiene & Hardening"
- `.planning/phases/05-p1-cleanup/05-CONTEXT.md` — referência do padrão de biometria e hooks adicionados
- `src/services/animal-media.ts:40` — RLS-04 primary callsite
- `src/services/team.ts:184-202` — SEC-01 alvo
- `app.json` + `app.config.ts` — SEC-02 fonte única
- `src/components/ui/EmptyState.tsx` — UX-05 fallback pattern
</canonical_refs>

<deferred>
- **MONO-02** FieldHomeScreen decomposition — code quality milestone
- **Bucket privado + signed URLs** (alternativa RLS-04) — milestone dedicado de storage hardening
- **Retenção regulatória de dados pós-APPLE-01** — operacional/legal milestone
</deferred>

---

*Phase: 06-p2-hygiene-hardening*
*Context gathered: 2026-04-17*
