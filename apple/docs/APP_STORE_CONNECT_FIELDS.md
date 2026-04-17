# App Store Connect — Referência Exaustiva de Campos (CriaHub Mobile)

> **Objetivo:** Lista completa de todos os campos que o App Store Connect, o Xcode e o EAS Submit exigem para publicar a primeira versão do CriaHub Mobile (iOS) na App Store. Cada campo traz rascunho de resposta baseado no código do projeto, limite/formato, e indicação de quando depende de decisão externa.
>
> **Contexto:** branch `apple`, primeira submissão, bundle ID `com.criahub.mobile`, Expo SDK 54, App Store Connect (não B2B / não Enterprise).
>
> **Fonte de verdade do app no repo:** `app.config.ts`, `.planning/PROJECT.md`, `CLAUDE.md`.

---

## Legenda de status

- 🔴 **OBRIGATÓRIO** — Apple bloqueia submissão sem
- 🟡 **OPCIONAL** — pode ficar vazio, mas muitas vezes recomendado
- 🔵 **CONDICIONAL** — depende de escolha (ex: preço pago, conteúdo específico)
- 🟢 **Rascunho pronto** — resposta derivada do código
- 🟠 **AGUARDANDO INPUT** — só o Giuseppe/CriaHub pode fornecer
- 🔶 **Rascunho + validar** — texto proposto, confirmar se reflete negócio

---

## Checklist resumo (topo do doc)

| #  | Seção                        | Campo                                              | Status  | Precisa input do Giuseppe?                  |
|----|------------------------------|----------------------------------------------------|---------|---------------------------------------------|
| 1  | App Information              | Name                                               | 🟢      | Não (confirmar "CriaHub" vs "CRIAHUB Mobile") |
| 2  | App Information              | Subtitle                                           | 🔶      | Validar slogan curto                        |
| 3  | App Information              | Bundle ID                                          | 🟢      | Não (`com.criahub.mobile`)                  |
| 4  | App Information              | SKU                                                | 🔶      | Confirmar convenção                         |
| 5  | App Information              | Primary Language                                   | 🟢      | Não (pt-BR)                                 |
| 6  | App Information              | Privacy Policy URL                                 | 🟠      | **Sim** — URL hospedada                     |
| 7  | App Information              | Privacy Choices URL (LGPD/GDPR)                    | 🟠      | Se existe página separada                   |
| 8  | App Information              | Category (Primary)                                 | 🔶      | Validar "Business" vs "Productivity"        |
| 9  | App Information              | Category (Secondary)                               | 🔶      | Validar "Utilities"                         |
| 10 | App Information              | Content Rights (terceiros?)                        | 🟢      | Não (sem conteúdo de terceiros)             |
| 11 | App Information              | Age Rating                                         | 🟢      | Não (resposta do questionário é "4+")       |
| 12 | Pricing and Availability     | Price tier                                         | 🟠      | **Sim** — free ou paid?                     |
| 13 | Pricing and Availability     | Availability (países)                              | 🟠      | **Sim** — Brasil only ou global?            |
| 14 | Pricing and Availability     | Distribution (Public / Custom B2B / Educational)   | 🔶      | Público (App Store pública)                 |
| 15 | App Privacy                  | Data Types collected (nutrition labels)            | 🟢      | Rascunho completo abaixo                    |
| 16 | Version Information          | What's New in This Version                         | 🔶      | Rascunho pronto                             |
| 17 | Version Information          | Promotional Text (170)                             | 🔶      | Rascunho pronto                             |
| 18 | Version Information          | Description (4000)                                 | 🔶      | Rascunho curto + longo                      |
| 19 | Version Information          | Keywords (100 chars)                               | 🔶      | Rascunho pronto                             |
| 20 | Version Information          | Support URL                                        | 🟠      | **Sim** — URL de suporte                    |
| 21 | Version Information          | Marketing URL                                      | 🟡      | Opcional                                    |
| 22 | Version Information          | Copyright                                          | 🟠      | Nome legal da empresa                       |
| 23 | Build                        | EAS Build binary upload                            | 🟢      | Processo documentado                        |
| 24 | Age Rating Questionnaire     | 13 perguntas                                       | 🟢      | Todas respondidas abaixo                    |
| 25 | App Review Information       | Sign-in required + Demo account                    | 🟠      | **Sim** — criar conta demo                  |
| 26 | App Review Information       | Contact (First/Last name, Phone, Email)            | 🟠      | **Sim**                                     |
| 27 | App Review Information       | Notes                                              | 🔶      | Rascunho pronto                             |
| 28 | App Review Information       | Attachment                                         | 🟡      | Opcional                                    |
| 29 | Version Release              | Manual / Automatic / Scheduled                     | 🔶      | Recomendação "Manual" na primeira           |
| 30 | Export Compliance            | Uses encryption?                                   | 🟢      | Não (já flag `ITSAppUsesNonExemptEncryption: false`) |
| 31 | Content Rights               | Third-party content?                               | 🟢      | Não                                         |
| 32 | IDFA / Advertising           | Usa IDFA?                                          | 🟢      | Não                                         |
| 33 | Screenshots                  | 6.9" / 6.5" / iPad 13"                             | 🟠      | **Sim** — gerar                             |
| 34 | App Previews (vídeo)         | Opcional                                           | 🟡      | Opcional                                    |
| 35 | App Icon                     | 1024x1024 PNG                                      | 🟢      | Existe em `./assets/images/icon-criahub.png` — validar resolução |
| 36 | Localization                 | pt-BR primary + EN opcional                        | 🟢      | pt-BR apenas nesta primeira versão          |
| 37 | TestFlight (pré-submit)      | Info adicional + beta test groups                  | 🔵      | Antes da submit pública                     |

---

# 1. App Information

Seção permanente do app (só muda em milestones específicos, não a cada release).

### Name 🔴 OBRIGATÓRIO

- **O que é:** nome que aparece sob o ícone no Spring­board do iPhone e como título principal na App Store.
- **Limite/formato:** 30 caracteres, sem emoji, não pode conter "free", "sale", etc. Deve ser único na App Store.
- **Rascunho de resposta:** `CriaHub` (7 chars) — mais curto e reconhecível que "CRIAHUB Mobile".
  - Observação: `app.config.ts:9` tem `name: "CRIAHUB Mobile"`. Essa é a display do bundle no device. Na loja, recomenda-se `CriaHub`. Se o Giuseppe quiser manter a marca em caixa-alta como no logo, `CRIAHUB` (7 chars) também cabe.
- **Precisa decisão do usuário?** Sim — escolher entre `CriaHub` / `CRIAHUB` / `CriaHub — Gestão de Haras` (27 chars, cabe e comunica valor).

### Subtitle 🟡 OPCIONAL

- **O que é:** linha secundária logo abaixo do nome na ficha da loja.
- **Limite/formato:** 30 caracteres.
- **Rascunho de resposta (3 opções, escolher 1):**
  1. `Gestão de haras e plantel` (26 chars)
  2. `Plantel, reprodução e campo` (27 chars)
  3. `Seu haras no bolso` (18 chars)
- **Precisa decisão do usuário?** Sim — escolher uma das três (ou propor outra).

### Bundle ID 🔴 OBRIGATÓRIO

- **O que é:** identificador único do binário iOS. Imutável depois que o primeiro build é aceito.
- **Limite/formato:** reverse-DNS, registrado no developer.apple.com.
- **Rascunho de resposta:** `com.criahub.mobile` (já em `app.config.ts:24`).
- **Precisa decisão do usuário?** Não — apenas confirmar que está registrado no Apple Developer Portal (App IDs).

### SKU 🔴 OBRIGATÓRIO

- **O que é:** string interna de controle (não aparece ao usuário). Usado em relatórios financeiros.
- **Limite/formato:** até 255 caracteres, ASCII, sem espaços. Imutável.
- **Rascunho de resposta:** `CRIAHUB-MOBILE-IOS-001` ou `com.criahub.mobile` (reutilizar bundleId funciona).
- **Precisa decisão do usuário?** Sim — escolher convenção; sugestão: `CRIAHUB-IOS-V1`.

### Primary Language 🔴 OBRIGATÓRIO

- **O que é:** idioma padrão da ficha na loja e fallback quando o usuário está em locale sem tradução.
- **Limite/formato:** dropdown fixo.
- **Rascunho de resposta:** `Portuguese (Brazil)` — pt-BR. Todo o app está em pt-BR (CLAUDE.md linha sobre i18n: "All user-facing copy is in Portuguese (pt-BR). Dates via Intl.DateTimeFormat('pt-BR'). No i18n library.").
- **Precisa decisão do usuário?** Não.

### Privacy Policy URL 🔴 OBRIGATÓRIO

- **O que é:** URL pública (HTTPS) com a política de privacidade. Apple agora exige em todas as submissões.
- **Limite/formato:** URL HTTPS válida, 255 chars, deve abrir página web legível em desktop e mobile.
- **Rascunho de resposta:** 🟠 **AGUARDANDO INPUT** — precisa da URL. Sugestão: `https://criahub.com.br/privacidade` ou `https://app.criahub.com.br/politica-de-privacidade`.
  - Obrigações mínimas do conteúdo (LGPD + Apple 5.1.1):
    - Quais dados são coletados (email, nome, foto de perfil, fotos de animais, localização GPS em relatos de campo, documentos, áudios)
    - Finalidade (operação do haras, auditoria)
    - Compartilhamento (Supabase como data processor)
    - Retenção (permanência enquanto conta ativa; deleção via APPLE-01)
    - Direitos do titular (acesso, correção, portabilidade, exclusão)
    - Contato do DPO/encarregado LGPD
    - Referência à exclusão in-app (Conta → Excluir conta)
- **Precisa decisão do usuário?** **Sim — URL hospedada e texto publicado.**

### Privacy Choices URL 🟡 OPCIONAL

- **O que é:** URL dedicada para usuários exercerem direitos de privacidade (opt-out, deleção, portabilidade). Apple começou a pedir pra apps com data collection em 2024.
- **Rascunho de resposta:** Se não houver página dedicada, deixar vazio. O próprio app já cumpre isso via `AccountScreen` → Excluir conta (APPLE-01, edge function `delete-account`, `account_deletion_requests` audit table). Na política de privacidade, descrever o caminho in-app.
- **Precisa decisão do usuário?** Só se decidir criar página web separada.

### Category (Primary) 🔴 OBRIGATÓRIO

- **O que é:** categoria principal na App Store. Define onde o app aparece em browse.
- **Limite/formato:** dropdown Apple.
- **Rascunho de resposta:** `Business`
  - Justificativa: app é ferramenta de gestão B2B (haras). Alternativas válidas:
    - `Productivity` (se quiser posicionamento mais genérico)
    - `Lifestyle` (menos adequado — nicho agro)
- **Precisa decisão do usuário?** Sim — escolher `Business` ou `Productivity`.

### Category (Secondary) 🟡 OPCIONAL

- **O que é:** categoria secundária. Opcional mas recomendado (dobra exposição em browse).
- **Rascunho de resposta:** `Utilities` (justificativa: app tem funcionalidades de campo — GPS, fotos, fila offline) OU `Lifestyle` (público criador de cavalos).
- **Precisa decisão do usuário?** Sim — ou deixar vazio.

### Content Rights 🔴 OBRIGATÓRIO

- **O que é:** checkbox "Does your app contain, show, or access third-party content?"
- **Rascunho de resposta:** `No` — o app só exibe conteúdo criado pelo próprio usuário (fotos, documentos, dados de animais). Não incorpora vídeos do YouTube, nem feeds de terceiros, nem áudios licenciados.
- **Precisa decisão do usuário?** Não.

### Age Rating 🔴 OBRIGATÓRIO

- **O que é:** faixa etária calculada pelo questionário (ver seção 7). Vira a classificação visível (4+, 9+, 12+, 17+).
- **Rascunho de resposta esperado:** **4+** (sem violência, sem conteúdo sexual, sem álcool/drogas, sem UGC aberto ao público).
- **Precisa decisão do usuário?** Não — sai do questionário.

---

# 2. Pricing and Availability

### Price Tier 🔴 OBRIGATÓRIO

- **O que é:** tier de preço Apple (USD/BRL mapeado). Free = tier 0.
- **Limite/formato:** dropdown. Se pago, definir preço base em USD e Apple converte.
- **Rascunho de resposta:** 🟠 **AGUARDANDO INPUT**
  - Opção A: **Free** (tier 0) — distribuição ampla, monetização externa (assinatura no app é outra história)
  - Opção B: **Paid** (tier X) — assinatura via In-App Purchase? O app atualmente **NÃO tem IAP** (verificado: zero ocorrências de `expo-in-app-purchases`, `RevenueCat` no repo). Se optar por pago, precisaria configurar IAP (nova fase).
- **Precisa decisão do usuário?** **Sim — modelo de negócio.** Recomendação: começar Free, sem IAP, já que CriaHub é B2B nicho e provavelmente fatura via contrato fora do app.

### Availability (países/regiões) 🔴 OBRIGATÓRIO

- **O que é:** lista de países/territórios onde o app é vendido/distribuído.
- **Rascunho de resposta:** 🟠 **AGUARDANDO INPUT**
  - Recomendação: **Brasil apenas** na primeira submissão.
    - Justificativa: app 100% em pt-BR, integra com ABCCMM (Associação Brasileira de Criadores de Cavalo Mangalarga Marchador), contexto regulatório brasileiro (LGPD).
    - Expandir depois se houver tradução EN ou demanda externa.
- **Precisa decisão do usuário?** Sim — confirmar "Brasil only" ou listar países específicos.

### Distribution (Public / Custom / Unlisted) 🔵 CONDICIONAL

- **O que é:** tipo de distribuição.
  - `Public` (App Store pública)
  - `Custom B2B` (Apple Business Manager — só clientes específicos)
  - `Unlisted` (não aparece em search, só via link direto — útil pra nichos)
  - `Educational` (discount pro edu)
- **Rascunho de resposta:** `Public` (App Store pública).
  - `Unlisted` seria tecnicamente uma boa pro nicho de haras (só quem tem o link instala), mas limita descoberta. Recomenda-se Public na primeira versão e avaliar Unlisted depois.
- **Precisa decisão do usuário?** Sim — se quiser Unlisted, precisa preencher formulário Apple explicando o caso.

### Pre-Orders 🟡 OPCIONAL

- **O que é:** deixa o app disponível para pré-encomenda antes do lançamento.
- **Rascunho de resposta:** `Disabled`. Primeiro lançamento já pós-aprovação.
- **Precisa decisão do usuário?** Não.

### Volume Purchase Program (Educational discount) 🟡 OPCIONAL

- **Rascunho de resposta:** Deixar desmarcado. Não aplicável a B2B agro.
- **Precisa decisão do usuário?** Não.

---

# 3. App Privacy (Privacy Nutrition Labels)

> Apple exige declarar TODOS os tipos de dados que o app (ou seus SDKs) coletam. Em 2025 isso é um dos maiores pontos de rejeição. A resposta **precisa refletir o código real** — auditores da Apple verificam permissões e SDKs. Abaixo está a mapeação derivada de `app.config.ts`, `src/services/*`, `src/lib/*`.

Para cada tipo, três perguntas Apple:
1. **Collected?** — Yes / No
2. **Linked to identity?** — sim se conectado a user/account
3. **Used for tracking?** — sim se usado pra advertising/cross-app tracking (Apple's definição)

E o propósito: `App Functionality`, `Analytics`, `Product Personalization`, `Developer's Advertising or Marketing`, `Third-Party Advertising`, `Fraud Prevention`, `Other Purposes`.

---

## 3.1 Contact Info

### Email Address 🟢 COLETADO

- **Collected?** Yes
- **Linked to identity?** Yes (é o próprio login Supabase — `src/contexts/AuthContext.tsx`)
- **Used for tracking?** No
- **Propósito:** `App Functionality` (autenticação + reset de senha)
- **Fonte no código:** login/signup via Supabase Auth email+password.

### Name 🟢 COLETADO

- **Collected?** Yes (nome/display_name armazenado no profile — `src/services/profile.ts`)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`

### Phone Number 🔵 CONDICIONAL

- **Collected?** Verificar se `profileService.save` captura telefone. Se a UI `AccountScreen` pedir telefone, Yes; caso contrário, No.
- **Linked to identity?** Yes (se coletado)
- **Used for tracking?** No
- **Propósito:** `App Functionality`
- **Precisa decisão do usuário?** Validar no app se telefone é campo de profile.

### Physical Address 🔴 NÃO COLETADO

- **Collected?** No — app não pede endereço de pessoa física.

### Other User Contact Info 🔴 NÃO COLETADO

- **Collected?** No

---

## 3.2 Health & Fitness

### Health 🔴 NÃO COLETADO

- **Collected?** No — dados de saúde são dos **animais** (cavalos), não do usuário humano. Apple considera "Health" só saúde humana. **Não declarar.**

### Fitness 🔴 NÃO COLETADO

- **Collected?** No

---

## 3.3 Financial Info

### Payment Info 🔴 NÃO COLETADO

- **Collected?** No — app não processa pagamento. `src/services/financial.ts` é sobre contas/despesas do haras (módulo financeiro interno de gestão), não cartão/PIX do usuário. Verificação: sem Stripe/MercadoPago/PagSeguro SDK no `package.json`.

### Credit Info 🔴 NÃO COLETADO

- **Collected?** No

### Other Financial Info 🔶 CONDICIONAL

- **Collected?** **Yes** — o módulo financeiro (`src/screens/CreatorFinancialScreen.tsx` + `src/services/financial.ts`) armazena lançamentos de contas a pagar/receber do haras (valores, fornecedores). Isso é "financial info" do negócio do usuário.
  - Apple interpretation: se o usuário insere valores e descrições financeiras da empresa dele, isso conta como "Other Financial Info" coletado.
- **Linked to identity?** Yes (ligado ao haras_id do usuário)
- **Used for tracking?** No
- **Propósito:** `App Functionality`
- **Observação:** Esse módulo é gated por biometria (UX-05 em `src/hooks/useBiometricGate.ts`) — útil mencionar nas Review Notes.

---

## 3.4 Location

### Precise Location 🟢 COLETADO

- **Collected?** Yes
- **Linked to identity?** Yes (armazenado vinculado ao user_id / haras_id como metadata de report de campo)
- **Used for tracking?** No
- **Propósito:** `App Functionality` (marcar onde um parto/ocorrência aconteceu)
- **Fonte no código:**
  - `src/screens/FieldHomeScreen.tsx:69` — `Location.requestForegroundPermissionsAsync()`
  - `src/screens/FieldHomeScreen.tsx:73` — `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`
  - `src/screens/FieldHomeHubScreen.tsx:43-46` — idem
  - `app.config.ts:40` — `NSLocationWhenInUseUsageDescription`
  - Plugin `expo-location` em `app.config.ts:94-99`
- **Observação crítica pra Apple:** Location é **When In Use** apenas (sem background). `Accuracy.Balanced` = ~100m. Não é "Precise" no sentido GPS <10m, mas Apple classifica qualquer coordenada como "Precise" se não for cidade/CEP. Declarar Precise Location.

### Coarse Location 🟡 TALVEZ

- **Collected?** Conservador: declarar **não** (já cobre-se com Precise). Apple pede 1 ou outro.

---

## 3.5 Sensitive Info

### Sensitive Info 🔴 NÃO COLETADO

- **Collected?** No — app não pede etnia, orientação sexual, religião, sindicato, dados biométricos brutos etc. (A biometria `expo-local-authentication` é **gate local via Secure Enclave**, não coletada pelo app — não conta como "sensitive info collected".)

---

## 3.6 Contacts

### Contacts 🔴 NÃO COLETADO

- **Collected?** No — app não acessa agenda do telefone.

---

## 3.7 User Content

### Photos or Videos 🟢 COLETADO

- **Collected?** Yes
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`
- **Fonte no código:**
  - `expo-image-picker` em `src/screens/AccountScreen.tsx` (foto de perfil), `src/components/animal/AnimalMediaActions.tsx` (fotos de animais), `src/screens/FieldHomeScreen.tsx` (reports de campo), `src/components/tasks/TaskExecutionModal.tsx`, `src/screens/VetAnimalChartScreen.tsx`
  - Armazenamento: Supabase Storage bucket `animal-photos` (ver `src/services/animal-media.ts`)

### Audio Data 🟢 COLETADO

- **Collected?** Yes — há `NSMicrophoneUsageDescription` em `app.config.ts:39` e no plugin `expo-image-picker:89-91`.
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`
- **Observação:** mesmo que a captura de áudio seja rara (reports em campo), a permissão está declarada → Apple exige declarar.

### Customer Support 🟡 CONDICIONAL

- **Collected?** No — app não tem chat de suporte embutido. Suporte é via Support URL (web/email).

### Other User Content 🟢 COLETADO

- **Collected?** Yes — documentos via `expo-document-picker` (`src/components/animal/AnimalMediaActions.tsx`, `src/components/tasks/TaskExecutionModal.tsx`, `src/screens/VetAnimalChartScreen.tsx`)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`
- **Observação:** textos livres (observações, nomes de animais, notas de prontuário) também são "Other User Content".

---

## 3.8 Browsing History 🔴 NÃO COLETADO

- **Collected?** No — app não registra histórico de navegação na web.

---

## 3.9 Search History 🔴 NÃO COLETADO

- **Collected?** No — searches de plantel (nome do animal) são locais/ad-hoc, não persistidas como "histórico".

---

## 3.10 Identifiers

### User ID 🟢 COLETADO

- **Collected?** Yes (user_id Supabase / haras_id no perfil)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`

### Device ID 🔴 NÃO COLETADO

- **Collected?** No — sem Firebase Analytics, Sentry, ou qualquer SDK que colete IDFV/IDFA. Verificado: zero imports de `Sentry`, `firebase`, `analytics`, `mixpanel`, `amplitude` em `src/`.

---

## 3.11 Purchases

### Purchase History 🔴 NÃO COLETADO

- **Collected?** No — sem IAP.

---

## 3.12 Usage Data

### Product Interaction 🔴 NÃO COLETADO

- **Collected?** No — sem SDK de analytics (Mixpanel/Amplitude/FB). Se futuramente adicionar, atualizar aqui.

### Advertising Data 🔴 NÃO COLETADO

- **Collected?** No

### Other Usage Data 🔴 NÃO COLETADO

- **Collected?** No

---

## 3.13 Diagnostics

### Crash Data 🔴 NÃO COLETADO

- **Collected?** No — sem Sentry, sem Bugsnag, sem Crashlytics. Apenas o crash reporter padrão da Apple (não precisa declarar; é opt-in do iOS).

### Performance Data 🔴 NÃO COLETADO

- **Collected?** No

### Other Diagnostic Data 🔴 NÃO COLETADO

- **Collected?** No

---

## 3.14 Other Data

### Other Data Types 🟢 COLETADO

- **Collected?** Yes — dados de **animais (cavalos)** que o usuário cadastra (nome, registro ABCCMM, genealogia, pelagem, saúde, reprodução, ocorrências). Apple não tem categoria "livestock" — cai em "Other User Content" (fotos/documentos) + "Other Data" (dados estruturados).
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Propósito:** `App Functionality`

---

## 3.15 Resumo declarável (copiar pro form do ASC)

| Tipo                   | Coletado | Linked? | Tracking? | Propósito         |
|------------------------|----------|---------|-----------|-------------------|
| Email Address          | Yes      | Yes     | No        | App Functionality |
| Name                   | Yes      | Yes     | No        | App Functionality |
| Phone Number           | Verificar na UI | Yes | No     | App Functionality |
| Precise Location       | Yes      | Yes     | No        | App Functionality |
| Other Financial Info   | Yes      | Yes     | No        | App Functionality |
| Photos or Videos       | Yes      | Yes     | No        | App Functionality |
| Audio Data             | Yes      | Yes     | No        | App Functionality |
| Other User Content     | Yes      | Yes     | No        | App Functionality |
| User ID                | Yes      | Yes     | No        | App Functionality |
| Other Data             | Yes      | Yes     | No        | App Functionality |

**Tracking:** `The developer does not use your data to track you.`

---

# 4. Version Information (por release)

### What's New in This Version 🔴 OBRIGATÓRIO (a partir da v2)

- **O que é:** texto "o que mudou" que aparece quando o usuário atualiza.
- **Limite/formato:** 4000 chars. Em v1.0 pode ser vazio (Apple mostra descrição).
- **Rascunho v1.0:**
  > Primeira versão do CriaHub Mobile. Gerencie seu haras no celular:
  > - Consulte seu plantel e a ficha de cada animal
  > - Registre ocorrências, nascimentos e tarefas em campo, mesmo offline
  > - Acompanhe reprodução, sanidade e genealogia
  > - Papéis distintos para criador, veterinário e funcionário de campo
  > - Dados sincronizados com a plataforma web CriaHub
- **Precisa decisão do usuário?** Revisar tom.

### Promotional Text 🟡 OPCIONAL

- **O que é:** texto dinâmico que pode ser alterado sem novo build (aparece no topo da descrição).
- **Limite/formato:** 170 chars.
- **Rascunho:**
  > Plataforma brasileira de gestão de haras: plantel, reprodução, sanidade e campo no seu bolso. Sincronizado com o CriaHub web. Funciona offline.
  - (146 chars)
- **Precisa decisão do usuário?** Validar.

### Description 🔴 OBRIGATÓRIO

- **O que é:** descrição completa do app na ficha da loja.
- **Limite/formato:** 4000 chars. pt-BR na versão primária.

#### Rascunho curto (~800 chars)

> O CriaHub Mobile é o aplicativo oficial da plataforma CriaHub para gestão de haras e plantel equino. Com ele, criadores, veterinários e equipes de campo operam o dia a dia do haras direto do celular — do escritório ao piquete.
>
> Principais recursos:
> • Plantel completo com ficha, fotos, documentos e genealogia de cada animal
> • Registro de ocorrências, nascimentos e tarefas em campo, com foto e GPS, mesmo sem internet
> • Acompanhamento de reprodução: coberturas, diagnósticos, partos e lavagens
> • Controle sanitário: vacinas, exames, medicações e lotes
> • Condomínio de cotistas com controle de presença e porcentagens
> • Módulo financeiro protegido por biometria
> • Perfis distintos para criador, veterinário, funcionário e assessor
> • Sincronização total com o CriaHub Web
>
> Integrado à ABCCMM: animais oficialmente registrados mantêm seus dados protegidos contra edição acidental.

#### Rascunho longo (~2500 chars)

> O CriaHub Mobile leva a gestão completa do seu haras para o celular. Desenvolvido para criadores, veterinários, funcionários e assessores, o aplicativo espelha a plataforma web CriaHub e permite operar o dia a dia — mesmo offline, no piquete ou na viagem.
>
> ━━━━━━━━━━━━━━━━━━━━━━━
> PARA QUEM É
> ━━━━━━━━━━━━━━━━━━━━━━━
> • Criadores e proprietários de haras
> • Médicos veterinários responsáveis
> • Funcionários e peões de campo
> • Assessores e consultores
>
> Cada perfil recebe as telas e permissões certas. Um único app, experiências distintas.
>
> ━━━━━━━━━━━━━━━━━━━━━━━
> PRINCIPAIS RECURSOS
> ━━━━━━━━━━━━━━━━━━━━━━━
>
> PLANTEL COMPLETO
> • Ficha de cada animal com foto, vídeo e documentos
> • Genealogia com pais e avós
> • Pelagem, sexo, categoria e registro ABCCMM
> • Localização por baia, pasto ou prestador de serviço
> • Condomínio de cotistas com porcentagens e presença
>
> TRABALHO EM CAMPO, MESMO OFFLINE
> • Registro de parto com foto, data e GPS
> • Reporte de ocorrências (ferimento, cólica, manejo)
> • Fila offline inteligente: o app sincroniza automaticamente quando a rede volta
> • Tarefas diárias e agenda de rotina
>
> REPRODUÇÃO
> • Coberturas (natural, IA, TE)
> • Diagnósticos ultrassonográficos
> • Lavagens e coleta de embrião
> • Estoque de sêmen congelado
> • Acompanhamento de gestação
>
> SANIDADE
> • Vacinas, vermífugos e medicações
> • Exames (brucelose, AIE, piroplasmose etc.)
> • Lotes sanitários
> • Prontuário do animal consolidado
>
> GESTÃO
> • Agenda compartilhada do haras
> • Equipe, papéis e permissões
> • Módulo financeiro protegido por biometria (Face ID / Touch ID)
> • Notificações locais de lembretes (partos esperados, devoluções)
>
> ━━━━━━━━━━━━━━━━━━━━━━━
> SEGURANÇA E PRIVACIDADE
> ━━━━━━━━━━━━━━━━━━━━━━━
> • Autenticação por e-mail e senha
> • Recuperação de senha in-app
> • Dados protegidos por RLS (Row-Level Security) no servidor
> • Exclusão de conta em dois cliques, com limpeza completa de dados
> • Conformidade com LGPD
> • O app nunca acessa dados de outro haras
>
> ━━━━━━━━━━━━━━━━━━━━━━━
> INTEGRAÇÃO ABCCMM
> ━━━━━━━━━━━━━━━━━━━━━━━
> Animais oficialmente registrados na ABCCMM têm seus campos oficiais bloqueados contra edição acidental — o app só permite editar o que a associação permite.
>
> ━━━━━━━━━━━━━━━━━━━━━━━
> SOBRE A PLATAFORMA
> ━━━━━━━━━━━━━━━━━━━━━━━
> O CriaHub é uma plataforma completa com versão web (criahub.com.br) e mobile. Os dados são os mesmos em ambos — comece no computador, continue no celular, sem perder nada.

- **Precisa decisão do usuário?** Escolher curto/longo; validar URL `criahub.com.br` existe.

### Keywords 🔴 OBRIGATÓRIO

- **O que é:** palavras-chave separadas por vírgula. **Não** repetir palavras já presentes no título/subtitle (a Apple indexa automaticamente). Sem espaços após vírgula.
- **Limite/formato:** 100 chars total, incluindo vírgulas.
- **Rascunho (97 chars):**
  ```
  haras,cavalo,equino,criador,plantel,abccmm,veterinario,reproducao,genealogia,manejo,fazenda
  ```
- **Precisa decisão do usuário?** Validar.

### Support URL 🔴 OBRIGATÓRIO

- **O que é:** URL de suporte (página web ou link de contato). Apple clica pra validar.
- **Rascunho:** 🟠 **AGUARDANDO INPUT** — sugestões:
  - `https://criahub.com.br/suporte`
  - `https://criahub.com.br/ajuda`
  - `mailto:suporte@criahub.com.br` (Apple aceita mailto mas página web é melhor)
- **Precisa decisão do usuário?** Sim — URL funcional.

### Marketing URL 🟡 OPCIONAL

- **O que é:** URL institucional do produto.
- **Rascunho:** `https://criahub.com.br` (se existir)
- **Precisa decisão do usuário?** Opcional — valida se domínio está no ar.

### Copyright 🔴 OBRIGATÓRIO

- **O que é:** string de copyright. Não precisa "©" (Apple adiciona).
- **Limite/formato:** Ano + nome legal (razão social ou pessoa).
- **Rascunho:** `2026 [Razão Social CriaHub LTDA.]`
- **Precisa decisão do usuário?** **Sim — razão social oficial da empresa.**

### Routing App Coverage File 🟡 OPCIONAL

- **O que é:** GeoJSON declarando áreas cobertas por app de navegação/transporte.
- **Rascunho:** Deixar vazio — não é app de rotas.
- **Precisa decisão do usuário?** Não.

### Version Number 🔴 OBRIGATÓRIO

- **O que é:** número semântico da versão visível ao usuário.
- **Limite/formato:** `X.Y.Z` (ex: `1.0.0`).
- **Rascunho:** `1.0.0` (já em `app.config.ts:11`).
- **Precisa decisão do usuário?** Não.

### Build Number (CFBundleVersion) 🔴 OBRIGATÓRIO

- **O que é:** número de build interno. Pode ser incrementado a cada upload sem mudar Version.
- **Limite/formato:** string numérica (ex: `1`, `2`, `100`).
- **Rascunho:** EAS incrementa automaticamente (`eas.json` perfil production: `ios.autoIncrement: "buildNumber"`). Começa em `1` (`app.config.ts:25`).
- **Precisa decisão do usuário?** Não.

---

# 5. Build

### Build Upload 🔴 OBRIGATÓRIO

- **O que é:** o IPA gerado precisa ser enviado ao App Store Connect.
- **Como enviar:** EAS Build + EAS Submit.
  ```bash
  # 1) Build de produção (gera .ipa assinado)
  npm run build:ios:release
  # equivalente a: npx eas-cli build --platform ios --profile production

  # 2) Submit pra App Store Connect
  npx eas-cli submit --platform ios --latest
  ```
- **Pré-requisitos no ASC:**
  - App criado com bundle ID `com.criahub.mobile`
  - Certificado de distribuição iOS + provisioning profile (EAS gerencia automaticamente se configurado)
  - `ASC_APP_ID` / API Key configurados no EAS (`.env.local` do EAS CLI ou `eas submit --non-interactive` com `appleId`/`ascAppId`/`appleTeamId`)
- **Processing time:** 15min–2h após upload pra build ficar disponível pra seleção no ASC.
- **Precisa decisão do usuário?** Validar se conta Apple Developer está ativa ($99/ano).

### Select Build for Version 🔴 OBRIGATÓRIO

- **O que é:** no App Store Connect, associar o build processado à versão 1.0.0.
- **Rascunho:** após upload, aguardar notificação "Ready to Submit" e selecionar.

---

# 6. App Review Information

### Sign-In Required 🔴 OBRIGATÓRIO

- **O que é:** flag informando à Apple se o app requer login.
- **Rascunho:** `Yes` — todo fluxo do app exige sessão Supabase autenticada (`app/index.tsx` redireciona pra `/(auth)/login` se `!session`).

### Demo Account — Username 🔴 OBRIGATÓRIO (se Sign-In = Yes)

- **O que é:** credencial que Apple Review usa pra testar o app.
- **Requisitos:**
  - Conta deve funcionar com internet estável
  - Idealmente ter **todos os 4 papéis** demonstráveis (criador, vet, peão, assessor) — ou 1 conta criador que mostre o máximo de features
  - **Dados populados** (pelo menos 2-3 animais com fotos, 1 gestação, 1 tarefa, 1 evento de agenda) — auditor precisa ver o app cheio
  - Dados **não-sensíveis** (não usar haras real de cliente)
- **Rascunho:** 🟠 **AGUARDANDO INPUT** — sugestão: criar conta dedicada
  - Email: `apple-review@criahub.com.br` (ou similar)
  - Senha: forte, sem caracteres que quebrem copy-paste
  - Haras de teste: `Haras Apple Demo` com ~5 animais fake (fotos stock-ish, genealogia fictícia)
- **Precisa decisão do usuário?** **Sim — criar conta e popular dados.**

### Demo Account — Password 🔴 OBRIGATÓRIO

- Mesma nota acima.

### Contact Information 🔴 OBRIGATÓRIO

- **First Name:** 🟠 Giuseppe (ou quem for assinante técnico)
- **Last Name:** 🟠 D'Angelis
- **Phone Number:** 🟠 (com DDI +55)
- **Email:** 🟠 `comercial@dizevolv.com` (já no MEMORY.md) — ou um específico da Apple
- **Precisa decisão do usuário?** **Sim — confirmar quem é o contato oficial.**

### Review Notes 🟡 OPCIONAL, MAS ESSENCIAL

- **O que é:** campo livre pra explicar ao auditor como usar o app. Texto que reduz rejeições por "o auditor não entendeu".
- **Limite/formato:** 4000 chars.
- **Rascunho:**
  > Olá, time de review da Apple. Obrigado pela análise.
  >
  > SOBRE O APP
  > O CriaHub Mobile é um aplicativo B2B para gestão de haras (criação de cavalos) no Brasil. É o cliente mobile da plataforma CriaHub web (https://criahub.com.br). O app NÃO é voltado ao consumidor final — é uma ferramenta profissional para proprietários, veterinários e funcionários de haras.
  >
  > COMO USAR A CONTA DEMO
  > 1. Faça login com as credenciais fornecidas acima.
  > 2. A conta tem papel "Criador" — você verá Dashboard, Plantel, Reprodução, Agenda e Conta.
  > 3. Em "Plantel" → toque em qualquer animal pra ver ficha completa (fotos, genealogia, documentos).
  > 4. Em "Reprodução" → veja coberturas e gestações cadastradas.
  > 5. Em "Conta" → "Excluir conta" demonstra o cumprimento de 5.1.1(v): o botão abre duplo-confirm e dispara a edge function delete-account que remove dados + apaga sessão local. **Por favor, NÃO clique em Excluir Conta na conta demo, pois inutiliza a credencial pra outros auditores.** Existe também o botão "Sair" no rodapé para teste de signOut normal.
  >
  > PAPÉIS MÚLTIPLOS
  > O app suporta 4 papéis (criador, veterinário, peão/funcionário, assessor). A conta fornecida é "criador", que é o papel com mais funcionalidades visíveis. Se quiserem testar outros papéis, podemos fornecer credenciais adicionais por e-mail de contato.
  >
  > SEM IN-APP PURCHASES
  > O app NÃO tem compras in-app. A monetização é via contrato B2B fora da plataforma (o usuário final chega ao app já com acesso contratado). O módulo "Financeiro" dentro do app é para o usuário gerenciar contas a pagar/receber DO HARAS DELE — não envolve pagamento para CriaHub nem terceiros.
  >
  > PERMISSÕES SOLICITADAS
  > - Câmera: tirar fotos de animais, documentos, perfil
  > - Galeria: anexar imagens
  > - Microfone: gravar áudios de ocorrências em campo (uso secundário)
  > - Localização (When In Use): registrar onde um nascimento/ocorrência ocorreu — apenas foreground, sem background tracking
  > - Notificações: lembretes LOCAIS (sem push remoto) de partos esperados e devoluções de animais
  >
  > ABCCMM
  > Muitos dados do app vêm da ABCCMM (Associação Brasileira de Criadores de Cavalo Mangalarga Marchador). Animais oficialmente registrados têm campos imutáveis (nome, registro, genealogia) — isto é regra de negócio, não limitação do app.
  >
  > COMPLIANCE
  > - LGPD (Lei Geral de Proteção de Dados brasileira): exclusão in-app, portabilidade por solicitação
  > - Apple 5.1.1(v): implementado na v1.0
  > - Sem SDKs de tracking, sem IDFA, sem analytics de terceiros
  >
  > OFFLINE
  > O app foi projetado para funcionar com rede ruim (fazendas rurais). Algumas ações são enfileiradas quando offline e sincronizam quando a rede volta. Isto é intencional — não é bug.
  >
  > CONTATO
  > Qualquer dúvida, responda este ticket ou escreva pra [email do review].
  >
  > Obrigado!
- **Precisa decisão do usuário?** Confirmar email de contato e nome do signatário.

### Attachment 🟡 OPCIONAL

- **O que é:** arquivo (PDF/imagem) com instruções extras. Útil se o fluxo for complexo.
- **Rascunho:** Opcional. Se quiser, anexar 1 PDF de 1 página com screenshots numerados ilustrando "como chegar em Excluir Conta" e "como navegar entre telas".

---

# 7. Age Rating Questionnaire

> Cada pergunta tem 3 respostas: `None`, `Infrequent/Mild`, `Frequent/Intense`. Todas abaixo saem em `None` → rating final esperado: **4+**.

### 1. Cartoon or Fantasy Violence
- **Resposta:** `None`
- **Justificativa:** app B2B de gestão agropecuária, sem elementos gráficos de violência.

### 2. Realistic Violence
- **Resposta:** `None`

### 3. Prolonged Graphic or Sadistic Realistic Violence
- **Resposta:** `None`

### 4. Profanity or Crude Humor
- **Resposta:** `None`
- Observação: todo texto do app é em pt-BR formal ("Plantel", "Reprodução", "Sanidade" etc.).

### 5. Mature/Suggestive Themes
- **Resposta:** `None`

### 6. Horror/Fear Themes
- **Resposta:** `None`

### 7. Medical/Treatment Information
- **Resposta:** `None` (ou `Infrequent/Mild` conservador)
- **Observação:** o app tem dados de saúde/tratamento **de animais** (vacinas, exames, medicações). Apple historicamente aplica essa pergunta a saúde humana, mas para ser conservador vale escolher `Infrequent/Mild` e explicar nas Review Notes. **Recomendação: declarar `None`** e explicar nas Notes que tratamento é veterinário (animal).

### 8. Alcohol, Tobacco, or Drug Use or References
- **Resposta:** `None`
- **Observação:** O módulo veterinário registra medicações para animais (nomes de fármacos). Apple não considera isso "drug use reference" no sentido do questionário (que é uso recreativo humano). `None` é a resposta correta.

### 9. Simulated Gambling
- **Resposta:** `None`

### 10. Sexual Content or Nudity
- **Resposta:** `None`
- **Observação:** Mesmo com reprodução equina (coberturas, gestação), não há imagens explícitas — são registros de dados e eventos.

### 11. Graphic Sexual Content and Nudity
- **Resposta:** `None`

### 12. Contests
- **Resposta:** `None`

### 13. Unrestricted Web Access
- **Resposta:** `None`
- **Observação:** O app abre links externos via `expo-web-browser`/`expo-linking` apenas para Support URL / Privacy Policy / links controlados. Não há browser embutido com navegação livre.

### 14. User-Generated Content that could be shared publicly
- **Resposta:** `None`
- **Observação:** Usuários cadastram animais, fotos, observações — mas isso é **privado por haras** (RLS). Não há feed público, timeline, chat aberto, comentários entre contas. **Conteúdo é visível só dentro do haras do próprio usuário.** Se houvesse feed público, seria `Infrequent/Mild`.

### 15. Does your app enable/encourage users to meet in person?
- **Resposta:** `No`

### 16. Medical/Treatment Information (v2 pergunta — Apple tem duas variantes)
- Ver item 7.

### Resultado esperado
- **Classificação final:** **4+**
- **Precisa decisão do usuário?** Não.

---

# 8. Version Release

### Release Method 🔴 OBRIGATÓRIO

- **O que é:** como o app fica disponível na loja após aprovação.
- **Opções:**
  - `Manually release this version` — você clica "Release" após aprovação
  - `Automatically release this version` — sai na hora que Apple aprova
  - `Automatically release this version after App Review, no earlier than a date` — agendado
- **Rascunho:** `Manually release` — recomendado na **primeira** versão (dá tempo de preparar comunicação, avisar beta testers, etc.).
- **Precisa decisão do usuário?** Sim — decidir momento do go-live.

### Phased Release 🟡 OPCIONAL

- **O que é:** rollout gradual para 1%, 2%, 5%, 10%, 20%, 50%, 100% dos usuários em 7 dias.
- **Rascunho:** Ativar. Reduz risco de crash em produção. Safe default.
- **Precisa decisão do usuário?** Sugestão: ativar.

---

# 9. Export Compliance Information

### Uses Encryption? 🔴 OBRIGATÓRIO

- **O que é:** pergunta do ATS/export compliance dos EUA.
- **Rascunho:** `No` (considerada exempt)
  - Justificativa: o app só usa HTTPS (TLS) padrão do sistema operacional. Não implementa criptografia proprietária nem usa SDK de criptografia além do exempt (Apple exempta apps que só usam HTTPS via APIs Apple).
  - **Já flagueado no `app.config.ts:27`:** `ITSAppUsesNonExemptEncryption: false`.
  - Isso elimina a necessidade de anexar CCATS/Year-end self-classification report à Apple.
- **Precisa decisão do usuário?** Não — já configurado corretamente.

### Exempt from export compliance? 🟢

- **Rascunho:** Yes (porque só usa HTTPS do sistema). Apple autovalida via `ITSAppUsesNonExemptEncryption: false`.

---

# 10. Content Rights

### Does your app contain, show, or access third-party content? 🔴

- **Resposta:** `No`
- **Justificativa:** Todo conteúdo é do próprio usuário (criador do haras). Sem feeds embutidos, sem vídeos de plataforma terceira, sem áudios licenciados, sem mapa de terceiro visível (só coordenadas numéricas).
- **Precisa decisão do usuário?** Não.

---

# 11. Advertising Identifier (IDFA)

### Does this app use IDFA? 🔴

- **Resposta:** `No`
- **Justificativa:** Sem SDKs de ads, sem tracking cross-app. Confirmado por grep no repo: zero ocorrências de `AdvertisingIdentifier`, `IDFA`, Facebook SDK, AdMob.
- **Consequência:** App NÃO precisa pedir `App Tracking Transparency` (ATT). Não é necessário adicionar `NSUserTrackingUsageDescription`.
- **Precisa decisão do usuário?** Não.

---

# 12. Screenshots & App Previews

> Screenshots são obrigatórios para os tamanhos referência da geração mais recente + um iPad se `supportsTablet: true`. CriaHub tem `ios.supportsTablet: true` (`app.config.ts:23`) → **iPad screenshots obrigatórios**.

### Especificações técnicas — resoluções exatas (pontos × escala = pixels)

#### iPhone

| Display          | Modelo referência              | Pixels (portrait) | Obrigatoriedade                       |
|------------------|--------------------------------|-------------------|---------------------------------------|
| 6.9"             | iPhone 16 Pro Max              | 1320 × 2868       | 🔴 **OBRIGATÓRIO** (fornecer este OU 6.7") |
| 6.7"             | iPhone 15 Pro Max / 14 Plus    | 1290 × 2796       | 🔴 **OBRIGATÓRIO** (se não tiver 6.9")     |
| 6.5"             | iPhone 11 Pro Max / XS Max     | 1242 × 2688       | 🟡 Opcional (antes era obrigatório)   |
| 5.5"             | iPhone 8 Plus                  | 1242 × 2208       | 🟡 Opcional — **Apple removeu da lista**; hoje o menor exigido é 6.5"/6.7" |

**Recomendação prática:** gerar os 6.9" (1320×2868) — Apple faz downscale automático pros displays menores. Não precisa subir múltiplos tamanhos de iPhone na primeira versão.

#### iPad

| Display                    | Modelo referência               | Pixels (portrait) | Obrigatoriedade                    |
|----------------------------|---------------------------------|-------------------|------------------------------------|
| 13" (iPad Pro M4)          | iPad Pro 13" 3rd gen            | 2064 × 2752       | 🔴 **OBRIGATÓRIO** (se supportsTablet:true, e sim — está) |
| 12.9" (iPad Pro 6th gen)   | iPad Pro 12.9"                  | 2048 × 2732       | 🟡 Opcional (Apple reusa do 13")   |

**Atenção:** como `ios.supportsTablet: true` está em `app.config.ts:23`, o ASC **vai exigir** screenshots de iPad. Duas opções:
1. Gerar screenshots de iPad reais (simulador ou device iPad)
2. **Alterar `supportsTablet` pra `false`** e re-submeter — simplifica a primeira submissão significativamente. Isso é uma **decisão do Giuseppe** — recomendo começar com `false` pra reduzir fricção; expandir pra iPad em milestone futuro.

### Quantidade 🔴 OBRIGATÓRIO

- **Mínimo:** 1 screenshot por tamanho obrigatório
- **Máximo:** 10 screenshots por tamanho
- **Recomendação:** 5-8 screenshots com copy sobreposto explicando cada tela

### Formato 🔴 OBRIGATÓRIO

- PNG ou JPEG
- RGB (sem CMYK)
- Sem transparência
- Exatamente nas resoluções acima (Apple rejeita se 1 pixel errado)

### Rascunho de sequência das 5-8 screenshots

1. **Dashboard do criador** com número de animais, partos previstos — tagline: "Seu haras, em tempo real"
2. **Ficha do animal** com foto, genealogia — tagline: "Tudo sobre cada cavalo"
3. **Plantel com filtros** por ambiente/categoria — tagline: "Encontre qualquer animal"
4. **Report de campo** com câmera aberta e GPS — tagline: "Registre em campo, mesmo offline"
5. **Reprodução/gestações** — tagline: "Acompanhe todas as coberturas"
6. **Módulo sanitário/prontuário** — tagline: "Histórico veterinário completo"
7. **Agenda/tarefas** — tagline: "A rotina do haras organizada"
8. **Perfis e equipe** — tagline: "Criador, vet, peão — cada um no seu papel"

### App Previews (vídeo) 🟡 OPCIONAL

- **O que é:** vídeo curto (15-30s) mostrando o app em uso.
- **Especificações:**
  - Mesmas resoluções dos screenshots
  - 15-30s
  - Máximo 500 MB
  - Formato: .mov ou .mp4, H.264
  - Som opcional (mas se houver música, precisa direitos)
- **Rascunho:** Deixar pra milestone pós-lançamento.
- **Precisa decisão do usuário?** Opcional.

### Localização de screenshots 🟡

- Screenshots podem ter texto sobreposto em pt-BR (primary language).
- Se Primary Language = pt-BR, screenshots ficam no slot pt-BR.

---

# 13. App Icon

### Marketing Icon (App Store) 🔴 OBRIGATÓRIO

- **O que é:** ícone que aparece na página da App Store.
- **Especificações:**
  - **1024 × 1024 pixels exatos**
  - PNG, RGB, sem canal alpha (sem transparência)
  - Sem cantos arredondados (Apple aplica a máscara automaticamente)
  - Sem sombras, sem efeitos 3D desnecessários
  - Deve ser visualmente idêntico ao ícone instalado no device
- **Fonte atual:** `./assets/images/icon-criahub.png` referenciado em `app.config.ts:13`.
- **Validação pendente:** confirmar que o arquivo tem exatamente 1024x1024 e NÃO tem transparência. Rodar:
  ```bash
  sips -g pixelWidth -g pixelHeight -g hasAlpha assets/images/icon-criahub.png
  ```
- **Precisa decisão do usuário?** Validar arquivo. Se não passar, regenerar.

### Adaptive / Tinted / Dark icon (iOS 18+) 🟡 OPCIONAL

- **O que é:** iOS 18+ permite ícones "Tinted" e "Dark". Opcional mas recomendado pra polish.
- **Rascunho:** Deixar só o default (light) na primeira versão.
- **Precisa decisão do usuário?** Opcional.

---

# 14. Localization

### Primary Language 🔴 OBRIGATÓRIO

- **Rascunho:** `Portuguese (Brazil)`

### Additional Languages 🟡 OPCIONAL

- **Rascunho:** Nenhum. O app é 100% pt-BR (CLAUDE.md confirma "No i18n library — strings are hardcoded"). Adicionar inglês exigiria tradução de todas as strings + nova submissão.
- **Precisa decisão do usuário?** Não nesta versão.

### Por idioma, esses campos são localizáveis:
- Name, Subtitle, Description, Promotional Text, Keywords, What's New, Support URL, Marketing URL, Screenshots, App Previews, Privacy Policy URL
- **Rascunho:** preencher só o bloco pt-BR.

---

# 15. TestFlight (pré-submit público)

> TestFlight não é exigido, mas é altamente recomendado antes da submissão pública. É onde você valida o build em devices reais.

### Beta App Information 🔵

- **Feedback email:** email do contato
- **Marketing URL:** opcional
- **Privacy Policy URL:** mesma da App Store
- **License Agreement:** usar EULA padrão da Apple (opção no ASC)

### Test Information 🔵

- **Beta App Description:** versão curta da Description
- **What to Test:** "Validar: login, cadastro de animal, upload de foto, report de parto com GPS, exclusão de conta, sair."

### Grupos de teste

- **Internal Testing:** até 100 usuários Apple ID da equipe — sem review Apple, ~imediato
- **External Testing:** até 10.000 usuários externos — precisa "Beta App Review" (1-2 dias)

### Informações de Beta App Review 🔵

- **Demo account:** mesma que vai pra App Review pública
- **Contact info:** mesmo
- **Notes:** versão curta da Review Notes

---

# 16. Itens que SÓ o Giuseppe pode responder

Lista consolidada dos **decisões/inputs humanos** que o doc acima marcou como 🟠. Endereçar antes do primeiro submit:

### Legais / Empresa

1. **Razão social completa** (CriaHub LTDA? Dizevolv? outra?) — para Copyright e para a conta Apple Developer (se é empresarial, D-U-N-S Number exigido).
2. **CNPJ** (se conta Apple Developer for PJ, Apple valida via D-U-N-S, não CNPJ direto — mas precisa estar enrolado).
3. **Apple Developer Program** ativo ($99/ano) — verificar:
   - Conta está paga e vigente?
   - Tem papel Admin/App Manager?
   - Team ID conhecido? (precisa pro EAS submit)
4. **App Store Connect agreements assinados** — primeira submissão exige "Paid Applications Agreement" e "Free Applications Agreement" aceitos + tax/banking info preenchidos (mesmo que Free — Apple exige banking info).

### URLs (precisam existir e abrir)

5. **Privacy Policy URL** — página pública em HTTPS com conteúdo LGPD + Apple. Sem isso, não há submissão.
6. **Support URL** — página de suporte ou link de contato funcional.
7. **Marketing URL** (opcional) — `criahub.com.br`?

### Contato para App Review

8. **First Name / Last Name** do ponto de contato
9. **Phone** (com DDI internacional, ex: +55 11 9XXXX-XXXX)
10. **Email** de review (pode ser `comercial@dizevolv.com` ou dedicado)

### Conta demo para App Review

11. **Criar usuário `apple-review@...`** no Supabase (papel criador)
12. **Popular haras de teste** com ~5 animais (fotos, genealogia, 1 gestação, 1 tarefa, 1 evento de agenda)
13. **Senha forte e simples de digitar** (sem emoji, sem ç, etc.)

### Preço e disponibilidade

14. **Modelo de negócio:** Free ou Paid? — se Paid, qual tier? (afeta tax/banking info)
15. **Países:** Brasil only ou global?
16. **Public/Unlisted:** App Store pública ou link-only?

### Marketing / Copy

17. **Nome final na loja:** `CriaHub` / `CRIAHUB` / `CriaHub — Gestão de Haras`?
18. **Subtitle:** "Gestão de haras e plantel" / "Plantel, reprodução e campo" / outro?
19. **Description:** aprovar rascunho curto ou longo (ou mesclar)
20. **Keywords:** validar lista proposta

### Assets visuais

21. **Ícone 1024x1024** — confirmar que `assets/images/icon-criahub.png` atende (rodar `sips` check)
22. **Screenshots iPhone 6.9" (1320×2868)** — gerar 5-8 no simulador ou device
23. **Decisão supportsTablet:** manter `true` (precisa iPad screenshots) ou mudar pra `false` no `app.config.ts` pra pular iPad?
24. **App Preview (vídeo)** — opcional, pode ficar pra v1.1

### Versão e release

25. **Phased release:** ativar sim/não
26. **Release method:** Manual / Auto / Scheduled

### Técnico

27. **ASC_APP_ID** (criado no ASC, formato numérico) — precisa pra `eas submit`
28. **Team ID Apple** (no Membership Center) — precisa pra `eas submit`

---

# 17. Sequência recomendada antes da primeira submit

1. **Decidir supportsTablet** (true vs false). Se false, editar `app.config.ts:23` e rebuild.
2. **Publicar Privacy Policy + Support URL** em produção.
3. **Criar App no App Store Connect** (bundle `com.criahub.mobile`, SKU, primary language pt-BR).
4. **Preencher Tax/Banking** em Agreements, Tax, and Banking (obrigatório mesmo para Free).
5. **Criar conta demo** no Supabase + popular dados.
6. **Gerar screenshots** do 6.9" (e iPad se aplicável).
7. **Validar ícone 1024x1024** sem alpha.
8. **Rodar** `npm run build:ios:release` (EAS Build production).
9. **Rodar** `npx eas-cli submit --platform ios --latest`.
10. **Aguardar processing** (15min–2h).
11. **Preencher seções App Information → Pricing → App Privacy → Version Info → Age Rating → Review Info**.
12. **Selecionar build** processado, marcar "Submit for Review".
13. **Aguardar** 24-72h (primeira submissão costuma ser mais lenta).
14. **Corrigir rejeições** (se houver) — APPLE-01, AUTH-01, NOTIF-01 já endereçam os mais comuns.
15. **Release** (manual ou phased).

---

# 18. Referências técnicas do repo (para rastreabilidade)

| Informação                                | Arquivo:linha                            |
|-------------------------------------------|------------------------------------------|
| Bundle ID                                 | `app.config.ts:24`                       |
| Build number inicial                      | `app.config.ts:25`                       |
| Version                                   | `app.config.ts:11`                       |
| supportsTablet                            | `app.config.ts:23`                       |
| ITSAppUsesNonExemptEncryption             | `app.config.ts:27`                       |
| UIBackgroundModes (fetch)                 | `app.config.ts:31`                       |
| NSCameraUsageDescription                  | `app.config.ts:32-33`                    |
| NSPhotoLibraryUsageDescription            | `app.config.ts:34-35`                    |
| NSPhotoLibraryAddUsageDescription         | `app.config.ts:36-37`                    |
| NSMicrophoneUsageDescription              | `app.config.ts:38-39`                    |
| NSLocationWhenInUseUsageDescription       | `app.config.ts:40-41`                    |
| Plugin expo-location                      | `app.config.ts:93-99`                    |
| Plugin expo-image-picker                  | `app.config.ts:82-92`                    |
| Plugin expo-document-picker               | `app.config.ts:100-105`                  |
| Plugin expo-notifications                 | `app.config.ts:75-81`                    |
| EAS project ID                            | `app.config.ts:112`                      |
| iOS build profile (production)            | `eas.json:17-25`                         |
| iOS build profile (preview/simulator)     | `eas.json:7-16`                          |
| Deep link scheme                          | `app.config.ts:14` (`criahubmobile://`)  |
| Supabase client (sem service role)        | `src/lib/supabase.ts`                    |
| APPLE-01 (exclusão in-app) evidência      | `src/screens/AccountScreen.tsx` + edge function `delete-account` + table `account_deletion_requests` |
| Uso de Location                           | `src/screens/FieldHomeScreen.tsx:69-73`, `src/screens/FieldHomeHubScreen.tsx:43-46` |
| Uso de ImagePicker                        | `AccountScreen`, `AnimalMediaActions`, `FieldHome*`, `TaskExecutionModal`, `VetAnimalChartScreen` |
| Uso de DocumentPicker                     | `AnimalMediaActions`, `TaskExecutionModal`, `VetAnimalChartScreen` |
| Biometria no /financeiro                  | `src/hooks/useBiometricGate.ts`          |
| Core value / Requirements validados       | `.planning/PROJECT.md`                   |
| i18n = pt-BR only                         | `CLAUDE.md` — seção i18n                 |

---

# 19. Anti-rejeição: pontos de atenção conhecidos do CriaHub

Baseado nos REQs v1.0 já resolvidos, estes foram antecipados mas **vale conferir no build final**:

1. **5.1.1(v) — Exclusão de conta** ✓ (APPLE-01 — edge function `delete-account`)
2. **5.1.1 — Privacy Policy acessível** — **pendente** (URL precisa estar publicada antes do submit)
3. **4.0 — Design minimal** — app tem dark mode ✓
4. **2.1 — App completeness** — sem "coming soon" em lugar nenhum ✓ (verificar)
5. **2.3.10 — Accurate metadata** — não mencionar features Android na description
6. **2.5.1 — Software Requirements** — testar iOS 16 min (Expo SDK 54 default)
7. **5.1.2 — Data collection** — privacy labels refletem exatamente os dados listados na Seção 3 ✓
8. **Guideline 4.8 — Login Services** — como app oferece login por email/senha, Apple pode pedir "Sign in with Apple" como opção adicional. ATENÇÃO: **se for rejeitado por isso, é fase nova de implementação de Sign in with Apple**. Não está no código hoje. Manter como risco conhecido.
9. **Rede ruim / offline** — explicado nas Review Notes.
10. **Permissões sem uso visível** — cuidado: a permissão de Microfone (`NSMicrophoneUsageDescription`) está declarada mas, se não há fluxo que use áudio no primeiro run-through do auditor, ele pode rejeitar por "permission requested but no feature". **Recomendação:** ou remover `NSMicrophoneUsageDescription` do `app.config.ts` (se audio não for usado ainda), ou garantir que o auditor veja um fluxo de captura de áudio. Mesma nota vale pra `UIBackgroundModes: ["fetch"]` — confirmar que há task de background fetch ativa (existe via `expo-background-fetch` / `expo-task-manager` — `package.json`).

---

# 20. Glossário rápido

- **ASC** — App Store Connect
- **IAP** — In-App Purchase
- **IDFA** — Identifier for Advertisers (Apple)
- **IDFV** — Identifier for Vendor
- **ATT** — App Tracking Transparency (prompt de "permitir tracking")
- **RLS** — Row-Level Security (Supabase/PostgreSQL)
- **LGPD** — Lei Geral de Proteção de Dados (Brasil)
- **ABCCMM** — Associação Brasileira de Criadores de Cavalo Mangalarga Marchador
- **EAS** — Expo Application Services
- **DUNS** — Dun & Bradstreet identifier (Apple exige para contas PJ)
- **CCATS** — Classification Request (US export compliance — não aplicável aqui)

---

*Documento gerado em 2026-04-17 para a primeira submissão do CriaHub Mobile v1.0.0 (iOS). Atualizar a cada release se campos "por versão" mudarem.*
