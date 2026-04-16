import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@criahub:vet-offline-queue";
const LAST_SYNC_KEY = "@criahub:vet-offline-last-sync";

export const MAX_VET_RETRIES = 10;

export type VeterinaryOfflineActionType =
  | "create_reproductive_exam"
  | "create_breeding_event"
  | "create_health_batch"
  | "add_semen_entry"
  | "complete_task"
  | "register_lavage_outcome"
  | "create_treatment";

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

export interface VeterinaryMutationResult {
  synced: boolean;
  message: string;
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

const VALID_VET_ACTION_TYPES: VeterinaryOfflineActionType[] = [
  "create_reproductive_exam",
  "create_breeding_event",
  "create_health_batch",
  "add_semen_entry",
  "complete_task",
  "register_lavage_outcome",
  "create_treatment",
];

function createActionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeVeterinaryQueueItem(raw: unknown): VeterinaryOfflineAction | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== "string") return null;
  if (!VALID_VET_ACTION_TYPES.includes(obj.type as VeterinaryOfflineActionType)) return null;

  const payload =
    obj.payload && typeof obj.payload === "object" && !Array.isArray(obj.payload)
      ? (obj.payload as Record<string, any>)
      : {};

  return {
    id: typeof obj.id === "string" ? obj.id : createActionId(),
    type: obj.type as VeterinaryOfflineActionType,
    payload,
    created_at: typeof obj.created_at === "string" ? obj.created_at : new Date().toISOString(),
    retry_count:
      typeof obj.retry_count === "number" && obj.retry_count >= 0 ? obj.retry_count : 0,
    last_error: typeof obj.last_error === "string" ? obj.last_error : null,
    last_attempt_at: typeof obj.last_attempt_at === "string" ? obj.last_attempt_at : null,
    next_retry_at: typeof obj.next_retry_at === "string" ? obj.next_retry_at : null,
    dead: obj.dead === true,
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

export async function readVeterinaryOfflineQueue() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [] as VeterinaryOfflineAction[];

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

export async function writeVeterinaryOfflineQueue(items: VeterinaryOfflineAction[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function readVeterinaryLastSync() {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  if (!raw) {
    return {
      last_sync_at: null,
      last_sync_result: null,
      last_sync_message: null,
    } as Omit<VeterinarySyncSnapshot, "pending_count" | "oldest_pending_at">;
  }

  try {
    const parsed = JSON.parse(raw) as Omit<VeterinarySyncSnapshot, "pending_count" | "oldest_pending_at">;
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

export async function writeVeterinaryLastSync(snapshot: {
  last_sync_at: string;
  last_sync_result: "success" | "partial" | "error";
  last_sync_message: string;
}) {
  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(snapshot));
}

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

export async function enqueueVeterinaryOfflineAction(
  type: VeterinaryOfflineActionType,
  payload: Record<string, any>
) {
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

export async function clearDeadVeterinaryActions(): Promise<number> {
  const queue = await readVeterinaryOfflineQueue();
  const alive = queue.filter((item) => item.dead !== true);
  const removed = queue.length - alive.length;
  if (removed > 0) {
    await writeVeterinaryOfflineQueue(alive);
  }
  return removed;
}
