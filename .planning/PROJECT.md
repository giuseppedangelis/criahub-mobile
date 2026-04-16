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

### Active

<!-- Milestone v1: Bug bash pré-loja (2026-04). Todas as pendências saíram de audit manual + codebase map. -->

- [ ] **BUG-BASH-V1**: Resolver todos os P0 bloqueantes de lançamento nas lojas (auth, privacy, RLS cross-haras, Apple 5.1.1(v), offline queue) antes do build production
- [ ] **BUG-BASH-V1**: Resolver P1s que afetam UX ou segurança perceptível (deeplink externo, resolução de haras, N+1, enumeração de storage, scope de haras em genealogia)
- [ ] **BUG-BASH-V1**: Resolver P2s de higiene que previnem bugs futuros (typed routes, ImagePicker deprecated, duplicação de mapas de enum, `any` em RPCs)

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Brownfield — inicializar GSD sobre repo existente | Código já em produção, audit já produzido, milestone atual é bug-bash não novo produto | — Pending |
| Granularidade Coarse (6 fases) | 32 bugs agrupam naturalmente por área (auth/privacy, RLS scope, offline queue, Apple compliance, P1 cleanup, P2 hygiene); muitas fases pequenas = overhead de planejamento | — Pending |
| Sequencial, não paralelo | Bugfixes de auth e privacy dependem uns dos outros (signOut limpa notificações; RLS cross-haras afeta múltiplos callers) | — Pending |
| Research desabilitado | O audit manual já é o research — detalha cada bug com arquivo:linha + fix proposto | — Pending |
| Plan checker + Verifier habilitados | Sem testes automatizados, verificação humana do plano e da entrega é a rede de segurança | — Pending |

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
*Last updated: 2026-04-16 after initialization*
