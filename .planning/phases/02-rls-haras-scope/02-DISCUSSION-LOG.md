# Phase 2: RLS Haras Scope & Permissions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves alternatives considered.

**Date:** 2026-04-16
**Phase:** 02-rls-haras-scope
**Areas discussed:** PERM-01 policy, RLS helpers signature, fetchRelative haras source, RLS-03 scope boundary, broader audit scope

---

## PERM-01 policy (D1)

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist `isCreatorRole(role) \|\| isVeterinaryRole(role)` | Estrita; segue comentário original do audit ("peão não"); admin/assessor/advisor hoje bloqueados em /unsupported. | ✓ |
| (a) + incluir admin | Cobre caso futuro de admin operar o haras. Mas admin hoje está em `/unsupported`. | |

**User's choice:** whitelist estrita (a)
**Notes:** Se admin for liberado no mobile no futuro, PERM-02 (Phase 5) faz a auditoria caso a caso. Nesta fase é o fix mínimo que fecha o leak.

---

## RLS helpers signature (D2)

| Option | Description | Selected |
|--------|-------------|----------|
| Adicionar `harasId: string` arg obrigatório | Callers já têm o valor em escopo; quebra silenciosa impossível. | ✓ |
| Derivar harasId via useAuth | Impossível — services são funções puras fora de hooks. | |

**User's choice:** arg obrigatório (a)
**Notes:** Consistente com o padrão de outros services (`animalsService.update(id, harasId, input)`, etc.).

---

## fetchRelative haras source (D3)

| Option | Description | Selected |
|--------|-------------|----------|
| Caller passa `data.haras_id` do animal filho | Se filho está no haras X, pai/mãe estão no X (regra de domínio CriaHub). | ✓ |
| Aceitar harasId null e curto-circuitar | Tolerante demais — esconde bugs futuros. | |

**User's choice:** haras_id do filho (a)
**Notes:** Regra de domínio consistente com o modelo de dados do web (criahub-web-v2).

---

## Warning "RLS bloqueou" vs "não cadastrado" (D4)

| Option | Description | Selected |
|--------|-------------|----------|
| Fora de escopo — RLS-03 na Phase 5 | Esta fase só filtra; UX diferenciada fica pra quando surface de warnings entrar. | ✓ |
| Já adicionar array de warnings | Expande `getById` signature (returning `{ animal, warnings }`) — refactor maior. | |

**User's choice:** fora de escopo (a)
**Notes:** RLS-03 foi separado como P1 exatamente pra isolar a mudança de API pública. Manter Phase 2 focada em P0.

---

## Broader audit scope (D5)

| Option | Description | Selected |
|--------|-------------|----------|
| Só os 3 REQs do audit | Evita scope creep; se aparecer algo óbvio, vira backlog 999.x. | ✓ |
| Varrer `src/services/*.ts` por `.from("animals")` sem `.eq("haras_id")` | Seria mais exaustivo mas poderia estourar a fase. | |

**User's choice:** só os 3 REQs (a)
**Notes:** Prioridade é destravar submit. Auditoria ampla vira REQ novo se necessário.

---

## Claude's Discretion

- **D-13:** Formato dos commits (`fix(02-*)` vs `refactor(02-*)`) — Claude decide conforme semântica.
- **D-14:** Roteiro de teste local no checkpoint human-verify — Claude monta baseado no que foi tocado.

## Deferred Ideas

- RLS-03 warnings array em fetchRelative → Phase 5
- Auditoria de outras lookups de animals sem haras_id → backlog se necessário
- RLS-04 storage bucket privado → Phase 6
- RLS-05 ABCCMM enforced no DB → Phase 6
- PERM-02 outras permissões vazando → Phase 5
- AUTH-02 hot-swap de haras → Phase 5
- TEST-01 smoke tests → Phase 5
