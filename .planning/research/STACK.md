# Stack Research — iOS App Store Submission (v1.1)

**Domain:** Expo SDK 54 / React Native 0.81 iOS App Store submission
**Researched:** 2026-04-17
**Confidence:** HIGH (Context7 + official Expo docs for EAS Build/Submit, Privacy Manifests, app.config resolution; MEDIUM for Apple-side 2026 review specifics since WebSearch unavailable this session — flagged inline)

> This milestone is **additive**. The app already builds and runs on Android via EAS; most of the needed submission tooling is already in `package.json` / `eas.json`. The research below focuses on **what is missing**, **what must be corrected**, and **exact commands** the executor runs for each stage.

---

## Recommended Stack

### Core Technologies (already present — verify versions, don't re-install)

| Technology | Version (current) | Purpose | Why / Verification |
|------------|-------------------|---------|--------------------|
| `expo` | `~54.0.33` | Managed workflow; owns Info.plist, entitlements, Privacy Manifest generation via config plugins | SDK 54 is the current stable track (confirmed `/expo/expo` Context7 branch `sdk-54`). Supports the `ios.privacyManifests` schema natively (Context7 — iOS Privacy Manifests APIDOC). |
| `react-native` | `0.81.5` | Native runtime | SDK 54 pairs 1:1 with RN 0.81. Do **not** bump independently. |
| `expo-router` | `~6.0.23` | File-routed nav; drives deep-link scheme `criahubmobile://` used by AUTH-01 reset | SDK 54 pin. |
| `@supabase/supabase-js` | `^2.97.0` | Sole backend client | No iOS-submit impact. |
| EAS Build | `eas-cli >= 18.0.0` | Cloud macOS builder → signed `.ipa`/archive | `eas.json#cli.version` already enforces this. Apple archive uploader runs inside EAS workers, so the developer machine does not need Xcode locally. |

### NEW — Mandatory for v1.1 App Store submission

| Technology | Version | Purpose | Why Recommended (vs alternative) |
|------------|---------|---------|----------------------------------|
| **App Store Connect API Key (`.p8`)** | N/A (secret) | Authenticates `eas submit --platform ios` to upload the archive to ASC | **Expo's recommended default** (Context7 — `/app-signing/security.mdx`: *"the ASC API key is the default and recommended authentication method for submitting your apps to the App Store using EAS Submit"*). Avoids the `EXPO_APPLE_APP_SPECIFIC_PASSWORD` path which requires 2FA ritual on every submission. Generated in ASC → Users & Access → Integrations → Team Keys with role **App Manager** (or **Admin**); `.p8` is downloaded exactly once. |
| **Apple Developer Program enrollment** | Active 2026 seat | Required for bundle ID `com.criahub.mobile`, TestFlight and review | MEDIUM confidence on current pricing (training data: US $99/yr individual, Organization requires D-U-N-S). **Organization enrollment recommended** because CriaHub is a commercial multi-tenant SaaS — "Individual" seller name would expose the developer's personal name on the store listing. |
| **EAS Metadata (bundled in `eas-cli`)** | `eas-cli@latest` | `eas metadata:pull` / `eas metadata:push` — store listing as versioned JSON | Context7 — *"a command-line tool for uploading and downloading Apple App Store metadata as JSON. … should be used to improve the iOS submission process."* Replaces clicking through ASC screens for every re-submission. Keeps `store.config.json` in the repo so subtitle/keywords/release-notes live in git. |

### No new npm packages required

The entire runtime (`dependencies` block) is **stack-complete** for submission. Do **not** add new libraries for v1.1 unless a concrete requirement demands it. In particular:

- `expo-tracking-transparency` — **not needed** (app does not track users across apps/websites; no ad SDK).
- `expo-apple-authentication` — **not needed now**; only required if a third-party auth (Google/Facebook) is offered. CriaHub uses email/password, so Apple 4.8 does not trigger.
- `react-native-iap` / `expo-in-app-purchases` — **not needed** (no IAP; app is B2B, billing happens on the web; explain this clearly in ASC Review Notes — see PITFALLS.md).
- `fastlane` — **explicitly avoided**; EAS Submit + EAS Metadata cover the same workflow without the Ruby/bundler overhead. Recommend only if EAS Submit hits a hard limitation (none observed in SDK 54).

### Development / Submission Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `eas-cli` (>=18.0.0) | Build + Submit + Credentials + Metadata | Already pinned in `eas.json`. Invoke as `npx eas-cli <subcommand>` (matches existing `npm run` scripts). |
| `eas credentials --platform ios` | Interactive wizard to register ASC API Key + distribution certificate + provisioning profile | Run once per machine/team; EAS stores credentials remotely (KMS-encrypted per Context7). |
| `eas build --platform ios --profile production` | Produces a signed `.ipa` on EAS macOS workers | Already scripted as `npm run build:ios:release`. |
| `eas submit --platform ios --profile production` | Uploads the latest production build to App Store Connect | **Script missing in `package.json`** — must add (see Installation below). |
| `eas metadata:pull` / `eas metadata:push` | Sync ASC listing fields (name, subtitle, keywords, description, release-notes, screenshots paths, age rating, review notes, privacy URL, support URL) with repo JSON | Runs against the ASC API Key. Generates `store.config.json`. |
| Xcode (on EAS workers) | Toolchain that builds the archive | **Developer does NOT need Xcode installed.** EAS worker image chooses Xcode automatically based on SDK 54 requirements. Xcode 16.x is the SDK 54 baseline per Context7 references to "Xcode 26" only for the unrelated AgeRange entitlement. For a v1.1 submit in April 2026, EAS workers already track the App Store minimum (currently Xcode 16 / iOS 18 SDK). MEDIUM confidence — verify at submission time via `eas build:inspect` or the EAS dashboard's "Image" label on the iOS production build. |
| Asset generators (optional) | 1024×1024 icon, splash, screenshots | See "Asset Generation" below. Expo generates every icon size from the single 1024 input (`ios > icon` docs: *"Expo will generate the other required sizes"*). |

### Asset Generation (for ASC listing)

| Need | Recommended approach | Notes |
|------|---------------------|-------|
| App icon (1024×1024, no alpha) | Reuse `./assets/images/icon-criahub.png` — **must be audited** for alpha channel and sRGB profile | Apple rejects PNGs with alpha or non-sRGB profiles. Run `sips -s format png --deleteColorManagementProperties` if needed. |
| iOS dark / tinted icon variants | Optional (iOS 18 feature). Use `ios.icon = { light, dark, tinted }` object form in `app.config.ts` | Nice-to-have; not a review blocker. |
| Splash screen | Already configured via top-level `splash` in `app.config.ts`. **Recommended refactor:** migrate to `expo-splash-screen` plugin form (Context7 snippet) for light+dark support | Already on `expo-splash-screen@~31.0.13`. |
| Screenshots (6.9" iPhone, 6.7" iPhone, 13" iPad) | Generate by running the `preview` iOS simulator build and capturing via iOS Simulator → File → Save Screen. Store under `./store/screenshots/ios/<size>/…` and reference from `store.config.json` | Apple now accepts only 6.9" (iPhone 16 Pro Max) as the iPhone set; the 6.7" set is still uploaded for backward compatibility slots. MEDIUM confidence — verify current ASC "Media Manager" required sizes at upload time. |
| Screenshot framing (optional) | Skip frames/text overlays for v1.1. Plain simulator screenshots pass review. | Avoids the `Shotbot` / `Screenshot Framer` dependency and license discussion for v1.1. |

---

## Installation

```bash
# No new npm packages — submission tooling is already in devDependencies via eas-cli

# One-time per machine: authenticate with EAS + Apple
npx eas-cli login
npx eas-cli whoami

# One-time per project: register ASC API Key with EAS
# (select production profile, choose "App Store Connect: Manage your API Key"
#  → "Set up your project to use an API Key for EAS Submit")
npx eas-cli credentials --platform ios

# Verify iOS build+submit plumbing end-to-end (first run)
npx eas-cli build --platform ios --profile production --non-interactive
npx eas-cli submit --platform ios --latest

# Metadata sync (optional but recommended)
npx eas-cli metadata:pull        # pulls current ASC listing → store.config.json
# …edit store.config.json in repo…
npx eas-cli metadata:push        # pushes edits back to ASC
```

**Add to `package.json#scripts`:**

```json
"submit:ios": "npx eas-cli submit --platform ios --profile production --latest",
"metadata:pull": "npx eas-cli metadata:pull",
"metadata:push": "npx eas-cli metadata:push"
```

**Update `eas.json#submit.production` (currently only Android):**

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "<assigned after app record is created in ASC>",
      "appleTeamId": "<10-char team id>",
      "bundleIdentifier": "com.criahub.mobile"
    },
    "android": {
      "track": "internal"
    }
  }
}
```

`ascAppId` is issued by ASC the moment the app record is created (App Store Connect → My Apps → + → New App with bundleId `com.criahub.mobile`). `appleTeamId` is visible in the Apple Developer portal membership page.

---

## Required `app.config.ts` / Info.plist Changes for v1.1

### 1. Privacy Manifest — **MANDATORY** since Apple's May 1, 2024 deadline

Apple rejects any submission that lacks `PrivacyInfo.xcprivacy` declarations when the app (or any SDK it bundles) calls a **Required Reason API**. Expo SDK 54 supports declaration via the `ios.privacyManifests` key (Context7 — `iOS Privacy Manifests` APIDOC); the plugin generates `PrivacyInfo.xcprivacy` at prebuild.

**APIs this codebase triggers (mapped from `package.json` + codebase map):**

| Apple API Category | Required Reason code | Triggered by | Justification string |
|---|---|---|---|
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | `@react-native-async-storage/async-storage` stores session, theme, offline queue, notifications map | "Access info from same app, per documentation." |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | `expo-file-system`, `expo-image-picker`, `expo-document-picker` bundled usage | "Inside app or group container." |
| `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | React Native core + Reanimated (`mach_absolute_time`-class calls for animation timing) | "Measure time elapsed between events that occurred within the app." |
| `NSPrivacyAccessedAPICategoryDiskSpace` | `E174.1` | `expo-file-system` when writing/reading large media (animal photos/videos) | "Write or delete files, if necessary to free space, on user's device." |

Add to `app.config.ts` under `ios`:

```ts
ios: {
  // ...existing keys...
  privacyManifests: {
    NSPrivacyTracking: false,
    NSPrivacyTrackingDomains: [],
    NSPrivacyCollectedDataTypes: [
      // Nutrition-label-equivalent; keep in sync with ASC "App Privacy" section
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
      },
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
      },
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotosorVideos",
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
      },
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
      },
    ],
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
        NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
        NSPrivacyAccessedAPITypeReasons: ["C617.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
        NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
        NSPrivacyAccessedAPITypeReasons: ["E174.1"],
      },
    ],
  },
},
```

HIGH confidence on the schema shape (Context7 — verbatim APIDOC). MEDIUM confidence on the completeness of `NSPrivacyCollectedDataTypes` — the roadmap phase that wires this should also regenerate the ASC "App Privacy" questionnaire to match 1:1.

### 2. `app.json` is a conflict risk — delete or neutralize

Current state: `app.json` = `{}` (empty object). `app.config.ts` is the source of truth.

**Context7 quote (Glossary — App config):**
> "An app config file, typically named `app.json`, `app.config.json`, `app.config.js`, or `app.config.ts`, is located in the root project directory."

Expo's config resolver reads **both** when both exist: static values from `app.json` are passed as `ConfigContext.config` into the dynamic function in `app.config.ts`. With `app.json === "{}"`, the spread `...config` in the existing `app.config.ts` contributes nothing, so there is **no active conflict today** — but the empty file is a footgun: a teammate adding e.g. `"name": "..."` to `app.json` will see behavior that depends on spread order.

**Recommendation:** delete `app.json` entirely. SDK 54 accepts `app.config.ts` alone. If some tool insists on `app.json` (older Expo Go diagnostics scripts), keep it empty and comment the top of `app.config.ts` explaining why. HIGH confidence.

### 3. `ios.buildNumber` currently `"1"` — let EAS auto-increment

`eas.json#build.production.ios.autoIncrement = "buildNumber"` already handles this remotely via `appVersionSource: "remote"`. Do **not** hand-edit `buildNumber` in `app.config.ts` between submissions — EAS will clobber it. For `version` (the user-visible `CFBundleShortVersionString`), bump manually per release (`1.0.0` → `1.0.1`, etc.).

### 4. Permission strings — already good, one refinement

Current `NSLocationWhenInUseUsageDescription` string is adequate. CriaHub never requests Always/Background location — **do not add** `NSLocationAlwaysAndWhenInUseUsageDescription` unless a specific feature needs it. Apple rejects "Always" without clear justification. Note that the current `expo-location` plugin config uses `locationAlwaysAndWhenInUsePermission` which only sets the "When In Use" copy; since `expo-location` 19.x requests When-In-Use by default, this is fine. LOW→MEDIUM confidence — verify in Info.plist dumped by `npx expo prebuild --platform ios --no-install` (reversible dry run) that `NSLocationAlwaysAndWhenInUseUsageDescription` is **not** emitted.

### 5. `UIBackgroundModes: ["fetch"]` is already set — defend it in review

Apple Review 2.5.4 rejects background modes that the app does not actually exercise. The app uses `expo-background-fetch` (`~14.0.9`) for the offline sync task (OFFLINE-03). **Review notes in ASC must state:** *"Background Fetch is used to flush the offline field/vet queue when connectivity returns. No location is used in background."* Without this note, review bots flag it. MEDIUM confidence.

---

## Credentials Flow for First-Time iOS Submission

```
┌─────────────────────────┐
│ 1. Apple Developer Pgm  │  → Enroll as Organization (needs CNPJ + D-U-N-S).
│    (developer.apple.com)│    Individual works for sole-prop, but listing name
└──────────────┬──────────┘    will be your personal name.
               │
               ▼
┌─────────────────────────┐
│ 2. App Store Connect    │  → Users & Access → Integrations → Team Keys
│    API Key (.p8)        │    role: "App Manager". Download .p8 ONCE.
└──────────────┬──────────┘    Save Key ID + Issuer ID alongside.
               │
               ▼
┌─────────────────────────┐
│ 3. ASC App Record       │  → My Apps → + → bundleId com.criahub.mobile.
│    (ascAppId)           │    Copy the numeric Apple ID into eas.json.
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐
│ 4. eas credentials      │  → Walks you through uploading .p8 to EAS
│    --platform ios       │    AND generating distribution cert + profile.
└──────────────┬──────────┘    EAS stores everything encrypted.
               │
               ▼
┌─────────────────────────┐
│ 5. eas build --platform │  → ~15 min cloud build on EAS macOS worker.
│    ios --profile prod   │    Output: signed .ipa, ready for ASC upload.
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐
│ 6. eas submit --latest  │  → Uploads .ipa to ASC via the API key.
└──────────────┬──────────┘    Appears in TestFlight within ~10–30 min after
                              Apple's processing completes.
               │
               ▼
┌─────────────────────────┐
│ 7. TestFlight internal  │  → Smoke-test AUTH-01 deep link, APPLE-01 delete,
│    testing              │    UX-05 biometria on a real device.
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐
│ 8. Submit for Review    │  → ASC → Prepare for Submission → Submit.
└─────────────────────────┘    Release: "Manually release this version."
```

All credential wizardry is delegated to `eas credentials`. **No fastlane Matchfile, no manual provisioning profile dance.** HIGH confidence (Context7 explicitly documents every step).

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ASC API Key (`.p8`) via `eas submit` | `EXPO_APPLE_APP_SPECIFIC_PASSWORD` + `appleId` in `eas.json` | Only if org policy forbids creating team-level API keys. The app-specific-password route still works in 2026 but requires manual 2FA each submission and is not recommended by Expo (Context7). |
| `eas submit` | `fastlane deliver` / `fastlane pilot` | Only if the team already has a vetted fastlane pipeline across many apps. Adds Ruby + bundler + Fastfile maintenance for zero marginal benefit on a managed Expo project. |
| `eas metadata:pull/push` (JSON in repo) | Manual ASC edits | OK for v1.1 if the team prefers web UI; re-visit if release cadence grows >1/mo. |
| Plain simulator screenshots | Shotbot / Screenshot Framer | Only if marketing wants branded chrome; adds a paid SaaS dependency. Apple reviewers are fine with raw screenshots. |
| Organization Apple Developer enrollment | Individual enrollment | Use Individual only if CriaHub is operated by a single person with no CNPJ; accept that "Seller Name" will be the personal legal name. |
| Expo SDK 54 (status quo) | SDK 55 / SDK 56 | **Do NOT upgrade for this milestone.** SDK 54 is currently shipping and has a tested 33-test baseline. SDK upgrade is its own milestone. |
| Keep `app.config.ts` as single source | Move config back to `app.json` | Never — dynamic `app.config.ts` is needed to inject `.env.local` creds via `dotenv`. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Bumping `expo` / `react-native` / any `react-native-*` lib mid-milestone | SDK 54 is validated; any upgrade invalidates `tsc --noEmit` as the only guard (no CI, no linter, no wide test coverage) and risks native churn on a build the team is about to ship | Freeze `package-lock.json` for v1.1 duration; schedule SDK upgrade as a separate milestone |
| Editing `app.json` to set anything real | Silent precedence footgun with `app.config.ts` (spread order) | Put **everything** in `app.config.ts`; delete `app.json` |
| `appVersionSource: "local"` | Would require manual `buildNumber` edits on every build | Keep `"remote"` (already set); EAS auto-increments buildNumber |
| `ios.usesAppleSignIn: true` | Triggers Apple 4.8 — requires implementing "Sign in with Apple" fully. App does not use any third-party auth | Leave unset |
| `expo-tracking-transparency` | Implies ATT prompt; Apple will ask why it's there | Only install if a tracking SDK (Firebase Analytics, AppsFlyer, etc.) is added later |
| Adding `NSLocationAlwaysAndWhenInUseUsageDescription` | App doesn't use background location; Apple rejects empty "always" permissions | Keep `NSLocationWhenInUseUsageDescription` only |
| Hardcoding Apple ID / team ID in git-tracked files other than `eas.json` | Team ID is fine in `eas.json` (it's not a secret), but Apple account email and the `.p8` must never be committed | Store `.p8` only in EAS credentials storage; reference via `ascApiKeyPath` only for local machines |
| `--profile preview` for App Store upload | `preview` profile sets `ios.simulator: true` → unsigned simulator build, cannot be submitted | Always use `--profile production` for submit |
| Mass reformat / refactor commits during v1.1 | Would bloat the git diff that Apple reviewers don't see but that `tsc` has to re-validate from scratch; risk regressing v1.0 REQs | Scope this milestone strictly to submission prerequisites; defer MONO-01/02 and PERM-02 as already decided in PROJECT.md |

---

## Stack Patterns by Variant

**If the first review is rejected for Privacy Manifest gaps:**
- Use `npx expo prebuild --platform ios --no-install` to inspect the generated `PrivacyInfo.xcprivacy`.
- Cross-reference against Apple's rejection email (it lists the specific API category missing).
- Add the missing `NSPrivacyAccessedAPIType` entry and re-submit — no new build always required; ASC allows metadata-only re-submits when the binary is unchanged, but Privacy Manifest is baked into the binary, so **yes, rebuild**.

**If Apple flags 4.2 "minimum functionality" for a B2B app:**
- Respond in Resolution Center explaining the multi-tenant SaaS nature and upload a screencast of all four personas (Criador, Veterinário, Peão, Assessor) in the same ticket.
- Provide demo credentials (already planned in PROJECT.md as REQ of this milestone).

**If the build profile needs to diverge for TestFlight vs Store:**
- Do **not** create extra profiles; use the same `production` build and promote the same `.ipa` through TestFlight → Review. EAS `submit` also accepts `--id <build-id>` to submit a specific prior build.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo@~54.0.33` | `react-native@0.81.5`, `react@19.1.0` | Hard pin — do not cross-upgrade piecemeal. |
| `eas-cli` (latest) | `eas.json` schema `>=18.0.0` | Already satisfied. `eas-cli` auto-updates the schema when new keys (e.g. `privacyManifests`) appear; run `npx eas-cli@latest` if you see "unknown key" warnings. |
| `expo-notifications@~0.32.16` | iOS local-only (no remote push tokens registered) | Context7 confirms the "Listen for push token changes" API exists but the app does not call `getExpoPushTokenAsync`. ASC "App Privacy" → do **not** declare "Push Notifications" data collection type. |
| `expo-location@~19.0.8` | "When In Use" only | Plugin's `locationAlwaysAndWhenInUsePermission` key is a misnomer; it populates the When-In-Use string. Verify prebuilt Info.plist to be safe. |
| `expo-image-picker@~17.0.10` | iOS 14+ limited photo access | Codebase already respects `accessPrivileges: 'limited'`. No change required for submission. |
| `expo-background-fetch@~14.0.9` | Requires `UIBackgroundModes: ["fetch"]` | Already set. **Review Notes must explain the use case** or Apple 2.5.4 rejection is likely. |
| `@react-native-async-storage/async-storage@2.2.0` | iOS 13+ | Triggers `NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1`) — declared in the manifest block above. |
| EAS macOS worker Xcode image | SDK 54 defaults to Xcode 16.x | No local Xcode install needed. MEDIUM confidence on exact minor; EAS picks automatically. |

---

## Sources

- `/expo/expo` (Context7, branch `sdk-54`) — SDK 54 platform docs, iOS Privacy Manifest schema, `eas submit --platform ios` wizard.
- `/llmstxt/expo_dev_llms-full_txt` (Context7) — `docs.expo.dev/llms-sdk.txt` mirror: `iOS Privacy Manifests` APIDOC (verbatim schema), `App config` glossary, `eas.json` submit profile example, `EAS Metadata` reference, `Support for Android and iOS versions` caveat about Xcode minimums.
- Official Expo docs via Context7 — `app-signing/security.mdx` explicitly names **ASC API Key as the default and recommended** auth method for `eas submit --platform ios`.
- Official Expo docs via Context7 — `submit/ios.mdx` for the `eas credentials --platform ios` wizard flow and `ascApiKeyPath` / `ascApiKeyIssuerId` / `ascApiKeyId` keys in `eas.json`.
- Expo iOS icon docs (`ios > icon`) — confirms 1024×1024 input and auto-generation of all sizes; confirms `{ light, dark, tinted }` object form for iOS 18.
- Existing repo files verified this session: `app.config.ts`, `app.json` (= `{}`), `eas.json`, `package.json`, `CLAUDE.md`, `.planning/PROJECT.md`.
- **NOT verified via live web / Apple Developer News** — WebSearch was unavailable in this session. The following points are MEDIUM confidence and should be spot-checked at submission time:
  - Current Apple Developer Program fee structure (training-data value: US $99/yr individual; Organization requires D-U-N-S).
  - Exact required ASC screenshot sizes in April 2026 (6.9"/6.7" iPhone + 13" iPad per last known Apple guidance).
  - Current minimum Xcode version Apple accepts for store submissions (EAS workers track this automatically; verify in the EAS build image label).
  - Whether any newly-added Required Reason API categories (post-2024) apply to any transitive dep. Re-run the Apple "Describing use of required reason API" checklist at PR time.

---

*Stack research for: Expo SDK 54 iOS App Store first-time submission*
*Researched: 2026-04-17*
