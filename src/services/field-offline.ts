import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@criahub:field-offline-queue";
const LAST_SYNC_KEY = "@criahub:field-offline-last-sync";
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

export const MAX_RETRIES = 10;

export type FieldOfflineActionType = "birth_report" | "issue_report";

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
  dead?: boolean;
}

export interface FieldSyncSnapshot {
  pending_count: number;
  pending_by_type: {
    birth_report: number;
    issue_report: number;
  };
  failed_count: number;
  dead_count: number;
  max_retry_count: number;
  oldest_pending_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  last_sync_at: string | null;
  last_sync_result: "success" | "partial" | "error" | null;
  last_sync_message: string | null;
}

function createActionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`).join(",")}}`;
}

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

/**
 * OFFLINE-04 (D-19): chave especial no payload que armazena o `updated_at` do
 * registro alvo no momento do enqueue. Quando o flush desempacotar o item,
 * comparamos este valor com o `updated_at` atual do banco; se mudou, a ação
 * vira `dead` (conflito — alguém mais alterou o registro) em vez de sobrescrever
 * estado mais novo. Só aplicado a ações que UPDATE (não INSERT).
 */
export const CONCURRENCY_UPDATED_AT_KEY = "__concurrency_updated_at";

function normalizeQueueItem(item: Partial<FieldOfflineAction> & { id?: string; type?: string }): FieldOfflineAction | null {
  if (item.type !== "birth_report" && item.type !== "issue_report") return null;
  const createdAt = item.created_at || new Date().toISOString();
  const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? (item.payload as Record<string, unknown>)
    : {};
  const fingerprint = item.fingerprint || buildFieldActionFingerprint(item.type, payload, createdAt);

  return {
    id: item.id || createActionId(),
    type: item.type,
    payload,
    fingerprint,
    created_at: createdAt,
    retry_count: typeof item.retry_count === "number" && item.retry_count >= 0 ? item.retry_count : 0,
    last_error: typeof item.last_error === "string" ? item.last_error : null,
    last_attempt_at: typeof item.last_attempt_at === "string" ? item.last_attempt_at : null,
    next_retry_at: typeof item.next_retry_at === "string" ? item.next_retry_at : null,
    dead: item.dead === true,
  };
}

export function isNetworkLikeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("offline") ||
    message.includes("timed out")
  );
}

export async function readFieldOfflineQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [] as FieldOfflineAction[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeQueueItem(item as Partial<FieldOfflineAction> & { id?: string; type?: string }))
      .filter((item): item is FieldOfflineAction => Boolean(item));
  } catch {
    return [];
  }
}

export async function writeFieldOfflineQueue(items: FieldOfflineAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueFieldOfflineAction(type: FieldOfflineActionType, payload: Record<string, unknown>) {
  const queue = await readFieldOfflineQueue();
  const now = Date.now();
  const createdAtIso = new Date(now).toISOString();
  const fingerprint = buildFieldActionFingerprint(type, payload, createdAtIso);

  const duplicated = queue.some((item) => {
    if (item.fingerprint !== fingerprint) return false;
    const createdAt = new Date(item.created_at).getTime();
    if (Number.isNaN(createdAt)) return false;
    return now - createdAt <= DEDUP_WINDOW_MS;
  });

  if (duplicated) {
    return { enqueued: false };
  }

  queue.push({
    id: createActionId(),
    type,
    payload,
    fingerprint,
    created_at: createdAtIso,
    retry_count: 0,
    last_error: null,
    last_attempt_at: null,
    next_retry_at: null,
    dead: false,
  });
  await writeFieldOfflineQueue(queue);
  return { enqueued: true };
}

export async function readFieldLastSync() {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  if (!raw) {
    return {
      last_sync_at: null,
      last_sync_result: null,
      last_sync_message: null,
    } as Omit<FieldSyncSnapshot, "pending_count" | "oldest_pending_at">;
  }

  try {
    const parsed = JSON.parse(raw) as Omit<FieldSyncSnapshot, "pending_count" | "oldest_pending_at">;
    return {
      last_sync_at: parsed.last_sync_at ?? null,
      last_sync_result: parsed.last_sync_result ?? null,
      last_sync_message: parsed.last_sync_message ?? null,
    };
  } catch {
    return {
      last_sync_at: null,
      last_sync_result: null,
      last_sync_message: null,
    };
  }
}

export async function writeFieldLastSync(snapshot: {
  last_sync_at: string;
  last_sync_result: "success" | "partial" | "error";
  last_sync_message: string;
}) {
  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(snapshot));
}

export async function getFieldSyncSnapshot(): Promise<FieldSyncSnapshot> {
  const [queue, last] = await Promise.all([readFieldOfflineQueue(), readFieldLastSync()]);
  const birthCount = queue.filter((item) => item.type === "birth_report").length;
  const issueCount = queue.filter((item) => item.type === "issue_report").length;
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
    pending_by_type: {
      birth_report: birthCount,
      issue_report: issueCount,
    },
    failed_count: failedItems.length,
    dead_count: deadCount,
    max_retry_count: queue.reduce((acc, item) => Math.max(acc, item.retry_count), 0),
    oldest_pending_at: queue.length > 0 ? queue[0].created_at : null,
    next_retry_at: nextRetryAt,
    last_error: lastErrorItem?.last_error ?? null,
    last_sync_at: last.last_sync_at,
    last_sync_result: last.last_sync_result,
    last_sync_message: last.last_sync_message,
  };
}

export async function clearDeadFieldActions(): Promise<number> {
  const queue = await readFieldOfflineQueue();
  const alive = queue.filter((item) => item.dead !== true);
  const removed = queue.length - alive.length;
  if (removed > 0) {
    await writeFieldOfflineQueue(alive);
  }
  return removed;
}
