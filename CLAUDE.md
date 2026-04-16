<!-- GSD:project-start source:PROJECT.md -->
## Project

**CriaHub Mobile**

Cliente mobile Expo/React Native do CriaHub — plataforma de gestão de haras e plantel. Espelha o app web `criahub-web-v2` consumindo o mesmo Supabase (RLS + Auth + Storage). Atende quatro papéis com fluxos distintos em um único binário: Criador (owner), Veterinário, Peão/Funcionário de campo e Assessor/Admin.

**Core Value:** Um haras consegue operar o dia a dia (consultar plantel, registrar ocorrências em campo, acompanhar reprodução/sanidade) pelo celular sem perder paridade com o web, mesmo offline.

### Constraints

- **Tech stack**: Expo SDK 54, RN 0.81, React 19, Expo Router 6, TanStack Query 5, Supabase-js 2.97, Zod 4. Managed workflow (sem `ios/` / `android/` no repo).
- **Distribuição**: EAS Build — perfis `preview` (APK/iOS sim) e `production` (AAB/App Store). Apple e Google obrigatórios.
- **Compliance**: App Store 5.1.1(v) exige exclusão in-app; LGPD exige limpeza de dados locais por usuário no signOut.
- **Compatibilidade**: paridade web↔mobile, RLS compartilhado, `abccmm_rowid` como flag de imutabilidade de campos oficiais (cliente + DB).
- **Performance**: dashboard do criador tem 11+ round-trips por mount e `staleTime: 60s` — ruim em 3G. Meta é RPC agregada no Supabase.
- **Segurança**: bucket `animal-photos` é público (permite enumeração por UUID). Bucket privado + signed URL é preferência para fase de hardening.
- **Sem CI**: `tsc --noEmit` é o único guard. Fixes do bug-bash não têm rede de segurança de teste — commits precisam ser atômicos e reversíveis.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9 (strict mode) — all application code in `src/`, `app/` and `components/`
- TSX — React Native screens, components and Expo Router route files
- JavaScript (runtime target via Metro) — transpiled from TS; no hand-written JS in `src/`
- SQL — reference/audit scripts in `docs/mobile-integration/AUDIT_AND_SEED.sql`
## Runtime
- React Native `0.81.5` with New Architecture enabled (`newArchEnabled: true` in `app.config.ts`)
- React `19.1.0` / React DOM `19.1.0` (React Native Web via Metro bundler)
- Hermes JS engine (default for Expo SDK 54)
- Targets: iOS (bundleId `com.criahub.mobile`), Android (package `com.criahub.mobile`), Web (static export via Metro)
- npm (lockfile: `package-lock.json` present, ~380 KB — committed)
- No Yarn, pnpm or Bun artifacts
## Frameworks
- Expo SDK `~54.0.33` — managed workflow, no native `ios/`/`android/` folders (both in `.gitignore`)
- Expo Router `~6.0.23` — file-based routing in `app/` with typed routes enabled (`experiments.typedRoutes: true`)
- React Navigation native `^7.1.8` — bundled under Expo Router
- React Native Reanimated `~4.1.1` + React Native Worklets `0.5.1` — animation runtime
- React Native Screens `~4.16.0` + Safe Area Context `~5.6.0` — native stack primitives
- React Hook Form `^7.71.2` — form state (only `LoginScreen.tsx` and `ForgotPasswordScreen.tsx` currently)
- Zod `^4.3.6` — schema validation; used in `src/config/env.ts` and auth screens
- `@hookform/resolvers` `^5.2.2` — Zod ↔ RHF bridge
- TanStack React Query `^5.90.21` — server-state cache; single client via `src/lib/query-client.ts`
- `@supabase/supabase-js` `^2.97.0` — REST, Auth, Storage and RPC client
- Not configured — only `react-test-renderer 19.1.0` present as a devDependency; no Jest/Vitest config, no `*.test.*` files under `src/`
- `components/__tests__/` directory exists but is empty
- Expo CLI (via `npx expo start` / EAS CLI) — scripts in `package.json`
- EAS Build `>= 18.0.0` — `eas.json` configures `preview` (APK / iOS simulator) and `production` (AAB / iOS store) profiles
- TypeScript `~5.9.2` with `tsc --noEmit` script (`npm run typecheck`)
- Metro bundler (Expo default) — used for native and web (`web.bundler: "metro"`, `web.output: "static"`)
## Key Dependencies
- `@supabase/supabase-js` `^2.97.0` — sole backend client (`src/lib/supabase.ts`); uses AsyncStorage on native, `window.localStorage` wrapper on web
- `@react-native-async-storage/async-storage` `2.2.0` — session persistence + offline queues (`src/services/field-offline.ts`, `src/services/veterinary-offline.ts`, `src/lib/notifications.ts`)
- `@tanstack/react-query` `^5.90.21` — every hook in `src/hooks/` is a React Query wrapper
- `expo-router` `~6.0.23` — entry point is `expo-router/entry` (see `package.json` main)
- `@react-native-community/netinfo` `11.4.1` — offline detection guard used by field/vet services before mutating
- `dotenv` `^17.3.1` — only used in `app.config.ts` to hydrate `.env.local` into `expo.extra`
- `lucide-react-native` `^0.575.0` — icon set (27 files import from it)
- `@expo/vector-icons` `^15.0.3` — secondary icon set (bundled with Expo)
- `react-native-svg` `15.12.1` — raster support for icons / brand logo
- `react-native-keyboard-controller` `1.18.5` — wraps `AppProviders` in `src/contexts/AppProviders.tsx`
- `expo-image-picker` `~17.0.10` — photo/camera access (animal photos, avatar, field birth/issue reports)
- `expo-document-picker` `~14.0.8` — document attachments (`AnimalMediaActions.tsx`, `TaskExecutionModal.tsx`, `VetAnimalChartScreen.tsx`)
- `expo-file-system` `~19.0.21` — declared but not directly imported in `src/` (reserved / transitive)
- `expo-location` `~19.0.8` — GPS for field reports (`FieldHomeScreen.tsx`, `FieldHomeHubScreen.tsx`)
- `expo-video` `~3.0.16` — video playback in `AnimalDetailScreen.tsx` via `VideoView` + `useVideoPlayer`
- `expo-notifications` `~0.32.16` — local scheduled reminders (`src/lib/notifications.ts`); no remote push tokens registered
- `expo-web-browser` `~15.0.10` — declared; opens external auth/help links
- `expo-linking` `~8.0.11` — deep-link scheme `criahubmobile://`
- `@react-native-community/datetimepicker` `8.4.4` — native date inputs; declared as Expo plugin
- `expo-constants` `~18.0.13` — reads `expoConfig.extra` for env in `src/config/env.ts`
- `expo-font` `~14.0.11` — font loading scaffolding (not yet custom fonts)
- `expo-splash-screen` `~31.0.13` — splash handled via `splash` config
- `expo-status-bar` `~3.0.9` — used in root `app/_layout.tsx`
- No Zustand/Redux/Jotai — global state handled via React Context (`AuthContext`, `ThemeContext`) + React Query cache
- No NativeWind/Tailwind — styling is StyleSheet + theme tokens in `src/theme/tokens.ts`
- No Jest/Vitest/Detox — no automated test harness wired up
## Configuration
- `.env.local` (gitignored via `.env*` rule in `.gitignore`; present in repo root — contains real creds)
- `.env.local.example` committed at repo root; documents required variables
- Loaded by `dotenv` at Expo config evaluation time in `app.config.ts`
- Exposed to runtime through `extra` in `app.config.ts` and read in `src/config/env.ts` with Zod validation
- Required variables:
- `app.config.ts` — dynamic Expo config (runtime-evaluated, loads dotenv, authoritative)
- `app.json` — legacy static config; still contains hard-coded Supabase URL + anon key and the EAS projectId (risk: duplication vs `app.config.ts`; see CONCERNS once generated)
- `eas.json` — EAS Build profiles (`preview`, `production`) and submit profile (`android.track: "internal"`)
- `tsconfig.json` — extends `expo/tsconfig.base`, strict mode, path alias `@/*` → repo root
- `expo-env.d.ts` — generated Expo types (gitignored)
- `scheme: "criahubmobile"` — deep-linking scheme
- `userInterfaceStyle: "automatic"` — system theme; overridden by in-app `ThemeProvider`
- `orientation: "portrait"`
- `ios.supportsTablet: true`
- `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` — required for App Store submission without export compliance
- iOS usage-description keys set for Camera, PhotoLibrary (read + add), Microphone, Location
- Android permissions: CAMERA, READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES, RECORD_AUDIO, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS, INTERNET, ACCESS_NETWORK_STATE
- `android.edgeToEdgeEnabled: true`, `softwareKeyboardLayoutMode: "resize"`, `predictiveBackGestureEnabled: false`
- Plugins configured: `expo-router`, `expo-video`, `@react-native-community/datetimepicker`, `expo-notifications` (icon + color), `expo-image-picker`, `expo-location`, `expo-document-picker` (iCloudContainerEnvironment: Production)
## Platform Requirements
- Node.js compatible with Expo SDK 54 (Node 20 LTS recommended)
- EAS CLI `>= 18.0.0` (`eas.json`)
- Xcode + iOS Simulator (for `npm run ios`) or Android Studio + emulator (`npm run android`)
- Expo Go is NOT guaranteed compatible (New Architecture enabled, custom native plugins — requires development build or EAS Build)
- Windows helper: `abrir-simulador-android.bat`
- iOS: App Store via EAS Submit (production profile auto-increments `buildNumber`); bundleId `com.criahub.mobile`
- Android: Google Play via EAS Submit (production profile = AAB, `autoIncrement: true`, submit track = `internal`); package `com.criahub.mobile`
- Android internal distribution also supported via `preview` profile (APK `buildType: "apk"`, `distribution: "internal"`)
- iOS simulator build via `preview` profile (`ios.simulator: true`)
- EAS project ID: `4069d525-bbce-4f86-9863-a51ccfe4af32` (`app.config.ts` + `app.json`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript Strictness
- `@/*` maps to project root (`./*`), so all imports begin with `@/src/...`, `@/app/...`, or `@/components/...`.
## Linting and Formatting
- No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json`, or `.editorconfig` anywhere in the repo.
- No `lint` or `format` npm script.
- `devDependencies` contains only `@types/react`, `react-test-renderer`, and `typescript`.
- 2-space indent
- Double quotes for strings (`"..."`) — never single quotes
- Trailing commas in multi-line arrays/objects/type params
- Semicolons required
- Max line length ~100 chars (soft — `AnimalEditModal.tsx` goes longer in JSX)
- Arrow callbacks for inline handlers; named `function` declarations for top-level helpers and exported hooks/services
## Naming Patterns
- Components, screens, contexts: `PascalCase.tsx` — `AppButton.tsx`, `LoginScreen.tsx`, `AuthContext.tsx`
- Hooks: `camelCase.ts` starting with `use` — `useAnimals.ts`, `useOwnership.ts`
- Services, libs, utils, types, config: `kebab-case.ts` — `animal-location.ts`, `query-client.ts`, `vet-access.ts`, `format.ts`, `domain.ts`, `env.ts`
- Expo Router route segments: lowercase with parentheses for groups — `app/(auth)/login.tsx`, `app/(app)/animal/[id].tsx`
- React components: PascalCase exported functions — `export function AnimalEditModal(...)`, `export const TextField = forwardRef(...)`
- Hooks: `useXxxQuery`, `useXxxMutation`, `useXxx` — `useAnimalsQuery`, `useUpdateAnimalMutation`, `useAuth`
- Services: camelCase object with async methods — `animalsService.list()`, `ownershipService.save()`
- camelCase for runtime values, PascalCase for types/interfaces/components, SCREAMING_SNAKE for constants (`CATEGORY_MAPPING`, `ANIMAL_SELECT_FIELDS`, `STORAGE_KEY`).
- Interfaces for object shapes (`interface AppButtonProps`, `interface FormState`).
- `type` for unions/aliases (`type AnimalSex = "Macho" | "Fêmea"`).
- Domain type names use snake_case fields (matching DB columns) — e.g. `Animal.registry_number`, `birth_date`.
## File Organization
## Import Organization
## Styling Approach
- Static layout values (padding, flex, borderRadius numbers, gap) go in `StyleSheet.create`.
- Theme-dependent values (`backgroundColor`, `borderColor`, `color`) go inline, pulled from `useAppTheme().theme.colors`.
- Style arrays merge static + inline: `style={[styles.input, { borderColor: error ? danger : border }]}`.
- Pressable opacity for press feedback uses the `({ pressed }) => [..., { opacity: pressed ? 0.8 : 1 }]` pattern (see `AppButton.tsx`).
## Error Handling
## Form Handling
### 1. `react-hook-form` + `zodResolver` (auth screens only)
### 2. Local `useState` form + manual validation (most app modals/screens)
## React Query Conventions
- `useXxxQuery(...)` for reads — always accept an `enabled = true` argument and gate with `enabled: enabled && Boolean(requiredParam)`.
- `useXxxMutation(...)` for writes — always `onSuccess` invalidates related queries via `Promise.all([...invalidateQueries...])`.
## Supabase Client Usage Patterns
- Web: custom `webStorage` wrapping `window.localStorage` with try/catch.
- Native (iOS/Android): `AsyncStorage` from `@react-native-async-storage/async-storage`.
- SSR guard: `autoRefreshToken` / `persistSession` set to `!isServerEnvironment`.
## Comments
- RLS constraints and role permissions — `// Permite editar cotistas (RLS: user_can_manage_haras_team — só admin/criador/assessor).`
- Business rules tied to ABCCMM (official studbook) — `// Campos oficiais (ABCCMM) só podem ser editados em animais avulsos/manuais.`
- Security invariants — `// O app usa somente URL pública + anon key. Nunca usar service role no cliente.`
## Context Providers
- Keyboard and safe-area at top because they're used by deepest children via hooks.
- ThemeProvider outside AuthProvider so unauthenticated screens (login) can toggle theme.
## Expo Router Conventions
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Expo Router v6 with typed routes (`experiments.typedRoutes: true` in `app.config.ts`) drives navigation. The `app/` directory IS the router; there is no React Navigation config by hand (`@react-navigation/native` is only a transitive peer).
- **Route groups gate access by auth and role**: `app/(auth)/` for unauthenticated, `app/(app)/` for authenticated, `app/(app)/(tabs)/` for the tab bar. Each group has a `_layout.tsx` that redirects based on `useAuth()` + `src/lib/roles.ts` helpers.
- **Route files are thin dispatchers.** Each tab/route file (e.g. `app/(app)/(tabs)/plantel.tsx`) reads `role` and picks a "real" screen component from `src/screens/` (`PlantelScreen` for creator, `VetPlantelScreen` for vet, a redirect for field staff).
- **Screens are role-specific containers.** Naming encodes the persona: `CreatorDashboardScreen`, `VetRoutineScreen`, `FieldHomeHubScreen`, etc.
- **TanStack Query owns remote state**; React Context owns global client state (auth + theme). There is no Redux/Zustand.
- **Web↔mobile parity with the companion Next.js repo (`criahub-web-v2`)** is the driving constraint: shared Supabase schema, shared role taxonomy, shared domain objects. Multiple design docs under `docs/mobile-integration/` and `docs/web-reference/` track parity (e.g. `WEB_MOBILE_HEALTH_PARITY.md`, `WEB_MOBILE_REPRO_PARITY.md`).
## Layers
- Purpose: URL-like navigation tree, auth/role guards, header/title config.
- Location: `app/`
- Contains: `_layout.tsx` stacks/tabs, thin route files that delegate to a screen, dynamic routes (`animal/[id].tsx`, `vet-prontuario/[id].tsx`).
- Depends on: `src/contexts/AuthContext`, `src/lib/roles`, `src/screens/*`.
- Used by: Expo Router (auto-discovered by `expo-router/entry` — `package.json#main`).
- Purpose: Page-level UI composition for a given role + feature.
- Location: `src/screens/`
- Contains: `*Screen.tsx` files, one per role/feature combo (`PlantelScreen.tsx`, `VetPlantelScreen.tsx`, `CreatorRoutineScreen.tsx`, `FieldHomeScreen.tsx`, `AnimalDetailScreen.tsx`, `AccountScreen.tsx`). Auth screens live under `src/screens/auth/`.
- Depends on: `src/hooks/*` (data), `src/components/*` (presentation), `src/contexts/*`, `src/theme/*`.
- Used by: route files in `app/`.
- Purpose: Feature-level data access — wraps TanStack Query around services. Defines stable `queryKeys` and invalidation boundaries.
- Location: `src/hooks/`
- Contains: `useAnimals.ts`, `useAnimalDetails.ts`, `useOwnership.ts`, `useHarasSettings.ts`, `useAgenda.ts`, `useTasks.ts`, `useReproduction.ts`, `useVeterinary.ts`, `useFinancial.ts`, `useTeam.ts`, `useField.ts`, `useTerminationReminderSync.ts`, etc.
- Pattern: each file exports a `xxxKeys` object and hooks (`useXxxQuery`, `useXxxMutation`) that call `src/services/*` and declare which keys to invalidate on mutation success. See `src/hooks/useOwnership.ts` for the canonical template.
- Depends on: `src/services/*`, `src/types/domain.ts`.
- Used by: screens and high-level components.
- Purpose: Pure data access — every Supabase call lives here. No React.
- Location: `src/services/`
- Contains: one module per domain (`animals.ts`, `animal-details.ts`, `animal-media.ts`, `ownership.ts`, `reproduction.ts`, `reproduction-extras.ts`, `health.ts`, `veterinary.ts`, `veterinary-offline.ts`, `field.ts`, `field-offline.ts`, `field-notifications.ts`, `tasks.ts`, `agenda.ts`, `financial.ts`, `team.ts`, `profile.ts`, `dashboard.ts`, `haras-settings.ts`, `vet-chart.ts`, `base.ts`).
- Pattern: each module exports a singleton object (`export const animalsService = { async list(...) {...}, async getById(...) {...} }`). All imports go through `src/services/base.ts`, which re-exports `supabase`, `applyPagination`, `formatPaginatedResponse`, and `handleSupabaseError`.
- Depends on: `src/lib/supabase.ts`, `src/types/domain.ts`.
- Purpose: Cross-cutting helpers and singletons — Supabase client, query client, notifications, role logic, domain-agnostic mappers.
- Location: `src/lib/`
- Files: `supabase.ts` (Supabase client singleton), `query-client.ts` (TanStack Query singleton), `roles.ts` (role normalization + guards), `haras.ts` (`resolveUserHarasId` fallback via `haras_members`), `notifications.ts` (expo-notifications scheduling + AsyncStorage map), `animal-location.ts` (location label/service-type helpers), `vet-shared.ts` (task/gestation status mappers), `vet-access.ts`.
- Purpose: Reusable visual building blocks.
- Sub-areas:
- `src/contexts/AppProviders.tsx` wires the provider stack.
- `src/contexts/AuthContext.tsx` owns session + profile + `harasId` + role.
- `src/theme/ThemeContext.tsx` + `src/theme/tokens.ts` expose `useAppTheme()` with light/dark tokens persisted in AsyncStorage under `criahub_mobile_theme_mode`.
- Single source of truth: `src/types/domain.ts` defines `UserRole`, `Animal`, `AnimalCategory`, `AnimalEnvironment`, `AnimalOwnershipShare`, pagination and filter shapes, task/agenda/reproduction DTOs. All layers import from here.
## Data Flow
- Field-staff flows have an offline queue (`src/services/field-offline.ts` using `AsyncStorage` key `@criahub:field-offline-queue`) with a dedupe window, retry count, and a sync snapshot. The `src/components/sync/` folder hosts the UI hooks for this.
- Local notifications use `expo-notifications` in `src/lib/notifications.ts`, with a scheduled map persisted under `@criahub/notifications/scheduled-v1` and an `ensureAndroidChannel` helper. `TerminationReminderMount` (`src/components/ownership/TerminationReminderMount.tsx`) is mounted inside `app/(app)/_layout.tsx` and calls `useTerminationReminderSync` to keep ownership end-date reminders in sync.
- **Server state:** TanStack Query (`@tanstack/react-query@^5.90`). Single `QueryClient` singleton from `src/lib/query-client.ts` with defaults `staleTime: 60s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`, mutations `retry: 0`.
- **Auth / identity:** React Context in `src/contexts/AuthContext.tsx` exposing `{ session, user, profile, role, harasId, isLoading, signIn, signOut, resetPassword, refreshProfile }`.
- **Theme:** React Context in `src/theme/ThemeContext.tsx` exposing `{ mode, theme, setThemeMode, toggleTheme }`, persisted to AsyncStorage.
- **Local screen state:** vanilla `useState` / `useMemo` inside screens. No global UI store.
- **Form state:** `react-hook-form` + `@hookform/resolvers` + `zod` (see `AnimalEditModal`, `OwnershipEditorModal`).
## Key Abstractions
- Purpose: The app ships three personas — creator (`criador`/`breeder`), veterinarian (`veterinario`), field staff (`peao`/`funcionario`). Every route must decide what to render per role.
- Examples: `app/(app)/(tabs)/plantel.tsx`, `app/(app)/(tabs)/rotina.tsx`, `app/(app)/animal/[id].tsx`.
- Pattern: `useAuth().role` + guards from `src/lib/roles.ts` (`isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole`, `isMobileSupportedRole`, `getDefaultAppRouteForRole`).
- Purpose: One object per domain; each method is an `async` function that returns typed domain objects.
- Examples: `animalsService` in `src/services/animals.ts`, `ownershipService` in `src/services/ownership.ts`, `harasSettingsService` in `src/services/haras-settings.ts`.
- Pattern: module-level `export const xxxService = { ... }`. Errors go through `handleSupabaseError` from `src/services/base.ts`.
- Purpose: Deterministic, hierarchical cache keys colocated with their hooks.
- Examples: `animalKeys` (`src/hooks/useAnimals.ts`), `animalDetailsKeys` (`src/hooks/useAnimalDetails.ts`), `ownershipKeys` (`src/hooks/useOwnership.ts`), `harasSettingsKeys` (`src/hooks/useHarasSettings.ts`).
- Pattern:
- Purpose: Schema in Supabase uses Portuguese column names (`nome`, `registro`, `sexo`, `pelagem`, `localizacao`, `abccmm_rowid`…); the app uses English domain names. Each service exports private `mapXxxFromDb` + `CATEGORY_MAPPING_DB_TO_APP` / `STATUS_MAPPING_DB_TO_APP` dictionaries.
- Example: `src/services/animals.ts` defines `ANIMAL_SELECT_FIELDS`, `mapAnimalFromDb`, and category/status maps.
- Purpose: Animals originating from the ABCCMM import (`abccmm_rowid != null`) have immutable official fields; mobile only edits. Reflected in `Animal.is_official = Boolean(row.abccmm_rowid)` and enforced in `AnimalEditModal` form disabling logic.
- Purpose: Animal location/environment must be selected from `haras_settings.location_settings` (baias/pastos/servicos/partner_locations). Helpers in `src/lib/animal-location.ts` (`buildAnimalLocationLabel`, `resolveLocationTypeFromLabel`) + `AnimalLocationPicker` component enforce this.
- The companion web repo `criahub-web-v2` is the source of truth for features; mobile mirrors behaviour over the same Supabase schema. `docs/mobile-integration/` tracks parity plans; `docs/web-reference/DOCUMENTACAO_GERAL_SISTEMA.md` documents the shared system.
## Entry Points
- Value: `"expo-router/entry"`.
- Triggers: Expo/Metro bootstrapping; `expo-router` auto-discovers `app/`.
- Location: `app/_layout.tsx`
- Triggers: First render after bundle load.
- Responsibilities: Import `react-native-reanimated` polyfill, wrap tree in `AppProviders`, render `<StatusBar>` + root `<Stack>` with children `index`, `(auth)`, `(app)`, `+not-found`. Headers hidden globally.
- Location: `app/index.tsx`
- Triggers: Visiting `/`.
- Responsibilities: Show `LoadingState` while `isLoading`; redirect to `/(auth)/login` if no session; otherwise redirect via `getDefaultAppRouteForRole(role)` or to `/(app)/unsupported`.
- Location: `app/(auth)/_layout.tsx`
- Triggers: Entering any route under `(auth)`.
- Responsibilities: Kick authed users back into the app (creators → `/(app)/(tabs)/plantel`, others → `/(app)/unsupported`); otherwise render a `Stack` with `login` and `forgot-password`.
- Location: `app/(app)/_layout.tsx`
- Triggers: Entering any route under `(app)`.
- Responsibilities: Redirect unauthenticated users to login; redirect unsupported roles to `/(app)/unsupported`; mount `<TerminationReminderMount />` (side-effect component that syncs notifications); declare the inner stack (`(tabs)`, `campo/pendencias`, `campo/gestacoes`, `campo/tarefas`, `campo/avisos`, `animal/[id]`, `vet-prontuario/[id]`, `financeiro`, `equipe`, `unsupported`) and their titles.
- Location: `app/(app)/(tabs)/_layout.tsx`
- Triggers: Entering the tab bar.
- Responsibilities: Render one of three tab sets based on `role`: **vet** (`plantel`, `veterinaria`, `rotina`, `agenda`, `reproducao`, `conta`), **field** (`campo`, `campo-pendencias`, `campo-gestacoes`, `campo-tarefas`, `campo-avisos`, `conta`), **creator** (`inicio`, `plantel`, `agenda`, `reproducao`, `conta`). Unavailable tabs are set to `href: null`. Tab bar icons come from `lucide-react-native`.
- `app/(app)/animal/[id].tsx` — animal detail (creator/vet dispatcher with redirect to `/(app)/vet-prontuario/[id]`).
- `app/(app)/vet-prontuario/[id].tsx` — vet chart.
- `app/(app)/campo/*.tsx` — deep-linked field pages (`pendencias`, `gestacoes`, `tarefas`, `avisos`).
- `app/+html.tsx` — static HTML root (`pt-BR`) used by `expo-router` web export.
- `app/+not-found.tsx` — 404 fallback.
## Error Handling
- Services call `handleSupabaseError(error)` (`src/services/base.ts`) which throws `new Error(error.message || "Erro ao acessar o banco de dados.")`.
- Hooks rely on TanStack Query to surface `error`/`isError` to screens; retry is `1` for queries, `0` for mutations (`src/lib/query-client.ts`).
- `AuthProvider` wraps bootstrap in try/catch and falls back to `clearUserState()` on any auth error.
- Config validation: `src/config/env.ts` uses `zod` `EnvSchema.safeParse` and throws on startup if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing — fail-fast.
- Field offline actions persist `last_error` and `retry_count` on the queue item rather than throwing.
## Cross-Cutting Concerns
- `zod` for env (`src/config/env.ts`) and forms (via `@hookform/resolvers`).
- Runtime normalization in `src/lib/roles.ts` (`normalizeRole`) and service-level mappers (DB enums → app enums).
- Supabase Auth (`@supabase/supabase-js`) with email/password only. Session persisted in `AsyncStorage` (native) or `localStorage` (web).
- `AuthContext` is the single consumer. Guards at every group layout + inside each route file.
- No service-role key on the client (enforced by comment in `src/lib/supabase.ts`). Server-only access patterns live in the web repo.
- RLS in Supabase (confirmed by recent commits: "fix(ownership): respeita RLS de user_can_manage_haras_team").
- Role gating in the app is purely for UX; real enforcement is database-side.
- `harasId` (`AuthContext`) is appended to every query/mutation (`filters.haras_id`, `eq("haras_id", harasId)`) so users only see their own haras.
- `ThemeProvider` (`src/theme/ThemeContext.tsx`) with tokens from `src/theme/tokens.ts`. Components consume via `useAppTheme()`. Dark is the default; AsyncStorage persists choice under `criahub_mobile_theme_mode`.
- All user-facing copy is in Portuguese (pt-BR). Dates via `Intl.DateTimeFormat("pt-BR")` in `src/utils/format.ts`. No i18n library — strings are hardcoded.
- Web/native branching in `src/lib/supabase.ts` (storage) and `src/lib/notifications.ts` (`Platform.OS === "android"` for channels).
- `expo-router` web export via `"web": { "bundler": "metro", "output": "static" }` in `app.config.ts`.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
