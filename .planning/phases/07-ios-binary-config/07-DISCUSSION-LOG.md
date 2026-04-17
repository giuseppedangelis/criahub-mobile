# Phase 7: 07-ios-binary-config - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 07-ios-binary-config
**Areas discussed:** Privacy Manifest strategy, Usage descriptions depth, Versioning, Execution order
**Mode:** interactive discuss (single batch of 4 questions, user ran `/gsd-discuss-phase 7`)

---

## Scout Findings (pre-discussion)

Grep evidence informing the discussion:

- `src/**/*.tsx` (all `ImagePicker.launch*` calls) → `mediaTypes: ["images"]` em 100% dos usos. Zero `expo-av`, `Audio.Recording`, `MediaTypeOptions.Videos`, `videoMaxDuration`. **`NSMicrophoneUsageDescription` é permissão fantasma.**
- `src/hooks/useBackgroundSync.ts:20` → `BACKGROUND_SYNC_TASK_NAME = "criahub-offline-sync"` registrado via `BackgroundFetch.registerTaskAsync`. **`UIBackgroundModes: ["fetch"]` é legítimo (OFFLINE-03).**
- `app.config.ts` integralmente lido (117 linhas) — bloco iOS com infoPlist + plugin `expo-image-picker` com `microphonePermission` declarado duas vezes (linha 38 e linha 89).

---

## Gray Area 1 — Privacy Manifest Strategy (IOS-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Lock agora | Drafto os 7 tipos da SUMMARY.md; Phase 9 espelha. Destrava Phase 7 sem esperar | ✓ |
| Defer para Phase 9 | Phase 7 só declara Required Reason APIs; Phase 9 retorna e fecha NSPrivacyCollectedDataTypes | |
| Mix drafto agora + valido em Phase 9 | Drafto + Phase 9 ajusta antes do build | |

**User's choice:** Lock agora (Recommended)
**Notes:** Escolha pragmática. Research triangulou 7 tipos com alta confiança; esperar Phase 9 só atrasaria sem ganho. Risco residual: se Phase 9 descobrir algo novo, ajusta Phase 7 retroativamente (não há build ainda entre Phase 7 e Phase 11).

---

## Gray Area 2 — Usage Descriptions Depth (IOS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Full rewrite com tela específica | Cada permissão cita screen e caso de uso concreto | ✓ |
| Keep atual + remover microfone | Textos atuais (app.config.ts:32-41) são decentes; só remover `NSMicrophoneUsageDescription` | |
| Rewrite só Location + remover microfone | Apple é mais rígido com Location em 2026; Camera/PhotoLibrary atuais passam | |

**User's choice:** Full rewrite com tela específica (Recommended)
**Notes:** Apple 2.3.8/2.3.10 rejeita textos genéricos. Full rewrite custa pouco e reduz risco de round-trip com reviewer. Rascunhos foram drafted no CONTEXT.md (D-05) para lock final em plan phase.

---

## Gray Area 3 — Versioning First Build

| Option | Description | Selected |
|--------|-------------|----------|
| Let EAS decide | Primeira production build sai com o número que o EAS remote tiver; clean enough para first submit | ✓ |
| Seed para 1.0.0 (1) manual | Rodar `eas build:version:set --value 1` antes do primeiro build | |

**User's choice:** Let EAS decide (Recommended)
**Notes:** Purista (buildNumber exato 1.0.0 (1)) não traz valor prático — usuário da loja não vê buildNumber. `cli.appVersionSource: "remote"` já garante que tupla `(version, buildNumber)` nunca repete. Poupa 1 comando manual de seed.

---

## Gray Area 4 — Execution Order (all 6 REQs)

| Option | Description | Selected |
|--------|-------------|----------|
| app.json first | 1º delete app.json (footgun off) → 2º expo-build-properties → 3º usage desc rewrite → 4º privacyManifests → 5º verify; cada passo commit atômico | ✓ |
| Privacy Manifest first | Item mais crítico primeiro; risco: se quebrar build, outros ainda não estão pra mitigar | |
| One big commit | Todas mudanças num único commit; rápido mas difícil reverter peça específica | |

**User's choice:** app.json first (Recommended)
**Notes:** Alinhado com convenção GSD v1.0 (commits atômicos por REQ). Ordem respeita dependências: delete footgun primeiro (cheap), depois plugin (expo-build-properties precisa instalar antes de referenciar), depois infoPlist edits, privacyManifests por último (mais denso, fica isolado em diff).

---

## Claude's Discretion

- Formato JSON exato do `privacyManifests` (ordem de chaves, indentação) — seguir exemplo Expo SDK 54 verbatim
- Micro-decisão: deletar `microphonePermission` apenas do bloco existente do plugin `expo-image-picker` vs remover plugin inline config completo (ambos funcionam; impacto em diff size)
- Formato de `reason` (string vs string[] — Apple aceita ambos; Expo docs usam array)

## Deferred Ideas

Nenhuma. Discussão ficou 100% dentro da fronteira de Phase 7. Itens relevantes para outras fases já estavam mapeados no ROADMAP v1.1 pré-discussão:

- Privacy Policy URL + Review Notes → Phase 9
- Demo seed → Phase 10
- Screenshots, credentials, first build, TestFlight → Phase 11
- Supabase redirect allowlist + Submit for Review → Phase 12

---

*Audit log — preserved for compliance / review.*
