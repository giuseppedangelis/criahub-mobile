# Paridade Reprodução Web x Mobile (Veterinária)

## Baseline oficial
- Referência Web para integração: `src/services/reproduction.ts` e `src/hooks/useReproduction.ts` (módulo funcional).
- Perfis `peao` e `veterinario` permanecem **mobile-only** para operação de campo.

## O que foi integrado nesta etapa
1. Camada de reprodução no mobile alinhada ao web:
   - `listEvents`
   - `listGestations`
   - `getStats`
   - `createEvent`
   - `createGestation`
   - `updateGestationStatus`
2. Hooks de reprodução com mutations e invalidação de cache:
   - `useReproductiveEventsQuery`
   - `useGestationsQuery`
   - `useReproductionStatsQuery`
   - `useCreateReproductiveEventMutation`
   - `useCreateGestationMutation`
   - `useUpdateGestationStatusMutation`
3. Tela vet de reprodução refatorada para operação completa:
   - resumo de métricas
   - listagem de eventos
   - listagem de gestações
   - criação de evento
   - criação de gestação
   - atualização de status da gestação
4. Rota/tab vet de reprodução reativada para acesso direto.

## Estado de paridade
- Eventos reprodutivos: **Alinhado (MVP operacional)**
- Gestações: **Alinhado (MVP operacional)**
- Estatísticas: **Alinhado (núcleo)**
- Coberturas/Ovulos/Embriões/Protocolos/Documentos de reprodução: **Gap**

## Próxima etapa sugerida
1. Integrar coberturas, ovulos e embriões no mobile vet.
2. Integrar protocolos reprodutivos e aplicações.
3. Integrar documentos de reprodução com upload e vínculo por evento/animal.
