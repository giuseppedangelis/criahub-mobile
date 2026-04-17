# Requirements — Milestone v1.1 Submissão iOS App Store

**Milestone goal:** Levar o CriaHub Mobile à App Store (iPhone + iPad) passando pela review da Apple na primeira tentativa, com configuração correta, assets completos e todos os campos do App Store Connect preenchidos.

**Branch:** `apple`
**Defined:** 2026-04-17

---

## Milestone v1.1 Requirements

### iOS Binary Config (IOS-xx)

Prefixo para mudanças em `app.config.ts`, plugins Expo e config nativa que vira parte do binário antes de buildar.

- [ ] **IOS-01**: Declarar Privacy Manifest (`ios.privacyManifests`) em `app.config.ts` com 4 Required Reason APIs (`CA92.1` UserDefaults, `C617.1` FileTimestamp, `35F9.1` SystemBootTime, `E174.1` DiskSpace) + `NSPrivacyCollectedDataTypes` espelhando Nutrition Labels do ASC
- [ ] **IOS-02**: Adicionar plugin `expo-build-properties` com `ios.deploymentTarget: "15.1"` para floor explícito de iOS
- [ ] **IOS-03**: Deletar arquivo `app.json` (3 bytes vazios — footgun de drift com `app.config.ts`)
- [ ] **IOS-04**: Reescrever usage descriptions iOS em `app.config.ts` (Location, Camera, PhotoLibrary, PhotoLibraryAdd) com texto específico de tela/uso, não genérico
- [ ] **IOS-05**: Auditar `NSMicrophoneUsageDescription` via grep de `expo-image-picker` com `videoMaxDuration` / `allowsEditing`; remover se sem uso real de gravação de áudio (D-v1.1-03)
- [ ] **IOS-06**: Verificar `ITSAppUsesNonExemptEncryption: false` preservado; adicionar justificativa para `UIBackgroundModes: ["fetch"]` em Review Notes (já setado para OFFLINE-03)

### Runtime Hardening (RUNTIME-xx)

Prefixo para mudanças em código React/RN que evitam crash/white-screen durante review. Bloco **novo** não coberto em v1.0.

- [ ] **RUNTIME-01**: Adicionar `ErrorBoundary` root em `app/_layout.tsx` (Expo Router v6 shape) com fallback UI e opção de retry; previne white-screen em crashes de render
- [ ] **RUNTIME-02**: Aplicar timeout de 15s no bootstrap do `AuthContext` com `setIsLoading(false)` garantido em `finally`; previne spinner infinito em rede do reviewer
- [ ] **RUNTIME-03**: Auditar e gatear os 9+ arquivos com `console.*` em `src/` — wrap em `if (__DEV__)` ou remover; previne vazamento de logs de debug em produção
- [ ] **RUNTIME-04**: Soft opt-in para permissão de notificações — pedir só após primeiro login bem-sucedido, não no launch; reviewer vê o app usável antes de prompt
- [ ] **RUNTIME-05**: Smoke test de IPv6-only (via NAT64 no macOS) validando que Supabase funciona; Apple testa em IPv6-only rede

### App Store Connect Metadata + Legal Assets (ASC-xx)

Prefixo para campos do console ASC, docs markdown e URLs hospedadas. `APP_STORE_CONNECT_FIELDS.md` já foi drafado como referência geral.

- [ ] **ASC-01**: Criar app record no App Store Connect (bundle `com.criahub.mobile`, primary language pt-BR, Primary Category Business, Secondary Productivity, SKU `CRIAHUB-IOS-V1`); capturar numeric `ascAppId`
- [ ] **ASC-02**: Hospedar **Privacy Policy** em `criahub.com.br/privacidade` com conteúdo LGPD-completo (controlador, DPO, Art. 7/18, retenção, exclusão) e Nutrition Labels espelhados — documento fonte em `apple/docs/PRIVACY_POLICY.md`
- [ ] **ASC-03**: Hospedar **Support URL** em `criahub.com.br/suporte` com canais de contato — documento fonte em `apple/docs/SUPPORT_URL_CONTENT.md`
- [ ] **ASC-04**: Escrever `apple/docs/PRIVACY_NUTRITION_LABELS.md` com 7 tipos de dados coletados (Email, Name, User ID, Photos/Videos, Audio se aplicável, Other User Content, Precise Location), todos linked, none tracked, todos "App Functionality"
- [ ] **ASC-05**: Escrever `apple/docs/REVIEW_NOTES.md` (pt-BR + EN) cobrindo os 5 Watch Out For: 4.8 exemption (Supabase = company's own account system), 5.1.1(v) delete path, 1.2 UGC isolation via RLS-per-haras, 5.2 ABCCMM attribution, 2.5.4 background fetch justificativa
- [ ] **ASC-06**: Preencher Age Rating questionnaire no ASC (expected 4+): Medical=Infrequent/Mild, UGC=Yes scoped to tenant, todos outros None
- [ ] **ASC-07**: Auditoria **three-way privacy consistency**: `ios.privacyManifests.NSPrivacyCollectedDataTypes` (binário) === ASC App Privacy Nutrition Labels (console) === conteúdo Privacy Policy URL. Diff line-by-line antes de Submit
- [ ] **ASC-08**: Preencher metadata textual no ASC (Name, Subtitle, Description, Promotional Text, Keywords, Release Notes v1.0.0, Copyright, Support URL, Marketing URL opcional) a partir dos rascunhos em `APP_STORE_CONNECT_FIELDS.md`; adicionar EN-US Review Notes

### Demo Data (DEMO-xx)

Dados seeded no Supabase para o reviewer conseguir navegar o app.

- [ ] **DEMO-01**: Criar `apple-review-haras` no Supabase com seed: ≥12 animais (6 ABCCMM + 6 avulso), 3 gestações, 5 tarefas de agenda, 2 field reports, 1 condomínio, 2 consultas veterinárias. Script SQL idempotente em `supabase/migrations/` ou `scripts/`
- [ ] **DEMO-02**: Criar 3 demo accounts (criador, veterinário, peão) em `auth.users` bound via `haras_members` ao `apple-review-haras`; documentar credenciais em `apple/docs/DEMO_ACCOUNTS.md` (gitignored)

### Build, Assets & TestFlight (BUILD-xx)

Geração de assets, credenciais, build EAS, upload, validação em device real via TestFlight.

- [ ] **BUILD-01**: Validar ícone em `./assets/images/icon-criahub.png` — 1024×1024, sRGB, sem alpha channel (`sips -g hasAlpha`); regenerar se necessário
- [ ] **BUILD-02**: Gerar screenshots para App Store — iPhone 6.9" (1320×2868) e iPad 13" (2064×2752), 5–7 por dispositivo, capturados via iOS Simulator com build preview apontando pro Supabase demo seed
- [ ] **BUILD-03**: Gerar ASC API Key (`.p8`) em ASC → Users & Access → Integrations → Team Keys (role App Manager); upload ao EAS via `eas credentials`
- [ ] **BUILD-04**: Atualizar `eas.json` com `submit.production.ios.ascAppId` + `appleTeamId`; adicionar scripts `submit:ios`, `metadata:pull`, `metadata:push` em `package.json`
- [ ] **BUILD-05**: Migrar Supabase URL e anon key de `.env.local` para EAS env vars: `eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL` (plaintext) e `--name EXPO_PUBLIC_SUPABASE_ANON_KEY --visibility sensitive`
- [ ] **BUILD-06**: Primeira production build iOS: `eas build --profile production --platform ios` ANTES de 2026-04-28 (Xcode 26 SDK floor) OU pinar `"image": "latest"` no profile; verificar `PrivacyInfo.xcprivacy` via `plutil -p`
- [ ] **BUILD-07**: Upload para TestFlight via `eas submit --profile production --platform ios --latest`; validar em iPhone E iPad real: AUTH-01 deep link reset password, APPLE-01 fluxo de exclusão ≤ 10s e ≤ 2 taps, UX-05 biometria em /financeiro, 4 personas (criador/vet/peão/admin) não crashando

### Submission (SUBMIT-xx)

Ato final de submeter à review.

- [ ] **SUBMIT-01**: Configurar Supabase Auth Dashboard → URL Configuration allowlist `criahubmobile://reset-password` para viabilizar AUTH-01 em builds reais
- [ ] **SUBMIT-02**: Submit for Review no ASC com Manual Release selecionado; monitorar Resolution Center com SLA ≤ 4h para responder mensagens da Apple; mapear qualquer rejeição para recovery table em PITFALLS.md

---

## Future Requirements (deferred)

Itens úteis mas não-bloqueantes para v1.1:

- [ ] **FUTURE-01**: TestFlight External Beta pre-flight (24–48h review Apple) antes do submit App Store — catch privacy manifest e crash issues baratos. Mover pra v1.1 execução se lead time permitir; senão pula
- [ ] **FUTURE-02**: App Preview video (15–30s, 6.9" iPhone) — aumenta conversão mas não é obrigatório
- [ ] **FUTURE-03**: Localização en-US completa (hoje só Review Notes em EN; listing fica pt-BR only)
- [ ] **FUTURE-04**: Trader Status (EU DSA) declaration — só relevante se listar em países EU
- [ ] **FUTURE-05**: EAS Metadata pipeline via `store.config.json` (Tier 2) — graduar na v1.2 depois de tier markdown estabilizado
- [ ] **FUTURE-06**: Sign in with Apple (se Apple rejeitar v1.1 em 4.8, reactive; caso contrário, mantém decisão D-v1.1-02)

---

## Out of Scope

Explícito para evitar escopo inflado:

- **Android submit** — milestone v1.2. Branch `apple` é iOS-only. Google Play workflow tem requirements diferentes (Data Safety form vs Privacy Labels, etc) e não pode atrasar iOS
- **Features novas do app** — v1.1 é pipeline de submit; qualquer bug funcional fora do caminho de review fica para v1.2
- **PERM-02, MONO-01, MONO-02** (deferred de v1.0) — code quality puro, zero impacto em review; ficam para milestone v1.2 de cleanup
- **Remote push notifications** — app usa só local notifications. Habilitar APNs capability gera credentials pollution e não traz valor para v1.1
- **Private `animal-photos` bucket migration** — hardening bom, mas nonce em storage paths (v1.0 RLS-04) já é suficiente; bucket privado + signed URLs é milestone próprio
- **Sign in with Apple implementation** — D-v1.1-02. Revisitar só se Apple rejeitar 4.8
- **Universal Links / Associated Domains** — deep link scheme-only (`criahubmobile://`) é suficiente para reset password
- **Substituir `any` em 20+ mappers Supabase** — solução real seria gerar tipos via Supabase CLI (escopo próprio). Por ora, ErrorBoundary (RUNTIME-01) + console gating (RUNTIME-03) mitigam risco
- **CI/CD setup** — ausência de CI é aceita; typecheck local + tests Jest + review de plano são a rede de segurança

---

## User Decisions Locked

| ID | Decisão | Afeta REQ |
|----|---------|-----------|
| D-v1.1-01 | Manter `ios.supportsTablet: true` + entregar screenshots iPad | BUILD-02, BUILD-07 |
| D-v1.1-02 | Sem Sign in with Apple; aceitar risco 4.8 + defender em Review Notes | ASC-05, FUTURE-06 |
| D-v1.1-03 | Auditar e remover `NSMicrophoneUsageDescription` se sem uso; manter `UIBackgroundModes: ["fetch"]` | IOS-05, IOS-06 |
| D-v1.1-04 | Validação ícone via `sips` já documentada | BUILD-01 |

---

## Traceability (filled by roadmap)

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| IOS-01 | — | — | — |
| IOS-02 | — | — | — |
| IOS-03 | — | — | — |
| IOS-04 | — | — | — |
| IOS-05 | — | — | — |
| IOS-06 | — | — | — |
| RUNTIME-01 | — | — | — |
| RUNTIME-02 | — | — | — |
| RUNTIME-03 | — | — | — |
| RUNTIME-04 | — | — | — |
| RUNTIME-05 | — | — | — |
| ASC-01 | — | — | — |
| ASC-02 | — | — | — |
| ASC-03 | — | — | — |
| ASC-04 | — | — | — |
| ASC-05 | — | — | — |
| ASC-06 | — | — | — |
| ASC-07 | — | — | — |
| ASC-08 | — | — | — |
| DEMO-01 | — | — | — |
| DEMO-02 | — | — | — |
| BUILD-01 | — | — | — |
| BUILD-02 | — | — | — |
| BUILD-03 | — | — | — |
| BUILD-04 | — | — | — |
| BUILD-05 | — | — | — |
| BUILD-06 | — | — | — |
| BUILD-07 | — | — | — |
| SUBMIT-01 | — | — | — |
| SUBMIT-02 | — | — | — |

**Total:** 29 active REQs + 6 future + 9 out-of-scope bullets

---

*Last updated: 2026-04-17 — v1.1 milestone started*
