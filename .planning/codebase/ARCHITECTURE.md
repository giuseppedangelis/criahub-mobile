# Architecture

**Analysis Date:** 2026-04-16

## Pattern Overview

**Overall:** File-based routing (Expo Router) on top of a three-layer architecture — Routes → Screens → Services — with TanStack Query as the data/state boundary to Supabase.

**Key Characteristics:**
- Expo Router v6 with typed routes (`experiments.typedRoutes: true` in `app.config.ts`) drives navigation. The `app/` directory IS the router; there is no React Navigation config by hand (`@react-navigation/native` is only a transitive peer).
- **Route groups gate access by auth and role**: `app/(auth)/` for unauthenticated, `app/(app)/` for authenticated, `app/(app)/(tabs)/` for the tab bar. Each group has a `_layout.tsx` that redirects based on `useAuth()` + `src/lib/roles.ts` helpers.
- **Route files are thin dispatchers.** Each tab/route file (e.g. `app/(app)/(tabs)/plantel.tsx`) reads `role` and picks a "real" screen component from `src/screens/` (`PlantelScreen` for creator, `VetPlantelScreen` for vet, a redirect for field staff).
- **Screens are role-specific containers.** Naming encodes the persona: `CreatorDashboardScreen`, `VetRoutineScreen`, `FieldHomeHubScreen`, etc.
- **TanStack Query owns remote state**; React Context owns global client state (auth + theme). There is no Redux/Zustand.
- **Web↔mobile parity with the companion Next.js repo (`criahub-web-v2`)** is the driving constraint: shared Supabase schema, shared role taxonomy, shared domain objects. Multiple design docs under `docs/mobile-integration/` and `docs/web-reference/` track parity (e.g. `WEB_MOBILE_HEALTH_PARITY.md`, `WEB_MOBILE_REPRO_PARITY.md`).

## Layers

**Route Layer (`app/`):**
- Purpose: URL-like navigation tree, auth/role guards, header/title config.
- Location: `app/`
- Contains: `_layout.tsx` stacks/tabs, thin route files that delegate to a screen, dynamic routes (`animal/[id].tsx`, `vet-prontuario/[id].tsx`).
- Depends on: `src/contexts/AuthContext`, `src/lib/roles`, `src/screens/*`.
- Used by: Expo Router (auto-discovered by `expo-router/entry` — `package.json#main`).

**Screen Layer (`src/screens/`):**
- Purpose: Page-level UI composition for a given role + feature.
- Location: `src/screens/`
- Contains: `*Screen.tsx` files, one per role/feature combo (`PlantelScreen.tsx`, `VetPlantelScreen.tsx`, `CreatorRoutineScreen.tsx`, `FieldHomeScreen.tsx`, `AnimalDetailScreen.tsx`, `AccountScreen.tsx`). Auth screens live under `src/screens/auth/`.
- Depends on: `src/hooks/*` (data), `src/components/*` (presentation), `src/contexts/*`, `src/theme/*`.
- Used by: route files in `app/`.

**Hook Layer (`src/hooks/`):**
- Purpose: Feature-level data access — wraps TanStack Query around services. Defines stable `queryKeys` and invalidation boundaries.
- Location: `src/hooks/`
- Contains: `useAnimals.ts`, `useAnimalDetails.ts`, `useOwnership.ts`, `useHarasSettings.ts`, `useAgenda.ts`, `useTasks.ts`, `useReproduction.ts`, `useVeterinary.ts`, `useFinancial.ts`, `useTeam.ts`, `useField.ts`, `useTerminationReminderSync.ts`, etc.
- Pattern: each file exports a `xxxKeys` object and hooks (`useXxxQuery`, `useXxxMutation`) that call `src/services/*` and declare which keys to invalidate on mutation success. See `src/hooks/useOwnership.ts` for the canonical template.
- Depends on: `src/services/*`, `src/types/domain.ts`.
- Used by: screens and high-level components.

**Service Layer (`src/services/`):**
- Purpose: Pure data access — every Supabase call lives here. No React.
- Location: `src/services/`
- Contains: one module per domain (`animals.ts`, `animal-details.ts`, `animal-media.ts`, `ownership.ts`, `reproduction.ts`, `reproduction-extras.ts`, `health.ts`, `veterinary.ts`, `veterinary-offline.ts`, `field.ts`, `field-offline.ts`, `field-notifications.ts`, `tasks.ts`, `agenda.ts`, `financial.ts`, `team.ts`, `profile.ts`, `dashboard.ts`, `haras-settings.ts`, `vet-chart.ts`, `base.ts`).
- Pattern: each module exports a singleton object (`export const animalsService = { async list(...) {...}, async getById(...) {...} }`). All imports go through `src/services/base.ts`, which re-exports `supabase`, `applyPagination`, `formatPaginatedResponse`, and `handleSupabaseError`.
- Depends on: `src/lib/supabase.ts`, `src/types/domain.ts`.

**Library/Infrastructure Layer (`src/lib/`):**
- Purpose: Cross-cutting helpers and singletons — Supabase client, query client, notifications, role logic, domain-agnostic mappers.
- Location: `src/lib/`
- Files: `supabase.ts` (Supabase client singleton), `query-client.ts` (TanStack Query singleton), `roles.ts` (role normalization + guards), `haras.ts` (`resolveUserHarasId` fallback via `haras_members`), `notifications.ts` (expo-notifications scheduling + AsyncStorage map), `animal-location.ts` (location label/service-type helpers), `vet-shared.ts` (task/gestation status mappers), `vet-access.ts`.

**UI/Components Layer (`src/components/`):**
- Purpose: Reusable visual building blocks.
- Sub-areas:
  - `src/components/ui/` — generic primitives: `AppScreen`, `AppButton`, `Card`, `TextField`, `DateField`, `SearchInput`, `FilterChip`, `StatusBadge`, `LoadingState`, `EmptyState`, `BrandLogo`, `AnimalSearchSelect`, `OptionSearchSelect`, `ScheduleSegmented`.
  - `src/components/animal/` — animal-centric: `AnimalEditModal.tsx`, `AnimalLocationPicker.tsx`, `AnimalMediaActions.tsx`.
  - `src/components/ownership/` — ownership widgets: `OwnershipSection.tsx`, `OwnershipEditorModal.tsx`, `TerminationReminderMount.tsx`.
  - `src/components/reproduction/` — `EmbryosSection.tsx`, `SemenInventorySection.tsx`.
  - `src/components/field/` — `FieldFilterChip.tsx`, `FieldStatCard.tsx`.
  - `src/components/tasks/` — `TaskExecutionModal.tsx`.
  - `src/components/sync/` — offline sync widgets (directory present, consumed by field screens).

**Context / Theme Layer (`src/contexts/`, `src/theme/`):**
- `src/contexts/AppProviders.tsx` wires the provider stack.
- `src/contexts/AuthContext.tsx` owns session + profile + `harasId` + role.
- `src/theme/ThemeContext.tsx` + `src/theme/tokens.ts` expose `useAppTheme()` with light/dark tokens persisted in AsyncStorage under `criahub_mobile_theme_mode`.

**Types (`src/types/`):**
- Single source of truth: `src/types/domain.ts` defines `UserRole`, `Animal`, `AnimalCategory`, `AnimalEnvironment`, `AnimalOwnershipShare`, pagination and filter shapes, task/agenda/reproduction DTOs. All layers import from here.

## Data Flow

**UI → Supabase (read):**
1. Screen mounts, calls a hook from `src/hooks/` (e.g. `useAnimalsQuery(filters, pagination)`).
2. Hook instantiates a TanStack Query with a deterministic `queryKey` (`animalKeys.list(filters, pagination)`) and a `queryFn` that calls the service method (`animalsService.list(...)`).
3. Service module in `src/services/` performs the actual Supabase call via `supabase` from `src/services/base.ts`, maps DB rows to domain types (e.g. `mapAnimalFromDb` in `src/services/animals.ts`), and returns typed objects.
4. Supabase client (`src/lib/supabase.ts`) uses `@supabase/supabase-js` with `AsyncStorage` (native) or `localStorage` (web) persistence and RLS-enforced `anon` key from `publicSupabaseEnv`.
5. Hook result flows back into the screen; cache is reused for `staleTime: 60_000` (default set in `src/lib/query-client.ts`).

**UI → Supabase (write):**
1. Screen/component calls a mutation hook (`useUpdateAnimalMutation(animalId, harasId)`, `useSaveOwnershipSharesMutation`, etc.).
2. `mutationFn` calls the service (`animalsService.update`, `ownershipService.save`).
3. Service writes to Supabase; returns updated row.
4. `onSuccess` invalidates related query keys (`animalKeys.all`, `animalDetailsKeys.detail(id, harasId)`, `ownershipKeys.shares(id)`). Screens re-render with fresh data.

**Auth flow:**
1. `app/_layout.tsx` wraps the tree in `AppProviders`, which wires: `KeyboardProvider` → `SafeAreaProvider` → `QueryClientProvider` → `ThemeProvider` → `AuthProvider`.
2. `AuthProvider` (`src/contexts/AuthContext.tsx`) bootstraps with `supabase.auth.getSession()`, then subscribes to `onAuthStateChange`. On any session, it loads `profiles` row, normalizes `role` via `normalizeRole`, resolves `haras_id` via `resolveUserHarasId` (falling back to `haras_members`).
3. `app/index.tsx` is the redirect hub: no session → `/(auth)/login`; valid role → `getDefaultAppRouteForRole(role)`; otherwise → `/(app)/unsupported`.
4. `(app)/_layout.tsx`, `(auth)/_layout.tsx` and `(tabs)/_layout.tsx` each re-check `session` and `role` and may issue additional `Redirect`s.

**Offline / background:**
- Field-staff flows have an offline queue (`src/services/field-offline.ts` using `AsyncStorage` key `@criahub:field-offline-queue`) with a dedupe window, retry count, and a sync snapshot. The `src/components/sync/` folder hosts the UI hooks for this.
- Local notifications use `expo-notifications` in `src/lib/notifications.ts`, with a scheduled map persisted under `@criahub/notifications/scheduled-v1` and an `ensureAndroidChannel` helper. `TerminationReminderMount` (`src/components/ownership/TerminationReminderMount.tsx`) is mounted inside `app/(app)/_layout.tsx` and calls `useTerminationReminderSync` to keep ownership end-date reminders in sync.

**State Management:**
- **Server state:** TanStack Query (`@tanstack/react-query@^5.90`). Single `QueryClient` singleton from `src/lib/query-client.ts` with defaults `staleTime: 60s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`, mutations `retry: 0`.
- **Auth / identity:** React Context in `src/contexts/AuthContext.tsx` exposing `{ session, user, profile, role, harasId, isLoading, signIn, signOut, resetPassword, refreshProfile }`.
- **Theme:** React Context in `src/theme/ThemeContext.tsx` exposing `{ mode, theme, setThemeMode, toggleTheme }`, persisted to AsyncStorage.
- **Local screen state:** vanilla `useState` / `useMemo` inside screens. No global UI store.
- **Form state:** `react-hook-form` + `@hookform/resolvers` + `zod` (see `AnimalEditModal`, `OwnershipEditorModal`).

## Key Abstractions

**Role-based routing:**
- Purpose: The app ships three personas — creator (`criador`/`breeder`), veterinarian (`veterinario`), field staff (`peao`/`funcionario`). Every route must decide what to render per role.
- Examples: `app/(app)/(tabs)/plantel.tsx`, `app/(app)/(tabs)/rotina.tsx`, `app/(app)/animal/[id].tsx`.
- Pattern: `useAuth().role` + guards from `src/lib/roles.ts` (`isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole`, `isMobileSupportedRole`, `getDefaultAppRouteForRole`).

**Service singleton:**
- Purpose: One object per domain; each method is an `async` function that returns typed domain objects.
- Examples: `animalsService` in `src/services/animals.ts`, `ownershipService` in `src/services/ownership.ts`, `harasSettingsService` in `src/services/haras-settings.ts`.
- Pattern: module-level `export const xxxService = { ... }`. Errors go through `handleSupabaseError` from `src/services/base.ts`.

**Query key factory:**
- Purpose: Deterministic, hierarchical cache keys colocated with their hooks.
- Examples: `animalKeys` (`src/hooks/useAnimals.ts`), `animalDetailsKeys` (`src/hooks/useAnimalDetails.ts`), `ownershipKeys` (`src/hooks/useOwnership.ts`), `harasSettingsKeys` (`src/hooks/useHarasSettings.ts`).
- Pattern:
  ```ts
  export const xxxKeys = {
    all: ["xxx"] as const,
    list: (filters, pagination) => [...xxxKeys.all, "list", filters, pagination] as const,
    detail: (id) => [...xxxKeys.all, "detail", id] as const,
  };
  ```

**DB ↔ domain mapping:**
- Purpose: Schema in Supabase uses Portuguese column names (`nome`, `registro`, `sexo`, `pelagem`, `localizacao`, `abccmm_rowid`…); the app uses English domain names. Each service exports private `mapXxxFromDb` + `CATEGORY_MAPPING_DB_TO_APP` / `STATUS_MAPPING_DB_TO_APP` dictionaries.
- Example: `src/services/animals.ts` defines `ANIMAL_SELECT_FIELDS`, `mapAnimalFromDb`, and category/status maps.

**ABCCMM-official immutability:**
- Purpose: Animals originating from the ABCCMM import (`abccmm_rowid != null`) have immutable official fields; mobile only edits. Reflected in `Animal.is_official = Boolean(row.abccmm_rowid)` and enforced in `AnimalEditModal` form disabling logic.

**Location dropdown (not free text):**
- Purpose: Animal location/environment must be selected from `haras_settings.location_settings` (baias/pastos/servicos/partner_locations). Helpers in `src/lib/animal-location.ts` (`buildAnimalLocationLabel`, `resolveLocationTypeFromLabel`) + `AnimalLocationPicker` component enforce this.

**Web↔mobile parity:**
- The companion web repo `criahub-web-v2` is the source of truth for features; mobile mirrors behaviour over the same Supabase schema. `docs/mobile-integration/` tracks parity plans; `docs/web-reference/DOCUMENTACAO_GERAL_SISTEMA.md` documents the shared system.

## Entry Points

**`package.json#main`:**
- Value: `"expo-router/entry"`.
- Triggers: Expo/Metro bootstrapping; `expo-router` auto-discovers `app/`.

**`app/_layout.tsx` (Root Layout):**
- Location: `app/_layout.tsx`
- Triggers: First render after bundle load.
- Responsibilities: Import `react-native-reanimated` polyfill, wrap tree in `AppProviders`, render `<StatusBar>` + root `<Stack>` with children `index`, `(auth)`, `(app)`, `+not-found`. Headers hidden globally.

**`app/index.tsx` (Root Redirector):**
- Location: `app/index.tsx`
- Triggers: Visiting `/`.
- Responsibilities: Show `LoadingState` while `isLoading`; redirect to `/(auth)/login` if no session; otherwise redirect via `getDefaultAppRouteForRole(role)` or to `/(app)/unsupported`.

**`app/(auth)/_layout.tsx`:**
- Location: `app/(auth)/_layout.tsx`
- Triggers: Entering any route under `(auth)`.
- Responsibilities: Kick authed users back into the app (creators → `/(app)/(tabs)/plantel`, others → `/(app)/unsupported`); otherwise render a `Stack` with `login` and `forgot-password`.

**`app/(app)/_layout.tsx`:**
- Location: `app/(app)/_layout.tsx`
- Triggers: Entering any route under `(app)`.
- Responsibilities: Redirect unauthenticated users to login; redirect unsupported roles to `/(app)/unsupported`; mount `<TerminationReminderMount />` (side-effect component that syncs notifications); declare the inner stack (`(tabs)`, `campo/pendencias`, `campo/gestacoes`, `campo/tarefas`, `campo/avisos`, `animal/[id]`, `vet-prontuario/[id]`, `financeiro`, `equipe`, `unsupported`) and their titles.

**`app/(app)/(tabs)/_layout.tsx`:**
- Location: `app/(app)/(tabs)/_layout.tsx`
- Triggers: Entering the tab bar.
- Responsibilities: Render one of three tab sets based on `role`: **vet** (`plantel`, `veterinaria`, `rotina`, `agenda`, `reproducao`, `conta`), **field** (`campo`, `campo-pendencias`, `campo-gestacoes`, `campo-tarefas`, `campo-avisos`, `conta`), **creator** (`inicio`, `plantel`, `agenda`, `reproducao`, `conta`). Unavailable tabs are set to `href: null`. Tab bar icons come from `lucide-react-native`.

**Dynamic entry points:**
- `app/(app)/animal/[id].tsx` — animal detail (creator/vet dispatcher with redirect to `/(app)/vet-prontuario/[id]`).
- `app/(app)/vet-prontuario/[id].tsx` — vet chart.
- `app/(app)/campo/*.tsx` — deep-linked field pages (`pendencias`, `gestacoes`, `tarefas`, `avisos`).

**Web-only:**
- `app/+html.tsx` — static HTML root (`pt-BR`) used by `expo-router` web export.
- `app/+not-found.tsx` — 404 fallback.

## Error Handling

**Strategy:** Throw at the service boundary, catch in the UI. No global error boundary.

**Patterns:**
- Services call `handleSupabaseError(error)` (`src/services/base.ts`) which throws `new Error(error.message || "Erro ao acessar o banco de dados.")`.
- Hooks rely on TanStack Query to surface `error`/`isError` to screens; retry is `1` for queries, `0` for mutations (`src/lib/query-client.ts`).
- `AuthProvider` wraps bootstrap in try/catch and falls back to `clearUserState()` on any auth error.
- Config validation: `src/config/env.ts` uses `zod` `EnvSchema.safeParse` and throws on startup if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing — fail-fast.
- Field offline actions persist `last_error` and `retry_count` on the queue item rather than throwing.

## Cross-Cutting Concerns

**Logging:** No framework. Services and hooks throw `Error` with pt-BR messages; screens render them. No `console.log` discipline documented.

**Validation:**
- `zod` for env (`src/config/env.ts`) and forms (via `@hookform/resolvers`).
- Runtime normalization in `src/lib/roles.ts` (`normalizeRole`) and service-level mappers (DB enums → app enums).

**Authentication:**
- Supabase Auth (`@supabase/supabase-js`) with email/password only. Session persisted in `AsyncStorage` (native) or `localStorage` (web).
- `AuthContext` is the single consumer. Guards at every group layout + inside each route file.
- No service-role key on the client (enforced by comment in `src/lib/supabase.ts`). Server-only access patterns live in the web repo.

**Authorization:**
- RLS in Supabase (confirmed by recent commits: "fix(ownership): respeita RLS de user_can_manage_haras_team").
- Role gating in the app is purely for UX; real enforcement is database-side.
- `harasId` (`AuthContext`) is appended to every query/mutation (`filters.haras_id`, `eq("haras_id", harasId)`) so users only see their own haras.

**Theming:**
- `ThemeProvider` (`src/theme/ThemeContext.tsx`) with tokens from `src/theme/tokens.ts`. Components consume via `useAppTheme()`. Dark is the default; AsyncStorage persists choice under `criahub_mobile_theme_mode`.

**Internationalization:**
- All user-facing copy is in Portuguese (pt-BR). Dates via `Intl.DateTimeFormat("pt-BR")` in `src/utils/format.ts`. No i18n library — strings are hardcoded.

**Platform handling:**
- Web/native branching in `src/lib/supabase.ts` (storage) and `src/lib/notifications.ts` (`Platform.OS === "android"` for channels).
- `expo-router` web export via `"web": { "bundler": "metro", "output": "static" }` in `app.config.ts`.

---

*Architecture analysis: 2026-04-16*
