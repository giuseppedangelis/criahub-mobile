# Phase 10: 10-demo-seed - Context

**Gathered:** 2026-04-17 (fast-path, no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

Popular um haras de demonstração no Supabase (`apple-review-haras`) com dados realistas e criar 3 usuários demo (criador, veterinário, peão) bound via `haras_members` para o reviewer Apple navegar o app. Escopo: script SQL idempotente (DEMO-01), 3 demo accounts (DEMO-02), documentar credenciais em `apple/docs/DEMO_ACCOUNTS.md` gitignored. **Fora do escopo:** ASC metadata (Phase 9), screenshots (Phase 11), qualquer mudança em código client-side.

</domain>

<decisions>
## Implementation Decisions

### Seed Script Location (DEMO-01)

- **D-01:** Script SQL em `supabase/migrations/20260417000000_seed_apple_review_haras.sql` OU em `scripts/seed-apple-review.sql` — decidir no plan baseado em convenção de migrations do projeto.
- **D-02:** Se Phase 10 execution precisa rodar via `mcp__supabase_criahub__apply_migration`, usar migration path. Se for run manual via `psql`/Supabase SQL editor, usar `scripts/`.
- **D-03:** **Idempotente:** usar `INSERT ... ON CONFLICT DO NOTHING` ou `DROP TABLE IF EXISTS apple_review_seed_log; CREATE TABLE apple_review_seed_log (...)` check pattern. Pode rodar múltiplas vezes sem duplicar.

### Seed Content (DEMO-01)

- **D-04:** 1 haras: nome "Haras Demo CriaHub — Apple Review", slug "apple-review-haras". Endereço fictício pt-BR (evitar dados reais).
- **D-05:** ≥12 animais:
  - 6 oficiais ABCCMM (`abccmm_rowid` setado, nomes fictícios plausíveis de Mangalarga Marchador, registros em formato oficial)
  - 6 avulsos (sem `abccmm_rowid`, criação manual mock)
  - Mix de sexos (machos reprodutores, éguas matrizes, potros jovens)
  - Datas de nascimento variadas (cobrir categoria Potro, Jovem, Adulto, Senior)
- **D-06:** 3 gestações ativas (usar Supabase `gestations` table): 1 em early (até 60 dias), 1 em mid (60-200d), 1 em late (200-340d). Relacionadas a 3 das 6 éguas.
- **D-07:** 5 tarefas de agenda: mix de tipos (vacinação, vermifugação, ferrageamento, exame reprodutivo, consulta veterinária). Algumas futuras, uma overdue para UI mostrar alerta.
- **D-08:** 2 field reports já registrados: 1 parto, 1 issue report. Com foto placeholder (usar URL pública de imagem CC0 ou skip foto).
- **D-09:** 1 condomínio (ownership com cotistas): animal compartilhado entre haras demo + cotista externo mock.
- **D-10:** 2 consultas veterinárias registradas: 1 exame reprodutivo de égua prenha, 1 saúde-geral.

### Demo Accounts (DEMO-02)

- **D-11:** 3 usuários via Supabase Auth:
  - `criador-demo@criahub.app` — role `criador`, senha complexa + documentada
  - `veterinario-demo@criahub.app` — role `veterinario`
  - `peao-demo@criahub.app` — role `peao`
  - Todos bound via `haras_members` a `apple-review-haras`
- **D-12:** Senhas geradas aleatórias (16 chars, mix alfanumérico + símbolos). Documentar em `apple/docs/DEMO_ACCOUNTS.md`.
- **D-13:** `apple/docs/DEMO_ACCOUNTS.md` DEVE estar em `.gitignore` antes de ser criado. Adicionar entry `apple/docs/DEMO_ACCOUNTS.md` ao `.gitignore` raiz.

### Idempotency & Cleanup (DEMO-01)

- **D-14:** Scrit tem função `cleanup_apple_review_haras()` SQL que deleta em cascata: gestations → tasks → field_reports → ownership → animals → haras_members → auth.users (via `auth.admin`) → haras. Reviewer final pode deixar esse haras em produção ou deletar pós-approval.
- **D-15:** Flag `is_demo = true` em coluna custom do haras (se não existe, adicionar via migration menor) OU em metadata JSON — evita confusão com haras reais de produção.

### Executing the Seed (DEMO-01)

- **D-16:** Executar via MCP `mcp__supabase_criahub__apply_migration` com migration SQL. Não executar via client-side nem Supabase Dashboard (evitar side effects em RLS manual run).
- **D-17:** Pós-seed, rodar sanity query: `SELECT count(*) FROM animals WHERE haras_id = (SELECT id FROM haras WHERE slug = 'apple-review-haras')` — deve retornar ≥12.

### TestFlight Sanity Check (DEMO-02)

- **D-18:** Após seed + demo accounts criados, login em cada conta via app em build preview. Verificar:
  - criador-demo → Plantel mostra 12 animais, Agenda mostra 5 tarefas
  - veterinario-demo → Rotina mostra 2 consultas, Plantel mostra 12 animais
  - peao-demo → Campo mostra 2 field reports recentes
- **D-19:** Se qualquer role mostrar tela vazia, fix seed antes de continuar pra Phase 11.

### Claude's Discretion

- Nomes dos animais (Mangalarga Marchador-style: "Sultão do Cedro", "Estrela da Manhã", "Relampago de Prata", etc.)
- Exato formato de CPF/CNPJ mock em cotista externo (usar geradores conhecidos de teste, não inventar números reais)
- URLs de foto placeholder — se complicado, deixar sem foto (NULL)

</decisions>

<canonical_refs>
## Canonical References

### Research (this milestone)

- `.planning/research/PITFALLS.md` §#3 Demo haras returns empty data
- `.planning/research/SUMMARY.md` §Phase 10 Demo Data Seeding

### Milestone docs

- `.planning/REQUIREMENTS.md` §DEMO-01, §DEMO-02
- `.planning/ROADMAP.md` §Phase 10
- `apple/docs/APP_STORE_CONNECT_FIELDS.md` §Review Notes referencia contas demo

### Supabase schema (read at planning)

- `docs/mobile-integration/AUDIT_AND_SEED.sql` — se existe, é o ponto de partida para padrões de seed do projeto
- Migrations existentes em `supabase/migrations/` para convenção de naming

### Project references

- `src/lib/haras.ts` — helper `resolveUserHarasId` via `haras_members` fallback
- `.planning/codebase/` — STRUCTURE.md para ver tabelas existentes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- Tabela `haras_members` já existe (usada em AUTH-02 hot-swap haras). Padrão de bind user → haras.
- `auth.users` via Supabase Auth — criar via `auth.admin_create_user()` SQL function.

### Established Patterns

- Migrations em `supabase/migrations/` com naming `YYYYMMDDHHMMSS_description.sql`.
- Uso de `abccmm_rowid` como flag de oficial.
- RLS scoping por `haras_id` em todas as tabelas de conteúdo (animals, gestations, tasks, field_reports, ownership).

### Integration Points

- Phase 11 (BUILD-02 screenshots, BUILD-07 TestFlight validation) depende deste seed existir.
- Phase 9 (ASC-05 Review Notes) referencia estas contas demo em notes para o reviewer.

### Anti-Patterns a Evitar

- Não criar seed em dados de produção (tentação de reutilizar haras real). USAR haras novo isolado.
- Não hardcodar UUIDs (deixar Supabase gerar com `gen_random_uuid()`).
- Não commitar DEMO_ACCOUNTS.md (senhas reais).

</code_context>

<specifics>
## Specific Ideas

- Nomes de animais em pt-BR, estilo Mangalarga Marchador tradicional, para parecer haras real brasileiro ao reviewer.
- Photos placeholder opcional — reviewer não vai rejeitar por falta de foto (Plantel mostra avatar default com iniciais). Simplificar pulando fotos.
- Data de nascimento mais velha = reviewer vê "animais adultos" na Plantel, que é o uso real do app.

</specifics>

<deferred>
## Deferred Ideas

- Gerar screenshots diretamente a partir deste seed via ferramenta automática (Shotbot, XCUITest) — v1.2
- Usar Supabase Storage bucket seedeado com fotos CC0 — complexidade extra para Phase 11 gerenciar
- Multi-haras demo (ex: 2 haras mostrando hot-swap) — reviewer só precisa ver 1 haras funcionando

</deferred>

---

*Phase: 10-demo-seed*
*Context gathered: 2026-04-17 via fast-path*
