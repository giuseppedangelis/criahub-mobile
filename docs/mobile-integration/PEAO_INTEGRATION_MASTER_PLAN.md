# Plano Mestre de Integracao Mobile - Usuario Peao

## Objetivo
Manter a evolucao do modulo do peao alinhada ao sistema web, com visibilidade clara do que ja foi implementado, do que falta e da ordem correta de entrega para evitar desvio de escopo.

## Contexto consolidado
- O app mobile ja possui modulo Campo para perfis `peao` e `funcionario`.
- O peao ja consegue registrar:
  - nascimento em `pending_validations` (tipo `nascimento`)
  - ocorrencia em `pending_validations` (tipo `ocorrencia`)
- O app ja tem fila offline e sincronizacao para envios de campo.
- Ainda falta fechar o ciclo de retorno do escritorio para o peao (status final + observacoes + tratativa).

## Principios de execucao
- Priorizar paridade funcional com o fluxo web antes de refinamentos visuais.
- Toda feature de campo deve operar com e sem internet.
- Nenhuma query de modulo deve rodar sem `haras_id` resolvido.
- Entrega so termina com criterio de aceite validado por perfil.

## Macro roadmap (ordem oficial)

### Fase 0 - Base de governanca (este documento)
Status: `em andamento`
- [x] Consolidar escopo completo de peao.
- [ ] Atualizar status por sprint/release.
- [ ] Registrar decisoes tecnicas no bloco "Log de decisoes".

### Fase 1 - Pendencias + retorno do escritorio (prioridade maxima)
Status: `em andamento`
Objetivo: fechar o ciclo "envio -> validacao -> retorno".

Implementacoes:
- [x] Criar listagem "Minhas pendencias" (somente itens `created_by = auth.uid()`).
- [x] Exibir timeline por item: criado, em analise, aprovado/oficializado, correcao solicitada, rejeitado.
- [x] Exibir `validation_notes` de forma clara para o peao.
- [x] Permitir filtro por tipo (`nascimento`, `ocorrencia`) e status.
- [x] Melhorar feedback pos-envio para confirmar que o item entrou na fila ou foi sincronizado.
- [x] Invalidar cache apos envio e apos flush offline.

Arquivos previstos:
- `src/types/domain.ts`
- `src/services/field.ts`
- `src/hooks/useField.ts`
- `src/screens/FieldHomeScreen.tsx`

Criterios de aceite:
- [x] Item enviado online aparece imediatamente na lista.
- [x] Item enviado offline aparece como pendente local e sincroniza depois.
- [ ] Mudanca de status feita no escritorio aparece no mobile.
- [x] Observacao do escritorio (`validation_notes`) aparece no card do peao.

### Fase 2 - Gestoes para operacao de campo
Status: `implementado (aguardando QA)`
Objetivo: dar previsibilidade de partos para o peao.

Implementacoes:
- [x] Lista simplificada de gestacoes ativas por prioridade de data.
- [x] Bloco "proximos partos" (7, 15, 30 dias).
- [x] Acesso rapido para iniciar registro de nascimento a partir da gestacao.
- [x] Estados vazios corretos (sem haras, sem dados, erro de permissao/integracao).

Arquivos previstos:
- `src/services/reproduction.ts`
- `src/hooks/useReproduction.ts`
- `src/screens/FieldHomeScreen.tsx`

Criterios de aceite:
- [x] Peao visualiza somente dados do proprio haras.
- [x] Datas e status de gestacao coerentes com web.
- [x] Nascimento pode ser iniciado em fluxo curto a partir da egua.

### Fase 3 - Tarefas de campo (rotina do peao)
Status: `implementado (aguardando QA)`
Objetivo: operacionalizar execucao diaria e devolutiva.

Implementacoes:
- [x] Melhorar secao "Minhas tarefas" com filtros (prazo, status, prioridade).
- [x] Historico resumido de execucoes por tarefa.
- [x] Melhor feedback para anexos e resultado de execucao offline.
- [x] Reagendamento guiado para tarefas nao concluidas.

Arquivos previstos:
- `src/services/tasks.ts`
- `src/hooks/useTasks.ts`
- `src/components/tasks/TaskExecutionModal.tsx`
- `src/screens/FieldHomeScreen.tsx`

Criterios de aceite:
- [x] Peao so executa tarefas atribuidas a ele.
- [x] Anexos sobem e ficam visiveis no historico.
- [x] Mudanca de status e prazo refletida em ate 1 ciclo de refetch.

### Fase 4 - Offline-first avancado
Status: `implementado (aguardando QA)`
Objetivo: reduzir perda de contexto em campo sem rede.

Implementacoes:
- [x] Enriquecer snapshot de sincronizacao (fila por tipo, ultima falha, tentativas).
- [x] Politica de retry com backoff para envios de campo.
- [x] Melhor deduplicacao para evitar envios repetidos acidentais.
- [x] Indicadores de confianca de sync no modulo Campo.

Arquivos previstos:
- `src/services/field-offline.ts`
- `src/services/field.ts`
- `src/hooks/useField.ts`
- `src/screens/FieldHomeScreen.tsx`

Criterios de aceite:
- [x] Sem duplicacao em cenarios de reconexao oscilante.
- [x] Mensagem de erro orienta acao do usuario.
- [x] Taxa de sincronizacao bem-sucedida acima de baseline definido.

### Fase 5 - Notificacoes e visibilidade de retorno
Status: `implementado (aguardando QA)`
Objetivo: reduzir dependencia de abertura manual da tela Campo.

Implementacoes:
- [x] Central simples de avisos de retorno do escritorio.
- [x] Notificacao no app para "correcao solicitada" e "rejeitada".
- [x] Marcar item como lido e registrar data de visualizacao.

Dependencias:
- Definicao de evento de notificacao push no backend (pendente para evolucao de push nativo).
- Politica RLS para leitura segura por usuario (mantida via fonte `pending_validations`).

### Fase 6 - Hardening de seguranca, dados e operacao
Status: `continuo`
Objetivo: garantir escala sem regressao de acesso.

Implementacoes:
- [ ] Revisar e testar politicas RLS de `pending_validations`, `tasks`, `task_executions`.
- [ ] Garantir consistencia entre `profiles.haras_id` e `haras_members`.
- [ ] Definir auditoria minima para alteracoes de status de pendencias.
- [ ] Monitorar advisors de seguranca e tratar itens criticos antes de release.

## Matriz de paridade Peao (Web x Mobile)

| Fluxo | Web referencia | Mobile atual | Gap | Prioridade |
|---|---|---|---|---|
| Registrar nascimento | Previsto no fluxo de campo + validacao no escritorio | Implementado | Retorno de validacao para peao | Alta |
| Registrar ocorrencia | Previsto no fluxo de campo + tratativa | Implementado | Retorno de tratativa para peao | Alta |
| Acompanhar pendencias enviadas | Previsto no fluxo assessor/peao | Parcial | Timeline e status detalhado | Alta |
| Visualizar gestacoes | Previsto para operacao de campo | Nao implementado no modulo peao | Lista simplificada e proximos partos | Media |
| Executar tarefas atribuidas | Previsto em rotina operacional | Implementado parcial | Filtros, historico e UX offline | Media |
| Notificacoes de retorno | Previsto no sistema | Nao implementado no peao | Centro de avisos + leitura | Media |

## Dependencias tecnicas criticas
- Schema de `pending_validations` e semantica oficial de status.
- Contrato de dados para `validation_notes` e metadados de retorno.
- Regras RLS para garantir isolamento por `haras_id` e por usuario criador quando necessario.
- Buckets de storage e politicas para anexos de campo.

## Riscos e mitigacoes
- Risco: divergencia de status entre web e mobile.
  - Mitigacao: funcao unica de normalizacao de status no mobile.
- Risco: regressao offline com envios duplicados.
  - Mitigacao: idempotencia local + deduplicacao no flush.
- Risco: perda de escopo por demandas paralelas.
  - Mitigacao: seguir ordem das fases e atualizar este documento a cada entrega.

## Checklist operacional por release (Peao)
- [ ] Revisar este plano e mover itens de status.
- [ ] Validar criterios de aceite da fase alvo.
- [ ] Rodar QA com conta real de peao e haras valido.
- [ ] Testar fluxo online e offline completo.
- [ ] Conferir logs de API para 401/403/500 no periodo de teste.
- [ ] Atualizar docs de paridade e changelog interno.

## Fora de escopo (neste roadmap de peao)
- Refatoracoes visuais sem impacto operacional.
- Mudancas de modulo de criador/veterinario que nao afetam fluxo de campo.
- Automatizacoes administrativas sem relacao com pendencias/tarefas de campo.

## Log de decisoes
> Atualizar sempre que uma decisao mudar o comportamento esperado.

- 2026-02-28: Prioridade definida para "Pendencias + retorno" como primeiro ciclo.
- 2026-02-28: Implementada primeira versao de "Minhas pendencias" no modulo Campo, com filtros por tipo/status e leitura de retorno (`validation_notes`).
- 2026-02-28: Feedback pos-envio refinado (sincronizado x fila offline) e atualizacao manual/automatica da lista de pendencias no Campo.
- 2026-02-28: Fase 2 implementada no app com secao de gestacoes ativas, janela de parto (7/15/30 dias) e atalho para abrir registro de nascimento com egua preselecionada.
- 2026-02-28: Fase 3 implementada no app com filtros de tarefas, historico resumido por tarefa, feedback de anexos/offline e reagendamento guiado para resultados nao concluidos.
- 2026-02-28: Fase 4 implementada com snapshot de sync enriquecido (fila por tipo, falhas, proxima tentativa), retry com backoff exponencial e deduplicacao de fila offline por fingerprint em janela curta.
- 2026-02-28: Fase 5 implementada no app com central de avisos de retorno, marcacao de leitura por usuario/haras em armazenamento local e foco em status de correcao/rejeicao/aprovacao/em analise.

## Como usar este documento no dia a dia
- Antes de iniciar desenvolvimento: confirmar fase e criterio de aceite.
- Durante implementacao: marcar caixas conforme entrega real.
- Ao finalizar: registrar resultado, riscos remanescentes e proxima fase.
