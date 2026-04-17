# Milestones — CriaHub Mobile

---

## v1.0 — Bug Bash Pré-Loja

**Shipped:** 2026-04-17
**Tag:** `v1.0`
**Branch:** `criador/ajustes`

### Scope
Milestone corretivo para destravar submit nas lojas. Audit manual identificou 33 REQs distribuídos em 8 P0 (bloqueantes), 15 P1 (degradação UX/segurança), 10 P2 (higiene).

### Delivered
- **30/33 REQs fechados** (8/8 P0, 13/15 P1, 9/10 P2)
- **6 fases** executadas sequencialmente
- **59 commits** atômicos (planning + código + migrations)
- **68 arquivos** modificados, ~9.8k linhas adicionadas
- **Typecheck:** passa (`tsc --noEmit`)
- **Tests:** 33/33 passando (Jest + 4 suites smoke)
- **Supabase:** 2 migrations + 1 edge function deployed via MCP

### Phase breakdown
| # | Fase | REQs | Status |
|---|------|------|--------|
| 1 | Auth & Notifications Security | AUTH-01, NOTIF-01 | Shipped |
| 2 | RLS Haras Scope & Permissions | RLS-01, RLS-02, PERM-01 | Shipped |
| 3 | Offline Queue Hardening | OFFLINE-01, OFFLINE-02 | Shipped |
| 4 | Apple 5.1.1(v) In-app Deletion | APPLE-01 | Shipped |
| 5 | P1 Cleanup | AUTH-02, RLS-03, OFFLINE-03/04, OWN-01/02, PERF-01, UX-01/02/03, PAR-01/03, TEST-01 | Shipped (13/15) |
| 6 | P2 Hygiene & Hardening | RLS-04/05, OFFLINE-05, PERF-02, UX-04/05, PAR-02, SEC-01/02 | Shipped (9/10) |

### Key Accomplishments
1. **Reset de senha in-app** com deep link `criahubmobile://reset-password` + `usePathname` guard anti-race.
2. **Exclusão de conta real (Apple 5.1.1v)** via edge function `delete-account` — substitui fluxo `mailto:` antigo.
3. **RLS belt+suspenders** no client (`getAnimalNamesMap`, `fetchRelative` com `.eq("haras_id")`) + trigger DB pra ABCCMM immutability.
4. **Fila offline robusta** — dedup por bucket de minuto (gêmeos passam), retry cap com `dead` flag, paridade field↔vet.
5. **Dashboard RPC agregada** — `get_creator_dashboard` substitui 11+ round-trips.
6. **Hot-swap haras** para usuários com múltiplos vínculos (vets/assessores).
7. **Hardening client:** nonce em storage paths, `expo-image-manipulator` cap 2000px, biometria em `/financeiro`, Zod em RPCs, JWT removido de `app.json`.
8. **Base de testes** — Jest + 4 smoke suites (roles, offline fingerprint, ownership scope).

### Known Deferred (2 P1 + 1 P2 = 3 REQs)
- **PERM-02** — auditoria ampla de permissões assessor/admin/advisor
- **MONO-01** — decomposição de `VeterinaryScreen.tsx` (1539 linhas)
- **MONO-02** — decomposição de `FieldHomeScreen.tsx` (1299 linhas)

Mapeados para próximo milestone de code quality.

### Validation Pending
Todas as mudanças client-side passam typecheck + tests. Validação manual pendente em device real via EAS build:
- **AUTH-01** — 7 cenários de deep link (cold start, foreground, session collision, link expirado, dupla execução, NOTIF-01 integração, D-14)
- **APPLE-01** — fluxo de exclusão + confirmação em `account_deletion_requests`
- **UX-05** — gate biométrico em `/financeiro`

### Supabase artifacts deployed
- `public.account_deletion_requests` table com RLS (policy `select_own_deletion_request`)
- Edge function `delete-account` v1 (`verify_jwt: true`)
- RPC `public.get_creator_dashboard(uuid, int)` (`SECURITY INVOKER`, `STABLE`)
- Trigger `animals_enforce_abccmm_immutability` (`BEFORE UPDATE`)

### Git stats
- **Commit range:** `e3a08c9` (pre-milestone tip) → `4b27e38` (UX-05 final commit)
- **Files modified:** 68
- **Insertions:** ~9,836 linhas
- **Deletions:** ~447 linhas
- **Timeline:** 2026-04-16 → 2026-04-17 (2 dias intensivos)

---
