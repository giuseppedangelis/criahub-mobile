# Pitfalls Research — iOS App Store First Submission (Expo SDK 54 / RN 0.81)

**Domain:** Expo/React Native B2B app — first-time App Store submission (pt-BR only, Brazil market, no IAP)
**Researched:** 2026-04-17
**Milestone:** v1.1 Submissão iOS App Store (branch `apple`)
**Confidence:** HIGH for Apple guideline text + Expo SDK 54 config; MEDIUM for empirical rejection patterns (training data + Expo docs, no live web search in this run)

---

## Executive Findings

The CriaHub Mobile submission carries **nine concrete, high-probability rejection vectors** that the current branch does NOT yet mitigate. In descending order of likelihood-to-reject:

1. **No Privacy Manifest** — `app.config.ts` has zero `ios.privacyManifests`. Apple auto-rejects builds uploaded after May 1 2024 that use Required Reason APIs without declaration (AsyncStorage → UserDefaults, Supabase/Expo internals → SystemBootTime + FileTimestamp).
2. **No Error Boundary** — `grep` confirms zero `ErrorBoundary` / `componentDidCatch` in `src/`. Any null-deref in the 20+ `any`-typed mappers crashes to white screen → Guideline 2.1 rejection ("crash on launch").
3. **Duplicate/empty `app.json`** — `app.json` is `{}` (empty). EAS Build uses `app.config.ts`, but App Store Connect validators sometimes read `app.json` first; this is inconsistent state even though harmless today.
4. **Demo account for ABCCMM-data-locked app** — reviewers cannot browse plantel without seeded official animals. RLS scopes by `haras_id`. Demo account will render empty screens → Guideline 2.1 ("incomplete"). Needs seeded demo haras.
5. **Privacy Policy URL is not listed as hosted** — REQUIREMENTS calls for it but no URL decided. Apple rejects submissions with placeholder/dead URLs.
6. **Supabase email+password auth is NOT 4.8-exempt by default** — Apple reviewers sometimes flag any app with OAuth-like login flow. Must be documented explicitly in review notes as "first-party email/password, no third-party federation" to avoid misinterpretation.
7. **Usage descriptions too generic** — "usa sua localização para registrar onde nascimentos e ocorrências acontecem" is OK, but Apple increasingly rejects for not naming the **specific feature**. Should cite the screen/action.
8. **No Age Rating questionnaire completed** — animal-health observations + free-text notes = UGC within the haras team. If "None" is answered across the board, mismatch with actual app content → rejection for misleading metadata.
9. **Sem `expo-build-properties`** — deployment target unset, takes Expo default. SDK 54 default is iOS 15.1; if reviewer uses iOS 15 device and something crashes, no easy fallback.

The v1.0 work (APPLE-01 in-app deletion, AUTH-01 deep-link reset, NOTIF-01 privacy, UX-05 biometrics) is good but addresses only **one** of the top nine vectors.

---

## Critical Pitfalls

### Pitfall 1: Missing Privacy Manifest (`PrivacyInfo.xcprivacy`)

**What goes wrong:**
Build is either auto-rejected at upload (since May 1, 2024) or rejected in review with the boilerplate:
> "ITMS-91053: Missing API declaration — The app's code references one or more APIs that require reasons, including the following API categories: NSPrivacyAccessedAPICategoryUserDefaults..."

**Why it happens:**
- `@react-native-async-storage/async-storage` internally calls `NSUserDefaults` (category: `NSPrivacyAccessedAPICategoryUserDefaults`) — the CriaHub app uses this in `src/lib/supabase.ts`, `src/services/field-offline.ts`, `src/services/veterinary-offline.ts`, `src/lib/notifications.ts`, `src/theme/ThemeContext.tsx` and the auth session persistence. **Every Expo/RN app with AsyncStorage hits this.**
- `expo-file-system` / transitive native code calls `stat()` on files → `NSPrivacyAccessedAPICategoryFileTimestamp`.
- Network libraries (supabase-js via native URLSession) often call `NSProcessInfo.systemUptime` → `NSPrivacyAccessedAPICategorySystemBootTime`.
- Several SDKs fetch `NSFileManager.attributesOfFileSystem` for cache management → `NSPrivacyAccessedAPICategoryDiskSpace`.
- `app.config.ts` currently has NO `ios.privacyManifests` block — confirmed by reading the file.

**How to avoid:**
Add this exact block to `app.config.ts` under `ios:` (verified against Expo SDK 54 docs — `privacyManifests` is a first-class Expo config field):

```ts
ios: {
  // ...existing keys...
  privacyManifests: {
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
        NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // Access info from same app group
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
        NSPrivacyAccessedAPITypeReasons: ["C617.1"], // Display to user in own app
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
        NSPrivacyAccessedAPITypeReasons: ["35F9.1"], // Measure time for performance
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
        NSPrivacyAccessedAPITypeReasons: ["E174.1"], // Write to storage only if enough space
      },
    ],
    NSPrivacyTracking: false,
    NSPrivacyTrackingDomains: [],
    NSPrivacyCollectedDataTypes: [
      // Declare collected data matching Privacy Nutrition Labels in ASC.
      // MUST match what App Store Connect says; mismatch is also rejectable.
    ],
  },
},
```

Verification: after `eas build --platform ios --profile production`, unzip the `.ipa` and confirm `Payload/CRIAHUB.app/PrivacyInfo.xcprivacy` exists with these keys (use `plutil -p PrivacyInfo.xcprivacy`).

**Warning signs:**
- Email from App Store Connect with subject `ITMS-91053` or `ITMS-91065` seconds after upload.
- TestFlight build stuck in "Processing" > 30 minutes.
- Build succeeds locally with `expo run:ios` (local builds don't enforce it) but rejects on EAS upload.

**Phase to address:** Phase 1 — Config audit & hardening. Must land before first EAS production build.

---

### Pitfall 2: No React Error Boundary → Crash-on-Launch Rejections (Guideline 2.1)

**What goes wrong:**
The #1 reason Apple rejects first-time submissions is "crash on launch" or "app renders blank/white screen during evaluation." Reviewer sees spinner forever or a silent crash → rejects under 2.1 ("We were unable to complete the review of your app").

**Why it happens:**
- `grep ErrorBoundary|componentDidCatch|getDerivedStateFromError src/` returns **zero matches** in CriaHub Mobile.
- 20+ files use `as any` / `: any` on Supabase mapper responses (`src/services/*.ts`). A malformed row (e.g., `birth_date: null` where mapper calls `.toISOString()`) crashes the whole tree.
- If Supabase is slow/offline during review (Apple reviewers are in California — night in BR when many ops are running), login hangs indefinitely. App has no timeout + retry fallback UI.
- Reviewers test in environments with poor network (corporate Wi-Fi, flaky VPN). Any `fetch` that throws unhandled → red screen in dev, silent white screen in production.

**How to avoid:**
1. **Root-level ErrorBoundary** in `app/_layout.tsx` (Expo Router supports `export function ErrorBoundary({ error, retry }: ErrorBoundaryProps)` per route file — verified in Expo Router v6 docs).
2. Network timeout on Supabase init: reject login after 15s, show retryable error UI.
3. In `AuthContext.tsx`, wrap session bootstrap in `try/catch/finally` that ALWAYS calls `setIsLoading(false)` even on failure — spinner must never persist.
4. Run `npx expo start --no-dev --minify` locally on a real device with airplane mode → must show actionable error, not white screen.
5. Mass-convert at least the auth path mappers away from `any`: login / profile / haras lookup are the crash-critical path.

**Warning signs:**
- Manual test: turn on Airplane Mode → open fresh install → if you see anything other than an error screen with a Retry button in < 15s, submission will fail.
- Apple rejection email citing "2.1 — Performance: App Completeness" with phrases "spinner", "stuck", "blank", or "crashed on launch."
- TestFlight crashes tab shows entries with `RCTFatalException` or `SIGABRT` in `Hermes` frames.

**Phase to address:** Phase 2 — Runtime hardening (before TestFlight upload). BLOCKER for submission.

---

### Pitfall 3: Demo Account Returns Empty Data Due to RLS + Empty Haras

**What goes wrong:**
Reviewer logs in with the demo credentials provided in App Review. RLS (`haras_id` scope) shows zero animals, zero agenda, zero anything → reviewer cannot test functionality → Guideline 2.1 rejection ("Unable to evaluate app functionality").

**Why it happens:**
- Every query has `filters.haras_id` or `.eq("haras_id", harasId)` — correct security-wise, but means an empty demo haras = empty UI.
- The code has `EmptyState "Acesso negado"` (v1.0 UX-01) but Apple reviewer interprets multiple empty states as "app doesn't work."
- Creator/vet/field-staff flows differ. Apple reviewer typically tests ONE account — if that's the creator and the haras has no animals, the reviewer never sees field or vet flows.

**How to avoid:**
1. Create a dedicated **`apple-review-haras`** with SEEDED data in Supabase (NOT on prod — use a staging project or a flagged/isolated haras in prod with audit).
2. Seed at least: 12 animals (mix of ABCCMM-imported and "avulso"), 3 active gestations, 5 agenda tasks spread over next 2 weeks, 2 field reports with GPS + photos, 1 condomínio with 3 cotistas, 2 vet appointments.
3. Provide THREE accounts in review notes (one per role), all bound to the same demo haras, so reviewer can switch roles without separate haras setups.
4. In review notes: explicit script:
   > "Como Criador: aba Plantel → toque em 'Belmonte da Estância' → veja a ficha. Como Veterinário (use `vet@criahub-demo.com`): aba Rotina → tarefas do dia. Como Peão (use `peao@criahub-demo.com`): aba Campo → 'Registrar ocorrência'."
5. Add a hidden "reset demo haras" button in the demo account (gated by `NODE_ENV !== 'production'` OR by a specific email allowlist) so reviewer re-tests work on a clean state.

**Warning signs:**
- Rejection citing "We were unable to find sufficient lasting value in your app" or "please provide a working demo."
- Messages from App Review asking for "how do we see the features?" — means your demo is too sparse.

**Phase to address:** Phase 4 — Demo data seeding & review notes. Must be done BEFORE submitting (not after rejection).

---

### Pitfall 4: Guideline 4.8 Misinterpretation — Email/Password Flagged as "Third-Party Login"

**What goes wrong:**
Reviewer sees Supabase-branded auth or misreads "email+password via Supabase" as a third-party OAuth flow (Google/Facebook/etc.) → demands Sign in with Apple (SiwA) → rejection under 4.8.

**Why it happens:**
- Guideline 4.8 verbatim: *"Apps that use a **third-party or social login service** (such as Facebook Login, Google Sign-In, Sign in with Twitter, Sign In with LinkedIn, Login with Amazon, or WeChat Login) to set up or authenticate the user's primary account with the app must also offer..."* — the **exceptions** paragraph explicitly says: *"Not required if app exclusively uses company's own account system..."* (verified from Apple's guidelines page).
- Supabase email+password **is** CriaHub's own account system — the database is owned by the developer, not a federated identity provider. This is a 4.8 EXEMPTION under "company's own account system."
- HOWEVER reviewers sometimes misread. If your LoginScreen shows "Entrar com Google" or any OAuth button, the exemption dies.

**How to avoid:**
1. **Remove any third-party login buttons** from LoginScreen — verify `src/screens/auth/LoginScreen.tsx` has ONLY email + password fields. Any Google/Facebook/Apple button triggers 4.8. (CriaHub mobile currently has only email+password — this is good.)
2. **Explicit review note** (required):
   > "Authentication uses first-party email+password only, backed by our own account system (Supabase Auth is our managed backend, not a third-party identity provider). No Facebook/Google/Apple/federated logins are offered. Per Guideline 4.8 exception for 'company's own account system,' Sign in with Apple is not required. Account deletion is available in-app under Conta → Excluir conta (Guideline 5.1.1v compliant)."
3. If Apple pushes back anyway (it happens), respond in Resolution Center citing the exact exception language — do NOT add SiwA reactively unless they insist after escalation, because adding SiwA triggers new integration work + TestFlight cycle.
4. Do NOT use social brand names in screenshots or descriptions ("Log in like you do with Google" etc.).

**Warning signs:**
- Rejection email with phrase "apps that use a third-party or social login service must also offer an equivalent option with Sign in with Apple."
- Reviewer note asking "Does your app use Supabase Auth? Please clarify if users log in with a third-party service."

**Phase to address:** Phase 3 — Metadata & review-notes preparation. Lock language before first submit.

---

### Pitfall 5: Account Deletion Path Not Obvious Enough (Guideline 5.1.1v)

**What goes wrong:**
APPLE-01 shipped in v1.0 (edge function `delete-account`), but if the path is `Conta → Configurações → Segurança → Excluir conta` (4+ taps), reviewer may not find it and reject citing "unable to locate account deletion."

**Why it happens:**
- Apple's support doc *Offering Account Deletion in Your App* says: *"must be **easily discoverable** and offer equivalent results to deleting your account via your website."*
- "Easily discoverable" in practice = within 2-3 taps of the home/settings screen, visible without scrolling.
- Many apps bury deletion under multi-layer settings menus thinking it's hidden enough — Apple explicitly rejects that.

**How to avoid:**
1. Path MUST be: `Conta tab (tab bar) → Excluir conta (visible without scrolling)`. Max 2 taps from any screen.
2. Use a **red/danger-colored button** explicitly labeled "Excluir conta" or "Excluir minha conta permanentemente" — do NOT hide under "Configurações avançadas" or "Segurança."
3. Confirmation dialog must clearly say: "Esta ação apagará permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita."
4. After confirmation: user is signed out immediately and local data is wiped (verified: v1.0 already does `clearAllReminders()` on signOut).
5. Verify in review notes: *"Exclusão de conta: aba Conta → botão 'Excluir conta' → dupla confirmação → edge function `delete-account` remove todos os dados no Supabase (RLS-scoped DELETE em animals, ownership, tasks, etc.). Ver `apple/docs/APPLE-01_FLOW.md`."*
6. Test the flow on TestFlight yourself with a throwaway account — time how many seconds + taps from cold launch to "conta excluída."

**Warning signs:**
- Rejection citing "5.1.1(v) — Data Collection and Storage" with phrase "unable to find account deletion."
- TestFlight feedback from internal testers saying "where do I delete my account?"

**Phase to address:** Phase 3 — Pre-submit review pass. Verify existing APPLE-01 UX meets "easily discoverable" bar.

---

### Pitfall 6: Privacy Policy URL Is Placeholder or Unreachable

**What goes wrong:**
App Store Connect requires Privacy Policy URL at submission time. If the URL is `https://example.com/privacy`, returns 404, is behind auth, or just a blank GitHub Pages placeholder → rejection under 5.1.1 + metadata rejection under 2.3.7.

**Why it happens:**
- Many devs treat it as a checkbox — slap any URL. Apple's reviewer opens it and checks content.
- LGPD requires Brazilian-specific disclosure (name of controller, DPO contact, legal basis per Art. 7, right-to-erasure procedure, data retention). A generic copied policy from another app = rejection.
- The URL must be on a domain you control and be hosted **before** submission.

**How to avoid:**
1. Choose hosting: either
   - `criahub.com.br/privacidade` (preferred — reuse web repo's page)
   - OR `criahub-mobile.github.io/privacidade` (GitHub Pages, free, owned)
   - NOT Notion public pages, Google Docs, or Figma share links (Apple has rejected these).
2. Content checklist (LGPD + Apple minimum):
   - Controller identity + CNPJ + email de contato
   - Categorias de dados coletados (matching Privacy Nutrition Labels exactly — see Pitfall 7)
   - Finalidades de uso
   - Compartilhamento com terceiros (Supabase as sub-processor)
   - Base legal (Art. 7 LGPD — execução de contrato + consentimento)
   - Retenção + procedimento de exclusão (link para fluxo in-app)
   - Direitos do titular (Art. 18 LGPD)
   - Contato do encarregado (DPO) — email obrigatório
   - Data da última atualização
3. Also host **Support URL** (`criahub.com.br/suporte` or `/contato`) — Apple also requires this. A `mailto:` isn't enough for some reviewers.
4. Test both URLs from a non-logged-in browser + incognito + mobile + iPad — all must load without auth gate.

**Warning signs:**
- ASC shows the URL field but you can't remember whether the page is actually live → it probably isn't, check now.
- Rejection citing "5.1.1 — Privacy" with "privacy policy URL is not accessible" or "does not disclose data collection practices."

**Phase to address:** Phase 3 — Metadata & legal assets. Must be LIVE before submit.

---

### Pitfall 7: Privacy Nutrition Labels Don't Match Actual App Behavior

**What goes wrong:**
ASC "App Privacy" section requires declaring ALL data types collected/linked/used for tracking. CriaHub collects: email, name, haras_id (identifier), photos, location (field reports), user content (notes). If you answer "Data Not Collected" (laziest option), you lie → rejection under 5.1.2. If the declaration doesn't match the Privacy Policy URL → also rejection.

**Why it happens:**
- Dev defaults to "Data Not Collected" to avoid answering 30 questions, thinking "the data is private, we don't use it for ads."
- Apple's definition of "collected" is broader than devs expect: *any* data transmitted off-device + retained by you/Supabase is "collected."
- Nutrition Labels must match Privacy Manifest (`NSPrivacyCollectedDataTypes`) AND Privacy Policy → three-way consistency required.

**How to avoid:**
Declare these for CriaHub Mobile in ASC "App Privacy":

| Data Type | Collected? | Linked to User? | Used for Tracking? | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| Email Address | Yes | Yes | No | App Functionality, Account Management |
| Name | Yes | Yes | No | App Functionality |
| User ID (Supabase user UUID) | Yes | Yes | No | App Functionality |
| Photos | Yes | Yes | No | App Functionality (animal records) |
| Precise Location | Yes | Yes | No | App Functionality (field reports only) |
| User Content — Other (observations, notes) | Yes | Yes | No | App Functionality |
| Product Interaction (in-app actions) | No | — | — | — |
| Crash Data | No (unless Sentry added later) | — | — | — |
| Purchase History | No | — | — | — |

Mirror these exact categories in:
1. `app.config.ts` → `ios.privacyManifests.NSPrivacyCollectedDataTypes`
2. Privacy Policy URL content
3. ASC "App Privacy" questionnaire

**Warning signs:**
- Rejection email with "5.1.2" and "privacy details" / "App Privacy information."
- Rejection note "the privacy information provided in App Store Connect does not match the content in your Privacy Policy."

**Phase to address:** Phase 3 — Metadata & legal assets. Three-way consistency check before submit.

---

### Pitfall 8: Location Usage Description Too Generic

**What goes wrong:**
Apple now rejects permission strings that are too generic ("to provide location services") as of 2024+. Even specific ones can fail if the reviewer can't observe the feature actually needing location.

**Why it happens:**
- Current string in `app.config.ts`: *"O CriaHub usa sua localização para registrar onde nascimentos e ocorrências acontecem."* — this is **acceptable** but not ideal. Apple prefers citing the exact UI surface.
- If reviewer can't find a screen that triggers the location prompt, they rarely just reject — they often ask "where does the app use location?" → delay, but not always rejection.

**How to avoid:**
1. Rewrite `NSLocationWhenInUseUsageDescription` to be **screen-specific + action-specific**:
   > "O CriaHub acessa sua localização apenas quando você usa a aba Campo para registrar um parto ou ocorrência, para anexar GPS ao evento. Você pode usar o app normalmente sem autorizar."
2. In review notes, tell reviewer exactly where to trigger the prompt:
   > "Para acionar o prompt de localização: entre como Peão → aba Campo → Registrar ocorrência → Usar GPS."
3. Do NOT request `Always` location (only `WhenInUse`) — current config correctly uses `NSLocationWhenInUseUsageDescription`. Keep it that way; dropping the `expo-location`'s `locationAlwaysAndWhenInUsePermission` requires setting the `isIosBackgroundLocationEnabled: false` option so only the "when in use" Info.plist key is emitted. Verify after prebuild.
4. Same discipline for camera/photo/microphone:
   - Camera: mention "fotografar animais no plantel e ocorrências no campo"
   - Photos: mention "anexar arquivos ao prontuário ou à ficha do animal"
   - Microphone: if you're not actively using audio recording (check: `expo-image-picker` with video recording would trigger this), REMOVE it — unused permission requests cause rejections.

**Warning signs:**
- Reviewer notes asking "what feature requires microphone/location access?"
- Rejection citing "5.1.1 — Data Collection" and "purpose of data collection is not clear."

**Phase to address:** Phase 1 — Config audit. Rewrite all usage descriptions; remove unused (audit microphone actual usage).

---

### Pitfall 9: Age Rating Questionnaire Answered Wrong

**What goes wrong:**
Apple's age-rating questionnaire has ~15 questions. Answering everything "None" seems safe but mismatches reality → rejection for misleading rating. Answering "Frequent" for something mild also wrong (bumps rating to 17+ unnecessarily).

**Why it happens:**
- CriaHub has **user-generated content** (notes, comments, observations) within the haras team. This ticks the UGC question → age rating depends on whether UGC is moderated.
- Veterinary observations may describe animal procedures/births → "Medical/Treatment Information" question.
- Dev defaults to "None" → reviewer spots UGC/medical content in actual app → rejects for rating mismatch.

**How to avoid:**
Correct answers for CriaHub:
- **Cartoon or Fantasy Violence**: None
- **Realistic Violence**: None
- **Prolonged Graphic or Sadistic Realistic Violence**: None
- **Profanity or Crude Humor**: None
- **Mature/Suggestive Themes**: None
- **Horror/Fear Themes**: None
- **Medical/Treatment Information**: **Infrequent/Mild** (veterinary procedure notes exist but are technical, not graphic)
- **Alcohol, Tobacco, or Drug Use or References**: None
- **Simulated Gambling**: None
- **Sexual Content or Nudity**: None
- **Graphic Sexual Content and Nudity**: None
- **Unrestricted Web Access**: No
- **Gambling**: No
- **Contests**: No
- **User Generated Content**: **Yes** — but with narrative in review notes that it's team-scoped (single haras, invited members only, no public feed)

Result: expected rating **4+** or **9+** (depending on medical answer).

If "User Generated Content: Yes" triggers 1.2 safety requirements (see Pitfall 10), provide review note explaining isolation.

**Warning signs:**
- Rejection citing "2.3.6 — Age Rating" or "inaccurate age rating."
- ASC showing warning "your app contains user-generated content — please review Guideline 1.2."

**Phase to address:** Phase 3 — Metadata & review-notes preparation.

---

### Pitfall 10: UGC Safety Requirements Not Met (Guideline 1.2)

**What goes wrong:**
If you answer "User Generated Content: Yes" in age rating, Apple applies Guideline 1.2 which requires:
1. Method to **filter objectionable material**
2. Mechanism to **report offensive content**
3. Ability to **block abusive users**
4. Published contact info

CriaHub has none of these. Naive devs get rejected.

**Why it happens:**
- 1.2 is designed for public social networks (Instagram-like). Naive reading says "we have UGC = we need reporting/blocking = rewrite app."
- Exception exists for **private/team-scoped** apps — but must be explicitly argued.

**How to avoid:**
1. In review notes, explicitly frame isolation:
   > "Este app é B2B. Cada haras é um tenant isolado via RLS no Supabase. Conteúdo gerado por usuários (anotações de parto, observações veterinárias, comentários em ocorrências) é visível **apenas** para a equipe daquele haras específico (criador + veterinário + peões convidados). Não há feed público, busca entre hara, perfis sociais, nem mensageria entre hara. Usuários só entram em um haras por convite direto do criador/assessor. Como o conteúdo é estritamente privado a uma equipe contratualmente relacionada, as proteções de UGC da Guideline 1.2 (filtragem, report, block) não se aplicam — equivalente a notas internas em ferramentas corporativas (Notion, Slack privado)."
2. **Do** provide: in-app support email (`suporte@criahub.com.br` or similar) on Conta screen — covers "published contact information."
3. If Apple still pushes back, minimal viable 1.2 compliance:
   - Add "Reportar conteúdo" flow on any UGC item → opens `mailto:suporte@criahub.com.br` with auto-filled subject. (Mail composer does NOT require account deletion 5.1.1v treatment — it's just a reporting mechanism.)
   - Add "Remover membro da equipe" in haras team management (probably already exists in assessor flow).
   - Document both in review notes.

**Warning signs:**
- Rejection citing "1.2 — Safety: User-Generated Content."
- Reviewer message asking "how does a user report offensive content?"

**Phase to address:** Phase 3 — Review notes preparation + minor in-app additions if needed.

---

### Pitfall 11: Trademark / Third-Party Brand Use (ABCCMM)

**What goes wrong:**
App displays "ABCCMM" (Associação Brasileira dos Criadores do Cavalo Mangalarga Marchador) registry data — a third-party entity's official records. Apple sometimes demands proof of authorization (Guideline 5.2) — affidavit, contract copy, or permission letter.

**Why it happens:**
- ABCCMM is a registered association with its own IP in studbook data, logos, naming conventions.
- App sells/promotes access to this data → Apple may require license proof.
- "ABCCMM" and "Mangalarga Marchador" as keywords or in screenshots can also trigger 5.2.

**How to avoid:**
1. **Do NOT use ABCCMM logo** anywhere in the app, icon, screenshots, or store listing.
2. **Do NOT claim partnership** ("official ABCCMM app", "endorsed by ABCCMM") unless you have that in writing.
3. **Attribution OK**: app can display `abccmm_rowid` and mention "Dados da ABCCMM importados pelo criador" — this is factual attribution, not affiliation.
4. Review notes should pre-empt:
   > "O app permite que criadores do cavalo Mangalarga Marchador gerenciem seu plantel. Registros oficiais (nome, número de registro, pelagem, genealogia) originam-se de importações manuais feitas pelo criador via planilha exportada do site da ABCCMM, a qual ele tem acesso legítimo como associado. O CriaHub não é afiliado à ABCCMM, não revende dados, e apenas armazena cópias dos registros do próprio criador. Campos oficiais são marcados como imutáveis (`abccmm_rowid`) para preservar integridade dos dados originais."
5. If Apple demands authorization letter, it'll delay submit 1-2 weeks. Pre-empting in review notes avoids this.

**Warning signs:**
- Rejection citing "5.2 — Intellectual Property" asking for "documentation authorizing your use of third-party trademarks."
- Keyword rejection for "ABCCMM" if the name is trademarked.

**Phase to address:** Phase 3 — Review notes preparation. Also audit screenshots for any ABCCMM branding.

---

### Pitfall 12: Metadata Mismatch Between Screenshots, Description, and App

**What goes wrong:**
Description promises "financial reports" but app has no such screen; screenshots show a v0.5 UI that differs from current app; keywords stuff unrelated terms ("cavalo, haras, veterinário, fazenda, pecuária, gado, boi, rural, agro, offline"). All three are explicit 2.3.x rejections.

**Why it happens:**
- Dev copies description from web repo (which has more features).
- Old screenshots never refreshed as UI evolved.
- SEO instinct → keyword stuffing with unrelated domains (gado, boi = cattle, not equines).

**How to avoid:**
1. **Description** must only mention features actually in the binary. Audit:
   - ✓ plantel (listing, ficha, edição)
   - ✓ agenda
   - ✓ reprodução
   - ✓ veterinário (prontuário, rotina, estoque sêmen)
   - ✓ campo (partos, ocorrências, GPS)
   - ✓ offline (field queue)
   - ✗ financeiro completo → out of scope for v1.0; do not mention
   - ✗ relatórios avançados → out of scope
   - ✗ assessor full → out of scope
2. **Screenshots** must be from the production build:
   - Regenerate all screenshots from the `production` EAS build AFTER Phase 1-2 fixes land (otherwise old UI).
   - Include iPhone 6.9" (1320×2868) or 6.7" (1290×2796) — 2-10 screenshots.
   - Include iPad 13" (2064×2752) or 12.9" (2048×2732) — mandatory because `supportsTablet: true`.
   - Use the `apple-review-haras` seeded data so screenshots show real content, not "Nenhum animal cadastrado."
3. **Keywords** (100 char limit, comma-separated):
   - OK: `haras,plantel,criador,cavalo,mangalarga,equino,veterinario,reproducao,peao,gestao`
   - NOT OK: adding competitor names, adding unrelated cattle/agriculture keywords, repeating the app name (already implicit).
4. **Promotional text** (170 char) and **Subtitle** (30 char) must not contain prices or promotions that expire ("Grátis por tempo limitado!").

**Warning signs:**
- ASC pre-submission validator highlights "keyword length" or "prohibited terms."
- Rejection citing "2.3.7 — App Metadata" or "2.3.3 — Accurate Metadata."

**Phase to address:** Phase 3 — Metadata & screenshots generation. MUST be after Phase 1-2 to avoid re-shooting.

---

### Pitfall 13: Minimum iOS Deployment Target Mismatch + Old-Device Crashes

**What goes wrong:**
Reviewer uses iPhone with iOS 15.x or 16.x (Apple maintains a pool of older devices). Expo SDK 54 default min iOS is 15.1. If `app.config.ts` doesn't explicitly set this (current state), and some dependency silently requires 16+, the build will either fail or crash on old iOS → rejection.

**Why it happens:**
- `app.config.ts` has NO `expo-build-properties` plugin → iOS deployment target is whatever Expo defaults to (15.1 for SDK 54).
- Some third-party RN libraries have quietly bumped to iOS 16+ requirements in 2024-2025 (check: `react-native-reanimated@4`, `react-native-screens@4`).
- If any dep expects 16+ but target is 15.1, you get a runtime crash on 15.x device that is caught only in review.

**How to avoid:**
1. Explicitly declare deployment target in `app.config.ts`:
   ```ts
   plugins: [
     // ... existing plugins ...
     [
       "expo-build-properties",
       {
         ios: { deploymentTarget: "15.1" },
       },
     ],
   ],
   ```
   Install: `npx expo install expo-build-properties`
2. Test on **physical iPhone with iOS 15.x** via TestFlight before submitting. If you don't have one, iOS 16.x real device is second-best.
3. Review `package.json` for native deps with min-iOS bumps:
   - `react-native-reanimated 4.1.1` → requires iOS 15.1+ (OK)
   - `react-native-worklets 0.5.1` → requires iOS 15.1+ (OK)
   - `expo-video 3.0.16` → requires iOS 15.1+ (OK)
   - Check before each SDK bump.

**Warning signs:**
- EAS Build output warnings about deployment target mismatch.
- Reviewer feedback "app crashed on iPhone X with iOS 15."
- Crashlytics (if added later) showing 100% crashes on `< iOS 16` devices.

**Phase to address:** Phase 1 — Config audit. Explicit `expo-build-properties`.

---

### Pitfall 14: Build Number Not Incremented / Duplicate Version Number

**What goes wrong:**
EAS `preview` and `production` profiles share version/build numbers. If you submit build 1, then fix something and submit again without bumping, App Store Connect rejects upload with "The build version must be higher than the previously uploaded version."

**Why it happens:**
- `app.config.ts` has `version: "1.0.0"` and `buildNumber: "1"` hardcoded.
- `eas.json` has `autoIncrement: true` for production iOS submit (per REQUIREMENTS) — but is it really configured? Verify.
- Developer submits, sees "first build uploaded successfully!", fixes a typo, submits → fails.

**How to avoid:**
1. Verify `eas.json` has `"production": { "ios": { "autoIncrement": true } }` OR use remote version source: `"cli": { "appVersionSource": "remote" }`. Current `eas.json` should be audited. Expo docs call this out: *"One common cause for app store rejections is submitting a build with a duplicate version number."*
2. Use `eas build --platform ios --profile production --auto-submit` to chain build+submit and force increment.
3. Never hand-edit `buildNumber` in `app.config.ts`; let EAS manage it.
4. After first TestFlight upload, confirm ASC shows "Build 1 (1.0.0)" — next submit should show "Build 2 (1.0.0)."

**Warning signs:**
- Upload fails at the `eas submit` step with "CFBundleVersion" conflict error.
- App Store Connect activity log shows "build rejected: duplicate version."

**Phase to address:** Phase 5 — Build & upload.

---

### Pitfall 15: Duplicate Config Between `app.json` and `app.config.ts`

**What goes wrong:**
CriaHub has both `app.json` (currently `{}`) and `app.config.ts` (populated). Historically `app.json` had Supabase URL + anon key + EAS projectId hardcoded (removed in v1.0 SEC-02). Empty `{}` is tolerable today, but if someone re-adds keys to `app.json` thinking it's the source of truth, you get config drift.

**Why it happens:**
- Expo docs show both files as equivalent; devs don't realize `app.config.ts` takes precedence when both exist.
- IDE auto-completion for `app.json` is better; tools sometimes write there.
- REQUIREMENTS.md v1.0 called out "app.json desduplicado" as a v1.1 target.

**How to avoid:**
1. Keep `app.json` as empty `{}` OR delete it entirely (Expo accepts either). Empty is safer because some tools expect the file to exist.
2. Add a code comment at the top of `app.config.ts`:
   ```ts
   /**
    * Source of truth for Expo app config.
    * `app.json` must remain empty `{}` — do not duplicate keys here.
    * EAS Build reads `app.config.ts` via dynamic evaluation (dotenv + extra).
    */
   ```
3. Add a pre-commit or Git hook check: `grep -c . app.json` should return 1 (empty JSON is `{\n}`).
4. If the file's content ever exceeds `{}`, CI or human review must reject the commit.

**Warning signs:**
- Keys that should be defined appear `undefined` at runtime → check if they're in `app.json` vs `app.config.ts`.
- EAS Build log shows "warning: conflicting configuration between app.json and app.config.ts."

**Phase to address:** Phase 1 — Config audit.

---

### Pitfall 16: Export Compliance Not Declared Correctly

**What goes wrong:**
ASC asks whether app uses encryption. If you answer wrong, Apple may hold the build for Export Compliance review (can take 1-5 days). If you say "No" but the app DOES use non-exempt encryption, you violate US law and risk removal.

**Why it happens:**
- Apps using standard HTTPS (fetch to Supabase) use **exempt** encryption (per Apple's definition: "standard encryption that is built into the operating system").
- Dev hesitates between options.

**How to avoid:**
Current `app.config.ts` has `ITSAppUsesNonExemptEncryption: false` — ✓ correct for CriaHub (only uses HTTPS, no custom crypto, no e2e encryption library). This avoids the compliance review entirely.

Verify post-build: unzip the `.ipa`, `plutil -p Info.plist | grep -i encryption` → should show `"ITSAppUsesNonExemptEncryption" => 0`.

**Warning signs:**
- ASC shows "Missing Compliance" banner on the build in TestFlight.
- Submission blocked until you answer encryption question on every build (didn't auto-declare).

**Phase to address:** Phase 1 — Config audit (already shipping this right, just verify).

---

### Pitfall 17: Notification Permission Prompt Never Triggered During Review

**What goes wrong:**
App uses `expo-notifications` for local reminders (parto, devolução, etc.) — prompt appears only when a reminder is scheduled. Reviewer may never schedule a reminder → never sees prompt → thinks notifications don't work → rejection under 2.5.4 or metadata mismatch.

**Why it happens:**
- Notification prompt is deferred to first scheduled reminder, not on app first launch.
- Reviewer doesn't know the flow to trigger.

**How to avoid:**
1. Request notification permission at a natural early moment: after first successful login, show a soft opt-in screen:
   > "Ative lembretes para partos e devoluções próximas. Você pode ignorar e ativar depois em Conta → Notificações."
2. If user grants → prompt; if dismisses → app still works (verify: fila offline + sync work without notifications).
3. In review notes:
   > "Notificações locais (lembrete de parto, devolução de animal em condomínio): o app solicita permissão logo após o primeiro login. Caso negada, o app funciona normalmente; usuário pode ativar depois em Conta → Notificações."
4. Handle denied state gracefully: `Notifications.getPermissionsAsync()` → if denied, show disabled state with "Ative em Configurações do iOS" instead of silently failing.

**Warning signs:**
- Reviewer asks "where do I see the notification prompt?"
- App schedules a notification in background but user never sees it because permission was denied silently.

**Phase to address:** Phase 2 — Runtime hardening. Small UX change, big impact.

---

### Pitfall 18: IPv6-Only Network Failure (Apple's Review Network)

**What goes wrong:**
Apple tests apps on IPv6-only networks (documented since 2016). If Supabase or any dep doesn't support IPv6, login hangs → crash-on-launch rejection.

**Why it happens:**
- Supabase Cloud DOES support IPv6 on its edge (AWS CloudFront + custom domains).
- But some self-hosted Supabase or custom domain setups may not.
- Also: any hardcoded IPv4 literal in `.env.local` (e.g., `http://1.2.3.4:5432`) breaks.

**How to avoid:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is the standard `https://<project-ref>.supabase.co` (IPv6-ready, CloudFront-fronted). Do NOT use custom domain unless DNS has AAAA record.
2. Test with Apple's recommended procedure: on macOS, System Preferences → Sharing → Internet Sharing → enable, then Wi-Fi options → "Create NAT64 Network" → connect iPhone to that network → test the app.
3. If app fails on NAT64 test, investigate: `nslookup <your-supabase>.supabase.co AAAA` must return an IPv6 address.

**Warning signs:**
- Rejection citing "app does not function on IPv6-only network."
- TestFlight builds that work on Wi-Fi but fail on cellular (some carriers are IPv6-only).

**Phase to address:** Phase 2 — Runtime hardening. Test once; won't break again unless URL changes.

---

### Pitfall 19: Dev-Only UI / Debug Logs Leaking in Production Build

**What goes wrong:**
Production build contains dev-only banners ("DEBUG MODE", "Local Supabase"), verbose `console.log` in critical flows, or unreachable developer menus. Even if not crashes, Apple may reject for "unprofessional appearance" or "beta testing content" (2.4.0).

**Why it happens:**
- Grep shows 9 files with `console.*` calls in `src/` (auth, biometric, ownership, etc.). These fire in production unless wrapped in `if (__DEV__)`.
- `react-native-keyboard-controller`, reanimated debug logs can appear in release without work.
- Old `if (true)` flags, commented-out dev screens, placeholder copy.

**How to avoid:**
1. Audit before production build:
   ```bash
   grep -rn "console\." src/ | grep -v "__DEV__"
   ```
   Each match: wrap in `if (__DEV__) console.log(...)` OR remove.
2. Use React Native release build optimization: Metro strips `console.*` in production by default with `babel-plugin-transform-remove-console` — verify `babel.config.js` has it for production. If not, add it as an env-gated plugin.
3. Run `npx expo start --no-dev --minify` locally — flip through all screens looking for "DEBUG", "TEST", "TODO", "Lorem ipsum", dummy images, etc.
4. Review `.planning/`, `docs/`, and apple/ scaffold folders are ignored by `.gitignore` for the production bundle (they're not, but Metro doesn't bundle them by default — verify `.expo/`, `node_modules/` are excluded but that `docs/` content doesn't end up in `__bundled__`).

**Warning signs:**
- Reviewer sees console output on device via Console.app or Organizer.
- Dev toolbar / debug menu accessible via gesture in release build.
- Rejection citing "2.4.0 — Hardware Compatibility" or just "beta/test" language.

**Phase to address:** Phase 2 — Runtime hardening. Check once, fix all 9+ files, test cold launch.

---

### Pitfall 20: Missing or Broken Deep-Link for Password Reset (AUTH-01 Verification)

**What goes wrong:**
AUTH-01 (deep-link password reset) shipped in v1.0, BUT Apple reviewers sometimes test password reset flow end-to-end. If the `criahubmobile://` URL scheme isn't whitelisted in iOS Universal Links or if Supabase redirect URL doesn't match → reset email link opens Safari instead of app → reviewer concludes feature doesn't work.

**Why it happens:**
- `scheme: "criahubmobile"` in `app.config.ts` is correct.
- Supabase Dashboard must have `criahubmobile://reset-password` listed under "Redirect URLs" (Auth → URL Configuration).
- iOS 15+ requires **Associated Domains** entitlement for universal links; custom scheme works but opens an "Open in CRIAHUB?" confirmation that reviewers may decline.

**How to avoid:**
1. Verify Supabase redirect URL config: Dashboard → Auth → URL Configuration → `criahubmobile://reset-password` listed.
2. Test end-to-end on TestFlight build: request reset → open email on same device → tap link → must open app to password reset screen with valid session.
3. In review notes, include fixture: *"Test password reset: tap 'Esqueci minha senha' on login screen → enter your demo email → check inbox for the Supabase reset email → tap the link → app opens to new-password screen. Works on this demo device: reviewer@apple.com (password: <demo-password>)."*
4. Consider Universal Links via Associated Domains entitlement for v1.2 (not v1.1 — too much scope).

**Warning signs:**
- Reviewer says "unable to complete password reset."
- Link opens in Safari showing raw URL or redirects to broken URL.

**Phase to address:** Phase 5 — TestFlight validation on real device.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip Privacy Manifest, rely on transitive | Ship faster | Auto-reject at upload; can't release at all post-May 2024 | **Never** |
| Hardcode `buildNumber: "1"` in config | Simple | Submit #2 fails; also hard to bisect crashes across TestFlight builds | Only for local dev; always use `autoIncrement` for production |
| Use generic Apple demo credentials (`test@test.com/1234`) | Nothing to seed | Reviewer sees empty haras → rejection → redo Phase 4 | Never for B2B apps with RLS |
| Skip error boundary "just test the happy path" | Faster initial ship | Any prod crash = 1-3 week rejection + TestFlight + resubmit cycle | Never for App Store builds |
| Reuse web's Privacy Policy without LGPD/DPO fields | Avoid legal review | LGPD fine + Apple rejection for incomplete disclosure | Acceptable if web's policy is already LGPD-complete; verify before copy |
| Upload screenshots from `preview` simulator build | Fast screenshots | Shows dev UI / debug text / wrong version | Never; always use `production` build on a real device OR simulator with `--no-dev --minify` |
| Answer "Data Not Collected" on Nutrition Labels | Skip 30 questions | Apple + LGPD violation + 5.1.2 rejection | Never |
| Ship Portuguese-only without `en` fallback | Smaller scope | Apple reviewer in Cupertino may ask for English translation "to evaluate" | Acceptable for Brazil-only — in review notes state "targeted market: Brazil; locale pt-BR exclusively" + provide English-translated review notes |
| Skip iOS 15 device test "it's SDK 54, must work" | Dev velocity | Silent crashes on old reviewer devices | Acceptable only if you have Crashlytics + fast rollback; not for first submit |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Relying on `onAuthStateChange` to clear local data | Also call explicit cleanup on signOut to handle race with refresh token expiry (already shipped in v1.0 NOTIF-01) |
| Supabase Auth | Long-lived JWT in AsyncStorage without expiry handling | `@supabase/supabase-js` handles refresh, but add a 15s timeout on bootstrap to avoid white screen (see Pitfall 2) |
| Supabase Storage (public bucket `animal-photos`) | Exposing UUID-enumerable URLs | v1.0 added nonce (RLS-04) but bucket is still public. For v1.1: document in Privacy Policy that animal photos are transmitted via HTTPS with URL obscuring; Apple isn't the concern here but LGPD is |
| EAS Submit ASC API Key | Committing API Key .p8 file | Store in EAS secret, reference via `ascApiKeyPath`; never in repo |
| EAS Build credentials | Not running `eas credentials --platform ios` before first build | Always configure signing certificates + provisioning profile before first `eas build --profile production` or build fails silently |
| Expo Notifications | Requesting permission on every app launch | Request once after first successful action (e.g., first reminder creation or soft opt-in at login) |
| Expo Location | Using `Always` authorization without proper UX justification | Use `WhenInUse` for CriaHub (current setup); never upgrade without feature-level justification |
| Expo Image Picker (microphone) | Declaring `microphonePermission` when not using video recording | Audit actual usage; if no video + audio recording, REMOVE microphone permission + Info.plist key entirely (reduces rejection risk) |
| expo-build-properties missing | Relying on Expo default iOS deployment target | Always explicit `ios.deploymentTarget: "15.1"` for SDK 54 |
| EAS Metadata beta | Using `store.config.json` without testing | Start with manual ASC fields for v1.1; migrate to EAS Metadata in v1.2 once stable (Expo docs: "EAS Metadata is in beta and subject to breaking changes") |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Bootstrap waits for Supabase indefinitely | White screen on bad network (Apple review Wi-Fi, airplane mode) | 15s timeout + fallback UI (Pitfall 2) | First launch on any flaky/offline network — blocks review |
| 11+ round-trips on dashboard mount (current creator flow) | Slow TTI on 3G; reviewer thinks app is stuck | v1.0 PERF-01 delivered `get_creator_dashboard` RPC — verify it's actually being used in current screens, not bypassed | Blocks review if reviewer uses slow network simulation |
| Image cap 2000px + no progressive load | Large memory spike on ficha with 20+ photos → OOM crash on iPhone with 4GB RAM | v1.0 PERF-02 capped images. Verify `expo-video` + image thumbnailing lazy-loads, doesn't decode all at once | iPad with many photos = memory pressure |
| TanStack Query `staleTime: 60s` + no stale-while-revalidate UI | Data looks fresh but is stale; reviewer might see inconsistent data if they navigate back-and-forth | Acceptable for v1.1; monitor post-launch | N/A for review |
| Offline queue dedup dropping items | Gemini/twin birth records lost | v1.0 OFFLINE-01 fixed with minute-bucket fingerprint; verify | If reviewer tests offline flow, missed record = "bug" reported |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Public `animal-photos` bucket (still public as of v1.0) | Enumeration attack + LGPD Art. 46 breach | v1.0 nonce helps; document in review notes; migrate to private+signed in v1.2 |
| Hardcoded Supabase anon key in `app.json` (historic) | Anon key leak (though scoped by RLS, still reduces defense-in-depth) | v1.0 SEC-02 removed; `app.json` must stay `{}` — see Pitfall 15 |
| Service-role key ever on client | Full DB access leak | `src/lib/supabase.ts` comment enforces; never remove it; reject any PR adding service_role |
| Biometric gate on `/financeiro` bypassable | Private financial data viewable without auth | v1.0 UX-05 delivered; verify on iOS (FaceID + TouchID paths differ) |
| LGPD local data not cleared on signOut | Previous user's data visible after re-login | v1.0 NOTIF-01 + AUTH path clears AsyncStorage; verify with manual test (login as A → signOut → login as B → no A data visible in cache) |
| No JWT expiry handling in long-idle sessions | User has valid UI but API returns 401 → silent failures | Supabase-js handles refresh; add a global 401 handler that forces signOut to avoid "zombie session" appearing to reviewer |
| Deep-link password reset opens to wrong user | Cross-user account takeover via replayed link | AUTH-01 uses Supabase's signed tokens; verify the `usePathname` race guard actually works on cold start |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Demo account lands on empty Plantel | Reviewer sees "Nenhum animal" first screen | Seed demo haras (Pitfall 3) |
| Splash screen > 3s | Feels broken | Currently uses Expo splash with `#0d0d0d` bg — fine; do not add network waits to splash |
| Account deletion buried in settings | Fails 5.1.1v (Pitfall 5) | Top-level visible in Conta tab |
| Notification permission prompt never appears | Reviewer concludes feature missing | Soft opt-in after first login (Pitfall 17) |
| Login error shows raw Supabase error text in Portuguese (e.g., "Invalid login credentials") | Mixed-language UI feels unpolished | Translate known Supabase errors to pt-BR in `LoginScreen.tsx` |
| Loading spinner without context on slow 3G | Reviewer thinks crashed | "Carregando plantel (pode demorar em rede lenta)" + cancel/retry button |
| Biometric prompt without pre-context | Feels intrusive | Show intro screen "Para proteger seus dados financeiros, use Face ID/Touch ID" then trigger |
| Keyboard covers login form (iPhone SE / small screens) | Can't see submit button | v1.0 uses `react-native-keyboard-controller` — verify on smallest supported iPhone before submit |

---

## "Looks Done But Isn't" Checklist

- [ ] **APPLE-01 (account deletion):** shipped v1.0, but verify (a) path ≤ 2 taps, (b) red/danger button, (c) double confirmation, (d) signOut + local wipe after, (e) edge function actually deletes Supabase rows (not just flags).
- [ ] **AUTH-01 (deep-link reset):** shipped v1.0, but verify on a real TestFlight build that (a) email link opens app not Safari, (b) token applies correctly, (c) `usePathname` guard handles cold-start race.
- [ ] **NOTIF-01 (local data clear on signOut):** shipped v1.0, but verify (a) re-login with different user shows no leftover cache, (b) all AsyncStorage keys with user data are enumerated and cleared (not just `criahub_mobile_theme_mode`).
- [ ] **UX-05 (biometric gate):** shipped v1.0, but verify on TestFlight (a) first-use prompt, (b) cancel returns to previous screen, (c) fallback to password works, (d) works on devices without biometrics enrolled.
- [ ] **Privacy Manifest:** NOT shipped — `app.config.ts` has no `privacyManifests`. Blocks upload.
- [ ] **Error Boundary:** NOT shipped — `grep` returns zero results. Any unhandled exception = crash.
- [ ] **Demo accounts:** NOT shipped — no seeded haras; no 3 role-specific accounts.
- [ ] **Privacy Policy URL:** NOT shipped — no URL decided, nothing hosted.
- [ ] **Support URL:** NOT shipped — no URL decided.
- [ ] **Screenshots:** NOT shipped — none generated from production build with seeded data.
- [ ] **App Icon 1024×1024:** present in `assets/images/icon-criahub.png` — verify **no alpha channel** (RGB only; PNG transparency rejected).
- [ ] **Review Notes (pt-BR + EN):** NOT shipped — must explain (a) Guideline 4.8 exemption, (b) UGC isolation for 1.2, (c) ABCCMM relationship for 5.2, (d) test scripts for each role.
- [ ] **App Privacy Nutrition Labels:** NOT configured in ASC.
- [ ] **Age Rating Questionnaire:** NOT configured in ASC.
- [ ] **Export Compliance:** `ITSAppUsesNonExemptEncryption: false` set in `app.config.ts` — ✓ good; re-verify after build.
- [ ] **`expo-build-properties` + iOS deployment target:** NOT configured; defaults used.
- [ ] **Microphone permission:** declared in config — audit if actually needed; remove if not.
- [ ] **`app.json` empty `{}`:** ✓ currently safe; document in config-audit PR.
- [ ] **EAS Submit credentials:** verify ASC API Key is configured AND `ascAppId` is in `eas.json`.
- [ ] **Build number auto-increment:** verify `eas.json` has `autoIncrement: true` for iOS production.
- [ ] **Minimum iOS 15.1 tested on real device:** required before submit.
- [ ] **IPv6-only network tested:** required once before submit.
- [ ] **Console logs stripped in production build:** 9 files currently have un-gated `console.*`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rejection: Privacy Manifest missing | LOW (1-2h) | Add `privacyManifests` block to `app.config.ts` → rebuild → resubmit. No review-cycle reset since build was rejected at upload not review. |
| Rejection: Crash on launch | MEDIUM (1-5 days) | Add ErrorBoundary + timeouts → TestFlight test cycle → reviewer retest. Starts 24-48h review clock over. |
| Rejection: Account deletion not discoverable | LOW (2-4h UX change) | Move button to top-level Conta screen; rebuild; respond in Resolution Center with screenshot showing new path — sometimes re-reviewed within 24h without full resubmit. |
| Rejection: Privacy Policy URL broken | LOW (1-3h) | Host policy on `criahub.com.br/privacidade`, update URL in ASC, respond in Resolution Center — often no rebuild needed. |
| Rejection: 4.8 SiwA misinterpretation | LOW (response only) | Respond in Resolution Center citing exemption for "company's own account system" — usually resolved without rebuild. If insists, fallback: add Apple Sign-In (40-80h work, 1-2 TestFlight cycles). |
| Rejection: Demo account empty | MEDIUM (4-8h) | Seed the demo haras with realistic data; update review notes; resubmit metadata (no binary change needed if you just updated ASC review info). |
| Rejection: Screenshots don't match | LOW (2-4h per round) | Generate new screenshots from production build; upload to ASC; resubmit. Often no binary rebuild. |
| Rejection: UGC Guideline 1.2 | MEDIUM (review notes) or HIGH (reporting flow implementation) | Try review notes first (isolation argument). If denied, implement `mailto:` report + block mechanism (1-3 days work + TestFlight cycle). |
| Rejection: ABCCMM trademark concern | HIGH (legal) | Either (a) remove ABCCMM references from metadata/screenshots, OR (b) obtain written authorization from ABCCMM — can take weeks. |
| Rejection: iPv6 crash | HIGH | Debug root cause in Supabase or native dep; may require native fix or library swap; 1-2 weeks. |
| Crash in TestFlight but passes review | MEDIUM | Expedited Review request (1-2 day turnaround for critical crashes) + fix + resubmit. |

---

## Pitfall-to-Phase Mapping

Assumes roadmap phases as suggested in `SUMMARY.md` (6 phases for v1.1 Apple Launch):

| # | Pitfall | Prevention Phase | Verification |
|---|---------|------------------|--------------|
| 1 | Missing Privacy Manifest | **Phase 1 — Config Audit** | `plutil -p Payload/*.app/PrivacyInfo.xcprivacy` after EAS production build must show all 4 category entries |
| 2 | No Error Boundary / Crash on launch | **Phase 2 — Runtime Hardening** | Airplane mode cold-launch test shows Retry UI; manual `throw` in dev shows boundary |
| 3 | Demo account empty data | **Phase 4 — Demo Data Seeding** | Log in as each of 3 roles on TestFlight build; all tabs show realistic data |
| 4 | Guideline 4.8 misinterpretation | **Phase 3 — Metadata & Review Notes** | Review notes text explicitly cites exemption; no OAuth buttons in LoginScreen |
| 5 | Account deletion discoverability | **Phase 3 — Pre-submit Review Pass** | Stopwatch test: < 3 taps + < 10s from fresh login to "conta excluída" |
| 6 | Privacy Policy URL broken | **Phase 3 — Legal Assets** | `curl -I https://...` returns 200; content review checklist passes |
| 7 | Nutrition Labels mismatch | **Phase 3 — Metadata & Legal Assets** | Three-way diff: `privacyManifests.NSPrivacyCollectedDataTypes` === ASC App Privacy === Privacy Policy URL |
| 8 | Usage descriptions too generic | **Phase 1 — Config Audit** | Each Info.plist description names specific feature/screen |
| 9 | Age rating wrong | **Phase 3 — Metadata** | Questionnaire matches actual app content; UGC = Yes; Medical = Infrequent/Mild |
| 10 | UGC Guideline 1.2 requirements | **Phase 3 — Review Notes** | Isolation argument drafted; minimum in-app contact email available |
| 11 | ABCCMM trademark | **Phase 3 — Review Notes + Metadata Audit** | No ABCCMM logo anywhere; review notes explain relationship |
| 12 | Metadata/screenshot/app mismatch | **Phase 3 — Metadata (after Phase 1-2)** | Feature list = description = screenshots = ASC categories |
| 13 | Min iOS deployment target | **Phase 1 — Config Audit** | `expo-build-properties` installed + `deploymentTarget: "15.1"` set |
| 14 | Build number duplicate | **Phase 5 — Build & Upload** | `eas.json` has `autoIncrement: true`; verify after each build |
| 15 | `app.json` vs `app.config.ts` drift | **Phase 1 — Config Audit** | `app.json` size ≤ 3 bytes (just `{}`) |
| 16 | Export compliance wrong | **Phase 1 — Config Audit** | `plutil -p Info.plist \| grep Encryption` returns `ITSAppUsesNonExemptEncryption => 0` |
| 17 | Notification prompt never triggers | **Phase 2 — Runtime Hardening** | Cold-launch demo account → within 1st minute see notification prompt (soft opt-in) |
| 18 | IPv6-only network failure | **Phase 2 — Runtime Hardening** | Test on NAT64 network at least once |
| 19 | Dev logs leaking to production | **Phase 2 — Runtime Hardening** | `grep -rn "console\." src/ \| grep -v "__DEV__"` returns 0 matches |
| 20 | Deep-link password reset broken | **Phase 5 — TestFlight Validation** | End-to-end test on real device: email → app opens → reset completes |

---

## Recommended Phase Structure (for Roadmapper)

Based on the 20 pitfalls above and dependencies:

1. **Phase 1 — Config Audit & Hardening** (addresses 1, 8, 13, 15, 16; partial 7)
   - Privacy Manifest block
   - `expo-build-properties` deployment target
   - Usage description rewrites + microphone audit
   - `app.json` confirmation
   - Verification: `plutil` checks + EAS build dry-run
2. **Phase 2 — Runtime Hardening** (addresses 2, 17, 18, 19)
   - Root ErrorBoundary + 15s auth bootstrap timeout
   - Notification soft opt-in
   - Console log audit
   - IPv6-only network test
3. **Phase 3 — Metadata, Legal, Review Notes** (addresses 4, 5, 6, 7, 9, 10, 11, 12)
   - Privacy Policy + Support URLs hosted
   - ASC App Privacy (Nutrition Labels)
   - Age rating questionnaire
   - Review notes (pt-BR + EN) covering 4.8 exemption, 1.2 UGC isolation, 5.2 ABCCMM, 5.1.1v deletion path
   - Keywords, description, promotional text
4. **Phase 4 — Demo Data Seeding** (addresses 3)
   - Create `apple-review-haras` in Supabase
   - Seed animals, gestations, tasks, field reports, ownership
   - Create 3 role-specific demo accounts
   - Test each role on TestFlight
5. **Phase 5 — Assets, Build & Upload** (addresses 14, 20; verifies 1-13)
   - Generate screenshots from production build with seeded data (iPhone 6.9" + iPad 13")
   - `eas build --profile production --platform ios`
   - Verify build number auto-increment
   - Upload to TestFlight
   - End-to-end test deep-link reset, biometric gate, account deletion on real device
6. **Phase 6 — Submit to Review**
   - Final metadata sync in ASC
   - Submit for review
   - Respond to any Resolution Center messages within 24h

Phase 4 must precede Phase 5 (screenshots need seeded data). Phase 3 can run partially in parallel with Phase 1-2 (metadata writing doesn't block config changes). Phase 5 must follow Phases 1-4 sequentially.

---

## Sources

- **Apple App Store Review Guidelines** (verified via WebFetch 2026-04-17): https://developer.apple.com/app-store/review/guidelines/ — 4.8 (Login Services), 5.1.1(v) (Account Deletion), 5.1.2 (Data Use), 2.1 (App Completeness), 2.3.3 (Accurate Metadata), 1.2 (UGC Safety), 3.1.3(b) (Reader Apps)
- **Apple Privacy Manifest documentation** (Apple Developer): referenced for API category reason codes (CA92.1, C617.1, 35F9.1, E174.1); specific values corroborated via Expo SDK 54 docs example
- **Expo Privacy Manifest guide** (Context7 `/expo/expo` → `docs/pages/guides/apple-privacy.mdx`): configuration pattern `ios.privacyManifests` — HIGH confidence
- **Expo SDK 54 config reference** (Context7 `/expo/expo` → `docs/public/llms-sdk-v54.0.0.txt`): `ios.privacyManifests`, `ios.supportsTablet`, `ios.config.usesNonExemptEncryption` — HIGH confidence
- **Expo store-assets guide** (Context7 `/expo/expo` → `docs/pages/guides/store-assets.mdx`): iPhone 1320×2868 or 1290×2796; iPad 2064×2752 or 2048×2732 — HIGH confidence
- **Expo EAS Metadata schema** (Context7 `/expo/expo` → `docs/pages/eas/metadata/schema.mdx`): reviewer demo credentials, metadata fields, categories — HIGH confidence
- **Expo Router error handling** (Context7 `/expo/expo` → `docs/pages/router/error-handling.mdx`): `ErrorBoundary` export pattern — HIGH confidence
- **Expo app-versions doc** (Context7 `/expo/expo` → `docs/pages/build-reference/app-versions.mdx`): explicit quote *"One common cause for app store rejections is submitting a build with a duplicate version number."* — HIGH confidence
- **Expo apple-authentication README** (Context7): SiwA is required for apps using third-party auth; CriaHub is exempt per guideline text — HIGH confidence
- **Expo build-properties config** (Context7 `/expo/expo` → SDK 53 docs, carries to SDK 54): iOS `deploymentTarget: "15.1"` — HIGH confidence
- **Supabase-js React Native support** (Context7 `/supabase/supabase-js`): AsyncStorage-backed session persistence confirmed; this is the AsyncStorage path that triggers UserDefaults Required Reason API — HIGH confidence
- **CriaHub Mobile repo state** (directly read): `app.config.ts`, `app.json` (empty `{}`), `CLAUDE.md`, `.planning/PROJECT.md` — authoritative
- **CriaHub Mobile code scan** (Grep): 9 files with un-gated `console.*`; 0 files with `ErrorBoundary`; 20 files with `any` in service mappers; no `privacyManifests` anywhere — all HIGH confidence
- WebSearch was BLOCKED in this environment; empirical 2024-2026 rejection-frequency rankings (e.g., "top 10 rejection reasons") are therefore LOW confidence where asserted and have been flagged. Guideline text and Expo docs are HIGH confidence via Context7/WebFetch.

---

*Pitfalls research for: first-time iOS App Store submission of Expo SDK 54 / RN 0.81 B2B app (pt-BR, no IAP, managed workflow, EAS Build + Submit)*
*Researched: 2026-04-17 by gsd-new-milestone Phase 6 (Research)*
*For gsd-roadmapper: each pitfall above maps to a phase with an explicit verification check. Phase-to-pitfall table is canonical; derive phase success criteria from it.*
