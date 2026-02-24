import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@criahub:field-offline-queue";
const LAST_SYNC_KEY = "@criahub:field-offline-last-sync";

export type FieldOfflineActionType = "birth_report" | "issue_report";

export interface FieldOfflineAction {
  id: string;
  type: FieldOfflineActionType;
  payload: Record<string, any>;
  created_at: string;
}

export interface FieldSyncSnapshot {
  pending_count: number;
  oldest_pending_at: string | null;
  last_sync_at: string | null;
  last_sync_result: "success" | "partial" | "error" | null;
  last_sync_message: string | null;
}

function createActionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    return Array.isArray(parsed) ? (parsed as FieldOfflineAction[]) : [];
  } catch {
    return [];
  }
}

export async function writeFieldOfflineQueue(items: FieldOfflineAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueFieldOfflineAction(type: FieldOfflineActionType, payload: Record<string, any>) {
  const queue = await readFieldOfflineQueue();
  queue.push({ id: createActionId(), type, payload, created_at: new Date().toISOString() });
  await writeFieldOfflineQueue(queue);
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
  return {
    pending_count: queue.length,
    oldest_pending_at: queue.length > 0 ? queue[0].created_at : null,
    last_sync_at: last.last_sync_at,
    last_sync_result: last.last_sync_result,
    last_sync_message: last.last_sync_message,
  };
}
