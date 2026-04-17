# Phase 9: 09-asc-metadata-legal - Context

**Gathered:** 2026-04-17 (fast-path, no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

Produzir toda a metadata textual, URLs legais hospedadas e Review Notes que o App Store Connect e o reviewer da Apple precisam para a v1.1. Escopo: app record no ASC (ASC-01), URLs live (ASC-02/03), docs markdown source-of-truth em `apple/docs/`, three-way privacy consistency (ASC-07), age rating + metadata textual (ASC-06/08). **Fora do escopo:** mudanças em binário (Phase 7), código React (Phase 8), demo seed (Phase 10), screenshots/build/upload (Phase 11).

</domain>

<decisions>
## Implementation Decisions

### App Record ASC (ASC-01)

- **D-01:** Bundle ID `com.criahub.mobile` (já reservado no Apple Developer). Primary language: Portuguese (Brazil). Primary Category: **Business**. Secondary Category: **Productivity**. SKU: `CRIAHUB-IOS-V1`.
- **D-02:** Capturar `ascAppId` numérico após criar o record (visível em App Information → Apple ID). Anotar em `apple/docs/ASC_APP_ID.md` (gitignored) ou diretamente em `eas.json` na Phase 11.

### Privacy Policy (ASC-02)

- **D-03:** Hospedar em `https://criahub.com.br/privacidade`. Source de conteúdo em `apple/docs/PRIVACY_POLICY.md` — doc fonte em markdown, depois renderizado pelo time web em HTML.
- **D-04:** Conteúdo LGPD-completo: (i) Controlador + CNPJ, (ii) Encarregado de Dados (DPO) com email de contato, (iii) Base legal por categoria (Art. 7), (iv) Direitos do titular (Art. 18) incluindo exclusão, (v) Prazo de retenção, (vi) Transferência internacional (Supabase hosts outside BR), (vii) Cookies/trackers (none).
- **D-05:** **Three-way consistency:** lista de dados coletados em Privacy Policy DEVE bater exatamente com `ios.privacyManifests.NSPrivacyCollectedDataTypes` (Phase 7, IOS-01) e com as Nutrition Labels do ASC (ASC-04). Qualquer divergência = rejeição 5.1.2.

### Support URL (ASC-03)

- **D-06:** Hospedar em `https://criahub.com.br/suporte`. Source em `apple/docs/SUPPORT_URL_CONTENT.md`.
- **D-07:** Conteúdo mínimo: email de suporte, FAQ básico (login, esqueci senha, exclusão de conta, fale conosco), horário de atendimento, link de WhatsApp (opcional).

### Privacy Nutrition Labels (ASC-04)

- **D-08:** 7 data types (locked in Phase 7 D-02, replicar aqui):
  1. Email Address — Linked, not tracked, "App Functionality"
  2. Name — Linked, not tracked, "App Functionality"
  3. User ID — Linked, not tracked, "App Functionality"
  4. Photos or Videos — Linked, not tracked, "App Functionality"
  5. Other User Content — Linked, not tracked, "App Functionality"
  6. Precise Location — Linked, not tracked, "App Functionality"
  7. Other Data Types (ABCCMM records) — Linked, not tracked, "App Functionality"
- **D-09:** Escrever `apple/docs/PRIVACY_NUTRITION_LABELS.md` como checklist marcável (a ser preenchido no console ASC).

### Review Notes (ASC-05)

- **D-10:** `apple/docs/REVIEW_NOTES.md` em pt-BR com tradução en-US ao final. Cobre os 5 Watch Out For da SUMMARY.md:
  1. **Guideline 4.8 exemption** — "Supabase is our managed backend service, not a third-party identity provider. We use first-party email/password only. SiwA exception per 'company's own account system' clause."
  2. **Guideline 5.1.1(v) deletion path** — "Conta tab → Configurações → Excluir conta → dupla confirmação → edge function elimina dados de Supabase. APPLE-01 shipped em v1.0."
  3. **Guideline 1.2 UGC isolation** — "B2B multi-tenant. Cada haras isolado via RLS (Row Level Security). UGC (notas, observações) visível APENAS para equipe convidada do haras. Nenhum feed público, nenhuma busca cross-haras. Equivalente a workspace privado."
  4. **Guideline 5.2 ABCCMM attribution** — "Criadores importam seus próprios registros oficiais de planilhas que exportam do ABCCMM (associação do cavalo Mangalarga). O CriaHub não é afiliado ao ABCCMM, não revende dados. Campo `abccmm_rowid` marca fields imutáveis originados da importação oficial."
  5. **Guideline 2.5.4 UIBackgroundModes: ["fetch"]** — "Background Fetch acordado pelo iOS periodicamente para flush da fila offline de Campo/Vet (task `criahub-offline-sync` definida em `src/hooks/useBackgroundSync.ts`). Não usamos background location, nem remote push."
- **D-11:** Instrução extra no Review Notes: "Por favor NÃO clique em Excluir Conta na demo — isso deleta os dados que outros reviewers precisam testar. Use outra conta demo se precisar testar o fluxo de exclusão."

### Age Rating (ASC-06)

- **D-12:** Expected rating: **4+**. Responder questionnaire:
  - Cartoon/Fantasy Violence: None
  - Realistic Violence: None
  - Prolonged Graphic Violence: None
  - Sexual Content/Nudity: None
  - Profanity/Crude Humor: None
  - Alcohol/Tobacco/Drugs: None
  - Mature/Suggestive Themes: None
  - Horror/Fear Themes: None
  - **Medical/Treatment Info: Infrequent/Mild** (cuidados veterinários animais, não humanos)
  - Gambling: None
  - Unrestricted Web Access: None
  - **User Generated Content: Yes** (notas, observações, comentários em animais/partos)

### Three-Way Consistency Audit (ASC-07)

- **D-13:** Criar script ou checklist manual `apple/docs/PRIVACY_CONSISTENCY_AUDIT.md` que compara:
  - Coluna A: `ios.privacyManifests.NSPrivacyCollectedDataTypes` (de `app.config.ts` Phase 7)
  - Coluna B: ASC App Privacy Nutrition Labels (do console)
  - Coluna C: Lista de dados em `criahub.com.br/privacidade`
- **D-14:** Audit obrigatório ANTES de `eas submit` (Phase 11) e novamente ANTES de Submit for Review (Phase 12).

### Metadata Textual ASC (ASC-08)

- **D-15:** Todos os campos de copy em `apple/docs/APP_STORE_CONNECT_FIELDS.md` (já drafted no milestone kickoff) são source of truth para preenchimento do console.
- **D-16:** Preencher via console web App Store Connect para v1.1 (não usar EAS Metadata). EAS Metadata Tier 2 fica para v1.2+.

### Claude's Discretion

- Exato wording dos hyperlinks e emails de contato em Privacy Policy
- Formato exato da seção de FAQ em Support URL
- Tom do Review Notes (formal vs cordial) — optar por cordial em pt-BR com tradução formal en-US
- Se incluir timestamp de "última atualização" em Privacy Policy — sim, padrão LGPD

</decisions>

<canonical_refs>
## Canonical References

### Research (this milestone)

- `.planning/research/FEATURES.md` §Block B, §Block C, §Block E, §Block G
- `.planning/research/PITFALLS.md` §#4, §#5, §#7, §#9, §#10, §#11, §#12, §#20
- `.planning/research/SUMMARY.md` §Phase 9 ASC Metadata & Legal

### Milestone docs

- `.planning/REQUIREMENTS.md` §ASC-01 a ASC-08
- `.planning/ROADMAP.md` §Phase 9
- `apple/docs/APP_STORE_CONNECT_FIELDS.md` — rascunho de todos os campos ASC com copy em pt-BR

### Apple official

- https://developer.apple.com/app-store/review/guidelines/ — 4.8, 5.1.1(v), 5.1.2, 1.2, 5.2, 2.5.4
- https://www.apple.com/legal/privacy/en-ww/ — template de privacy policy
- https://developer.apple.com/app-store/app-privacy-details/ — Nutrition Labels taxonomy

### LGPD

- https://www.lgpdbrasil.com.br/a-lgpd/ — checklist LGPD (Art. 7, Art. 18)

</canonical_refs>

<code_context>
## Existing Code Insights

Esta fase é **majoritariamente non-code** — produz markdown docs, textos de copy, e preenche console ASC. Não toca src/.

Único arquivo que pode ser tocado: `eas.json` (em BUILD-04, mas essa REQ está em Phase 11). Phase 9 só captura `ascAppId` em doc.

</code_context>

<specifics>
## Specific Ideas

- Privacy Policy HTML ficará hospedada pelo time web em `criahub.com.br/privacidade`. Timing: pode ser o gargalo da fase (lead time web). Iniciar draft cedo.
- Review Notes em pt-BR + EN — Apple aceita em qualquer idioma, mas EN acelera para reviewers internacionais.
- Três-way consistency é a causa #1 de rejeição 5.1.2 — audit checklist é non-negotiable.

</specifics>

<deferred>
## Deferred Ideas

- en-US full listing localization (description, keywords, screenshots) — v1.2
- App Preview video — v1.2
- EAS Metadata Tier 2 (store.config.json) — v1.2
- Trader Status EU — se listar em EU, v1.2

</deferred>

---

*Phase: 09-asc-metadata-legal*
*Context gathered: 2026-04-17 via fast-path*
