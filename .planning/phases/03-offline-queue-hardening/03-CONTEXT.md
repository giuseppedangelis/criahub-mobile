# Phase 3: Offline Queue Hardening - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Duas mudanças P0 em filas offline do app, que hoje podem perder dados críticos (partos) ou travar com itens envenenados:

1. **OFFLINE-01** — Fila de `field-offline` passa a tolerar dois partos legítimos (gêmeos, dupla ovulação) da mesma égua em janela curta. Hoje o fingerprint `mare_id + photo_uri` em janela de 2min derruba o segundo quando as fotos são iguais ou ausentes.
2. **OFFLINE-02** — Ambas filas (`field-offline` e `veterinary-offline`) ganham `max_retries=10` + flag `dead: true` para isolar itens envenenados. Snapshot passa a expor `dead_count`. UI ganha botão "Descartar falhas permanentes" quando `dead_count > 0`. Paridade entre vet e field (vet hoje está atrás — não tem retry_count, backoff, nem last_error).

Fora de escopo:
- Background sync com `expo-background-fetch` (OFFLINE-03 → Phase 5).
- Optimistic concurrency via `updated_at` no flush (OFFLINE-04 → Phase 5).
- Banner global offline fora do FieldHomeScreen (OFFLINE-05 → Phase 6).
- UI rica listando cada item dead individualmente com "Tentar agora" — esta fase só expõe o contador + botão "descartar tudo".
- Export/download da fila dead para suporte — requer tela de Suporte que ainda não existe (pode aparecer com APPLE-01 em Phase 4 ou Phase 5).

</domain>

<decisions>
## Implementation Decisions

### OFFLINE-01 — Dedup fingerprint em field-offline

- **D-01:** Adicionar bucket de tempo (minuto) ao fingerprint. `buildFieldActionFingerprint` passa a incluir `created_at_minute` (o `created_at` truncado ao minuto, no formato `YYYY-MM-DDTHH:MM`). Assinatura atual de `buildFieldActionFingerprint(type, payload)` ganha um terceiro arg `createdAtIso: string`.
- **D-02:** `enqueueFieldOfflineAction` passa `new Date(now).toISOString()` como o `createdAtIso`. Double-taps dentro do mesmo minuto dedupificam (mesmo fingerprint); partos de gêmeos com >1min de separação não dedupificam (fingerprints diferentes pelo bucket de minuto).
- **D-03:** `DEDUP_WINDOW_MS` permanece em 2 minutos (a janela de comparação). A mudança é só no fingerprint — dois itens idênticos no mesmo minuto dedupificam dentro da janela; em minutos diferentes não.
- **D-04:** A função `normalizeQueueItem`, que reconstrói fingerprint de queue persistida sem `fingerprint` armazenado, também recebe o `created_at` e passa pra `buildFieldActionFingerprint`. Se item legacy não tem `created_at`, fallback para `new Date().toISOString()` (não dedupa com nada histórico, OK).

### OFFLINE-02 — Retry cap + dead flag (field)

- **D-05:** `FieldOfflineAction` ganha campo opcional `dead?: boolean`. Ausente ou `false` = item vivo; `true` = excedeu `MAX_RETRIES` e nunca mais será tentado.
- **D-06:** `MAX_RETRIES = 10` constante no topo de `field-offline.ts` (exportada). Definida ali para ser reusada em helpers de snapshot/UI.
- **D-07:** `toQueueFailureItem` em `src/services/field.ts` passa a marcar `dead: true` se `retryCount >= MAX_RETRIES` (ou seja, se o incremento atingir ou passar o cap). Quando `dead=true`, não atualiza `next_retry_at` (vira `null`) e mantém o `last_error` como último.
- **D-08:** Flush loop em `src/services/field.ts` (~L383-399) passa a **skippar itens dead** no início do loop (análogo ao skip atual de `next_retry_at > now`). Itens dead permanecem no `remaining` sem serem tentados.
- **D-09:** `FieldSyncSnapshot` ganha campo `dead_count: number`. `getFieldSyncSnapshot` em `field-offline.ts` calcula `dead_count = queue.filter(item => item.dead === true).length`. `failed_count` existente (contagem de itens com retry_count>0 ou last_error) permanece — dead é subconjunto de failed.
- **D-10:** Nova função exportada em `field-offline.ts`: `clearDeadFieldActions(): Promise<number>` — lê queue, filtra out os `dead`, escreve queue, retorna `removed_count`. Não toca itens vivos.

### OFFLINE-02 — Retry cap + dead flag (vet) + paridade

- **D-11:** `VeterinaryOfflineAction` ganha os mesmos campos que `FieldOfflineAction`: `retry_count: number`, `last_error: string | null`, `last_attempt_at: string | null`, `next_retry_at: string | null`, `dead?: boolean`. Todos com defaults sensatos no `normalizeVeterinaryQueueItem` (novo helper, espelhado de `normalizeQueueItem` do field).
- **D-12:** `readVeterinaryOfflineQueue` passa a rodar normalização em cada item (igual field faz). Itens legacy sem os campos novos recebem `retry_count: 0`, `last_error: null`, etc. Compat garantida.
- **D-13:** `VeterinarySyncSnapshot` ganha os campos: `failed_count: number`, `dead_count: number`, `max_retry_count: number`, `next_retry_at: string | null`, `last_error: string | null` — espelho de `FieldSyncSnapshot`. O `last_sync_*` existente permanece.
- **D-14:** Flush loop em `src/services/veterinary.ts` (L639-659) passa a:
  - Skippar itens dead no início.
  - Skippar itens com `next_retry_at > now`.
  - Em caso de erro: chamar `toVetQueueFailureItem` (novo helper inline ou em veterinary-offline.ts, que espelha `toQueueFailureItem` do field.ts). Incrementa retry_count, calcula backoff (`buildRetryAtIso`), marca dead se cap atingido.
- **D-15:** `buildRetryAtIso` é duplicado em ambas filas por enquanto (mesma fórmula exponencial: `Math.min(15*60, 30 * 2**(retryCount-1))` segundos). Extração para um `src/services/offline-retry.ts` compartilhado é tentadora mas fica como deferred (Phase 5/6 refactor) — esta fase prioriza atomicidade e rollback isolado.
- **D-16:** Nova função exportada em `veterinary-offline.ts`: `clearDeadVeterinaryActions(): Promise<number>`. Paridade com `clearDeadFieldActions`.

### UI exposure

- **D-17:** `FieldHomeScreen.tsx` (~L565-573) ganha um bloco condicional abaixo do `Falhas para retentar`: se `syncQuery.data?.dead_count > 0`, mostra `AppButton variant="ghost" label="Descartar {N} falha(s) permanente(s)"` com `onPress={async () => { await clearDeadFieldActions(); await syncQuery.refetch(); }}`. Confirma via `Alert.alert` antes.
- **D-18:** `VeterinaryScreen.tsx` ganha o bloco equivalente onde o sync snapshot é mostrado (procurar usage de `syncSnapshotQuery` em L79+). Mesma UX.
- **D-19:** Nenhuma tela nova. Nenhuma lista individual dos dead items. Se o usuário quiser recuperar, precisa acionar suporte — fluxo de suporte fica pra fase posterior (provavelmente APPLE-01 em Phase 4 cria a seção de Conta → Suporte).

### Hooks & Service exposure

- **D-20:** `fieldService` (`src/services/field.ts`) passa a exportar `clearDeadActions()` que chama `clearDeadFieldActions()` do field-offline. `veterinaryService` idem. As telas consomem via service singleton, não via função solta — consistência com o resto do codebase.
- **D-21:** `useField` e `useVeterinary` hooks ganham `clearDeadMutation` — mutation que chama `service.clearDeadActions()` e invalida `syncSnapshotQuery`. Opcional: pode ser chamada direta via `await` sem mutation; mutation é mais idiomático com TanStack Query.

### Claude's Discretion

- **D-22:** Formato exato da mensagem do `Alert.alert` de confirmação — Claude decide. Sugestão: "Descartar {N} falha(s) permanente(s)? Itens que não puderam ser sincronizados após 10 tentativas serão removidos do app. Esta ação não pode ser desfeita."
- **D-23:** Ordem dos campos adicionados na interface — Claude decide lexicamente/semanticamente (ex.: `dead` perto de `retry_count`).
- **D-24:** Logging de debug durante desenvolvimento — Claude decide se adiciona `console.warn` em pontos críticos (ex.: quando item vira dead). Cleanup antes do commit final.

### Folded Todos

(Nenhum)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/PROJECT.md` — contexto (offline-first no campo é crítico)
- `.planning/REQUIREMENTS.md` §OFFLINE-01, §OFFLINE-02
- `.planning/ROADMAP.md` §"Phase 3: Offline Queue Hardening"
- `.planning/phases/02-rls-haras-scope/02-CONTEXT.md` — só pra padrão de commits e scope guard aprendidos

### Codebase — arquivos alterados
- `src/services/field-offline.ts` — fingerprint com bucket de minuto (OFFLINE-01); `dead` field, `MAX_RETRIES`, `dead_count`, `clearDeadFieldActions` (OFFLINE-02)
- `src/services/field.ts` — `toQueueFailureItem` seta `dead: true` quando cap atingido; flush loop skippa dead (OFFLINE-02)
- `src/services/veterinary-offline.ts` — paridade: `retry_count`, `last_error`, `last_attempt_at`, `next_retry_at`, `dead`, `normalizeVeterinaryQueueItem`, `clearDeadVeterinaryActions`, snapshot estendido (OFFLINE-02)
- `src/services/veterinary.ts` — flush loop (L639-659) com retry cap, backoff e dead (OFFLINE-02); `toVetQueueFailureItem` helper; `veterinaryService.clearDeadActions` (OFFLINE-02)
- `src/screens/FieldHomeScreen.tsx` (~L565-573) — botão condicional "Descartar falhas permanentes"
- `src/screens/VeterinaryScreen.tsx` — mesmo bloco no slot de sync snapshot
- `src/hooks/useField.ts` — `useFieldClearDeadMutation` (opcional)
- `src/hooks/useVeterinary.ts` — `useVeterinaryClearDeadMutation` (opcional)

### Codebase — consulta
- `src/services/field-offline.ts:5,50-63` — fingerprint atual (`DEDUP_WINDOW_MS`, `buildFieldActionFingerprint`)
- `src/services/field.ts:33-48,383-399` — `buildRetryAtIso`, `toQueueFailureItem`, flush loop. **Template pra vet replicar.**
- `src/services/veterinary-offline.ts` — estado atual (sem retry/dead). **Alvo da paridade.**
- `src/services/veterinary.ts:625-675` — flush loop atual.
- `src/screens/FieldHomeScreen.tsx:565-573` — UI atual de sync.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`buildRetryAtIso` em `field.ts:33`** — fórmula de backoff exponencial (`Math.min(15*60, 30 * 2**(retryCount-1))`). Vet vai duplicar (D-15).
- **`toQueueFailureItem` em `field.ts:38`** — template pra `toVetQueueFailureItem`. Muda `retry_count += 1`, `last_error`, `last_attempt_at`, `next_retry_at`, e (novo) `dead` quando cap atingido.
- **`normalizeQueueItem` em `field-offline.ts:65`** — template pra `normalizeVeterinaryQueueItem`.
- **`FieldHomeScreen` sync block L565-573** — UI template que vet replica.
- **AppButton `variant="ghost"`** — padrão já usado em outros lugares para ações destrutivas secundárias.

### Established Patterns
- **Offline queue = AsyncStorage único por feature** — `@criahub:field-offline-queue` e `@criahub:vet-offline-queue`. Não criar nova key pra dead (D-03 escolhida no discuss).
- **Service exporta função puro + singleton** — `field.ts` exporta `fieldService = { ... }`. Vet mesma coisa.
- **Hooks em `src/hooks/use*.ts`** — wrappers de TanStack Query. Mutations invalidam queryKeys apropriadas.
- **Snapshot é a API pública do status** — telas consomem `syncSnapshotQuery.data?.campo`. Adicionar `dead_count` ao snapshot é o canal certo.

### Integration Points
- **`FieldHomeScreen.tsx:565-573`** — sync panel existente. Adicionar bloco depois de "Falhas para retentar" com `dead_count > 0 && <AppButton ... />`.
- **`VeterinaryScreen.tsx:79`** — `syncSnapshotQuery`. Precisa procurar onde renderiza e espelhar o bloco.
- **`useField` / `useVeterinary` hooks** — onde adicionar as mutations, se for a estratégia (D-21 deixa opcional).

### Escopo do diff
Estimativa: 4-5 arquivos com ~80-120 linhas de diff. Zero arquivos novos (a menos que `offline-retry.ts` compartilhado seja escolhido, deferred em D-15). Zero pacotes novos.

</code_context>

<specifics>
## Specific Ideas

### OFFLINE-01 — fingerprint com bucket de minuto

```ts
// field-offline.ts
function bucketToMinute(isoTimestamp: string): string {
  // Trunca "2026-04-16T14:23:45.678Z" → "2026-04-16T14:23"
  return isoTimestamp.slice(0, 16);
}

export function buildFieldActionFingerprint(
  type: FieldOfflineActionType,
  payload: Record<string, unknown>,
  createdAtIso: string,
) {
  const normalized = {
    type,
    haras_id: typeof payload.haras_id === "string" ? payload.haras_id : null,
    created_by: typeof payload.created_by === "string" ? payload.created_by : null,
    mare_id: typeof payload.mare_id === "string" ? payload.mare_id : null,
    animal_id: typeof payload.animal_id === "string" ? payload.animal_id : null,
    issue_kind: typeof payload.issue_kind === "string" ? payload.issue_kind : null,
    foal_sex: typeof payload.foal_sex === "string" ? payload.foal_sex : null,
    note: typeof payload.note === "string" ? payload.note.trim() : null,
    photo_uri: typeof payload.photo_uri === "string" ? payload.photo_uri : null,
    created_at_minute: bucketToMinute(createdAtIso),
  };
  return stableJson(normalized);
}
```

`enqueueFieldOfflineAction` e `normalizeQueueItem` passam a propagar `createdAtIso`.

### OFFLINE-02 — MAX_RETRIES + dead flag (field)

```ts
// field-offline.ts
export const MAX_RETRIES = 10;

export interface FieldOfflineAction {
  id: string;
  type: FieldOfflineActionType;
  payload: Record<string, unknown>;
  fingerprint: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  dead?: boolean; // novo — true quando retry_count >= MAX_RETRIES
}

export async function clearDeadFieldActions(): Promise<number> {
  const queue = await readFieldOfflineQueue();
  const alive = queue.filter((item) => !item.dead);
  await writeFieldOfflineQueue(alive);
  return queue.length - alive.length;
}

// getFieldSyncSnapshot — adicionar dead_count no retorno:
const deadCount = queue.filter((item) => item.dead === true).length;
// ... no return: dead_count: deadCount,
```

```ts
// field.ts — toQueueFailureItem muda:
import { MAX_RETRIES } from "@/src/services/field-offline";

function toQueueFailureItem(item: FieldOfflineAction, error: unknown): FieldOfflineAction {
  const message = error instanceof Error ? error.message : "Erro ao sincronizar ação offline.";
  const retryCount = (item.retry_count ?? 0) + 1;
  const isDead = retryCount >= MAX_RETRIES;
  return {
    ...item,
    retry_count: retryCount,
    last_error: message,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: isDead ? null : buildRetryAtIso(retryCount),
    dead: isDead ? true : item.dead,
  };
}
```

```ts
// field.ts flush loop — skip dead:
for (const item of queue) {
  if (item.dead) {
    remaining.push(item);
    continue;
  }
  if (item.next_retry_at && new Date(item.next_retry_at).getTime() > Date.now()) {
    remaining.push(item);
    skippedByBackoff += 1;
    continue;
  }
  // ... resto igual
}
```

### OFFLINE-02 — Vet paridade

```ts
// veterinary-offline.ts
export const MAX_VET_RETRIES = 10;

export interface VeterinaryOfflineAction {
  id: string;
  type: VeterinaryOfflineActionType;
  payload: Record<string, any>;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  dead?: boolean;
}

export interface VeterinarySyncSnapshot {
  pending_count: number;
  oldest_pending_at: string | null;
  failed_count: number;
  dead_count: number;
  max_retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  last_sync_at: string | null;
  last_sync_result: "success" | "partial" | "error" | null;
  last_sync_message: string | null;
}

function normalizeVeterinaryQueueItem(raw: any): VeterinaryOfflineAction | null {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.type || typeof raw.type !== "string") return null;
  return {
    id: typeof raw.id === "string" ? raw.id : createActionId(),
    type: raw.type as VeterinaryOfflineActionType,
    payload: raw.payload && typeof raw.payload === "object" ? raw.payload : {},
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
    retry_count: typeof raw.retry_count === "number" && raw.retry_count >= 0 ? raw.retry_count : 0,
    last_error: typeof raw.last_error === "string" ? raw.last_error : null,
    last_attempt_at: typeof raw.last_attempt_at === "string" ? raw.last_attempt_at : null,
    next_retry_at: typeof raw.next_retry_at === "string" ? raw.next_retry_at : null,
    dead: raw.dead === true,
  };
}

// readVeterinaryOfflineQueue passa a mapear por normalizeVeterinaryQueueItem:
export async function readVeterinaryOfflineQueue(): Promise<VeterinaryOfflineAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeVeterinaryQueueItem(item))
      .filter((item): item is VeterinaryOfflineAction => item !== null);
  } catch {
    return [];
  }
}

// enqueueVeterinaryOfflineAction inicializa campos novos:
export async function enqueueVeterinaryOfflineAction(
  type: VeterinaryOfflineActionType,
  payload: Record<string, any>,
): Promise<void> {
  const queue = await readVeterinaryOfflineQueue();
  queue.push({
    id: createActionId(),
    type,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
    last_attempt_at: null,
    next_retry_at: null,
    dead: false,
  });
  await writeVeterinaryOfflineQueue(queue);
}

// getVeterinarySyncSnapshot estendido:
export async function getVeterinarySyncSnapshot(): Promise<VeterinarySyncSnapshot> {
  const queue = await readVeterinaryOfflineQueue();
  const last = await readVeterinaryLastSync();

  const failedItems = queue.filter((item) => item.retry_count > 0 || Boolean(item.last_error));
  const deadCount = queue.filter((item) => item.dead === true).length;
  const nextRetryAt = queue
    .map((item) => item.next_retry_at)
    .filter((item): item is string => Boolean(item))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
  const lastErrorItem = [...failedItems]
    .sort((a, b) => {
      const timeA = new Date(a.last_attempt_at || a.created_at).getTime();
      const timeB = new Date(b.last_attempt_at || b.created_at).getTime();
      return timeB - timeA;
    })[0] ?? null;

  return {
    pending_count: queue.length,
    oldest_pending_at: queue.length > 0 ? queue[0].created_at : null,
    failed_count: failedItems.length,
    dead_count: deadCount,
    max_retry_count: queue.reduce((acc, item) => Math.max(acc, item.retry_count), 0),
    next_retry_at: nextRetryAt,
    last_error: lastErrorItem?.last_error ?? null,
    last_sync_at: last.last_sync_at,
    last_sync_result: last.last_sync_result,
    last_sync_message: last.last_sync_message,
  };
}

export async function clearDeadVeterinaryActions(): Promise<number> {
  const queue = await readVeterinaryOfflineQueue();
  const alive = queue.filter((item) => !item.dead);
  await writeVeterinaryOfflineQueue(alive);
  return queue.length - alive.length;
}
```

```ts
// veterinary.ts — helpers + flush loop:
function buildVetRetryAtIso(retryCount: number) {
  const seconds = Math.min(15 * 60, 30 * 2 ** Math.max(0, retryCount - 1));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function toVetQueueFailureItem(item: VeterinaryOfflineAction, error: unknown): VeterinaryOfflineAction {
  const message = error instanceof Error ? error.message : "Erro ao sincronizar ação offline.";
  const retryCount = (item.retry_count ?? 0) + 1;
  const isDead = retryCount >= MAX_VET_RETRIES;
  return {
    ...item,
    retry_count: retryCount,
    last_error: message,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: isDead ? null : buildVetRetryAtIso(retryCount),
    dead: isDead ? true : item.dead,
  };
}

// flush loop:
for (const item of queue) {
  if (item.dead) {
    remaining.push(item);
    continue;
  }
  if (item.next_retry_at && new Date(item.next_retry_at).getTime() > Date.now()) {
    remaining.push(item);
    continue;
  }

  try {
    if (item.type === "create_reproductive_exam") { ... }
    // ... demais casos iguais
  } catch (error) {
    remaining.push(toVetQueueFailureItem(item, error));
  }
}
```

### UI — botão de descartar dead

```tsx
// Dentro do sync panel em FieldHomeScreen (~L570) e VeterinaryScreen:
{syncQuery.data && syncQuery.data.dead_count > 0 ? (
  <AppButton
    variant="ghost"
    label={`Descartar ${syncQuery.data.dead_count} falha(s) permanente(s)`}
    onPress={() => {
      Alert.alert(
        "Descartar falhas permanentes?",
        `${syncQuery.data?.dead_count} item(ns) não puderam ser sincronizados após 10 tentativas. Esta ação remove os itens do app e não pode ser desfeita.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: async () => {
              await fieldService.clearDeadActions(); // ou veterinaryService
              await syncQuery.refetch();
            },
          },
        ],
      );
    }}
  />
) : null}
```

</specifics>

<deferred>
## Deferred Ideas

- OFFLINE-03 background-fetch a cada 15min → Phase 5
- OFFLINE-04 optimistic concurrency via updated_at → Phase 5
- OFFLINE-05 banner offline global → Phase 6
- Extração de `buildRetryAtIso` + `toQueueFailureItem` pra `src/services/offline-retry.ts` compartilhado → Phase 5/6 refactor
- UI rica listando cada item dead com "Tentar agora" individual → milestone futuro
- Export/download da fila dead para suporte → depende da seção Suporte que vem com APPLE-01 ou depois
- Telemetria de quantos itens viraram dead por dia → depende de provider de analytics

### Reviewed Todos (not folded)
(Nenhum)

</deferred>

---

*Phase: 03-offline-queue-hardening*
*Context gathered: 2026-04-16*
