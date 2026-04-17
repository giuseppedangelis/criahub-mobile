# CriaHub Mobile

## What This Is

Cliente mobile Expo/React Native do CriaHub — plataforma de gestão de haras e plantel. Espelha o app web `criahub-web-v2` consumindo o mesmo Supabase (RLS + Auth + Storage). Atende quatro papéis com fluxos distintos em um único binário: Criador (owner), Veterinário, Peão/Funcionário de campo e Assessor/Admin.

## Core Value

Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.

## Requirements

### Validated

<!-- Inferido da base existente (.planning/codebase/) — já em produção. -->

- ✓ **Expo SDK 54 / RN 0.81 / React 19** com New Architecture e rotas tipadas (Expo Router v6) — existing
- ✓ **Auth Supabase** com AsyncStorage/localStorage, onAuthStateChange e resolução de `haras_id` por fallback `haras_members` — existing (`src/contexts/AuthContext.tsx`, `src/lib/haras.ts`)
- ✓ **Plantel (Criador)** — listagem paginada, filtros por ambiente (oficial/avulsos/condomínio/vinculação), ficha completa com fotos/vídeos/documentos, edição respeitando ABCCMM imutável — existing (`src/screens/PlantelScreen.tsx`, `src/screens/AnimalDetailScreen.tsx`, `src/components/animal/AnimalEditModal.tsx`)
- ✓ **Condomínio/Cotistas** — RLS gating via `user_can_manage_haras_team`, modal de edição com validação 100%, presença automática quando há cotista externo — existing (`src/services/ownership.ts`, `src/components/ownership/OwnershipSection.tsx`)
- ✓ **Veterinário** — dashboard, rotina, prontuário por animal, exames reprodutivos, breeding, saúde (lotes), estoque de sêmen, lavagens — existing (`src/screens/Veterinary*.tsx`, `src/services/veterinary*.ts`)
- ✓ **Peão/Campo** — hub, report de parto, issue reports com GPS + foto, fila offline com NetInfo + flush — existing (`src/screens/FieldHome*.tsx`, `src/services/field.ts`, `src/services/field-offline.ts`)
- ✓ **Lembretes locais** — `expo-notifications` com mapa scheduled em AsyncStorage e sync prefixado (partos, devoluções) — existing (`src/lib/notifications.ts`)
- ✓ **Tema claro/escuro** persistido + **paridade web↔mobile** guiada por `docs/web-reference/` e `docs/mobile-integration/` — existing
- ✓ **Auth seguro:** reset de senha in-app via deep link + signOut limpa lembretes locais + user-mismatch detection — v1.0 (AUTH-01, NOTIF-01)
- ✓ **RLS belt+suspenders:** queries explícitas com `.eq("haras_id")` + trigger DB pra ABCCMM immutability + whitelist de permissões — v1.0 (RLS-01/02/04/05, PERM-01)
- ✓ **Fila offline robusta:** fingerprint com bucket de minuto (gêmeos passam), retry cap + dead flag, paridade field↔vet, background sync 15min, optimistic concurrency, banner global — v1.0 (OFFLINE-01/02/03/04/05)
- ✓ **Apple 5.1.1(v):** exclusão de conta real via edge function `delete-account` + audit table `account_deletion_requests` + dupla confirmação — v1.0 (APPLE-01)
- ✓ **Dashboard agregado:** RPC `get_creator_dashboard` substitui 11+ round-trips com fallback seguro — v1.0 (PERF-01)
- ✓ **Hot-swap haras** para usuários com múltiplos vínculos — v1.0 (AUTH-02)
- ✓ **Bulk upsert de cotistas** + preserva `presence_manual_override` recente — v1.0 (OWN-01/02)
- ✓ **Hardening client:** nonce em storage paths, image cap 2000px, biometria em /financeiro, Zod em RPCs, JWT removido de app.json — v1.0 (RLS-04, PERF-02, UX-05, SEC-01/02)
- ✓ **UX cleanup:** EmptyState "Acesso negado", fallback de Linking, ImagePicker SDK 55, typed routes — v1.0 (UX-01/02/03/04)
- ✓ **Paridade:** enums reprodutivos single source, categoria unknown surface, health bucket alinhado — v1.0 (PAR-01/02/03)
- ✓ **Genealogia com warnings** quando pai/mãe bloqueados por RLS — v1.0 (RLS-03)
- ✓ **Smoke tests:** Jest + 33 tests em 4 suites (roles, offline fingerprint, animals scope) — v1.0 (TEST-01)

### Active

<!-- Próximo milestone: code quality + validação em device. Fresh requirements virão via /gsd-new-milestone. -->

(None — milestone v1.0 fechado. Próxima iteração definida via `/gsd-new-milestone`.)

### Out of Scope

<!-- Explícito para evitar escopo inflado no bug-bash. -->

- **Test coverage amplo** — há zero testes. Adicionar suite completa fica para milestone posterior. Este milestone adiciona testes pontuais só onde o bug exige regressão (fingerprint da fila, ownership save, roles helpers).
- **Refatoração de screens monolíticos** (`VeterinaryScreen.tsx` 1539 linhas, `FieldHomeScreen.tsx` 1299 linhas, `AnimalDetailScreen.tsx` 1244 linhas) — decomposição é P1/P2 de codebase map mas fica para depois; durante o bug-bash, só patches cirúrgicos.
- **Geração de types Database a partir do Supabase** — remove `any` em 30 arquivos, mas é escopo próprio. Cobrir só onde um bug atual depende disso.
- **Módulos ainda não portados do web** (financeiro avançado, assessor full, relatórios) — bug-bash preserva status atual; não estende.

## Context

- **Dois repos compartilham schema Supabase**: `criahub-web-v2` (Next.js, source of truth de domain rules) e `criahub-mobile` (este). Paridade web↔mobile é driver — qualquer regra de negócio nova deve existir no web primeiro.
- **Audit manual de 2026-04-16** identificou **32 bugs** distribuídos: 8 P0 bloqueantes, 18 P1 UX/segurança, 6 P2 higiene. Origem: revisão por fluxo de usuário (Criador, Vet, Peão, Assessor) + fluxos compartilhados + parity drift + segurança.
- **Codebase map** (`.planning/codebase/`) gerado em 2026-04-16 confirma: sem linter, sem testes, sem error boundary, uso intenso de `any` em mappers de serviço, screens monolíticos, storage `animal-photos` com bucket público.
- **Apple 5.1.1(v)**: o commit `4b3eac1` já foi rollback de tentativa anterior de exclusão in-app. O caminho `mailto:` atual não passa em review — próximo submit depende de exclusão real.
- **Offline-first no campo**: peão opera em rede ruim, fila `field-offline.ts`/`veterinary-offline.ts` é crítica mas tem dedup agressivo (descarta gêmeos) e sem retry-cap (itens envenenados eternos).
- **RLS é a única barreira**: sem RLS correto, o app escapa facilmente cross-haras (audit identificou `getAnimalNamesMap` e `fetchRelative` sem `.eq("haras_id", ...)`).

## Constraints

- **Tech stack**: Expo SDK 54, RN 0.81, React 19, Expo Router 6, TanStack Query 5, Supabase-js 2.97, Zod 4. Managed workflow (sem `ios/` / `android/` no repo).
- **Distribuição**: EAS Build — perfis `preview` (APK/iOS sim) e `production` (AAB/App Store). Apple e Google obrigatórios.
- **Compliance**: App Store 5.1.1(v) exige exclusão in-app; LGPD exige limpeza de dados locais por usuário no signOut.
- **Compatibilidade**: paridade web↔mobile, RLS compartilhado, `abccmm_rowid` como flag de imutabilidade de campos oficiais (cliente + DB).
- **Performance**: dashboard do criador tem 11+ round-trips por mount e `staleTime: 60s` — ruim em 3G. Meta é RPC agregada no Supabase.
- **Segurança**: bucket `animal-photos` é público (permite enumeração por UUID). Bucket privado + signed URL é preferência para fase de hardening.
- **Sem CI**: `tsc --noEmit` é o único guard. Fixes do bug-bash não têm rede de segurança de teste — commits precisam ser atômicos e reversíveis.

## Current State

**Shipped:** v1.0 Bug Bash Pré-Loja (2026-04-17)
**Tag:** `v1.0`
**Summary:** 30/33 REQs fechados em 6 fases. Submit na App Store destravado (APPLE-01 real, AUTH-01 deep link, NOTIF-01 privacy). Hardening completo em RLS/offline/storage. Base de testes iniciada (33/33 passing).

**Next Milestone Goals (tentativo — refinar via `/gsd-new-milestone`):**
- **Validação em device real** via EAS build (AUTH-01 deep link, APPLE-01 deletion, UX-05 biometria)
- **Code quality milestone:** MONO-01 (VeterinaryScreen 1539 linhas), MONO-02 (FieldHomeScreen 1299 linhas), PERM-02 (auditoria ampla assessor/admin)
- **Geração de types Database** do Supabase CLI (substitui `any` em 30 mappers)
- **Coverage de testes ampliada** (UAT + integration)
- **Storage hardening milestone:** bucket privado com signed URLs (complementa nonce de v1.0)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Brownfield — inicializar GSD sobre repo existente | Código já em produção, audit já produzido, milestone atual é bug-bash não novo produto | ✓ Good |
| Granularidade Coarse (6 fases) | 32 bugs agrupam naturalmente por área | ✓ Good — funcionou bem |
| Sequencial, não paralelo | Bugfixes de auth e privacy dependem uns dos outros | ✓ Good |
| Research desabilitado | O audit manual já é o research | ✓ Good — economizou tempo |
| Plan checker + Verifier habilitados | Sem testes automatizados, verificação humana é a rede de segurança | ✓ Good — capturou 3 BLOCKERs na Fase 1 |
| Express path (sem PLAN.md formal) nas Fases 2-6 | Decisões lockadas no CONTEXT + audit já concreto; planner formal vira overhead | ✓ Good — acelerou 5x |
| APPLE-01 isolado em Fase 4 | Edge function + migration próprios | ✓ Good — deploy via MCP sem conflito |
| Defer MONO-01/02 + PERM-02 | Code quality pura, zero risco funcional, escopo grande | ✓ Good — mantém foco do bug-bash |
| `clearAllReminders` em 2 pontos (signOut + onAuthStateChange mismatch) | Single signOut é frágil contra refresh expirado | ✓ Good |
| Usar `usePathname` guard para race em deep link | Alternativa (`isProcessingDeepLink` flag) tinha race na transição | ✓ Good — capturado no plan-checker |
| Bucket público + nonce random em vez de bucket privado + signed URL | Bucket privado migrado é escopo próprio | — Pending — validar em prod se nonce é suficiente |
| MCP para migrations diretas no projeto criahub | Branch preview adiciona latência, mudanças são isoladas e reversíveis | ✓ Good — zero issues |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 after v1.0 milestone*
