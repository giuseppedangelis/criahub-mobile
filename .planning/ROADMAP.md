# Roadmap — CriaHub Mobile

## Milestones

- ✅ **v1.0 Bug Bash Pré-Loja** — 6 fases, 30/33 REQs shipped (2026-04-17) — [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 Bug Bash Pré-Loja (Phases 1-6) — SHIPPED 2026-04-17</summary>

- [x] Phase 1: Auth & Notifications Security (4 plans) — AUTH-01, NOTIF-01
- [x] Phase 2: RLS Haras Scope & Permissions — RLS-01, RLS-02, PERM-01
- [x] Phase 3: Offline Queue Hardening — OFFLINE-01, OFFLINE-02
- [x] Phase 4: Apple 5.1.1(v) In-app Deletion — APPLE-01 (+ edge function + migration)
- [x] Phase 5: P1 Cleanup — 13/15 REQs (AUTH-02, RLS-03, OFFLINE-03/04, OWN-01/02, PERF-01, UX-01/02/03, PAR-01/03, TEST-01)
- [x] Phase 6: P2 Hygiene & Hardening — 9/10 REQs (RLS-04/05, OFFLINE-05, PERF-02, UX-04/05, PAR-02, SEC-01/02)

**Deferred from v1.0 → next milestone:**
- PERM-02 (P1) — auditoria ampla de permissões assessor/admin/advisor
- MONO-01 (P1) — decomposição de VeterinaryScreen.tsx (1539 linhas)
- MONO-02 (P2) — decomposição de FieldHomeScreen.tsx (1299 linhas)

</details>

### 🧭 v1.1 (TBD)

Próximo milestone definido via `/gsd-new-milestone`. Candidatos:
- Validação em device real (EAS build) de AUTH-01 + APPLE-01 + UX-05
- Code quality: MONO-01, MONO-02, PERM-02
- Geração de types Database via Supabase CLI
- Storage hardening com bucket privado + signed URLs

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 1. Auth & Notifications | v1.0 | Shipped | 2026-04-17 |
| 2. RLS Haras Scope | v1.0 | Shipped | 2026-04-17 |
| 3. Offline Queue | v1.0 | Shipped | 2026-04-17 |
| 4. Apple Account Deletion | v1.0 | Shipped | 2026-04-17 |
| 5. P1 Cleanup | v1.0 | Shipped (13/15) | 2026-04-17 |
| 6. P2 Hygiene | v1.0 | Shipped (9/10) | 2026-04-17 |

*Last updated: 2026-04-17 after v1.0 milestone*
