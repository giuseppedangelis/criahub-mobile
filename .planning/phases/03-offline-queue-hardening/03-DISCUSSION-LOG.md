# Phase 3: Offline Queue Hardening - Discussion Log

> **Audit trail only.** Decisions in CONTEXT.md.

**Date:** 2026-04-16
**Phase:** 03-offline-queue-hardening
**Areas discussed:** OFFLINE-01 fingerprint, OFFLINE-02 retry cap, dead storage, vet paridade, UI exposure

---

## OFFLINE-01 — fingerprint dedup (D1)

| Option | Description | Selected |
|--------|-------------|----------|
| Bucket de minuto no `created_at` | Mata double-tap (seg/ms); gêmeos com ≥1min separação passam. Mínima mudança. | ✓ |
| `reference_id` UUID client-side | Robusto, double-tap dedupa por id; mais invasivo. | |
| Remover dedup só pra birth_report | Partos raros; perder é pior que duplicar. | |

**Choice:** a
**Notes:** fingerprint só muda: adiciona `created_at_minute`. Janela de 2min permanece. Double-taps dedupam (mesmo minuto, mesma foto); gêmeos tipicamente têm ≥ alguns minutos e fotos diferentes — ambos caminhos passam.

---

## OFFLINE-02 — retry cap (D2)

| Option | Description | Selected |
|--------|-------------|----------|
| 10 tentativas | Audit sugere; combina com backoff máx 15min → ~48h até dead. | ✓ |
| Outro valor | n/a | |

**Choice:** 10

---

## Armazenamento dos dead (D3)

| Option | Description | Selected |
|--------|-------------|----------|
| Flag `dead: true` na queue principal | Snapshot conta, flush skippa, clearDead* limpa. Zero nova AsyncStorage key. | ✓ |
| AsyncStorage key separada | Separação limpa mas duplica read/write. | |

**Choice:** a

---

## Paridade vet ↔ field (D4)

| Option | Description | Selected |
|--------|-------------|----------|
| Estender VeterinaryOfflineAction + flush com backoff e dead igual field | Simetria completa. | ✓ |
| Só adicionar max_retries sem backoff no vet | Mínima mudança. | |

**Choice:** a
**Notes:** Vet hoje está atrás (sem retry_count, backoff, last_error). Paridade evita bug futuro de divergência.

---

## UI de falhas (D5)

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot + botão "Descartar falhas permanentes" quando dead_count > 0 | Mínima surface, mensagem clara, 1 botão. | ✓ |
| Tela nova com lista + "Tentar agora" individual | Escopo maior, milestone próprio. | |

**Choice:** a
**Notes:** Sem lista individual; `Alert.alert` confirma antes de `clearDead*Actions`.

---

## Claude's Discretion

- D-22: mensagem exata do Alert.alert
- D-23: ordem dos campos nas interfaces
- D-24: console.warn de debug temporário (cleanup antes do commit)

## Deferred Ideas

- OFFLINE-03 background-fetch → Phase 5
- OFFLINE-04 optimistic concurrency → Phase 5
- OFFLINE-05 banner offline global → Phase 6
- Extração de buildRetryAtIso compartilhado → Phase 5/6 refactor
- UI lista dead individual → milestone futuro
- Export dead para suporte → depende APPLE-01 ou posterior
