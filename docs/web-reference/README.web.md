# CriaHub - Sistema de Gestão para Haras

Sistema completo de gestão para criadores de cavalos Mangalarga Marchador, desenvolvido com Next.js, React, TypeScript, Tailwind CSS, Shadcn/ui e Supabase.

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript
- **Estilização**: Tailwind CSS 4, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Forms**: React Hook Form + Zod
- **Estado**: TanStack Query
- **Gráficos**: Recharts
- **Ícones**: Lucide React

## 🚀 Começando

### 1. Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase

### 2. Configuração do Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Project Settings** > **API**
3. Copie a **URL** e a **anon key**

### 3. Configuração do Projeto

```bash
# Clone o repositório (se necessário)
cd criahub-web/nextjs-temp

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local
```

Edite o arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configuração do Banco de Dados

Execute as migrations no SQL Editor do Supabase:

1. Acesse **SQL Editor** no Supabase Dashboard
2. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Execute o script

### 5. Criando Usuário de Teste

No SQL Editor do Supabase, após criar as tabelas:

```sql
-- Criar usuário admin de teste
-- Primeiro, crie o usuário via Auth (Dashboard > Authentication > Users > Add User)
-- Email: admin@criahub.com | Senha: Admin@123

-- Depois, atualize o role para admin:
UPDATE profiles SET role = 'admin' WHERE id = 'USER_ID_AQUI';
```

### 6. Rodando o Projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/           # Rotas de autenticação
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/      # Rotas protegidas
│   │   ├── admin/        # Módulo Admin
│   │   ├── criador/      # Módulo Criador
│   │   └── assessor/     # Módulo Assessor
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/               # Componentes Shadcn/ui
│   ├── shared/           # Componentes compartilhados
│   ├── admin/            # Componentes do Admin
│   ├── breeder/          # Componentes do Criador
│   └── advisor/          # Componentes do Assessor
├── contexts/
│   ├── auth-context.tsx
│   └── theme-context.tsx
├── hooks/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── services/
├── types/
│   └── database.types.ts
└── middleware.ts
```

## 👥 Perfis de Usuário

| Perfil | Rota Base | Descrição |
|--------|-----------|-----------|
| Admin | `/admin` | Gerencia a plataforma e assinaturas |
| Criador | `/criador` | Proprietário do haras, gestão completa |
| Assessor | `/assessor` | Auditor administrativo, validação de dados |

## 🔐 Autenticação

O sistema utiliza Supabase Auth com:
- Login com email/senha
- Recuperação de senha
- Proteção de rotas via middleware
- Controle de acesso baseado em roles

## 📊 Módulos

### Admin
- Dashboard com KPIs da plataforma
- Gerenciamento de assinaturas
- Métricas de uso
- Alertas críticos

### Criador
- Dashboard com visão geral do plantel
- Gestão de animais (CRUD completo)
- Reprodução (coberturas, gestações, nascimentos)
- Financeiro (receitas, despesas)
- Agenda de eventos
- Relatórios

### Assessor
- Dashboard com pendências
- Importação de dados ABCCMM
- Validação de registros
- Ordens de serviço
- Gestão de equipe
- Documentos

## 🔄 Próximos Passos

1. [ ] Configurar Supabase com chave anon
2. [ ] Executar migrations
3. [ ] Criar usuário de teste
4. [ ] Implementar páginas internas dos módulos
5. [ ] Adicionar componentes de domain (AnimalCard, DataTable, etc.)
6. [ ] Implementar integração com ABCCMM
7. [ ] Configurar Storage para imagens
8. [ ] Adicionar testes

## 📝 Licença

Projeto privado - CriaHub © 2026
