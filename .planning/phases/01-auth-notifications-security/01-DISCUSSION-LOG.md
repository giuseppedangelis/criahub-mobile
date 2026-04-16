# Phase 1: Auth & Notifications Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 01-auth-notifications-security
**Areas discussed:** Deep Link Strategy, Reset Password Surface, Session Collision Handling, clearAllReminders Scope, Offline/No-app Fallback

---

## Deep Link Strategy (D1)

| Option | Description | Selected |
|--------|-------------|----------|
| Só scheme `criahubmobile://reset-password` | Scheme já declarado em app.config.ts:14; 1 listener + redirectTo. Contra: iOS mostra prompt "Abrir no CriaHub?". | ✓ |
| Universal Link / App Link com domínio verificado | Sem prompt, mais "nativo". Exige hospedar apple-app-site-association + assetlinks.json + configurar associatedDomains. | |
| Scheme + Universal Link em paralelo (feature-flag) | Ambos suportados; fallback transparente. Mais complexidade, dois caminhos pra testar. | |

**User's choice:** Só scheme (opção a)
**Notes:** Universal Link sai do escopo do bug-bash; faz sentido em um milestone próprio de polish pré-loja dedicado a trust signals.

---

## Reset Password Surface (D2)

| Option | Description | Selected |
|--------|-------------|----------|
| Rota dedicada `app/(auth)/reset-password.tsx` + screen em `src/screens/auth/` | Espelha estrutura de login/forgot-password; abre direto via deeplink; ponto único de updateUser. | ✓ |
| Modal sobre LoginScreen | Um arquivo a menos; deeplink teria que navegar pra login e depois abrir modal. | |

**User's choice:** Rota dedicada (opção a)
**Notes:** Consistência com padrão existente (`login.tsx`/`forgot-password.tsx`) e deeplink mais direto compensam o arquivo extra.

---

## Session Collision Handling (D3)

| Option | Description | Selected |
|--------|-------------|----------|
| signOut silencioso + redireciona para reset | Seguro: link em regra é pra outra conta. Zero ambiguidade. | ✓ |
| Prompt "Você está logado como X — trocar de conta?" | Dá ao usuário controle, mas adiciona fricção num fluxo de recuperação já estressante. | |
| Permite reset da senha da sessão atual | Útil se for o próprio usuário; mas mistura escopos e facilita bug de vazamento. | |

**User's choice:** signOut silencioso (opção a)
**Notes:** Fluxo esperado do usuário é "cliquei no link do meu email no device que talvez esteja logado com outra conta"; silenciar o conflict é o default seguro.

---

## clearAllReminders Scope (D4)

| Option | Description | Selected |
|--------|-------------|----------|
| Só no signOut explícito | Fix mínimo pro P0 do audit. Não cobre refresh expirado, restore de backup, etc. | |
| signOut + onAuthStateChange quando user mismatch | Cobre signOut silencioso, refresh expirado trocando de usuário, e qualquer path que pule signOut direto. | ✓ |
| (b) + bootstrap check se map tiver entries sem sessão | Cobertura máxima; mais código, pouco ganho marginal. | |

**User's choice:** signOut + onAuthStateChange com user mismatch (opção b)
**Notes:** Linha única de defesa (só signOut) é frágil demais em fluxo multi-persona / multi-device; user-mismatch detection é a rede de segurança natural. Persistir owner-user-id em AsyncStorage é barato.

---

## Offline / No-app Fallback (D5)

| Option | Description | Selected |
|--------|-------------|----------|
| Hosted page do Supabase como fallback | User sem app cai na página padrão do Supabase e conclui pelo browser. Default do SDK. | ✓ |
| Página web própria | Customizável, branded. Requer hospedar SPA ou rota Next.js — escopo além do bug-bash. | |

**User's choice:** Hosted page do Supabase (opção a)
**Notes:** Casos de "link sem app" são marginais; investir em página custom não paga o bug-bash. Volta no roadmap se virar feedback frequente.

---

## Claude's Discretion

- **D-15:** Estilo visual do `ResetPasswordScreen` — espelhar `LoginScreen`/`ForgotPasswordScreen` (mesmos primitives `AppScreen`, `Card`, `TextField`, `AppButton`). Sem customização nova.
- **D-16:** Parsing do fragment da URL (hash vs query) — Claude decide em tempo de implementação entre `Linking.parseURL` manual e `expo-linking` `useURL`, conforme o que encaixa no ciclo de vida do layout.
- **D-17:** Estratégia entre `Linking.addEventListener("url", ...)` e `useURL()` do `expo-linking` — Claude escolhe o que menos polui o layout de auth.

## Deferred Ideas

- Universal Link / App Link com domain verification → milestone dedicado "app store polish"
- Biometria no reset → descartado (fricção sem ganho)
- Página web própria de fallback → hosted page resolve; custom fica pra site de marketing
- Complexity rules de senha → precisa alinhar com `criahub-web-v2` primeiro
- Telemetria/analytics do fluxo de reset → sem provider de analytics no projeto
- Testes automatizados do fluxo de auth → TEST-01 na Phase 5
