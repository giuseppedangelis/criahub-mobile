# Technology Stack

**Analysis Date:** 2026-04-16

## Languages

**Primary:**
- TypeScript 5.9 (strict mode) — all application code in `src/`, `app/` and `components/`
- TSX — React Native screens, components and Expo Router route files

**Secondary:**
- JavaScript (runtime target via Metro) — transpiled from TS; no hand-written JS in `src/`
- SQL — reference/audit scripts in `docs/mobile-integration/AUDIT_AND_SEED.sql`

## Runtime

**Environment:**
- React Native `0.81.5` with New Architecture enabled (`newArchEnabled: true` in `app.config.ts`)
- React `19.1.0` / React DOM `19.1.0` (React Native Web via Metro bundler)
- Hermes JS engine (default for Expo SDK 54)
- Targets: iOS (bundleId `com.criahub.mobile`), Android (package `com.criahub.mobile`), Web (static export via Metro)

**Package Manager:**
- npm (lockfile: `package-lock.json` present, ~380 KB — committed)
- No Yarn, pnpm or Bun artifacts

## Frameworks

**Core:**
- Expo SDK `~54.0.33` — managed workflow, no native `ios/`/`android/` folders (both in `.gitignore`)
- Expo Router `~6.0.23` — file-based routing in `app/` with typed routes enabled (`experiments.typedRoutes: true`)
- React Navigation native `^7.1.8` — bundled under Expo Router
- React Native Reanimated `~4.1.1` + React Native Worklets `0.5.1` — animation runtime
- React Native Screens `~4.16.0` + Safe Area Context `~5.6.0` — native stack primitives

**Forms & Validation:**
- React Hook Form `^7.71.2` — form state (only `LoginScreen.tsx` and `ForgotPasswordScreen.tsx` currently)
- Zod `^4.3.6` — schema validation; used in `src/config/env.ts` and auth screens
- `@hookform/resolvers` `^5.2.2` — Zod ↔ RHF bridge

**Data Layer:**
- TanStack React Query `^5.90.21` — server-state cache; single client via `src/lib/query-client.ts`
- `@supabase/supabase-js` `^2.97.0` — REST, Auth, Storage and RPC client

**Testing:**
- Not configured — only `react-test-renderer 19.1.0` present as a devDependency; no Jest/Vitest config, no `*.test.*` files under `src/`
- `components/__tests__/` directory exists but is empty

**Build/Dev:**
- Expo CLI (via `npx expo start` / EAS CLI) — scripts in `package.json`
- EAS Build `>= 18.0.0` — `eas.json` configures `preview` (APK / iOS simulator) and `production` (AAB / iOS store) profiles
- TypeScript `~5.9.2` with `tsc --noEmit` script (`npm run typecheck`)
- Metro bundler (Expo default) — used for native and web (`web.bundler: "metro"`, `web.output: "static"`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` `^2.97.0` — sole backend client (`src/lib/supabase.ts`); uses AsyncStorage on native, `window.localStorage` wrapper on web
- `@react-native-async-storage/async-storage` `2.2.0` — session persistence + offline queues (`src/services/field-offline.ts`, `src/services/veterinary-offline.ts`, `src/lib/notifications.ts`)
- `@tanstack/react-query` `^5.90.21` — every hook in `src/hooks/` is a React Query wrapper
- `expo-router` `~6.0.23` — entry point is `expo-router/entry` (see `package.json` main)
- `@react-native-community/netinfo` `11.4.1` — offline detection guard used by field/vet services before mutating
- `dotenv` `^17.3.1` — only used in `app.config.ts` to hydrate `.env.local` into `expo.extra`

**UI:**
- `lucide-react-native` `^0.575.0` — icon set (27 files import from it)
- `@expo/vector-icons` `^15.0.3` — secondary icon set (bundled with Expo)
- `react-native-svg` `15.12.1` — raster support for icons / brand logo
- `react-native-keyboard-controller` `1.18.5` — wraps `AppProviders` in `src/contexts/AppProviders.tsx`

**Media & Device:**
- `expo-image-picker` `~17.0.10` — photo/camera access (animal photos, avatar, field birth/issue reports)
- `expo-document-picker` `~14.0.8` — document attachments (`AnimalMediaActions.tsx`, `TaskExecutionModal.tsx`, `VetAnimalChartScreen.tsx`)
- `expo-file-system` `~19.0.21` — declared but not directly imported in `src/` (reserved / transitive)
- `expo-location` `~19.0.8` — GPS for field reports (`FieldHomeScreen.tsx`, `FieldHomeHubScreen.tsx`)
- `expo-video` `~3.0.16` — video playback in `AnimalDetailScreen.tsx` via `VideoView` + `useVideoPlayer`
- `expo-notifications` `~0.32.16` — local scheduled reminders (`src/lib/notifications.ts`); no remote push tokens registered
- `expo-web-browser` `~15.0.10` — declared; opens external auth/help links
- `expo-linking` `~8.0.11` — deep-link scheme `criahubmobile://`
- `@react-native-community/datetimepicker` `8.4.4` — native date inputs; declared as Expo plugin

**Expo Infrastructure:**
- `expo-constants` `~18.0.13` — reads `expoConfig.extra` for env in `src/config/env.ts`
- `expo-font` `~14.0.11` — font loading scaffolding (not yet custom fonts)
- `expo-splash-screen` `~31.0.13` — splash handled via `splash` config
- `expo-status-bar` `~3.0.9` — used in root `app/_layout.tsx`

**Not used (intentionally absent):**
- No Zustand/Redux/Jotai — global state handled via React Context (`AuthContext`, `ThemeContext`) + React Query cache
- No NativeWind/Tailwind — styling is StyleSheet + theme tokens in `src/theme/tokens.ts`
- No Jest/Vitest/Detox — no automated test harness wired up

## Configuration

**Environment:**
- `.env.local` (gitignored via `.env*` rule in `.gitignore`; present in repo root — contains real creds)
- `.env.local.example` committed at repo root; documents required variables
- Loaded by `dotenv` at Expo config evaluation time in `app.config.ts`
- Exposed to runtime through `extra` in `app.config.ts` and read in `src/config/env.ts` with Zod validation
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (naming inherited from web/Next.js repo)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon JWT (service_role never shipped to client)

**Build:**
- `app.config.ts` — dynamic Expo config (runtime-evaluated, loads dotenv, authoritative)
- `app.json` — legacy static config; still contains hard-coded Supabase URL + anon key and the EAS projectId (risk: duplication vs `app.config.ts`; see CONCERNS once generated)
- `eas.json` — EAS Build profiles (`preview`, `production`) and submit profile (`android.track: "internal"`)
- `tsconfig.json` — extends `expo/tsconfig.base`, strict mode, path alias `@/*` → repo root
- `expo-env.d.ts` — generated Expo types (gitignored)

**Expo Config Highlights (`app.config.ts`):**
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

**Development:**
- Node.js compatible with Expo SDK 54 (Node 20 LTS recommended)
- EAS CLI `>= 18.0.0` (`eas.json`)
- Xcode + iOS Simulator (for `npm run ios`) or Android Studio + emulator (`npm run android`)
- Expo Go is NOT guaranteed compatible (New Architecture enabled, custom native plugins — requires development build or EAS Build)
- Windows helper: `abrir-simulador-android.bat`

**Production:**
- iOS: App Store via EAS Submit (production profile auto-increments `buildNumber`); bundleId `com.criahub.mobile`
- Android: Google Play via EAS Submit (production profile = AAB, `autoIncrement: true`, submit track = `internal`); package `com.criahub.mobile`
- Android internal distribution also supported via `preview` profile (APK `buildType: "apk"`, `distribution: "internal"`)
- iOS simulator build via `preview` profile (`ios.simulator: true`)
- EAS project ID: `4069d525-bbce-4f86-9863-a51ccfe4af32` (`app.config.ts` + `app.json`)

---

*Stack analysis: 2026-04-16*
