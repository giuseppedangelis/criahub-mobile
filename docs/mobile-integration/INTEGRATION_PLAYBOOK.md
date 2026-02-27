# Mobile DB Integration Playbook

## Objetivo
Garantir que o app mobile sempre carregue dados consistentes por `haras_id` para os perfis suportados (`criador`, `veterinario`, `peao`/`funcionario`).

## Contrato minimo por tela
- `Plantel` (`animals`): requer `profiles.haras_id` resolvido e animais no haras.
- `Agenda` (`events`): requer eventos para o haras.
- `Reproducao` (`reproductive_events`, `gestations`): requer dados dessas tabelas para o haras.
- `Veterinaria` (`tasks`, `reproductive_exams`, `health_records`, `semen_inventory_stallion`): requer tarefas na janela operacional e dados clinicos.
- `Ficha Animal` (`documents`, `animal_videos`, `awards`, `health_records`, `animal_location_history`, `reproductive_events`): sem bloqueio total em falha parcial; exibir aviso.

## Regras de integracao
1. Resolver `haras_id` por ordem:
   - `profiles.haras_id`
   - fallback em `haras_members` com status ativo
   - fallback final no ultimo vinculo valido
2. Nunca executar query por modulo sem `haras_id` resolvido.
3. Estados vazios devem diferenciar:
   - sem vinculo de haras
   - sem dados no haras
   - falha de integracao/permissao

## Checklist de QA (por perfil)
- Criador:
  - Plantel lista animais
  - Ficha abre sem erro total (com aviso quando bloco falhar)
  - Agenda e Reproducao exibem vazio explicativo quando nao houver dados
- Veterinaria:
  - Plantel clinico carrega e abre prontuario
  - Agenda vet mostra tarefas na janela operacional (atrasadas + proximas)
  - Reproducao vet carrega eventos/gestacoes
- Peao/Funcionario:
  - Campo salva offline
  - Sincronizacao atualiza pendencias

## Operacao recomendada em homologacao
1. Rodar `docs/mobile-integration/AUDIT_AND_SEED.sql`.
2. Confirmar distribuicao de dados por tabela.
3. Testar com 1 conta por perfil suportado.
4. Validar logs de API para `401/403/500` antes do release.
