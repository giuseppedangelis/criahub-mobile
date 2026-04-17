# STATE — CriaHub Mobile

**Last updated:** 2026-04-17 — milestone v1.1 roadmap criado (phases 7-12)

## Project Reference

**Project:** CriaHub Mobile (Expo/React Native client do CriaHub)
**Core Value:** Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.
**Current Milestone:** v1.1 Submissão iOS App Store — Apple Launch
**Current Focus:** Configurar app para review Apple, preparar todos os campos do App Store Connect, gerar assets, submeter via TestFlight e passar na review na primeira tentativa.
**Working Branch:** `apple`

## Current Position

**Phase:** 7 — 07-ios-binary-config (context gathered)
**Plan:** —
**Status:** CONTEXT.md capturado; aguardando `/gsd-plan-phase 7`
**Last activity:** 2026-04-17 — Phase 7 discuss completo (14 decisões D-01..D-14)
**Resume here:** `.planning/phases/07-ios-binary-config/07-CONTEXT.md`

**Progress:** 0/6 phases · 0/29 REQs · `░░░░░░░░░░` 0%

## Phase Queue (v1.1)

| # | Phase | Requirements | Status |
|---|-------|--------------|--------|
| 7 | 07-ios-binary-config | IOS-01..06 (6) | Not started |
| 8 | 08-runtime-hardening | RUNTIME-01..05 (5) | Not started |
| 9 | 09-asc-metadata-legal | ASC-01..08 (8) | Not started |
| 10 | 10-demo-seed | DEMO-01, DEMO-02 (2) | Not started |
| 11 | 11-build-testflight | BUILD-01..07 (7) | Not started |
| 12 | 12-submit-review | SUBMIT-01, SUBMIT-02 (2) | Not started |

**Total REQs ativos:** 29 · **Coverage:** 29/29 ✓

**Execução:** sequencial (config.json `parallelization: false`). Phase 9 pode ser drafted em paralelo com Phase 7 no editor para destravar decisão de Nutrition Labels (ver dependências abaixo).

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| iOS build aprovado pela App Store | 1 (first-try) | 0 — roadmap criado |
| TestFlight beta distribuído | yes | no |
| App Store Connect fields preenchidos | 100% | 0% — planejamento |
| Assets entregues (ícone + splash + screenshots) | 100% | pasta `apple/` criada |
| Validação em device real (AUTH-01, APPLE-01, UX-05) | 3/3 | 0/3 |
| Phase 11 first build before 2026-04-28 (Xcode 26 floor) | yes | pending |

## Accumulated Context

### Key Decisions (inherited from v1.0)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Granularidade Coarse (6 fases) | 33 bugs agrupam naturalmente por área; mais fases = overhead sem ganho |
| 2026-04-16 | Sequencial, não paralelo | Bugfixes de auth/privacy/RLS têm dependências cruzadas |
| 2026-04-16 | Research desabilitado | Audit manual + codebase map já entregaram o research |
| 2026-04-16 | Plan checker + Verifier habilitados | Sem testes automatizados, verificação humana é a rede de segurança |
| 2026-04-16 | APPLE-01 isolado em fase própria | Requer edge function + migration próprios; não encaixa em outras áreas |
| 2026-04-17 | Milestone v1.1 = iOS-only | Foco em submit App Store; Android vai para milestone seguinte |
| 2026-04-17 | Branch dedicada `apple` | Isolar config iOS de mudanças que afetariam Android |
| 2026-04-17 | Pasta `apple/` dedicada no repo | Centralizar docs, assets, config overrides, referências de credenciais |
| 2026-04-17 | Roadmap v1.1: 6 fases (7-12) coarse sequencial | SUMMARY.md propõe 6 fases que cobrem 100% dos 29 REQs; alinha com v1.0 pattern |
| 2026-04-17 | Phase 9 começa paralelo no editor com Phase 7 | Nutrition Labels drivers `NSPrivacyCollectedDataTypes` — lock draft antes de Phase 7 finalizar |
| 2026-04-17 | Phase 11 BUILD-06 antes de 2026-04-28 | Xcode 26 / iOS 26 SDK floor; alternativa é pinar `"image": "latest"` |

### Dependency Map (v1.1)

- **Phase 9 → Phase 7**: Decisões de Nutrition Labels (ASC-04, ASC-07) drivando `NSPrivacyCollectedDataTypes` em IOS-01. Phase 9 draft deve estar lockado antes de Phase 7 finalizar.
- **Phase 10 → Phase 11**: Demo seed obrigatório para screenshots (BUILD-02) e validação TestFlight (BUILD-07).
- **Phase 11 external deadline**: First production build (BUILD-06) antes de **2026-04-28**.
- **Phase 12 ← todas**: Submit só ocorre após TestFlight validation em iPhone+iPad real.

### Open Todos

- [ ] Validação pendente de v1.0: AUTH-01 deep link em device real, APPLE-01 fluxo de exclusão, UX-05 biometria financeiro (será feito na Phase 11 via TestFlight)
- [ ] Confirmar que Apple Developer Program (Organization) enrollment está ativo — pre-Phase-7
- [ ] Confirmar se `criahub.com.br/privacidade` pode ser hospedado em lead time viável — pre-Phase-9 (lead time 1-2 semanas se precisar de legal counsel)
- [ ] Confirmar que `criahubmobile://reset-password` está allowlisted em Supabase Auth Dashboard — Phase 12 (SUBMIT-01)
- [ ] Executar `/gsd-plan-phase 7` para iniciar Phase 7

### Blockers

_None ativos._

**Potenciais bloqueadores externos a monitorar:**
- Apple Developer Organization enrollment (D-U-N-S + CNPJ, lead time 1-2 semanas se não estiver ativo)
- Privacy Policy URL lawyer sign-off (Phase 9 flagged em research como lead time 1-2 semanas)
- Xcode 26 / iOS 26 SDK floor (2026-04-28) — Phase 11 deadline

### Discoveries

- Audit manual de v1.0 identificou que `4b3eac1` foi rollback de exclusão in-app — submit atual depende de APPLE-01 já shipped (edge function `delete-account`).
- `app.json` ainda existe legado ao lado de `app.config.ts` (3 bytes só, mas presença pode confundir Expo/EAS) — IOS-03 elimina.
- `supportsTablet: true` no app.config.ts obriga entrega de screenshots iPad (13" + 12.9") — não é opcional (D-v1.1-01).
- `ITSAppUsesNonExemptEncryption: false` já setado — export compliance simplificado (IOS-06 verifica).
- Pasta `apple/` criada com estrutura (`config/`, `assets/`, `docs/`, `certificates/`) + READMEs.
- Research SUMMARY.md confirmou 6 fases via triangulação de STACK/FEATURES/ARCHITECTURE/PITFALLS.
- `expo-build-properties` é o único plugin npm novo necessário (IOS-02).

## Session Continuity

**Last command:** `/gsd-new-project` (roadmapper) — ROADMAP.md gerado
**Next expected command:** `/gsd-plan-phase 7 apple` (ou `/gsd-discuss-phase 7 apple`)
**Context files ready:**
- `.planning/PROJECT.md` — Current Milestone v1.1
- `.planning/REQUIREMENTS.md` — 29 REQs ativos com traceability preenchida
- `.planning/ROADMAP.md` — phases 7-12 detalhadas
- `.planning/STATE.md` — este arquivo
- `.planning/MILESTONES.md` — v1.0 arquivado
- `.planning/codebase/` — mapa completo do repo
- `.planning/research/SUMMARY.md` + STACK/FEATURES/ARCHITECTURE/PITFALLS
- `apple/README.md` — escopo da branch iOS
- `apple/docs/APP_STORE_CONNECT_FIELDS.md` — rascunho de metadata ASC

**Resume here:** Roadmap v1.1 criado com 6 fases sequenciais (7-12) cobrindo 100% dos 29 REQs. Phase 7 é o próximo alvo — iniciar via `/gsd-plan-phase 7`. Enquanto planeja Phase 7, iniciar draft de Phase 9 (ASC-04 Nutrition Labels) em paralelo no editor para destravar a decisão de `NSPrivacyCollectedDataTypes` em IOS-01.
