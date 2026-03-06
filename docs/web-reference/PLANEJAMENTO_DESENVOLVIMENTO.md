# 🏇 CRIAHUB - PLANEJAMENTO DE DESENVOLVIMENTO

**Versão:** 1.0.0  
**Data:** 30 de Janeiro de 2026  
**Stack:** Next.js 14+ | React 18+ | Tailwind CSS | Shadcn/ui | Supabase  
**Usuários:** Admin, Criador, Assessor

---

## 📋 ÍNDICE

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Usuários](#3-estrutura-de-usuários)
4. [Checklist de Infraestrutura](#4-checklist-de-infraestrutura)
5. [Checklist do Banco de Dados Supabase](#5-checklist-do-banco-de-dados-supabase)
6. [Checklist de Autenticação](#6-checklist-de-autenticação)
7. [Checklist do Módulo Admin](#7-checklist-do-módulo-admin)
8. [Checklist do Módulo Criador](#8-checklist-do-módulo-criador)
9. [Checklist do Módulo Assessor](#9-checklist-do-módulo-assessor)
10. [Checklist de Componentes Compartilhados](#10-checklist-de-componentes-compartilhados)
11. [Checklist de UI/UX](#11-checklist-de-uiux)
12. [Checklist de Integrações](#12-checklist-de-integrações)
13. [Checklist de Testes](#13-checklist-de-testes)
14. [Checklist de Deploy](#14-checklist-de-deploy)
15. [Cronograma](#15-cronograma)

---

## 1. VISÃO GERAL DO PROJETO

### 1.1 Descrição

O **CriaHub** é uma plataforma SaaS para gestão completa de haras de cavalos **Mangalarga Marchador**. O sistema oferece:

- Gestão de plantel de animais
- Controle reprodutivo completo
- Gestão financeira
- Agenda e eventos
- Relatórios e documentos
- Importação de dados ABCCMM

### 1.2 Usuários do Sistema

| Perfil | Descrição | Acesso |
|--------|-----------|--------|
| **Admin** | Administrador da plataforma CriaHub | Total sobre a plataforma |
| **Criador** | Dono do haras/cliente | Total sobre seu haras |
| **Assessor** | Auditor administrativo do haras | Importação ABCCMM, validação de pendências, ordens de serviço |

### 1.3 Objetivos Técnicos

- ✅ Aplicação web responsiva (mobile-first)
- ✅ Backend completo com Supabase
- ✅ Autenticação segura
- ✅ Design system consistente com Shadcn/ui
- ✅ Performance otimizada

---

## 2. STACK TECNOLÓGICA

### 2.1 Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Next.js** | 14+ | Framework React com App Router |
| **React** | 18+ | Biblioteca UI |
| **TypeScript** | 5+ | Tipagem estática |
| **Tailwind CSS** | 3.4+ | Estilização utility-first |
| **Shadcn/ui** | latest | Componentes UI |
| **Lucide React** | latest | Ícones |
| **React Hook Form** | 7+ | Formulários |
| **Zod** | latest | Validação de schemas |
| **TanStack Query** | 5+ | Gerenciamento de estado servidor |
| **Recharts** | 2+ | Gráficos |
| **Sonner** | 2+ | Toasts/Notificações |

### 2.2 Backend (Supabase)

| Serviço | Uso |
|---------|-----|
| **PostgreSQL** | Banco de dados relacional |
| **Auth** | Autenticação e autorização |
| **Storage** | Armazenamento de arquivos |
| **Edge Functions** | Lógica backend serverless |
| **Realtime** | Atualizações em tempo real |

### 2.3 Estrutura de Pastas (Next.js App Router)

```
src/
├── app/                        # App Router (páginas)
├── components/
│   ├── admin/                  # Componentes Admin
│   ├── breeder/                # Componentes Criador
│   ├── advisor/                # Componentes Assessor
│   ├── shared/                 # Componentes compartilhados
│   └── ui/                     # Componentes Shadcn
├── lib/
│   ├── supabase/               # Cliente e tipos Supabase
│   ├── utils.ts                # Utilitários
│   └── validations/            # Schemas Zod
├── hooks/                      # Hooks customizados
├── services/                   # Serviços de API
├── types/                      # Tipos TypeScript
├── contexts/                   # Contextos React
└── styles/                     # Estilos globais
```

---

## 3. ESTRUTURA DE USUÁRIOS

### 3.1 Hierarquia

```
┌─────────────────────────────────────┐
│  ADMIN (Equipe CriaHub)             │
│  - Gerencia plataforma              │
│  - Gerencia assinaturas             │
│  - Monitora uso                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  CRIADOR (Dono do Haras)            │
│  - Gerencia seu haras               │
│  - Controle total                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  ASSESSOR (Auditor Administrativo)  │
│  - Importação ABCCMM                │
│  - Validação de pendências          │
│  - Ordens de serviço                │
└─────────────────────────────────────┘
```

### 3.2 Permissões por Perfil

| Funcionalidade | Admin | Criador | Assessor |
|----------------|-------|---------|----------|
| Gerenciar plataforma | ✅ | ❌ | ❌ |
| Gerenciar assinaturas | ✅ | ❌ | ❌ |
| Ver métricas globais | ✅ | ❌ | ❌ |
| Cadastrar animais | ❌ | ✅ | ❌ |
| Editar animais | ❌ | ✅ | ❌ |
| Visualizar plantel | ❌ | ✅ | ✅ (leitura) |
| Importar ABCCMM | ❌ | ✅ | ✅ |
| Registrar coberturas | ❌ | ✅ | ❌ |
| Gerenciar reprodução | ❌ | ✅ | ✅ (leitura) |
| Financeiro completo | ❌ | ✅ | ❌ |
| Ordens de serviço | ❌ | ✅ | ✅ |
| Validar pendências | ❌ | ❌ | ✅ |
| Gerenciar equipe | ❌ | ✅ | ✅ |
| Configurações haras | ❌ | ✅ | ❌ |
| Relatórios | ❌ | ✅ | ✅ (limitado) |

---

## 4. CHECKLIST DE INFRAESTRUTURA

### 4.1 Setup Inicial do Projeto

- [x] **Criar projeto Next.js 14+ com App Router**
  - [x] `npx create-next-app@latest criahub-web --typescript --tailwind --eslint --app --src-dir`
  - [x] Configurar `next.config.js`
  - [x] Configurar `tsconfig.json`

- [x] **Configurar Tailwind CSS**
  - [x] Configurar `tailwind.config.ts`
  - [x] Definir cores personalizadas do CriaHub
  - [x] Configurar dark mode

- [x] **Instalar e configurar Shadcn/ui**
  - [x] `npx shadcn@latest init`
  - [x] Configurar `components.json`
  - [x] Instalar componentes base (button, card, input, etc.)

- [x] **Configurar Supabase Client**
  - [x] Instalar `@supabase/supabase-js`
  - [x] Instalar `@supabase/ssr`
  - [x] Criar cliente para Server Components
  - [x] Criar cliente para Client Components
  - [x] Configurar variáveis de ambiente

- [x] **Configurar ESLint e Prettier**
  - [x] Configurar regras de linting
  - [x] Configurar formatação automática

- [x] **Configurar estrutura de pastas**
  - [x] Criar estrutura conforme seção 2.3
  - [x] Configurar path aliases

---

## 5. CHECKLIST DO BANCO DE DADOS SUPABASE

### 5.1 Tabelas Principais

- [x] **profiles** (extensão de auth.users)
- [x] **haras**
- [x] **haras_members** (relacionamento usuários-haras)
- [x] **animals**
- [ ] **reproductive_events** (coberturas, IAs)
- [ ] **pregnancies** (gestações)
- [ ] **ovules** (óvulos coletados)
- [ ] **embryos** (embriões)
- [x] **health_records** (procedimentos veterinários)
- [ ] **vaccines** (vacinas específicas)
- [ ] **exams** (exames)
- [ ] **transactions** (financeiro)
- [ ] **service_orders** (ordens de serviço)
- [ ] **pending_validations** (pendências do campo)
- [ ] **events** (agenda/eventos)
- [ ] **documents** (documentos)
- [ ] **animal_awards** (premiações)
- [ ] **animal_location_history** (histórico de localização)
- [ ] **notifications** (notificações)
- [ ] **notification_preferences** (preferências)
- [x] **import_history** (logs de importação ABCCMM)
- [ ] **subscriptions** (assinaturas - para Admin)
- [x] **integrations** (integrações externas)
- [x] **sync_logs** (logs de sincronização)

### 5.2 Views e Functions

- [ ] **view_animal_with_parents** (animal com genealogia)
- [ ] **view_pregnancy_details** (gestação com detalhes)
- [ ] **view_financial_summary** (resumo financeiro por haras)
- [ ] **fn_generate_os_number** (gerar número de OS)
- [ ] **fn_calculate_gestation_days** (calcular dias de gestação)
- [ ] **fn_get_animal_offspring_count** (contar filhos)

### 5.3 Storage Buckets

- [x] **avatars** - Fotos de perfil de usuários
- [ ] **haras-logos** - Logos dos haras
- [x] **animal-images** - Fotos de animais
- [ ] **documents** - PDFs, contratos, GIAs
- [ ] **attachments** - Anexos diversos

---

## 6. CHECKLIST DE AUTENTICAÇÃO

### 6.1 Supabase Auth

- [x] **Configurar provedores**
  - [x] Email/Senha
  - [ ] (Opcional) Google OAuth
  - [ ] (Opcional) Apple OAuth

- [ ] **Configurar templates de email**
  - [ ] Email de confirmação
  - [ ] Email de recuperação de senha
  - [ ] Email de convite

### 6.2 Páginas de Autenticação

- [x] **Página de Login** (`/login`)
  - [x] Formulário de email/senha
  - [x] Validação com Zod
  - [x] Mensagens de erro
  - [ ] Opção "Lembrar de mim"
  - [ ] Link "Esqueci minha senha"
  - [x] Design responsivo
  - [x] Dark/Light mode

- [ ] **Página de Recuperação de Senha** (`/forgot-password`)
- [ ] **Página de Redefinição de Senha** (`/reset-password`)

### 6.3 Middleware e Proteção de Rotas

- [x] **Middleware de autenticação**
  - [x] Verificar sessão em rotas protegidas
  - [x] Redirect para login se não autenticado
  - [x] Verificar role do usuário

- [x] **Guards por perfil**
  - [x] Admin só acessa `/admin/*`
  - [x] Criador só acessa `/criador/*`
  - [x] Assessor só acessa `/assessor/*`
  - [x] Redirect para dashboard correto

### 6.4 Hooks e Contextos

- [x] **useAuth hook**
- [x] **AuthContext**

---

## 7. CHECKLIST DO MÓDULO ADMIN

### 7.1 Layout e Navegação

- [x] **Layout Admin** - Sidebar, Header, Responsivo
- [x] **Menu de navegação** - Dashboard, Assinaturas, Uso, Alertas, Config, Ajuda

### 7.2 Dashboard Admin

- [x] **Página Dashboard** (`AdminDashboard.tsx`)
  - [x] KPIs principais
  - [x] Gráficos
  - [x] Alertas recentes

### 7.3 Gerenciamento de Assinaturas

- [x] **Página de Assinaturas** (`AdminSubscriptionsContent.tsx`)
  - [x] Lista de clientes
  - [x] Filtros e busca
  - [x] Modais de gerenciamento

### 7.4 Uso da Plataforma

- [x] **Página de Métricas** (`AdminPlatformUsageContent.tsx`)
  - [x] KPIs
  - [x] Gráficos

### 7.5 Alertas Críticos

- [x] **Página de Alertas** (`AdminCriticalAlertsContent.tsx`)

### 7.6 Configurações Admin

- [x] **Página de Configurações** (`AdminSettingsContent.tsx`)

### 7.7 Ajuda Admin

- [x] **Página de Ajuda** (`AdminHelpContent.tsx`)

---

## 8. CHECKLIST DO MÓDULO CRIADOR

### 8.1 Layout e Navegação

- [x] **Layout Criador** - Sidebar, Header, Responsivo
- [x] **Menu de navegação**

### 8.2 Dashboard Criador

- [x] **Página Dashboard** (`BreederDashboardContent.tsx`)
  - [x] Ações rápidas
  - [x] KPIs principais
  - [x] Gráficos
  - [x] Próximos eventos
  - [x] Alertas importantes

### 8.3 Plantel

- [x] **Página de Plantel** (`BreederPlantelContent.tsx`)
  - [x] Modos de visualização (grid/lista)
  - [x] Busca
  - [x] Filtros avançados (`AdvancedFiltersModal.tsx`)
  - [x] Botão "Cadastrar Animal"
  - [x] Botão "Importar ABCCMM"
  - [x] Paginação

- [x] **Card de Animal** (`AnimalCard.tsx`)

### 8.4 Detalhes do Animal

- [x] **Página de Detalhes** (`BreederAnimalDetails.tsx`)
  - [x] Header com foto, nome, registro
  - [x] Navegação por tabs

- [x] **Tab: Visão Geral**
- [x] **Tab: Saúde** (`HealthTabs.tsx`, `HealthDashboard.tsx`, `HealthTab.tsx`)
  - [x] Dashboard de saúde
  - [x] Histórico veterinário
  - [x] Calendário de vacinas (`VaccinationCalendarTab.tsx`)
  - [x] Histórico de exames (`ExamsHistoryTab.tsx`)
  - [x] Modais de registro (`RegisterVaccineModal.tsx`, `RegisterExamModal.tsx`, `RegisterVeterinaryProcedureModal.tsx`)

- [x] **Tab: Reprodução**
  - [x] Coberturas (`RegisterCoberturaModal.tsx`)
  - [x] Inseminações (`RegisterInseminationModal.tsx`)
  - [x] Gestações (`GestationsTab.tsx`, `ConfirmPregnancyModal.tsx`)
  - [x] Óvulos (`RegisterOvulosModal.tsx`, `RegisterOvulationModal.tsx`)
  - [x] Embriões (`RegisterEmbriaoModal.tsx`)

- [x] **Tab: Genealogia** (`GenealogyTree.tsx`, `QuickGenealogyModal.tsx`)
- [x] **Tab: Documentos** (`AnimalDocumentsSection.tsx`, `AddDocumentModal.tsx`, `GenerateContractModal.tsx`)
- [x] **Tab: Localização** (`AnimalLocationSection.tsx`, `LocationChangeModal.tsx`)
- [ ] **Tab: Vídeos**
- [x] **Tab: Premiações** (`AwardsHistoryTab.tsx`, `ShowsTab.tsx`, `AuctionsTab.tsx`)
- [ ] **Tab: Histórico**

### 8.5 Cadastro de Animal

- [x] **Página de Cadastro** (`BreederCadastrarAnimal.tsx`)

### 8.6 Edição de Animal

- [x] **Página de Edição** (`BreederEditarAnimal.tsx`)

### 8.7 Módulo Reprodução

- [x] **Página de Reprodução** (`BreederReproductionContent.tsx`)
  - [x] Tab: Automação (`ReproductionAutomationTab.tsx`)
  - [x] Tab: Gestações (`GestationsTab.tsx`)
  - [x] Modais de Protocolos (`ActiveProtocolsModal.tsx`, `CreateProtocolModal.tsx`, `ApplyProtocolModal.tsx`)
  - [x] Templates (`ProtocolTemplatesModal.tsx`, `ProtocolCalendarModal.tsx`)

### 8.8 Módulo Financeiro

- [x] **Página Financeiro** (`BreederFinancialContent.tsx`)
  - [x] Tab: Dashboard
  - [x] Tab: Receitas (`BreederRevenueContent.tsx`)
  - [x] Tab: Despesas (`BreederExpenseContent.tsx`)
  - [x] Modal de Transação (`BreederTransactionModal.tsx`)

### 8.9 Módulo Agenda

- [x] **Página de Agenda** (`BreederAgendaContent.tsx`)
  - [x] Serviços Operacionais
  - [x] Eventos Públicos
  - [x] Modais (`AddServiceModal.tsx`, `AddPublicEventModal.tsx`, `EditEventModal.tsx`)

### 8.10 Módulo Relatórios

- [x] **Página de Relatórios** (`BreederReportsContent.tsx`)
  - [x] Relatório Individual (`AnimalReportModal.tsx`)
  - [x] Relatório de Plantel (`HerdReportModal.tsx`)
  - [x] Relatório Financeiro (`FinancialReportModal.tsx`)
  - [x] Relatório de Saúde (`HealthReportModal.tsx`)

### 8.11 Configurações Criador

- [x] **Página de Configurações** (`BreederSettingsContent.tsx`)
  - [x] Tab: Perfil
  - [x] Tab: Haras
  - [x] Tab: Assinatura
  - [x] Tab: Equipe
  - [x] Tab: Notificações
  - [x] Tab: Preferências
  - [x] Tab: Integrações
  - [x] Tab: Segurança

### 8.12 Ajuda Criador

- [x] **Página de Ajuda** (`BreederHelpContent.tsx`)

---

## 9. CHECKLIST DO MÓDULO ASSESSOR

### 9.1 Layout e Navegação

- [x] **Layout Assessor** - Sidebar, Header (`AdvisorDashboard.tsx`)
- [x] **Menu de navegação**

### 9.2 Dashboard Assessor

- [x] **Página Dashboard**
  - [x] Alerta de Pendências
  - [x] Atalhos rápidos

### 9.3-9.12 Funcionalidades do Assessor

- [ ] **Plantel (Modo Leitura + Importação)** - A IMPLEMENTAR
- [ ] **Validação de Pendências** - A IMPLEMENTAR
- [ ] **Reprodução (Modo Leitura)** - A IMPLEMENTAR
- [ ] **Financeiro (Ordens de Serviço)** - A IMPLEMENTAR
- [ ] **Tarefas** - A IMPLEMENTAR
- [ ] **Equipe** - A IMPLEMENTAR
- [ ] **Agenda** - A IMPLEMENTAR
- [ ] **Documentos** - A IMPLEMENTAR
- [ ] **Configurações Assessor** - A IMPLEMENTAR
- [ ] **Ajuda Assessor** - A IMPLEMENTAR

---

## 10. CHECKLIST DE COMPONENTES COMPARTILHADOS

### 10.1 Layout Components

- [x] **MainLayout** - Layout base com sidebar
- [x] **Sidebar** - Menu lateral colapsável
- [x] **Header** - Barra superior
- [x] **Breadcrumbs**
- [ ] **PageHeader**
- [ ] **PageContainer**

### 10.2 Data Display

- [x] **DataTable** (Table do Shadcn)
- [x] **DataGrid**
- [ ] **EmptyState**
- [ ] **LoadingState**
- [ ] **ErrorState**
- [x] **StatsCard**
- [ ] **Timeline**
- [x] **Badge**

### 10.3 Forms

- [x] **Form** (React Hook Form + Shadcn)
- [x] **Input**
- [x] **Select**
- [x] **Checkbox**
- [x] **Calendar/DatePicker**
- [ ] **DateRangePicker**
- [ ] **MultiSelect**
- [ ] **FileUpload**
- [ ] **ImageUpload**
- [ ] **CurrencyInput**
- [ ] **PhoneInput**

### 10.4 Feedback

- [x] **Dialog** - Modais
- [x] **AlertDialog** - Confirmação
- [x] **Sonner** - Toast
- [x] **Alert**
- [x] **Tooltip**

### 10.5 Navigation

- [x] **Tabs**
- [x] **Pagination**
- [ ] **BackButton**

### 10.6 Domain-Specific

- [x] **AnimalCard**
- [ ] **AnimalMiniBadge**
- [x] **GenealogyTree**
- [x] **CalendarView**
- [x] **ChartContainer** (Recharts)
- [x] **NotificationsDropdown** (`NotificationsPanel.tsx`)
- [x] **UserMenu**
- [x] **ThemeToggle**

---

## 11. CHECKLIST DE UI/UX

### 11.1 Design System

- [x] **Paleta de cores** - Light/Dark mode
- [x] **Tipografia**
- [x] **Espaçamento**
- [x] **Border radius**
- [x] **Shadows**

### 11.2 Responsividade

- [x] **Breakpoints definidos**
- [x] **Mobile-first approach**

### 11.3 Acessibilidade

- [ ] **WCAG 2.1 AA** - Parcialmente implementado

### 11.4 Performance

- [x] **Otimizações** - Imagens, lazy loading

---

## 12. CHECKLIST DE INTEGRAÇÕES

### 12.1 Supabase

- [x] **Cliente configurado** (Server, Browser, Middleware)
- [x] **Auth integrado**
- [ ] **Storage integrado** - Parcial

### 12.2 Importação ABCCMM

- [ ] **Parser de Excel** - A IMPLEMENTAR
- [ ] **Processamento** - A IMPLEMENTAR

---

## 13. CHECKLIST DE TESTES

- [ ] **Testes Unitários** - A IMPLEMENTAR
- [ ] **Testes de Componentes** - A IMPLEMENTAR
- [ ] **Testes E2E** - A IMPLEMENTAR

---

## 14. CHECKLIST DE DEPLOY

- [ ] **Preparação** - A IMPLEMENTAR
- [ ] **Vercel** - A IMPLEMENTAR
- [ ] **Supabase Production** - A IMPLEMENTAR

---

## 15. RESUMO DO PROGRESSO

| Módulo | Status | Progresso |
|--------|--------|-----------|
| Infraestrutura | ✅ Concluído | 100% |
| Banco de Dados | 🟡 Em andamento | 40% |
| Autenticação | ✅ Concluído | 90% |
| Módulo Admin | ✅ Concluído | 100% |
| Módulo Criador | ✅ Concluído | 95% |
| Módulo Assessor | 🔴 Pendente | 10% |
| Componentes UI | ✅ Concluído | 90% |
| Integrações | 🟡 Em andamento | 50% |
| Testes | 🔴 Pendente | 0% |
| Deploy | 🔴 Pendente | 0% |

### Próximo Passo: Módulo Criador (Dono do Haras)

O módulo Criador está quase completo. Itens pendentes:
- Tab: Vídeos
- Tab: Histórico
- Integrações de storage para upload de arquivos

---

**Última atualização:** 30 de Janeiro de 2026  
**Versão do documento:** 1.1  
**Autor:** Equipe CriaHub
