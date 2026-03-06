# 🏇 CRIAHUB - DOCUMENTAÇÃO GERAL DO SISTEMA

**Versão:** 2.1.0  
**Data:** 21 de Janeiro de 2025  
**Status:** Protótipo Funcional React/TypeScript  
**Objetivo:** Migração para FlutterFlow + Supabase com funcionalidade Offline-First

---

## 📋 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Hierarquia de Usuários](#3-hierarquia-de-usuários)
4. [Módulos por Perfil](#4-módulos-por-perfil)
5. [Funcionalidades Detalhadas](#5-funcionalidades-detalhadas)
6. [Fluxos de Trabalho](#6-fluxos-de-trabalho)
7. [Páginas e Componentes](#7-páginas-e-componentes)
8. [Design System](#8-design-system)
9. [Sistema de Notificações](#9-sistema-de-notificações)
10. [Roadmap de Migração](#10-roadmap-de-migração)

---

## 1. VISÃO GERAL

### 1.1 O que é o CriaHub?

O **CriaHub** é uma plataforma SaaS mobile-first para gestão completa de haras de cavalos da raça **Mangalarga Marchador**. O sistema foi desenvolvido com foco em usabilidade em ambientes rurais, conectividade limitada e estrutura hierárquica adequada à realidade dos haras brasileiros.

### 1.2 Problema que Resolve

- ❌ **Antes:** Gestão manual em planilhas, perda de dados, falta de rastreabilidade
- ✅ **Depois:** Sistema integrado, dados centralizados, histórico completo, relatórios automáticos

### 1.3 Diferenciais

1. **Especialização:** Focado exclusivamente na raça Mangalarga Marchador
2. **Mobile-First:** Design otimizado para smartphones em campo
3. **Offline-First:** Funciona sem internet, sincroniza depois
4. **Hierarquia:** Sistema de permissões adequado (Admin, Criador, Assessor, Funcionários)
5. **Integração ABCCMM:** Importação direta de planilhas oficiais da associação
6. **Validação de Campo:** Sistema único para validar dados do peão no escritório

### 1.4 Números do Sistema (Mock Data)

- 📊 **162 animais** cadastrados no plantel
- 👥 **4 perfis** de usuário diferentes
- 🔧 **50+ componentes** React/TypeScript
- 📱 **100% responsivo** mobile-first
- 🎨 **Dark/Light mode** completo
- 📈 **15.000+ linhas** de código

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Stack Tecnológico Atual (Protótipo)

#### Frontend
```
- React 18.3+
- TypeScript 5.0+
- Tailwind CSS v4.0
- Lucide React (ícones)
- Sonner 2.0.3 (toasts)
- Recharts (gráficos)
- React Hook Form 7.55.0
```

#### Estrutura de Pastas
```
/
├── components/
│   ├── admin/              # Módulo Administrador
│   ├── breeder/            # Módulo Criador
│   ├── advisor/            # Módulo Assessor
│   ├── employee/           # Módulo Funcionários (Peão/Vet)
│   ├── auth/               # Autenticação
│   ├── shared/             # Componentes compartilhados
│   └── ui/                 # Componentes UI base
├── contexts/               # Contextos globais
│   ├── ThemeContext.tsx
│   ├── UserContext.tsx
│   └── NotificationPreferencesContext.tsx
├── hooks/                  # Hooks customizados
│   ├── useResponsive.ts
│   └── useEscapeKey.ts
├── styles/                 # Estilos globais
│   ├── globals.css
│   └── criahub-dark.css
├── imports/                # Componentes Figma
└── docs/                   # Documentação
```

### 2.2 Stack Planejado (Migração)

#### Backend - Supabase
```
- PostgreSQL (banco de dados)
- Authentication (autenticação)
- Storage (arquivos/imagens)
- Real-time (sincronização)
- Edge Functions (lógica backend)
```

#### Frontend - FlutterFlow
```
- Dart/Flutter
- Offline-first architecture
- Local storage (SQLite)
- Sincronização automática
```

### 2.3 Fluxo de Dados

```
[Mobile App] ←→ [Local Storage] ←→ [Sync Engine] ←→ [Supabase] ←→ [PostgreSQL]
     ↓                                                    ↓
[Offline Mode]                                    [Cloud Storage]
```

---

## 3. HIERARQUIA DE USUÁRIOS

### 3.1 Estrutura Hierárquica

```
┌─────────────────────────────────────┐
│  ADMINISTRADOR DA PLATAFORMA        │
│  (Equipe CriaHub)                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  CRIADOR / DONO DE HARAS            │
│  (Cliente principal)                │
└─────────────────────────────────────┘
              ↓
        ┌─────────┴─────────┐
        ↓                   ↓
┌───────────────┐   ┌───────────────┐
│ ASSESSOR      │   │ FUNCIONÁRIOS  │
│ ADMINISTRATIVO│   │ (Peão/Vet)    │
└───────────────┘   └───────────────┘
```

### 3.2 Perfis Detalhados

#### 👨‍💼 ADMINISTRADOR DA PLATAFORMA
**Acesso:** Total  
**Função:** Gerenciar assinaturas, uso da plataforma, alertas críticos

**Permissões:**
- ✅ Visualizar todos os haras
- ✅ Gerenciar planos de assinatura
- ✅ Acompanhar métricas de uso
- ✅ Gerenciar conexão ABCCMM
- ✅ Enviar faturas
- ✅ Suporte técnico

**Acesso Negado:**
- ❌ Não edita dados de animais
- ❌ Não acessa dados financeiros dos clientes

---

#### 🏇 CRIADOR / DONO DE HARAS
**Acesso:** Total sobre seu haras  
**Função:** Gerenciar completamente seu haras

**Permissões:**
- ✅ Gestão completa do plantel
- ✅ Controle reprodutivo total
- ✅ Financeiro completo
- ✅ Agenda e eventos
- ✅ Relatórios e documentos
- ✅ Gerenciar equipe (assessor e funcionários)
- ✅ Configurações do haras

**Menu Principal:**
1. Dashboard
2. Plantel
3. Reprodução
4. Financeiro
5. Agenda
6. Relatórios
7. Configurações
8. Ajuda

---

#### 📋 ASSESSOR ADMINISTRATIVO
**Acesso:** Escritório / Administrativo  
**Função:** "Auditor de dados" - Importação ABCCMM, validação de pendências

**PIVOT ESTRATÉGICO:** Transformado em auditor focado em:
1. **Importação de Planilhas ABCCMM**
2. **Validação de Pendências do Peão**
3. **Ordens de Serviço vinculadas a animais**

**Permissões:**
- ✅ Importar planilhas ABCCMM
- ✅ Validar nascimentos registrados pelo peão
- ✅ Validar ocorrências de campo
- ✅ Criar e gerenciar ordens de serviço
- ✅ Visualizar plantel (leitura)
- ✅ Visualizar reprodução (leitura)
- ✅ Gerenciar financeiro (ordens de serviço)
- ✅ Gerenciar documentos
- ✅ Gerenciar tarefas da equipe
- ✅ Agenda e calendário

**Acesso Negado:**
- ❌ Não cadastra animais diretamente
- ❌ Não registra coberturas/gestações
- ❌ Não edita configurações do haras

**Menu Principal:**
1. Dashboard (com alertas de pendências)
2. Plantel (visualização + importação ABCCMM)
3. Reprodução (visualização)
4. Financeiro (ordens de serviço)
5. Tarefas
6. Equipe
7. Agenda
8. Documentos
9. Configurações
10. Ajuda

---

#### 👷 FUNCIONÁRIOS (PEÃO e VETERINÁRIO)

##### 👷‍♂️ PEÃO
**Acesso:** Campo / Operacional  
**Função:** Registrar eventos do dia a dia

**Permissões:**
- ✅ Registrar nascimentos (pendente validação)
- ✅ Registrar ocorrências (doença, acidente)
- ✅ Visualizar gestações
- ✅ Visualizar plantel
- ✅ Ver seu perfil

**Acesso Negado:**
- ❌ Não edita dados de animais
- ❌ Não acessa financeiro
- ❌ Não acessa configurações

**Menu Principal:**
1. Home (ações rápidas)
2. Gestações
3. Plantel (visualização)
4. Perfil

##### 👩‍⚕️ VETERINÁRIO
**Acesso:** Saúde / Procedimentos  
**Função:** Registrar procedimentos veterinários

**Permissões:**
- ✅ Registrar vacinas
- ✅ Registrar exames
- ✅ Registrar procedimentos
- ✅ Visualizar histórico de saúde
- ✅ Visualizar plantel
- ✅ Agenda de atendimentos

**Acesso Negado:**
- ❌ Não acessa financeiro
- ❌ Não acessa reprodução
- ❌ Não edita dados de animais

**Menu Principal:**
1. Início
2. Plantel (visualização)
3. Calendário
4. Perfil

---

## 4. MÓDULOS POR PERFIL

### 4.1 MÓDULO ADMINISTRADOR

#### 📊 Dashboard
**Arquivo:** `/components/admin/AdminDashboard.tsx`  
**Componente de Conteúdo:** Varia por aba

**Abas Disponíveis:**
1. Dashboard (visão geral)
2. Assinaturas (gerenciar planos)
3. Uso da Plataforma (métricas)
4. Alertas Críticos (sistema)
5. Ajuda (FAQ)
6. Configurações

---

#### 💳 Assinaturas
**Arquivo:** `/components/admin/AdminSubscriptionsContent.tsx`

**Funcionalidades:**
- ✅ Lista de todos os haras/clientes
- ✅ Filtro por status (Ativo, Trial, Cancelado, Vencido)
- ✅ Busca por nome/email
- ✅ Visualização de planos
- ✅ Botões de ação:
  - Gerenciar Planos
  - Enviar Fatura
  - Ver Detalhes

**Estatísticas Exibidas:**
- Total de Assinaturas Ativas
- Receita Mensal Recorrente (MRR)
- Taxa de Renovação
- Clientes em Trial

**Modais Disponíveis:**
- Gerenciar Planos de Assinatura
- Enviar Fatura
- Editar Plano do Cliente

---

#### 📈 Uso da Plataforma
**Arquivo:** `/components/admin/AdminPlatformUsageContent.tsx`

**Métricas Exibidas:**
- 📊 Total de Usuários Ativos
- 🐴 Total de Animais Cadastrados
- 📱 Usuários Ativos Hoje
- 💾 Armazenamento Usado

**Gráficos:**
1. **Crescimento de Usuários** (linha, últimos 6 meses)
2. **Distribuição de Planos** (pizza)
3. **Uso por Funcionalidade** (barras)

**Dados Mock:**
- 847 usuários ativos
- 3.245 animais cadastrados
- 156 usuários ativos hoje
- 12.4 GB de armazenamento

---

#### 🚨 Alertas Críticos
**Arquivo:** `/components/admin/AdminCriticalAlertsContent.tsx`

**Tipos de Alertas:**
1. **Sistema** (servidor, banco de dados)
2. **Pagamento** (faturas vencidas)
3. **Suporte** (tickets urgentes)
4. **Dados** (inconsistências, sincronização)

**Funcionalidades:**
- ✅ Filtro por tipo de alerta
- ✅ Busca em tempo real
- ✅ Prioridade visual (crítico, alto, médio)
- ✅ Ações rápidas por alerta

**Alertas Mock:**
- Servidor atingindo 85% de capacidade
- 3 pagamentos vencidos há mais de 15 dias
- 2 tickets de suporte sem resposta há 24h
- Falha na sincronização com ABCCMM

---

#### ⚙️ Configurações (Admin)
**Arquivo:** `/components/admin/AdminSettingsContent.tsx`

**Seções:**
1. **Perfil do Administrador**
   - Nome, email, cargo
   - Avatar
   
2. **Logs da Conexão ABCCMM**
   - Status da conexão
   - Última sincronização
   - Histórico de importações
   - Logs de erros

3. **Configurações do Sistema**
   - Versão da plataforma
   - Ambiente (produção/staging)
   - Manutenção programada

---

#### ❓ Ajuda (Admin)
**Arquivo:** `/components/admin/AdminHelpContent.tsx`

**Conteúdo:**
- FAQ para administradores
- Documentação técnica
- Guias de troubleshooting
- Contato de suporte técnico

---

### 4.2 MÓDULO CRIADOR

#### 📊 Dashboard do Criador
**Arquivo:** `/components/breeder/BreederDashboardContent.tsx`

**Ações Rápidas:**
- 🐴 Cadastrar Animal
- 📅 Agendar Evento
- 👥 Novo Colaborador

**KPIs Principais:**
1. **Total de Animais:** 162 (+3.2%)
2. **Gestações Ativas:** 12 (+2)
3. **Nascimentos (mês):** 8 (+33%)
4. **Alertas Importantes:** 5

**Gráficos:**
1. **Crescimento do Plantel** (linha, 6 meses)
   - Total de animais
   - Machos vs Fêmeas

2. **Distribuição por Categoria** (pizza)
   - Potros: 35
   - Reprodutores: 42
   - Reprodutoras: 48
   - Aposentados: 12
   - Em Treinamento: 25

3. **Distribuição por Pelagem** (pizza)
   - Castanha: 45
   - Alazã: 38
   - Tordilha: 28
   - Pampa: 22
   - Outros: 29

**Próximos Eventos:**
- Lista de eventos da agenda
- Filtro por período (3, 6, 12 meses, todos)

**Alertas Importantes:**
- Vacinas vencendo
- Exames pendentes
- Documentos para assinar
- Pagamentos pendentes

---

#### 🐴 Plantel
**Arquivo:** `/components/breeder/BreederPlantelContent.tsx`

**Modos de Visualização:**
- 📱 Grid (cards com foto)
- 📋 Lista (tabela detalhada)

**Filtros Avançados:**
1. **Busca** (nome, registro, chip, marca)
2. **Sexo** (Macho, Fêmea, Todos)
3. **Status** (Ativo, Gestante, Em Cobertura, etc)
4. **Categoria** (Potro, Reprodutor, etc)
5. **Idade** (0-2 anos, 3-5 anos, 6-10 anos, 10+)
6. **Pelagem** (Castanha, Alazã, Tordilha, etc)
7. **Localização** (Pasto 1, Baia 2, etc)
8. **Filhos** (Sem filhos, 1-3, 4-6, 7+)
9. **Premiações** (Sem premiações, 1-3, 4+)

**Ações em Massa:**
- Exportar selecionados
- Alterar localização
- Marcar para evento

**Card do Animal (Grid):**
- Foto do animal
- Nome
- Registro ABCCMM
- Idade
- Status (badge colorido)
- Badges: Filhos, Premiações, Vídeos
- Ações rápidas:
  - Ver Detalhes
  - Editar
  - Genealogia Rápida
  - Deletar

**Lista do Animal (Table):**
- Foto miniatura
- Nome
- Registro
- Sexo
- Idade
- Categoria
- Status
- Localização
- Ações

**Modal: Importar da ABCCMM**
- Upload de planilha Excel
- Validação de dados
- Pré-visualização
- Confirmação de importação

---

#### 📝 Detalhes do Animal
**Arquivo:** `/components/breeder/BreederAnimalDetails.tsx`  
**Tamanho:** ~2000+ linhas (componente mais complexo)

**Tabs Principais (9 tabs consolidadas):**

##### 1️⃣ Visão Geral
- Informações básicas
- Foto principal + galeria
- Status atual
- Localização
- Reprodução (tipo, status)
- Filhos
- Premiações

**Campos:**
- Nome
- Registro ABCCMM
- Chip RFID
- Marca/Ferro
- Sexo
- Data de Nascimento / Idade
- Haras de Origem
- Categoria
- Pelagem
- Status de Atividade
- Status Atual
- Localização
- Tipo de Serviço
- Tipo Reprodutivo
- Ativo para Reprodução?
- Contador de Coberturas
- Último Evento Reprodutivo

---

##### 2️⃣ Saúde (HealthTabs)
**Arquivo:** `/components/breeder/HealthTabs.tsx`  
**Sub-tabs:**

**A) Dashboard de Saúde**
**Arquivo:** `/components/breeder/HealthDashboard.tsx`

**KPIs:**
- Total de Procedimentos
- Vacinas em Dia
- Exames Realizados
- Próximo Agendamento

**Gráficos:**
- Procedimentos por Mês (barras)
- Distribuição por Tipo (pizza)

**Alertas:**
- Vacinas vencendo
- Exames pendentes

---

**B) Histórico Veterinário**
**Arquivo:** `/components/breeder/HealthTab.tsx`

**Listagem de Procedimentos:**
- Data
- Tipo (Vacina, Exame, Consulta, Cirurgia, etc)
- Descrição
- Veterinário
- Observações
- Anexos
- Status

**Filtros:**
- Por tipo de procedimento
- Por período
- Por veterinário

**Ações:**
- Adicionar Procedimento
- Editar
- Excluir
- Ver Detalhes

**Modal: Registrar Procedimento Veterinário**
**Arquivo:** `/components/breeder/RegisterVeterinaryProcedureModal.tsx`

---

**C) Calendário de Vacinas**
**Arquivo:** `/components/breeder/VaccinationCalendarTab.tsx`

**Visualização:**
- Timeline de vacinas
- Próximas vacinas
- Vacinas aplicadas
- Vacinas atrasadas

**Protocolos:**
- Protocolo padrão por idade
- Vacinas obrigatórias
- Vacinas opcionais

**Modal: Registrar Vacina**
**Arquivo:** `/components/breeder/RegisterVaccineModal.tsx` (205 linhas)

**Campos:**
- Nome da vacina
- Data de aplicação
- Veterinário
- Lote
- Validade
- Próxima dose
- Observações

---

**D) Histórico de Exames**
**Arquivo:** `/components/breeder/ExamsHistoryTab.tsx`

**Tipos de Exames:**
- Sangue
- Urina
- Fezes
- Ultrassom
- Raio-X
- Endoscopia
- Outros

**Por Exame:**
- Data
- Tipo
- Veterinário/Laboratório
- Resultado
- Anexos (PDFs, imagens)
- Status

**Modal: Registrar Exame**
**Arquivo:** `/components/breeder/RegisterExamModal.tsx` (241 linhas)

**Funcionalidades:**
- Upload de arquivos
- Resultado (Normal, Alterado, Crítico)
- Observações
- Recomendações

---

##### 3️⃣ Reprodução
**Sub-tabs:**

**A) Coberturas**
- Lista de coberturas realizadas
- Garanhão/Égua
- Data
- Tipo (Monta natural, IA)
- Status
- Resultado

**Modal: Registrar Cobertura**
**Arquivo:** `/components/breeder/RegisterCoberturaModal.tsx`

---

**B) Inseminações**
- Lista de IAs
- Reprodutor (sêmen)
- Data
- Veterinário
- Tipo de sêmen (fresco, refrigerado, congelado)
- Status

**Modal: Registrar Inseminação**
**Arquivo:** `/components/breeder/RegisterInseminationModal.tsx`

---

**C) Gestações**
- Gestações do animal (se fêmea)
- Gestações geradas (se macho)
- Data de cobertura
- Data prevista de parto
- Dias de gestação
- Status
- Exames
- Observações

**Modal: Confirmar Gestação**
**Arquivo:** `/components/breeder/ConfirmPregnancyModal.tsx`

---

**D) Óvulos**
- Coletas de óvulos
- Data
- Quantidade
- Qualidade
- Destinação (TE, criopreservação)

**Modal: Registrar Óvulos**
**Arquivo:** `/components/breeder/RegisterOvulosModal.tsx`

---

**E) Embriões**
- Embriões produzidos
- Doadora x Reprodutor
- Data de produção
- Quantidade
- Qualidade (grau)
- Status (congelado, transferido, descartado)
- Receptora (se transferido)

**Modal: Registrar Embrião**
**Arquivo:** `/components/breeder/RegisterEmbriaoModal.tsx`

---

##### 4️⃣ Genealogia
**Arquivo:** `/components/breeder/GenealogyTree.tsx`

**Visualização:**
- Árvore genealógica interativa
- 3 gerações (pais, avós, bisavós)
- Expandível
- Clicável (navega para o animal)

**Informações por Animal:**
- Foto
- Nome
- Registro ABCCMM
- Premiações

**Modal: Genealogia Rápida**
**Arquivo:** `/components/breeder/QuickGenealogyModal.tsx`
- Versão simplificada
- Somente pais e avós

---

##### 5️⃣ Documentos
**Arquivo:** `/components/breeder/AnimalDocumentsSection.tsx`

**Tipos de Documentos:**
- GIA (Guia de Identificação Animal)
- Certificado de Registro
- Laudos Veterinários
- Contratos de Cobertura
- Contratos de Venda
- Atestados
- Outros

**Por Documento:**
- Nome
- Tipo
- Data de upload
- Status (Pendente, Assinado, Vencido)
- Ações (Download, Visualizar, Excluir)

**Modal: Adicionar Documento**
**Arquivo:** `/components/breeder/AddDocumentModal.tsx`

**Modal: Gerar Contrato**
**Arquivo:** `/components/breeder/GenerateContractModal.tsx`
- Modelos pré-definidos
- Preenchimento automático
- Geração de PDF

---

##### 6️⃣ Localização
**Arquivo:** `/components/breeder/AnimalLocationSection.tsx`

**Informações:**
- Localização atual (Pasto, Baia, Serviço)
- Tipo de serviço (se em serviço)
- Data da última mudança
- Histórico de localizações

**Histórico:**
- Data
- Localização anterior
- Localização nova
- Motivo
- Responsável

**Modal: Alterar Localização**
**Arquivo:** `/components/breeder/LocationChangeModal.tsx`

---

##### 7️⃣ Vídeos
**Funcionalidades:**
- Upload de vídeos
- Thumbnail automático
- Título e descrição
- Data de upload
- Player integrado
- Download

**Limite:**
- Tamanho máximo por vídeo
- Total de vídeos por animal

---

##### 8️⃣ Premiações
**Sub-tabs:**

**A) Exposições**
**Arquivo:** `/components/breeder/ShowsTab.tsx`

**Listagem:**
- Nome da exposição
- Data
- Categoria
- Colocação
- Pontuação
- Certificado

**Modal: Registrar Participação**
**Arquivo:** `/components/breeder/RegisterShowParticipationModal.tsx`

**Modal: Cadastrar Exposição**
**Arquivo:** `/components/breeder/ShowCard.tsx`

---

**B) Leilões**
**Arquivo:** `/components/breeder/AuctionsTab.tsx`

**Listagem:**
- Nome do leilão
- Data
- Valor de entrada
- Valor final
- Status (Vendido, Não vendido)

**Modal: Registrar em Leilão**
**Arquivo:** `/components/breeder/RegisterAnimalAuctionModal.tsx`

---

**C) Premiações**
**Arquivo:** `/components/breeder/AwardsHistoryTab.tsx`

**Tipos:**
- Grande Campeão
- Campeão de Categoria
- Reservado Campeão
- Melhor Andamento
- Melhor Morfologia
- Outros

**Modal: Registrar Premiação**
**Arquivo:** `/components/breeder/RegisterAwardModal.tsx`

---

##### 9️⃣ Histórico Completo
**Visualização:**
- Timeline reversa (mais recente primeiro)
- Todos os eventos do animal
- Filtro por tipo de evento
- Busca

**Tipos de Eventos:**
- Nascimento
- Cadastro
- Mudança de status
- Mudança de localização
- Procedimentos veterinários
- Eventos reprodutivos
- Participação em eventos
- Vendas
- Transferências
- Outros

---

#### ✏️ Cadastrar Animal
**Arquivo:** `/components/breeder/BreederCadastrarAnimal.tsx`

**Modos:**
1. **Cadastro Manual**
2. **Importação ABCCMM**

**Formulário Manual:**
**Seção 1: Informações Básicas**
- Nome*
- Registro ABCCMM*
- Chip RFID
- Marca/Ferro
- Sexo*
- Data de Nascimento*
- Haras de Origem

**Seção 2: Características**
- Categoria*
- Pelagem*
- Altura
- Peso

**Seção 3: Genealogia**
- Pai (busca no plantel ou texto livre)
- Mãe (busca no plantel ou texto livre)

**Seção 4: Localização**
- Localização Atual*
- Tipo de Serviço (se aplicável)

**Seção 5: Reprodução**
- Tipo Reprodutivo*
- Ativo para Reprodução?

**Seção 6: Fotos**
- Upload de imagem principal
- Upload de galeria (múltiplas)

**Validações:**
- Campos obrigatórios
- Formato de registro ABCCMM
- Datas válidas
- Duplicidade de registro

---

#### ✏️ Editar Animal
**Arquivo:** `/components/breeder/BreederEditarAnimal.tsx`

**Funcionalidades:**
- Mesmo formulário do cadastro
- Pré-preenchido com dados atuais
- Histórico de alterações
- Confirmação de mudanças críticas

---

#### 💕 Reprodução
**Arquivo:** `/components/breeder/BreederReproductionContent.tsx`

**Tabs:**

##### 1️⃣ Automação de Reprodução
**Arquivo:** `/components/breeder/ReproductionAutomationTab.tsx`

**Seções:**

**A) Protocolos Ativos**
- Lista de protocolos em andamento
- Animal
- Tipo de protocolo
- Dia atual / Total de dias
- Próxima ação
- Status

**Modal: Protocolos Ativos**
**Arquivo:** `/components/breeder/ActiveProtocolsModal.tsx`

---

**B) Protocolos Personalizados**
- Criar protocolos customizados
- Biblioteca de protocolos
- Editar protocolos existentes

**Modal: Criar Protocolo**
**Arquivo:** `/components/breeder/CreateProtocolModal.tsx`

**Campos:**
- Nome do protocolo
- Descrição
- Duração (dias)
- Etapas:
  - Dia
  - Ação
  - Produto/Medicamento
  - Dosagem
  - Observações

---

**C) Calendário de Protocolos**
- Visualização mensal
- Eventos programados
- Alertas de ações pendentes

**Modal: Calendário**
**Arquivo:** `/components/breeder/ProtocolCalendarModal.tsx`

---

**D) Biblioteca de Templates**
- Protocolos pré-definidos
- IATF (Inseminação Artificial em Tempo Fixo)
- TE (Transferência de Embriões)
- Sincronização de cio
- Protocolos personalizados salvos

**Modal: Templates**
**Arquivo:** `/components/breeder/ProtocolTemplatesModal.tsx`

---

**E) Aplicar Protocolo**
- Selecionar animal(is)
- Escolher protocolo
- Data de início
- Confirmar

**Modal: Aplicar Protocolo**
**Arquivo:** `/components/breeder/ApplyProtocolModal.tsx`

---

##### 2️⃣ Gestações
**Arquivo:** `/components/breeder/GestationsTab.tsx`

**Visualização:**
- Lista de gestações ativas
- Égua
- Garanhão/Reprodutor
- Data de cobertura/IA
- Data prevista de parto
- Dias de gestação
- Status (confirmada, suspeita)
- Próximo exame

**Filtros:**
- Status
- Período previsto de parto
- Veterinário

**Ações:**
- Confirmar Gestação
- Registrar Exame
- Atualizar Status
- Cancelar Gestação (aborto, perda)

**Modal: Confirmar Gestação**
**Arquivo:** `/components/breeder/ConfirmPregnancyModal.tsx`

---

##### 3️⃣ Modais de Registro Reprodutivo
**Arquivo:** `/components/breeder/ReproductionModals.tsx`

**Modais Incluídos:**
- Registrar Cobertura
- Registrar Inseminação
- Registrar Ovulação
- Registrar Coleta de Óvulos
- Registrar Embrião
- Confirmar Gestação

---

#### 💰 Financeiro
**Arquivo:** `/components/breeder/BreederFinancialContent.tsx`

**Visualizações:**

##### 1️⃣ Dashboard Financeiro
**KPIs:**
- Saldo Atual
- Receitas do Mês
- Despesas do Mês
- Balanço do Mês

**Gráficos:**
1. **Fluxo de Caixa** (linha, 12 meses)
   - Receitas
   - Despesas
   - Saldo

2. **Receitas por Categoria** (pizza)
   - Venda de animais
   - Serviços de cobertura
   - Hospedagem
   - Treinamento
   - Outros

3. **Despesas por Categoria** (pizza)
   - Alimentação
   - Veterinário
   - Funcionários
   - Manutenção
   - Outros

**Últimas Transações:**
- Data
- Tipo (Receita/Despesa)
- Categoria
- Descrição
- Valor
- Forma de pagamento
- Status

---

##### 2️⃣ Receitas
**Arquivo:** `/components/breeder/BreederRevenueContent.tsx`

**Funcionalidades:**
- Lista de todas as receitas
- Filtros (categoria, período, status)
- Busca
- Adicionar Receita
- Editar
- Excluir

**Modal: Nova Receita**
**Arquivo:** `/components/breeder/BreederTransactionModal.tsx`

**Campos:**
- Tipo: Receita
- Categoria*
  - Venda de Animal
  - Serviço de Cobertura
  - Hospedagem
  - Treinamento
  - Venda de Produto
  - Outros
- Descrição*
- Valor*
- Data*
- Forma de Pagamento
  - Dinheiro
  - PIX
  - Transferência
  - Cartão de Crédito
  - Cartão de Débito
  - Cheque
- Status
  - Recebido
  - Pendente
  - Agendado
- Animal Relacionado (opcional)
- Anexos (comprovantes, notas)
- Observações

---

##### 3️⃣ Despesas
**Arquivo:** `/components/breeder/BreederExpenseContent.tsx`

**Funcionalidades:**
- Lista de todas as despesas
- Filtros (categoria, período, status)
- Busca
- Adicionar Despesa
- Editar
- Excluir

**Modal: Nova Despesa**
**Campos:**
- Tipo: Despesa
- Categoria*
  - Alimentação
  - Veterinário
  - Medicamentos
  - Funcionários
  - Manutenção
  - Ferrageamento
  - Transporte
  - Outros
- Descrição*
- Valor*
- Data*
- Forma de Pagamento
- Status
  - Pago
  - Pendente
  - Agendado
- Animal Relacionado (opcional)
- Fornecedor
- Anexos (notas fiscais)
- Observações

---

#### 📅 Agenda
**Arquivo:** `/components/breeder/BreederAgendaContent.tsx`

**Tabs:**

##### 1️⃣ Serviços Operacionais
**Funcionalidades:**
- Calendário mensal
- Lista de serviços
- Filtros (tipo, status, responsável)

**Tipos de Serviços:**
- Ferrageamento
- Vermifugação
- Limpeza de Baias
- Manutenção de Cercas
- Corte de Casco
- Banho e Tosa
- Outros

**Por Serviço:**
- Título
- Tipo
- Data/Hora
- Responsável
- Animal(is)
- Status (Pendente, Concluído, Cancelado)
- Observações

**Modal: Adicionar Serviço**
**Arquivo:** `/components/breeder/AddServiceModal.tsx`

**Modal: Editar Serviço**
**Arquivo:** `/components/breeder/EditEventModal.tsx`

---

##### 2️⃣ Exposições (REMOVIDO)
**Status:** Funcionalidade removida da aba Agenda (agora somente em Premiações do animal)

---

##### 3️⃣ Eventos Públicos
- Feiras
- Workshops
- Treinamentos
- Visitas técnicas
- Outros eventos do haras

**Modal: Adicionar Evento Público**
**Arquivo:** `/components/breeder/AddPublicEventModal.tsx`

---

##### 4️⃣ Leilões (REMOVIDO)
**Status:** Funcionalidade removida da aba Agenda (agora somente em Premiações do animal)

---

#### 📊 Relatórios
**Arquivo:** `/components/breeder/ReportsTab.tsx`

**Tipos de Relatórios:**

##### 1️⃣ Relatório Individual de Animal
**Arquivo:** `/components/breeder/AnimalReportModal.tsx`

**Conteúdo:**
- Dados completos do animal
- Genealogia
- Histórico de saúde
- Histórico reprodutivo
- Premiações
- Financeiro relacionado

**Formatos de Exportação:**
- PDF
- Excel
- CSV

---

##### 2️⃣ Relatório de Plantel
**Arquivo:** `/components/breeder/HerdReportModal.tsx`

**Opções:**
- Relatório completo
- Relatório por categoria
- Relatório por localização
- Relatório por status

**Conteúdo:**
- Lista de animais
- Estatísticas gerais
- Gráficos
- Distribuições

**Formatos:**
- PDF
- Excel
- CSV

---

##### 3️⃣ Relatório Financeiro
**Arquivo:** `/components/breeder/FinancialReportModal.tsx`

**Tipos:**
- Fluxo de Caixa
- DRE (Demonstrativo de Resultado)
- Receitas Detalhadas
- Despesas Detalhadas
- Balanço Patrimonial

**Filtros:**
- Período
- Categoria
- Animal

**Formatos:**
- PDF
- Excel
- CSV

---

##### 4️⃣ Relatório de Saúde
**Arquivo:** `/components/breeder/HealthReportModal.tsx`

**Conteúdo:**
- Calendário de vacinas
- Procedimentos realizados
- Exames pendentes
- Histórico veterinário
- Gastos com saúde

**Formatos:**
- PDF
- Excel

---

#### ⚙️ Configurações (Criador)
**Arquivo:** `/components/breeder/BreederSettingsContent.tsx`

**Tabs:**

##### 1️⃣ Perfil
- Nome
- Email
- Telefone
- CPF/CNPJ
- Avatar
- Alterar senha

---

##### 2️⃣ Haras
- Nome do Haras
- Endereço completo
- Telefone
- Email
- Site
- Logo do Haras
- Descrição

---

##### 3️⃣ Assinatura (REESTRUTURADO)
**Estrutura Atual:**

**Card do Plano (2 colunas):**

**Coluna Esquerda - Informações:**
- Nome do Plano Atual (Premium)
- Valor Mensal
- Próximo Vencimento
- Status (Ativo/Trial/Vencido)
- Recursos incluídos
- Limite de animais
- Limite de usuários
- Armazenamento

**Coluna Direita - Ações:**
1. **Alterar Forma de Pagamento** (botão)
2. **Ver Histórico de Faturas** (botão)
3. **Cancelar Assinatura** (botão)

**REMOVIDO:**
- ❌ Modal principal de gerenciamento
- ❌ Botões extras desnecessários

---

##### 4️⃣ Equipe
- Lista de colaboradores
- Adicionar colaborador
- Editar permissões
- Remover colaborador

**Tipos de Colaborador:**
- Assessor Administrativo
- Peão
- Veterinário
- Outros

---

##### 5️⃣ Notificações
**Arquivo:** `/components/breeder/NotificationPreferences.tsx` (integrado)

**Configurações:**

**1. Canais de Notificação**
- Push (mobile)
- Email
- SMS (futuro)

**2. Horário de Silêncio**
- Ativar/Desativar
- Horário início
- Horário fim

**3. Alertas Críticos**
- Sempre notificar (ignora silêncioso)

**4. Resumo por Email**
- Frequência (Diário, Semanal, Mensal, Nunca)

**5. Categorias Personalizáveis**
- **Saúde**
  - Vacinas
  - Exames
  - Procedimentos
  
- **Financeiro**
  - Pagamentos
  - Recebimentos
  - Vencimentos

- **Serviços**
  - Agendamentos
  - Conclusões
  - Atrasos

- **Reprodução**
  - Coberturas
  - Gestações
  - Nascimentos
  - Protocolos

- **Geral**
  - Sistema
  - Atualizações
  - Outros

**Por Categoria:**
- Ativar/Desativar
- Prioridade
- Som
- Vibração

---

##### 6️⃣ Preferências
- Tema (Light/Dark/Auto)
- Idioma
- Formato de data
- Formato de moeda
- Fuso horário
- Unidades de medida

---

##### 7️⃣ Integrações
- ABCCMM
  - Status da conexão
  - Última sincronização
  - Configurar credenciais

- WhatsApp Business (futuro)
- Google Calendar (futuro)
- Outros

---

##### 8️⃣ Segurança
- Alterar senha
- Autenticação de 2 fatores
- Dispositivos conectados
- Logs de acesso
- Backup de dados

---

#### ❓ Ajuda (Criador)
**Arquivo:** `/components/breeder/BreederHelpContent.tsx`

**Seções:**

##### 1️⃣ FAQ
**Categorias:**
- Plantel
- Reprodução
- Financeiro
- Agenda
- Relatórios
- Configurações
- Assinatura

**REMOVIDO:**
- ❌ Botão "Adicionar Tutorial"

---

##### 2️⃣ Tutoriais em Vídeo
- Biblioteca de vídeos
- Por funcionalidade
- Passo a passo

---

##### 3️⃣ Documentação
- Guias detalhados
- Melhores práticas
- Glossário

---

##### 4️⃣ Suporte
- Chat ao vivo
- Email
- WhatsApp
- Telefone
- Horário de atendimento

---

##### 5️⃣ Novidades
- Changelog
- Novos recursos
- Atualizações

---

### 4.3 MÓDULO ASSESSOR ADMINISTRATIVO

**PIVOT ESTRATÉGICO COMPLETO:**  
O Assessor foi transformado de "gestor completo" para **"Auditor de Dados"** focado em 3 pilares:

1. **Importação de Planilhas ABCCMM**
2. **Validação de Pendências do Peão**
3. **Ordens de Serviço vinculadas a animais**

---

#### 📊 Dashboard do Assessor
**Arquivo:** `/components/advisor/AdvisorDashboardContent.tsx`

**Destaque: Alertas de Pendências**
- Card laranja/vermelho destacado
- Total de pendências
- Breakdown:
  - Nascimentos para validar: 3
  - Ocorrências sem tratativa: 2
- Botão: "Validar Pendências Agora"

**Atalhos Rápidos:**
1. 📤 Importar Planilha ABCCMM
2. ➕ Nova Ordem de Serviço
3. 👥 Gerenciar Equipe
4. 📄 Documentos Pendentes

**Estatísticas:**
- **Status dos Animais** (gráfico pizza)
  - Ativo: 45
  - Vendido: 12
  - Falecido: 3

- **Categoria** (gráfico pizza)
  - Pista: 15
  - Pasto: 20
  - Reprodução: 10

- **Financeiro** (gráfico barras)
  - Receitas do mês: R$ 45.000
  - Despesas do mês: R$ 28.500
  - Saldo: R$ 16.500

---

#### 🐴 Plantel (Assessor)
**Arquivo:** `/components/advisor/AdvisorHerdContent.tsx`

**Funcionalidades:**
- ✅ Visualização completa (modo leitura)
- ✅ Filtros e busca
- ✅ Ver detalhes do animal
- ✅ **Importar Planilha ABCCMM**

**Acesso Negado:**
- ❌ Não cadastra animais manualmente
- ❌ Não edita dados de animais
- ❌ Não deleta animais

**Botão Principal:**
- 📤 Importar da ABCCMM

**Modal: Importar ABCCMM**
**Arquivo:** `/components/advisor/AdvisorImportABCCMM.tsx`

**Fluxo:**
1. Upload de planilha Excel
2. Validação de formato
3. Pré-visualização dos dados
4. Mapeamento de colunas
5. Validação de duplicidades
6. Confirmação
7. Importação
8. Log de resultados

**Campos Importados:**
- Registro ABCCMM
- Nome
- Sexo
- Data de Nascimento
- Pelagem
- Pai (nome e registro)
- Mãe (nome e registro)
- Haras de Origem
- Outros campos ABCCMM

---

#### 🚨 Validação de Pendências (NOVO)
**Arquivo:** `/components/advisor/AdvisorPendingValidation.tsx`

**Funcionalidade Principal do Assessor**

**Tipos de Pendências:**

##### 1️⃣ Nascimentos Pendentes
**Origem:** Registrados pelo Peão no app móvel

**Card da Pendência:**
- Data do registro (pelo peão)
- Nome dado pelo peão (provisório)
- Mãe (égua)
- Pai/Reprodutor (se conhecido)
- Sexo
- Pelagem
- Observações do peão
- Foto (se tirada)
- Status: "Aguardando Validação"

**Ações do Assessor:**
1. **Validar e Oficializar**
   - Confirmar dados
   - Adicionar/corrigir informações
   - Gerar registro provisório
   - Solicitar registro ABCCMM (futuro)
   - Mover para plantel oficial

2. **Solicitar Correção**
   - Enviar de volta ao peão
   - Especificar o que corrigir
   - Adicionar comentários

3. **Rejeitar**
   - Motivo obrigatório
   - Registro ficará em histórico
   - Notifica peão

---

##### 2️⃣ Ocorrências Pendentes
**Origem:** Registradas pelo Peão

**Tipos de Ocorrências:**
- Doença/Sintoma
- Acidente
- Comportamento anormal
- Morte
- Fuga/Perda
- Outra

**Card da Ocorrência:**
- Data e hora
- Tipo de ocorrência
- Animal
- Descrição (do peão)
- Gravidade (Baixa, Média, Alta, Crítica)
- Foto/Vídeo (se houver)
- Status: "Sem Tratativa"

**Ações do Assessor:**
1. **Dar Tratativa**
   - Marcar como "Em Andamento"
   - Atribuir responsável (veterinário, criador)
   - Criar ordem de serviço
   - Agendar atendimento
   - Adicionar observações

2. **Resolver**
   - Descrição da solução
   - Custo (se houver)
   - Responsável
   - Data de resolução
   - Anexos

3. **Escalar**
   - Notificar criador
   - Marcar como crítica
   - Adicionar comentários

---

**Filtros:**
- Tipo de pendência
- Período
- Animal
- Peão responsável
- Status

**Estatísticas:**
- Total de pendências
- Por tipo
- Por período
- Tempo médio de validação
- Taxa de rejeição

---

#### 💰 Financeiro (Assessor)
**Arquivo:** `/components/advisor/AdvisorFinanceContent.tsx`

**Foco:** Ordens de Serviço vinculadas a animais

**Funcionalidades:**
- ✅ Criar ordem de serviço
- ✅ Vincular a animal(is)
- ✅ Definir tipo de serviço
- ✅ Valor
- ✅ Fornecedor/Prestador
- ✅ Status
- ✅ Anexos

**Tipos de OS:**
- Veterinário
- Ferrageamento
- Alimentação
- Manutenção
- Transporte
- Outros

**Por Ordem de Serviço:**
- Número da OS
- Data
- Tipo
- Animal(is)
- Descrição
- Valor
- Fornecedor
- Status (Aberta, Em andamento, Concluída, Cancelada)
- Responsável
- Anexos (notas, comprovantes)

**Modal: Nova Ordem de Serviço**
**Arquivo:** `/components/advisor/AdvisorTransactionModal.tsx`

**Acesso Negado:**
- ❌ Não acessa dashboard financeiro completo
- ❌ Não visualiza balanço geral
- ❌ Não edita receitas/despesas não vinculadas a OS

---

#### 💕 Reprodução (Assessor)
**Arquivo:** `/components/advisor/AdvisorReproductionContentNew.tsx`

**Modo:** Visualização apenas (leitura)

**Sub-tabs:**
1. Coberturas (visualizar)
2. Óvulos (visualizar)
3. Embriões (visualizar)
4. Gestações (visualizar)

**Componentes:**
- `/components/advisor/AdvisorReproductionContent.tsx`
- `/components/advisor/AdvisorOvulesContent.tsx`
- `/components/advisor/AdvisorEmbryosContent.tsx`
- `/components/advisor/AdvisorPregnanciesContent.tsx`

**Acesso Negado:**
- ❌ Não registra coberturas
- ❌ Não registra IAs
- ❌ Não confirma gestações
- ❌ Não gerencia protocolos

---

#### ✅ Tarefas
**Arquivo:** `/components/advisor/AdvisorTasksContent.tsx`

**Funcionalidades:**
- Criar tarefas para a equipe
- Atribuir responsável
- Definir prazo
- Prioridade
- Checklist
- Anexos
- Comentários

**Status:**
- Pendente
- Em Andamento
- Concluída
- Cancelada

**Filtros:**
- Status
- Responsável
- Prioridade
- Período

---

#### 👥 Equipe
**Arquivo:** `/components/advisor/AdvisorTeamContent.tsx`

**Tabs:**
1. Equipe (lista de funcionários)
2. Escalas (horários de trabalho)
3. Férias/Afastamentos

**Funcionalidades:**
- Visualizar equipe
- Adicionar membro
- Editar informações
- Definir cargo/função
- Atribuir permissões
- Histórico

---

#### 📅 Agenda (Assessor)
**Arquivo:** `/components/advisor/AdvisorCalendarContent.tsx`

**Funcionalidades:**
- Calendário mensal
- Todos os eventos do haras
- Adicionar evento
- Editar evento
- Filtros por tipo

---

#### 📄 Documentos (Assessor)
**Arquivo:** `/components/advisor/AdvisorDocumentsContent.tsx`

**Funcionalidades:**
- Gerenciar todos os documentos
- Upload
- Organização por tipo
- Tags
- Busca
- Download
- Compartilhamento
- Versioning

**Tipos:**
- GIAs
- Contratos
- Laudos
- Certificados
- Notas fiscais
- Comprovantes
- Outros

---

#### ⚙️ Configurações (Assessor)
**Arquivo:** `/components/advisor/AdvisorSettingsContent.tsx`

**Tabs:**
1. Perfil do Assessor
2. Notificações
3. Preferências

**Acesso Negado:**
- ❌ Não acessa configurações do haras
- ❌ Não gerencia assinatura
- ❌ Não gerencia integrações

---

#### ❓ Ajuda (Assessor)
**Arquivo:** `/components/advisor/AdvisorHelpContent.tsx`

**Conteúdo específico para Assessor:**
- Como importar planilhas ABCCMM
- Como validar pendências
- Como criar ordens de serviço
- FAQ

---

### 4.4 MÓDULO FUNCIONÁRIOS

#### 👷‍♂️ PEÃO

##### 🏠 Home
**Arquivo:** `/components/employee/PeonHomeContent.tsx`

**Indicador de Modo:**
- 🟢 Online
- 🔴 Offline

**Ações Rápidas:**
1. ➕ Registrar Nascimento
2. ⚠️ Registrar Ocorrência
3. 📋 Ver Minhas Tarefas

**Pendências:**
- Nascimentos aguardando validação: X
- Ocorrências sem resposta: X

**Últimas Atividades:**
- Timeline reversa
- Registros enviados
- Status de validação

---

##### 💕 Gestações
**Arquivo:** `/components/employee/PeonPregnanciesContent.tsx`

**Visualização:**
- Lista de éguas gestantes
- Data prevista de parto
- Dias de gestação
- Status
- Alertas (parto próximo)

**Ações:**
- Ver detalhes
- Registrar nascimento

**Modal: Registrar Nascimento**

**Campos:**
- Égua (seleção ou busca)
- Data e hora do nascimento
- Sexo do potro
- Pelagem
- Condições do parto (Normal, Assistido, Cesariana)
- Saúde do potro (Ótima, Boa, Regular, Ruim)
- Saúde da égua
- Observações
- Foto (opcional)

**Após envio:**
- Mensagem: "Registro enviado para validação"
- Fica em "Pendências" no dashboard do Assessor

---

##### 🐴 Plantel
**Arquivo:** `/components/employee/PeonHerdContent.tsx`

**Modo:** Visualização apenas

**Funcionalidades:**
- Buscar animal
- Ver lista
- Filtros básicos
- Ver detalhes (limitado)

**Acesso Negado:**
- ❌ Não edita
- ❌ Não cadastra
- ❌ Não deleta

---

##### 👤 Perfil
**Componente:** `ProfileView.tsx`

**Informações:**
- Nome
- Email
- Cargo (Peão)
- Haras
- Data de contratação
- Avatar

**Ações:**
- Editar dados pessoais
- Alterar senha
- Sair

---

#### 👩‍⚕️ VETERINÁRIO

##### 🏠 Início
**Arquivo:** `/components/employee/VetHomeContent.tsx`

**Indicador de Modo:**
- 🟢 Online
- 🔴 Offline

**Ações Rápidas:**
1. 💉 Registrar Vacina
2. 🔬 Registrar Exame
3. 🩺 Registrar Procedimento

**Agenda do Dia:**
- Próximos atendimentos
- Animais agendados
- Horários

**Estatísticas:**
- Procedimentos realizados (mês)
- Animais atendidos
- Vacinas aplicadas

---

##### 🐴 Plantel
**Arquivo:** `/components/employee/VetHerdContent.tsx`

**Funcionalidades:**
- Visualizar plantel
- Buscar animal
- Ver histórico de saúde
- Filtros

**Ações por Animal:**
- Ver histórico completo
- Registrar procedimento
- Registrar vacina
- Registrar exame

---

##### 📅 Calendário
**Arquivo:** `/components/employee/VetCalendarContent.tsx`

**Visualização:**
- Calendário mensal
- Agendamentos
- Vacinas do dia
- Procedimentos agendados

**Ações:**
- Ver detalhes do agendamento
- Marcar como realizado
- Reagendar
- Cancelar

---

##### 👤 Perfil
**Informações:**
- Nome
- Email
- Cargo (Veterinário)
- CRMV
- Especialidade
- Haras
- Avatar

---

## 5. FUNCIONALIDADES DETALHADAS

### 5.1 Sistema de Autenticação

**Arquivo:** `/components/auth/LoginScreen.tsx`

**Funcionalidades:**
- Login com email e senha
- Validação de campos
- Mensagens de erro
- "Lembrar de mim"
- Esqueci minha senha

**Usuários Mock (desenvolvimento):**
```
Admin: admin / 1234
Criador: criador / 1234
Assessor: assessor / 1234
Peão: peao / 1234
Veterinário: vet / 1234
```

**Tela de Recuperação:**
**Arquivo:** `/components/auth/ForgotPasswordScreen.tsx`

**Fluxo:**
1. Inserir email
2. Validação
3. Envio de link (simulado)
4. Confirmação
5. Voltar para login

---

### 5.2 Sistema de Temas (Dark/Light Mode)

**Arquivo:** `/contexts/ThemeContext.tsx`

**Funcionalidades:**
- Toggle dark/light
- Persistência (localStorage)
- Aplicação global
- Transição suave

**Cores Dark Mode:**
- Background: `#0d0d0d`
- Cards: `#1a1a1a`
- Sidebar: `#1a1a1a`
- Borders: `rgba(255,255,255,0.1)`
- Text: `#ffffff`
- Text muted: `#99a1af`
- Primary: `#ffffff` (invertido)

**Cores Light Mode:**
- Background: `#ffffff`
- Cards: `#f9fafb`
- Sidebar: `#e8e8e8`
- Borders: `#e5e7eb`
- Text: `#000000`
- Text muted: `#6b7280`
- Primary: `#333333`

---

### 5.3 Sistema de Notificações

#### A) Toasts (Sonner)
**Uso:** Feedback imediato de ações

**Tipos:**
- Success (verde)
- Error (vermelho)
- Warning (amarelo)
- Info (azul)

**Exemplos:**
```typescript
toast.success('Animal cadastrado com sucesso!');
toast.error('Erro ao salvar dados');
toast.warning('Vacina vencendo em 3 dias');
toast.info('Nova atualização disponível');
```

---

#### B) Central de Notificações
**Arquivo:** `/components/breeder/NotificationsCenter.tsx` (419 linhas)

**Funcionalidades:**
- Lista de notificações
- Filtros:
  - Categoria (Saúde, Financeiro, Serviços, Reprodução, Geral)
  - Status (Lidas, Não lidas, Todas)
  - Prioridade (Alta, Média, Baixa)
- Busca em tempo real
- Ordenação por prioridade
- Ações:
  - Marcar como lida
  - Marcar todas como lidas
  - Excluir
  - Ver detalhes

**Notificações Mock:**
1. Vacina vencendo (Saúde, Alta)
2. Pagamento recebido (Financeiro, Média)
3. Serviço agendado (Serviços, Baixa)
4. Nova cobertura (Reprodução, Média)
5. Documento assinado (Geral, Baixa)
6. Exame pendente (Saúde, Alta)
7. Fatura vencida (Financeiro, Alta)
8. Exposição próxima (Geral, Média)

**Timestamps Inteligentes:**
- "Agora mesmo"
- "5 minutos atrás"
- "1 hora atrás"
- "Ontem"
- "DD/MM/YYYY"

---

#### C) Preferências de Notificações
**Arquivo:** `/contexts/NotificationPreferencesContext.tsx`

**Context Global:**
```typescript
interface NotificationPreferences {
  soundEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  criticalAlertsAlways: boolean;
  emailSummaryFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  categories: {
    saude: CategoryPreferences;
    financeiro: CategoryPreferences;
    servicos: CategoryPreferences;
    reproducao: CategoryPreferences;
    geral: CategoryPreferences;
  };
}

interface CategoryPreferences {
  enabled: boolean;
  priority: 'alta' | 'media' | 'baixa';
  sound: boolean;
  vibrate: boolean;
}
```

**Função de Validação:**
```typescript
shouldShowNotification(notification): boolean
```
- Verifica horário de silêncio
- Verifica se categoria está habilitada
- Exceção para alertas críticos

---

#### D) Painel de Notificações (Topbar)
**Arquivo:** `/components/NotificationsPanel.tsx`

**Visualização:**
- Dropdown no header
- Badge com contador
- Últimas 5 notificações
- Link para "Ver todas"

**Ações Rápidas:**
- Marcar como lida
- Excluir
- Ver detalhes

---

### 5.4 Troca de Perfil (Dev Mode)

**Arquivo:** `/components/SwitchUserModal.tsx`

**Funcionalidade:** Permitir troca rápida entre perfis (desenvolvimento)

**Perfis Disponíveis:**
- Administrador
- Criador
- Assessor Administrativo
- Peão
- Veterinário

**Acesso:**
- Botão "Trocar Perfil" no menu do usuário
- Atalho: Ctrl/Cmd + Shift + U (futuro)

---

### 5.5 Sistema Responsivo

**Hook:** `/hooks/useResponsive.ts`

**Breakpoints:**
```typescript
{
  isMobile: boolean;    // < 768px
  isTablet: boolean;    // 768px - 1024px
  isDesktop: boolean;   // > 1024px
}
```

**Uso:**
- Sidebar colapsável no mobile
- Overlay em modais mobile
- Grids adaptáveis
- Menus hamburger

---

### 5.6 Gestão de Estado

#### Contextos Globais:

**1. UserContext**
```typescript
{
  user: User | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  login: (username, password) => boolean;
  logout: () => void;
  setUserRole: (role) => void;
}
```

**2. ThemeContext**
```typescript
{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

**3. NotificationPreferencesContext**
```typescript
{
  preferences: NotificationPreferences;
  updatePreferences: (prefs) => void;
  shouldShowNotification: (notif) => boolean;
}
```

---

## 6. FLUXOS DE TRABALHO

### 6.1 Fluxo: Cadastro de Animal

**Atores:** Criador

**Cenário 1: Cadastro Manual**

1. Criador acessa "Plantel"
2. Clica em "Cadastrar Animal"
3. Escolhe "Cadastro Manual"
4. Preenche formulário:
   - Seção 1: Informações Básicas
   - Seção 2: Características
   - Seção 3: Genealogia
   - Seção 4: Localização
   - Seção 5: Reprodução
   - Seção 6: Fotos
5. Valida dados
6. Confirma cadastro
7. Sistema:
   - Salva dados
   - Gera ID único
   - Cria histórico inicial
   - Exibe toast de sucesso
   - Redireciona para detalhes do animal

**Cenário 2: Importação ABCCMM** (Assessor)

1. Assessor acessa "Plantel"
2. Clica em "Importar da ABCCMM"
3. Faz upload da planilha Excel
4. Sistema valida formato
5. Exibe pré-visualização
6. Assessor mapeia colunas (se necessário)
7. Sistema valida duplicidades
8. Assessor confirma
9. Sistema:
   - Importa dados
   - Cria registros
   - Gera log de importação
   - Exibe resultado (sucessos e erros)
   - Notifica criador

---

### 6.2 Fluxo: Registro de Nascimento (Campo → Escritório)

**Atores:** Peão, Assessor, Sistema

**Passo 1: Registro pelo Peão (Campo)**

1. Peão observa nascimento
2. Abre app CriaHub (pode estar offline)
3. Acessa "Gestações"
4. Localiza a égua
5. Clica em "Registrar Nascimento"
6. Preenche formulário:
   - Data e hora
   - Sexo do potro
   - Pelagem
   - Condições do parto
   - Saúde potro e égua
   - Observações
   - Tira foto
7. Envia (ou salva localmente se offline)
8. Sistema:
   - Marca como "Pendente de Validação"
   - Sincroniza quando online
   - Notifica Assessor

**Passo 2: Validação pelo Assessor (Escritório)**

1. Assessor recebe notificação
2. Acessa "Dashboard" → vê alerta laranja
3. Clica em "Validar Pendências Agora"
4. Visualiza lista de nascimentos pendentes
5. Abre card do nascimento
6. Revisa informações do peão
7. Decide:

   **Opção A: Validar e Oficializar**
   - Confirma dados
   - Adiciona informações extras (registro provisório, pai confirmado, etc)
   - Clica em "Oficializar"
   - Sistema:
     - Cria animal no plantel
     - Gera registro provisório
     - Move de "Pendente" para "Oficial"
     - Notifica peão (aprovado)
     - Notifica criador (novo animal)

   **Opção B: Solicitar Correção**
   - Especifica o que corrigir
   - Adiciona comentários
   - Envia de volta
   - Sistema:
     - Notifica peão
     - Mantém em pendências
     - Aguarda nova submissão

   **Opção C: Rejeitar**
   - Informa motivo (obrigatório)
   - Confirma rejeição
   - Sistema:
     - Move para histórico
     - Notifica peão
     - Registra no log

---

### 6.3 Fluxo: Cobertura → Gestação → Nascimento

**Atores:** Criador, Peão, Assessor

**Etapa 1: Registro de Cobertura**

1. Criador acessa animal (égua)
2. Vai em tab "Reprodução" → "Coberturas"
3. Clica em "Registrar Cobertura"
4. Preenche modal:
   - Garanhão (busca)
   - Data
   - Tipo (Monta natural ou IA)
   - Veterinário (se IA)
   - Observações
5. Salva
6. Sistema:
   - Registra cobertura
   - Cria evento no histórico
   - Agenda: "Verificar gestação em 15 dias"
   - Notifica criador (lembrete futuro)

**Etapa 2: Confirmação de Gestação**

1. Após 15+ dias, veterinário faz exame
2. Criador acessa animal
3. Tab "Reprodução" → "Gestações"
4. Clica em "Confirmar Gestação"
5. Preenche modal:
   - Cobertura relacionada
   - Data do exame
   - Data prevista de parto (calculada: +330 dias)
   - Veterinário
   - Método (ultrassom, palpação)
   - Observações
6. Salva
7. Sistema:
   - Marca égua como "Gestante"
   - Cria gestação
   - Agenda: "Parto previsto para DD/MM/YYYY"
   - Calcula dias de gestação
   - Envia para dashboard do Peão
   - Cria alertas:
     - 30 dias antes: "Preparar baia maternidade"
     - 15 dias antes: "Gestação próxima ao fim"
     - 7 dias antes: "Atenção redobrada"

**Etapa 3: Nascimento**

1. Peão observa nascimento (campo)
2. Registra via app (vide Fluxo 6.2)
3. Assessor valida (vide Fluxo 6.2)
4. Sistema:
   - Marca gestação como "Finalizada"
   - Remove égua de "Gestante"
   - Cria novo animal (potro)
   - Vincula potro à mãe (genealogia)
   - Vincula potro ao pai
   - Registra no histórico da égua
   - Registra no histórico do garanhão
   - Notifica criador
   - Atualiza contador de filhos

---

### 6.4 Fluxo: Importação de Planilha ABCCMM

**Atores:** Assessor, Sistema

**Preparação (fora do sistema):**

1. Criador acessa site ABCCMM
2. Baixa planilha Excel com dados do plantel
3. Envia planilha ao Assessor (email, WhatsApp, etc)

**Importação:**

1. Assessor acessa "Plantel"
2. Clica em "Importar da ABCCMM"
3. Modal abre
4. Faz upload do arquivo Excel
5. Sistema:
   - Valida extensão (.xlsx, .xls)
   - Valida estrutura
   - Lê primeira linha (headers)
6. Exibe pré-visualização:
   - Primeiras 10 linhas
   - Colunas detectadas
   - Total de linhas
7. Sistema sugere mapeamento automático:
   ```
   Coluna A (Registro) → Campo: Registro ABCCMM
   Coluna B (Nome) → Campo: Nome
   Coluna C (Sexo) → Campo: Sexo
   etc.
   ```
8. Assessor confirma ou ajusta mapeamento
9. Clica em "Validar Dados"
10. Sistema valida:
    - Registros duplicados (já existentes)
    - Formatos inválidos
    - Campos obrigatórios vazios
11. Exibe relatório de validação:
    - ✅ 45 animais OK
    - ⚠️ 3 duplicados (serão ignorados)
    - ❌ 2 com erros (falta data de nascimento)
12. Assessor pode:
    - Corrigir erros na planilha e reupar
    - Prosseguir ignorando erros
13. Clica em "Importar"
14. Sistema:
    - Importa dados
    - Cria animais no plantel
    - Gera log detalhado
    - Exibe resultado final:
      ```
      ✅ 45 animais importados com sucesso
      ⚠️ 3 animais já existentes (ignorados)
      ❌ 2 animais com erro (não importados)
      
      [Download do log completo]
      ```
15. Notifica criador
16. Fecha modal

---

### 6.5 Fluxo: Criação de Ordem de Serviço vinculada a Animal

**Atores:** Assessor, Fornecedor, Sistema

1. Assessor acessa "Financeiro"
2. Clica em "Nova Ordem de Serviço"
3. Modal abre
4. Preenche:
   - Tipo de serviço*
     - Veterinário
     - Ferrageamento
     - Alimentação
     - Manutenção
     - Transporte
     - Outro
   - Descrição*
   - Valor estimado
   - Animal(is) relacionado(s)* (busca e seleção múltipla)
   - Fornecedor/Prestador*
     - Nome
     - CPF/CNPJ
     - Telefone
     - Email
   - Data prevista*
   - Observações
5. Pode anexar:
   - Orçamento (PDF)
   - Fotos
   - Outros documentos
6. Clica em "Criar OS"
7. Sistema:
   - Gera número único da OS
   - Salva com status "Aberta"
   - Vincula aos animais
   - Cria evento no histórico dos animais
   - Notifica criador (para aprovação, se valor > limite)
   - Notifica fornecedor (email/WhatsApp)
8. Exibe mensagem: "OS #1234 criada com sucesso"

**Acompanhamento:**

1. Fornecedor executa serviço
2. Assessor atualiza OS:
   - Marca como "Em Andamento"
   - Adiciona notas
   - Anexa fotos do serviço
3. Serviço concluído:
   - Assessor marca como "Concluída"
   - Anexa nota fiscal
   - Confirma valor final
   - Sistema:
     - Calcula diferença (estimado vs real)
     - Registra no financeiro (despesa)
     - Atualiza histórico dos animais
     - Notifica criador

---

### 6.6 Fluxo: Geração de Relatório Financeiro

**Atores:** Criador

1. Criador acessa "Relatórios"
2. Clica em "Relatório Financeiro"
3. Modal abre
4. Define parâmetros:
   - Período*
     - Mês específico
     - Trimestre
     - Semestre
     - Ano
     - Personalizado (data início/fim)
   - Tipo de relatório*
     - Fluxo de Caixa
     - DRE (Demonstrativo)
     - Receitas Detalhadas
     - Despesas Detalhadas
     - Balanço
   - Filtros (opcional)
     - Categoria específica
     - Animal específico
     - Forma de pagamento
   - Formato*
     - PDF
     - Excel
     - CSV
5. Clica em "Gerar Relatório"
6. Sistema:
   - Coleta dados do período
   - Calcula totais e médias
   - Gera gráficos (se PDF)
   - Formata documento
   - Exibe pré-visualização
7. Criador pode:
   - Baixar
   - Imprimir
   - Compartilhar (email)
   - Salvar em documentos
8. Clica em "Baixar"
9. Sistema:
   - Gera arquivo final
   - Registra no histórico de relatórios
   - Download automático

**Exemplo de DRE:**
```
DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO
Haras Vale Verde - Novembro/2024

RECEITAS
  Venda de Animais............R$ 25.000,00
  Serviços de Cobertura.......R$ 15.000,00
  Hospedagem..................R$  3.500,00
  Treinamento.................R$  1.500,00
  ─────────────────────────────────────────
  TOTAL DE RECEITAS...........R$ 45.000,00

DESPESAS
  Alimentação.................R$ 12.000,00
  Veterinário.................R$  8.500,00
  Funcionários................R$  5.000,00
  Manutenção..................R$  2.000,00
  Outros......................R$  1.000,00
  ─────────────────────────────────────────
  TOTAL DE DESPESAS...........R$ 28.500,00

═══════════════════════════════════════════
RESULTADO DO PERÍODO..........R$ 16.500,00
═══════════════════════════════════════════

Gráficos:
[Gráfico de barras Receitas vs Despesas]
[Gráfico de pizza - Despesas por categoria]
```

---

## 7. PÁGINAS E COMPONENTES

### 7.1 Estrutura de Componentes

```
components/
│
├── admin/                          # Módulo Administrador
│   ├── AdminDashboard.tsx          # Dashboard principal
│   ├── AdminSubscriptionsContent.tsx
│   ├── AdminPlatformUsageContent.tsx
│   ├── AdminCriticalAlertsContent.tsx
│   ├── AdminSettingsContent.tsx
│   ├── AdminHelpContent.tsx
│   └── mobile/                     # Versões mobile
│       ├── MobileApp.tsx
│       ├── MobileDashboard.tsx
│       ├── MobileSubscriptions.tsx
│       ├── MobileAlerts.tsx
│       └── MobileProfile.tsx
│
├── breeder/                        # Módulo Criador
│   ├── BreederDashboard.tsx        # Dashboard principal
│   ├── BreederDashboardContent.tsx # Dashboard content
│   ├── BreederPlantelContent.tsx   # Gestão de plantel
│   ├── BreederAnimalDetails.tsx    # Detalhes do animal (2000+ linhas)
│   ├── BreederCadastrarAnimal.tsx  # Cadastro
│   ├── BreederEditarAnimal.tsx     # Edição
│   ├── BreederReproductionContent.tsx
│   ├── BreederFinancialContent.tsx
│   ├── BreederAgendaContent.tsx
│   ├── BreederSettingsContent.tsx
│   ├── BreederHelpContent.tsx
│   ├── BreederReportsContent.tsx
│   │
│   ├── # Saúde
│   ├── HealthTabs.tsx              # Tabs consolidadas
│   ├── HealthDashboard.tsx
│   ├── HealthTab.tsx               # Histórico veterinário
│   ├── VaccinationCalendarTab.tsx
│   ├── ExamsHistoryTab.tsx
│   │
│   ├── # Reprodução
│   ├── ReproductionAutomationTab.tsx
│   ├── GestationsTab.tsx
│   ├── ReproductionModals.tsx
│   │
│   ├── # Relatórios
│   ├── ReportsTab.tsx
│   ├── AnimalReportModal.tsx
│   ├── HerdReportModal.tsx
│   ├── FinancialReportModal.tsx
│   ├── HealthReportModal.tsx
│   │
│   ├── # Modais
│   ├── AddAnimalForm.tsx
│   ├── AddCollaboratorForm.tsx
│   ├── AddEventForm.tsx
│   ├── RegisterCoberturaModal.tsx
│   ├── RegisterInseminationModal.tsx
│   ├── RegisterVaccineModal.tsx (205 linhas)
│   ├── RegisterExamModal.tsx (241 linhas)
│   ├── RegisterVeterinaryProcedureModal.tsx
│   ├── ConfirmPregnancyModal.tsx
│   ├── GenealogyTree.tsx
│   ├── QuickGenealogyModal.tsx
│   ├── LocationChangeModal.tsx
│   ├── AddDocumentModal.tsx
│   ├── GenerateContractModal.tsx
│   ├── BreederTransactionModal.tsx
│   ├── AdvancedFiltersModal.tsx
│   │
│   ├── # Agenda
│   ├── AddServiceModal.tsx
│   ├── AddServiceEventModal.tsx
│   ├── AddPublicEventModal.tsx
│   ├── EditEventModal.tsx
│   │
│   ├── # Premiações
│   ├── ShowsTab.tsx
│   ├── AuctionsTab.tsx
│   ├── AwardsHistoryTab.tsx
│   ├── RegisterShowParticipationModal.tsx
│   ├── RegisterAnimalAuctionModal.tsx
│   ├── RegisterAwardModal.tsx
│   │
│   ├── # Protocolos
│   ├── CreateProtocolModal.tsx
│   ├── ApplyProtocolModal.tsx
│   ├── ActiveProtocolsModal.tsx
│   ├── ProtocolCalendarModal.tsx
│   ├── ProtocolTemplatesModal.tsx
│   │
│   ├── # Notificações
│   ├── NotificationsCenter.tsx (419 linhas)
│   │
│   ├── # Outros
│   ├── AnimalCard.tsx
│   ├── AnimalDocumentsSection.tsx
│   ├── AnimalLocationSection.tsx
│   ├── AnalyticsDashboard.tsx
│   └── ...
│
├── advisor/                        # Módulo Assessor
│   ├── AdvisorDashboard.tsx
│   ├── AdvisorDashboardContent.tsx
│   ├── AdvisorHerdContent.tsx
│   ├── AdvisorImportABCCMM.tsx     # Importação ABCCMM
│   ├── AdvisorPendingValidation.tsx # Validação de pendências
│   ├── AdvisorReproductionContentNew.tsx
│   ├── AdvisorFinanceContent.tsx   # Ordens de serviço
│   ├── AdvisorTasksContent.tsx
│   ├── AdvisorTeamContent.tsx
│   ├── AdvisorCalendarContent.tsx
│   ├── AdvisorDocumentsContent.tsx
│   ├── AdvisorSettingsContent.tsx
│   ├── AdvisorHelpContent.tsx
│   ├── AdvisorTransactionModal.tsx
│   ├── AdvisorAnimalDetails.tsx
│   ├── AdvisorCadastrarAnimal.tsx
│   ├── AdvisorEditarAnimal.tsx
│   └── ...
│
├── employee/                       # Módulo Funcionários
│   ├── EmployeeDashboard.tsx
│   ├── # Peão
│   ├── PeonHomeContent.tsx
│   ├── PeonPregnanciesContent.tsx
│   ├── PeonHerdContent.tsx
│   ├── # Veterinário
│   ├── VetHomeContent.tsx
│   ├── VetHerdContent.tsx
│   └── VetCalendarContent.tsx
│
├── auth/                           # Autenticação
│   ├── LoginScreen.tsx
│   └── ForgotPasswordScreen.tsx
│
├── shared/                         # Componentes compartilhados
│   └── AnimalDetailsContent.tsx
│
├── ui/                             # Componentes UI base
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── native-select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   ├── calendar.tsx
│   ├── chart.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── toast.tsx (sonner)
│   └── ... (30+ componentes)
│
├── # Componentes Globais
├── NotificationsPanel.tsx
├── ProfileView.tsx
├── SwitchUserModal.tsx
├── OnboardingTour.tsx
└── ...
```

### 7.2 Componentes UI Base (Shadcn/ui)

**Total:** 30+ componentes

**Principais:**
- `button.tsx` - Botões com variantes
- `card.tsx` - Cards de conteúdo
- `input.tsx` - Inputs de formulário
- `select.tsx` - Selects customizados
- `native-select.tsx` - Selects nativos
- `dialog.tsx` - Modais/Dialogs
- `dropdown-menu.tsx` - Menus dropdown
- `tabs.tsx` - Navegação em tabs
- `calendar.tsx` - Calendário
- `chart.tsx` - Wrapper para Recharts
- `badge.tsx` - Badges/Tags
- `avatar.tsx` - Avatares de usuário
- `table.tsx` - Tabelas
- `checkbox.tsx` - Checkboxes
- `radio-group.tsx` - Radio buttons
- `switch.tsx` - Toggle switches
- `slider.tsx` - Range sliders
- `progress.tsx` - Barras de progresso
- `accordion.tsx` - Accordions
- `alert.tsx` - Alertas
- `toast.tsx` - Toasts (Sonner)
- `tooltip.tsx` - Tooltips
- `popover.tsx` - Popovers
- `sheet.tsx` - Side sheets
- `scroll-area.tsx` - Áreas com scroll
- `separator.tsx` - Separadores
- `skeleton.tsx` - Loading skeletons
- `context-menu.tsx` - Menus de contexto
- `hover-card.tsx` - Cards ao hover
- `navigation-menu.tsx` - Navegação

---

## 8. DESIGN SYSTEM

### 8.1 Paleta de Cores

#### Modo Light
```css
--background: #ffffff
--foreground: #000000
--card: #f9fafb
--card-foreground: #000000
--popover: #ffffff
--popover-foreground: #000000
--primary: #333333           /* Preto */
--primary-foreground: #ffffff
--secondary: #f3f4f6
--secondary-foreground: #000000
--muted: #f3f4f6
--muted-foreground: #6b7280
--accent: #f3f4f6
--accent-foreground: #000000
--destructive: #ef4444
--destructive-foreground: #ffffff
--border: #e5e7eb
--input: #e5e7eb
--ring: #333333
--radius: 1rem
```

#### Modo Dark
```css
--background: #0d0d0d        /* Cinza muito escuro */
--foreground: #ffffff
--card: #1a1a1a              /* Cinza escuro */
--card-foreground: #ffffff
--popover: #1a1a1a
--popover-foreground: #ffffff
--primary: #ffffff           /* Branco (invertido) */
--primary-foreground: #000000
--secondary: #2a2a2a
--secondary-foreground: #ffffff
--muted: #2a2a2a
--muted-foreground: #99a1af  /* Cinza médio */
--accent: #2a2a2a
--accent-foreground: #ffffff
--destructive: #ef4444
--destructive-foreground: #ffffff
--border: rgba(255,255,255,0.1)
--input: rgba(255,255,255,0.1)
--ring: #ffffff
```

#### Cores de Status
```css
/* Sucesso */
--success: #10b981           /* Verde */

/* Aviso */
--warning: #f59e0b           /* Amarelo/Laranja */

/* Erro */
--error: #ef4444             /* Vermelho */

/* Info */
--info: #3b82f6              /* Azul */
```

### 8.2 Tipografia

**Fonte:** System UI Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Tamanhos (NÃO use classes Tailwind para fonte):**
- Usar tags HTML: `<h1>`, `<h2>`, `<p>`, etc
- Estilos definidos em `/styles/globals.css`

**Escalas:**
- `h1` - Títulos principais
- `h2` - Títulos de seção
- `h3` - Subtítulos
- `h4` - Títulos de card
- `p` - Texto normal
- `small` - Texto pequeno

### 8.3 Espaçamento

**Sistema:** Tailwind Spacing (múltiplos de 4px)
```
0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 
8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)
```

**Padrões comuns:**
- Gap entre elementos: `gap-4` ou `gap-6`
- Padding de cards: `p-6`
- Margin entre seções: `space-y-6`

### 8.4 Bordas e Raios

**Border Radius:**
```css
--radius: 1rem               /* 16px - padrão */
```

**Classes Tailwind:**
- `rounded-lg` - 0.5rem (8px)
- `rounded-xl` - 0.75rem (12px)
- `rounded-2xl` - 1rem (16px) - **padrão para cards**
- `rounded-full` - 9999px (círculos)

**Bordas:**
- Light: `border border-border`
- Dark: `border border-[rgba(255,255,255,0.1)]`

### 8.5 Sombras

**Box Shadow:**
```css
/* Light mode */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Dark mode */
box-shadow: 0 1px 3px 0 rgb(255 255 255 / 0.05), 0 1px 2px -1px rgb(255 255 255 / 0.05);
```

**Classes Tailwind:**
- `shadow-sm` - Sombra sutil
- `shadow` - Sombra padrão
- `shadow-lg` - Sombra grande
- `shadow-xl` - Sombra extra grande

### 8.6 Ícones

**Biblioteca:** Lucide React

**Tamanhos comuns:**
- `w-4 h-4` - Pequeno (16px)
- `w-5 h-5` - Médio (20px) - **padrão**
- `w-6 h-6` - Grande (24px)
- `w-8 h-8` - Extra grande (32px)

**Uso:**
```tsx
import { Heart, Users, Calendar } from 'lucide-react';

<Heart className="w-5 h-5 text-foreground dark:text-white" />
```

### 8.7 Animações e Transições

**Transições:**
```css
transition-colors    /* Mudança de cor */
transition-opacity   /* Opacidade */
transition-transform /* Transformações */
transition-all       /* Todas as propriedades */
```

**Durações:**
```css
duration-150    /* 150ms - rápido */
duration-300    /* 300ms - padrão */
duration-500    /* 500ms - lento */
```

**Easing:**
```css
ease-in-out     /* Padrão */
ease-in
ease-out
```

**Exemplo:**
```tsx
<button className="transition-colors duration-300 hover:bg-accent">
  Clique aqui
</button>
```

### 8.8 Responsividade

**Breakpoints Tailwind:**
```css
sm: 640px   /* Mobile grande / Tablet pequeno */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop pequeno */
xl: 1280px  /* Desktop */
2xl: 1536px /* Desktop grande */
```

**Mobile-First:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 1 coluna mobile, 2 tablet, 4 desktop */}
</div>
```

### 8.9 Estados Interativos

**Hover:**
```tsx
hover:bg-accent
hover:opacity-90
hover:scale-105
```

**Focus:**
```tsx
focus:outline-none
focus:ring-2
focus:ring-primary
```

**Active:**
```tsx
active:scale-95
```

**Disabled:**
```tsx
disabled:opacity-50
disabled:cursor-not-allowed
```

### 8.10 Badges de Status

**Componente:** `Badge` (shadcn/ui)

**Variantes:**
```tsx
<Badge variant="default">Ativo</Badge>
<Badge variant="secondary">Em Andamento</Badge>
<Badge variant="destructive">Cancelado</Badge>
<Badge variant="outline">Pendente</Badge>
```

**Cores Personalizadas:**
```tsx
<Badge className="bg-green-500 text-white">Ativo</Badge>
<Badge className="bg-yellow-500 text-white">Em Crescimento</Badge>
<Badge className="bg-pink-500 text-white">Gestante</Badge>
<Badge className="bg-blue-500 text-white">Em Cobertura</Badge>
```

---

## 9. SISTEMA DE NOTIFICAÇÕES

### 9.1 Arquitetura

**3 Níveis de Notificações:**

1. **Toasts (Feedback Imediato)**
   - Biblioteca: Sonner 2.0.3
   - Posição: top-right
   - Duração: 3-5 segundos
   - Auto-dismiss

2. **Central de Notificações**
   - Painel completo
   - Histórico persistente
   - Filtros e busca
   - Categorização

3. **Preferências Globais**
   - Context React
   - Configurações por categoria
   - Horário de silêncio
   - Múltiplos canais

### 9.2 Fluxo de Notificações

```
[Evento] → [Sistema] → [shouldShowNotification()?] → [Sim/Não]
                              ↓
                        [Verificar Categoria Habilitada]
                              ↓
                        [Verificar Horário]
                              ↓
                        [Exceção: Crítico?]
                              ↓
                        [Enviar Notificação]
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              [Toast (UI)]    [Salvar em Central]
                    ↓                   ↓
            [Auto-dismiss]      [Persistir até deletar]
```

### 9.3 Categorias de Notificações

1. **Saúde**
   - Vacinas vencendo
   - Exames pendentes
   - Procedimentos agendados
   - Alertas veterinários

2. **Financeiro**
   - Pagamentos recebidos
   - Faturas vencidas
   - Despesas altas
   - Ordens de serviço

3. **Serviços**
   - Agendamentos
   - Conclusão de serviços
   - Atrasos
   - Cancelamentos

4. **Reprodução**
   - Coberturas realizadas
   - Gestações confirmadas
   - Nascimentos
   - Protocolos iniciados/concluídos

5. **Geral**
   - Sistema
   - Atualizações
   - Mensagens da equipe
   - Outros

### 9.4 Prioridades

**Alta (Vermelho):**
- Alertas críticos de saúde
- Faturas vencidas
- Emergências
- Perdas/Óbitos

**Média (Amarelo):**
- Lembretes importantes
- Agendamentos próximos
- Validações pendentes

**Baixa (Cinza):**
- Informações gerais
- Atualizações do sistema
- Notificações não urgentes

### 9.5 Canais de Notificação

**Push (Mobile):**
- Notificações nativas do iOS/Android
- Configurável por categoria
- Respeitam silencioso do aparelho
- Exceção para críticos

**Email:**
- Resumo diário/semanal/mensal
- Alertas críticos imediatos
- Relatórios agendados

**SMS (Futuro):**
- Somente alertas críticos
- Nascimentos
- Emergências

**In-App:**
- Badge com contador
- Central de notificações
- Toasts

---

## 10. ROADMAP DE MIGRAÇÃO

### 10.1 Plano Sequencial de 87 Fases

**Status Atual:** 87/87 fases planejadas, 78% implementadas no protótipo React

**Próximo Passo:** Migração para FlutterFlow + Supabase

### 10.2 Fases da Migração

#### FASE 1: Setup Supabase (2 semanas)

**1.1 Configuração Inicial**
- Criar projeto no Supabase
- Configurar domínio personalizado
- Configurar autenticação
- Configurar storage

**1.2 Modelagem do Banco de Dados**

**Tabelas Principais:**

```sql
-- Usuários (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'breeder', 'advisor', 'peon', 'vet')),
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Haras
CREATE TABLE haras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles,
  address JSONB,
  logo_url TEXT,
  subscription_plan TEXT,
  subscription_status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Animais
CREATE TABLE animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  name TEXT NOT NULL,
  registry_abccmm TEXT UNIQUE,
  chip_rfid TEXT,
  marca TEXT,
  sex TEXT CHECK (sex IN ('Macho', 'Fêmea')),
  birth_date DATE,
  haras_origem TEXT,
  category TEXT,
  pelagem TEXT,
  status_atividade TEXT DEFAULT 'Ativo',
  status_atual TEXT,
  localizacao TEXT,
  tipo_reprodutivo TEXT,
  active_for_reproduction BOOLEAN DEFAULT false,
  father_id UUID REFERENCES animals,
  mother_id UUID REFERENCES animals,
  images JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Eventos Reprodutivos
CREATE TABLE reproductive_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals,
  type TEXT CHECK (type IN ('cobertura', 'ia', 'gestacao', 'nascimento', 'ovulo', 'embriao')),
  date DATE NOT NULL,
  partner_id UUID REFERENCES animals,
  veterinarian TEXT,
  details JSONB DEFAULT '{}',
  status TEXT,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gestações
CREATE TABLE pregnancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mare_id UUID REFERENCES animals,
  stallion_id UUID REFERENCES animals,
  reproductive_event_id UUID REFERENCES reproductive_events,
  coverage_date DATE,
  estimated_birth_date DATE,
  confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativa',
  birth_id UUID REFERENCES animals,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Procedimentos Veterinários
CREATE TABLE veterinary_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals,
  type TEXT CHECK (type IN ('vacina', 'exame', 'consulta', 'cirurgia', 'outro')),
  date DATE NOT NULL,
  veterinarian TEXT,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  cost DECIMAL(10,2),
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vacinas
CREATE TABLE vaccines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  veterinarian TEXT,
  batch TEXT,
  expiry_date DATE,
  next_dose_date DATE,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exames
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals,
  type TEXT,
  date DATE NOT NULL,
  veterinarian_lab TEXT,
  result TEXT,
  attachments JSONB DEFAULT '[]',
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Financeiro
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  type TEXT CHECK (type IN ('receita', 'despesa')),
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pendente',
  animal_id UUID REFERENCES animals,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ordens de Serviço
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  number TEXT UNIQUE,
  type TEXT,
  description TEXT,
  estimated_value DECIMAL(10,2),
  final_value DECIMAL(10,2),
  supplier JSONB,
  status TEXT DEFAULT 'aberta',
  animals JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pendências (do Peão)
CREATE TABLE pending_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  type TEXT CHECK (type IN ('nascimento', 'ocorrencia')),
  data JSONB NOT NULL,
  created_by UUID REFERENCES profiles,
  status TEXT DEFAULT 'pendente',
  validated_by UUID REFERENCES profiles,
  validated_at TIMESTAMP,
  validation_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documentos
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  animal_id UUID REFERENCES animals,
  type TEXT,
  name TEXT,
  url TEXT,
  status TEXT,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles,
  category TEXT,
  priority TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logs de Importação ABCCMM
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  haras_id UUID REFERENCES haras,
  file_name TEXT,
  total_rows INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  details JSONB,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**1.3 Row Level Security (RLS)**

- Configurar políticas de acesso
- Usuários só acessam seus haras
- Admin acessa tudo
- Assessor acessa haras vinculado

**1.4 Storage Buckets**

- `avatars` - Fotos de perfil
- `animals` - Fotos de animais
- `documents` - PDFs, contratos, GIAs
- `attachments` - Anexos diversos

---

#### FASE 2: FlutterFlow Setup (1 semana)

**2.1 Criar Projeto**
- Novo projeto FlutterFlow
- Conectar com Supabase
- Configurar autenticação

**2.2 Design System**
- Importar cores (#333333 primária)
- Configurar dark/light mode
- Criar componentes base

**2.3 Estrutura de Navegação**
- Bottom navigation
- Drawer/Menu lateral
- Roteamento

---

#### FASE 3: Módulo de Autenticação (1 semana)

- Tela de login
- Recuperação de senha
- Registro de novo usuário (admin)
- Onboarding

---

#### FASE 4: Módulo Criador - Plantel (3 semanas)

**4.1 Lista de Animais**
- Grid/List view
- Filtros avançados
- Busca
- Paginação

**4.2 Detalhes do Animal**
- 9 tabs completas
- Offline-first
- Cache de imagens

**4.3 Cadastro**
- Formulário completo
- Upload de fotos
- Validações

**4.4 Edição**
- Formulário pré-preenchido
- Histórico de alterações

---

#### FASE 5: Módulo Criador - Reprodução (2 semanas)

- Coberturas
- Inseminações
- Gestações
- Óvulos e Embriões
- Protocolos (futuro)

---

#### FASE 6: Módulo Criador - Financeiro (2 semanas)

- Dashboard
- Receitas
- Despesas
- Relatórios
- Gráficos

---

#### FASE 7: Módulo Criador - Saúde (2 semanas)

- Dashboard de saúde
- Histórico veterinário
- Calendário de vacinas
- Histórico de exames
- Registros

---

#### FASE 8: Módulo Criador - Agenda (1 semana)

- Calendário
- Serviços operacionais
- Eventos públicos

---

#### FASE 9: Módulo Criador - Relatórios (1 semana)

- 4 tipos de relatórios
- Geração de PDF
- Exportação Excel/CSV

---

#### FASE 10: Módulo Criador - Configurações (1 semana)

- Perfil
- Haras
- Assinatura
- Equipe
- Notificações
- Preferências

---

#### FASE 11: Módulo Assessor (3 semanas)

**11.1 Importação ABCCMM**
- Upload de Excel
- Validação
- Importação
- Logs

**11.2 Validação de Pendências**
- Lista de pendências
- Validar nascimentos
- Validar ocorrências
- Oficializar dados

**11.3 Ordens de Serviço**
- Criar OS
- Vincular animais
- Acompanhar status

---

#### FASE 12: Módulo Funcionários (2 semanas)

**12.1 Peão**
- Home com ações rápidas
- Registrar nascimento
- Registrar ocorrência
- Visualizar gestações

**12.2 Veterinário**
- Home
- Registrar procedimentos
- Calendário
- Plantel (visualização)

---

#### FASE 13: Módulo Administrador (2 semanas)

- Dashboard
- Assinaturas
- Métricas de uso
- Alertas críticos
- Configurações

---

#### FASE 14: Sistema de Notificações (1 semana)

- Push notifications
- Central de notificações
- Preferências
- Background processing

---

#### FASE 15: Offline-First (2 semanas)

**15.1 Local Storage**
- SQLite local
- Sincronização bidirecional
- Conflict resolution

**15.2 Queue de Sincronização**
- Fila de operações offline
- Retry automático
- Indicadores de sync

---

#### FASE 16: Testes e QA (2 semanas)

- Testes funcionais
- Testes de performance
- Testes de sincronização offline
- Correção de bugs

---

#### FASE 17: Deploy (1 semana)

- Build Android
- Build iOS
- Publicação nas stores
- Documentação de uso

---

### 10.3 Cronograma Estimado

**Total:** ~24 semanas (~6 meses)

```
Mês 1: Setup + Autenticação + Início do Plantel
Mês 2: Plantel + Reprodução
Mês 3: Financeiro + Saúde + Agenda
Mês 4: Relatórios + Configurações + Assessor
Mês 5: Funcionários + Admin + Notificações
Mês 6: Offline + Testes + Deploy
```

---

## 11. CONSIDERAÇÕES TÉCNICAS

### 11.1 Performance

**Otimizações Implementadas:**
- ✅ Lazy loading de componentes
- ✅ Memoização com React.memo
- ✅ useMemo e useCallback para cálculos pesados
- ✅ Virtualização de listas longas (futuro)
- ✅ Compressão de imagens
- ✅ Paginação de dados

### 11.2 Segurança

**Camadas de Segurança:**
- ✅ Autenticação JWT (Supabase)
- ✅ Row Level Security (RLS)
- ✅ Validação de inputs
- ✅ Sanitização de dados
- ✅ HTTPS obrigatório
- ✅ Proteção CSRF
- ✅ Rate limiting

### 11.3 Acessibilidade

**WCAG 2.1 AA:**
- ✅ Contraste adequado (light/dark)
- ✅ Navegação por teclado
- ✅ ARIA labels
- ✅ Focus indicators
- ✅ Textos alternativos
- ✅ Tamanho mínimo de toque (44x44px)

### 11.4 SEO (Web version - futuro)

- Meta tags
- Open Graph
- Schema.org markup
- Sitemap
- Robots.txt

---

## 12. DOCUMENTOS DE REFERÊNCIA

### 12.1 Documentação Técnica

- `/docs/LISTA_COMPLETA_87_CORRECOES.md` - Lista das 87 fases
- `/docs/PLANO_SEQUENCIAL_FASES.md` - Plano detalhado
- `/docs/MAPEAMENTO_FASES_IMPLEMENTACAO.md` - Mapeamento
- `/CRIAHUB_FINAL_DOCUMENTATION.md` - Doc final do protótipo
- `/RESUMO_EXECUTIVO_FINAL.md` - Resumo executivo

### 12.2 Guias de Desenvolvimento

- `/guidelines/Guidelines.md` - Guidelines gerais
- `/GUIA_DE_TESTE.md` - Guia de testes

### 12.3 Análises e Auditorias

- `/AUDITORIA_COMPLETA_87_FASES.md` - Auditoria completa
- `/ANALISE_CRIADOR_VS_ASSESSOR.md` - Análise de papéis
- `/CONCLUSAO_AUDITORIA.md` - Conclusões

### 12.4 Implementações Específicas

- `/docs/BLOCO_11_COMPLETO.md` - Bloco 11
- `/docs/BLOCO_12_COMPLETO.md` - Bloco 12
- `/docs/BLOCO_13_COMPLETO.md` - Bloco 13 (Saúde)
- `/docs/FASES_7_10_COMPLETAS.md` - Fases 7-10
- `/docs/FASE_52_COMPLETA.md` - Fase 52

---

## 13. GLOSSÁRIO

**ABCCMM:** Associação Brasileira de Criadores de Cavalos Mangalarga Marchador

**GIA:** Guia de Identificação Animal - Documento oficial de registro

**IA:** Inseminação Artificial

**TE:** Transferência de Embriões

**IATF:** Inseminação Artificial em Tempo Fixo

**OS:** Ordem de Serviço

**RLS:** Row Level Security (Supabase)

**Mock Data:** Dados fictícios para desenvolvimento/demonstração

**Offline-First:** Arquitetura que prioriza funcionamento offline

**SaaS:** Software as a Service

**KPI:** Key Performance Indicator (Indicador-Chave de Performance)

**DRE:** Demonstrativo de Resultado do Exercício

**MRR:** Monthly Recurring Revenue (Receita Recorrente Mensal)

---

## 14. CONCLUSÃO

O **CriaHub** é um sistema completo e robusto de gestão de haras, desenvolvido com foco em:

1. **Especialização** na raça Mangalarga Marchador
2. **Mobile-first** para uso em campo
3. **Offline-first** para ambientes com conectividade limitada
4. **Hierarquia adequada** à realidade dos haras brasileiros
5. **Integração ABCCMM** para facilitar importação de dados oficiais
6. **Validação de pendências** entre campo (peão) e escritório (assessor)

O protótipo atual em React/TypeScript serve como **prova de conceito** completa, com 78% das 87 fases implementadas e funcionalidades extras não planejadas.

O próximo passo é a **migração para FlutterFlow + Supabase**, que trará:
- ✅ Apps nativos iOS e Android
- ✅ Funcionalidade offline real
- ✅ Sincronização automática
- ✅ Performance superior
- ✅ Backend escalável

**Desenvolvido com ❤️ para criadores de cavalos Mangalarga Marchador**

---

**Última atualização:** 21 de Janeiro de 2025  
**Versão do documento:** 1.0  
**Autor:** Equipe CriaHub
