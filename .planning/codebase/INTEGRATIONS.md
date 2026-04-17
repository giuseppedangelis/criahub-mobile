# External Integrations

**Analysis Date:** 2026-04-16

## APIs & External Services

**Backend-as-a-Service:**
- Supabase — sole backend; shared with the web repo (`criahub-web-v2`) per project convention
  - SDK/Client: `@supabase/supabase-js` `^2.97.0`
  - Client factory: `src/lib/supabase.ts`
  - Project URL: `https://gwibmimaquoesgpbdojo.supabase.co` (hard-coded in `app.json` extra; also resolved from `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` via `app.config.ts` → `src/config/env.ts`)
  - Supabase project ref: `gwibmimaquoesgpbdojo`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon JWT — never a service role)
  - Env validation: `src/config/env.ts` uses Zod to throw on misconfiguration at boot

**Expo Services (EAS):**
- EAS Build + Submit — native builds and store submission
  - Project ID: `4069d525-bbce-4f86-9863-a51ccfe4af32`
  - Config: `eas.json` (profiles `preview`, `production`) and `extra.eas.projectId` in `app.config.ts`/`app.json`
  - Android submit track: `internal`

**No other third-party APIs are integrated.** The app does not call Stripe, OpenAI, Sentry, Firebase, OneSignal, Mixpanel, Segment, PostHog, or any analytics/error-tracking SDK. All remote interaction routes through Supabase.

## Data Storage

**Databases:**
- Supabase Postgres (shared with web repo)
  - Connection: via Supabase JS client at `src/lib/supabase.ts`
  - Access pattern: PostgREST with Row Level Security; the app always carries `haras_id` filters in service-layer queries
  - Tables accessed from mobile (observed via `supabase.from('…')` in `src/services/`):
    - `profiles`, `haras_members`, `haras_settings`
    - `animals`, `animal_videos`, `animal_location_history`, `animal_link_queue`, `animal_ownership_shares`
    - `tasks`, `task_executions`
    - `events`, `agenda` flows use `events` + `tasks`
    - `gestations`, `reproductive_events`, `reproductive_exams`, `breeding_events`, `embryos`, `semen_inventory_stallion`, `semen_movements`
    - `health_records`, `vaccines`, `exams`, `health_batch_events`, `health_batch_event_animals`, `health_audit_logs`
    - `documents`, `reproduction_documents`, `videos`, `awards`
    - `transactions` (financial)
    - `pending_validations` (field submissions)

**Supabase Storage (buckets):**
- `animal-photos` — animal photo uploads; path convention `{haras_id}/animals/{animal_id}/{ts}_{slug}.{ext}` (`src/services/animal-media.ts`, `src/services/field.ts` for pending-validations subfolder)
- `documents` — animal document uploads; same haras-scoped path convention (`src/services/animal-media.ts`)
- `animals` — used by `src/services/health.ts` for health-related file uploads
- `avatars` — user profile avatars; path `{user_id}/{ts}_avatar.{ext}` (`src/services/profile.ts`)
- `task-attachments` — task execution attachments (`src/services/tasks.ts`)
- All uploads use `getPublicUrl(...)`; no signed URL flow is wired up on mobile
- Rollback pattern: on subsequent DB failure, the uploaded object is removed (`animal-media.ts`, `profile.ts`) to avoid orphaned storage

**Supabase RPC (Postgres functions called from mobile):**
- `list_haras_assignable_members(p_haras_id)` — `src/services/tasks.ts:251`
- `set_haras_member_status(p_user_id, p_haras_id, p_status)` — `src/services/team.ts:184`
- `remove_haras_member(p_user_id, p_haras_id)` — `src/services/team.ts:196`

**Supabase Edge Functions:**
- None invoked from mobile (no `supabase.functions.invoke(...)` occurrences)

**Local/Device Storage:**
- `AsyncStorage` (`@react-native-async-storage/async-storage`) keys:
  - Supabase auth session (set by `createClient` with `storage: AsyncStorage`) — `src/lib/supabase.ts`
  - `criahub_mobile_theme_mode` — theme preference (`src/theme/ThemeContext.tsx`)
  - `@criahub/notifications/scheduled-v1` — map of local notification IDs (`src/lib/notifications.ts`)
  - `@criahub:field-offline-queue`, `@criahub:field-offline-last-sync` — field offline action queue (`src/services/field-offline.ts`)
  - `@criahub:vet-dashboard:{harasId}`, `@criahub:vet-semen:{harasId}` — vet read-through cache (`src/services/veterinary.ts`)
  - Veterinary offline queue keys — `src/services/veterinary-offline.ts`
- Web build storage adapter: wraps `window.localStorage` with async signatures (`src/lib/supabase.ts`)

**Caching:**
- In-memory: TanStack Query (`staleTime: 60s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`) — singleton via `src/lib/query-client.ts`
- Persistent: AsyncStorage cache for vet dashboard/semen (see above)
- No Redis, no external caching layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email + password)
  - Implementation: `src/contexts/AuthContext.tsx`
  - Flows: `signInWithPassword`, `resetPasswordForEmail`, `signOut`, `onAuthStateChange`, `getSession`
  - Session persistence: AsyncStorage on native, custom `window.localStorage` wrapper on web
  - `autoRefreshToken: true` and `persistSession: true` (disabled only in SSR-like `typeof window === 'undefined'` paths for web build safety)
  - `detectSessionInUrl: false` — deep-link recovery is not handled in mobile
- Profile fetched from `profiles` table on auth change; `haras_id` resolved via `src/lib/haras.ts` which falls back to the most recent `haras_members` row when the profile lacks one
- Role normalization + routing in `src/lib/roles.ts` (supports `admin`, `criador`/`breeder`, `veterinario`/`vet`, `assessor`/`acessor`/`advisor`, `employee`/`funcionario`/`peao`)

**Social/SSO:**
- Not implemented (no Apple/Google/Facebook SDK linked; no OAuth redirect handler)

**Apple/Google App Identity:**
- iOS bundle: `com.criahub.mobile` (`app.config.ts`)
- Android package: `com.criahub.mobile` (`app.config.ts`)
- iCloud container env for `expo-document-picker`: `Production`
- `ITSAppUsesNonExemptEncryption: false` declared for Apple review (no custom crypto)

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry/Bugsnag/Datadog/Crashlytics integrated
- Errors surface via `Alert.alert(...)` in screens and `console.warn(...)` in storage-cleanup best-effort paths (e.g., `src/services/animal-media.ts`, `src/services/profile.ts`)

**Logs:**
- Client-side `console.warn` only (storage rollback failures)
- Supabase-side logs are the only centralized trace

**Analytics:**
- None

## CI/CD & Deployment

**Hosting:**
- Native app distribution via EAS Build (`eas.json`):
  - `preview` → Android APK (`buildType: "apk"`, `distribution: "internal"`), iOS simulator build
  - `production` → Android AAB (`buildType: "app-bundle"`, `autoIncrement: true`), iOS store build (`autoIncrement: "buildNumber"`)
- EAS Submit `production` profile pushes Android to Google Play `internal` track
- iOS submission not preconfigured in `eas.json` (manual or via `eas submit` invocation)

**CI Pipeline:**
- None detected — no `.github/workflows/`, no CircleCI/Bitrise/Jenkins config, no `.gitlab-ci.yml`
- Only local/CLI-driven builds via the npm scripts:
  - `build:android:apk`, `build:android:aab`
  - `build:ios:simulator`, `build:ios:release`
  - `submit:android`

## Environment Configuration

**Required env vars (client, public):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are the only two variables surfaced to the app. They are validated at startup by Zod in `src/config/env.ts` and throw a fatal `Configuração de ambiente inválida` error if missing.

**Secrets location:**
- `.env.local` at repo root (matches the web app's naming so a single env file can be shared locally — see `.env.local.example`)
- Gitignored via `.env*` rule in `.gitignore`
- README explicitly warns: service role keys must never ship to the client
- `credentials/` directory exists at the repo root but is empty (reserved for EAS credentials; `.jks`, `.p8`, `.p12`, `.key`, `.mobileprovision` are gitignored)

**Duplication risk:**
- `app.json` still contains the Supabase URL and a real anon JWT hard-coded in `extra`. `app.config.ts` is the authoritative dynamic config and reads from `.env.local` via dotenv. Two sources can drift — the dynamic config will win at runtime under Expo SDK 54 but the committed `app.json` leaks the anon key to git history.

## Webhooks & Callbacks

**Incoming:**
- None — mobile is a pure client of Supabase; it does not expose HTTP endpoints

**Outgoing:**
- None — no outbound webhooks fire from the mobile client; mutations go through Supabase PostgREST / Storage / RPC exclusively

## Push Notifications

**Remote push:**
- Not registered — `expo-notifications` is configured only for **local scheduled notifications**
- No `Notifications.getExpoPushTokenAsync(...)` call anywhere in `src/`
- No FCM `google-services.json` or APNs push key references in `app.config.ts` / `eas.json`

**Local notifications (`src/lib/notifications.ts`):**
- Android channel: `criahub-reminders` (default importance, vibration pattern, white light)
- iOS permission request: `allowAlert: true, allowBadge: false, allowSound: true`
- Scheduled notification IDs tracked in AsyncStorage map under `@criahub/notifications/scheduled-v1`
- Consumer: `src/hooks/useTerminationReminderSync.ts` — schedules 30/7/1-day reminders for upcoming condomínio terminations (`UpcomingTerminationItem` from `useOwnership`)

## Network & Connectivity

- `@react-native-community/netinfo` `11.4.1` is used as an offline gate:
  - `ensureOnline()` in `src/services/field.ts` and `src/services/veterinary.ts` throws `"offline"` when `NetInfo.fetch()` returns `isConnected === false`
  - `FieldHomeScreen.tsx` / `FieldHomeHubScreen.tsx` subscribe to `NetInfo.addEventListener(...)` to drive auto-flush of the offline queue
- Offline queues (`field-offline.ts`, `veterinary-offline.ts`) use exponential backoff (capped at 15 min) and action fingerprints to dedupe within a 2-minute window

## Companion Repo Reference

- Web repo path (per user memory): `criahub-web-v2`
- Mobile ↔ web parity is the driving design constraint; mobile reads/writes the same Supabase tables/buckets/RPCs
- Cross-repo integration docs live under `docs/mobile-integration/` (e.g., `INTEGRATION_PLAYBOOK.md`, `SAAS_HARAS_ISOLATION_HARDENING.md`, `WEB_MOBILE_HEALTH_PARITY.md`)

---

*Integration audit: 2026-04-16*
