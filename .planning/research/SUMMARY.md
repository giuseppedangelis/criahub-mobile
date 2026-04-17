# Project Research Summary — v1.1 iOS App Store Submission

**Project:** CriaHub Mobile (Expo SDK 54 / RN 0.81 / React 19) — B2B haras management app
**Domain:** First-time iOS App Store submission (Brazil, pt-BR, no IAP, no third-party auth)
**Milestone:** v1.1 "Submissão iOS App Store — Apple Launch" (branch `apple`)
**Researched:** 2026-04-17
**Confidence:** HIGH overall (Context7 coverage of Expo SDK 54 + App Store Review Guidelines verbatim; MEDIUM on empirical 2026 review patterns)

## Executive Summary

CriaHub Mobile v1.0 is functionally shipped (30/33 REQs closed, APPLE-01 deletion + AUTH-01 deep link + UX-05 biometrics already live). v1.1 is **not a feature milestone** — it is a **submission pipeline** that sits on top of the existing binary. The work splits cleanly into five tracks that converge at a single `eas submit --platform ios`:

- **(a) In-binary hardening** — Privacy Manifest, ErrorBoundary, iOS 15.1 deployment floor, console gating
- **(b) ASC metadata** — description, keywords, screenshots, Nutrition Labels, Age Rating, Review Notes
- **(c) Legal/web assets** — Privacy Policy URL + Support URL hosted on `criahub.com.br`
- **(d) Demo data** — seeded `apple-review-haras` + three role-specific accounts
- **(e) Credentials + build + upload** — ASC API Key, `ascAppId` in `eas.json`, EAS production build, TestFlight validation, Submit for Review

Recommended structure: **six sequential phases** (reconciling the 5/8/6/16 variants the four researcher files suggested independently) with Phase 3 running partially in parallel with Phases 1-2.

**Top risks:**
1. **Three-way privacy consistency** — `ios.privacyManifests` (binary) === ASC Nutrition Labels === Privacy Policy URL. Any divergence triggers 5.1.2 rejection.
2. **Crash-on-launch** from missing ErrorBoundary on flaky reviewer networks.
3. **Demo haras returns empty data** because RLS scopes every query by `haras_id`.
4. **Xcode 26 / iOS 26 SDK floor on 2026-04-28** (~11 days from research date). First v1.1 build should run before the floor or pin `"image": "latest"`.
5. **Build-number tuple burn** — `(version, buildNumber)` is irreversibly consumed once uploaded to ASC. `cli.appVersionSource: "remote"` already mitigates.

## Key Findings

### Recommended Stack

See [STACK.md](./STACK.md). The entire runtime is stack-complete; no new npm packages are required. Only additive tooling for v1.1 is operational.

**Do NOT install:** `expo-tracking-transparency`, `expo-apple-authentication` (4.8 exempt), `react-native-iap` (no IAP), `fastlane` (EAS Submit covers it).

**Core submission tooling (new but external):**
- **App Store Connect API Key (`.p8`)** — Expo's recommended auth for `eas submit`. Generated at ASC → Users & Access → Integrations → Team Keys (role App Manager). Uploaded to EAS vault via `eas credentials`.
- **Apple Developer Program enrollment (Organization)** — required so "Seller Name" shows CNPJ entity. Requires D-U-N-S.
- **EAS Metadata** — optional for v1.1; Markdown in `apple/docs/` is the Tier 1 source of truth.
- **`expo-build-properties`** — the ONE new npm plugin that's non-negotiable, to pin `ios.deploymentTarget: "15.1"`.

**Mandatory `app.config.ts` additions:**
- `ios.privacyManifests` block declaring four Required Reason APIs: `CA92.1` (UserDefaults via AsyncStorage), `C617.1` (FileTimestamp), `35F9.1` (SystemBootTime), `E174.1` (DiskSpace) + `NSPrivacyCollectedDataTypes` mirroring ASC answers.
- `expo-build-properties` plugin with `ios: { deploymentTarget: "15.1" }`.
- Delete `app.json` (currently `{}` — 3 bytes, confusion-prone footgun).

### Expected Deliverables (Submission Pipeline)

See [FEATURES.md](./FEATURES.md). "Features" here means App Store Connect fields. 9 blocks (A–I).

**Must-have (table stakes):**
- **ASC app record** with bundle `com.criahub.mobile`, pt-BR primary, Business (primary) + Productivity (secondary), SKU `CRIAHUB-IOS-V1`
- **Privacy Policy URL + Support URL** — live, 200 OK, hosted on `criahub.com.br`. LGPD-complete
- **Privacy Nutrition Labels** — 7 data types: Email, Name, User ID, Photos/Videos, Audio (if retained), Other User Content, Precise Location — all linked, none tracked, all "App Functionality"
- **Privacy Manifest in binary** matching ASC Nutrition Labels exactly
- **Age Rating** — expected 4+ (UGC=Yes scoped to tenant, Medical=Infrequent/Mild)
- **Screenshots** — iPhone 6.9" (1320×2868) + iPad 13" (2064×2752), 5–7 per size, from seeded production build
- **App Icon 1024×1024** — verify no alpha, sRGB
- **Demo accounts** — 3 accounts bound to seeded `apple-review-haras` with ≥12 animals, 3 gestations, 5 tasks, 2 field reports, 1 condomínio
- **Review Notes (pt-BR + EN)** — pre-empt 4.8 exemption, 5.1.1(v), 1.2 UGC isolation, 5.2 ABCCMM, 2.5.4 background fetch
- **Export Compliance** — `ITSAppUsesNonExemptEncryption: false` (already set)
- **EAS Submit plumbing** — `submit.production.ios.ascAppId` + `appleTeamId` in `eas.json`
- **Manual release** selected for first submission

**Should-have:**
- TestFlight External Beta before App Store submit (lighter 24–48h review)
- App Preview video (15–30s, 6.9" iPhone)
- Promotional Text (editable without re-review)
- English (US) Review Notes
- Trader Status (EU DSA)

**Defer to v1.2+:** Full en-US localized listing, additional screenshot sizes, Custom Product Pages, In-App Events, remote push, Sign in with Apple, private `animal-photos` bucket, MONO-01/02, EAS Workflows/CI

### Architecture Approach

See [ARCHITECTURE.md](./ARCHITECTURE.md). Submission is a **five-track pipeline**, not a runtime system. Link between local repo and Apple's servers is `ascAppId` in `eas.json` + bundle identifier `com.criahub.mobile`.

**Major components:**
1. **`app.config.ts` (modified)** — authoritative; add `ios.privacyManifests` + `expo-build-properties` plugin
2. **`app.json` (deleted)** — currently `{}`, removing eliminates dual-source drift risk
3. **`eas.json` (modified)** — add `submit.production.ios.ascAppId` + `appleTeamId`
4. **EAS cloud** — credentials vault + build + submit; NEVER commit to `credentials/` or `apple/certificates/`
5. **`apple/` working directory** — `apple/docs/*.md` is Tier 1 source of truth; `apple/docs/DEMO_ACCOUNTS.md` must be in `.gitignore`
6. **App Store Connect (external)** — app record creation issues numeric `ascAppId`; screenshots always manual upload
7. **Supabase (external config)** — Auth → URL Configuration must allowlist `criahubmobile://reset-password`; demo haras seeded via SQL script

**Key architectural decisions:**
- Single-tier metadata: Markdown in `apple/docs/` first; graduate to `store.config.json` Tier 2 for v1.2+
- Custom-scheme deep link sufficient — no Associated Domains/Universal Links
- EAS env vars (`eas env:create`) hold Supabase URL + anon key
- Screenshots from iOS Simulator `preview` build (native resolution)

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full 20-item taxonomy. Top 5:

1. **Missing Privacy Manifest** — `app.config.ts` has zero `ios.privacyManifests`. Apple auto-rejects since May 1, 2024. AsyncStorage alone triggers `CA92.1`. Phase 1 fix; verify via `plutil -p Payload/*.app/PrivacyInfo.xcprivacy`.
2. **No React ErrorBoundary → Crash-on-Launch (2.1)** — `grep` returns zero matches. 20+ `any`-typed mappers = unhandled nulls = white screen on reviewer flaky Wi-Fi. Root-level `ErrorBoundary` in `app/_layout.tsx` + 15s timeout + guaranteed `setIsLoading(false)` in finally.
3. **Three-way privacy consistency divergence (5.1.2)** — binary === console === policy. Line-by-line diff audit in Phase 3 before Submit.
4. **Demo haras returns empty data** — every query has `.eq("haras_id", harasId)`. Empty haras = empty Plantel = 2.1 rejection. Seed `apple-review-haras` with ≥12 animals, 3 gestations, 5 tasks, 2 field reports, 1 condomínio; all 3 roles bound to same haras.
5. **Xcode 26 / iOS 26 SDK floor on 2026-04-28** — ~11 days from research date. Run first build BEFORE 2026-04-28 OR pin `"image": "latest"`.

### Watch Out For (mandatory Review Notes content)

- **4.8 exemption** — "First-party email/password only, backed by our own account system (Supabase is our managed backend, not a third-party identity provider). No federated logins. SiwA not required per 'company's own account system' exception." (User decision D-v1.1-02: accept 4.8 misinterpretation risk, defend in Review Notes.)
- **5.1.1(v) deletion path** — "Conta tab → Excluir conta → double confirmation → edge function deletes Supabase rows." Verify ≤ 2 taps, red/danger button.
- **1.2 UGC isolation** — "B2B multi-tenant. Each haras isolated via RLS. UGC visible ONLY to invited team. No public feed, no cross-haras search."
- **5.2 ABCCMM attribution** — "Breeders import their own official records from spreadsheets they export from ABCCMM. CriaHub is NOT affiliated with ABCCMM, does NOT resell data. `abccmm_rowid` marks immutable official fields." NO ABCCMM logo in icon/screenshots/listing.
- **2.5.4 UIBackgroundModes: ["fetch"]** — "Background Fetch flushes offline field/vet queue on connectivity return. No background location. No remote push registration."
- **Permission scope** — Rewrite `NSLocationWhenInUseUsageDescription` to cite specific screen. **Audit microphone:** if `expo-image-picker` audio video never exercised, REMOVE `NSMicrophoneUsageDescription` (D-v1.1-03).
- **iPad screenshots mandatory** — D-v1.1-01: kept `ios.supportsTablet: true`; app validated on real iPad before submit.
- **`app.json` footgun** — delete entirely in Phase 1.
- **Build-number tuple burn** — keep `cli.appVersionSource: "remote"` + `autoIncrement: "buildNumber"`; NEVER hand-edit `ios.buildNumber`.

## Implications for Roadmap

**Six sequential phases** with partial parallelism between Phases 1–3.

### Phase 7 — Config Audit & Hardening (binary-level)

**Delivers:** `ios.privacyManifests` block; `expo-build-properties` with `deploymentTarget: "15.1"`; `app.json` deleted; usage descriptions rewritten; microphone audit + removal if unused; `ITSAppUsesNonExemptEncryption: false` verified; `eas.json` gets `submit.production.ios.ascAppId` placeholder + `appleTeamId`.
**Addresses FEATURES:** Block E, Block F
**Avoids PITFALLS:** #1, #8, #13, #15, #16

### Phase 8 — Runtime Hardening (NEW block not in v1.0)

**Delivers:** Root-level `ErrorBoundary` in `app/_layout.tsx`; 15s timeout on auth bootstrap with `setIsLoading(false)` in finally; console gating (9+ occurrences wrapped in `__DEV__` or removed); notification permission soft opt-in; IPv6-only NAT64 smoke test.
**Avoids PITFALLS:** #2, #17, #18, #19

### Phase 9 — Metadata, Legal Assets & Review Notes (parallel-safe)

**Delivers:** `APP_STORE_CONNECT_FIELDS.md` (✅ already drafted), `PRIVACY_NUTRITION_LABELS.md`, `PRIVACY_POLICY.md` (LGPD-complete draft), `SUPPORT_URL_CONTENT.md`, `RELEASE_NOTES_v1.0.0.md`, `REVIEW_NOTES.md` (pt-BR + EN covering 5 Watch Out For items), `DEMO_ACCOUNTS.md` (gitignored); Privacy Policy URL hosted live at `criahub.com.br/privacidade`; Support URL hosted live; Supabase Dashboard allowlist `criahubmobile://reset-password`; **three-way consistency audit** (binary === ASC === Policy).
**Addresses FEATURES:** Blocks B, C, E, G
**Avoids PITFALLS:** #4, #5, #6, #7, #9, #10, #11, #12, #20

### Phase 10 — Demo Data Seeding

**Delivers:** Supabase migration/script creating `apple-review-haras`; seed ≥12 animals (6 ABCCMM + 6 avulso), 3 gestations, 5 tasks, 2 field reports, 1 condomínio, 2 vet appointments; 3 user accounts bound via `haras_members`; idempotent reset script; TestFlight smoke test confirms each role shows data.
**Addresses FEATURES:** Block G
**Avoids PITFALLS:** #3

### Phase 11 — Assets, Build & Upload

**Delivers:** ASC app record created → `ascAppId` patched into `eas.json`; ASC API Key (`.p8`) uploaded to EAS vault; `eas credentials` generates distribution cert + profile; `eas env:create --environment production` for Supabase URL (plaintext) + anon key (sensitive); **first production build BEFORE 2026-04-28** (Xcode 26 floor) OR `"image": "latest"`; icon verification (`sips -g hasAlpha`); screenshots (iPhone 6.9" 1320×2868 + iPad 13" 2064×2752, 5–7 per device); optional App Preview video; `eas submit --platform ios --profile production --latest`; TestFlight internal test on real iPhone AND iPad (AUTH-01 deep link, APPLE-01 deletion ≤ 10s ≤ 2 taps, UX-05 biometric, 4 personas); TestFlight External Beta (optional).

Package.json scripts: `submit:ios`, `metadata:pull`, `metadata:push`.

**Addresses FEATURES:** Blocks D, I
**Avoids PITFALLS:** #14, #20; re-verifies #1-13

### Phase 12 — Submit for Review

**Delivers:** Final metadata sync in ASC (pt-BR + optional EN); screenshots uploaded; build selected; App Review Information filled; Age Rating wizard; App Privacy wizard matching `PRIVACY_NUTRITION_LABELS.md`; **Manual Release** selected; Submit for Review; Resolution Center monitoring ≤ 4h response SLA; rejection → map to PITFALLS recovery table.
**Avoids PITFALLS:** checkpoint gate

### Phase Ordering Rationale

- Phases 7 and 9 overlap because text content is in a different file set from `app.config.ts`. However, Phase 9's Nutrition Labels decisions must lock before Phase 7 finalizes `NSPrivacyCollectedDataTypes`.
- Phase 8 is intentionally between Phase 7 and Phase 11 because ErrorBoundary + console gating touch `app/_layout.tsx`, `AuthContext.tsx`, and 9+ service files — different ownership than config changes.
- Phase 10 MUST precede Phase 11 (screenshots from empty haras = 2.3.3 rejection).
- Xcode 26 SDK floor on 2026-04-28 pushes Phase 11's first production build to the first week of execution.
- `autoIncrement: "buildNumber"` is already configured — no new code, just discipline.

### Research Flags

**Needs research during planning:**
- **Phase 8** — Expo Router v6 ErrorBoundary: class-component vs `export function ErrorBoundary({ error, retry })` shape depends on app architecture.
- **Phase 9** — LGPD Privacy Policy has legal weight. If no lawyer sign-off exists for `criahub.com.br/privacidade`, this phase needs legal research or retained counsel. 1–2 week lead time.
- **Phase 10** — Check `docs/mobile-integration/AUDIT_AND_SEED.sql` before writing new seed scripts.

**Standard patterns (skip research):**
- **Phase 7** — Privacy Manifest + `expo-build-properties` + `app.json` deletion are verbatim Context7 patterns.
- **Phase 11** — EAS Build + Submit + TestFlight extensively documented.
- **Phase 12** — ASC Submit is click-through.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Context7 `/expo/expo` branch `sdk-54` covers every needed tool verbatim |
| Features | HIGH | developer.apple.com pages verified. MEDIUM on subjective recommendations |
| Architecture | HIGH | Context7 covers every integration point. Internal repo state verified |
| Pitfalls | HIGH | Apple guideline text + Expo SDK 54 config verified. MEDIUM on empirical 2024-2026 rankings |

**Overall:** HIGH

### Gaps to Address

- **Xcode 26 / iOS 26 SDK transition (2026-04-28)** — EAS worker image tracking is "automatic" but not explicitly tested during transition. Mitigation: Phase 11 first build runs BEFORE 2026-04-28 OR pins `"image": "latest"`. Verify via `eas build:inspect`.
- **Privacy Policy hosting lead time** — `criahub.com.br/privacidade` may or may not exist. Pre-Phase-9 confirmation needed.
- **Microphone permission audit** — `expo-image-picker` may enable audio; audit before removing `NSMicrophoneUsageDescription`.
- **ABCCMM trademark risk** — if registered and Apple asks for authorization letter (5.2), recovery is HIGH cost. Pre-empt via `REVIEW_NOTES.md` + zero logo usage.
- **Apple Developer Organization enrollment** — D-U-N-S + CNPJ + Apple approval is 1–2 week lead time. Pre-Phase-7 confirmation needed.
- **Supabase Auth URL Configuration** — adding `criahubmobile://reset-password` to allowlist is a Dashboard click. Must be done before TestFlight validates AUTH-01.
- **`cli.appVersionSource: "remote"` first-build behavior** — if reviewer wants `1.0.0 (1)` exactly, seed manually with `eas build:version:set --platform ios --profile production --value 1` before first build.

## Sources

### Primary (HIGH confidence)

- **Context7 `/expo/expo` (branch `sdk-54`)** — full docs coverage
- **Context7 `/llmstxt/expo_dev_llms-full_txt`** — Privacy Manifests APIDOC, EAS Metadata reference
- **Apple App Store Review Guidelines** — 4.8, 5.1.1(v), 5.1.2, 2.1, 2.3.3/7/8/10, 1.2, 2.5.4, 5.2
- **Apple Screenshot Specifications** — iPhone 6.9" 1320×2868 + iPad 13" 2064×2752
- **Apple Privacy Manifest documentation** — `CA92.1`, `C617.1`, `35F9.1`, `E174.1`
- **Apple Upcoming Requirements** — Xcode 26 / iOS 26 SDK floor on 2026-04-28
- **Repo files verified** — `app.config.ts`, `app.json`, `eas.json`, `package.json`, `.gitignore`, `CLAUDE.md`, `.planning/PROJECT.md`, `apple/docs/APP_STORE_CONNECT_FIELDS.md`, `.planning/codebase/*.md`

### Secondary (MEDIUM confidence)

- Empirical 2024-2026 rejection-frequency rankings
- Current Apple Developer Program fee structure
- Exact April 2026 ASC Media Manager required sizes
- EAS worker image current Xcode minor
- Subjective recommendations: Business+Productivity category, 5-7 screenshots, External Beta pre-flight

## User Decisions Locked

- **D-v1.1-01** — Manter `ios.supportsTablet: true`. Entregar screenshots iPad 13" (2064×2752) + 12.9" (2048×2732). Validar app em iPad real antes de submit.
- **D-v1.1-02** — Sem Sign in with Apple nesta submissão. Aceitar risco Guideline 4.8. Defender em Review Notes: Supabase = "company's own account system" (exception).
- **D-v1.1-03** — Auditar `NSMicrophoneUsageDescription`; remover se sem uso real. Manter `UIBackgroundModes: ["fetch"]` (usado por OFFLINE-03) com justificativa em Review Notes.
- **D-v1.1-04** — Validação do ícone via `sips -g hasAlpha` já documentada em `APP_STORE_CONNECT_FIELDS.md`; executor resolve em Phase 11.

---

*Synthesis of STACK.md + FEATURES.md + ARCHITECTURE.md + PITFALLS.md + APP_STORE_CONNECT_FIELDS.md*
