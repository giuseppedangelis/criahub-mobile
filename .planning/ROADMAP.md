# Roadmap — CriaHub Mobile

## Milestones

- ✅ **v1.0 Bug Bash Pré-Loja** — 6 fases, 30/33 REQs shipped (2026-04-17) — [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- 🚀 **v1.1 Submissão iOS App Store — Apple Launch** — 6 fases (7-12), 29 REQs ativos, branch `apple` (started 2026-04-17)

## Phases

<details>
<summary>✅ v1.0 Bug Bash Pré-Loja (Phases 1-6) — SHIPPED 2026-04-17</summary>

- [x] Phase 1: Auth & Notifications Security (4 plans) — AUTH-01, NOTIF-01
- [x] Phase 2: RLS Haras Scope & Permissions — RLS-01, RLS-02, PERM-01
- [x] Phase 3: Offline Queue Hardening — OFFLINE-01, OFFLINE-02
- [x] Phase 4: Apple 5.1.1(v) In-app Deletion — APPLE-01 (+ edge function + migration)
- [x] Phase 5: P1 Cleanup — 13/15 REQs (AUTH-02, RLS-03, OFFLINE-03/04, OWN-01/02, PERF-01, UX-01/02/03, PAR-01/03, TEST-01)
- [x] Phase 6: P2 Hygiene & Hardening — 9/10 REQs (RLS-04/05, OFFLINE-05, PERF-02, UX-04/05, PAR-02, SEC-01/02)

**Deferred from v1.0 → próximo milestone de code quality:**
- PERM-02 (P1) — auditoria ampla de permissões assessor/admin/advisor
- MONO-01 (P1) — decomposição de VeterinaryScreen.tsx (1539 linhas)
- MONO-02 (P2) — decomposição de FieldHomeScreen.tsx (1299 linhas)

</details>

### 🚀 v1.1 Submissão iOS App Store — Apple Launch (Phases 7-12)

- [ ] **Phase 7: 07-ios-binary-config** — Configurar binário iOS (Privacy Manifest, deployment target, usage descriptions, app.json cleanup) para passar na verificação automática da Apple
- [ ] **Phase 8: 08-runtime-hardening** — Endurecer runtime React/RN (ErrorBoundary, auth timeout, console gating, notif opt-in) para evitar white-screen e crashes em rede do reviewer
- [ ] **Phase 9: 09-asc-metadata-legal** — Produzir metadata do App Store Connect, URLs legais (Privacy Policy + Support) hospedadas e Review Notes cobrindo os 5 Watch Out For itens
- [ ] **Phase 10: 10-demo-seed** — Seed `apple-review-haras` no Supabase com ≥12 animais, 3 gestações, 5 tarefas, 2 field reports e 3 demo accounts bound via `haras_members`
- [ ] **Phase 11: 11-build-testflight** — Gerar ícone/screenshots, rodar build EAS production iOS antes de 2026-04-28, subir para TestFlight e validar AUTH-01/APPLE-01/UX-05 em iPhone + iPad
- [ ] **Phase 12: 12-submit-review** — Submeter à App Review com Manual Release, monitorar Resolution Center com SLA ≤ 4h e conduzir recovery de qualquer rejeição

## Phase Details

### Phase 7: 07-ios-binary-config

**Goal**: Binário iOS passa na validação automática da Apple — Privacy Manifest declarado, deployment target explícito, usage descriptions específicas, sem footguns de config duplicada.

**Depends on**: Nothing (primeira fase do milestone v1.1) — porém as decisões de Nutrition Labels da Phase 9 (ASC-04/07) precisam estar **draftadas** antes desta fase finalizar `NSPrivacyCollectedDataTypes`. Phases 7 e 9 podem ser desenvolvidas em paralelo no editor; execução no GSD permanece sequencial (Phase 7 finaliza depois que o draft da Phase 9 está estável).

**Requirements**: IOS-01, IOS-02, IOS-03, IOS-04, IOS-05, IOS-06

**Success Criteria** (what must be TRUE):
  1. `plutil -p Payload/*.app/PrivacyInfo.xcprivacy` do build gerado lista as 4 Required Reason APIs (`CA92.1`, `C617.1`, `35F9.1`, `E174.1`) + `NSPrivacyCollectedDataTypes` espelhando os Nutrition Labels da Phase 9.
  2. `app.json` não existe mais no repo; `app.config.ts` é única fonte de verdade para Expo config.
  3. Plugin `expo-build-properties` aplica `ios.deploymentTarget: "15.1"` — verificável no build artifact / `ios/Podfile.lock` gerado pelo EAS.
  4. Usage descriptions (`NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`) citam tela/uso específico e aparecem no `.ipa` inspecionado.
  5. `NSMicrophoneUsageDescription` removido (sem uso real de gravação) OU justificado em Review Notes; `ITSAppUsesNonExemptEncryption: false` preservado; `UIBackgroundModes: ["fetch"]` documentado em Review Notes.

**Plans**: TBD

**UI hint**: no

---

### Phase 8: 08-runtime-hardening

**Goal**: Runtime React/RN não crasha em rede ruim do reviewer — árvore envolta em ErrorBoundary, auth tem timeout, logs de dev não vazam, permissões são pedidas só após usuário ver valor.

**Depends on**: Phase 7 (config do binário precisa estar estável antes de mexer em `app/_layout.tsx` e no bootstrap do `AuthContext`).

**Requirements**: RUNTIME-01, RUNTIME-02, RUNTIME-03, RUNTIME-04, RUNTIME-05

**Success Criteria** (what must be TRUE):
  1. `ErrorBoundary` root em `app/_layout.tsx` (shape Expo Router v6) captura throws de render e mostra fallback UI com botão de retry — verificável via throw artificial em dev build.
  2. Bootstrap do `AuthContext` resolve `isLoading=false` em ≤ 15s mesmo com Supabase unreachable (timeout + `finally` garantido) — verificável via Network Link Conditioner `100% Loss`.
  3. Zero `console.*` ativo no production bundle — todo uso wrapped em `if (__DEV__)` ou removido; auditoria via `grep -rn "console\." src/` cross-checked com bundle inspect.
  4. Prompt de permissão de notificações aparece apenas após primeiro login bem-sucedido, não no launch — reviewer navega pelo app antes de qualquer permission dialog (exceto as iOS-mandatory no cold start).
  5. Smoke test em rede IPv6-only (macOS NAT64) confirma que Supabase auth + query + mutation funcionam.

**Plans**: TBD

**UI hint**: yes

---

### Phase 9: 09-asc-metadata-legal

**Goal**: App Store Connect tem metadata completa, URLs legais estão live e Review Notes antecipam todos os pontos de fricção que a Apple historicamente levanta para este tipo de app (B2B multi-tenant, auth próprio, dados oficiais importados, background fetch).

**Depends on**: Nothing funcionalmente (pode rodar em paralelo com Phase 7 no editor). Execução sequencial: Phase 9 **começa antes** da Phase 7 finalizar para permitir lock das decisões de Nutrition Labels que alimentam `NSPrivacyCollectedDataTypes` em IOS-01.

**Requirements**: ASC-01, ASC-02, ASC-03, ASC-04, ASC-05, ASC-06, ASC-07, ASC-08

**Success Criteria** (what must be TRUE):
  1. `criahub.com.br/privacidade` e `criahub.com.br/suporte` respondem HTTP 200 OK com conteúdo LGPD-completo (controlador, DPO, Art. 7/18, retenção, exclusão) e canais de contato — verificável via `curl -I`.
  2. Auditoria three-way privacy consistency é limpa: diff line-by-line entre `ios.privacyManifests.NSPrivacyCollectedDataTypes` (binário), ASC App Privacy Nutrition Labels (console) e conteúdo da Privacy Policy URL — zero divergência antes de Submit.
  3. `apple/docs/REVIEW_NOTES.md` existe em pt-BR + EN cobrindo 5 Watch Out For: 4.8 exemption (Supabase = company's own account system), 5.1.1(v) delete path, 1.2 UGC isolation via RLS-per-haras, 5.2 ABCCMM attribution, 2.5.4 background fetch.
  4. App record criado no ASC com bundle `com.criahub.mobile`, pt-BR primary, Business+Productivity, SKU `CRIAHUB-IOS-V1` — `ascAppId` numérico capturado para uso na Phase 11.
  5. Age Rating questionnaire preenchido (expected 4+); metadata textual (Name, Subtitle, Description, Promotional Text, Keywords, Release Notes v1.0.0, Copyright) preenchida em pt-BR com Review Notes em pt-BR + EN.

**Plans**: TBD

**UI hint**: no

---

### Phase 10: 10-demo-seed

**Goal**: Reviewer da Apple consegue logar em cada uma das 3 demo accounts e ver conteúdo real (animais, gestações, tarefas, field reports, condomínio), evitando rejeição 2.1 por "empty app".

**Depends on**: Nothing funcionalmente (Supabase schema já está em produção). Ordem lógica: Phase 10 **precede** Phase 11 — screenshots (BUILD-02) e validação TestFlight (BUILD-07) dependem de seed existente; sem isso, build production conecta ao demo haras e mostra listas vazias.

**Requirements**: DEMO-01, DEMO-02

**Success Criteria** (what must be TRUE):
  1. Script SQL idempotente em `supabase/migrations/` ou `scripts/` cria `apple-review-haras` com ≥12 animais (6 ABCCMM + 6 avulso), 3 gestações, 5 tarefas de agenda, 2 field reports, 1 condomínio, 2 consultas veterinárias — rerun não duplica dados.
  2. 3 demo accounts (criador, veterinário, peão) existem em `auth.users` bound via `haras_members` ao `apple-review-haras` — login via build preview mostra >0 animais no Plantel, >0 tarefas na Agenda, >0 gestações em Reprodução para os roles apropriados.
  3. Credenciais documentadas em `apple/docs/DEMO_ACCOUNTS.md` (arquivo listado em `.gitignore`) — reviewer recebe email/senha plain via App Review Information.

**Plans**: TBD

**UI hint**: no

---

### Phase 11: 11-build-testflight

**Goal**: Build production iOS sobe no ASC sem rejeição automática, screenshots estão nos tamanhos corretos, e TestFlight em iPhone+iPad real valida os três fluxos críticos de v1.0 (AUTH-01 deep link, APPLE-01 exclusão, UX-05 biometria) antes de submeter à review.

**Depends on**: Phase 7 (binário configurado), Phase 8 (runtime estável), Phase 9 (`ascAppId` + metadata disponíveis), Phase 10 (demo seed existe para screenshots + TestFlight validation).

**Time-box constraint**: **BUILD-06 precisa rodar a primeira production build ANTES de 2026-04-28** (Xcode 26 / iOS 26 SDK floor) OU pinar `"image": "latest"` no profile. Documentado como deadline externo não-movível.

**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07

**Success Criteria** (what must be TRUE):
  1. Ícone `./assets/images/icon-criahub.png` validado como 1024×1024 sRGB sem alpha (`sips -g hasAlpha` retorna `no`).
  2. Screenshots gerados nos 2 tamanhos obrigatórios (iPhone 6.9" 1320×2868 e iPad 13" 2064×2752), 5–7 por dispositivo, capturados de build preview apontando pro Supabase com demo seed.
  3. ASC API Key (`.p8`) carregada no EAS vault; `eas.json` com `submit.production.ios.ascAppId` + `appleTeamId`; scripts `submit:ios`, `metadata:pull`, `metadata:push` em `package.json`.
  4. Supabase URL (plaintext) e anon key (sensitive) em EAS env vars para environment `production`; `.env.local` não é fonte de verdade pro build.
  5. Primeira production build iOS (`eas build --profile production --platform ios`) completa antes de 2026-04-28 e `PrivacyInfo.xcprivacy` verificado via `plutil -p`; build subiu pro TestFlight via `eas submit --latest` sem erro.
  6. TestFlight internal test em iPhone E iPad real valida: AUTH-01 (deep link reset abre app e troca senha), APPLE-01 (fluxo de exclusão ≤ 10s e ≤ 2 taps), UX-05 (biometria gate em /financeiro), 4 personas (criador/vet/peão/admin) não crashando.

**Plans**: TBD

**UI hint**: yes

---

### Phase 12: 12-submit-review

**Goal**: App submetido à App Review com Manual Release e aprovado para distribuição na primeira tentativa; qualquer rejeição é respondida em ≤ 4h e mapeada em recovery table.

**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10, Phase 11. Fase final — checkpoint gate.

**Requirements**: SUBMIT-01, SUBMIT-02

**Success Criteria** (what must be TRUE):
  1. Supabase Auth Dashboard → URL Configuration com allowlist `criahubmobile://reset-password` ativo — valida AUTH-01 em builds reais distribuídos via TestFlight externo e, depois, produção.
  2. Submit for Review acionado no ASC com **Manual Release** selecionado; Resolution Center monitorado com SLA ≤ 4h para responder mensagens.
  3. App atinge status "Ready for Distribution" (aprovado) ou rejeição é mapeada em recovery table em `.planning/research/PITFALLS.md` e resolvida em ≤ 1 ciclo de re-submit.

**Plans**: TBD

**UI hint**: no

## Progress

| Phase | Plans Complete | Milestone | Status | Completed |
|-------|----------------|-----------|--------|-----------|
| 1. Auth & Notifications | — | v1.0 | Shipped | 2026-04-17 |
| 2. RLS Haras Scope | — | v1.0 | Shipped | 2026-04-17 |
| 3. Offline Queue | — | v1.0 | Shipped | 2026-04-17 |
| 4. Apple Account Deletion | — | v1.0 | Shipped | 2026-04-17 |
| 5. P1 Cleanup | — | v1.0 | Shipped (13/15) | 2026-04-17 |
| 6. P2 Hygiene | — | v1.0 | Shipped (9/10) | 2026-04-17 |
| 7. iOS Binary Config | 0/TBD | v1.1 | Not started | — |
| 8. Runtime Hardening | 0/TBD | v1.1 | Not started | — |
| 9. ASC Metadata & Legal | 0/TBD | v1.1 | Not started | — |
| 10. Demo Seed | 0/TBD | v1.1 | Not started | — |
| 11. Build & TestFlight | 0/TBD | v1.1 | Not started | — |
| 12. Submit for Review | 0/TBD | v1.1 | Not started | — |

## Dependency Graph (v1.1)

```
Phase 9 (draft Nutrition Labels) ─┐
                                  ├──► Phase 7 (locks NSPrivacyCollectedDataTypes)
                                  │
Phase 7 ────────────────────────────► Phase 8 (runtime changes on stable config)
                                  │
Phase 9 ────────────────────────────► Phase 11 (ascAppId, metadata needed)
                                  │
Phase 10 ───────────────────────────► Phase 11 (demo seed feeds screenshots + TestFlight)
                                  │
Phase 8 ─────────────────────────────► Phase 11 (hardened runtime before build)
                                  │
Phase 11 ────────────────────────────► Phase 12 (build approved, TestFlight validated)
```

**Execution order (sequential per config.json `parallelization: false`):** 7 → 8 → 9 → 10 → 11 → 12.

**Soft parallelism note:** Phase 9 document drafting may begin in the editor while Phase 7 is active so Nutrition Labels decisions are ready when IOS-01 is finalized. This does not change GSD execution order — Phase 7 still completes before Phase 8 begins.

**External deadline:** Phase 11 (BUILD-06) must execute its first production build before **2026-04-28** (Xcode 26 / iOS 26 SDK floor) OR pin `"image": "latest"` in `eas.json`.

*Last updated: 2026-04-17 — v1.1 roadmap created with phases 7-12*
