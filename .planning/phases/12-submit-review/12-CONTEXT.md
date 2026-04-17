# Phase 12: 12-submit-review - Context

**Gathered:** 2026-04-17 (fast-path, no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

Submeter o build TestFlight validado à App Review e conduzir qualquer recovery de rejeição. Escopo: Supabase redirect allowlist (SUBMIT-01), Submit for Review no ASC com Manual Release (SUBMIT-02), monitoring do Resolution Center, playbook de recovery. **Fora do escopo:** qualquer mudança de código/config (requires new build + Phase 11 re-run), métricas pós-launch.

</domain>

<decisions>
## Implementation Decisions

### Supabase Redirect Allowlist (SUBMIT-01)

- **D-01:** Acessar Supabase Dashboard → Project `criahub` → Authentication → URL Configuration → Redirect URLs.
- **D-02:** Adicionar entries:
  - `criahubmobile://reset-password` (deep link nativo)
  - `https://criahub.com.br/reset-password` (fallback web, se tiver — opcional)
- **D-03:** Sem essa allowlist, Supabase `auth.resetPasswordForEmail({ redirectTo })` chamado pelo app com `redirectTo: "criahubmobile://reset-password"` é rejeitado ou cai no redirect default. AUTH-01 quebra silent em TestFlight.
- **D-04:** Executar ANTES de TestFlight validation da Phase 11 (BUILD-07). Se Phase 11 já validou AUTH-01 com sucesso, essa entry já existe — documentar estado.

### Submit for Review (SUBMIT-02)

- **D-05:** ASC web console → App Store tab → 1.0 Prepare for Submission → verificar checklist:
  - Build selecionado (o upado na Phase 11)
  - Screenshots uploaded (iPhone 6.9" + iPad 13")
  - Privacy Policy URL preenchida
  - Support URL preenchida
  - App Review Information preenchida (demo accounts + Review Notes + contato)
  - Age Rating respondido
  - App Privacy (Nutrition Labels) preenchidos
  - Content Rights + Advertising Identifier (IDFA: No)
  - Version Release: **Manual** (não Automatic, não Phased)
- **D-06:** Clicar "Add for Review" → "Submit to App Review". Status muda para "Waiting for Review".
- **D-07:** Apple review timeline 2026: média 24-48h, máximo 7 dias. Expectativa: resposta em 2-3 dias úteis.

### Resolution Center Monitoring

- **D-08:** Ativar email notifications em App Store Connect (Users and Access → Personal → Notifications) para responder rápido a rejeições.
- **D-09:** SLA de resposta: **≤ 4h após receber mensagem**. Apple frequentemente re-evalua em <24h se responder rápido.
- **D-10:** Todas as respostas ao reviewer em inglês (standard prático).

### Rejection Recovery Playbook

- **D-11:** Para cada rejeição comum, playbook documentado em `apple/docs/RECOVERY_PLAYBOOK.md`:
  - **Rejected Guideline 4.8** → Reply apontando seção do Review Notes que esclarece exemption. "Supabase is our own backend..."
  - **Rejected 5.1.1(v) account deletion** → Show video/screenshot de path ≤ 2 taps. Refer to APPLE-01 implementation.
  - **Rejected 2.1 crash** → Get crash logs from ASC → reproduce → fix → new build via Phase 11 → resubmit
  - **Rejected 5.1.2 privacy** → Three-way consistency audit. Verify `privacyManifests` matches ASC Nutrition Labels matches Privacy Policy URL
  - **Rejected 1.2 UGC** → Reply apontando RLS isolation; worst case, add "Report/Block user" simples em v1.2
  - **Rejected 5.2 trademark** → Remove ABCCMM references from listing; emphasize "criadores importam seus registros" no Review Notes
  - **Rejected Privacy Manifest** → Verify plutil output; re-verify 4 reason codes
  - **Rejected Usage Description** → Rewrite com contexto específico (já feito em Phase 7 D-04/D-05)
- **D-12:** Se rejeição precisa fix de código, voltar pra Phase 7 ou 8, nova build Phase 11, ressubmeter Phase 12. Build number auto-incrementa via EAS (cli.appVersionSource: remote).

### Approved — Release

- **D-13:** Status "Pending Developer Release" → escolher momento de release (Manual Release permite agendar).
- **D-14:** Monitorar métricas iniciais (ASC Analytics): crash rate, impressions, first-week downloads. Não é escopo desta fase, só observacional.

### Claude's Discretion

- Texto exato das respostas ao Resolution Center (adaptado por rejeição)
- Se incluir vídeo demonstrando delete flow quando 5.1.1(v) é rejeitado (YES — poderoso)
- Quando agendar release após approval (dia útil manhã, não Sexta à noite)

</decisions>

<canonical_refs>
## Canonical References

### Research (this milestone)

- `.planning/research/PITFALLS.md` §all (recovery table)
- `.planning/research/FEATURES.md` §Block H Submit for Review
- `.planning/research/SUMMARY.md` §Phase 12

### Milestone docs

- `.planning/REQUIREMENTS.md` §SUBMIT-01, §SUBMIT-02
- `.planning/ROADMAP.md` §Phase 12
- `apple/docs/REVIEW_NOTES.md` (created in Phase 9) — fonte de defesas por guideline

### Apple official

- https://developer.apple.com/app-store/review/ — review process + timelines
- https://developer.apple.com/help/app-store-connect/manage-app-versions/submit-a-version-for-review/
- https://developer.apple.com/help/app-store-connect/resolve-review-issues/ — Resolution Center workflow

### Supabase

- https://supabase.com/docs/guides/auth/redirect-urls — redirect URL config

</canonical_refs>

<code_context>
## Existing Code Insights

Esta fase é **inteiramente externa** — operações em Supabase Dashboard, ASC web console, e Resolution Center. Zero código tocado salvo se recovery exigir (aí volta para Phase 7/8/11 e ressubmete).

</code_context>

<specifics>
## Specific Ideas

- Manual Release permite coordenar launch com marketing/comunicação. Apple recomenda para first submissions.
- SLA ≤ 4h é realista: Apple frequentemente re-review em <24h pós-reply, acelerando total timeline.
- Playbook documentado em markdown poupa tempo em rejeições subsequentes (cada guideline tem padrão de defesa).

</specifics>

<deferred>
## Deferred Ideas

- Phased Release (7-day rollout) — útil para updates, não primeira submissão
- Automatic Release — deixar para atualizações menores v1.0.1+
- Crash analytics via ASC (natural) ou Sentry (v1.2+) — observability fora de v1.1
- Subscription setup (se migrar para IAP futuro) — v2+

</deferred>

---

*Phase: 12-submit-review*
*Context gathered: 2026-04-17 via fast-path*
