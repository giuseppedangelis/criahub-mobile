# ROADMAP — CriaHub Mobile

**Milestone:** Bug bash pré-loja v1 (BUG-BASH-V1)
**Type:** Corretivo (33 bugfixes, todos já identificados no audit 2026-04-16)
**Granularity:** Coarse (6 fases)
**Parallelization:** false (sequencial — dependências entre auth/privacy/RLS)
**Created:** 2026-04-16

## Overview

Este milestone é um **bug bash corretivo**, não uma entrega de features. Cada fase agrupa bugs por área do sistema respeitando ordenação por severidade: P0s primeiro (bloqueiam submit de loja), depois P1s (degradam UX/segurança sem bloquear), depois P2s (higiene). Dentro da mesma severidade, bugs são agrupados por área para que um único PR toque arquivos relacionados.

**Critical path:** Fases 1–4 destravam submit na App Store. Fase 5 e 6 seguem após P0s resolvidos.

## Phases

- [ ] **Phase 1: Auth & Notifications Security (P0)** — Deeplink de reset de senha + limpeza de lembretes no signOut
- [ ] **Phase 2: RLS Haras Scope & Permissions (P0)** — Fechar vazamentos cross-haras em lookups e toggle de presença
- [ ] **Phase 3: Offline Queue Hardening (P0)** — Dedup de partos gêmeos + retry-cap com bucket "failed"
- [ ] **Phase 4: Apple 5.1.1(v) In-app Deletion (P0)** — Exclusão real de conta via edge function (destrava App Store)
- [ ] **Phase 5: P1 Cleanup (UX, Perf, Paridade)** — 15 P1s agrupados: hot-swap haras, bulk ownership, dashboard RPC, monolíticos, enums, smoke tests
- [ ] **Phase 6: P2 Hygiene & Hardening** — 10 P2s de prevenção: storage privado, ABCCMM enforcement DB, Zod em RPCs, typed routes, biometria em financeiro

## Phase Details

### Phase 1: Auth & Notifications Security (P0)

**Goal:** Destravar o fluxo de recuperação de senha in-app e eliminar vazamento de notificações entre usuários no mesmo device.

**Depends on:** Nothing (foundation)

**Requirements:** AUTH-01, NOTIF-01

**Success Criteria** (what must be TRUE):
  1. Usuário completa o fluxo "Esqueci minha senha" sem sair do app — o link do email abre diretamente a tela de reset dentro do binário.
  2. Após signOut de um usuário no device, nenhum lembrete agendado dele dispara antes do próximo login.
  3. Usuário B logando no mesmo device não recebe notificações pendentes do usuário A.

**Plans:** TBD

### Phase 2: RLS Haras Scope & Permissions (P0)

**Goal:** Garantir que lookups de animals e toggles de permissão respeitem o haras ativo do usuário, eliminando leaks cross-haras.

**Depends on:** Phase 1 (fluxo de auth precisa estar sólido antes de ajustar escopo por sessão)

**Requirements:** RLS-01, RLS-02, PERM-01

**Success Criteria** (what must be TRUE):
  1. Vet/assessor com vínculo em múltiplos haras só vê nomes de animais do haras ativo na dashboard e em lookups de tarefas.
  2. Tela de genealogia (pai/mãe) de um animal só retorna ascendentes do mesmo haras do filho.
  3. Toggle de presença em `AnimalDetailScreen` só aparece para criador e veterinário — `unknown`/`admin`/`assessor`/`advisor` não veem o controle.
  4. Peão/funcionário de campo não consegue disparar toggle de presença via UI.

**Plans:** TBD
**UI hint**: yes

### Phase 3: Offline Queue Hardening (P0)

**Goal:** Fila offline passa a tolerar eventos legítimos duplicados (gêmeos) e para de acumular itens envenenados indefinidamente.

**Depends on:** Nothing (standalone — toca `field-offline.ts` e `veterinary-offline.ts` isoladamente)

**Requirements:** OFFLINE-01, OFFLINE-02

**Success Criteria** (what must be TRUE):
  1. Peão registra dois partos da mesma égua em janela curta (gêmeos/dupla ovulação) e ambos sobem ao backend — nenhum é descartado silenciosamente pelo dedup.
  2. Um item com payload envenenado é marcado como "failed" após 10 tentativas e move para um bucket visível no app, parando de reaparecer como "sincronização pendente".
  3. Usuário consegue ver os itens falhos e exportar/purgar a lista manualmente.

**Plans:** TBD
**UI hint**: yes

### Phase 4: Apple 5.1.1(v) In-app Deletion (P0)

**Goal:** Implementar exclusão real de conta dentro do app, destravando o submit na App Store após o rollback do commit `4b3eac1`.

**Depends on:** Nothing (standalone — edge function + migration próprios, não conflita com outras fases)

**Requirements:** APPLE-01

**Success Criteria** (what must be TRUE):
  1. Usuário toca "Excluir minha conta" em `AccountScreen`, confirma, e a sessão é encerrada imediatamente no device.
  2. A conta é enfileirada para hard-delete no backend (`account_deletion_requests`) sem depender de fluxo `mailto:`.
  3. O fluxo não expõe email de suporte nem abre o cliente de email do sistema.
  4. Reviewer Apple consegue reproduzir exclusão in-app em uma única sessão de teste.

**Plans:** TBD
**UI hint**: yes

### Phase 5: P1 Cleanup (UX, Perf, Paridade)

**Goal:** Resolver os P1s que degradam UX, performance e paridade web↔mobile sem bloquear o submit — faixa mais larga de mudanças sob um único guarda-chuva de "pós-P0".

**Depends on:** Phase 1, Phase 2, Phase 3, Phase 4 (P0s precisam estar prontos antes de tocar em áreas não-bloqueantes)

**Requirements:** AUTH-02, RLS-03, PERM-02, OFFLINE-03, OFFLINE-04, OWN-01, OWN-02, PERF-01, UX-01, UX-02, UX-03, MONO-01, PAR-01, PAR-03, TEST-01

**Success Criteria** (what must be TRUE):
  1. Vet/assessor com vínculo em múltiplos haras troca de haras ativo dentro do app sem logout (hot-swap).
  2. Dashboard do criador monta em uma única RPC agregada — round-trips caem de 11+ para 1.
  3. Save de cotistas em condomínio com 5 shares dispara no máximo 2 round-trips (upsert em lote + deactivation com `.in()`), e não sobrescreve `presence_manual_override` recente sem confirmação.
  4. Tela de detalhe de animal mostra estado "Acesso negado" claro quando RLS bloqueia leitura, em vez de skeleton eterno; links externos falhos mostram `Alert.alert` com fallback.
  5. Enums reprodutivos têm fonte única (`src/domain/enums.ts`), documentos de saúde usam bucket consistente com web, e `ImagePicker.MediaTypeOptions.Images` foi removido de todos os callsites.
  6. Smoke tests pontuais (roles, fingerprint da fila, ownership save, haras scope em services) rodam via `npm test` e cobrem as áreas que o bug-bash tocou.

**Plans:** TBD
**UI hint**: yes

### Phase 6: P2 Hygiene & Hardening

**Goal:** Fechar os P2s de higiene e prevenção — mudanças que não impactam comportamento visível imediato mas reduzem superfície de bugs futuros.

**Depends on:** Phase 5 (P1s antes de higiene)

**Requirements:** RLS-04, RLS-05, OFFLINE-05, PERF-02, UX-04, UX-05, MONO-02, PAR-02, SEC-01, SEC-02

**Success Criteria** (what must be TRUE):
  1. Bucket `animal-photos` deixa de permitir enumeração por UUID — migra para bucket privado com signed URL (ou nonce random no path), e imutabilidade ABCCMM passa a ser enforced no banco via trigger/grants, não só no cliente.
  2. Uploads de foto são capados a 2000px longest edge via `expo-image-manipulator` antes do envio — arquivos de 6–12 MB caem para sub-2 MB.
  3. Banner global de estado offline aparece em qualquer screen do app, não só em `FieldHomeScreen`.
  4. Tela `/financeiro` exige re-autenticação biométrica antes de mostrar dados financeiros.
  5. `app.json` deixa de ter URL e anon JWT hard-coded (tudo via `app.config.ts` + `Constants.expoConfig.extra`), e RPCs `(supabase as any).rpc(...)` validam retorno via Zod em vez de assumir shape.
  6. Categoria desconhecida em `mapAnimalFromDb` vira `"unknown"` com warning, não `"potro"` silencioso; `router.push(... as any)` substituído por hrefs tipados.

**Plans:** TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Notifications Security | 0/0 | Not started | - |
| 2. RLS Haras Scope & Permissions | 0/0 | Not started | - |
| 3. Offline Queue Hardening | 0/0 | Not started | - |
| 4. Apple 5.1.1(v) In-app Deletion | 0/0 | Not started | - |
| 5. P1 Cleanup | 0/0 | Not started | - |
| 6. P2 Hygiene & Hardening | 0/0 | Not started | - |

## Traceability

| REQ-ID | Priority | Phase | Category |
|--------|----------|-------|----------|
| AUTH-01 | P0 | Phase 1 | Auth & Sessão |
| NOTIF-01 | P0 | Phase 1 | Privacidade & Notificações |
| RLS-01 | P0 | Phase 2 | Escopo de Haras & RLS |
| RLS-02 | P0 | Phase 2 | Escopo de Haras & RLS |
| PERM-01 | P0 | Phase 2 | Permissões por Role |
| OFFLINE-01 | P0 | Phase 3 | Offline Queue |
| OFFLINE-02 | P0 | Phase 3 | Offline Queue |
| APPLE-01 | P0 | Phase 4 | Apple Compliance |
| AUTH-02 | P1 | Phase 5 | Auth & Sessão |
| RLS-03 | P1 | Phase 5 | Escopo de Haras & RLS |
| PERM-02 | P1 | Phase 5 | Permissões por Role |
| OFFLINE-03 | P1 | Phase 5 | Offline Queue |
| OFFLINE-04 | P1 | Phase 5 | Offline Queue |
| OWN-01 | P1 | Phase 5 | Ownership / Cotistas |
| OWN-02 | P1 | Phase 5 | Ownership / Cotistas |
| PERF-01 | P1 | Phase 5 | Dashboard & Performance |
| UX-01 | P1 | Phase 5 | UX & Frontend Hygiene |
| UX-02 | P1 | Phase 5 | UX & Frontend Hygiene |
| UX-03 | P1 | Phase 5 | UX & Frontend Hygiene |
| MONO-01 | P1 | Phase 5 | Monolíticas |
| PAR-01 | P1 | Phase 5 | Domínio & Paridade |
| PAR-03 | P1 | Phase 5 | Domínio & Paridade |
| TEST-01 | P1 | Phase 5 | Cobertura de Testes |
| RLS-04 | P2 | Phase 6 | Escopo de Haras & RLS |
| RLS-05 | P2 | Phase 6 | Escopo de Haras & RLS |
| OFFLINE-05 | P2 | Phase 6 | Offline Queue |
| PERF-02 | P2 | Phase 6 | Dashboard & Performance |
| UX-04 | P2 | Phase 6 | UX & Frontend Hygiene |
| UX-05 | P2 | Phase 6 | UX & Frontend Hygiene |
| MONO-02 | P2 | Phase 6 | Monolíticas |
| PAR-02 | P2 | Phase 6 | Domínio & Paridade |
| SEC-01 | P2 | Phase 6 | Segurança |
| SEC-02 | P2 | Phase 6 | Segurança |

**Coverage:** 33/33 v1 requirements mapped ✓ — no orphans, no duplicates.

---

## Notes

- **Corretivo, não feature milestone:** Cada REQ-ID é um bug já identificado no audit manual de 2026-04-16. Nenhum novo produto/feature está em escopo.
- **Ordenação por severidade:** P0 (Fases 1–4) → P1 (Fase 5) → P2 (Fase 6). Critical path para submit de loja passa pelas Fases 1–4.
- **Dentro de cada severidade, agrupamento é por área do sistema:** um PR da Fase 2 toca RLS+permissões; um PR da Fase 3 toca só filas offline; um PR da Fase 4 toca só edge function de exclusão de conta.
- **Sem testes automatizados como rede de segurança:** fixes precisam ser atômicos e reversíveis. TEST-01 (Fase 5) adiciona smoke tests pontuais apenas nas áreas tocadas pelo bug-bash.
- **Paridade web↔mobile é driver constante:** PAR-01, PAR-03 (Fase 5) e PAR-02 (Fase 6) garantem que o mobile não diverge de `criahub-web-v2`.

*Last updated: 2026-04-16 after initialization*
