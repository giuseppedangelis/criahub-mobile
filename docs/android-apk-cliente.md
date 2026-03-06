# Gerar APK Android para cliente (Expo + EAS)

Este projeto usa Expo e conecta no Supabase via variaveis publicas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 1) Preparar ambiente

No diretorio do projeto, garanta que estas variaveis existem no seu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

## 2) Login no Expo

```bash
npx eas-cli login
```

## 3) Registrar projeto no EAS (primeira vez)

```bash
npx eas-cli project:init
```

## 4) Publicar variaveis no EAS (build em nuvem)

```bash
npx eas-cli secret:create --scope project --name NEXT_PUBLIC_SUPABASE_URL --value "https://SEU-PROJETO.supabase.co"
npx eas-cli secret:create --scope project --name NEXT_PUBLIC_SUPABASE_ANON_KEY --value "SEU_ANON_KEY"
```

## 5) Gerar APK instalavel

```bash
npx eas-cli build --platform android --profile preview
```

No fim, o EAS retorna uma URL para baixar o `.apk`.

## 6) Enviar para o cliente

- Envie o link do build EAS, ou baixe e compartilhe o arquivo `.apk`.
- O cliente instala no Android e o app usa o mesmo Supabase.

## 7) Teste rapido antes de enviar

- Abrir app
- Login
- Navegar: Plantel, Agenda, Rotina, Reproducao
- Criar/editar 1 registro para validar escrita no banco

## Observacoes importantes

- O perfil `preview` em `eas.json` gera **APK** (instalacao direta).
- O perfil `production` gera **AAB** (Play Store).
- Nao usar `SUPABASE_SERVICE_ROLE_KEY` no app cliente.
