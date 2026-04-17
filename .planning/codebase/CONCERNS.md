# Codebase Concerns

**Analysis Date:** 2026-04-16

**Scope:** Expo SDK 54 / React Native 0.81 / React 19 mobile client (equestrian/haras domain) backed by Supabase (URL + anon key only). Two personas: Criador (owner), Veterinário, Peão/Funcionário. Parity target is the sibling web repo (`criahub-web-v2`).

## Tech Debt

**No linter / formatter / test runner installed:**
- `package.json` has no ESLint, Prettier, Biome, Jest, Vitest, Detox, or `react-native-testing-library` dependency — only `react-test-renderer` is pinned and unused.
- No `eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `biome.json`, `jest.config.*` or `vitest.config.*` at the repo root.
- CI/pre-commit story is limited to `tsc --noEmit` (mentioned in commit `4b3eac1`) and `expo-doctor`. Regressions that are not type errors ship unnoticed.
- Impact: Style drift, dead imports (see below), and convention erosion between web ↔ mobile go undetected.
- Fix: Add ESLint flat config (`@react-native/eslint-config` or `eslint-config-expo`), Prettier, and a smoke test suite with Jest + `react-native-testing-library`. Wire into `eas.json` preview builds and a GitHub Action.

**No test files at all:**
- `find` for `*.test.*` / `*.spec.*` returns zero files. The `app/__tests__` directory referenced in the tree is empty/missing on disk.
- `react-test-renderer` is declared but never imported.
- Impact: Every release is manual-QA only. Recent fixes like `animal-media` rollback (`src/services/animal-media.ts:50-92`) and RLS gating (`src/components/ownership/OwnershipSection.tsx:21-25`) have no regression coverage.
- Fix: Start with pure-unit tests on `src/lib/roles.ts`, `src/lib/haras.ts`, `src/services/field-offline.ts` (fingerprinting + retry math), and `src/services/ownership.ts:save` (100% validation, condomínio tie-break).

**No error boundary anywhere in the tree:**
- Only reference is a prop named `errorBoundary` inside `AnimalMediaActions.tsx:3` (unrelated JSX icon import). `app/_layout.tsx` wraps `Stack` only in `AppProviders` — an uncaught render error crashes the whole app to the Expo red-box, then to the OS on production.
- Impact: Apple/Google may reject a build if a common flow crashes (currently relying on `try/catch` inside handlers only).
- Fix: Add a top-level `ErrorBoundary` in `src/contexts/AppProviders.tsx` wrapping children; add a secondary boundary at route-group level (`app/(app)/_layout.tsx`).

**Monolithic screens (too many concerns per file):**
- `src/screens/VeterinaryScreen.tsx` — 1539 lines, 8+ mutations, 6+ queries, 6 modals. Heavy re-render cost and near-impossible to test.
- `src/screens/FieldHomeScreen.tsx` — 1299 lines. Manages birth report, issue report, pendings filter, tasks filter, notifications, offline flush, and NetInfo subscription in one component.
- `src/screens/AnimalDetailScreen.tsx` — 1244 lines. 10 tabs, inline video player, photo modal, edit modal.
- `src/screens/VetAnimalChartScreen.tsx` — 981 lines.
- `src/screens/VetReproductionScreen.tsx` — 972 lines.
- Impact: Every state change in any of these causes a full-tree reconcile; hot reload is sluggish; merge conflicts on parallel features are severe.
- Fix approach: Extract tab bodies into sibling components (`<PhotosTab />`, `<HealthTab />`), co-locate modal state into custom hooks (`useBirthReportForm`), and use `React.memo` for row items.

**Pervasive `any` in service mappers (87 occurrences, 30 files):**
- `src/services/ownership.ts:18` `function normalizeShare(row: any)`
- `src/services/team.ts:82,184-202` — `(supabase as any).rpc(...)` is a deliberate escape hatch for untyped RPCs (`set_haras_member_status`, `remove_haras_member`), but the `(data as any).error` pattern repeats 4×.
- `src/services/animals.ts:81,164,179` — `(supabase as any).from("animal_ownership_shares"|"animal_link_queue")` bypasses the generated Database types.
- `src/services/health.ts:81-147`, `src/services/tasks.ts:21-58`, `src/services/financial.ts:54` — all mappers accept `row: any`.
- Impact: Schema drift between web and mobile is invisible; a renamed/removed column shows up only at runtime when `supabase-js` returns `null` for a field the mapper still reads.
- Fix: Generate `Database` types via `supabase gen types typescript` and replace `any` with `Database["public"]["Tables"][X]["Row"]`. Keep the typed `(supabase as any).rpc` only for RPCs not in the generated types, with an RPC input/output interface.

**`router.push("/(app)/..." as any)` cast in 5 screens:**
- `src/screens/AccountScreen.tsx:161,166`
- `src/screens/CreatorNoticesScreen.tsx:100`
- `src/screens/CreatorDashboardScreen.tsx:187,249`
- Cause: `experiments.typedRoutes: true` is enabled in `app.config.ts:104`, but route string literals aren't being inferred (likely dynamic template literals and missing `Href` import from `expo-router`).
- Impact: A rename of `(app)/financeiro.tsx` breaks silently — TypeScript won't flag it.
- Fix: Import `Href` from `expo-router` and pass typed hrefs, or switch to `router.push({ pathname: "/(app)/financeiro" })` which is inferred.

**Dead fallback in `mapAnimalFromDb`:**
- `src/services/animals.ts:84` — `const mappedCategory = CATEGORY_MAPPING_DB_TO_APP[row.categoria] ?? "potro"` silently collapses unknown DB categories (null, "Doadora", etc.) into "potro" before `resolveCategoryByAge` runs.
- Impact: Category analytics and filter counts on `PlantelScreen` lie when a new category is added in the web DB.
- Fix: Return `"unknown"` and surface a warning via the `warnings[]` array pattern already used in `animal-details.ts`.

**Duplicated helpers across services:**
- `sanitizeName` exists in both `src/services/animal-media.ts:3` and `src/services/profile.ts:9`.
- `sanitizeFileName` exists in `src/services/field.ts:55` (slightly different regex — drops dots).
- `extractPathFromPublicUrl` is duplicated in `animal-media.ts:24` and `profile.ts:17`.
- `uriToBlob` logic (`fetch(uri).then(r => r.blob())`) is reimplemented in `animal-media.ts:19`, `profile.ts:45`, `field.ts:67`, `tasks.ts`, `health.ts`.
- Impact: A bug fix (e.g., iOS returning an empty blob for `file://` URIs under Hermes) must be applied in 5 places.
- Fix: Extract to `src/lib/storage.ts` with `uploadPublicFile({ bucket, path, uri, contentType })` that handles blob creation and rollback.

**Boilerplate DTO mapping (DB pt-BR ↔ app snake_case):**
- `src/services/animals.ts:19-53` defines 4 mapping tables (`CATEGORY_MAPPING`, `CATEGORY_MAPPING_DB_TO_APP`, `STATUS_MAPPING_APP_TO_DB`, `STATUS_MAPPING_DB_TO_APP`) — bidirectional lookups that must be kept in sync manually.
- Impact: Adding a new status requires editing 4 tables + the domain union type; easy to forget the reverse mapping.
- Fix: Single source of truth — one `STATUS_DEFS: Array<{ app: AnimalStatus; db: string }>` and derive both maps.

## Known Bugs

**`getAnimalNamesMap` queries across haras boundary:**
- `src/services/veterinary.ts:63-68`
  ```ts
  async function getAnimalNamesMap(ids: string[]) {
    if (ids.length === 0) return new Map<string, string>();
    const { data, error } = await supabase.from("animals").select("id, nome").in("id", ids);
    ...
  }
  ```
- Issue: No `.eq("haras_id", ...)` filter. Relies entirely on RLS to scope. Consumers on line 483 and 530 already have `harasId` in scope.
- Impact: If RLS allows a user to see animals from multiple haras (e.g., a vet with memberships in two properties), the dashboard can show names from the wrong haras next to task counts from the scoped haras. Also defeats the `INTEGRATION_PLAYBOOK.md` pattern "every query scoped by haras_id" documented in `docs/mobile-integration/`.
- Fix: Accept `harasId` as argument and add `.eq("haras_id", harasId)`.

**`fetchRelative` ignores haras scoping for genealogy:**
- `src/services/animals.ts:128-148` — fetches father/mother by `id` only.
- Impact: If father/mother belongs to a different haras the user has membership in, genealogy shows cross-haras data. Matches the same class of issue as `getAnimalNamesMap`.
- Fix: Pass `harasId` and filter.

**`animals` storage bucket used for health documents:**
- `src/services/health.ts:66-73` uploads to the bucket `"animals"` (a separate bucket from `animal-photos` used by `animal-media.ts:44`). Web repo uses a unified bucket per convention.
- Impact: Three buckets to authorize (`animal-photos`, `animals`, `documents`, `avatars`, `task-attachments`) — RLS misconfig on any one breaks a flow.
- Fix: Consolidate to `animal-photos` for image uploads; confirm bucket name parity with `criahub-web-v2`.

**`fetchRelative` swallows errors silently:**
- `src/services/animals.ts:137-139` — returns `null` on error without propagating, so the UI cannot distinguish "no father registered" from "RLS blocked me from reading the father's row".
- Impact: Users on peão role see "Pai: Não informado" for every animal because they cannot read foreign `animals` rows, even when the field is populated.
- Fix: Expose a `warnings[]` similar to `animal-details.ts:208-212`.

**`AccountScreen` haras name fetch has no RLS error surface:**
- `src/screens/AccountScreen.tsx:81-90` — silent `catch { setHarasName(null) }`.
- Impact: A user whose RLS blocks `haras.select` simply sees no haras name, with no diagnostic. Debugging ownership/team bugs becomes guesswork.
- Fix: Surface the error in a subtle `textMuted` line ("haras indisponível") to ease support.

**`openExternalUrl` silently no-ops on bad URL:**
- `src/screens/AnimalDetailScreen.tsx:244-248` — when `Linking.canOpenURL` returns `false`, nothing happens, no feedback to user.
- Impact: Users tapping a malformed `http://...` or `tel:` link see nothing and assume the app is frozen.
- Fix: Mirror `AccountScreen.tsx:232-245` pattern — show an `Alert.alert` fallback.

**Presence switch toggles optimistically then reverts without state sync:**
- `src/components/ownership/OwnershipSection.tsx:76-83` — `presenceMutation.mutate(next)` fires, `Switch` reflects `isAtHaras` prop. On error the prop is stale until invalidation completes, so the switch may flicker.
- Impact: Confusing UX if RLS rejects the update (peão role — see `AnimalDetailScreen.tsx:140` `!isFieldStaffRole(role)` guard — which is inverted: the comment says "peão não" but the expression evaluates `true` for non-field-staff, including `unknown`).
- Fix: Re-check the boolean — current logic `isCreatorRole(role) || isVeterinaryRole(role) || !isFieldStaffRole(role)` grants presence toggle to `unknown` roles too. Tighten to `isCreatorRole(role) || isVeterinaryRole(role)`.

**`ExpoImagePicker.MediaTypeOptions` is deprecated in SDK 51+:**
- `src/screens/FieldHomeScreen.tsx:57` and `src/screens/FieldHomeHubScreen.tsx:34` and `src/components/tasks/TaskExecutionModal.tsx:52` still use `MediaTypeOptions.Images`.
- New code (`AccountScreen.tsx:339,357` and `AnimalMediaActions.tsx:58,63`) correctly uses the array literal `mediaTypes: ["images"]`.
- Impact: Deprecation warning in dev; removal in a future Expo SDK will break these screens.
- Fix: Replace all `ImagePicker.MediaTypeOptions.Images` with `["images"]`.

## Security Considerations

**Public Supabase URL and anon key only (correct design) but no RLS smoke-test on device:**
- `src/lib/supabase.ts:6` documents the intent correctly: "O app usa somente URL pública + anon key. Nunca usar service role no cliente." Good.
- However: there is no runtime RLS verification — if a peão user opens `/animal/[id]` for an animal in a haras they do not belong to, the screen will happily show `Loading…` forever while `animals.select` returns empty. See `AnimalDetailScreen.tsx:229-242`.
- Fix: When `useAnimalQuery` returns `null` and `error` is `null`, show a dedicated "acesso negado" empty state.

**RLS matrix is documented in comments, not enforced in code:**
- `src/screens/AnimalDetailScreen.tsx:139-142`:
  ```ts
  // RLS: animals UPDATE aceita criador/veterinário/funcionário (peão não).
  const canTogglePresence = isCreatorRole(role) || isVeterinaryRole(role) || !isFieldStaffRole(role);
  // RLS: animal_ownership_shares INSERT/UPDATE exige user_can_manage_haras_team (...).
  const canManageShares = isCreatorRole(role);
  ```
  - As noted above, `!isFieldStaffRole(role)` leaks permissions to `unknown`/`admin`/`assessor` without explicit intent.
- `src/components/ownership/OwnershipSection.tsx:21-24` captures the RLS rule in a JSDoc block, but there is no single `lib/permissions.ts` file mapping role → action → RLS table.
- Fix: Create `src/lib/permissions.ts` that exports typed helpers (`canToggleAnimalPresence(role)`, `canManageOwnershipShares(role)`, `canReadFinancial(role)`, …) with co-located tests that mirror the Supabase RLS SQL.

**`(supabase as any).rpc("set_haras_member_status", ...)` does not validate response shape:**
- `src/services/team.ts:184-202` — if the RPC returns `{ error: "..." }` it throws, otherwise it assumes success. No runtime schema validation with `zod` despite `zod` being installed.
- Impact: An RPC signature change goes undetected.
- Fix: Parse with `z.object({ error: z.string().optional(), ok: z.boolean().optional() })`.

**Deep link scheme registered but no handlers:**
- `app.config.ts:14` — `scheme: "criahubmobile"`. `expo-linking` is imported only via `Linking.openURL` in `AccountScreen.tsx:239` and `AnimalDetailScreen.tsx:247`.
- No `Linking.addEventListener("url", ...)` in the app tree — incoming deep links, password-reset redirects, and email confirmation links have no handler.
- Impact: `supabase.auth.resetPasswordForEmail(email)` (`AuthContext.tsx:155`) is called with no `redirectTo` option, so the password-reset email points to Supabase's default hosted page rather than returning to the mobile app. Users must copy the new password manually.
- Fix: Add `redirectTo: "criahubmobile://reset-password"` and implement a handler in `app/(auth)/_layout.tsx` via `expo-router`'s `useURL`.

**File upload path predictability:**
- `animal-media.ts:40` — `${harasId}/animals/${animalId}/${Date.now()}_${sanitizeName(animalId.slice(0, 8))}.${ext}`.
- Path is deterministic (haras UUID + animal UUID + timestamp). Because the bucket is **public** (`getPublicUrl`, `/object/public/...`), anyone with a leaked haras + animal UUID can enumerate photos by timestamp guessing.
- Impact: Moderate. UUIDs are hard to guess, but a leaked `animal_id` (e.g., in a shared link) exposes all photos even to a user with no RLS access to the `animals` row, because storage RLS is separate from table RLS.
- Fix: Either (a) move `animal-photos` / `documents` to private buckets and use signed URLs with expiry, or (b) add a random nonce to the path (`${crypto.randomUUID()}.${ext}`).

**`credentials/` directory is in the repo root:**
- Present at `/credentials/` (from `ls -la` at root). `.gitignore` is 434 bytes — let's trust it but confirm.
- Impact: If any file inside is ever accidentally staged, it goes to the public remote.
- Fix: Verify the directory is properly ignored (`credentials/*` not just `credentials/`). Add a pre-commit hook that refuses to stage anything under `credentials/`.

**No rate-limiting on account-deletion email trigger:**
- `src/screens/AccountScreen.tsx:210-249` — opens a `mailto:` with user email + user ID. Not a real deletion, it's a support request.
- Apple 5.1.1(v) technically accepts this pattern ("an easily accessible mechanism") but Apple reviewers now frequently reject in favor of **in-app account deletion that actually deletes on confirmation**.
- Impact: App Store rejection risk on next submission if the reviewer is strict.
- Fix: Implement a Supabase Edge Function `POST /delete-account` that (1) verifies the JWT, (2) enqueues deletion in a `account_deletion_requests` table, (3) schedules a hard delete after 30 days. Call it from the button and show an in-app confirmation instead of `mailto:`.

**Server-side check for Apple 5.1.1(v):**
- The commit message `4b3eac1` states "abre e-mail pré-preenchido para suporte@criahub.com.br" — no automated deletion occurs. If support is slow (> 30 days), the app can be removed from the store.
- Fix: Same as above.

## Performance Bottlenecks

**`FlatList` in `PlantelScreen` missing virtualization tuning:**
- `src/screens/PlantelScreen.tsx:454-476` — no `getItemLayout`, `removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`, or `windowSize`.
- Each item renders a `Card` + `StatusBadge` + conditional `condominioTag`. On large haras (> 200 animals) initial mount is janky.
- Impact: Scroll jank on older Android devices; noticeable TTI regression on iPhone 11 class.
- Fix: Add `getItemLayout={(_, index) => ({ length: 104, offset: 104 * index, index })}`, `initialNumToRender={10}`, `removeClippedSubviews`, and wrap `AnimalItem` in `React.memo`.

**`AnimalItem` is defined inline without memoization:**
- `src/screens/PlantelScreen.tsx:75` — recreated on every parent render.
- `src/screens/FieldAnimalSearchScreen.tsx:117-134` — same pattern.
- Fix: `export const AnimalItem = React.memo(function AnimalItem(...) { ... })`.

**`.map()` rendering in place of `FlatList`:**
- `src/screens/CreatorNoticesScreen.tsx:194-213` renders `overdue.map()`, `thisWeek.map()`, `later.map()` inside a `ScrollView`.
- Impact: For a large haras with many terminations (condomínios com vencimento), every render re-creates every row's event handlers.
- Fix: Either `SectionList` with section headers, or at minimum wrap the row renderer in `useCallback` and row components in `React.memo`.

**`useMemo`/`useCallback` coverage is uneven:**
- 87 uses total across 30 files (Grep output), but monolithic screens (`VeterinaryScreen.tsx`, `FieldHomeScreen.tsx`) use 6 `useMemo` blocks amidst dozens of inline object/function literals re-created per render (e.g., `styles={[styles.x, { opacity: pressed ? 0.7 : 1 }]}` pressables).
- Fix: Not critical individually, but on `FieldHomeScreen.tsx:188-194` `refreshFieldPanels` is inline — wrap in `useCallback` to stabilize the `useEffect` dependency on line 224.

**`animal-details.ts` fires 10 queries in parallel per animal view:**
- `src/services/animal-details.ts:100-203` — `Promise.all` on 10 Supabase queries (documents, reproduction_documents, animal_videos, videos, awards, health_records, vaccines, exams, animal_location_history, reproductive_events, offspring). The `offspring` query uses `.or("pai_id.eq.X,mae_id.eq.X")`.
- Impact: For every animal detail view, 10 round-trips (mitigated by parallelism). On a cold network this is 2-4s. Stale time is only 60s (`query-client.ts:7`), so navigating back & forth re-fetches.
- Fix: Create a Supabase RPC `get_animal_details(p_animal_id, p_haras_id)` that returns all 10 payloads in a single round-trip (as the web repo likely does). Also raise `staleTime` for detail views to 5 min.

**Dashboard: 7 Supabase calls per render (plus 1 nested):**
- `src/services/dashboard.ts:276-300` — 7 parallel calls wrapped in `safe()`. `countAnimalsNeedingCare` internally does 2 more calls (`dashboard.ts:113`). `fetchRecentActivity` does 4 more. Total: ~11 round-trips per dashboard mount.
- Impact: Same as above for the creator dashboard.
- Fix: Single RPC `get_creator_dashboard(haras_id)`; invalidate via triggers or via a `last_modified` timestamp.

**N+1-ish pattern in ownership save:**
- `src/services/ownership.ts:146-188` — per share, issues a separate `UPDATE` (or `INSERT`) in a loop, then per removed share issues a separate deactivation `UPDATE` at line 192-204.
- Impact: A condomínio with 5 cotistas = up to 11 round-trips to save (5 updates/inserts + 5 deactivations + 1 animal update). Wrap under a slow network and this breaks the mutation easily.
- Fix: Bulk upsert with `supabase.from("...").upsert(rows, { onConflict: "id" })` and bulk deactivation with `.in("id", idsToDeactivate)`.

**`FlatList` inside `ScrollView`:**
- `src/screens/CreatorNoticesScreen.tsx` — render arrays inside a scroll view (OK since they're simple `.map`). But `src/screens/AnimalDetailScreen.tsx:273` wraps a `ScrollView` that internally does `photoUrls.map(...)` (line 400) horizontally within another horizontal `ScrollView` (line 324 — tabs). On iOS the nested horizontal scrollers can conflict with outer vertical scroll.
- Impact: Minor gesture conflicts reported anecdotally on iOS.
- Fix: Already using `showsHorizontalScrollIndicator={false}` — OK for now; migrate heaviest lists to `FlatList` if a UX bug is confirmed.

## Fragile Areas

**Role-inference for `unknown` / `admin` / `assessor`:**
- `src/lib/roles.ts:60` — `isMobileSupportedRole` only returns true for creator/vet/field-staff. A user with role `admin` or `assessor` gets redirected to `/(app)/unsupported` (`app/index.tsx:24`).
- Mobile parity plans (`docs/mobile-integration/ANIMAIS_CONDOMINIO_MOBILE_PARITY_PLAN.md` presence) hint at assessor support; the mobile is blocking them silently.
- Fix: Decide per-module (likely assessor should match creator). Add dedicated helpers and update `AnimalDetailScreen.tsx:140-142` permission derivation accordingly.

**`resolveUserHarasId` picks an arbitrary haras when user has multiple memberships:**
- `src/lib/haras.ts:7-31` — picks the most-recently-updated "ativo" membership, else the first with a haras_id. No UI to switch haras.
- Impact: A vet with memberships in two haras sees only one; switching requires re-login and relies on DB order.
- Fix: Add a `hotSwapHaras(harasId)` in `AuthContext` and a haras-picker UI.

**Presence manual override flag can be contradicted by ownership save:**
- `src/services/ownership.ts:212-215` — when saving a share marked `is_external`, the code forces `is_at_haras = false` and `presence_manual_override = false` on the `animals` row, overriding any manual toggle done on `OwnershipSection.tsx:76`.
- Impact: Users who just toggled "no haras" for an animal sold to a condomínio external partner see the state reset when another user saves the shares.
- Fix: Document this as intended (it probably is), or require a confirmation alert before overwrite.

**Offline queue dedup window:**
- `src/services/field-offline.ts:5` — `DEDUP_WINDOW_MS = 2 * 60 * 1000` (2 min). A peão registering two legitimate births of different foals with the same mother within 2 minutes (rare, but twin/slippage scenarios happen) will have the second enqueue silently dropped because fingerprint includes `mare_id` + `photo_uri` only if `photo_uri` differs — see line 60.
- Impact: Data loss risk in edge cases.
- Fix: Include `created_at` bucket (down to the minute) in fingerprint, or a user-supplied `reference_id`.

**Offline queue retries are per-item only:**
- `src/services/veterinary.ts:639-659` — `flushOfflineQueue` runs items sequentially; one failure pushes the item to `remaining` but the loop continues. No exponential backoff inside the flush itself; only on next retry via `next_retry_at` set elsewhere.
- Impact: A persistently-failing item (bad payload, schema drift) sits in the queue forever, displayed as "sincronização pendente" to the user, with `last_error` accumulating.
- Fix: Add a `max_retry_count` (e.g., 10) after which the item moves to a "failed" bucket visible in AccountScreen → Suporte, with an export button.

**Image picker `quality: 0.8` + no size check:**
- `AccountScreen.tsx:340,358`, `AnimalMediaActions.tsx:59,64`, `FieldHomeScreen.tsx:58`, `FieldHomeHubScreen.tsx:35`, `TaskExecutionModal.tsx:52` — pick at 0.8 quality with no explicit max dimensions.
- Impact: iPhone 15 Pro takes 48 MP photos; even at 0.8 quality this can be 6-12 MB per upload. Supabase storage plan + user data plan both suffer. Web app likely compresses server-side.
- Fix: Add `allowsEditing: true` where applicable (already done in `AccountScreen` avatar) or run `expo-image-manipulator` to cap at e.g. 2000px longest edge.

**No retry/backoff on `Linking.openURL`:**
- `AccountScreen.tsx:239` — a failed deep link only shows one alert and gives up.
- Minor.

## Scaling Limits

**Plantel pagination hardcoded:**
- `src/screens/PlantelScreen.tsx:32` — `PAGE_LIMIT = 20`.
- Works OK up to a few thousand animals because the user paginates. But `CreatorDashboardScreen.tsx` loads counters that scan the full `animals` table per call.
- Scaling path: Add indexes on `(haras_id, status, is_at_haras)` in Supabase; leverage the `counts` view pattern web uses.

**AsyncStorage caches grow unbounded:**
- `src/services/veterinary.ts:25-31` — `dashboardCacheKey` and `semenCacheKey` per haras. `src/lib/notifications.ts:6` — `SCHEDULED_MAP_KEY`. Field offline queue. No eviction policy.
- Impact: A user switching between haras (admin/assessor scenario) accumulates stale entries. On Android, AsyncStorage is backed by SQLite and performs fine up to ~6 MB; beyond that, warm start stalls.
- Fix: Add a TTL + `clearExpired` on app start.

**Notification scheduled map never compacts:**
- `src/lib/notifications.ts:135-158` — `syncReminders` cancels old keys by prefix but never compacts the whole map. Over time, keys for deleted animals may linger.
- Fix: On `signOut` call `clearAllReminders()` (already exposed on line 160) — confirm it is actually called. It is **not** called in `AuthContext.tsx:148-152` `signOut`. That's a concrete bug.

## Dependencies at Risk

**`expo@~54.0.33` is the current SDK (OK), but:**
- `react@19.1.0` + `react-native@0.81.5` + `react-native-reanimated@~4.1.1` + New Architecture enabled (`app.config.ts:16` `newArchEnabled: true`). This bleeding-edge combo is still rough for some third-party libraries.
- `lucide-react-native@^0.575.0` — icon library, works fine under New Arch. Low risk.
- `react-native-keyboard-controller@1.18.5` — pinned, required for proper keyboard behavior under RN 0.81.
- Impact: Any SDK 55 bump requires careful testing; current pins are not risky but upgrade velocity is slow.

**`expo-document-picker@~14.0.8` iCloudContainerEnvironment: "Production":**
- `app.config.ts:97-101` — `"iCloudContainerEnvironment": "Production"` in a client code path that has no iCloud container declared.
- Impact: No actual risk today (iCloud is not used), but the config string is cargo-culted.
- Fix: Remove unless iCloud is planned.

**`dotenv@^17.3.1` runtime dependency in production bundle:**
- `package.json:26` — `dotenv` is in `dependencies` (not `devDependencies`) and is `require()`d in `app.config.ts:2` for build-time config loading. Bundlers usually tree-shake it out, but placing it in `dependencies` signals it may ship.
- Impact: Bundle size penalty, potential attempt to read `.env` files at runtime on devices.
- Fix: Move to `devDependencies` and confirm `app.config.ts` is build-time only.

## Missing Critical Features

**No in-app account deletion (Apple 5.1.1(v) risk):**
- See security section. `mailto:` workflow is legally fragile.
- Fix: Edge function + one-tap confirmation.

**No offline auth session persistence on Android when AsyncStorage is cleared:**
- `src/lib/supabase.ts:42` — uses `AsyncStorage` on mobile. `persistSession: !isServerEnvironment` (line 44). If Android OS clears AsyncStorage (low memory), the user is logged out silently. No biometric re-auth fallback.
- Fix: Expose `expo-local-authentication` for a "keep me signed in" toggle that stores a refresh token in `expo-secure-store`.

**No error-tracking / crash reporting service integrated:**
- No Sentry, Bugsnag, Datadog, or Expo `errorRecovery` hooks. Only `console.warn` in 3 places (Grep output).
- Impact: Production crashes are discovered only by user reports.
- Fix: `@sentry/react-native` with `sentryConfig` in `app.config.ts`.

**No analytics for Apple review feedback loop:**
- Apple reviewers test the "Create account / Delete account" path. Without crash reporting, a rejection message ("crashed on delete") has no stack trace.
- Fix: Same as above.

**Biometric lock:**
- None. Private financial data (`CreatorFinancialScreen.tsx`) is accessible as long as the session is alive.
- Fix: Wrap `(app)/financeiro.tsx` in a biometric gate via `expo-local-authentication`.

**Network status banner:**
- `NetInfo` is used inside `field.ts:51` and `FieldHomeScreen.tsx:228` but there is no global "Você está offline" banner.
- Impact: Users in bad reception on a farm get generic errors when queries fail.
- Fix: Subscribe to `NetInfo.addEventListener` in `AppProviders.tsx` and render a thin banner above the nav stack.

**No sync queue for creator/vet creation flows outside the vet module:**
- Only the field module (`field-offline.ts`) and vet module (`veterinary-offline.ts`) have offline queues. Creator actions (ownership save, presence toggle, profile edit) fail hard with a network error.
- Impact: Peão has best UX under offline; criador (the primary persona) has the worst.
- Fix: Generalize `field-offline` into `src/services/offline-queue.ts` and opt-in per mutation via `withOfflineFallback`.

## Test Coverage Gaps

**Zero unit tests, zero integration tests, zero E2E tests.**

Priority-ordered test targets by value × fragility:

1. `src/lib/roles.ts` — pure functions, drive RLS gating. High blast radius if wrong.
2. `src/lib/haras.ts` — multi-haras membership resolution.
3. `src/services/field-offline.ts` — fingerprint + queue dedup math.
4. `src/services/ownership.ts:save` — condomínio validation (sum = 100%, duplicate owners, primary fallback).
5. `src/services/animals.ts` — category remapping by age, status mapping bi-directionality.
6. `src/services/animal-media.ts` — rollback on DB failure (the exact scenario from commit `4b3eac1`).
7. `src/components/ownership/OwnershipSection.tsx` — permission gating (snapshot test that `canManageShares={false}` hides the button).
8. `src/lib/animal-location.ts` — location-picker label building.
9. `src/screens/AnimalDetailScreen.tsx` — ABCCMM field-lock logic (commit `7e20af0`).

**Risk:** Each of the last 3 commits (`e3a08c9`, `4b3eac1`, `6db0dbb`, `7e20af0`, `a65d066`) fixed a RLS/UX bug with no regression test. A future change can re-introduce any of them invisibly.

## Offline/Sync Concerns

**Two parallel offline queues (field + vet), no shared abstraction:**
- `src/services/field-offline.ts` and `src/services/veterinary-offline.ts` implement the same pattern: AsyncStorage queue + fingerprint + retry backoff + last_sync snapshot.
- Impact: Bug fixes to queue semantics must be applied twice (e.g., the `DEDUP_WINDOW_MS` at 2 min in `field-offline.ts:5` — does the vet queue use the same window?).
- Fix: Factor out a generic `OfflineQueue<TAction>` in `src/lib/offline-queue.ts` parameterized by action type + executor map.

**No conflict resolution on flush:**
- Both queues re-execute mutations on the server without checking if the target row changed since the local mutation was created.
- Impact: Stale overwrites are possible. E.g., a creator edits an animal while peão has a pending "issue report" tied to it; the peão's flush can resurrect a stale status.
- Fix: Use `updated_at`-based optimistic concurrency (`.eq("updated_at", cachedUpdatedAt)`).

**Background sync only on app-focus:**
- `src/screens/FieldHomeScreen.tsx:224-234` — flushes on mount and when `NetInfo.isConnected` flips true. No background fetch (`expo-background-fetch`) configured.
- Impact: Offline reports sit on-device until the user re-opens the field screen.
- Fix: Register a background task that attempts `flushFieldQueue` every 15 min when online.

**`syncReminders` is not called on app resume:**
- `src/hooks/useTerminationReminderSync.ts:41-79` — only reacts to `useUpcomingTerminationsQuery` data changes.
- Impact: If the user kills the app and reopens 3 weeks later, no reminders re-scheduled until the ownership query refetches (60s stale time, but blocked by the screen mounting).
- Fix: Schedule a sync on `AppState` change to `"active"` in `AppProviders.tsx`.

## Web ↔ Mobile Parity Drift Risk

**Docs already acknowledge parity plans:** `docs/mobile-integration/ANIMAIS_CONDOMINIO_MOBILE_PARITY_PLAN.md`, `WEB_MOBILE_HEALTH_PARITY.md`, `WEB_MOBILE_REPRO_PARITY.md`, `CREATOR_TASK_DELEGATION_BACKEND_ALIGNMENT_PLAN.md`, `SAAS_HARAS_ISOLATION_HARDENING.md`, `PEAO_INTEGRATION_MASTER_PLAN.md`.

**Concrete drift risks:**

1. **Bucket naming** — mobile uses `animal-photos`, `documents`, `animals`, `avatars`, `task-attachments`. Confirm each exists on web with matching RLS.
2. **Category / status enums** — hard-coded in `src/services/animals.ts:19-53`. Web likely has a single source in TypeScript; mobile has its own 4-table mapping. Add a shared `@criahub/domain` npm package (future).
3. **ABCCMM immutability rule** — enforced in mobile via `AnimalEditModal.tsx:191` (`if (!isOfficial)`). If web enforces via RLS column-level grants, mobile's client-side guard may be bypassed if the DB allows an update; the memory file confirms `dados_oficiais_abccmm` is "imutáveis" — ensure RLS is the ground truth, not the client.
4. **Plantel manual creation** — commit `a65d066` removed mobile-side creation; memory confirms "criação oficial é via importação ABCCMM no web". If a future dev ships a `CREATE` mutation in `animals.ts`, it must reject non-ABCCMM creation at RLS level, not just in the mobile client.
5. **Location dropdown** — commit `6db0dbb` enforces dropdown from `haras_settings.location_settings`. Mobile has `AnimalLocationPicker` in `src/components/animal/`. Web must populate the same table for free-form values to stay forbidden.
6. **Ownership model** — the `animal_ownership_shares` table, `termination_type` / `termination_date` / `termination_age_years` semantics live in both repos. Any web migration (e.g., adding a new termination type) must be mirrored in `src/types/domain.ts` and `src/services/ownership.ts:SHARE_SELECT_FIELDS` before the next release.
7. **Reproductive event types** — `src/services/animal-details.ts:82-92` (`formatReproductionEventType`) hard-codes 6 types. `src/services/dashboard.ts:37-45` (`REPRODUCTION_EVENT_LABELS`) hard-codes 7. Two disparate maps in the same repo for the same domain concept — easy to drift.

**Fix approach:**
- Create `src/domain/enums.ts` with a single source of truth for reproductive event types, categories, and statuses, consumed by `animals.ts`, `dashboard.ts`, `animal-details.ts`.
- Document the "mobile is a thin consumer of Supabase" rule in a short `AGENTS.md` / `CLAUDE.md` at repo root so future work defaults to "add to DB/RLS first, mobile second."
- Add a nightly `scripts/verify-web-parity.ts` that hits both Supabase instances (read-only) and diffs enum columns.

---

*Concerns audit: 2026-04-16*
