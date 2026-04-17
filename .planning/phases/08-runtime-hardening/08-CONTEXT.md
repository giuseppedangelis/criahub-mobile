# Phase 8: 08-runtime-hardening - Context

**Gathered:** 2026-04-17 (fast-path, no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

Endurecer o runtime React/RN para que o binário iOS não exiba white-screen nem travamento durante a Apple review. Escopo: componentes React (ErrorBoundary), bootstrap do AuthContext (timeout), higiene de logs (console gating), fluxo de permissões (soft opt-in de notificações), e smoke-test de rede IPv6-only. **Fora do escopo:** mudanças em `app.config.ts`/plugins (Phase 7), mudanças em código de negócio, métricas de performance.

</domain>

<decisions>
## Implementation Decisions

### ErrorBoundary (RUNTIME-01)

- **D-01:** Usar shape nativo do Expo Router v6 — export `function ErrorBoundary({ error, retry })` em `app/_layout.tsx`. Documentação oficial: https://docs.expo.dev/router/error-handling/
- **D-02:** Fallback UI: tela centralizada com logo CriaHub, mensagem em pt-BR ("Ops, encontramos um erro inesperado"), detalhe do erro em pequeno texto (apenas se `__DEV__`), botão "Tentar novamente" que chama `retry()`. Usar tokens de tema (`useAppTheme()`).
- **D-03:** **Não** adicionar error boundary em layouts intermediários `app/(auth)/_layout.tsx` e `app/(app)/_layout.tsx` neste phase — o root-level boundary em `app/_layout.tsx` cobre tudo. Decomposição granular fica para milestone futuro.

### AuthContext Bootstrap Timeout (RUNTIME-02)

- **D-04:** Wrapping `bootstrapSession()` em `Promise.race([bootstrap, timeoutPromise])` onde `timeoutPromise` resolve após 15000ms. Ao vencer timeout, chamar `clearUserState()` + `setIsLoading(false)`.
- **D-05:** Usar `finally` block no try/catch existente para garantir `setIsLoading(false)` mesmo em catch inesperado. Evita spinner infinito.
- **D-06:** Implementar em `src/contexts/AuthContext.tsx` — módulo que já tem o bootstrap. Não criar utilidade separada.

### Console Gating (RUNTIME-03)

- **D-07:** Grep `console\.` em `src/` e para cada ocorrência decidir:
  - Se é erro genuíno crítico → substituir por `if (__DEV__) console.warn(...)`
  - Se é debug/info → remover completamente ou wrap em `if (__DEV__)`
- **D-08:** **Não** introduzir lib de logging (sentry, loglevel). Overkill para v1.1 — apenas wrap com `__DEV__` do React Native.
- **D-09:** Audit final via `grep -rn "console\." src/ | grep -v "__DEV__"` — deve retornar zero.

### Notifications Soft Opt-in (RUNTIME-04)

- **D-10:** Não pedir permissão de notifications no launch. Mover call de `Notifications.requestPermissionsAsync()` para depois do `onAuthStateChange` detectar primeiro login bem-sucedido.
- **D-11:** Guardar flag `@criahub/notifications/permission-asked-v1` em AsyncStorage após primeira solicitação (independente de granted/denied). Previne re-pedir a cada login.
- **D-12:** Local: `src/lib/notifications.ts` já tem helpers; adicionar função `maybeRequestPermissionOnFirstLogin(userId)` e chamar de `AuthContext` após sessão criada.

### IPv6-only Smoke Test (RUNTIME-05)

- **D-13:** Não é código — é procedimento manual documentado. Rodar app em simulator iOS com macOS Network Link Conditioner configurado como "IPv6 NAT64" (Settings → Network → Link Conditioner → Profile: IPv6).
- **D-14:** Criar `apple/docs/IPV6_SMOKE_TEST.md` com passo-a-passo e checklist: login, listar plantel, criar field report, upload foto.
- **D-15:** Apple testa submit em rede IPv6-only. Se Supabase IPv6 não responde, rejeição 2.1. Validar antes de submeter.

### Claude's Discretion

- Layout exato do fallback UI do ErrorBoundary (cor de fundo, tamanho da fonte, espaçamento) — seguir tokens de tema
- Mensagens exatas em pt-BR do error screen
- Se agregar stats de erro ao error screen (contador de crashes em sessão, etc) — provavelmente não para v1.1
- Se usar try/finally vs .finally() chained — ambos funcionam

</decisions>

<canonical_refs>
## Canonical References

### Research (this milestone)

- `.planning/research/PITFALLS.md` §#2 (ErrorBoundary), §#17 (notif opt-in), §#18 (IPv6), §#19 (console gating)
- `.planning/research/SUMMARY.md` §Phase 8 Runtime Hardening

### Milestone docs

- `.planning/REQUIREMENTS.md` §RUNTIME-01 a RUNTIME-05
- `.planning/ROADMAP.md` §Phase 8

### Expo official

- https://docs.expo.dev/router/error-handling/ — Expo Router ErrorBoundary API

### Current code (read at planning)

- `app/_layout.tsx` — onde ErrorBoundary será adicionado
- `src/contexts/AuthContext.tsx` — onde timeout de bootstrap vai
- `src/lib/notifications.ts` — onde opt-in helper vai

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `useAppTheme()` em `src/theme/ThemeContext.tsx` — usar para tokens de cor no fallback UI
- `clearUserState()` em `AuthContext.tsx` — chamar em timeout/catch de bootstrap
- AsyncStorage helpers existentes em `src/lib/notifications.ts` — mesmo pattern para novo flag `permission-asked-v1`

### Established Patterns

- Timeouts via `setTimeout` + Promise race (padrão RN)
- `__DEV__` checks para debug-only code (já usado no repo)
- AsyncStorage keys com prefixo `@criahub/` + sufixo versionado `-v1` (pattern de notifications.ts)

### Integration Points

- `app/_layout.tsx` linha ~10-30 — export ErrorBoundary adjacent ao default export
- `src/contexts/AuthContext.tsx` — dentro de `bootstrapSession()` ou equivalente
- `src/lib/notifications.ts` — adicionar `maybeRequestPermissionOnFirstLogin`

### Anti-Patterns a Evitar

- Não adicionar lib de logging (overkill)
- Não adicionar error boundaries aninhados (root cobre)
- Não pedir permissão de notif no launch (objeto desta fase é o oposto)

</code_context>

<specifics>
## Specific Ideas

- Mensagem fallback: "Ops, encontramos um erro inesperado. Tente novamente — se persistir, faça login novamente."
- Timeout de 15s é research-backed (Supabase SDK default é ~30s, cortar pela metade dá UX melhor).

</specifics>

<deferred>
## Deferred Ideas

- Error reporting para Sentry/Crashlytics — fora de v1.1
- Error boundaries por rota (granular) — milestone futuro
- Logger util centralizado — overkill

</deferred>

---

*Phase: 08-runtime-hardening*
*Context gathered: 2026-04-17 via fast-path*
