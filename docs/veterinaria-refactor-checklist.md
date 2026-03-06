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
- [ ] Extrair `todayIsoDate` para util compartilhado
- [ ] Extrair normalizadores de status/tipo para modulo compartilhado
- [ ] Extrair `isCondominioAnimal` para util compartilhado
- [ ] Atualizar imports nas telas vet
- [ ] Validar build/typecheck

### Fase 2 - Gating de acesso e consistencia de queries (baixo risco)
- [ ] Criar helper/hook unico para acesso vet (`role + haras`)
- [ ] Padronizar checks de acesso nas telas vet
- [ ] Alinhar `enabled` de queries ao mesmo criterio
- [ ] Validar navegacao por rota vet
- [ ] Validar build/typecheck

### Fase 3 - Rota canonica do prontuario vet (baixo risco)
- [ ] Definir rota canonica (`/(app)/vet-prontuario/[id]`)
- [ ] Ajustar `/(app)/animal/[id]` para redirecionamento vet
- [ ] Revisar stack de rotas para evitar duplicidade funcional
- [ ] Validar deep links/back stack
- [ ] Validar build/typecheck

### Fase 4 - Padronizacao de status (medio risco)
- [ ] Centralizar adapters de status (agenda/reproducao/tarefas)
- [ ] Substituir mapeamentos inline nas telas/services
- [ ] Revisar filtros e labels para consistencia
- [ ] Validar cenarios de transicao de status
- [ ] Validar build/typecheck

### Fase 5 - VetAnimalChart sem query direta (medio risco)
- [ ] Criar hook/service para dados clinicos do prontuario
- [ ] Remover query Supabase inline da tela
- [ ] Garantir invalidacao de cache consistente
- [ ] Validar fluxo de prontuario (leitura + escrita)
- [ ] Validar build/typecheck

### Fase 6 - Ajuste de escopo entre telas (medio risco)
- [ ] Reduzir `VeterinaryScreen` para papel de hub
- [ ] Delegar cadastros completos para telas especializadas
- [ ] Preservar atalhos com parametros de navegacao
- [ ] Revisar textos e UX para clareza de ownership
- [ ] Validar regressao funcional vet
- [ ] Validar build/typecheck

### Fase 7 - Encapsular agenda -> tarefa (opcional)
- [ ] Criar comando de dominio (service) para conversao evento->tarefa
- [ ] Remover regra inline de `VetAgendaScreen`
- [ ] Garantir defaults e vinculos consistentes
- [ ] Validar fluxo completo na agenda vet
- [ ] Validar build/typecheck

## Controle de progresso
- Inicio: 2026-03-06
- Status atual: Planejamento criado
- Fase em andamento: Nenhuma

## Decisoes tecnicas
- Priorizar fases de baixo risco antes de mudancas estruturais
- Evitar mudancas de UX grandes nas fases 1-5
- Cada fase deve fechar com typecheck verde

## Registro de execucao
- [2026-03-06] Documento inicial criado.
