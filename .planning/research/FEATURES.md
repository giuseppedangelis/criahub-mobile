# Feature Research — App Store Submission Pipeline

**Domain:** iOS App Store submission + review workflow (first submission, B2B horse-breeding management app)
**Researched:** 2026-04-17
**Confidence:** HIGH (sourced from developer.apple.com, App Store Review Guidelines, Expo EAS docs, upcoming-requirements page)

**Scope note:** The "features" in this document are *submission-pipeline deliverables* (fields, assets, decisions, declarations) — not app product features. The orchestrator asked for a feature landscape covering everything that goes into App Store Connect, TestFlight, App Review, and EAS Submit for a first-time iOS submission in 2026. The app itself is already built (v1.0 shipped); everything below is about getting that binary past Apple review.

---

## Feature Landscape

### Table Stakes (Mandatory — Missing = App Rejected or Cannot Submit)

Every item in this block is a hard gate. Without it, either App Store Connect will refuse to accept the submission, or App Review will reject it (App Review Guidelines reference in "Notes").

#### Block A — App Store Connect App Record

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bundle ID registered in Developer Portal** | App Store Connect cannot create an app record without a bundle ID provisioned in the portal. | LOW | Already set: `com.criahub.mobile`. Must match `app.config.ts` exactly. Create in Certificates, Identifiers & Profiles → Identifiers → App IDs → `+`. |
| **App record in App Store Connect** | Container for every field below. | LOW | My Apps → `+` → New App. Requires: platform (iOS), name (30 chars), primary language, bundle ID, SKU (internal, never shown), user access (Full/Limited). |
| **Primary Language** | Drives default localization and which metadata is reviewed first. | LOW | pt-BR (Portuguese, Brazil). Cannot be changed later without filing a support request. |
| **Primary Category + Subcategory** | Required field; drives App Store discovery and charts placement (Guideline 2.3.5). | LOW-MEDIUM | **Recommend: Business (primary) + Productivity (secondary).** Rationale below in "Category Decision" section. |
| **Pricing & Availability — Price Tier** | Required to publish. | LOW | Free (tier 0). App is B2B; paid features live behind Supabase plan, not IAP. |
| **Pricing & Availability — Countries** | Determines where the app appears. | LOW | Brazil at minimum; can expand to "All Countries" if desired (no incremental cost, but triggers need to consider localization compliance per region). |
| **Content Rights declaration** | Guideline 5.2 requires confirming you have the rights to all content in the app. | LOW | Two questions: "Does your app contain, display, or access third-party content?" and "Do you have all necessary rights to that content?" — both answered in App Information → Content Rights. |

#### Block B — App Information (Static, Not Per-Version)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **App Name** (30 chars) | Appears on the App Store and on device home screen. | LOW | "CriaHub" (7 chars) — safe. Cannot include pricing, "free", emoji, or trademarked terms you don't own (Guideline 2.3.7). |
| **Subtitle** (30 chars) | Appears under name on App Store listing. Localizable per language. | LOW-MEDIUM | Needs to communicate value in ≤30 chars in pt-BR. Suggest: "Gestão do seu haras" (19) or "Haras na palma da mão" (21). |
| **Category — Primary + Secondary** | See Block A. | LOW | Already noted. |
| **Bundle ID** | Immutable after first submission. | — | Already set. |
| **Content Rights** | See Block A. | LOW | Horse names + ABCCMM registries are user-provided data → not Apple-relevant third-party content. Answer "does not contain third-party content" unless you ship curated public ABCCMM data. Document reasoning in Review Notes (see Block G). |
| **Age Rating questionnaire** | Required; gates submission (Guideline 2.3.6). January 31, 2026 deadline passed for re-answering — new system mandatory. | MEDIUM | See "Age Rating Decision" section below. Expected outcome: **4+**. |

#### Block C — Version Metadata (Per Release)

All fields below are required for the first version (v1.0.0). "What's New" is skipped on first submit.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Version string** | Required. | LOW | `1.0.0` (matches `app.config.ts` → `expo.version`). |
| **Build** (CFBundleVersion) | Required; must be higher than any previous uploaded build. | LOW | EAS sets this via `autoIncrement: true` in `eas.json` `production` profile. |
| **Description** (≤4000 chars) | The main sales copy on the store listing. Localizable. | HIGH | Write in pt-BR. Describe 4 roles, plantel, reprodução, campo offline, integração ABCCMM. No screenshots of text, no pricing, no other-platform references (Guideline 2.3.10). |
| **Keywords** (≤100 chars, comma-separated) | Not shown to users; used for search ranking. | MEDIUM | pt-BR: "haras,cavalo,plantel,equino,criacao,reproducao,veterinario,abccmm,manga-larga,mangalarga". Avoid competitor names, trademarks, generic filler (Guideline 2.3.7). Each comma-separated term is indexed; do not repeat words from App Name/Subtitle (those already index). |
| **Promotional Text** (≤170 chars) | Shown at top of description; can update WITHOUT requiring a new review. | LOW | Good for seasonal messages, feature highlights. Example: "Agora com lembretes de devolução de cotas e registro offline no campo." |
| **Support URL** | Required. Must be live and reachable. | LOW-MEDIUM | e.g. `https://criahub.com.br/suporte`. Cannot be a `mailto:`. Must return HTTP 200. |
| **Marketing URL** (optional) | Landing page. | LOW | Can be same as Support URL or a dedicated page. |
| **Privacy Policy URL** | **Required for all apps** (Guideline 5.1.1). Must be live, must describe every data practice declared in Nutrition Labels. | MEDIUM | e.g. `https://criahub.com.br/privacidade`. Must cover: data collected (email, name, photos of animals, GPS, device IDs), third-party sharing (Supabase), retention/deletion (LGPD + Apple 5.1.1(v) exclusion), how to withdraw consent. |
| **Copyright** | Required. Format: "YYYY Entity Name". | LOW | e.g. "2026 CriaHub" or legal entity name. |
| **Screenshots** | Required. See Block D. | HIGH | — |
| **App Preview videos** (optional) | 15-30s per device size, up to 3 per locale. | MEDIUM | Optional but strong differentiator — see Differentiators. |
| **What's New** (≤4000 chars) | Not required for v1.0.0. | — | Skip. Required from v1.0.1 onward. |

#### Block D — Visual Assets

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **App Icon 1024×1024** | Required in the binary (via Expo asset pipeline), NOT uploaded separately in App Store Connect. | LOW-MEDIUM | PNG, sRGB, **no alpha channel**, **no transparency**, **flat/square** (Apple auto-applies rounded corners), no drop shadows or borders. Expo uses `ios.icon` from `app.config.ts` → defaults to `./assets/icon.png`. Verify dimensions + no alpha before EAS Build. |
| **Screenshots — iPhone 6.9"** | **REQUIRED** (or fall back to 6.5" if 6.9" not provided). Drives all other iPhone sizes via scaling. | HIGH | **1320×2868** portrait (iPhone 16 Pro Max, 15 Pro Max, etc.). 1-10 screenshots. PNG or JPG. No device frames. No marketing text that misleads. |
| **Screenshots — iPhone 6.5"** | Required ONLY if 6.9" not provided. If you supply 6.9", Apple auto-downscales. | MEDIUM | **1284×2778** portrait. **Recommendation: skip this size; supply only 6.9".** |
| **Screenshots — iPad 13"** | **REQUIRED** because `app.config.ts` sets `ios.supportsTablet: true`. | HIGH | **2064×2752** portrait. 1-10 screenshots. If tablet support is dropped, this requirement vanishes. |
| **Screenshots — iPad 12.9" / 11" / smaller** | Optional (scaled from 13"). | — | Skip. |
| **Screenshot count per device size** | Min 1, max 10. | LOW | Industry standard: 5-7 well-designed screenshots outperforms 10 mediocre. |

**Screenshot content rules (Guideline 2.3.3, 2.3.8):**
- Must show the app in use — NOT a splash or login screen.
- Can include text overlays and touch indicators.
- Must adhere to 4+ rating even if app is rated higher.
- Cannot reference Android, Google Play, or other platforms (Guideline 2.3.10).
- Cannot include pricing or "free" claims.
- Must use consistent sizes across all locales.

#### Block E — Privacy (Guideline 5.1)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Privacy Nutrition Labels** | **Required** for every app. Submitted in App Store Connect → App Privacy section. | HIGH | For each data type collected, declare: Purpose (App Functionality, Analytics, Product Personalization, Developer's Advertising, Third-Party Advertising, Other), whether it's Linked to User, whether Used to Track User. See "Nutrition Label Mapping" section below for this app's specific declarations. |
| **Privacy Policy URL** | See Block C. | MEDIUM | Cross-linked requirement: the policy must match the Nutrition Labels exactly. Inconsistency is a common rejection cause. |
| **Privacy Manifest** (`PrivacyInfo.xcprivacy`) | **Required** since May 1, 2024 for Required Reason APIs. Expo configures via `ios.privacyManifests` in `app.config.ts`. | MEDIUM | Expo SDK 54 auto-bundles privacy manifests for most official packages. You must declare Required Reasons for: `UserDefaults` (CA92.1 — app functionality via AsyncStorage), `FileTimestamp`, `SystemBootTime`, `DiskSpace` if any third-party lib uses them. See "Privacy Manifest" section below. |
| **App Tracking Transparency prompt** | Required ONLY if you track users across apps (IDFA/third-party advertising SDKs). | LOW | This app does NOT track → set `NSPrivacyTracking: false`. No ATT prompt needed. |
| **Purpose strings** in `Info.plist` | Required for each permission (camera, microphone, photo library, location, etc). Must clearly explain why you need access (Guideline 5.1.1). | LOW | Already set in `app.config.ts` → `ios.infoPlist` per project constraints. Verify each string is user-facing Portuguese and mentions the feature benefit. |

#### Block F — Compliance Questionnaires

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Export Compliance — Encryption** | Required on every submission unless exempted via Info.plist. | LOW | `ITSAppUsesNonExemptEncryption: false` is already set → bypasses the per-submission encryption questionnaire. Valid because the app only uses standard HTTPS/TLS via Supabase (exempt under IEEE/IETF/ISO standards). **No CCATS needed.** Verify this key is preserved through EAS Build. |
| **Content Rights** | See Block A. | LOW | — |
| **Advertising Identifier (IDFA) usage** | Required question. | LOW | App does NOT use IDFA → answer "No". |
| **Trader Status (EU Digital Services Act)** | **Required** since Feb 17, 2025 for EU availability. Without it, app is removed from EU store. | LOW-MEDIUM | Submit trader info in App Store Connect → Business → Trader Status: legal name, address, phone, email. If you only distribute in Brazil this is NOT required, but recommended to future-proof EU expansion. |

#### Block G — App Review Information (Per Version)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Sign-In Information (Demo Account)** | Required when the app requires login (Guideline 2.1). Reviewer cannot test without it. | MEDIUM | Create 3 demo accounts in Supabase + seed realistic demo haras data: `criador-demo@criahub.com.br`, `vet-demo@criahub.com.br`, `peao-demo@criahub.com.br` — all with same strong password. Include each in the Demo Account field (App Store Connect only lets you enter ONE username/password, so use the criador account + note the others in Review Notes). |
| **Contact Info** | Required. Reviewer uses this if clarification needed. | LOW | First name, last name, email, phone. Must be responsive (<24h). |
| **Notes** | Free-form text for the reviewer. Huge impact on first-submission success. | MEDIUM | See "Review Notes Template" section below. Must explain: (a) app is B2B for horse breeders, (b) 4 roles + how to access each demo, (c) ABCCMM is Brazil's official studbook (third-party reference data, user-entered, not Apple's concern re: 2.3.9), (d) account deletion flow works via Account → Apagar minha conta (Apple 5.1.1(v) compliance), (e) no IAP, (f) no Sign in with Apple needed (only email/password, not third-party social login — Guideline 4.8 exemption). |
| **Attachments** | Optional. Max 5 files, 5MB each. | LOW-MEDIUM | Attach: (a) short PDF explaining 4 roles with screenshots, (b) ABCCMM reference context if reviewer asks about horse registry numbers. |

#### Block H — Release Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Release option** | Required choice before submission. | LOW | **Recommend: Manual Release** for first submission. You approve → you control the go-live moment. Avoids surprise release if review completes at 3am. |

#### Block I — Binary Upload

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **EAS Build — production iOS** | The binary. | MEDIUM | `eas build --platform ios --profile production`. Produces `.ipa` signed with App Store distribution cert. Already configured in `eas.json`. |
| **EAS Submit** | Uploads to App Store Connect; build appears in TestFlight tab after ~15-30 min processing. | LOW | `eas submit --platform ios --profile production`. Requires Apple ID + App Store Connect API Key (recommended over password+2FA). |
| **TestFlight internal tester group** | Required first step — test the build BEFORE sending to Apple review. | LOW | Up to 100 internal testers (anyone with role Admin/App Manager/Developer/Marketing in App Store Connect). No Apple review needed. Immediate availability. |

---

### Differentiators (Strongly Recommended — Improve First-Submit Success Rate)

These are not mandatory but materially reduce rejection risk or improve store conversion.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **TestFlight External Beta (before App Store submit)** | The external build is reviewed by Apple as a lighter first pass. Catches gross issues (crashes, missing privacy manifests, metadata problems) BEFORE they waste an App Store review slot. Historical external beta review SLA: 24-48h, same queue but more lenient. | MEDIUM | First external build MUST be approved by App Review before inviting 10k testers. Subsequent builds pass automated review usually in <1h. Use the same metadata (demo accounts, test notes) you'll use for production. |
| **App Preview video (6.9" iPhone)** | Autoplays on store listing with sound muted. Lifts conversion 15-25% in industry benchmarks. Shows 4 roles in action. | HIGH | 15-30 seconds, `.mov` or `.mp4`, H.264, portrait for iPhone. No narration of trademarked names. Recorded from actual device (screen capture via QuickTime on Mac). No hands, no over-the-shoulder. Max 3 videos per locale. |
| **Localized English (US) metadata** | Expands reach even if primary market is Brazil. Costs ~2h of translation work for name/subtitle/description/keywords. | MEDIUM | Not required. If you stay pt-BR only, English-speaking reviewers still see pt-BR metadata — Apple reviewers are multi-lingual, but providing English REVIEW NOTES in English is a good-practice boost. Keep store listing pt-BR; add English Notes field text. |
| **In-App Events** | Short promotional "event cards" on store listing (product launches, seasonal campaigns). | MEDIUM | Not for first submission; useful post-launch. |
| **Custom Product Pages** | Up to 35 variants of product page for different A/B tests or audiences. | MEDIUM | Not for first submission. |
| **Family Sharing** | Allows families to share app (only relevant for paid apps + IAP). | LOW | N/A — free app, no IAP. |
| **Game Center / Messages / SiriKit** | Shortcut/intent integrations. | MEDIUM-HIGH | N/A for current product surface. |
| **Well-designed screenshot narrative** | Screenshots tell a story: plantel → reprodução → campo offline → relatórios. Each with Portuguese caption overlays. | HIGH | Tools: Figma template or Shotbot. Avoid stock photos. Use actual (demo) data. Consistent style across all 5-7 shots. |
| **App Store Connect API Key (vs Apple ID password)** | Avoids 2FA friction during CI submits. Scoped, revocable. | LOW | Generate in App Store Connect → Users and Access → Keys → App Store Connect API. EAS Submit supports it natively. |

---

### Anti-Features (Do NOT Do These — Frequent Rejection or Wasted Work)

| Feature | Why Tempting | Why Problematic | Alternative |
|---------|--------------|-----------------|-------------|
| **Sign in with Apple** | Reading Guideline 4.8 literally suggests you need it if you have ANY login. | **Not required here.** 4.8 only triggers when the app offers third-party social login (Google/Facebook/Twitter/LinkedIn/Amazon/WeChat). CriaHub uses only Supabase email/password → this is a "company's own account system" → explicit 4.8 exception. Adding SIWA would require significant work (new auth flow, account merging, new RLS considerations). | Do nothing. Document in Review Notes: "App uses only first-party email/password authentication via Supabase. No third-party social login is offered; Guideline 4.8 not applicable." |
| **Declaring IAP when you don't have any** | Reviewers ask "how do you monetize?" | Declaring a non-existent IAP category triggers additional review scrutiny and IAP configuration gates. | App is free with external billing (web). Check "Contains In-App Purchases: No". In Review Notes: "Monetization occurs via web subscription on criahub.com.br and is out of scope for the iOS app — the mobile app is a companion for already-onboarded breeders. No IAP." |
| **Submitting screenshots with device frames / status bars** | Looks "more polished" | Frames with wrong carrier/time/battery or unofficial frames get rejected under 2.3.3. | Use raw screenshots at the exact required pixel dimensions. Optional: add text overlays ABOVE or BELOW the device frame area, not INSIDE it. |
| **Uploading an icon with transparency / alpha / rounded corners baked in** | Seems safer to match the store visual. | Rejection under asset specifications. Apple applies rounded mask automatically. | Export icon as flat PNG, full square, 1024×1024, sRGB, NO alpha channel. Verify with `sips -g hasAlpha icon.png` (must return "no"). |
| **Padding keywords with competitor names or trademarks** | Higher search rank. | Violation 2.3.7. Apple silently removes keywords or rejects. | Use domain terms ("haras", "plantel", "equino", "reprodução equina", "abccmm", "mangalarga"). The App Name + Subtitle are ALSO indexed, so avoid duplicating those words in Keywords. |
| **Mentioning Android / Google Play / web in description** | "We have a web version too!" | 2.3.10 violation (platform focus). | Only reference the iOS experience. Web can be mentioned as "our complementary web dashboard" in Marketing URL / website, not in the App Store description. |
| **Using real-person data or horse names of identifiable third parties in screenshots** | Realism. | 2.3.9 violation (Rights). | Use fictional haras, fictional horse names (or clearly-demo names like "Égua Demo 01"), fictional owner names in demo accounts. |
| **Submitting without running the app on a real iPhone AND iPad first** | You have CI/TestFlight. | Rejection for iPad-specific bugs is the #1 first-submit rejection when `supportsTablet: true`. | **Validate every role on iPhone AND iPad before submit.** If iPad is a headache to support, flip `ios.supportsTablet: false` → iPad requirement disappears + no 13" screenshots needed. |
| **Putting the Privacy Policy URL as a Google Doc or Notion page** | Fast to set up. | Apple requires a stable, public, no-login URL. Google Docs often return non-200 for headless checks. | Host on `criahub.com.br/privacidade` as static HTML. Match Privacy Nutrition Labels exactly. |
| **Answering "Frequent/Intense" in the age rating questionnaire "just to be safe"** | Conservative-looking. | Higher age rating blocks the app from lower age-bracket users unnecessarily and triggers additional scrutiny. | Answer honestly. This app has NO violence/sexual/profanity/gambling/UGC moderation needs → expected rating is **4+**. |
| **Expediting review on first submission** | Excitement to launch. | Expedited review is for genuine emergencies (critical bug, PR event). Misuse burns trust with Apple and future expedites get denied. | Submit 5-7 business days before any launch milestone. First submissions take longer (2-7 days) than subsequent versions. |
| **Building with Xcode 15 or older** | Works on your machine. | As of April 24, 2025 apps MUST be built with Xcode 16 + iOS 18 SDK minimum. As of **April 28, 2026** the requirement jumps to Xcode 26 + iOS 26 SDK. | EAS Build runs on latest macOS + Xcode by default; ensure `eas.json` does not pin an old image. Add `"image": "latest"` to the `production` ios build profile if needed. |
| **Missing Required Reason API declarations for AsyncStorage / file timestamps** | Expo "just works". | Apple auto-rejects submissions since May 1, 2024. Expo packages bundle their own `PrivacyInfo.xcprivacy` but app-level consolidation is often needed. Apple sends an email with a list of missing reasons after upload. | Add `ios.privacyManifests.NSPrivacyAccessedAPITypes` in `app.config.ts` with CA92.1 for UserDefaults, and C617.1 / 0A2A.1 as needed. Confirm by checking `node_modules/*/ios/PrivacyInfo.xcprivacy` for every Expo package used. |

---

## Category Decision

**Primary: Business** (matches: "apps that assist with running a business or provide a means to collaborate, edit, or share content"). A haras is a business; CriaHub manages its operations (plantel inventory, personnel, reproductive calendar, financials). The Business category accepts CRM, ERP, POS, collaboration — all direct analogues.

**Secondary: Productivity** (matches: "apps that make a specific process or task more organized or efficient"). The daily routine / agenda / task-delegation flows fit Productivity.

**Rejected alternatives:**
- **Lifestyle** — too consumer-y; reserved for real-estate/crafts/hobbies. Would underperform in ranking for our intended user (breeders searching "haras"/"plantel").
- **Utilities** — too generic; CriaHub is a workflow tool, not a calculator/unit-conversion utility.
- **Medical** — tempting because of the veterinary module, but Medical is for patient-facing or clinician-decision tools. We track livestock, not human health. Misclassification would trigger Guideline 1.4.1 (medical-claims scrutiny).
- **Agriculture/Livestock** — Apple does not have these categories.

---

## Age Rating Decision

**Target rating: 4+** (all content suitable for all ages).

Reasoning through the 2026 age rating questionnaire (updated system, new ratings live on iOS 26+):

| Category | Answer | Justification |
|----------|--------|---------------|
| Cartoon or Fantasy Violence | None | No violence of any kind |
| Realistic Violence | None | — |
| Prolonged Graphic or Sadistic Realistic Violence | None | — |
| Profanity or Crude Humor | None | — |
| Mature/Suggestive Themes | None | — |
| Horror/Fear Themes | None | — |
| Medical/Treatment Information | **None** | Veterinary module tracks livestock health, not human medical advice. If asked: "contains veterinary information for breeders managing horse health, which is not medical/treatment information for human users." |
| Alcohol, Tobacco, or Drug Use or References | None | — |
| Simulated Gambling | None | — |
| Sexual Content and Nudity / Graphic Sexual Content and Nudity | None | Reproductive records (breeding dates, mare/stallion pairings) are textual data, not sexual content. This has never triggered an issue for agricultural/livestock apps historically. |
| Contests | None | — |
| User-Generated Content | **None** | The app allows photos + text input but only for the user's own haras data, not public/social sharing. This is "user content" but NOT "user-generated content that other users consume." No moderation/reporting tooling required (Guideline 1.2). |
| Unrestricted Web Access | **None** | App does not embed a generic browser. Any `Linking.openURL` calls go to whitelisted domains (Supabase, support URL). |

**If the questionnaire asks about "infrequent/mild" for any reproductive-tracking field**, answer "None" — breeding record-keeping in a livestock context is not sexual content under Apple's definition. Document this stance in Review Notes preemptively.

---

## Nutrition Label Mapping

For each data type the app handles, declare in App Store Connect → App Privacy:

| Data Type | Collected? | Linked to User? | Used to Track? | Purposes |
|-----------|------------|-----------------|----------------|----------|
| **Contact Info → Email Address** | Yes | Yes | No | App Functionality (login, password reset) |
| **Contact Info → Name** | Yes | Yes | No | App Functionality (user profile) |
| **Contact Info → Phone Number** | Only if users optionally provide | Yes | No | App Functionality |
| **User Content → Photos or Videos** | Yes (animal photos, media in `animal-photos` bucket) | Yes | No | App Functionality |
| **User Content → Customer Support** | Yes (if users email support — declared conservatively) | Yes | No | App Functionality |
| **User Content → Other User Content** | Yes (animal records, ABCCMM data entered by user, reproduction logs, financial notes) | Yes | No | App Functionality |
| **Location → Precise Location** | Yes (field staff GPS in `expo-location` for issue reports) | Yes | No | App Functionality |
| **Identifiers → User ID** | Yes (Supabase `auth.users.id`) | Yes | No | App Functionality |
| **Identifiers → Device ID** | **No** | — | — | — |
| **Diagnostics → Crash Data** | No (app does not run Crashlytics/Sentry as of v1.0) | — | — | — |
| **Diagnostics → Performance Data** | No | — | — | — |
| **Usage Data** | No | — | — | — |
| **Health, Financial, Sensitive Info, Contacts, Browsing, Search, Purchases** | **No** | — | — | — |

**Tracking declaration:** `NSPrivacyTracking: false`. The app does not link any data to third-party data for advertising, nor share with data brokers.

**Critical:** Every declaration above MUST match the Privacy Policy content on `criahub.com.br/privacidade` word-for-word (not exact copy, but every data type declared here must be mentioned there, and vice versa). Mismatch = rejection.

---

## Privacy Manifest Mapping

Add to `app.config.ts` → `expo.ios.privacyManifests`:

```json
{
  "NSPrivacyTracking": false,
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyAccessedAPITypes": [
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
      "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
      "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
      "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace",
      "NSPrivacyAccessedAPITypeReasons": ["E174.1"]
    }
  ],
  "NSPrivacyCollectedDataTypes": []
}
```

**Reason code meanings:**
- `CA92.1` — UserDefaults: "Access info from same app, per documentation" → covers AsyncStorage.
- `C617.1` — FileTimestamp: "Display to user" → covers offline queue timestamps shown in UI.
- `35F9.1` — SystemBootTime: "Measure time on-device user has been in the app" → covers analytics/timers if any package uses it.
- `E174.1` — DiskSpace: "Write or delete file on behalf of user" → covers photo cache by expo-image-picker.

Verify by scanning `node_modules/*/ios/PrivacyInfo.xcprivacy` for every Expo package after install. Apple will email a list of missing reasons within 24h of binary upload if anything is missed — first submission usually triggers 1-2 rounds of this.

---

## Review Notes Template (pt-BR + English mix)

Paste this into App Review Information → Notes (English preferred for reviewer clarity):

```
Hello App Review Team,

CriaHub is a B2B application for horse breeders managing a "haras" (stud farm) in Brazil. It is a companion app to our existing web platform (criahub.com.br). The app serves four user roles; demo accounts are provided below.

=== DEMO ACCOUNTS ===
All demo accounts use password: [STRONG_PASSWORD]

1. Breeder / Owner (main role)
   Email: criador-demo@criahub.com.br
   Flow: Sign in → see dashboard → browse Plantel (horse inventory) → open a horse's full record → check Reproduction module → open Agenda.

2. Veterinarian
   Email: vet-demo@criahub.com.br
   Flow: Sign in → see veterinary dashboard → open Routine → access any horse's medical chart → record a reproductive exam.

3. Field Staff (peão)
   Email: peao-demo@criahub.com.br
   Flow: Sign in → open Campo hub → report a birth or issue with GPS + photo. Note: The app supports an offline queue; in normal Wi-Fi reviews this is transparent.

=== KEY POINTS FOR REVIEW ===

1. Authentication: First-party email + password only (Supabase). No third-party social login is offered — Guideline 4.8 is NOT applicable, so Sign in with Apple is not required.

2. Account Deletion (Guideline 5.1.1(v)): To test, sign in as any demo account → Account tab → "Apagar minha conta" → confirm twice → account and all associated data are deleted via a server-side edge function within 24h.

3. Monetization: No in-app purchases. Breeders subscribe to CriaHub through our web platform prior to onboarding; the iOS app is a companion tool for already-subscribed users.

4. Third-party content (Guideline 5.2): The app displays horse registry numbers from ABCCMM (the official Brazilian Mangalarga-Marchador studbook — https://www.abccmm.org.br). This data is entered by the user (the breeder themselves), not by us. Breeders own their own registry data. No Apple-scope third-party content concerns apply.

5. Offline mode: Field Staff role uses a local queue to operate in rural areas with poor connectivity. This is normal app functionality, not a background service.

6. Location permission: Field Staff role uses GPS to geotag birth/issue reports. Purpose string is shown on first prompt. Location is not tracked continuously.

7. Camera + Photo Library: Used for animal photos (plantel records) and user avatar.

8. Push notifications: We use LOCAL notifications only (no remote push), for reminders about end-dates on shared ownership (cotas) and routine tasks.

=== SUPPORT ===
For any questions during review, contact: [REVIEW_CONTACT_EMAIL] / [REVIEW_CONTACT_PHONE] (UTC-3, replies within 4 business hours).

Thank you!
```

---

## Feature Dependencies

```
[Apple Developer Program Membership ($99/yr)]
    └──requires──> [Bundle ID in Developer Portal]
                       └──requires──> [App record in App Store Connect]
                                          ├──requires──> [Primary Language + Category selection]
                                          ├──requires──> [Age Rating Questionnaire answered]
                                          └──requires──> [Content Rights + Privacy Policy URL (live, 200 OK)]

[Privacy Policy URL (live, public)]
    └──requires──> [Privacy Nutrition Labels declared in App Store Connect]
                       └──requires──> [Privacy Manifest in binary (ios.privacyManifests)]

[EAS Build production iOS binary]
    ├──requires──> [App Store distribution cert + provisioning profile (EAS auto-manages)]
    ├──requires──> [Xcode 16+ SDK (enforced by EAS Build runners until April 28, 2026 → Xcode 26+)]
    ├──requires──> [ITSAppUsesNonExemptEncryption: false set in Info.plist]
    └──requires──> [ios.privacyManifests configured in app.config.ts]

[EAS Submit]
    ├──requires──> [App Store Connect API Key OR Apple ID + 2FA]
    ├──requires──> [Binary uploaded successfully from EAS Build]
    └──produces──> [Build appears in TestFlight tab after ~15-30 min processing]

[TestFlight Internal Testing]
    └──unblocks──> [On-device validation of APPLE-01, AUTH-01, UX-05 on real iPhone + iPad]
                       └──unblocks──> [TestFlight External Beta (Apple reviews first external build, ~24-48h)]
                                          └──unblocks──> [App Store Submit for Review]

[App Store Submit for Review]
    ├──requires──> [All Block A-H features above checked-in]
    ├──requires──> [Screenshots uploaded for every required size (6.9" iPhone + 13" iPad)]
    ├──requires──> [App Review Information filled (demo account, contact, notes)]
    └──produces──> [Review outcome: Approved | Rejected | Metadata Rejected | In Review]

[Screenshots (13" iPad required)]
    └──triggered-by──> [ios.supportsTablet: true in app.config.ts]

    (If tablet support is DROPPED → 13" iPad screenshots + iPad-on-device QA both vanish.)

[Sign in with Apple]
    └──conflicts──> [Guideline 4.8 exemption for first-party-auth-only apps]
    (Do NOT add — triggers unneeded engineering + account-merge complexity.)
```

### Key Dependency Notes

- **Privacy Policy URL must exist FIRST** — you cannot save the App Store Connect listing without a live URL, and the Privacy Nutrition Labels + Policy must be self-consistent.
- **`ios.supportsTablet: true` cascades into iPad testing + 13" iPad screenshots + iPad-specific rejection risk.** If dropping iPad support is acceptable for v1.1, it simplifies the submission significantly.
- **External TestFlight beta acts as a pre-flight for App Store review.** First external build review is real Apple review (just lighter on metadata). Common pattern: burn the "easy rejections" (privacy manifest, crash on launch, permission string typos) in the external beta flow BEFORE spending an App Store review slot.
- **EAS Submit does not submit for Apple Review** — it only uploads the binary and makes it available in TestFlight. The "Submit for Review" click in App Store Connect is a separate, manual action. This is a feature, not a bug; it lets you swap metadata, screenshots, and notes without re-building.
- **Sign in with Apple is NOT a dependency** for this app. Document the exemption explicitly in Review Notes; do not add SIWA.

---

## MVP Definition

### Launch With (v1.1 First Submit)

Minimum viable submission — everything that is hard-blocking. Missing any of these = cannot submit or auto-rejection.

- [ ] **App record created** in App Store Connect with pt-BR primary, Business/Productivity categories
- [ ] **App Icon 1024×1024** — flat PNG, no alpha, sRGB, in binary via `ios.icon`
- [ ] **Screenshots — 5-7 per size** — iPhone 6.9" (1320×2868) AND iPad 13" (2064×2752) — pt-BR overlays, demo data, no device frames, no Android references
- [ ] **App Name + Subtitle + Description + Keywords + Promo Text** — all in pt-BR, within char limits
- [ ] **Support URL + Privacy Policy URL** — both live, 200 OK, no login required
- [ ] **Privacy Nutrition Labels** — completed per "Nutrition Label Mapping" above, matching Privacy Policy
- [ ] **Privacy Manifest** (`ios.privacyManifests`) — in `app.config.ts`, UserDefaults/FileTimestamp/SystemBootTime/DiskSpace reasons
- [ ] **Age Rating** — questionnaire answered honestly → 4+ expected
- [ ] **Export Compliance** — `ITSAppUsesNonExemptEncryption: false` verified in built binary
- [ ] **Content Rights** — declared (no third-party content)
- [ ] **Copyright** — "2026 [Legal Entity]"
- [ ] **3 Demo Accounts** — criador, vet, peão, seeded with realistic demo haras data in Supabase
- [ ] **Review Notes** — English, following template above, covering 4.8 exemption + 5.1.1(v) + no-IAP + ABCCMM context
- [ ] **Contact Info** — responsive email + phone
- [ ] **Release option** — Manual Release selected
- [ ] **Production binary** — EAS Build production iOS, autoIncrement build number, uploaded via EAS Submit
- [ ] **TestFlight internal test** — APPLE-01 (delete account) + AUTH-01 (deep link reset) + UX-05 (biometric) validated on real iPhone AND iPad
- [ ] **TestFlight external beta** — at least one external build reviewed and approved by Apple BEFORE clicking "Submit for Review" on the App Store

### Add Before First Submit If Time Permits (v1.1)

- [ ] **App Preview video** (iPhone 6.9" 15-30s) — conversion lift
- [ ] **English (US) localized Review Notes** — helps reviewer not fluent in Portuguese
- [ ] **App Store Connect API Key** (replaces Apple ID+2FA in EAS Submit) — lower friction for future submits
- [ ] **Trader Status** completed (future-proofs EU availability)

### Defer to v1.2+

- [ ] **Full en-US localized listing** (name/subtitle/description/keywords in English) — only if expanding beyond Brazil
- [ ] **Additional screenshot sizes** (6.5", smaller iPads) — not needed; scaling covers
- [ ] **Custom Product Pages** — post-launch A/B testing tool
- [ ] **In-App Events** — post-launch campaigns
- [ ] **Remote push notifications** — requires APNs certificate rotation and UX work
- [ ] **Sign in with Apple** — ONLY if you add third-party social login (Guideline 4.8 trigger)
- [ ] **Game Center / SiriKit / Shortcuts** — N/A for this product surface
- [ ] **Phased Release** — consider for v1.1.x updates after the go-live; not for first submit

---

## Feature Prioritization Matrix

| Feature | User/Reviewer Value | Implementation Cost | Priority |
|---------|---------------------|---------------------|----------|
| App record + categories + bundle ID | HIGH (blocker) | LOW | **P1** |
| Privacy Policy URL (live) | HIGH (blocker) | MEDIUM | **P1** |
| Privacy Nutrition Labels | HIGH (blocker) | MEDIUM | **P1** |
| Privacy Manifest in binary | HIGH (blocker) | LOW-MEDIUM | **P1** |
| Screenshots 6.9" iPhone | HIGH (blocker) | HIGH | **P1** |
| Screenshots 13" iPad (while supportsTablet:true) | HIGH (blocker) | HIGH | **P1** |
| Description + Keywords pt-BR | HIGH | MEDIUM | **P1** |
| Age Rating questionnaire | HIGH (blocker) | LOW | **P1** |
| Demo accounts + seed data | HIGH | MEDIUM | **P1** |
| Review Notes (covering 4.8, 5.1.1(v), IAP-absence) | HIGH | LOW | **P1** |
| TestFlight internal test on real iPhone + iPad | HIGH | MEDIUM | **P1** |
| TestFlight external beta (Apple pre-review) | HIGH | MEDIUM | **P1** |
| Export Compliance false verified | HIGH (blocker) | LOW | **P1** |
| Manual Release option selected | MEDIUM | LOW | **P1** |
| App Preview video | MEDIUM (conversion) | HIGH | P2 |
| App Store Connect API Key | MEDIUM (DX) | LOW | P2 |
| Promotional Text | LOW (can edit anytime) | LOW | P2 |
| Trader Status for EU | LOW (only if expanding) | LOW | P3 |
| English (US) localized listing | LOW (only if expanding) | MEDIUM | P3 |
| In-App Events / Custom Product Pages | LOW (post-launch) | MEDIUM | P3 |

**Priority key:**
- **P1:** Hard-required for first submission. All must be done before clicking Submit for Review.
- **P2:** Strongly recommended. Materially reduces rejection risk or improves conversion.
- **P3:** Post-launch improvements. Safe to defer.

---

## Expected Review Timeline (2026)

Based on Apple's published targets and first-submission patterns:

| Submission Type | Historical Median | Notes |
|-----------------|-------------------|-------|
| **TestFlight External Beta (first build)** | 24-48h | Required before 10k-tester distribution. Lighter review; catches privacy-manifest and crash issues. |
| **TestFlight External Beta (subsequent builds)** | <1h (often automated) | Metadata-only builds may skip review. |
| **App Store Review — First Submission** | 2-7 calendar days | Longer than subsequent reviews; first-submission apps get deeper scrutiny. |
| **App Store Review — Subsequent Versions** | 24-48h (50%+ within 24h) | |
| **Metadata-only updates** (Promotional Text, What's New) | Instant (no review) | |
| **Expedited Review** | 24h (by request, must justify) | **Do not request for first submission.** Reserve for post-launch critical bugs or PR-event launches. |

**Common first-submission rejection causes (rank-ordered by anecdotal frequency):**
1. **Missing or incorrect Required Reason API declarations** in Privacy Manifest — auto-rejected at binary processing; fix via `ios.privacyManifests`.
2. **Demo account doesn't work** — wrong password, expired, or role-gated screens look broken. Mitigation: test demo accounts from a fresh device/simulator the day of submit.
3. **Privacy Policy URL returns non-200** or content mismatches Nutrition Labels — rejection under 5.1.1. Host on stable HTTPS endpoint; audit match.
4. **Account deletion not discoverable within 2-3 taps from Account/Settings** — 5.1.1(v) rejection. CriaHub v1.0 APPLE-01 is compliant; verify discoverability on a fresh install.
5. **iPad-only crashes or broken layouts** (when supportsTablet:true) — 2.1 completeness rejection. Validate on real iPad, not just iPhone sim.
6. **Screenshots showing login screen or splash only** — 2.3.3 rejection. Must show app in use.
7. **"Does not function as described"** — reviewer cannot reproduce a flow mentioned in description. Mitigation: make description claims match what demo accounts can actually do in <5 minutes.
8. **Third-party trademarks in Keywords** — 2.3.7 rejection. Stick to domain terms.
9. **Missing "Sign in with Apple"** when app has any login — rejection when reviewer misapplies 4.8. Mitigation: preempt via Review Notes explaining first-party-only auth.

---

## Sources (all verified 2026-04-17)

- **App Store Review Guidelines** (current) — https://developer.apple.com/app-store/review/guidelines/ — HIGH confidence
- **Screenshot Specifications** — https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/ — HIGH confidence (confirms iPhone 6.9" 1320×2868 + iPad 13" 2064×2752 as required sizes for 2025-2026)
- **App Privacy Details / Nutrition Labels** — https://developer.apple.com/app-store/app-privacy-details/ — HIGH confidence
- **App Store Categories** — https://developer.apple.com/app-store/categories/ — HIGH confidence (confirms Business + Productivity taxonomy)
- **Upcoming Requirements** — https://developer.apple.com/news/upcoming-requirements/ — HIGH confidence (Xcode 16+/iOS 18 SDK required now, Xcode 26+/iOS 26 SDK from April 28, 2026; age rating deadline Jan 31, 2026 passed)
- **Privacy Manifest + Required Reason APIs** — https://developer.apple.com/documentation/bundleresources/privacy-manifest-files — HIGH confidence (mandatory since May 1, 2024)
- **Export Compliance** — https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance — HIGH confidence (ITSAppUsesNonExemptEncryption:false valid for HTTPS-only apps)
- **TestFlight** — https://developer.apple.com/testflight/ — HIGH confidence (100 internal / 10k external / first external build requires review)
- **App Preview specs** — https://developer.apple.com/app-store/app-previews/ — HIGH confidence (15-30s, up to 3/locale)
- **EAS Submit iOS (Expo docs via Context7)** — https://github.com/expo/expo/blob/main/docs/pages/submit/ios.mdx — HIGH confidence (via `ctx7 docs /expo/expo`)
- **Expo Apple Privacy Manifests (via Context7)** — https://github.com/expo/expo/blob/main/docs/pages/guides/apple-privacy.mdx — HIGH confidence
- Project context: `/Users/giuseppedangelis/Dev/criahub-mobile/.planning/PROJECT.md` and `CLAUDE.md`

---

*Feature research for: iOS App Store submission pipeline (v1.1 first submit)*
*Researched: 2026-04-17*
*Confidence: HIGH across Apple-sourced facts; MEDIUM on subjective recommendations (category choice, screenshot count, TestFlight external-first strategy)*
