# Paridade Saúde Web x Mobile (Veterinária)

## Baseline oficial
- Referência Web para integração: **módulo de saúde do Criador** (`src/services/health.ts`, `src/hooks/useAnimalHealth.ts`, `components/breeder/Health*`).
- **Não usar** `components/employee/Vet*` como referência funcional, pois é fluxo visual/demo e não o contrato final.

## Escopo comparado
- Web (fonte de verdade): procedimentos, vacinas, exames, resumo de saúde.
- Mobile (perfil veterinária): clínica, rotina de tarefas, agenda, prontuário por animal.

## Matriz de paridade

| Domínio | Web (saúde) | Mobile atual | Status |
|---|---|---|---|
| Procedimentos (`health_records`) | Listar + criar | Listar no prontuário + criar em Clínica | Parcialmente alinhado |
| Vacinas (`vaccines`) | Listar + criar (próxima dose) | Listar no prontuário + criar via lote sanitário | Parcialmente alinhado |
| Exames (`exams`) | Listar + criar (arquivo/anexo) | Listar no prontuário (criação clínica usa `reproductive_exams`) | Gap |
| Resumo de saúde (`getHealthSummary`) | Sim | Painel vet próprio (outras métricas) | Gap |
| Reprodução clínica (`reproductive_exams`,`breeding_events`) | Indireto no breeder | Forte no mobile vet | Mobile-first |
| Agenda/Eventos (`events`) | Sim | Sim + converter para tarefa | Alinhado |
| Tarefas (`tasks`) | Sim | Sim + execução/devolutiva/anexos | Alinhado |

## Ajustes já executados nesta fase
1. Criada camada mobile de saúde alinhada ao web:
   - `src/services/health.ts`
   - `src/hooks/useAnimalHealth.ts`
2. Refatorado prontuário vet para usar essa camada e separar domínios:
   - abas: Reprodução, Procedimentos, Vacinas, Exames, Biometria
   - arquivo: `src/screens/VetAnimalChartScreen.tsx`
3. Corrigido fluxo de tratamento para schema real do banco (sem colunas inexistentes `medicamento`/`dosagem`).
4. Incluída criação de registros de saúde direto no prontuário vet:
   - procedimento (`health_records`)
   - vacina individual (`vaccines`)
   - exame clínico (`exams`) com suporte a anexos
5. Incluído resumo de saúde na Clínica Veterinária (`useHealthSummary`).
6. Incluídos fluxos de edição e exclusão no prontuário para:
   - procedimentos
   - vacinas
   - exames
7. Incluída validação de anexos de exame no mobile (tipo e tamanho).
8. Incluído modelo estruturado de medicação em `health_records.medication_plan` com suporte de cadastro no prontuário.
9. Incluídos guardrails operacionais no prontuário:
   - confirmação antes de excluir
   - opção de desfazer última exclusão
   - anexos de exame com seleção múltipla e validação de tipo/tamanho
10. Auditoria implantada via banco (`health_audit_logs` + triggers em `health_records`, `vaccines`, `exams`) e exibida no prontuário.
11. Upload de exames com progresso no app (percentual por arquivos enviados).

## Gaps para integração completa
1. Evoluir progresso de upload para nível por-byte (atual: progresso por arquivos concluídos).
2. Melhorar UX de edição em lote para medicações estruturadas.
3. Enriquecer auditoria com nome do usuário (hoje exibido por ID curto quando disponível).

## Critério de aceite da integração completa
- Mesmo dado criado em uma plataforma aparece corretamente na outra.
- Procedimentos, vacinas e exames com os mesmos campos obrigatórios e mesma semântica.
- Prontuário do animal consistente entre web e mobile.
