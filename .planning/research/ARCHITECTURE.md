# Architecture Research — iOS App Store Submission Pipeline

**Domain:** Expo SDK 54 managed workflow — iOS App Store submission integration on top of an existing production Expo/EAS setup
**Researched:** 2026-04-17
**Confidence:** HIGH
**Mode:** Project (brownfield integration; pipeline layered onto shipped app)
**Sources of truth:** Context7 `/expo/expo` (SDK 54 branch) + existing repo audit (`.planning/codebase/`)

---

## System Overview

Submission is not a "feature" — it's a **five-track pipeline** that intersects: (a) the existing codebase, (b) `app.config.ts` (dynamic config), (c) `eas.json` (build + submit profiles), (d) Apple Developer Portal + App Store Connect (ASC), and (e) the `apple/` working directory already seeded in the repo.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER LAPTOP (local)                           │
├────────────────────────────────────────────────────────────────────────────┤
│  app.config.ts  (dynamic, authoritative)                                   │
│  eas.json       (build profile + submit profile)                           │
│  apple/                                                                    │
│   ├── assets/       (source PNGs → copied/referenced by app.config.ts)     │
│   ├── config/       (plist snippets, review-notes plaintext)               │
│   ├── docs/         (ASC metadata source-of-truth .md files)               │
│   └── certificates/ (READMEs only — never commit .p12/.mobileprovision)    │
│  store.config.json  (optional; EAS Metadata source-of-truth for ASC)       │
│  .env.local         (gitignored; DEV/LOCAL only)                           │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                      eas build --platform ios --profile production
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         EAS CLOUD (expo.dev)                               │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────────┐     │
│  │  Build machine   │   │  Remote version  │   │  Credentials vault  │     │
│  │  (macOS)         │◄──┤  source          │   │  (.p12 + profile +  │     │
│  │  – prebuild      │   │  buildNumber ++  │   │   ASC API key)      │     │
│  │  – code-sign     │   └──────────────────┘   └─────────────────────┘     │
│  │  – IPA archive   │                                                      │
│  └────────┬─────────┘                                                      │
│           │                                                                │
│           │  eas submit --platform ios --profile production                │
│           ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  EAS Submit (iOS)                                                    │  │
│  │  – reads ascAppId from eas.json                                      │  │
│  │  – auths via ASC API key (stored in EAS vault)                       │  │
│  │  – uploads IPA to App Store Connect                                  │  │
│  │  – optional: eas metadata push  → syncs store.config.json to ASC     │  │
│  └────────┬─────────────────────────────────────────────────────────────┘  │
└───────────┼────────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 APPLE: App Store Connect + Developer Portal                │
├────────────────────────────────────────────────────────────────────────────┤
│  App Store Connect (appstoreconnect.apple.com)                             │
│   ├── App record (bundleId com.criahub.mobile, ascAppId: numeric)          │
│   ├── TestFlight                                                           │
│   │    ├── Build N (auto-arrives after `eas submit`)                       │
│   │    ├── Internal testers (Apple ID only — no review needed)             │
│   │    └── External testers (requires Beta App Review)                     │
│   ├── App Information (name, subtitle, category, age rating)               │
│   ├── Version 1.0.0 (description, keywords, screenshots, URLs)             │
│   ├── Privacy Nutrition Labels (data collected/linked/tracking)            │
│   └── App Review Information (demo account, review notes, contact)         │
│                                                                            │
│  Apple Developer Portal (developer.apple.com)                              │
│   ├── App ID com.criahub.mobile + Capabilities                             │
│   ├── Distribution Certificate (managed by EAS)                            │
│   └── Provisioning Profile (App Store type, managed by EAS)                │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key invariant:** the only link between the "local repo" world and the "Apple server-side" world is the `ascAppId` field in `eas.json` plus the bundle identifier `com.criahub.mobile`. Everything else is either (a) in the IPA itself or (b) typed into ASC (or pushed via EAS Metadata).

---

## Component Responsibilities

| Component | Who owns it | Where it lives | Current state |
|-----------|-------------|----------------|---------------|
| **Dynamic app config** | Code | `app.config.ts` | ✓ existing — authoritative |
| **Static app config** | Code | `app.json` | ⚠ exists as `{}` (3 bytes) — see Anti-Pattern 1 |
| **Build profiles** | Code | `eas.json` | ✓ existing — `production.ios.autoIncrement: "buildNumber"` set |
| **Submit profile (iOS)** | Code | `eas.json` → `submit.production.ios` | ✗ MISSING — this is the single biggest new piece |
| **Remote version source** | EAS cloud | (managed) | ✓ `cli.appVersionSource: "remote"` already set |
| **iOS credentials** | EAS cloud | (managed via `eas credentials`) | ✗ not yet generated for production |
| **ASC API key** | EAS cloud | (uploaded once via `eas credentials`) | ✗ not yet uploaded |
| **App icon (1024)** | Code | `./assets/images/icon-criahub.png` | ✓ exists — verify 1024×1024, no alpha |
| **Splash** | Code | `./assets/images/splash-icon.png` + `splash` block | ✓ exists |
| **Privacy manifest** | Code | `app.config.ts` → `ios.privacyManifests` | ✗ MISSING — required by Apple since May 2024 |
| **Store metadata** | Markdown + optional JSON | `apple/docs/*.md` (source of truth) + `store.config.json` (optional, EAS Metadata) | ✗ docs being authored; `store.config.json` optional |
| **Screenshots** | Binary | `apple/assets/screenshots/` → uploaded to ASC | ✗ not captured yet |
| **Deep-link handler** | Code | `app/(auth)/_layout.tsx` + `AuthContext` | ⚠ scheme configured; `redirectTo` on resetPasswordForEmail missing |

---

## Recommended Project Structure

```
criahub-mobile/
├── app.config.ts              # MODIFIED — single source of truth
├── app.json                   # DELETE — currently empty; causes confusion
├── eas.json                   # MODIFIED — add submit.production.ios.ascAppId
├── store.config.json          # NEW (optional) — EAS Metadata source
├── assets/
│   └── images/
│       ├── icon-criahub.png           # existing — 1024×1024, used as master
│       ├── splash-icon.png            # existing
│       └── ios-icon-*.png             # NEW (optional) — dark/tinted variants
├── apple/                             # existing scaffolding
│   ├── README.md                      # existing
│   ├── config/
│   │   └── review-notes.md            # NEW — plain text fed into ASC review-notes field
│   ├── assets/
│   │   ├── icon-master-1024.png       # NEW — archival copy
│   │   ├── screenshots/
│   │   │   ├── iphone-6.9/            # NEW — 1290×2796, 3-10 PNGs
│   │   │   ├── iphone-6.7/            # NEW — 1290×2796 (fallback for older required size)
│   │   │   ├── ipad-13/               # NEW — 2064×2752 (iPad 13")
│   │   │   └── ipad-12.9/             # NEW — 2048×2732 (iPad 12.9")
│   │   └── preview-videos/            # NEW (optional)
│   ├── docs/                          # source-of-truth markdown for ASC fields
│   │   ├── APP_STORE_CONNECT_FIELDS.md        # NEW — name, subtitle, description, keywords
│   │   ├── PRIVACY_NUTRITION_LABELS.md        # NEW — data collected mapping
│   │   ├── PRIVACY_POLICY.md                  # NEW — content hosted externally
│   │   ├── SUPPORT_URL_CONTENT.md             # NEW — content hosted externally
│   │   ├── RELEASE_NOTES_v1.0.0.md            # NEW
│   │   ├── REVIEW_NOTES.md                    # NEW — ABCCMM explanation + demo credentials
│   │   └── DEMO_ACCOUNTS.md                   # NEW — credentials for Apple reviewer (GITIGNORED)
│   └── certificates/
│       └── README.md                  # existing — instructs where real certs live (EAS vault)
└── credentials/                       # existing empty dir — keep empty; rely on EAS vault
```

### Structure Rationale

- **`apple/docs/` is the versioned source of truth for ASC metadata.** ASC has no git history; if you lose access or want to re-submit, you need a canonical record. Markdown is diff-friendly, comment-friendly, and can be templated into `store.config.json` later.
- **`store.config.json` (EAS Metadata) is optional but lives at repo root** per Expo convention. It is the *machine-readable twin* of the `.md` files. Start with the `.md` files (human first); graduate to `store.config.json` when submissions become frequent.
- **`apple/assets/screenshots/` is binary and versioned** — commit the final PNGs so the next submission has a known-good baseline. Git LFS is overkill at this volume (10–20 PNGs per size × 4 sizes ≈ 60 MB).
- **`credentials/` stays empty.** `.gitignore` (lines 17–19) already excludes `*.p12`, `*.mobileprovision`, `*.key`. The EAS vault (accessible via `eas credentials`) is the only legitimate store.
- **`apple/config/` holds plaintext snippets** meant to be copy-pasted into ASC text areas (review notes, promotional text). They are NOT consumed by the build — they are human-operator artifacts.

---

## Architectural Patterns

### Pattern 1: "Dynamic Config Wins + Static Config Goes to Zero"

**What:** When both `app.json` and `app.config.ts` exist, Expo reads `app.config.ts` and passes `app.json` content into the `config` parameter via `ConfigContext`. Current repo: `app.json` is `{}`, so it contributes nothing.

**Confirmed via Context7** (`/expo/expo`, `workflow/configuration.mdx`): *"The dynamic config is read if either app.config.ts or app.config.js exist in the project."*

**When to use:** Already using dynamic config (our case).

**Decision for this project:** **DELETE `app.json`** as the first step of the milestone. Rationale:
- It's `{}` (3 bytes) — no content to preserve
- `INTEGRATIONS.md` (codebase audit) warns about dual-source drift risk
- Having both files confuses reviewers and static analyzers
- The `app.config.ts` spread `...config` receives the empty object anyway — removing `app.json` simply means `config` is `{}` instead of `{ expo: {} }`, no runtime effect

**Trade-off:** None. If you later need static config (e.g., for tools that prefer `app.json`), regenerate it from the dynamic output via `npx expo config --type public > app.config-output.json`.

```ts
// app.config.ts — unchanged pattern
import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,   // now receives {} — safe
  name: "CRIAHUB Mobile",
  // ...
});
```

### Pattern 2: "Remote Version Source + autoIncrement buildNumber"

**What:** EAS stores `buildNumber` (iOS) and `versionCode` (Android) in the EAS cloud, not in `app.config.ts`. Each production build increments the remote value automatically.

**Confirmed via Context7** (`/expo/expo`, `build-reference/app-versions.mdx`): *"When the `remote` version property is enabled inside eas.json, the build version values stored in app config are ignored and not updated when the version is incremented remotely. The remote version source values are set on the native project when running a build, which is considered the source of truth for these values."*

**Current state in repo:**
- `eas.json` has `cli.appVersionSource: "remote"` ✓
- `eas.json` has `build.production.ios.autoIncrement: "buildNumber"` ✓
- `app.config.ts` has `ios.buildNumber: "1"` — **will be ignored by EAS in production builds**
- `app.config.ts` has `version: "1.0.0"` — **this is still honored as `CFBundleShortVersionString`**

**How `app.config.ts` → Info.plist values map:**

| `app.config.ts` key | Info.plist key | User-visible in App Store | Who increments it |
|---------------------|----------------|---------------------------|-------------------|
| `version: "1.0.0"` | `CFBundleShortVersionString` | YES (version number on store page) | Manual — bump for each release (1.0.0 → 1.0.1 → 1.1.0) |
| `ios.buildNumber` | `CFBundleVersion` | Only on TestFlight and ASC internal | Automatic (remote) — every `eas build --profile production` increments |

**First submission values:**
- `version: "1.0.0"` — already set, ship as-is
- `ios.buildNumber` — EAS CLI initializes remote value from app config on first build (so `"1"`). Second production build → `"2"`. TestFlight sees `1.0.0 (1)`.

**Critical rule** (Apple): once a `1.0.0 (1)` tuple is uploaded — even to TestFlight and rejected — you can never re-upload that tuple. Must bump to `1.0.0 (2)` OR `1.0.1 (1)`. `autoIncrement: "buildNumber"` handles (1)(2)(3)… automatically.

**Trade-off:** Removing `ios.buildNumber` from `app.config.ts` is safe since remote wins. But keeping it (value ignored) serves as documentation of "last known local value". Leave as-is.

### Pattern 3: "ASC Metadata — Two-Tier Source of Truth"

**What:** App Store Connect has ~40 text fields per locale (description, keywords, screenshots, URLs, review notes, privacy labels). These fields live on Apple's server. They are populated via either (a) manual entry in the ASC web console, or (b) `eas metadata push` which reads `store.config.json`.

**Confirmed via Context7** (`/expo/expo`, `eas/metadata/config.mdx`): *"EAS Metadata currently only supports the Apple App Store. [...] The store config in EAS Metadata contains information that would otherwise be provided manually through app store dashboards."*

**Recommended tier strategy for v1.1:**

1. **Tier 1 (required for v1.1):** Author everything as Markdown in `apple/docs/`. Humans write here first; reviewers read here. This is the project's source of truth.
2. **Tier 2 (optional for v1.1, promote later):** Create `store.config.json` at repo root that mirrors Tier 1. Use `eas metadata pull` first (after first manual submission) to generate a seed config, then diff against Tier 1.
3. **Screenshots always manual upload** for first submission — EAS Metadata does not upload binary screenshots; it only syncs text fields.

**When to graduate to Tier 2:** When you're about to make your second submission and want to diff-review copy changes in a PR instead of clicking around ASC.

**Trade-off:** EAS Metadata still rejects some fields that ASC requires (age rating wizard answers are click-only, as are Privacy Nutrition Labels in the data-collection wizard). So Tier 2 is partial, not total.

### Pattern 4: "Single `ascAppId` Binds EAS to App Store Connect"

**What:** The only piece of config needed in `eas.json` to enable automated iOS submit is `submit.production.ios.ascAppId`. This is the numeric Apple ID (NOT the bundle ID) shown under App Information → General → "Apple ID" in ASC.

**Confirmed via Context7** (`/expo/expo`, `submit/ios.mdx`): *"The `ascAppId` can then be found under the **General Information** section, labeled as **Apple ID**."*

**Concrete diff for `eas.json`:**

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      },
      "ios": {
        "ascAppId": "PLACEHOLDER_FROM_ASC_AFTER_APP_RECORD_CREATED",
        "appleTeamId": "PLACEHOLDER_FROM_DEVELOPER_PORTAL"
      }
    }
  }
}
```

`ascAppId` does not exist until the App Store Connect app record is created (step precondition). Creating the record: ASC web console → Apps → `+` → "New App" → bundle `com.criahub.mobile`. ASC assigns a numeric Apple ID on record creation.

### Pattern 5: "Privacy Manifest via `ios.privacyManifests`"

**What:** Apple requires a `PrivacyInfo.xcprivacy` file in every iOS app since May 2024. In managed Expo, you configure `ios.privacyManifests` in app config — EAS Build generates the file.

**Confirmed via Context7** (`/expo/expo`, `guides/apple-privacy.mdx`): *"You can include an iOS privacy manifest by using the `privacyManifests` field under `expo.ios` in your app config."*

**What this app actually uses (based on `.planning/codebase/INTEGRATIONS.md`):**

- `AsyncStorage` → `UserDefaults` access → reason code `CA92.1` (App access only)
- `expo-file-system` (implicit) → `File timestamp` → reason code `C617.1` (Inside app container) and `DDA9.1` (Display to user on device)
- `expo-notifications` (local only) → `UserDefaults` access → already covered by CA92.1
- No tracking, no advertising IDs, no third-party SDKs

**Concrete add to `app.config.ts` inside `ios`:**

```ts
ios: {
  supportsTablet: true,
  bundleIdentifier: "com.criahub.mobile",
  buildNumber: "1",
  privacyManifests: {
    NSPrivacyTracking: false,
    NSPrivacyCollectedDataTypes: [],   // filled in per Privacy Nutrition Labels work
    NSPrivacyTrackingDomains: [],
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
        NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
        NSPrivacyAccessedAPITypeReasons: ["C617.1"],
      },
    ],
  },
  infoPlist: { /* ... existing ... */ },
},
```

**Trade-off:** SDK libraries (e.g. `@supabase/supabase-js` via its deps, `react-native-reanimated`) may ship their own `PrivacyInfo.xcprivacy` files that Expo auto-merges. The `ios.privacyManifests` key only adds reasons for *your* code. Apple accepts merged manifests.

### Pattern 6: "Icon 1024 → Expo Generates All Sizes"

**What:** In managed workflow, you provide ONE 1024×1024 PNG and EAS Build generates all required iOS sizes (20pt@2x, 29pt@2x, 40pt@2x/3x, 60pt@2x/3x, 76pt@2x iPad, 83.5pt@2x iPad, 1024×1024 marketing) during prebuild.

**Confirmed via Context7** (`/expo/expo`, `develop/user-interface/splash-screen-and-app-icon.mdx`): *"If you have an Expo project created using npx create-expo-app, EAS Build will generate the other sizes for you; in bare React Native projects, you must generate these icons manually."*

**Requirements (HIG-strict, Apple review enforces):**
- Exactly square, 1024×1024 PNG
- No transparency (alpha channel → auto-reject)
- No rounded corners (iOS applies the mask)
- sRGB color profile

**Verification step before build:**
```bash
# Confirm dimensions and alpha
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/images/icon-criahub.png
# Expected: 1024, 1024, hasAlpha: no
```

**Optional SDK 54 upgrade:** `ios.icon` now accepts a `.icon` bundle from Apple's Icon Composer, enabling dark/tinted variants. **Defer to post-v1.1** — single-icon-PNG is App Store compliant and ships today.

### Pattern 7: "Splash via `expo-splash-screen` Plugin — No LaunchScreen.storyboard Needed"

**What:** Expo's managed workflow auto-generates `SplashScreen.storyboard` during prebuild from the `splash` config block. You do not author Xcode storyboards by hand.

**Confirmed via Context7** (`/expo/expo`, `develop/user-interface/splash-screen-and-app-icon.mdx`) and current `app.config.ts:17-21`:

```ts
splash: {
  image: "./assets/images/splash-icon.png",
  resizeMode: "contain",
  backgroundColor: "#0d0d0d",
},
```

**Current state:** ✓ already configured in `app.config.ts`.

**Recommended refinement for v1.1:** Switch from the top-level `splash` block (deprecated in newer SDKs) to the `expo-splash-screen` plugin form for forward compatibility:

```ts
plugins: [
  "expo-router",
  [
    "expo-splash-screen",
    {
      image: "./assets/images/splash-icon.png",
      backgroundColor: "#0d0d0d",
      resizeMode: "contain",
    },
  ],
  // ... existing plugins
],
```

**Trade-off:** Both forms work in SDK 54. Top-level `splash` is simpler; plugin form is more platform-configurable. Either is App Store acceptable. Low priority — leave for a follow-up phase unless you hit a bug.

### Pattern 8: "Screenshots Pipeline — Simulator + Manual Capture (first submission)"

**What:** Apple requires 1 set of screenshots per required device size. For a `supportsTablet: true` app:

- **iPhone 6.9"** (iPhone 15/16 Pro Max): 1290×2796 — **required**
- **iPhone 6.5"/6.7"** (older required size): 1284×2778 — Apple auto-derives from 6.9" since 2023, so skip unless you want different crops
- **iPad 13"** (M4 iPad Pro): 2064×2752 — **required** when `supportsTablet: true`
- **iPad 12.9"** (older): 2048×2732 — Apple auto-derives from 13"

**Tool options evaluated:**

| Tool | Fit for RN + Expo Router | Verdict for v1.1 |
|------|--------------------------|------------------|
| **iOS Simulator + Cmd+S** | Perfect — sim output is already the exact resolution | ✓ **USE THIS** |
| **Fastlane snapshot** | Requires XCUITest harness — none exists in this repo | ✗ Overkill |
| **Shotbot / AppMockUp.com** | Adds device frames/marketing copy on top of screenshots | Optional post-capture polish |
| **Xcode UI Tests** | Same as Fastlane snapshot — requires test harness | ✗ No infra |
| **Real device + Screenshot shortcut** | Works but sizes vary by physical model | Fallback only |

**Recommended flow:**

1. `npx eas build --platform ios --profile preview` → installs on iOS simulator as APK-equivalent (`.tar.gz`)
2. Boot iPhone 15 Pro Max simulator (1290×2796 native)
3. Navigate to hero screens (login, plantel, animal detail, vet dashboard, field hub)
4. `Device → Screenshot` (Cmd+S) → screenshots land on desktop at native resolution
5. Repeat with iPad Pro 13" simulator
6. Move PNGs into `apple/assets/screenshots/{iphone-6.9,ipad-13}/`
7. Upload manually in ASC web (no EAS Metadata support for screenshot binaries)

**For v1.2+ (not v1.1):** Add XCUITest-based `fastlane snapshot` once the app has a test harness.

### Pattern 9: "TestFlight + Production Share the Same Binary"

**What:** Every iOS build submitted via `eas submit` lands in TestFlight first. From TestFlight, you either (a) distribute to internal/external testers, or (b) submit that same build to App Store review. There is no separate "TestFlight build" vs "App Store build" artifact.

**Confirmed via Context7** (`/expo/expo`, `submit/ios.mdx` and `eas/workflows/pre-packaged-jobs.mdx`).

**Implication for env vars:** A TestFlight build **IS** a production build. It connects to production Supabase. There is no "staging" automatically.

**Env var strategy (given current repo has only `.env.local` gitignored):**

Current state from `INTEGRATIONS.md`: `app.config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local` via dotenv at config-evaluation time. EAS Build runs `app.config.ts` on its build machine, which does **NOT** have `.env.local` (gitignored).

**Solutions, ranked:**

1. **EAS environment variables (RECOMMENDED).** Use `eas env:create` per Context7 (`guides/using-convex.mdx` example):
   ```bash
   eas env:create --name NEXT_PUBLIC_SUPABASE_URL \
     --value "https://gwibmimaquoesgpbdojo.supabase.co" \
     --visibility plaintext --environment production
   eas env:create --name NEXT_PUBLIC_SUPABASE_ANON_KEY \
     --value "<anon-jwt>" \
     --visibility sensitive --environment production
   ```
   These are injected into EAS Build at build time and read by dotenv in `app.config.ts` (or fallback to `process.env.NEXT_PUBLIC_*`).

2. **Static values inside `app.config.ts` (NOT RECOMMENDED).** Works but leaks the anon key to git history — same mistake the old `app.json` made (already documented in `INTEGRATIONS.md`).

3. **`eas.json` `env` block.** Can inline public values; do NOT inline sensitive values here (committed to git).

**Verification before first build:**
```bash
eas env:list --environment production
# Must show both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Pattern 10: "Credentials — EAS Cloud Vault, Never `credentials/` Folder"

**What:** iOS signing artifacts (`.p12` distribution cert, `.mobileprovision` profile, App Store Connect API key `.p8`) live in EAS's credentials service. First `eas build --platform ios` with `--profile production` prompts to generate them, OR use `eas credentials` standalone to inspect/upload.

**Confirmed via Context7** (`/expo/expo`, `app-signing/app-credentials.mdx`): *"The 3 primary iOS credentials [...] are: Distribution Certificate, Provisioning Profiles, Push Notification Keys. [...] You can inspect and manage all your credentials with EAS CLI by running eas credentials."*

**Current repo state — VERIFIED:**
- `credentials/` directory exists at repo root, **empty** (✓ correct — `INTEGRATIONS.md` line 135 confirms)
- `.gitignore` lines 17–19 and 31 exclude `*.p12`, `*.mobileprovision`, `*.key`, `*.pem`, `*.p8`, `*.jks`
- `apple/certificates/README.md` correctly documents: "NUNCA commite arquivos `.p12`, `.mobileprovision`, `.cer` ou chaves privadas aqui"

**Action: no changes needed to `credentials/` or `apple/certificates/` folders. They are correctly scoped as documentation-only.**

**Required generation order:**
1. Apple Developer account active + paid ($99/yr) — OUT OF SCOPE for roadmapper (human step)
2. Create App ID `com.criahub.mobile` in developer.apple.com — OUT OF SCOPE (ASC web step)
3. `eas credentials` → choose iOS → "Set up production credentials" → EAS auto-generates cert + profile in Apple portal via API
4. Create App Store Connect API Key (developer account role: Admin or App Manager) → download `.p8` → `eas credentials` → upload once
5. Now `eas build --profile production` works end-to-end

---

## Data Flow

### Build → Submit → Review Flow

```
Developer runs locally:
  npm run build:ios:release
    │
    ▼
  npx eas-cli build --platform ios --profile production
    │
    │ (1) EAS CLI uploads project tarball (excluding node_modules, ios/, android/)
    ▼
EAS Build machine (macOS in EAS cloud):
    │
    │ (2) Runs `npx expo prebuild --platform ios` → generates ios/ folder
    │     – reads app.config.ts (with env vars from EAS env)
    │     – injects ios.privacyManifests into Info.plist
    │     – generates SplashScreen.storyboard
    │     – generates icon set from ./assets/images/icon-criahub.png
    │
    │ (3) Runs `eas/configure_ios_version` step → sets
    │     CFBundleShortVersionString = "1.0.0" (from app.config.ts version)
    │     CFBundleVersion           = <next autoIncrement value> (from EAS remote)
    │
    │ (4) Runs `eas/configure_ios_credentials` step → installs .p12 + profile
    │
    │ (5) Runs `xcodebuild archive` → produces .ipa
    │
    │ (6) Uploads .ipa to EAS CDN + notifies expo.dev dashboard
    ▼
Developer runs:
  npx eas-cli submit --platform ios --profile production
    │
    │ (7) Reads eas.json → submit.production.ios.ascAppId
    │     Reads latest build for ios profile production
    │     Uses ASC API key from EAS vault
    ▼
Apple processing (async, 5–60 min):
    │
    │ (8) ASC ingests IPA → validates → runs Apple processing
    │     – binary validation
    │     – Privacy manifest scan
    │     – ITMS compliance checks
    │
    │ (9) Build appears in TestFlight tab with status "Processing" → "Ready to Test"
    │     – if missing privacy usage descriptions: "Missing Compliance" warning
    │     – if encryption: must answer "Uses Non-Exempt Encryption?" (currently `false` in plist ✓)
    ▼
Human (developer):
    │
    │ (10) In ASC web console → Apps → CRIAHUB Mobile → App Store tab → Prepare version 1.0.0:
    │      – Fill metadata from apple/docs/APP_STORE_CONNECT_FIELDS.md
    │      – Upload screenshots from apple/assets/screenshots/
    │      – Fill Privacy Nutrition Labels from apple/docs/PRIVACY_NUTRITION_LABELS.md
    │      – Fill App Review Info from apple/docs/REVIEW_NOTES.md + DEMO_ACCOUNTS.md
    │      – Select this build
    │      – Submit for Review
    ▼
Apple review (24h–72h typical):
    │
    │ (11) Reviewer opens app on iPad + iPhone, follows review notes
    │      – tests demo accounts
    │      – checks 5.1.1(v) compliance (in-app account deletion) → already shipped APPLE-01 ✓
    │      – checks privacy links reachable
    │      – if reject: receives metadata rejection / guideline rejection → iterate
    ▼
Release:
    │
    │ (12) After approval, choose release strategy:
    │      – Manual → click "Release" on ASC dashboard
    │      – Automatic → live when review completes
    │      – Phased (7-day) → ramps 1/2/5/10/20/50/100% daily
    ▼
Live on App Store ✓
```

### Metadata Push Flow (optional, Tier 2)

```
apple/docs/*.md (human-written)
    │
    │ (human transcribes)
    ▼
store.config.json (machine-readable)
    │
    │ eas metadata push
    ▼
ASC App Information + Version X.Y.Z text fields (overwritten)
    │
    │ eas metadata pull (to recover current state from ASC)
    ▼
store.config.json (regenerated, diff against git)
```

### Deep Link Reset-Password Flow (requires code change)

```
User taps "Esqueci senha" in login screen
    │
    ▼
AuthContext.resetPassword(email)
    │
    │ supabase.auth.resetPasswordForEmail(email, { redirectTo: "criahubmobile://reset-password" })
    ▼
Supabase sends email with recovery link
    │
    │ Email link: https://<project>.supabase.co/auth/v1/verify?...&redirect_to=criahubmobile%3A%2F%2Freset-password
    │ User taps in Gmail/Apple Mail → iOS opens criahubmobile://reset-password?access_token=...
    ▼
Expo Router parses URL → routes to app/(auth)/reset-password.tsx (if exists)
    │
    │ Screen calls supabase.auth.updateUser({ password: newPassword })
    ▼
Session established, router.replace("/(app)/...")
```

**Decision: scheme-only deep link is SUFFICIENT. NO Universal Links / Associated Domains required for v1.1.**

Rationale:
- Supabase's `redirectTo` accepts custom schemes (confirmed working in Expo Router tutorial for magic links).
- Associated Domains would require hosting `.well-known/apple-app-site-association` at `gwibmimaquoesgpbdojo.supabase.co` — which is Supabase-controlled, not ours.
- Universal Links add "open in Safari vs open in app" complexity. Scheme links open the app deterministically.
- **No Apple Developer Portal capability changes needed.**

---

## Scaling Considerations

This is a one-time submission pipeline, not a runtime system. "Scaling" means submission velocity and cross-platform expansion.

| Scale | Pipeline adjustments |
|-------|----------------------|
| **1 submission per month** (v1.1–v1.3) | Manual ASC entry + Markdown source-of-truth. Current approach. |
| **1 submission per week** | Graduate to `store.config.json` + `eas metadata push` for text fields. Screenshots still manual. |
| **Multiple locales** | Expand `store.config.json` to `en-US`, `pt-BR`, etc. Keep Markdown per-locale under `apple/docs/{locale}/`. |
| **Android + iOS parity submits** | Add `submit.production.android.serviceAccountKeyPath` (already partially set via `track: "internal"`). Separate milestone. |
| **CI/CD automation** | Use EAS Workflows (`.eas/workflows/submit-ios.yml` per Context7). Out of scope for v1.1 given "Sem CI" constraint. |

### Bottleneck order

1. **First: manual ASC data entry.** ~40 fields × 1 locale = ~2 hours each first time. Mitigated by `apple/docs/` source being already written (copy-paste).
2. **Second: screenshot churn on every UI change.** Each screenshot invalidates with design updates. Mitigated by deferring animations/details to post-1.0 and shipping with `light+dark` × 2 devices = 4 sets max.
3. **Third: review feedback loop.** Apple rejection → fix → rebuild (bumps buildNumber) → resubmit. Budget 2 rejection cycles for first submission.

---

## Anti-Patterns

### Anti-Pattern 1: "Keep `app.json` as empty `{}` alongside `app.config.ts`"

**What people do:** Leave a stub `app.json` thinking Expo or EAS needs it.
**Why it's wrong:**
- Causes confusion: tooling and contributors don't know which config is authoritative.
- Past history in this repo (`INTEGRATIONS.md` line 138) had `app.json` holding the anon JWT in `extra` — already caused a leak scenario.
- Some IDE plugins (Expo VS Code extension) read `app.json` first and display stale/empty metadata.
**Do this instead:** Delete `app.json`. Expo reads `app.config.ts` only. Verified against Context7: the dynamic config's `ConfigContext.config` parameter is synthesized even when no `app.json` is present.

### Anti-Pattern 2: "Commit `.p12` or `.mobileprovision` to the repo"

**What people do:** Download from Apple Developer Portal, drop into `credentials/` or `apple/certificates/` for "backup".
**Why it's wrong:** Private key material in git history is unrecoverable. `.gitignore` already excludes these extensions, but committing them with `git add -f` bypasses that. Cert revocation is the only fix.
**Do this instead:** `eas credentials` stores everything in EAS's vault. To back up: `eas credentials` → view → export to secure password manager. Never git.

### Anti-Pattern 3: "Hardcode `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `app.config.ts`"

**What people do:** `extra: { NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOi..." }` to make EAS Build work without setting EAS env vars.
**Why it's wrong:** Anon JWT tokens have a lifetime (JWT `exp` claim — typically 10 years for anon, but still). They rotate on Supabase project compromise. git history permanence + eventual rotation = lifelong drift.
**Do this instead:** `eas env:create --name NEXT_PUBLIC_SUPABASE_ANON_KEY --visibility sensitive --environment production`. The value lives in EAS vault, not git.

### Anti-Pattern 4: "Upload screenshots captured from the dev build pointed at local Supabase"

**What people do:** Screenshots taken while connected to localhost / Supabase dev project → show test data (e.g., "Animal Teste 123").
**Why it's wrong:** Apple reviewers flag this as "inconsistent with production". Looks unprofessional.
**Do this instead:** Capture from a preview EAS build with production Supabase credentials and a real-looking demo haras (seed with realistic names). Keep a dedicated "Demo Haras" in Supabase prod — idempotent script to repopulate before each screenshot session.

### Anti-Pattern 5: "Enable Push Notifications capability because the app has `expo-notifications`"

**What people do:** Toggle Push Notifications capability in the Apple Developer Portal because `expo-notifications` is installed.
**Why it's wrong:** This app uses `expo-notifications` strictly for **local scheduled notifications** (confirmed in `INTEGRATIONS.md` lines 149–160 — no `getExpoPushTokenAsync` call anywhere). Enabling Push Notifications capability without an APNs key causes the EAS Build to try to generate a push key, which fails or pollutes credentials.
**Do this instead:** Leave Push Notifications capability DISABLED in Apple Developer Portal. App review does NOT require it for local-only scheduled notifications. If you later add remote push, enable then.

### Anti-Pattern 6: "Rely on the 'splash' top-level block without the expo-splash-screen plugin"

**What people do:** Use only the `splash: { image, backgroundColor, resizeMode }` top-level key (current repo state).
**Why it's wrong:** Works today in SDK 54, but scheduled for removal in SDK 55+. The plugin form is the forward-compatible shape.
**Do this instead:** Add `["expo-splash-screen", { image, backgroundColor, resizeMode }]` to `plugins`. Leave the top-level `splash` in place for now for backwards compat (both work in 54). Low priority for v1.1 since it's not a submission blocker.

### Anti-Pattern 7: "Submit a build with `ITSAppUsesNonExemptEncryption` unset"

**What people do:** Leave `ITSAppUsesNonExemptEncryption` out of Info.plist.
**Why it's wrong:** Apple prompts "Does your app use encryption?" on every TestFlight build; blocks auto-distribution until answered. Slows iteration.
**Do this instead:** Already set correctly in `app.config.ts:27`: `ITSAppUsesNonExemptEncryption: false`. This is accurate — HTTPS/TLS via system APIs is exempt. Verify still `false` when building.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes for v1.1 |
|---------|---------------------|----------------|
| **App Store Connect** (appstoreconnect.apple.com) | ASC API v2 via `.p8` key uploaded to EAS vault | One-time: create API key with "App Manager" role. Scope: limited to this app. |
| **Apple Developer Portal** (developer.apple.com) | Via EAS-managed API during `eas credentials` runs | One-time: active paid account. Bundle ID `com.criahub.mobile` auto-registered on first build. |
| **EAS Build** (expo.dev) | CLI `eas-cli >= 18.0.0` | Already in use. Project ID `4069d525-bbce-4f86-9863-a51ccfe4af32` (`app.config.ts:112`). |
| **EAS Submit** | CLI subcommand of eas-cli | Config in `eas.json` submit profile. |
| **Supabase** (gwibmimaquoesgpbdojo.supabase.co) | URL + anon key | No changes for submission. Env vars move from `.env.local` to EAS env. |

### Internal Boundaries (files modified vs created)

| Boundary | Change type | Specific path | Action |
|----------|-------------|---------------|--------|
| `app.json` | DELETE | `/Users/giuseppedangelis/Dev/criahub-mobile/app.json` | Remove (currently `{}`) |
| `app.config.ts` | MODIFY | `/Users/giuseppedangelis/Dev/criahub-mobile/app.config.ts` | Add `ios.privacyManifests` block; optionally migrate `splash` to plugin form |
| `eas.json` | MODIFY | `/Users/giuseppedangelis/Dev/criahub-mobile/eas.json` | Add `submit.production.ios.ascAppId` and `appleTeamId` |
| `apple/assets/screenshots/` | CREATE | `/Users/giuseppedangelis/Dev/criahub-mobile/apple/assets/screenshots/{iphone-6.9,ipad-13}/` | Populate with captured PNGs |
| `apple/docs/APP_STORE_CONNECT_FIELDS.md` | CREATE | `/Users/giuseppedangelis/Dev/criahub-mobile/apple/docs/APP_STORE_CONNECT_FIELDS.md` | Write copy for ASC |
| `apple/docs/PRIVACY_NUTRITION_LABELS.md` | CREATE | same folder | Map data collection to ASC wizard answers |
| `apple/docs/REVIEW_NOTES.md` | CREATE | same folder | Explain ABCCMM, no IAP, role personas |
| `apple/docs/DEMO_ACCOUNTS.md` | CREATE + GITIGNORE | same folder | Credentials for reviewer. Add `apple/docs/DEMO_ACCOUNTS.md` to `.gitignore` |
| `apple/docs/RELEASE_NOTES_v1.0.0.md` | CREATE | same folder | First "What's New" blurb |
| `apple/docs/PRIVACY_POLICY.md` | CREATE | same folder | Draft policy (must be hosted externally, URL required) |
| `apple/docs/SUPPORT_URL_CONTENT.md` | CREATE | same folder | Support page draft (must be hosted externally) |
| `apple/config/review-notes.md` | CREATE | `/Users/giuseppedangelis/Dev/criahub-mobile/apple/config/review-notes.md` | Plaintext snippet for ASC paste |
| `store.config.json` | CREATE (optional, Tier 2) | `/Users/giuseppedangelis/Dev/criahub-mobile/store.config.json` | Mirrors apple/docs/ — for `eas metadata push` |
| `src/contexts/AuthContext.tsx` | MODIFY (code) | — | Add `redirectTo: "criahubmobile://reset-password"` to `resetPasswordForEmail` call |
| `app/(auth)/reset-password.tsx` | CREATE (code) | — | New screen that handles deep-link token + calls `updateUser` |
| `credentials/` | NO CHANGE | already empty, gitignored | Remains empty |
| `apple/certificates/` | NO CHANGE | already scoped as docs-only | Remains README-only |

---

## Edge Cases & Gotchas

1. **`app.json` has to be deleted BEFORE `eas build` runs.** Otherwise, Expo reads both, merges, and the empty static config silently wins over dynamic keys. Tested: `{}` contributes zero, so effect is nil — but the code audit flagged this as confusion-prone (`INTEGRATIONS.md:138`). Safer to remove.

2. **`autoIncrement: "buildNumber"` vs `autoIncrement: true`.** The current `eas.json` uses the string form `"buildNumber"` — this is iOS-specific and correct. The boolean `true` form increments both iOS `buildNumber` and Android `versionCode`. For iOS-only milestone, string form is fine; when Android ships, change to `true` or add equivalent for Android.

3. **First build initializes the remote version to the local value, THEN increments.** So if `app.config.ts` has `ios.buildNumber: "1"` and EAS has no remote yet, first production build = `buildNumber 2`, not 1. Workaround: manually seed with `eas build:version:set --platform ios --profile production --value 1` before first build if you want `1.0.0 (1)` exactly.

4. **TestFlight internal vs external testing.** Internal (up to 100 users per Apple account) requires zero Apple review. External (up to 10,000) requires **Beta App Review** — a lighter review Apple runs in 24h. Don't confuse Beta App Review with full App Store Review.

5. **`ascAppId` is numeric, not the bundle ID.** Example format: `"1234567890"`. Found at ASC → App Information → Apple ID field (not iTunes Connect ID, not SKU).

6. **Age rating wizard cannot be filled via EAS Metadata.** Must be clicked through in ASC web on first submit. Answers persist across versions.

7. **Privacy Nutrition Labels cannot be fully pushed via EAS Metadata.** The "Data Linked To You" / "Data Used to Track You" wizard is click-only. Document choices in `apple/docs/PRIVACY_NUTRITION_LABELS.md` for re-entry fidelity.

8. **`apple/docs/DEMO_ACCOUNTS.md` contains real credentials.** Must be added to `.gitignore`. Currently `.gitignore` doesn't exclude the `apple/docs/` path. **Add `apple/docs/DEMO_ACCOUNTS.md` to `.gitignore` as part of the milestone.**

9. **Supabase redirect URL allowlist.** In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, add `criahubmobile://*` or specifically `criahubmobile://reset-password`. Without this, the email link lands on a generic Supabase-hosted page. This is a **Supabase console step**, not repo code — flag in roadmap as external config change.

10. **iPhone 6.9" screenshots auto-fill older required sizes** only if you check "Use these screenshots for iPhone 6.7" in ASC upload UI. Miss the checkbox → App Store shows "Missing screenshots" blocker.

---

## Sources

- Context7 `/expo/expo` SDK 54 branch — `workflow/configuration.mdx` (config precedence)
- Context7 `/expo/expo` — `submit/ios.mdx` (EAS Submit iOS, ascAppId location)
- Context7 `/expo/expo` — `build-reference/app-versions.mdx` (remote version source, autoIncrement)
- Context7 `/expo/expo` — `tutorial/eas/manage-app-versions.mdx` (versioning semantics)
- Context7 `/expo/expo` — `guides/apple-privacy.mdx` (Privacy Manifest via `ios.privacyManifests`)
- Context7 `/expo/expo` — `develop/user-interface/splash-screen-and-app-icon.mdx` (1024 icon + splash plugin)
- Context7 `/expo/expo` — `app-signing/app-credentials.mdx` (EAS credentials vault)
- Context7 `/expo/expo` — `app-signing/local-credentials.mdx` (credentials.json — not used here)
- Context7 `/expo/expo` — `eas/metadata/config.mdx` + `eas/metadata/schema.mdx` (store.config.json)
- Context7 `/expo/expo` — `linking/ios-universal-links.mdx` + `linking/overview.mdx` (scheme vs associated domains)
- Context7 `/expo/expo` — `push-notifications/push-notifications-setup.mdx` (confirmed not needed for local-only)
- Context7 `/expo/expo` — `build/eas-json.mdx` (env vars in build profiles)
- Context7 `/expo/expo` — `tutorial/eas/ios-production-build.mdx` (production build + submit flow)
- Context7 `/expo/expo` — `eas/workflows/pre-packaged-jobs.mdx` (TestFlight vs submit)
- Repo audit `.planning/codebase/INTEGRATIONS.md` (current EAS project ID, env var state, `credentials/` folder status)
- Repo audit `.planning/codebase/CONCERNS.md` (deep link scheme configured but no handler — gap identified)
- Current files: `/Users/giuseppedangelis/Dev/criahub-mobile/app.config.ts` (lines 1–117), `eas.json` (lines 1–34), `.gitignore` (lines 1–42)

---

*Architecture research for: iOS App Store submission pipeline (v1.1 CriaHub Mobile)*
*Researched: 2026-04-17*
*Companion: STACK.md (tools), FEATURES.md (ASC fields), PITFALLS.md (review rejections)*
