# STATE — CriaHub Mobile

**Last updated:** 2026-04-17 — milestone v1.1 Submissão iOS App Store started

## Project Reference

**Project:** CriaHub Mobile (Expo/React Native client do CriaHub)
**Core Value:** Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.
**Current Milestone:** v1.1 Submissão iOS App Store — Apple Launch
**Current Focus:** Configurar app para review Apple, preparar todos os campos do App Store Connect, gerar assets, submeter via TestFlight e passar na review na primeira tentativa.
**Working Branch:** `apple`

## Current Position

**Phase:** Not started (defining requirements)
**Plan:** —
**Status:** Defining requirements
**Last activity:** 2026-04-17 — Milestone v1.1 started via `/gsd-new-milestone`

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| iOS build aprovado pela App Store | 1 (first-try) | 0 — defining requirements |
| TestFlight beta distribuído | yes | no |
| App Store Connect fields preenchidos | 100% | 0% — pesquisa em andamento |
| Assets entregues (ícone + splash + screenshots) | 100% | pasta `apple/` criada |
| Validação em device real (AUTH-01, APPLE-01, UX-05) | 3/3 | 0/3 |

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

### Open Todos

- [ ] Revisar output do agente de pesquisa em `apple/docs/APP_STORE_CONNECT_FIELDS.md` (em progresso em background)
- [ ] Aguardando definição de requirements e roadmap v1.1
- [ ] Validação pendente de v1.0: AUTH-01 deep link em device real, APPLE-01 fluxo de exclusão, UX-05 biometria financeiro

### Blockers

_None._ (Possíveis bloqueadores futuros: conta Apple Developer ativa, Privacy Policy URL hospedada, demo accounts criadas para review)

### Discoveries

- Audit manual de v1.0 identificou que `4b3eac1` foi rollback de exclusão in-app — submit atual depende de APPLE-01 já shipped (edge function `delete-account`).
- `app.json` ainda existe legado ao lado de `app.config.ts` (3 bytes só, mas presença pode confundir Expo/EAS) — auditar durante v1.1.
- `supportsTablet: true` no app.config.ts obriga entrega de screenshots iPad (13" + 12.9") — não é opcional.
- `ITSAppUsesNonExemptEncryption: false` já setado — export compliance simplificado.
- Pasta `apple/` criada com estrutura (`config/`, `assets/`, `docs/`, `certificates/`) + READMEs.

## Session Continuity

**Last command:** `/gsd-new-milestone` (in progress)
**Next expected command:** `/gsd-plan-phase 7 apple` (ou `/gsd-discuss-phase 7 apple`)
**Context files ready:**
- `.planning/PROJECT.md` — atualizado com Current Milestone v1.1
- `.planning/STATE.md` — este arquivo
- `.planning/MILESTONES.md` — v1.0 arquivado
- `.planning/codebase/` — mapa completo do repo
- `apple/README.md` — escopo da branch iOS
- `apple/docs/APP_STORE_CONNECT_FIELDS.md` — (em geração por agente de pesquisa)

**Resume here:** Milestone v1.1 em definição. Próximos passos do workflow: scoping de requirements por categoria (Config, Assets, Metadata, Privacy, Review, Build/TestFlight, Validation), geração de REQUIREMENTS.md com REQ-IDs, spawn do roadmapper para gerar fases (continua numeração a partir da 7).
