# REQUIREMENTS — CriaHub Mobile

**Milestone:** Bug bash pré-loja v1
**Source:** Audit manual 2026-04-16 (32 bugs) + codebase map `.planning/codebase/`

Todos os requisitos deste milestone são **corretivos** — cada um fecha um bug identificado. `[P0]` = bloqueante para submit de loja. `[P1]` = degrada UX ou expõe dado sem bloquear. `[P2]` = higiene e prevenção de bugs futuros.

## v1 Requirements

### Auth & Sessão (AUTH)

- [ ] **AUTH-01** [P0]: Usuário consegue redefinir senha pelo fluxo "Esqueci minha senha" sem precisar digitar a senha nova em navegador externo — o link do email deve abrir o app e levar para tela de reset. *(fix ref: `src/contexts/AuthContext.tsx:155`, `src/screens/auth/ForgotPasswordScreen.tsx:39`, `app/(auth)/_layout.tsx`)*

- [ ] **AUTH-02** [P1]: Veterinário e assessor com vínculo em múltiplos haras conseguem trocar de haras ativo dentro do app sem fazer logout. *(fix ref: `src/lib/haras.ts:7-31`, adicionar `hotSwapHaras` no `AuthContext`)*

### Privacidade & Notificações (NOTIF)

- [ ] **NOTIF-01** [P0]: Ao fazer signOut, todos os lembretes locais agendados do usuário atual são cancelados antes do próximo login, impedindo que usuário B receba notificações do A no mesmo device. *(fix ref: `src/contexts/AuthContext.tsx:148` chama `clearAllReminders()` de `src/lib/notifications.ts:160`)*

### Escopo de Haras & RLS (RLS)

- [ ] **RLS-01** [P0]: `getAnimalNamesMap` e qualquer outra lookup de `animals` filtra por `haras_id` explicitamente, nunca confiando só em RLS. *(fix ref: `src/services/veterinary.ts:63-68`)*

- [ ] **RLS-02** [P0]: `fetchRelative` (genealogia de pai/mãe) só retorna animais do mesmo `haras_id` do filho, evitando vazamento cross-haras quando vet/peão tem vínculo em múltiplos haras. *(fix ref: `src/services/animals.ts:128-148`, receber `harasId` e filtrar)*

- [ ] **RLS-03** [P1]: `fetchRelative` distingue "pai não cadastrado" de "RLS bloqueou" via array de warnings, em paridade com o padrão de `animal-details.ts:208-212`. *(fix ref: `src/services/animals.ts:137-139`)*

- [ ] **RLS-04** [P2]: RLS do storage `animal-photos` bloqueia enumeração por UUID (bucket privado + signed URL com expiry OU nonce random no path). *(fix ref: `src/services/animal-media.ts:40`)*

- [ ] **RLS-05** [P2]: ABCCMM imutabilidade é enforced no banco (column-level grants ou trigger), não só no cliente. *(fix ref: `src/components/animal/AnimalEditModal.tsx:191-200` + nova migration)*

### Permissões por Role (PERM)

- [ ] **PERM-01** [P0]: Toggle de presença em `AnimalDetailScreen` só aparece para criador e veterinário — nunca para `unknown`, `admin`, `assessor`, `advisor`. *(fix ref: `src/screens/AnimalDetailScreen.tsx:140`; trocar `!isFieldStaffRole(role)` por check explícito)*

- [ ] **PERM-02** [P1]: Assessor/admin/advisor seguem bloqueados em `/unsupported`; se em algum módulo virem acesso via helper compartilhado, a regra tem que ser consciente, não acidental como em `AnimalDetailScreen.tsx:140-142`. *(fix ref: `src/lib/roles.ts:60`, `app/index.tsx:24`, `AnimalDetailScreen.tsx:140`)*

### Offline Queue (OFFLINE)

- [ ] **OFFLINE-01** [P0]: Fila offline aceita dois partos legítimos da mesma égua em janela curta (gêmeos, dupla ovulação) — o fingerprint inclui `created_at` bucket ou `reference_id` gerado. *(fix ref: `src/services/field-offline.ts:5,60`)*

- [ ] **OFFLINE-02** [P0]: Itens envenenados na fila vet/field têm limite de retry (`max_retries=10`) e movem para bucket "failed" visível em UI; usuário consegue exportar/purgar. *(fix ref: `src/services/veterinary.ts:639-659`, `src/services/veterinary-offline.ts`)*

- [ ] **OFFLINE-03** [P1]: Sync em background roda mesmo com o app fora do foreground (expo-background-fetch a cada 15min quando online). *(fix ref: `src/screens/FieldHomeScreen.tsx:224-234`)*

- [ ] **OFFLINE-04** [P1]: Flush da fila checa `updated_at` cacheado (optimistic concurrency) antes de re-executar mutação, evitando ressuscitar status stale após edição do criador. *(fix ref: `src/services/field-offline.ts` + `veterinary-offline.ts`)*

- [ ] **OFFLINE-05** [P2]: Banner global indica estado offline em qualquer screen, não só `FieldHomeScreen`. *(fix ref: `src/services/field.ts:51`)*

### Apple Compliance (APPLE)

- [ ] **APPLE-01** [P0]: Usuário consegue excluir conta dentro do app, sem precisar abrir email — edge function `delete-account` valida JWT, enfileira em `account_deletion_requests`, faz soft-delete imediato da sessão. *(fix ref: `src/screens/AccountScreen.tsx:210-249` — substitui fluxo mailto; commit `4b3eac1` foi rollback motivado por Apple 5.1.1(v))*

### Ownership / Cotistas (OWN)

- [ ] **OWN-01** [P1]: Save de cotistas em condomínio usa upsert em lote e `.in()` para deactivation (ao invés de N+1 round-trips sequenciais). *(fix ref: `src/services/ownership.ts:146-204`)*

- [ ] **OWN-02** [P1]: Save de cotistas não sobrescreve `presence_manual_override` recentemente setado pelo usuário — checa timestamp ou pede confirmação antes de forçar `is_at_haras=false`. *(fix ref: `src/services/ownership.ts:212-215`)*

### Dashboard & Performance (PERF)

- [ ] **PERF-01** [P1]: Dashboard do criador usa RPC agregada `get_creator_dashboard(haras_id)` em vez de 11+ queries por mount. *(fix ref: `src/services/dashboard.ts:276-300`, `src/lib/query-client.ts:7`)*

- [ ] **PERF-02** [P2]: Uploads de foto aplicam cap de 2000px (longest edge) via `expo-image-manipulator` antes do upload, reduzindo 6–12MB para sub-2MB. *(fix ref: todas as chamadas `launchImageLibraryAsync`/`launchCameraAsync` com `quality: 0.7-0.8`)*

### UX & Frontend Hygiene (UX)

- [ ] **UX-01** [P1]: `Linking.openURL` mostra fallback via `Alert.alert` quando `canOpenURL` falha, espelhando padrão de `AccountScreen.tsx:232-245`. *(fix ref: `src/screens/AnimalDetailScreen.tsx:244-248`)*

- [ ] **UX-02** [P1]: Detalhe de animal sem permissão mostra `EmptyState "Acesso negado"` em vez de skeleton eterno quando RLS bloqueia leitura. *(fix ref: `src/screens/AnimalDetailScreen.tsx:229-242`)*

- [ ] **UX-03** [P1]: `ImagePicker.MediaTypeOptions.Images` (removido em SDK 55) substituído por `["images"]` em todos os callsites. *(fix ref: `src/screens/FieldHomeScreen.tsx:57`, `src/screens/FieldHomeHubScreen.tsx:34`, `src/components/tasks/TaskExecutionModal.tsx:52`)*

- [ ] **UX-04** [P2]: `router.push(... as any)` substituído por `router.push({ pathname: "/(app)/..." })` tipado em todas as telas afetadas. *(fix ref: `AccountScreen.tsx:161,166`, `CreatorDashboardScreen.tsx:187,249`, `CreatorNoticesScreen.tsx:100`)*

- [ ] **UX-05** [P2]: Tela `/financeiro` exige re-autenticação biométrica (`expo-local-authentication`) antes de mostrar dados financeiros. *(fix ref: `src/screens/CreatorFinancialScreen.tsx`)*

### Monolíticas (MONO)

- [ ] **MONO-01** [P1]: `VeterinaryScreen.tsx` (1539 linhas) extrai cada modal/tab em sub-componente com `React.memo` — reduz re-render e merge conflict. *(fix ref: `src/screens/VeterinaryScreen.tsx`)*

- [ ] **MONO-02** [P2]: `FieldHomeScreen.tsx` (1299 linhas) aplica o mesmo split + `useCallback` no `refreshFieldPanels`. *(fix ref: `src/screens/FieldHomeScreen.tsx:1299`)*

### Domínio & Paridade (PAR)

- [ ] **PAR-01** [P1]: Enums de tipos reprodutivos têm fonte única em `src/domain/enums.ts` — elimina divergência entre `animal-details.ts:82-92` (6 tipos) e `dashboard.ts:37-45` (7 tipos). *(fix ref: novo arquivo + refactor dos 2 callsites)*

- [ ] **PAR-02** [P2]: Categoria desconhecida em `mapAnimalFromDb` vira `"unknown"` com warning, não silenciosamente `"potro"`. *(fix ref: `src/services/animals.ts:84`)*

- [ ] **PAR-03** [P1]: Documentos de saúde usam bucket consistente — confirmar paridade com `criahub-web-v2` entre `animals`, `animal-photos`. *(fix ref: `src/services/health.ts:66-73`, `src/services/animal-media.ts:44`)*

### Segurança (SEC)

- [ ] **SEC-01** [P2]: `set_haras_member_status` e outras RPCs `(supabase as any).rpc(...)` usam Zod parse no retorno em vez de confiar no shape. *(fix ref: `src/services/team.ts:184-202`)*

- [ ] **SEC-02** [P2]: `app.json` deixa de ter URL e anon JWT hard-coded — tudo vem de `app.config.ts` via `Constants.expoConfig.extra`. *(fix ref: `app.json` vs `app.config.ts`)*

### Cobertura de Testes (TEST)

- [ ] **TEST-01** [P1]: Smoke tests sobre os helpers e services que o bug-bash tocou (roles, fingerprint da fila, ownership save, haras scope em services) para prevenir regressão — não busca coverage full. *(fix ref: novo `jest.config` + arquivos `*.test.ts` pontuais)*

---

## v2 Requirements (deferred)

- [ ] Decomposição completa de screens monolíticos (`AnimalDetailScreen.tsx` 1244 linhas, `VetAnimalChartScreen.tsx` 981 linhas, `VetReproductionScreen.tsx` 972 linhas)
- [ ] Geração automática de `Database` types via `supabase gen types typescript` + substituir todos os `any` em mappers de serviço
- [ ] Error boundary hierárquico (top-level + por route group)
- [ ] Linter (`eslint-config-expo`) + Prettier + CI (GitHub Action em build `preview`)
- [ ] Coverage de testes amplo (unit + integration + E2E com Detox)
- [ ] Remoção dos mapas bidirecionais (`CATEGORY_MAPPING` x 4) via single source `STATUS_DEFS`
- [ ] Extração de `uriToBlob`, `sanitizeName`, `extractPathFromPublicUrl` para `src/lib/storage.ts`

## Out of Scope (milestone atual)

- **Features não portadas do web** (financeiro avançado, assessor module full, relatórios) — bug-bash preserva status; não estende funcionalidade.
- **Redesign visual / UX refresh** — só ajustes necessários para acessar fixes (ex.: EmptyState em UX-02, biometria em UX-05). Redesign completo vai para milestone de UI.
- **Suporte a push remoto** — `expo-notifications` segue local-only; push server é escopo próprio.
- **Novos buckets de storage** além dos existentes (`animals`, `animal-photos`) — só a reorganização de RLS-04.
- **Migração de Expo SDK** — fica em 54 durante o bug-bash; SDK 55 é milestone próprio.

## Traceability

<!-- Preenchido pelo gsd-roadmapper em 2026-04-16. Mapeia cada REQ-ID à fase que o entrega. -->

| REQ-ID | Priority | Phase | Status |
|--------|----------|-------|--------|
| AUTH-01 | P0 | Phase 1 | Pending |
| NOTIF-01 | P0 | Phase 1 | Pending |
| RLS-01 | P0 | Phase 2 | Pending |
| RLS-02 | P0 | Phase 2 | Pending |
| PERM-01 | P0 | Phase 2 | Pending |
| OFFLINE-01 | P0 | Phase 3 | Pending |
| OFFLINE-02 | P0 | Phase 3 | Pending |
| APPLE-01 | P0 | Phase 4 | Pending |
| AUTH-02 | P1 | Phase 5 | Pending |
| RLS-03 | P1 | Phase 5 | Pending |
| PERM-02 | P1 | Phase 5 | Pending |
| OFFLINE-03 | P1 | Phase 5 | Pending |
| OFFLINE-04 | P1 | Phase 5 | Pending |
| OWN-01 | P1 | Phase 5 | Pending |
| OWN-02 | P1 | Phase 5 | Pending |
| PERF-01 | P1 | Phase 5 | Pending |
| UX-01 | P1 | Phase 5 | Pending |
| UX-02 | P1 | Phase 5 | Pending |
| UX-03 | P1 | Phase 5 | Pending |
| MONO-01 | P1 | Phase 5 | Pending |
| PAR-01 | P1 | Phase 5 | Pending |
| PAR-03 | P1 | Phase 5 | Pending |
| TEST-01 | P1 | Phase 5 | Pending |
| RLS-04 | P2 | Phase 6 | Pending |
| RLS-05 | P2 | Phase 6 | Pending |
| OFFLINE-05 | P2 | Phase 6 | Pending |
| PERF-02 | P2 | Phase 6 | Pending |
| UX-04 | P2 | Phase 6 | Pending |
| UX-05 | P2 | Phase 6 | Pending |
| MONO-02 | P2 | Phase 6 | Pending |
| PAR-02 | P2 | Phase 6 | Pending |
| SEC-01 | P2 | Phase 6 | Pending |
| SEC-02 | P2 | Phase 6 | Pending |

**Coverage:** 33/33 v1 REQs mapeados; 0 orphans; 0 duplicates.

**Phase totals:** Phase 1 (2) + Phase 2 (3) + Phase 3 (2) + Phase 4 (1) + Phase 5 (15) + Phase 6 (10) = 33.
