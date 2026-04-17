# TESTING.md

**Analysis Date:** 2026-04-16

## Test Framework

**No test framework is configured.** Evidence:
- `package.json` scripts: only `start`, `android`, `ios`, `web`, `typecheck`, `build:*`, `submit:android` — no `test`.
- `devDependencies`: only `@types/react`, `react-test-renderer@19.1.0`, `typescript@~5.9.2`. No Jest, Vitest, `@testing-library/react-native`, Detox, Maestro, `jest-expo`.
- No `jest.config.*`, `vitest.config.*`, `.detoxrc*`, `maestro/`, `.maestro/`, `__mocks__/`, `jest.setup.*` anywhere in the repo.
- `react-test-renderer` is vestigial (Expo template leftover) — not wired to any runner.

## Existing Test Files

**None.**
- `components/__tests__/` at repo root exists but is empty.
- No `*.test.*` / `*.spec.*` files outside `node_modules/`.
- No `__tests__/` inside `src/`.
- All code in `src/components/`, `src/hooks/`, `src/services/`, `src/screens/`, `src/lib/`, `src/utils/`, `src/contexts/` is untested.

## Test File Organization

**N/A — no convention established.** Empty `components/__tests__/` folder is the only clue. If tests are added, recommended options:
- **Co-located:** `src/services/animals.test.ts` alongside `src/services/animals.ts`.
- **Mirrored:** `src/__tests__/services/animals.test.ts` (matches the existing empty folder precedent).

## Test Structure / Mocking / Fixtures

**All N/A.** No mocking infra. Modules that would need mocks when tests appear:
- `@/src/lib/supabase` — single Supabase client; mock via `src/services/base.ts` re-export.
- `@react-native-async-storage/async-storage` — used by `src/theme/ThemeContext.tsx` and `src/lib/supabase.ts`. Official mock available: `@react-native-async-storage/async-storage/jest/async-storage-mock`.
- `expo-constants` — consumed by `src/config/env.ts`; stub `Constants.expoConfig.extra`.
- `expo-router` — `Redirect`, `Stack`, `Link`, `useLocalSearchParams`, `useSegments` used across `app/` and screens.
- `@tanstack/react-query` — use a fresh `QueryClient` in a test `QueryClientProvider` rather than mocking.

No fixtures or factories. SELECT shapes for fixture generation: `ANIMAL_SELECT_FIELDS` (`src/services/animals.ts:70-79`), `SHARE_SELECT_FIELDS` (`src/services/ownership.ts:10-16`). Domain shapes in `src/types/domain.ts`.

## Coverage

No coverage tool. No `.nycrc`, no `--coverage` script, no Codecov/Coveralls.

## Test Types

- **Unit:** Not present. Highest-ROI pure-function targets:
  - `src/utils/format.ts` — `formatDateBR`, `formatCategoryLabel`, `formatStatusLabel`, `formatRole`
  - `src/lib/roles.ts` — `normalizeRole`, `isCreatorRole`, `isVeterinaryRole`, `isFieldStaffRole`, `isMobileSupportedRole`, `getDefaultAppRouteForRole`, `getRoleLabel`
  - `src/lib/animal-location.ts` — `buildAnimalLocationLabel`, `extractLocationName`, `normalizeServiceType`, `resolveLocationTypeFromLabel`
  - Service mappers: `mapAnimalFromDb` (`src/services/animals.ts`), `normalizeShare` (`src/services/ownership.ts`)
  - Zod schemas: `LoginSchema` (`src/screens/auth/LoginScreen.tsx`), `EnvSchema` (`src/config/env.ts`)
- **Integration:** Not present. Supabase RLS is the permission source of truth; integration tests would need a seeded Supabase test project. Currently validated manually against the dev Supabase shared with the web repo.
- **E2E:** Not present. No Detox, no Maestro, no Playwright. QA happens on EAS preview builds.

## CI Hooks

**No CI pipeline.**
- No `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/`, `bitbucket-pipelines.yml`.
- No Husky (`.husky/` absent), no `lint-staged`, no pre-commit hooks.
- Only manual automated check: `npm run typecheck` (`tsc --noEmit`).

Commit history (e.g. `fix(qa): rollback de upload + exclusão de conta (Apple 5.1.1(v))`) shows QA loops are driven by App Store review + manual device testing, not CI.

## EAS Build and Preview Testing

**Build tool:** EAS CLI via `npx eas-cli`. Config: `eas.json`.

| Profile | Purpose | Android | iOS |
|---|---|---|---|
| `preview` | Internal QA builds | APK (`buildType: apk`), `distribution: internal` | Simulator build (`simulator: true`) |
| `production` | Store releases | AAB (`buildType: app-bundle`) | Auto-incrementing `buildNumber` |

- `appVersionSource: "remote"` — EAS owns versioning, not `app.config.ts`.
- CLI requirement: `>= 18.0.0`.
- Android submit profile exists (`submit.production.android.track: internal`); no iOS submit profile.

**Build commands (from `package.json`):**

```bash
npm run build:android:apk        # preview APK for internal testers
npm run build:android:aab        # production AAB for Play Store
npm run build:ios:simulator      # preview simulator build
npm run build:ios:release        # production iOS build
npm run submit:android           # submits latest AAB to Play internal track
```

No `submit:ios` script — iOS submission is ad-hoc via `eas submit --platform ios` or Xcode/TestFlight.

**Manual QA workflow (inferred):**
1. `npm run typecheck`
2. `npx expo start` for local simulator/device smoke test
3. `npm run build:ios:simulator` / `npm run build:android:apk` for shareable QA builds
4. Manual device QA — no automated regression suite
5. App Store rejection issues are tracked in commit subjects with Apple guideline numbers (e.g. `Apple 5.1.1(v)` = Data Collection & Storage) — keep this pattern.

## Common Patterns

**N/A** — no existing tests. When added, reuse codebase error patterns:

**Async service target** (`src/services/animals.ts:267-270`):

```ts
async update(id, harasId, input): Promise<void> {
  if (!id || !harasId) throw new Error("Animal ou haras inválido para atualizar.");
  // ...
}
```

Error-case tests must assert exact Portuguese messages — callers display `err.message` verbatim via `Alert.alert` and inline error banners.

**Zod schema target** (`src/config/env.ts:4-7`):

```ts
const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});
```

Happy path + each missing-field case is sufficient.

## Recommended Next Steps

1. **Unit tests with `jest-expo`** (official Expo preset): `npx expo install -- --save-dev jest jest-expo @types/jest`, add `"test": "jest"` and `"jest": { "preset": "jest-expo" }` to `package.json`. Start with `src/utils/format.ts` and `src/lib/roles.ts`.
2. **Component tests with `@testing-library/react-native`** for UI primitives (`AppButton`, `TextField`, `DateField`) — most reused components in the app.
3. **E2E** likely overkill for team size; Maestro flows for login + core tab navigation would give highest per-line coverage if pursued.
4. **CI:** Minimal GitHub Action running `npm ci && npm run typecheck` on push/PR — currently typecheck relies on developer memory.
