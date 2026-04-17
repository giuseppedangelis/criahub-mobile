# Phase 11: 11-build-testflight - Context

**Gathered:** 2026-04-17 (fast-path, no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

Gerar assets visuais (ícone + screenshots), configurar credenciais EAS, fazer primeira production build iOS e validar em device real via TestFlight. Escopo: ícone sRGB sem alpha (BUILD-01), screenshots iPhone 6.9" + iPad 13" (BUILD-02), ASC API Key (BUILD-03), eas.json + scripts package.json (BUILD-04), EAS env vars Supabase (BUILD-05), first production build antes de 2026-04-28 (BUILD-06), upload TestFlight + validação iPhone+iPad (BUILD-07). **Fora do escopo:** Submit for Review (Phase 12), qualquer mudança de código ou metadata textual (já feito nas Phases 7-9).

</domain>

<decisions>
## Implementation Decisions

### Ícone Validation (BUILD-01)

- **D-01:** Path: `./assets/images/icon-criahub.png`. Rodar `sips -g all ./assets/images/icon-criahub.png` — verificar:
  - `pixelWidth: 1024`
  - `pixelHeight: 1024`
  - `hasAlpha: no` (se yes, regenerar)
  - Profile: sRGB
- **D-02:** Se `hasAlpha: yes`, strip alpha via `sips -s format png --removeAlpha in.png --out out.png` ou re-exportar do design source (Figma/Sketch) como PNG 24-bit.
- **D-03:** Não adicionar bordas arredondadas manualmente — Apple aplica mask iOS automaticamente. Ícone deve ser square com design full-bleed.

### Screenshots (BUILD-02)

- **D-04:** Usar iOS Simulator. Configurações:
  - **iPhone 6.9":** iPhone 16 Pro Max (1320×2868 — aliás escala 3x de 440×956 points)
  - **iPad 13":** iPad Pro 13-inch (M4) (2064×2752 — portrait)
- **D-05:** Método de captura: Device menu → Screenshot (Cmd+S). Salvar em `apple/assets/screenshots/iphone-6.9/` e `apple/assets/screenshots/ipad-13/`.
- **D-06:** Quantidade: 5-7 screenshots por device. Sugestão de sequência:
  1. Login / Home
  2. Plantel (lista de animais) — mostra volume de dados
  3. Ficha de animal (AnimalDetail)
  4. Agenda / Tarefas
  5. Veterinário — Rotina
  6. Campo — Report de parto (field GPS)
  7. Conta (com opção "Excluir conta" visível em 2 taps)
- **D-07:** Build usado para screenshots: preview profile (`eas build --profile preview --platform ios` para simulator .app) rodando contra Supabase de produção com seed (apple-review-haras criado na Phase 10).
- **D-08:** Se taglines em screenshots, usar PT-BR curtas (ex: "Plantel completo no seu bolso", "Campo offline de verdade"). Opcional na v1.1 — screenshots crus também passam.

### ASC API Key (BUILD-03)

- **D-09:** Gerar em App Store Connect → Users and Access → Integrations → Team Keys → Generate API Key. Role: **App Manager** (não Developer — precisa de Submit permission).
- **D-10:** Download arquivo `.p8` (apenas uma vez — Apple não mostra depois). Salvar em lugar seguro (password manager, NÃO no repo).
- **D-11:** Capturar: Issuer ID, Key ID, path do `.p8`. Upload ao EAS: `eas credentials` → iOS → App Store Connect API Key → Add new.

### eas.json + package.json (BUILD-04)

- **D-12:** Adicionar ao `eas.json`:
  ```json
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "{captured in Phase 9}",
        "appleTeamId": "{user's Team ID}",
        "ascApiKeyPath": "./credentials/asc-api-key.p8",
        "ascApiKeyIssuerId": "...",
        "ascApiKeyId": "..."
      }
    }
  }
  ```
  OU usar `ascApiKeyId` referenciando credential já uploaded ao EAS vault (preferred — evita ter `.p8` path local).
- **D-13:** Adicionar scripts ao `package.json`:
  ```json
  "submit:ios": "eas submit --profile production --platform ios --latest",
  "metadata:pull": "eas metadata:pull --platform ios",
  "metadata:push": "eas metadata:push --platform ios"
  ```

### EAS Env Vars (BUILD-05)

- **D-14:** Migrar Supabase creds de `.env.local` para EAS env production:
  ```bash
  eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co" --visibility plaintext
  eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon_key>" --visibility sensitive
  ```
- **D-15:** Confirmar que `app.config.ts` lê de `process.env.NEXT_PUBLIC_SUPABASE_URL` (já faz isso — linha 114-115). EAS injeta via environment no build time.
- **D-16:** **Nota:** nomes atuais são `NEXT_PUBLIC_SUPABASE_*` (legado Next.js). Manter nome por compat; mover apenas o storage. Renomear para `EXPO_PUBLIC_*` é milestone futuro (refactor).

### First Production Build (BUILD-06)

- **D-17:** Rodar **ANTES de 2026-04-28** para evitar bater no Xcode 26 SDK floor. Se passar dessa data, atualizar `eas.json` production iOS profile com `"image": "latest"` ou aceitar a imagem Xcode 26.
- **D-18:** Comando: `eas build --profile production --platform ios`. Esperar ~15-25min. Baixar `.ipa` resultante OU deixar EAS fazer direct upload.
- **D-19:** Validar o build artifact ANTES de submit:
  ```bash
  unzip -o build.ipa -d build-ipa/
  plutil -p build-ipa/Payload/*.app/PrivacyInfo.xcprivacy
  ```
  Deve listar 4 Required Reason APIs (CA92.1, C617.1, 35F9.1, E174.1) + 7 NSPrivacyCollectedDataTypes.
- **D-20:** Se PrivacyInfo.xcprivacy está vazio ou faltando entries, bug em Phase 7 IOS-01 — voltar e fix.

### TestFlight Upload & Validation (BUILD-07)

- **D-21:** Upload via `eas submit --profile production --platform ios --latest`. EAS cuida do binário → ASC → TestFlight ingest (~5-10min para aparecer no TestFlight).
- **D-22:** Adicionar internal testers (até 100): seu Apple ID + 1-2 de teste se disponível. External beta (até 10k) é opcional nesta fase.
- **D-23:** Instalar via TestFlight app em **iPhone real** (iOS 15+) e **iPad real** (iPadOS 15+). Validações obrigatórias:
  - AUTH-01: login → logout → "Esqueci senha" → email → link deep link `criahubmobile://reset-password` → reset → re-login OK
  - APPLE-01: Conta → Excluir conta → dupla confirmação → conta deletada, user deslogado
  - UX-05: acessar /financeiro → biometric prompt → acesso liberado
  - 4 personas sem crash: criador-demo, veterinario-demo, peao-demo (login + navegação básica em cada)
- **D-24:** Se qualquer validação falhar, fix no código → nova build → nova TestFlight. NÃO prosseguir para Phase 12.

### Claude's Discretion

- Copy exato de taglines nos screenshots (se incluir)
- Ordem exata da sequência de 5-7 screenshots
- Usar iPhone 15 Pro Max vs iPhone 16 Pro Max simulator (ambos produzem 1320×2868; preferir 16 Pro Max se disponível no Xcode)
- Se fazer App Preview video (15-30s) — não obrigatório, pode deferir pra v1.2
- Nomes exatos das pastas em `apple/assets/screenshots/`

</decisions>

<canonical_refs>
## Canonical References

### Research (this milestone)

- `.planning/research/STACK.md` §EAS Build + Submit workflow
- `.planning/research/ARCHITECTURE.md` §Pattern 3 Versioning, §Pattern 6 Credentials vault, §Pattern 7 Env vars
- `.planning/research/FEATURES.md` §Block D Screenshots, §Block I EAS Submit
- `.planning/research/PITFALLS.md` §#12 Screenshots from empty haras, §#14 Build numbering, §#20 AUTH-01 validation
- `.planning/research/SUMMARY.md` §Phase 11 Assets Build & Upload

### Milestone docs

- `.planning/REQUIREMENTS.md` §BUILD-01 a BUILD-07
- `.planning/ROADMAP.md` §Phase 11

### Expo / Apple official

- https://docs.expo.dev/submit/ios/ — EAS Submit iOS workflow
- https://docs.expo.dev/app-signing/app-credentials/#app-store-connect-api-key — ASC API Key setup
- https://developer.apple.com/help/app-store-connect/create-an-app-record/ — App record creation
- https://developer.apple.com/design/human-interface-guidelines/app-icons — ícone specs
- https://docs.expo.dev/build/eas-json/ — eas.json schema

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `eas.json` — profiles `preview` e `production` já existem; só adicionar bloco `submit.production.ios`
- `app.config.ts` linha 114-115 — já lê `process.env.NEXT_PUBLIC_SUPABASE_*` via `extra` (compatível com EAS env vars)
- `./assets/images/icon-criahub.png` — existente; só validar

### Established Patterns

- npm scripts em `package.json` (já tem `ios`, `android`, `start`)
- EAS project ID `4069d525-bbce-4f86-9863-a51ccfe4af32` (já em eas.json)

### Integration Points

- `eas.json` → adicionar `submit.production.ios`
- `package.json` → adicionar scripts submit/metadata
- `.env.local` → migrar vars para EAS env (pode manter local para dev; EAS não lê `.env.local` em cloud build)

### Anti-Patterns a Evitar

- Não commitar `.p8` em `credentials/` — usar EAS vault OU gitignored path
- Não setar `buildNumber` manualmente em `app.config.ts` — deixar EAS auto-increment via `cli.appVersionSource: "remote"` (já configurado)
- Não buildar com Supabase staging accidentalmente — confirmar EAS env aponta para prod

</code_context>

<specifics>
## Specific Ideas

- **Xcode 26 SDK floor em 2026-04-28** é deadline duro. Primeiro build precisa rodar antes disso OU aceitar que EAS worker image vai atualizar (testar com "latest").
- Screenshots com seed (apple-review-haras) mostram dados reais ao reviewer — Plantel cheio, Agenda com tarefas, Campo com reports. Visual quality de marketing.
- TestFlight internal test permite iterar rápido (builds novos disponíveis em 5-10min pós-upload). Usar antes de External Beta.

</specifics>

<deferred>
## Deferred Ideas

- External Beta com testers públicos (até 10k) — útil mas não obrigatório pra v1.1
- App Preview video (15-30s) — v1.2
- Screenshots localizadas en-US — v1.2 quando tiver listing EN
- CI/CD integration com EAS Build — milestone de DevOps futuro
- Xcode Cloud como alternativa ao EAS — stick com EAS até v2

</deferred>

---

*Phase: 11-build-testflight*
*Context gathered: 2026-04-17 via fast-path*
