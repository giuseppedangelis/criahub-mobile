# Phase 1: Auth & Notifications Security - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega dois fixes P0 independentes mas relacionados (ambos vivem no escopo de sessão/auth):

1. **AUTH-01** — Fluxo "Esqueci minha senha" passa a funcionar in-app: link do email abre o app, leva para tela de reset, usuário define nova senha sem precisar usar o browser.
2. **NOTIF-01** — SignOut e troca de usuário no mesmo device limpam todos os lembretes locais agendados, eliminando vazamento de notificações entre contas.

Fora de escopo para esta fase (ficam em fases posteriores):
- Hot-swap entre múltiplos haras do mesmo usuário (AUTH-02 → Phase 5)
- Exclusão de conta in-app (APPLE-01 → Phase 4)
- Sign-in com biometria em `/financeiro` (UX-05 → Phase 6)

</domain>

<decisions>
## Implementation Decisions

### Deep Link Strategy (AUTH-01)
- **D-01:** Usar **apenas o scheme `criahubmobile://`** para o redirect de reset. Universal Link/App Link fica para milestone dedicado — exige hospedar `apple-app-site-association` + `assetlinks.json` e configurar `associatedDomains`, fora do escopo do bug-bash.
  - `resetPasswordForEmail(email, { redirectTo: "criahubmobile://reset-password" })` em `src/contexts/AuthContext.tsx:155`.
  - Scheme já declarado em `app.config.ts:14` (`scheme: "criahubmobile"`) — nenhuma mudança de config necessária.
- **D-02:** Listener de deep link vive em `app/(auth)/_layout.tsx` (e não na AppProviders) — é suficiente para o fluxo de reset que sempre entra deslogado, e mantém o layer de auth isolado do layer do app.

### Reset Password Surface (AUTH-01)
- **D-03:** Criar **rota dedicada** `app/(auth)/reset-password.tsx` que delega para `src/screens/auth/ResetPasswordScreen.tsx`. Espelha a estrutura existente de `login.tsx` e `forgot-password.tsx` — cada rota é um dispatcher fino, o screen vive em `src/screens/auth/`.
- **D-04:** `ResetPasswordScreen` usa o mesmo stack de form que `ForgotPasswordScreen` (React Hook Form + Zod + `zodResolver`). Schema: `{ password: z.string().min(8), confirm: z.string() }` com refine pra igualdade.
- **D-05:** Ao receber o deep link, o listener parseia `access_token` + `refresh_token` do fragment (hash) da URL, chama `supabase.auth.setSession({ access_token, refresh_token })`, e navega via `router.replace("/(auth)/reset-password")`.
- **D-06:** O screen chama `supabase.auth.updateUser({ password })` para confirmar a troca. Após success, faz signOut e redireciona para login com toast "Senha atualizada. Entre novamente." (padrão LGPD — nova senha = nova sessão).

### Session Collision Handling (AUTH-01)
- **D-07:** Se o usuário estiver **já logado** quando o link de reset abrir, o listener faz **signOut silencioso** antes de processar o token (e antes de navegar). Rationale: o link é pra outra conta em intenção comum; processar o token no contexto da sessão atual gera ambiguidade e potencial vazamento.
- **D-08:** `clearAllReminders()` é chamado dentro do signOut silencioso também (via fluxo unificado — ver D-10).

### clearAllReminders Scope (NOTIF-01)
- **D-09:** `clearAllReminders()` é chamado em **duas situações**:
  1. Dentro de `signOut()` em `AuthContext.tsx:148`, antes do `clearUserState()`.
  2. Dentro do handler de `onAuthStateChange` quando detectar que `nextSession?.user?.id` é **diferente** do último `userId` conhecido persistido (user mismatch).
- **D-10:** O "último userId conhecido" é persistido em AsyncStorage na key `@criahub:notifications/owner-user-id-v1`. O handler:
  1. No bootstrap: lê a key.
  2. Em `onAuthStateChange`: compara com `nextSession?.user?.id`. Se diferente (inclusive se a key estiver vazia e a sessão trouxer um user), chama `clearAllReminders()` e atualiza a key.
  3. No signOut explícito: `clearAllReminders()` + apaga a key.
- **D-11:** O mecanismo protege cenários que signOut não cobre: refresh token expirado e trocado por outro usuário, limpeza de cache, restore de backup em device diferente com sessão stale, ou bug futuro que pule o signOut.

### Error/Edge Cases
- **D-12:** Link expirado ou inválido → tela de reset mostra `EmptyState` com botão "Solicitar novo link" que navega de volta para `forgot-password.tsx`. Erro vem do `supabase.auth.setSession` com mensagem genérica (não expor token).
- **D-13:** Link clicado em device **sem o app instalado** → user cai na hosted page do Supabase (comportamento padrão — não é nosso problema). Não criamos fallback web próprio nesta fase.
- **D-14:** Link clicado com `ForgotPasswordScreen` aberto (caso raro, mesmo device, timing) → o listener ainda dispara normalmente; a navegação `router.replace` substitui o screen atual.

### Claude's Discretion
- **D-15:** Estilo visual da `ResetPasswordScreen` — Claude decide espelhando `LoginScreen` / `ForgotPasswordScreen` (mesmo `AppScreen`, `Card`, `TextField`, `AppButton`). Sem customização nova.
- **D-16:** Estratégia de parsing do fragment da URL (hash vs query). Supabase padrão usa hash (`#access_token=...`), mas Claude verifica em tempo de implementação lendo o comportamento do `resetPasswordForEmail` e usa o helper apropriado (`Linking.parseURL` + parse manual do hash, ou `expo-linking` `useURL`).
- **D-17:** Se surgir conflito entre `Linking.addEventListener("url", ...)` e `useURL()` do `expo-linking`, Claude escolhe o que encaixa melhor com o ciclo de vida do layout.

### Folded Todos
(Nenhum — não há todos pendentes para este workspace ainda)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/PROJECT.md` — visão do produto, constraints, Apple 5.1.1(v) context
- `.planning/REQUIREMENTS.md` §AUTH-01, §NOTIF-01 — aceitação dos dois REQs desta fase
- `.planning/ROADMAP.md` §"Phase 1: Auth & Notifications Security" — success criteria

### Codebase — arquivos que vão ser alterados
- `src/contexts/AuthContext.tsx` — `resetPassword` (linha 154-157), `signOut` (linha 148-152), handler `onAuthStateChange` (linha 114-135), `clearUserState` (linha 39-45). Adicionar lógica de user-mismatch detection + chamada de `clearAllReminders`.
- `src/lib/notifications.ts` — `clearAllReminders` já existe (linha 160-170). Adicionar helpers `readOwnerUserId` / `writeOwnerUserId` / `clearOwnerUserId` usando AsyncStorage key `@criahub:notifications/owner-user-id-v1`.
- `src/screens/auth/ForgotPasswordScreen.tsx` — ajustar mensagem pós-envio para mencionar que o link abre o app.
- `app/(auth)/_layout.tsx` — adicionar listener de deep link (`Linking.addEventListener("url", ...)` + `Linking.getInitialURL()` no mount).
- `app.config.ts` — nenhuma mudança, scheme já configurado.

### Codebase — arquivos novos
- `app/(auth)/reset-password.tsx` — route dispatcher (6 linhas, espelho de `forgot-password.tsx`).
- `src/screens/auth/ResetPasswordScreen.tsx` — screen completa com form RHF + Zod + call para `supabase.auth.updateUser`.

### Codebase — arquivos para consulta (padrão existente)
- `src/screens/auth/LoginScreen.tsx` — estrutura de form com RHF + Zod (referência visual)
- `src/screens/auth/ForgotPasswordScreen.tsx` — referência de estrutura pra espelhar no ResetPassword
- `app/(auth)/login.tsx`, `app/(auth)/forgot-password.tsx` — padrão de route dispatcher
- `app/(auth)/_layout.tsx` — layout stack atual (redireciona se session existir) — base pra adicionar listener

### Supabase / External
- Supabase JS docs: `supabase.auth.resetPasswordForEmail(email, { redirectTo })` — aceita scheme customizado
- Supabase JS docs: `supabase.auth.setSession({ access_token, refresh_token })` — hidrata sessão a partir do link
- Supabase JS docs: `supabase.auth.updateUser({ password })` — confirma nova senha
- Expo Linking docs: `Linking.addEventListener`, `Linking.getInitialURL`, `Linking.parse`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/ui/AppScreen`, `Card`, `TextField`, `AppButton`** — mesmo kit visual de LoginScreen/ForgotPasswordScreen; ResetPasswordScreen usa idêntico.
- **`react-hook-form` + `zod` + `@hookform/resolvers/zod`** — stack de validação consistente nos dois screens existentes; reaproveitar.
- **`clearAllReminders()` em `src/lib/notifications.ts:160`** — função já existe, só nunca foi chamada. NOTIF-01 é literalmente "cablear".
- **`@react-native-async-storage/async-storage`** — já importado em `notifications.ts`; adicionar key nova de `owner-user-id-v1` não requer nova dependência.
- **`expo-linking`** — listado no package.json + declarado no codebase map, mas **nunca usado** em `src/` ou `app/`. Primeira vez que o app vai consumir deep links de entrada.

### Established Patterns
- **Route dispatcher pattern:** `app/(auth)/*.tsx` são arquivos de ~5 linhas que delegam para `src/screens/auth/*Screen.tsx`. ResetPassword segue a mesma regra.
- **Screen form pattern:** RHF + Zod + `AppScreen scroll` + `Card` + `TextField` controller-wrapped. LoginScreen e ForgotPasswordScreen são o modelo.
- **AuthContext como single source of truth de sessão:** qualquer navegação derivada de auth passa pelo `onAuthStateChange` do provider. A lógica de user-mismatch cabe aqui, não em cada screen.
- **AsyncStorage key prefixing:** todas as keys do app usam prefixo `@criahub/` ou `@criahub:`. Keep consistency (`@criahub:notifications/owner-user-id-v1`).

### Integration Points
- **`app/(auth)/_layout.tsx`** — precisa adicionar `useEffect` com `Linking.addEventListener("url", handler)` + `Linking.getInitialURL()`. Hoje o layout só faz `Redirect`; vai passar a ter lógica de side-effect além do redirect.
- **`AuthContext.signOut`** — ponto único de limpeza de sessão. Adicionar `await clearAllReminders()` + `await clearOwnerUserId()` antes de `clearUserState()`.
- **`AuthContext.onAuthStateChange`** — detectar user-mismatch comparando `nextSession?.user?.id` com `readOwnerUserId()`. Se diff, limpa reminders + atualiza owner.
- **Supabase client (`src/lib/supabase.ts`)** — já configurado com AsyncStorage persist; `setSession` e `updateUser` funcionam out-of-the-box.

</code_context>

<specifics>
## Specific Ideas

- **Mensagem pós-envio do ForgotPassword**: atualizar para "Verifique seu email. O link abrirá o CriaHub automaticamente para você criar a nova senha." (deixa claro que o app vai abrir — gerencia expectativa sobre o prompt do iOS).
- **Toast de sucesso no reset**: "Senha atualizada. Entre novamente." após `updateUser` + signOut + `router.replace("/(auth)/login")`.
- **Erro padrão para link inválido/expirado**: EmptyState "Link inválido ou expirado" + botão "Solicitar novo link" que navega para `/(auth)/forgot-password`.
- **Validação de senha**: mínimo 8 caracteres (espelha o comportamento do Supabase Auth default). Sem complexity rules nesta fase — se o web tiver regra mais forte, paridade vira ajuste posterior.

</specifics>

<deferred>
## Deferred Ideas

- **Universal Link / App Link com domain verification** — experiência de deep link sem prompt do iOS. Requer hospedar `apple-app-site-association` + `assetlinks.json` + config de `associatedDomains`. Sugere milestone próprio de "app store polish".
- **Biometria no reset** (FaceID/TouchID confirmação antes de aceitar nova senha) — não aumenta segurança (usuário já tem o token do email); adiciona fricção. Descartado.
- **Página web própria de fallback** (para deep link em device sem app) — hosted page do Supabase já cobre. Página custom seria escopo de site de marketing, fora do app.
- **Complexity rules de senha (maiúscula, número, símbolo)** — precisa alinhar com web primeiro. Fica em parity-drift audit posterior.
- **Telemetria/analytics do fluxo de reset** — sem provider de analytics instalado no projeto; evento seria órfão. Milestone separado quando adicionar Posthog/Segment.
- **Testes automatizados do fluxo de auth** — TEST-01 na Phase 5 (smoke tests). Esta fase não inclui testes.

### Reviewed Todos (not folded)
(Nenhum — workspace não tem todos pendentes)

</deferred>

---

*Phase: 01-auth-notifications-security*
*Context gathered: 2026-04-16*
