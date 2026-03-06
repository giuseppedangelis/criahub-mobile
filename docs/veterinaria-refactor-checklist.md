# Refatoracao do modulo Veterinaria (Mobile)

## Objetivo
Refatorar o fluxo veterinario no app mobile para reduzir duplicacoes, centralizar regras de negocio e alinhar responsabilidades por tela, sem quebrar os fluxos atuais.

## Escopo alvo
- `VeterinaryScreen`: hub operacional (atalhos + indicadores)
- `VetReproductionScreen`: eventos e gestacoes
- `VetAnimalChartScreen`: prontuario individual
- `VetAgendaScreen`: agenda e status de eventos
- `VetRoutineScreen`: execucao de tarefas
- `VetPlantelScreen`: busca e navegacao para prontuario

## Checklist de execucao

### Fase 1 - Shared utils e constantes (baixo risco)
- [x] Extrair `todayIsoDate` para util compartilhado
- [x] Extrair normalizadores de status/tipo para modulo compartilhado
- [x] Extrair `isCondominioAnimal` para util compartilhado
- [x] Atualizar imports nas telas vet
- [x] Validar build/typecheck

### Fase 2 - Gating de acesso e consistencia de queries (baixo risco)
- [x] Criar helper/hook unico para acesso vet (`role + haras`)
- [x] Padronizar checks de acesso nas telas vet
- [x] Alinhar `enabled` de queries ao mesmo criterio
- [x] Validar navegacao por rota vet
- [x] Validar build/typecheck

### Fase 3 - Rota canonica do prontuario vet (baixo risco)
- [x] Definir rota canonica (`/(app)/vet-prontuario/[id]`)
- [x] Ajustar `/(app)/animal/[id]` para redirecionamento vet
- [x] Revisar stack de rotas para evitar duplicidade funcional
- [x] Validar deep links/back stack
- [x] Validar build/typecheck

### Fase 4 - Padronizacao de status (medio risco)
- [x] Centralizar adapters de status (agenda/reproducao/tarefas)
- [x] Substituir mapeamentos inline nas telas/services
- [x] Revisar filtros e labels para consistencia
- [x] Validar cenarios de transicao de status
- [x] Validar build/typecheck

### Fase 5 - VetAnimalChart sem query direta (medio risco)
- [x] Criar hook/service para dados clinicos do prontuario
- [x] Remover query Supabase inline da tela
- [x] Garantir invalidacao de cache consistente
- [x] Validar fluxo de prontuario (leitura + escrita)
- [x] Validar build/typecheck

### Fase 6 - Ajuste de escopo entre telas (medio risco)
- [x] Reduzir `VeterinaryScreen` para papel de hub
- [x] Delegar cadastros completos para telas especializadas
- [x] Preservar atalhos com parametros de navegacao
- [x] Revisar textos e UX para clareza de ownership
- [x] Validar regressao funcional vet
- [x] Validar build/typecheck

### Fase 7 - Encapsular agenda -> tarefa (opcional)
- [x] Criar comando de dominio (service) para conversao evento->tarefa
- [x] Remover regra inline de `VetAgendaScreen`
- [x] Garantir defaults e vinculos consistentes
- [x] Validar fluxo completo na agenda vet
- [x] Validar build/typecheck

## Controle de progresso
- Inicio: 2026-03-06
- Status atual: Fases 1-7 concluidas
- Fase em andamento: Nenhuma

## Decisoes tecnicas
- Priorizar fases de baixo risco antes de mudancas estruturais
- Evitar mudancas de UX grandes nas fases 1-5
- Cada fase deve fechar com typecheck verde

## Registro de execucao
- [2026-03-06] Documento inicial criado.
- [2026-03-06] Fase 1 concluida: criado `src/lib/vet-shared.ts` e removidas duplicacoes basicas nas telas vet.
- [2026-03-06] Fase 2 concluida: criado `src/lib/vet-access.ts`, padronizado gating vet e `enabled` de queries nas telas veterinarias.
- [2026-03-06] Fase 3 concluida: `/(app)/animal/[id]` redireciona veterinaria para a rota canonica `/(app)/vet-prontuario/[id]`.
- [2026-03-06] Fase 4 concluida: status adapters centralizados em `src/lib/vet-shared.ts` e aplicados em telas/services vet.
- [2026-03-06] Fase 5 concluida: query clinica do prontuario extraida para `src/services/vet-chart.ts` + `src/hooks/useVetChart.ts`, com invalidacao de cache vet-chart.
- [2026-03-06] Fase 6 concluida: `VeterinaryScreen` reposicionado como hub, com navegacao para modulos dedicados e ajustes de ownership no fluxo vindo do prontuario.
- [2026-03-06] Fase 7 concluida: conversao agenda->tarefa encapsulada em service/hook (`agendaService.convertEventToTask` + `useConvertAgendaEventToTaskMutation`).
