# CRIAHUB Mobile

Aplicativo React Native (Expo) complementar ao CRIAHUB Web, conectado ao mesmo banco Supabase.

## Escopo V1
- Autenticação com Supabase.
- Perfil mobile suportado: `criador`.
- Criador: foco em `Plantel`, `Ficha do animal`, `Reprodução` e `Agenda`.
- Plantel somente leitura: lista, busca, filtros e detalhe do animal.
- Tela de conta: perfil, troca de tema e logout.
- Perfis não suportados no V1 (`admin`, `assessor`, etc.) recebem tela dedicada com logout.

## Stack
- Expo Router + React Native + TypeScript
- Supabase JS
- TanStack Query
- React Hook Form + Zod

## Setup
1. Instalar dependências:
```bash
npm install
```

2. Confirmar arquivo de ambiente:
- O projeto usa `.env.local` (copiado da versão web).

3. Rodar o app:
```bash
npm run start
```

Opcional:
```bash
npm run android
npm run ios
npm run web
```

## Estrutura Principal
```text
app/
  (auth)/
  (app)/
src/
  components/ui/
  config/
  contexts/
  hooks/
  lib/
  screens/
  services/
  theme/
  types/
```

## Documentação de Referência Web
- `docs/web-reference/README.web.md`
- `docs/web-reference/DOCUMENTACAO_GERAL_SISTEMA.md`
- `docs/web-reference/PLANEJAMENTO_DESENVOLVIMENTO.md`

## Integração Mobile x Banco
- `docs/mobile-integration/INTEGRATION_PLAYBOOK.md`
- `docs/mobile-integration/AUDIT_AND_SEED.sql`

## Segurança
- O arquivo `.env.local` contém chaves sensíveis por decisão de projeto.
- No cliente mobile, somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são usadas para conexão Supabase.

## Próxima fase (pendente)
- Hardening de privacidade no Supabase (RLS, policies e grants) será aplicado após validação funcional do fluxo mobile.
