# Phase 7: 07-ios-binary-config - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Configurar o binário iOS do CriaHub Mobile (mudanças em `app.config.ts`, plugins Expo e artefatos que o EAS empacota no `.ipa`) para passar na validação automática da Apple ao fazer upload pelo TestFlight. Escopo: Privacy Manifest declarado, deployment target explícito, usage descriptions específicas por tela, remoção de permissões fantasma, verificação de flags de export compliance. **Fora do escopo:** qualquer mudança em código React/RN em runtime (isso é Phase 8), metadata textual/visual do ASC (Phase 9), assets da loja (Phase 11).

</domain>

<decisions>
## Implementation Decisions

### Privacy Manifest (IOS-01)

- **D-01:** Lock `NSPrivacyCollectedDataTypes` agora nesta fase com os 7 tipos consolidados na pesquisa — Phase 9 espelhará exatamente (não sobrescreve). Destrava Phase 7 sem criar dependência cíclica.
- **D-02:** 7 tipos de dados a declarar (todos linked to user, none tracked, todos "App Functionality"):
  1. `EmailAddress` — auth via Supabase (linked, App Functionality)
  2. `Name` — profile.full_name e owner/cotista names em cadastros
  3. `UserID` — Supabase `user.id` + `haras_id` em queries
  4. `PhotosOrVideos` — fotos de animais, documentos, foto de perfil (bucket `animal-photos`)
  5. `OtherUserContent` — anotações livres em partos, observações veterinárias, notas de campo
  6. `PreciseLocation` — GPS de field reports (parto/ocorrência) via `expo-location`
  7. `OtherDataTypes` — registros oficiais ABCCMM (número de registro, chip, data de nascimento) — declarar como "Other" para cobrir dado sensível do domínio
- **D-03:** 4 Required Reason APIs declaradas (`NSPrivacyAccessedAPITypes`):
  - `NSPrivacyAccessedAPICategoryUserDefaults` → reason `CA92.1` (AsyncStorage via `@react-native-async-storage/async-storage` para session, notifications, offline queue)
  - `NSPrivacyAccessedAPICategoryFileTimestamp` → reason `C617.1` (expo-file-system / media files)
  - `NSPrivacyAccessedAPICategorySystemBootTime` → reason `35F9.1` (React Native / Expo internals)
  - `NSPrivacyAccessedAPICategoryDiskSpace` → reason `E174.1` (expo-file-system / device info)

### Usage Descriptions (IOS-04)

- **D-04:** Full rewrite com contexto específico de tela/uso para cada permissão. Apple 2.3.8/2.3.10 rejeita textos genéricos em 2026.
- **D-05:** Rascunho de reescrita (draft — pode ser ajustado na execução pelo plan):
  - `NSCameraUsageDescription`: "O CriaHub usa a câmera para fotografar animais do seu plantel, documentos oficiais (registros ABCCMM) e sua foto de perfil. A câmera é acionada apenas quando você toca em 'Adicionar foto' nas telas de Animal, Conta ou Campo."
  - `NSPhotoLibraryUsageDescription`: "O CriaHub acessa sua galeria para anexar fotos existentes de animais, documentos e avatar de perfil. Usado nas abas Plantel, Campo e Conta quando você escolhe 'Galeria' como origem da foto."
  - `NSPhotoLibraryAddUsageDescription`: "O CriaHub pode salvar na sua galeria comprovantes e imagens compartilhadas pelo app (ex: laudo veterinário exportado como imagem)."
  - `NSLocationWhenInUseUsageDescription`: "O CriaHub usa sua localização na aba Campo para registrar precisamente onde partos e ocorrências acontecem no haras. A localização só é acessada quando você abre o formulário de ocorrência e nunca em background."

### Phantom Permissions (IOS-05)

- **D-06:** `NSMicrophoneUsageDescription` removido de `infoPlist`. Confirmado via grep: zero uso de `expo-av`, `Audio.Recording`, `MediaTypeOptions.Videos`, `videoMaxDuration`; todos os `ImagePicker.launch*` usam `mediaTypes: ["images"]` apenas.
- **D-07:** `microphonePermission` removido do plugin `expo-image-picker` em `app.config.ts:89-90` em conjunto com D-06. Remover só do infoPlist deixaria Expo gerando a string de volta via plugin.

### Background Modes (IOS-06)

- **D-08:** `UIBackgroundModes: ["fetch"]` **mantido**. Confirmado via grep: `src/hooks/useBackgroundSync.ts` registra task `criahub-offline-sync` via `BackgroundFetch.registerTaskAsync` (OFFLINE-03 da v1.0). Remover quebraria sync offline de campo.
- **D-09:** `ITSAppUsesNonExemptEncryption: false` preservado — já setado em `app.config.ts:27`.
- **D-10:** Justificativa de `UIBackgroundModes: ["fetch"]` vai em `apple/docs/REVIEW_NOTES.md` (Phase 9): "Background Fetch é acionado pelo iOS periodicamente para flush da fila offline (`criahub-offline-sync` definida em `src/hooks/useBackgroundSync.ts`). Não usamos background location nem remote push."

### Version/BuildNumber (fora dos 6 REQs, mas tocado no plan)

- **D-11:** Let EAS decide. Primeira production build sai com o número que o remote counter tiver. Não executar `eas build:version:set` preemptivamente. `buildNumber` em `app.config.ts:25` fica como "1" mas é **ignorado** quando `cli.appVersionSource: "remote"` (atual em eas.json).

### app.json Cleanup (IOS-03)

- **D-12:** Deletar `app.json` (3 bytes, `{}` vazio) como **primeira** task da fase. Rationale: se qualquer tool (IDE, Expo CLI, EAS) ainda referencia, descobrimos cedo com build ainda não rodando. Evita race entre mudanças em app.config.ts e leitura stale do app.json.

### Execution Order (Phase 7 plan sequencing)

- **D-13:** Task order para o `gsd-planner`:
  1. Delete `app.json` (IOS-03)
  2. Install `expo-build-properties` e add plugin com `ios.deploymentTarget: "15.1"` (IOS-02)
  3. Rewrite usage descriptions (IOS-04) + remover microfone do infoPlist E do plugin expo-image-picker (IOS-05)
  4. Add `ios.privacyManifests` block com 4 Required Reason APIs + 7 NSPrivacyCollectedDataTypes (IOS-01)
  5. Verify `ITSAppUsesNonExemptEncryption: false` preservado, documentar UIBackgroundModes: ["fetch"] em CONTEXT do Phase 9 (IOS-06)
- **D-14:** Cada task é commit atômico. Se qualquer task quebrar `tsc --noEmit` ou o build local, o executor para e pede checkpoint.

### Claude's Discretion

- Exato formato JSON do `privacyManifests` (ordem de chaves, indentação) — seguir exemplo de Expo SDK 54 verbatim de STACK.md / Context7
- Decidir se move `expo-image-picker` plugin config OU se remove só a string `microphonePermission` do bloco existente (ambos funcionam; impacto em diff size)
- Formato exato dos `reason` arrays do Privacy Manifest (string vs string[] — Apple aceita ambos, Expo docs usam `["CA92.1"]`)

### Folded Todos

Nenhum todo pendente relevante para esta fase (o `gsd-sdk query todo.match-phase` não encontrou matches no scout — `.claude/scheduled_tasks.lock` deletado é fora de escopo e é artefato do Claude Code).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research (this milestone)

- `.planning/research/SUMMARY.md` — Síntese consolidada das 4 dimensões de research; contém exact phase mapping
- `.planning/research/STACK.md` §Privacy Manifest — JSON snippet pronto para copiar em `app.config.ts`
- `.planning/research/ARCHITECTURE.md` §Pattern 5 — integration map de `ios.privacyManifests` com app.config.ts
- `.planning/research/PITFALLS.md` §1, §8, §13, §15, §16 — pitfalls que esta fase adereça
- `.planning/research/FEATURES.md` §Block E — privacy foundation requirements

### Milestone docs

- `.planning/REQUIREMENTS.md` §IOS-01 a IOS-06 — REQs locked neste phase
- `.planning/ROADMAP.md` §Phase 7 — 5 success criteria observáveis
- `apple/docs/APP_STORE_CONNECT_FIELDS.md` §5 e §Blockers — contexto de como esta fase alimenta ASC

### Apple official (read at executor time)

- https://developer.apple.com/documentation/bundleresources/privacy_manifest_files — schema oficial do Privacy Manifest (verificar reason codes atuais)
- https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api — lista atualizada de Required Reason APIs (CA92.1, C617.1, 35F9.1, E174.1 são conservadores)

### Expo official (read at executor time)

- https://docs.expo.dev/guides/apple-privacy/ — exemplo de `ios.privacyManifests` em app.config.ts
- https://docs.expo.dev/versions/latest/sdk/build-properties/ — `expo-build-properties` schema para deploymentTarget

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/hooks/useBackgroundSync.ts` (registra task `criahub-offline-sync`) — prova que `UIBackgroundModes: ["fetch"]` é legítimo. NÃO alterar; só documentar em Review Notes (Phase 9).
- `app.config.ts:22-43` — bloco iOS existente com infoPlist e supportsTablet (mantido por D-v1.1-01)
- `app.config.ts:71-106` — array de plugins Expo onde entra o novo `expo-build-properties`

### Established Patterns

- **Managed workflow**: sem `ios/` nativo — mudanças tudo em `app.config.ts`. EAS gera nativo no build.
- **Dynamic config**: `app.config.ts` é dinâmico (lê dotenv) e é **authoritative** sobre `app.json`. Deletar `app.json` segue o pattern de não-duplicação.
- **Plugin array order**: convenção atual é declarar config de plugin inline como `[plugin, { options }]`. Seguir mesma convenção para `expo-build-properties`.

### Integration Points

- `app.config.ts` linha 71 (array `plugins`) — adicionar entry para `expo-build-properties`
- `app.config.ts` linha 22-43 (bloco `ios`) — adicionar `privacyManifests` campo + editar `infoPlist` (rewrite usage descriptions + remover NSMicrophoneUsageDescription)
- `app.config.ts` linha 38-39 (microphonePermission em infoPlist) — deletar
- `app.config.ts` linha 89-90 (microphonePermission em expo-image-picker plugin) — deletar
- `app.json` raiz do repo — deletar arquivo inteiro
- `package.json` — `npm install expo-build-properties` (adicionar como regular dep, não devDep)

### Anti-Patterns a Evitar

- **Não** hand-edit `ios.buildNumber` em app.config.ts pensando que controla App Store versão — é ignorado com `appVersionSource: "remote"`
- **Não** adicionar Privacy Manifest em arquivo separado `PrivacyInfo.xcprivacy` manual — Expo gera automaticamente a partir de `app.config.ts`
- **Não** inflar escopo adicionando capabilities (Push, Associated Domains) — essas não fazem parte de Phase 7

</code_context>

<specifics>
## Specific Ideas

- **`NSPrivacyCollectedDataTypes` "Other Data Types" entry** para ABCCMM — o usuário considera registros oficiais (registro/chip/nascimento) como dado sensível de domínio que não cai exatamente em nenhuma categoria Apple padrão. Declarar como `NSPrivacyCollectedDataTypeOtherDataTypes` com purpose "App Functionality" e justificativa em Review Notes (Phase 9).
- **Usage description tom**: user prefere texto direto em pt-BR citando tela ("Na aba Campo...") vs. abstrato ("This app uses..."). Estilo alinhado com Apple guideline 2.3.8 (clarity) e 2.3.10 (specificity).
- **Versioning**: user não quer burn de tempo em seed manual. Let EAS run its course é o default pragmático.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma ideia fora-de-escopo foi levantada nesta discussão. Todas as decisões ficaram dentro da fronteira de Phase 7 (mudanças em `app.config.ts`, plugins Expo, deleção de `app.json`).

Itens que **vão para outras fases do milestone v1.1** (não deferred, apenas não-phase-7):

- **Privacy Policy URL hospedada** — Phase 9 (ASC-02)
- **Review Notes defendendo 4.8 exemption e background fetch** — Phase 9 (ASC-05)
- **Demo seed + accounts** — Phase 10
- **Ícone sips validation, screenshots, EAS credentials, first build, TestFlight** — Phase 11
- **Supabase redirect allowlist + Submit for Review** — Phase 12

</deferred>

---

*Phase: 07-ios-binary-config*
*Context gathered: 2026-04-17*
