# Phase 4: Apple 5.1.1(v) In-app Deletion - Context

**Gathered:** 2026-04-17
**Status:** Ready for execution

<domain>
## Phase Boundary

Um REQ P0 bloqueante pra submit na App Store: substituir o fluxo atual `mailto:suporte@...` (commit `4b3eac1` foi rollback) por exclusão real in-app que satisfaz Apple 5.1.1(v).

**Entrega desta fase:**
1. Tabela `public.account_deletion_requests` (audit trail de quem pediu exclusão).
2. Edge function `delete-account` que valida JWT, grava audit, chama `auth.admin.deleteUser(user_id)` imediatamente.
3. `AccountScreen` substitui fluxo mailto por confirmação dupla + invoke da edge function + signOut local.

Fora de escopo:
- Grace period / janela de cancelamento (30 dias) — escolha explícita D-02: status fixo `'deleted'`; reverter requer suporte.
- Worker de hard-delete agendado (pg_cron ou similar) — `admin.deleteUser` já hard-deleta auth.users. Cascata de FK cuida do resto via policies do schema.
- Soft-delete de `profiles` com `deleted_at` — não nesta fase.
- Retenção regulatória (LGPD art.16) — política fica como operacional/legal, não código.
- Tela "Suporte" para cancelamento humano — deferred.
- Biometria antes de confirmar — fora de escopo do bug bash.

</domain>

<decisions>
## Implementation Decisions

### Semântica da exclusão (D-01)
- **D-01:** Edge function `delete-account` chama `supabase.auth.admin.deleteUser(user_id)` imediatamente após validar JWT e gravar audit row. Hard-delete de `auth.users` cascata pela FK dos outros schemas. Usuário fica impossibilitado de logar.

### Tabela de audit (D-02)
- **D-02:** Schema minimalista em `public.account_deletion_requests`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL` (NÃO é FK — `auth.users` vai sumir logo depois)
  - `email text NOT NULL` (capturado antes do delete — pra ter rastro)
  - `requested_at timestamptz NOT NULL DEFAULT now()`
  - `status text NOT NULL DEFAULT 'deleted'`
  - `INDEX idx_account_deletion_requests_user_id ON (user_id)`
  - `INDEX idx_account_deletion_requests_requested_at ON (requested_at DESC)`
- Sem `effective_delete_at`, sem `cancelled_at` — reverter requer contato com suporte.

### RLS (D-03)
- **D-03:** Policies:
  - `RLS: ENABLED`
  - Policy `select_own`: `SELECT` permitido se `auth.uid() = user_id`.
  - INSERT/UPDATE/DELETE: sem policy pública — só `service_role` via edge function pode gravar.
- Razão: usuário que **não** foi deletado (ex.: teste) pode ver próprio histórico. Usuário deletado não loga mais; a row existe como audit acessível só pelo service_role.

### UI confirmation (D-04)
- **D-04:** Dois `Alert.alert` sequenciais:
  1. Primeiro: "Excluir conta?" / "Esta ação remove permanentemente sua conta e todos os dados vinculados. Você não conseguirá mais acessar o CriaHub com este email." / [Cancelar, Continuar (destructive)]
  2. Segundo (apenas se usuário aceitou o primeiro): "Tem certeza?" / "Última confirmação. Após tocar em 'Excluir minha conta' a exclusão é enfileirada e você será deslogado." / [Cancelar, Excluir minha conta (destructive)]
- Após 2ª confirmação: invoke da edge function → Alert de status → signOut local → redireciona pra login automaticamente (via onAuthStateChange).

### Deploy strategy (D-05)
- **D-05:** Aplicar migration + edge function direto no projeto `criahub` (gwibmimaquoesgpbdojo) via MCP. Sem branch preview. Reversão via `list_migrations` + edge function versioning se precisar.

### Error handling no client
- **D-06:** Se o invoke retornar erro:
  - HTTP 401 → "Sua sessão expirou. Faça login novamente e tente de novo." + signOut.
  - HTTP 500 / network → "Não foi possível excluir agora. Tente novamente em alguns minutos. Se persistir, escreva pra suporte@criahub.com.br."
  - Sucesso → Alert "Conta excluída" / "Seu acesso foi encerrado. Se precisar de algo, escreva pra suporte@criahub.com.br." + signOut.

### Edge function details
- **D-07:** Edge function usa `verify_jwt: true` (flag na deploy). Recebe `Authorization: Bearer <user_jwt>`. Extrai user_id via `jwt.decode` ou `supabase.auth.getUser()` com service role client.
- **D-08:** Client da edge function é instanciado com `SUPABASE_SERVICE_ROLE_KEY` (env var padrão do Supabase edge runtime). Chama `adminClient.auth.admin.deleteUser(user_id)`.
- **D-09:** Se user_id não bate com JWT ou JWT inválido → 401. Se `admin.deleteUser` falha → grava row status='failed' e retorna 500 com erro.
- **D-10:** Após sucesso do `admin.deleteUser`, grava row audit com `status='deleted'`. Ordem: grava audit ANTES do admin.deleteUser (pra não perder rastro se admin.deleteUser falhar parcialmente).

### Scope guards
- **D-11:** NÃO mexer em outras tabelas. NÃO criar `deleted_at` em `profiles`. NÃO deletar rows de `profiles` manualmente — deixar a cascata ou triggers do DB cuidar.
- **D-12:** NÃO adicionar biometria ou OTP de confirmação. Só a dupla confirmação de UI.

### Claude's Discretion
- **D-13:** Formato do body JSON da edge function — Claude decide (provavelmente `{ success: boolean, request_id?: string, error?: string }`).
- **D-14:** Texto exato das mensagens de Alert — Claude refina seguindo o espírito de D-04 e D-06.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap & Requirements
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md` §APPLE-01
- `.planning/ROADMAP.md` §"Phase 4: Apple 5.1.1(v) In-app Deletion"

### Codebase — a alterar
- `src/screens/AccountScreen.tsx` L200-252 — substituir fluxo mailto por edge function invoke + dupla confirmação

### Codebase — consulta
- `src/lib/supabase.ts` — client padrão já tem `auth.signOut` e `functions.invoke`
- `src/contexts/AuthContext.tsx:148-188` — signOut já limpa reminders + clearOwnerUserId (NOTIF-01)

### Supabase
- Projeto: `gwibmimaquoesgpbdojo` (criahub)
- Edge functions existentes: `automation-reproduction`, `send-notification`, `create-collaborator` (verify_jwt: false — padrão usado)
- Nova edge function `delete-account` vai ser **verify_jwt: true** por segurança.

### Commit 4b3eac1
- Rollback do primeiro attempt de exclusão — estado atual do AccountScreen é pós-rollback.

</canonical_refs>

<code_context>
### Established Patterns
- Edge functions existentes no projeto usam Deno runtime padrão do Supabase.
- Client invoke: `supabase.functions.invoke<T>("function-name", { body, headers? })` — token JWT propagado automaticamente quando o supabase-js tem sessão ativa.
- Alerts com `Alert.alert(title, message, buttons)` já é padrão no `AccountScreen` (usado no mailto flow).

### Integration Points
- `AccountScreen.tsx:208-252` — bloco do `AppButton label="Solicitar exclusão da conta" variant="danger"`. Substituir `onPress` inteiro.
- `supabase.functions.invoke("delete-account")` — endpoint que vamos expor.
- `signOut()` de `useAuth` (já instanciado no componente) — chamar após sucesso do delete.

</code_context>

<specifics>
## Specific Ideas

### Migration SQL
```sql
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'deleted'
);

CREATE INDEX idx_account_deletion_requests_user_id
  ON public.account_deletion_requests (user_id);

CREATE INDEX idx_account_deletion_requests_requested_at
  ON public.account_deletion_requests (requested_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_deletion_request"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.account_deletion_requests IS
  'Apple 5.1.1(v) audit trail de exclusões de conta. Rows gravadas pela edge function delete-account; service_role tem acesso total; usuário autenticado só lê próprias rows (pouco provável — auth.users já foi deletado).';
```

### Edge function `delete-account/index.ts`
```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_METHODS = new Set(["POST", "OPTIONS"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ALLOWED_METHODS.has(req.method)) {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing_authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userJwt = authHeader.slice(7);
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(userJwt);

  if (userError || !user) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }

  // Grava audit ANTES do delete — se o delete falhar parcialmente, rastro existe.
  const { error: auditError } = await adminClient
    .from("account_deletion_requests")
    .insert({
      user_id: user.id,
      email: user.email ?? "(sem email)",
      status: "deleted",
    });

  if (auditError) {
    return jsonResponse({ error: "audit_failed", details: auditError.message }, 500);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    // Marca audit como falha pra investigação manual.
    await adminClient
      .from("account_deletion_requests")
      .update({ status: "failed" })
      .eq("user_id", user.id)
      .eq("status", "deleted")
      .is("requested_at", null);
    return jsonResponse({ error: "delete_failed", details: deleteError.message }, 500);
  }

  return jsonResponse({ success: true });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
```

### Client (AccountScreen patch)
Substituir o `onPress` do `AppButton label="Solicitar exclusão da conta"` inteiro:

```tsx
onPress={() => {
  Alert.alert(
    "Excluir conta?",
    "Esta ação remove permanentemente sua conta e todos os dados vinculados. Você não conseguirá mais acessar o CriaHub com este email.",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Continuar",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Tem certeza?",
            "Última confirmação. Após tocar em \"Excluir minha conta\" a exclusão é processada e você será deslogado.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Excluir minha conta",
                style: "destructive",
                onPress: async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke<{
                      success?: boolean;
                      error?: string;
                    }>("delete-account", {
                      method: "POST",
                    });

                    if (error || !data?.success) {
                      const message =
                        error?.message ??
                        data?.error ??
                        "Não foi possível excluir agora.";
                      Alert.alert(
                        "Erro ao excluir conta",
                        `${message}\n\nSe o problema persistir, escreva pra suporte@criahub.com.br.`
                      );
                      return;
                    }

                    Alert.alert(
                      "Conta excluída",
                      "Seu acesso foi encerrado. Se precisar de algo, escreva pra suporte@criahub.com.br."
                    );
                    await signOut();
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Erro inesperado.";
                    Alert.alert(
                      "Erro ao excluir conta",
                      `${message}\n\nSe o problema persistir, escreva pra suporte@criahub.com.br.`
                    );
                  }
                },
              },
            ]
          );
        },
      },
    ]
  );
}}
```

</specifics>

<deferred>
## Deferred Ideas

- Grace period com cancelamento self-service → milestone futuro
- Worker pg_cron pra hard-delete agendado em N dias → quando houver retenção regulatória obrigatória
- Soft-delete de `profiles` com `deleted_at` + redirect na auth → Phase 5/6 se virar requisito
- Biometria/OTP antes de confirmar → fora de escopo bug bash
- Tela dedicada de Suporte → futuro milestone
- Export de dados antes da exclusão (GDPR / LGPD art. 18-V) → milestone compliance próprio

</deferred>

---

*Phase: 04-apple-account-deletion*
*Context gathered: 2026-04-17*
