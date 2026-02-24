import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@criahub:vet-offline-queue";
const LAST_SYNC_KEY = "@criahub:vet-offline-last-sync";

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
}

export interface VeterinaryMutationResult {
  synced: boolean;
  message: string;
}

export interface VeterinarySyncSnapshot {
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

export async function readVeterinaryOfflineQueue() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [] as VeterinaryOfflineAction[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VeterinaryOfflineAction[]) : [];
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
  return {
    pending_count: queue.length,
    oldest_pending_at: queue.length > 0 ? queue[0].created_at : null,
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
  });
  await writeVeterinaryOfflineQueue(queue);
}
