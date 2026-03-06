# Entrega de APK Android para cliente (passo a passo completo)

Este guia explica exatamente como gerar um APK instalavel do app e enviar para o cliente testar no Android usando o **mesmo banco Supabase**.

## Objetivo

- Gerar um APK de instalacao direta (sem Expo Go).
- Manter o app apontando para o mesmo Supabase usado hoje.

## Pre-requisitos

- Node funcionando na sua maquina.
- Conta Expo (EAS).
- Projeto com `eas.json` configurado.

## 1) Configurar variaveis locais (`.env.local`)

No projeto, use somente estas variaveis para o app cliente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_SUPABASE_ANON_KEY
```

Ja existe um template em: `.env.local.example`

Se precisar recriar seu env rapidamente:

```bash
cp .env.local.example .env.local
```

Depois preencha com os valores reais do mesmo projeto Supabase.

## 2) Logar no Expo (EAS)

```bash
npx eas-cli login
```

## 3) Vincular/Inicializar projeto EAS (primeira vez)

```bash
npx eas-cli project:init
```

## 4) Subir as mesmas variaveis no EAS (build em nuvem)

Importante: o build do EAS nao usa seu `.env.local` automaticamente. Voce precisa publicar os valores no projeto EAS.

```bash
npx eas-cli secret:create --scope project --name NEXT_PUBLIC_SUPABASE_URL --value "https://SEU-PROJETO.supabase.co"
npx eas-cli secret:create --scope project --name NEXT_PUBLIC_SUPABASE_ANON_KEY --value "SEU_SUPABASE_ANON_KEY"
```

Se ja existir, atualize removendo e criando de novo:

```bash
npx eas-cli secret:delete --scope project --name NEXT_PUBLIC_SUPABASE_URL
npx eas-cli secret:delete --scope project --name NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 5) Gerar APK para teste do cliente

Use o script ja configurado:

```bash
npm run build:android:apk
```

Equivalente direto:

```bash
npx eas-cli build --platform android --profile preview
```

Ao final, o EAS retorna um link para baixar o `.apk`.

## 6) Enviar para o cliente

- Envie o link do build EAS, ou
- Baixe o `.apk` e envie por WhatsApp/Drive.

## 7) Instalar no Android do cliente

- Abrir o APK no celular.
- Permitir instalacao de fontes desconhecidas (se solicitado).
- Instalar e abrir.

## 8) Checklist rapido de validacao

- Login funcionando.
- Plantel abre.
- Agenda abre e cria evento.
- Rotina abre e executa tarefa.
- Reproducao abre e lista dados.

Se isso funcionar, o APK esta consumindo o mesmo banco corretamente.

## 9) Comandos uteis

Ver builds recentes:

```bash
npx eas-cli build:list --platform android --limit 5
```

Abrir ultimo build no browser:

```bash
npx eas-cli build:list --platform android --limit 1
```

## Observacoes de seguranca

- No app cliente, use somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Nao embarcar `SUPABASE_SERVICE_ROLE_KEY` no mobile.
