# STATE — CriaHub Mobile

**Last updated:** 2026-04-17 (v1.0 Bug Bash Pré-Loja milestone shipped)

## Project Reference

**Project:** CriaHub Mobile (Expo/React Native client do CriaHub)
**Core Value:** Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.
**Current Milestone:** BUG-BASH-V1 (bug bash pré-loja v1)
**Current Focus:** Destravar submit na App Store resolvendo P0s de auth, privacy, RLS cross-haras, offline queue e Apple 5.1.1(v).

## Current Position

**Phase:** Milestone v1.0 shipped — awaiting next milestone via `/gsd-new-milestone`
**Plan:** —
**Status:** v1.0 closed. 30/33 REQs shipped, 3 deferred (PERM-02, MONO-01, MONO-02).
**Progress:** [██████████] 100% (30/33 v1.0 requirements complete; 3 deferred to next milestone)

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
| P0 bugs remaining | 0 (submit-ready) | **0** ✓ |
| P1 bugs remaining | 0 | 2 (PERM-02, MONO-01 deferred) |
| P2 bugs remaining | 0 | 1 (MONO-02 deferred) |
| Total v1 REQs closed | 33 | **30** (3 deferred) |
| App Store submittable | yes | **yes** — APPLE-01 shipped, pendente validação EAS |

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

- [ ] Executar `/gsd-execute-phase 1` — rodar os 4 PLAN.md em wave order (Wave 1: 01-01 → Wave 2: 01-02 → 01-03 → Wave 3: 01-04)

### Blockers

_None._

### Discoveries

- Audit manual de 2026-04-16 identificou 33 REQs (PROJECT.md original citava 32 — diferença de 1 REQ no TEST ou P1, mas traceability completa na ROADMAP cobre todos os 33 listados em REQUIREMENTS.md).
- `4b3eac1` foi rollback de tentativa anterior de exclusão in-app — próximo submit depende de APPLE-01 resolvido de verdade via edge function, não via `mailto:`.
- RLS é a única barreira real: `getAnimalNamesMap` e `fetchRelative` não filtram por `haras_id` explicitamente, o que vaza dados cross-haras mesmo com RLS ativa se o usuário tem vínculo em múltiplos haras.

## Session Continuity

**Last command:** `/gsd-plan-phase 1 --auto`
**Next expected command:** `/gsd-execute-phase 1`
**Context files ready:**
- `.planning/PROJECT.md` — context, constraints, decisions
- `.planning/REQUIREMENTS.md` — 33 REQs com REQ-IDs + traceability preenchida
- `.planning/ROADMAP.md` — 6 fases + success criteria + dependências
- `.planning/codebase/CONCERNS.md` — bugs conhecidos com arquivo:linha e fix proposto
- `.planning/config.json` — granularity=coarse, parallelization=false, workflow flags
- `.planning/phases/01-auth-notifications-security/01-CONTEXT.md` — 17 decisões (D-01 a D-17)
- `.planning/phases/01-auth-notifications-security/01-DISCUSSION-LOG.md` — audit trail
- `.planning/phases/01-auth-notifications-security/01-01-PLAN.md` — NOTIF-01 (wave 1, 3 tasks)
- `.planning/phases/01-auth-notifications-security/01-02-PLAN.md` — AUTH-01.a redirectTo + mensagem ForgotPassword (wave 2, 2 tasks)
- `.planning/phases/01-auth-notifications-security/01-03-PLAN.md` — AUTH-01.b ResetPasswordScreen + rota (wave 2, 3 tasks)
- `.planning/phases/01-auth-notifications-security/01-04-PLAN.md` — AUTH-01.c deep link listener com usePathname guard + parse de fragment (wave 3, 2 tasks)

**Resume here:** Phase 1 execution. 4 plans validados pelo plan-checker (iteração 2 passou sem blockers). Próximo passo: `/gsd-execute-phase 1 --auto`. Plans seguem wave order e têm checkpoints human-verify nos pontos críticos (NOTIF-01 validação, ResetPassword visual, deep link end-to-end em EAS build). Execução autônoma via gsd-executor com commits atômicos por task.
