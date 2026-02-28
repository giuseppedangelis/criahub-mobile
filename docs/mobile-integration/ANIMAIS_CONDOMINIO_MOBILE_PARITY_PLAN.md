# Animais de Condominio - Plano de Paridade Mobile/Web

## Contexto

Na web (`develop`), o fluxo de plantel ja contempla animais de condominio por meio de campos existentes em `animals` (`proprietario`, `criador`, `haras_origem`, `tipo_servico`, `status`) e por exibicao visual de contexto de compartilhamento.

No mobile, esses dados ainda nao eram mapeados de forma completa no dominio e na UI.

## Objetivo

Alinhar o mobile com a experiencia atual da web para o contexto de animais compartilhados (condominio), sem quebrar o isolamento multi-tenant por `haras_id`.

## Escopo do plano

1. **Dados (service/domain):**
   - Expandir `AnimalStatus` para incluir `provisorio` e `em_servico`.
   - Mapear em `Animal` os campos de contexto de condominio e servico:
     - `origin_haras`
     - `service_type`
     - `management_status`
     - `criador`
     - `proprietario`
   - Atualizar mapeamentos DB <-> app para status com acentos/variantes.

2. **Apresentacao (UI):**
   - Exibir marcador visual `Condominio` quando `proprietario` indicar esse contexto.
   - Exibir `Proprietario` e `Criador` nos cards/listas principais onde houver leitura de plantel.
   - Enriquecer ficha do animal com dados de origem/servico/gestao para coerencia com web.

3. **Formatacao e consistencia:**
   - Atualizar labels de status para novos valores.
   - Atualizar badge de status para novas tonalidades sem mudar o design base.

## Regras de deteccao de condominio

- Deteccao baseada em heuristica de texto no `proprietario`:
  - normalizacao para uppercase
  - remocao de acentos
  - busca por `CONDOMINIO`

> Observacao: mantida a mesma estrategia de heuristica da web atual. Sem nova tabela de compartilhamento neste ciclo.

## Execucao realizada

- [x] Documento de plano criado.
- [x] `src/types/domain.ts` atualizado com novos status e campos de animal.
- [x] `src/services/animals.ts` atualizado com select e mapeamentos de condominio/status.
- [x] `src/utils/format.ts` atualizado com labels de `provisorio` e `em_servico`.
- [x] `src/components/ui/StatusBadge.tsx` atualizado para novos status.
- [x] `src/screens/PlantelScreen.tsx` atualizado com:
  - tag de condominio,
  - exibicao de proprietario/criador,
  - filtro de novos status,
  - resumo rapido de animais em condominio.
- [x] `src/screens/FieldAnimalSearchScreen.tsx` atualizado com tag de condominio e proprietario.
- [x] `src/screens/VetPlantelScreen.tsx` atualizado com tag de condominio, proprietario e categoria formatada.
- [x] `src/screens/AnimalDetailScreen.tsx` atualizado com bloco de dados de condominio/origem/servico.
- [x] `src/screens/VetAnimalChartScreen.tsx` atualizado com contexto de condominio no cabecalho.

## Fora de escopo neste ciclo

- Criacao de modelo de dados dedicado para copropriedade (n:n por animal/haras).
- Mudancas em regras de RLS alem das ja tratadas no hardening anterior.
- Alteracao de fluxos de cadastro/edicao de animais no mobile.

## Validacao sugerida

1. Conferir listagens com animais de `status = provisorio` e `status = em_servico`.
2. Conferir cards/telas com e sem `proprietario`.
3. Conferir deteccao visual de condominio em textos com e sem acento.
4. Garantir que usuario de um haras nao visualize animais de outro (RLS + filtro por `haras_id`).
