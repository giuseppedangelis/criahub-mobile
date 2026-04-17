# Codebase Structure

**Analysis Date:** 2026-04-16

## Directory Layout

```
criahub-mobile/
├── app/                              # Expo Router file-based routes (entry is expo-router/entry)
│   ├── _layout.tsx                   # Root layout: AppProviders + Stack
│   ├── index.tsx                     # Root redirector (auth → role-based)
│   ├── +html.tsx                     # Static HTML root (web only)
│   ├── +not-found.tsx                # 404 fallback
│   ├── (auth)/                       # Unauthenticated routes
│   │   ├── _layout.tsx               # Redirects authed users back to (app)
│   │   ├── login.tsx                 # → src/screens/auth/LoginScreen
│   │   └── forgot-password.tsx       # → src/screens/auth/ForgotPasswordScreen
│   └── (app)/                        # Authenticated routes (role-gated)
│       ├── _layout.tsx               # Auth guard + stack; mounts TerminationReminderMount
│       ├── unsupported.tsx           # Unsupported-role screen
│       ├── financeiro.tsx            # Creator-only
│       ├── equipe.tsx                # Creator-only
│       ├── (tabs)/                   # Bottom tab bar (role-specific)
│       │   ├── _layout.tsx           # Role-specific <Tabs> definition
│       │   ├── inicio.tsx            # Creator dashboard
│       │   ├── plantel.tsx           # Creator/vet (field redirected)
│       │   ├── agenda.tsx            # Creator/vet
│       │   ├── rotina.tsx            # Creator/vet
│       │   ├── reproducao.tsx        # Creator/vet
│       │   ├── veterinaria.tsx       # Vet only
│       │   ├── avisos.tsx            # Creator notices
│       │   ├── campo.tsx             # Field home
│       │   ├── campo-pendencias.tsx  # Field pendings (tab-visible for field)
│       │   ├── campo-gestacoes.tsx
│       │   ├── campo-tarefas.tsx
│       │   ├── campo-avisos.tsx
│       │   ├── buscar-animal.tsx     # Field-only search
│       │   └── conta.tsx             # Account
│       ├── animal/[id].tsx           # Animal detail (creator/vet dispatcher)
│       ├── vet-prontuario/[id].tsx   # Vet medical chart
│       └── campo/                    # Field deep routes (inside stack, not tabs)
│           ├── pendencias.tsx
│           ├── gestacoes.tsx
│           ├── tarefas.tsx
│           └── avisos.tsx
├── src/                              # All non-routing code
│   ├── screens/                      # Page-level components (one per role/feature)
│   │   └── auth/                     # LoginScreen, ForgotPasswordScreen
│   ├── components/                   # Reusable UI
│   │   ├── ui/                       # Generic primitives
│   │   ├── animal/                   # Animal edit/location/media
│   │   ├── ownership/                # Ownership + termination reminder
│   │   ├── reproduction/             # Embryos, semen inventory
│   │   ├── field/                    # Field chips/stat cards
│   │   ├── tasks/                    # Task execution modal
│   │   └── sync/                     # Offline sync widgets
│   ├── hooks/                        # TanStack Query wrappers (one per feature)
│   ├── services/                     # Supabase data access (one per domain)
│   ├── lib/                          # Cross-cutting singletons & helpers
│   ├── contexts/                     # AppProviders, AuthContext
│   ├── theme/                        # ThemeContext + tokens
│   ├── config/                       # env.ts (zod-validated)
│   ├── types/                        # domain.ts (single source of truth)
│   └── utils/                        # format.ts (pt-BR formatters)
├── assets/                           # Fonts + images (icon, splash, adaptive, favicon)
│   ├── fonts/
│   └── images/
├── components/__tests__/             # Legacy test stub (empty)
├── constants/                        # Empty (placeholder from Expo template)
├── docs/
│   ├── mobile-integration/           # Parity plans with web (health, repro, peão, condomínio, SaaS isolation)
│   ├── web-reference/                # Snapshots of the web repo docs (DOCUMENTACAO_GERAL_SISTEMA.md, etc.)
│   ├── IDENTIDADE VISUAL/            # Brand assets
│   ├── android-apk-cliente.md
│   ├── entrega-apk-android-cliente.md
│   └── veterinaria-refactor-checklist.md
├── credentials/                      # EAS credentials (gitignored contents)
├── .planning/codebase/               # Claude-authored codebase maps
├── .expo/                            # Expo runtime cache (generated)
├── app.config.ts                     # Expo config (loads .env.local via dotenv)
├── app.json                          # Legacy expo config (superseded by app.config.ts)
├── eas.json                          # EAS build/submit profiles
├── expo-env.d.ts                     # Ambient types for expo
├── tsconfig.json                     # Extends expo/tsconfig.base, paths @/* → ./
├── package.json                      # main: "expo-router/entry"
├── package-lock.json                 # Committed lockfile (npm)
├── abrir-simulador-android.bat       # Windows helper script
├── .env.local                        # Local secrets (NEVER read)
├── .env.local.example                # Template
├── .gitignore
└── README.md
```

## Directory Purposes

**`app/`:**
- Purpose: The only filesystem-routed directory. Expo Router auto-discovers every `.tsx` file here as a route.
- Contains: `_layout.tsx` stacks/tabs, thin route files, dynamic routes (`[id].tsx`), route groups (`(auth)`, `(app)`, `(tabs)`).
- Key files: `app/_layout.tsx`, `app/index.tsx`, `app/(app)/_layout.tsx`, `app/(app)/(tabs)/_layout.tsx`, `app/(auth)/_layout.tsx`.
- Rule: route files stay thin — they pick a screen by role and return it. Never put business logic here.

**`src/screens/`:**
- Purpose: Page-level containers. One file per `(role × feature)`.
- Contains: `*Screen.tsx` files. Sizes range from ~1.5KB (`UnsupportedRoleScreen.tsx`) to ~53KB (`FieldHomeScreen.tsx`, `VeterinaryScreen.tsx`).
- Key files: `src/screens/PlantelScreen.tsx`, `src/screens/VetPlantelScreen.tsx`, `src/screens/CreatorDashboardScreen.tsx`, `src/screens/CreatorRoutineScreen.tsx`, `src/screens/CreatorTeamScreen.tsx`, `src/screens/CreatorFinancialScreen.tsx`, `src/screens/CreatorNoticesScreen.tsx`, `src/screens/AgendaScreen.tsx`, `src/screens/VetAgendaScreen.tsx`, `src/screens/VeterinaryScreen.tsx`, `src/screens/VetRoutineScreen.tsx`, `src/screens/VetReproductionScreen.tsx`, `src/screens/VetAnimalChartScreen.tsx`, `src/screens/ReproductionScreen.tsx`, `src/screens/AnimalDetailScreen.tsx`, `src/screens/AccountScreen.tsx`, `src/screens/FieldHomeScreen.tsx`, `src/screens/FieldHomeHubScreen.tsx`, `src/screens/FieldTasksScreen.tsx`, `src/screens/FieldPendingsScreen.tsx`, `src/screens/FieldGestationsScreen.tsx`, `src/screens/FieldNotificationsScreen.tsx`, `src/screens/FieldAnimalSearchScreen.tsx`, `src/screens/UnsupportedRoleScreen.tsx`, `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/ForgotPasswordScreen.tsx`.

**`src/components/ui/`:**
- Purpose: Generic, reusable, themed primitives. These are the building blocks every screen uses.
- Key files: `src/components/ui/AppScreen.tsx` (SafeArea + KeyboardAwareScrollView wrapper), `src/components/ui/AppButton.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/TextField.tsx`, `src/components/ui/DateField.tsx`, `src/components/ui/SearchInput.tsx`, `src/components/ui/FilterChip.tsx`, `src/components/ui/StatusBadge.tsx`, `src/components/ui/LoadingState.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/BrandLogo.tsx`, `src/components/ui/AnimalSearchSelect.tsx`, `src/components/ui/OptionSearchSelect.tsx`, `src/components/ui/ScheduleSegmented.tsx`.

**`src/components/{animal,ownership,reproduction,field,tasks,sync}/`:**
- Purpose: Feature-specific composites. Grouped by domain, not by role.
- Notable files: `src/components/animal/AnimalEditModal.tsx`, `src/components/animal/AnimalLocationPicker.tsx`, `src/components/animal/AnimalMediaActions.tsx`, `src/components/ownership/OwnershipSection.tsx`, `src/components/ownership/OwnershipEditorModal.tsx`, `src/components/ownership/TerminationReminderMount.tsx`, `src/components/reproduction/EmbryosSection.tsx`, `src/components/reproduction/SemenInventorySection.tsx`, `src/components/field/FieldFilterChip.tsx`, `src/components/field/FieldStatCard.tsx`, `src/components/tasks/TaskExecutionModal.tsx`.

**`src/hooks/`:**
- Purpose: TanStack Query wrappers. Each file owns the `xxxKeys` factory plus `useXxxQuery` / `useXxxMutation` hooks.
- Key files: `src/hooks/useAnimals.ts`, `src/hooks/useAnimalDetails.ts`, `src/hooks/useAnimalHealth.ts`, `src/hooks/useAnimalMedia.ts`, `src/hooks/useOwnership.ts`, `src/hooks/useHarasSettings.ts`, `src/hooks/useDashboard.ts`, `src/hooks/useAgenda.ts`, `src/hooks/useTasks.ts`, `src/hooks/useReproduction.ts`, `src/hooks/useReproductionExtras.ts`, `src/hooks/useVeterinary.ts`, `src/hooks/useVetChart.ts`, `src/hooks/useFinancial.ts`, `src/hooks/useTeam.ts`, `src/hooks/useField.ts`, `src/hooks/useTerminationReminderSync.ts`.

**`src/services/`:**
- Purpose: Supabase data access. One module per domain. Pure functions — no React.
- Key files: `src/services/base.ts` (re-exports + `handleSupabaseError`, `applyPagination`, `formatPaginatedResponse`), `src/services/animals.ts`, `src/services/animal-details.ts`, `src/services/animal-media.ts`, `src/services/ownership.ts`, `src/services/haras-settings.ts`, `src/services/dashboard.ts`, `src/services/agenda.ts`, `src/services/tasks.ts`, `src/services/reproduction.ts`, `src/services/reproduction-extras.ts`, `src/services/health.ts`, `src/services/veterinary.ts`, `src/services/veterinary-offline.ts`, `src/services/vet-chart.ts`, `src/services/field.ts`, `src/services/field-offline.ts`, `src/services/field-notifications.ts`, `src/services/financial.ts`, `src/services/team.ts`, `src/services/profile.ts`.

**`src/lib/`:**
- Purpose: Singletons, cross-cutting helpers, domain-agnostic mappers.
- Key files: `src/lib/supabase.ts` (Supabase client), `src/lib/query-client.ts` (QueryClient singleton), `src/lib/roles.ts` (role normalization + guards), `src/lib/haras.ts` (`resolveUserHarasId`), `src/lib/notifications.ts` (expo-notifications wrapper), `src/lib/animal-location.ts` (location/service-type helpers), `src/lib/vet-shared.ts` (task/gestation mappers), `src/lib/vet-access.ts`.

**`src/contexts/`:**
- Purpose: Global React Context providers.
- Key files: `src/contexts/AppProviders.tsx` (composition root), `src/contexts/AuthContext.tsx` (session + profile + role + harasId).

**`src/theme/`:**
- Purpose: Theming.
- Key files: `src/theme/ThemeContext.tsx` (provider + `useAppTheme` hook, AsyncStorage persistence), `src/theme/tokens.ts` (`getThemeTokens(mode)` → `{ mode, colors, spacing, radii, typography }`).

**`src/config/`:**
- Purpose: Environment loading.
- Key files: `src/config/env.ts` (zod-validated; exports `publicSupabaseEnv`).

**`src/types/`:**
- Purpose: Single source of truth for domain types. Every service and hook imports from here.
- Key files: `src/types/domain.ts` (~17KB: `UserRole`, `ThemeMode`, `Animal`, `AnimalSex`, `AnimalCategory`, `AnimalStatus`, `AnimalEnvironment`, `UserProfile`, `AnimalRelative`, `AnimalGenealogyBasic`, `AnimalOwnershipShare`, `OwnershipTerminationType`, pagination/filter shapes, task/agenda/reproduction DTOs).

**`src/utils/`:**
- Purpose: Tiny formatter helpers.
- Key files: `src/utils/format.ts` (`formatDateBR`, `formatCategoryLabel`, `formatStatusLabel`, `formatRole`).

**`assets/`:**
- Purpose: Static bundled assets.
- Contains: `assets/fonts/` and `assets/images/` (icon-criahub.png, splash-icon.png, adaptive-icon-criahub.png, favicon-criahub.png, etc. referenced from `app.config.ts`).

**`docs/`:**
- Purpose: Engineering docs — parity plans, integration playbooks, web repo snapshots, APK delivery guides.
- Key files: `docs/mobile-integration/INTEGRATION_PLAYBOOK.md`, `docs/mobile-integration/PEAO_INTEGRATION_MASTER_PLAN.md`, `docs/mobile-integration/WEB_MOBILE_HEALTH_PARITY.md`, `docs/mobile-integration/WEB_MOBILE_REPRO_PARITY.md`, `docs/mobile-integration/ANIMAIS_CONDOMINIO_MOBILE_PARITY_PLAN.md`, `docs/mobile-integration/CREATOR_TASK_DELEGATION_BACKEND_ALIGNMENT_PLAN.md`, `docs/mobile-integration/SAAS_HARAS_ISOLATION_HARDENING.md`, `docs/web-reference/DOCUMENTACAO_GERAL_SISTEMA.md`, `docs/web-reference/PLANEJAMENTO_DESENVOLVIMENTO.md`, `docs/web-reference/README.web.md`.

**`credentials/`:**
- Purpose: Local EAS credentials cache. Contents gitignored — never read.

**`components/`, `constants/`:**
- Purpose: Leftover Expo template directories. `components/__tests__/` is empty; `constants/` is empty. Do not add new code here — use `src/components/` and feature-local constants instead.

## Key File Locations

**Entry Points:**
- `package.json#main`: `"expo-router/entry"` (auto-loads `app/`).
- `app/_layout.tsx`: Root layout, provider composition.
- `app/index.tsx`: Session/role redirector.

**Configuration:**
- `app.config.ts`: Expo config (dynamic, loads `.env.local`).
- `app.json`: Static Expo config (legacy fallback).
- `eas.json`: EAS build/submit profiles.
- `tsconfig.json`: Extends `expo/tsconfig.base`, strict mode, path alias `@/* → ./*`.
- `src/config/env.ts`: Runtime env validation (zod).

**Core Logic:**
- `src/lib/supabase.ts`: Supabase client singleton.
- `src/lib/query-client.ts`: TanStack Query singleton.
- `src/lib/roles.ts`: Role taxonomy and guards.
- `src/lib/haras.ts`: `resolveUserHarasId` (haras_members fallback).
- `src/lib/notifications.ts`: Local notifications + scheduled map.
- `src/contexts/AuthContext.tsx`: Auth state + profile load.
- `src/contexts/AppProviders.tsx`: Provider composition.
- `src/services/base.ts`: Service foundations (`handleSupabaseError`, pagination helpers).
- `src/types/domain.ts`: Shared domain types.

**Testing:**
- `components/__tests__/`: Empty. No active test suite in the repo; only `react-test-renderer` is a devDependency.

## Naming Conventions

**Files:**
- Route files (`app/`): kebab-case Portuguese matching the URL (`plantel.tsx`, `buscar-animal.tsx`, `vet-prontuario/[id].tsx`, `campo-pendencias.tsx`). Default export is `PascalCase + Route` (e.g. `export default function PlantelRoute()`).
- Layouts: `_layout.tsx` (Expo Router convention). Default export PascalCase ending in `Layout` (e.g. `AppLayout`, `AuthLayout`, `TabsLayout`).
- Dynamic segments: `[param].tsx` (e.g. `animal/[id].tsx`).
- Web-only specials: `+html.tsx`, `+not-found.tsx`.
- Screens (`src/screens/`): PascalCase ending in `Screen.tsx` (e.g. `PlantelScreen.tsx`, `VetAnimalChartScreen.tsx`). Role prefix embedded in the name (`Creator*`, `Vet*`, `Field*`). Auth screens live under `src/screens/auth/`.
- Components (`src/components/`): PascalCase (e.g. `AnimalEditModal.tsx`, `OwnershipEditorModal.tsx`, `FilterChip.tsx`).
- Hooks (`src/hooks/`): camelCase starting with `use` (e.g. `useAnimals.ts`, `useAnimalDetails.ts`, `useTerminationReminderSync.ts`).
- Services (`src/services/`): kebab-case domain nouns (e.g. `animals.ts`, `animal-details.ts`, `haras-settings.ts`, `field-offline.ts`).
- Libs (`src/lib/`): kebab-case (`supabase.ts`, `query-client.ts`, `animal-location.ts`, `vet-shared.ts`).
- Types: `src/types/domain.ts` — single file, no PascalCase filename.

**Directories:**
- Route groups: `(group)` with parentheses (Expo Router convention). Used for `(auth)`, `(app)`, `(tabs)`.
- Feature folders under `src/components/`: lowercase singular noun matching a domain (`animal/`, `ownership/`, `reproduction/`, `field/`, `tasks/`, `sync/`).
- `src/screens/auth/` is the only nested screens folder — all other screens are flat.

**Exports:**
- Named exports everywhere except route files (which use `export default`).
- Services export a singleton object: `export const animalsService = { async list(...) {...}, ... }`.
- Hooks export `xxxKeys` (query-key factory) + hook functions.

**Portuguese vs English:**
- User-facing strings, URLs, and role names are pt-BR (`plantel`, `rotina`, `agenda`, `veterinaria`, `campo`).
- Code identifiers (variables, types, props) are English except where tied to the DB schema (`nome`, `registro`, `sexo`, `pelagem`, `localizacao`, `criador`, `proprietario`, `haras_id`, `abccmm_rowid` — mirrored 1:1 from Supabase).

## Where to Add New Code

**New tab or top-level route:**
- Route file: `app/(app)/(tabs)/<nome>.tsx` (thin dispatcher by role).
- Register tab in `app/(app)/(tabs)/_layout.tsx` (set `href: null` for roles that shouldn't see it).
- Screen(s): one per role in `src/screens/` (`Creator<Feature>Screen.tsx`, `Vet<Feature>Screen.tsx`, `Field<Feature>Screen.tsx`).

**New nested/deep route:**
- Route file: `app/(app)/<area>/<screen>.tsx` or `app/(app)/<area>/[id].tsx`.
- Register in the inner `Stack` of `app/(app)/_layout.tsx` with an appropriate `title`.

**New feature (with data):**
- Types: add to `src/types/domain.ts`.
- Service: `src/services/<feature>.ts` exporting `xxxService` singleton; import `supabase` and helpers from `src/services/base.ts`.
- Hook: `src/hooks/use<Feature>.ts` with `xxxKeys` factory + `useXxxQuery` / `useXxxMutation`. Wire `onSuccess` invalidations for related keys.
- Screen: `src/screens/<Feature>Screen.tsx`.
- Reusable pieces: `src/components/<feature>/*.tsx`. Don't put them in `src/components/ui/` unless they're generic primitives.

**New generic UI primitive:**
- `src/components/ui/<Name>.tsx`. Must read colors via `useAppTheme()` — do not hardcode.

**New cross-cutting helper / singleton:**
- `src/lib/<name>.ts`.

**New env variable:**
- Declare in `app.config.ts#extra`, add to `EnvSchema` in `src/config/env.ts`, consume via the exported `publicSupabaseEnv` pattern (add a new export if it's not a Supabase secret).
- Put the actual value in `.env.local` (never commit) and document it in `.env.local.example`.

**New domain type:**
- Add to `src/types/domain.ts`. Resist the urge to create separate type files; the single-file convention is enforced by imports scattered across every layer.

**New role or permission:**
- Extend `UserRole` union in `src/types/domain.ts`.
- Update every guard in `src/lib/roles.ts` (`normalizeRole`, `isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole`, `isMobileSupportedRole`, `getDefaultAppRouteForRole`, `getRoleLabel`).
- Audit every `_layout.tsx` in `app/` and every `app/(app)/(tabs)/*.tsx` route file for redirect logic.

**Do NOT add new code in:**
- `components/` (repo root) — leftover Expo template.
- `constants/` (repo root) — empty placeholder.
- `app/` outside of routing — business logic belongs in `src/`.

## Special Directories

**`app/(auth)` / `app/(app)` / `app/(tabs)`:**
- Purpose: Expo Router route groups. Parentheses make them non-URL-segment wrappers — they exist only to share a `_layout.tsx`.
- Generated: No.
- Committed: Yes.

**`.expo/`:**
- Purpose: Expo CLI cache + generated types (`.expo/types/router.d.ts` for `typedRoutes`).
- Generated: Yes.
- Committed: No (gitignored).

**`.planning/`:**
- Purpose: Claude/GSD workflow artefacts (codebase maps, phase plans).
- Generated: By `/gsd-*` commands.
- Committed: Yes.

**`credentials/`:**
- Purpose: EAS credentials (keystores, provisioning profiles). Never read contents.
- Committed: Directory committed, contents gitignored.

**`node_modules/`:**
- Purpose: Standard npm dependencies.
- Generated: Yes.
- Committed: No.

**`components/`, `constants/`:**
- Purpose: Holdovers from the Expo starter template. `components/__tests__/` is empty; `constants/` is empty. New code should not go here.
- Committed: Yes (empty directories preserved).

---

*Structure analysis: 2026-04-16*
