# STATE — CriaHub Mobile

**Last updated:** 2026-04-16 (phase 1 context gathered)

## Project Reference

**Project:** CriaHub Mobile (Expo/React Native client do CriaHub)
**Core Value:** Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.
**Current Milestone:** BUG-BASH-V1 (bug bash pré-loja v1)
**Current Focus:** Destravar submit na App Store resolvendo P0s de auth, privacy, RLS cross-haras, offline queue e Apple 5.1.1(v).

## Current Position

**Phase:** 1 — Auth & Notifications Security (context gathered)
**Plan:** —
**Status:** Phase 1 context captured; ready for `/gsd-plan-phase 1`
**Progress:** [░░░░░░░░░░] 0% (0/33 requirements complete)

### Phase Queue

1. Phase 1: Auth & Notifications Security (P0) — AUTH-01, NOTIF-01
2. Phase 2: RLS Haras Scope & Permissions (P0) — RLS-01, RLS-02, PERM-01
3. Phase 3: Offline Queue Hardening (P0) — OFFLINE-01, OFFLINE-02
4. Phase 4: Apple 5.1.1(v) In-app Deletion (P0) — APPLE-01
5. Phase 5: P1 Cleanup — 15 REQs
6. Phase 6: P2 Hygiene & Hardening — 10 REQs

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| P0 bugs remaining | 0 (submit-ready) | 8 |
| P1 bugs remaining | 0 | 15 |
| P2 bugs remaining | 0 | 10 |
| Total v1 REQs closed | 33 | 0 |
| App Store submittable | yes | no (blocked by APPLE-01 + P0s) |

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Granularidade Coarse (6 fases) | 33 bugs agrupam naturalmente por área; mais fases = overhead sem ganho |
| 2026-04-16 | Sequencial, não paralelo | Bugfixes de auth/privacy/RLS têm dependências cruzadas |
| 2026-04-16 | Research desabilitado | Audit manual + codebase map já entregaram o research |
| 2026-04-16 | Plan checker + Verifier habilitados | Sem testes automatizados, verificação humana é a rede de segurança |
| 2026-04-16 | Ordenação P0 → P1 → P2 | Critical path é submit na App Store; P0s bloqueiam |
| 2026-04-16 | APPLE-01 isolado em fase própria | Requer edge function + migration próprios; não encaixa em outras áreas |

### Open Todos

- [ ] Executar `/gsd-plan-phase 1` usando `.planning/phases/01-auth-notifications-security/01-CONTEXT.md` como input

### Blockers

_None._

### Discoveries

- Audit manual de 2026-04-16 identificou 33 REQs (PROJECT.md original citava 32 — diferença de 1 REQ no TEST ou P1, mas traceability completa na ROADMAP cobre todos os 33 listados em REQUIREMENTS.md).
- `4b3eac1` foi rollback de tentativa anterior de exclusão in-app — próximo submit depende de APPLE-01 resolvido de verdade via edge function, não via `mailto:`.
- RLS é a única barreira real: `getAnimalNamesMap` e `fetchRelative` não filtram por `haras_id` explicitamente, o que vaza dados cross-haras mesmo com RLS ativa se o usuário tem vínculo em múltiplos haras.

## Session Continuity

**Last command:** `/gsd-discuss-phase 1`
**Next expected command:** `/gsd-plan-phase 1`
**Context files ready:**
- `.planning/PROJECT.md` — context, constraints, decisions
- `.planning/REQUIREMENTS.md` — 33 REQs com REQ-IDs + traceability preenchida
- `.planning/ROADMAP.md` — 6 fases + success criteria + dependências
- `.planning/codebase/CONCERNS.md` — bugs conhecidos com arquivo:linha e fix proposto
- `.planning/config.json` — granularity=coarse, parallelization=false, workflow flags
- `.planning/phases/01-auth-notifications-security/01-CONTEXT.md` — 17 decisões (D-01 a D-17) cobrindo deep link strategy, reset password surface, session collision, clearAllReminders scope, edge cases
- `.planning/phases/01-auth-notifications-security/01-DISCUSSION-LOG.md` — audit trail das 5 áreas discutidas

**Resume here:** Phase 1 planning. Context da Fase 1 já capturado. Próximo passo é `/gsd-plan-phase 1` que vai consumir o 01-CONTEXT.md e produzir PLAN.md(s) para AUTH-01 (criar `app/(auth)/reset-password.tsx` + `ResetPasswordScreen.tsx` + listener de deep link em `(auth)/_layout.tsx` + `redirectTo` no `resetPasswordForEmail`) e NOTIF-01 (`clearAllReminders` no signOut + user-mismatch detection via AsyncStorage `@criahub:notifications/owner-user-id-v1` no `onAuthStateChange`).
