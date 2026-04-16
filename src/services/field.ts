import NetInfo from "@react-native-community/netinfo";
import { handleSupabaseError, supabase } from "@/src/services/base";
import {
  clearDeadFieldActions,
  enqueueFieldOfflineAction,
  type FieldOfflineAction,
  getFieldSyncSnapshot,
  isNetworkLikeError,
  MAX_RETRIES,
  readFieldOfflineQueue,
  writeFieldLastSync,
  writeFieldOfflineQueue,
} from "@/src/services/field-offline";
import type {
  FieldBirthInput,
  FieldIssueInput,
  FieldPendingValidationItem,
  FieldPendingValidationStatus,
  FieldPendingValidationType,
} from "@/src/types/domain";

export interface FieldMutationResult {
  synced: boolean;
  delivery: "synced" | "queued_offline";
  message: string;
}

export interface FieldFlushResult {
  total: number;
  synced: number;
  remaining: number;
  skipped_by_backoff: number;
}

function buildRetryAtIso(retryCount: number) {
  const seconds = Math.min(15 * 60, 30 * 2 ** Math.max(0, retryCount - 1));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

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

async function ensureOnline() {
  const state = await NetInfo.fetch();
  if (state.isConnected === false) throw new Error("offline");
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

async function uploadPhoto(uri: string, harasId: string, folder: "birth" | "issue") {
  const fileName = `${Date.now()}_${sanitizeFileName(folder)}.jpg`;
  const path = `${harasId}/pending-validations/${folder}/${fileName}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from("animal-photos").upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });

  if (error) handleSupabaseError(error);

  const { data } = supabase.storage.from("animal-photos").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Erro ao obter URL da foto enviada.");
  return data.publicUrl;
}

async function executeBirthReport(payload: FieldBirthInput) {
  const photoUrl = await uploadPhoto(payload.photo_uri, payload.haras_id, "birth");

  const { error } = await supabase.from("pending_validations").insert({
    haras_id: payload.haras_id,
    type: "nascimento",
    status: "pendente",
    created_by: payload.created_by ?? null,
    data: {
      fieldData: {
        photo: photoUrl,
        motherName: payload.mare_name,
        motherId: payload.mare_id,
        unknownMother: payload.unknown_mare,
        provisionalSex: payload.foal_sex,
        observations: payload.note,
        audioUrl: payload.audio_url ?? null,
        reportedDate: new Date().toISOString(),
        reportedBy: payload.reported_by,
        location: payload.gps
          ? `${payload.gps.latitude.toFixed(6)}, ${payload.gps.longitude.toFixed(6)}`
          : "Não informado",
      },
      gps: payload.gps ?? null,
    },
  });

  if (error) handleSupabaseError(error);
}

async function executeIssueReport(payload: FieldIssueInput) {
  const photoUrl = payload.photo_uri
    ? await uploadPhoto(payload.photo_uri, payload.haras_id, "issue")
    : null;

  const { error } = await supabase.from("pending_validations").insert({
    haras_id: payload.haras_id,
    type: "ocorrencia",
    status: "pendente",
    created_by: payload.created_by ?? null,
    data: {
      fieldData: {
        photos: photoUrl ? [photoUrl] : [],
        animalName: payload.animal_name,
        animalId: payload.animal_id,
        occurrenceType: payload.issue_kind,
        severity: "Média",
        description: payload.note,
        audioUrl: payload.audio_url ?? null,
        reportedDate: new Date().toISOString(),
        reportedBy: payload.reported_by,
        location: payload.gps
          ? `${payload.gps.latitude.toFixed(6)}, ${payload.gps.longitude.toFixed(6)}`
          : "Não informado",
      },
      gps: payload.gps ?? null,
    },
  });

  if (error) handleSupabaseError(error);
}

async function withOfflineFallback(
  type: "birth_report" | "issue_report",
  payload: object,
  executor: () => Promise<void>,
  successMessage: string
): Promise<FieldMutationResult> {
  try {
    await ensureOnline();
    await executor();
    return {
      synced: true,
      delivery: "synced",
      message: `${successMessage} Confira em Minhas pendências.`,
    };
  } catch (error) {
    if (isNetworkLikeError(error)) {
      await enqueueFieldOfflineAction(type, payload as Record<string, unknown>);
      return {
        synced: false,
        delivery: "queued_offline",
        message: "Salvo no celular. Entrou na fila e aparecerá em Minhas pendências.",
      };
    }
    throw error;
  }
}

function normalizeStatus(statusRaw: string | null): FieldPendingValidationStatus {
  const normalized = (statusRaw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (!normalized || normalized.includes("pend")) return "pendente";
  if (normalized.includes("anal") || normalized.includes("andamento")) return "em_analise";
  if (normalized.includes("aprov") || normalized.includes("oficial") || normalized.includes("valid")) {
    return "aprovado";
  }
  if (normalized.includes("correc") || normalized.includes("ajuste") || normalized.includes("devol")) {
    return "correcao_solicitada";
  }
  if (normalized.includes("rejeit") || normalized.includes("recus")) return "rejeitado";
  return "desconhecido";
}

function mapPendingType(value: unknown): FieldPendingValidationType {
  return value === "nascimento" ? "nascimento" : "ocorrencia";
}

function parseFieldData(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybeFieldData = (value as { fieldData?: unknown }).fieldData;
    if (maybeFieldData && typeof maybeFieldData === "object" && !Array.isArray(maybeFieldData)) {
      return maybeFieldData as Record<string, unknown>;
    }
  }
  return {};
}

function parsePhotos(fieldData: Record<string, unknown>) {
  const photos = Array.isArray(fieldData.photos)
    ? fieldData.photos.filter((item): item is string => typeof item === "string")
    : [];
  if (photos.length > 0) return photos;
  const photo = fieldData.photo;
  return typeof photo === "string" && photo ? [photo] : [];
}

function mapRemotePendingValidation(row: {
  id: string;
  haras_id: string;
  type: string;
  status: string | null;
  validation_notes: string | null;
  created_by: string | null;
  created_at: string;
  data: unknown;
}): FieldPendingValidationItem {
  const fieldData = parseFieldData(row.data);
  const type = mapPendingType(row.type);

  const descriptionRaw = fieldData.observations ?? fieldData.description;

  return {
    id: row.id,
    source: "remote",
    haras_id: row.haras_id,
    created_by: row.created_by,
    created_at: row.created_at,
    type,
    status_raw: row.status,
    status: normalizeStatus(row.status),
    validation_notes: row.validation_notes,
    reported_by: typeof fieldData.reportedBy === "string" ? fieldData.reportedBy : null,
    occurred_at: typeof fieldData.reportedDate === "string" ? fieldData.reportedDate : null,
    location: typeof fieldData.location === "string" ? fieldData.location : null,
    animal_name: typeof fieldData.animalName === "string" ? fieldData.animalName : null,
    mare_name: typeof fieldData.motherName === "string" ? fieldData.motherName : null,
    description: typeof descriptionRaw === "string" ? descriptionRaw : null,
    photos: parsePhotos(fieldData),
  };
}

function mapOfflinePendingValidation(
  item: FieldOfflineAction,
  harasId: string,
  userId: string
): FieldPendingValidationItem | null {
  const payload = item.payload;
  if (!payload || typeof payload !== "object") return null;

  const payloadHarasId = (payload as { haras_id?: unknown }).haras_id;
  const payloadCreatedBy = (payload as { created_by?: unknown }).created_by;

  if (payloadHarasId !== harasId || payloadCreatedBy !== userId) return null;

  const type: FieldPendingValidationType = item.type === "birth_report" ? "nascimento" : "ocorrencia";
  const note = (payload as { note?: unknown }).note;
  const gps = (payload as { gps?: { latitude?: unknown; longitude?: unknown } | null }).gps;
  const location =
    gps && typeof gps.latitude === "number" && typeof gps.longitude === "number"
      ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`
      : null;

  const photoUri = (payload as { photo_uri?: unknown }).photo_uri;

  return {
    id: `offline-${item.id}`,
    source: "offline",
    haras_id: harasId,
    created_by: userId,
    created_at: item.created_at,
    type,
    status_raw: "pendente_offline",
    status: "pendente",
    validation_notes: null,
    reported_by: typeof (payload as { reported_by?: unknown }).reported_by === "string"
      ? ((payload as { reported_by?: string }).reported_by ?? null)
      : null,
    occurred_at: item.created_at,
    location,
    animal_name:
      typeof (payload as { animal_name?: unknown }).animal_name === "string"
        ? ((payload as { animal_name?: string }).animal_name ?? null)
        : null,
    mare_name:
      typeof (payload as { mare_name?: unknown }).mare_name === "string"
        ? ((payload as { mare_name?: string }).mare_name ?? null)
        : null,
    description: typeof note === "string" ? note : null,
    photos: typeof photoUri === "string" && photoUri ? [photoUri] : [],
  };
}

export const fieldService = {
  reportBirth(payload: FieldBirthInput) {
    return withOfflineFallback(
      "birth_report",
      payload,
      () => executeBirthReport(payload),
      "Enviado! O escritório já recebeu."
    );
  },

  reportIssue(payload: FieldIssueInput) {
    return withOfflineFallback(
      "issue_report",
      payload,
      () => executeIssueReport(payload),
      "Enviado! O escritório já recebeu."
    );
  },

  getSyncSnapshot() {
    return getFieldSyncSnapshot();
  },

  async listMyPendingValidations(harasId: string, userId: string): Promise<FieldPendingValidationItem[]> {
    const [{ data, error }, offlineQueue] = await Promise.all([
      supabase
        .from("pending_validations")
        .select("id, haras_id, type, status, validation_notes, created_by, created_at, data")
        .eq("haras_id", harasId)
        .eq("created_by", userId)
        .in("type", ["nascimento", "ocorrencia"])
        .order("created_at", { ascending: false })
        .limit(80),
      readFieldOfflineQueue(),
    ]);

    if (error) handleSupabaseError(error);

    const remoteItems = (data ?? []).map((row) =>
      mapRemotePendingValidation({
        id: row.id,
        haras_id: row.haras_id,
        type: row.type,
        status: row.status,
        validation_notes: row.validation_notes,
        created_by: row.created_by,
        created_at: row.created_at,
        data: row.data,
      })
    );

    const offlineItems = offlineQueue
      .map((item) => mapOfflinePendingValidation(item, harasId, userId))
      .filter((item): item is FieldPendingValidationItem => Boolean(item));

    return [...offlineItems, ...remoteItems].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  },

  async flushOfflineQueue(): Promise<FieldFlushResult> {
    await ensureOnline();
    const queue = await readFieldOfflineQueue();

    if (queue.length === 0) {
      await writeFieldLastSync({
        last_sync_at: new Date().toISOString(),
        last_sync_result: "success",
        last_sync_message: "Sem registros pendentes para sincronizar.",
      });
      return {
        total: 0,
        synced: 0,
        remaining: 0,
        skipped_by_backoff: 0,
      };
    }

    const remaining: typeof queue = [];
    let skippedByBackoff = 0;

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

      try {
        if (item.type === "birth_report") {
          await executeBirthReport(item.payload as unknown as FieldBirthInput);
        } else if (item.type === "issue_report") {
          await executeIssueReport(item.payload as unknown as FieldIssueInput);
        }
      } catch (error) {
        remaining.push(toQueueFailureItem(item, error));
      }
    }

    await writeFieldOfflineQueue(remaining);
    const syncedCount = queue.length - remaining.length;

    await writeFieldLastSync({
      last_sync_at: new Date().toISOString(),
      last_sync_result: remaining.length === 0 ? "success" : syncedCount > 0 ? "partial" : "error",
      last_sync_message:
        remaining.length === 0
          ? `Sincronização concluída (${syncedCount} registro(s)).`
          : `Sincronização parcial (${syncedCount} de ${queue.length})${
              skippedByBackoff > 0 ? `, ${skippedByBackoff} aguardando nova tentativa` : ""
            }.`,
    });

    return {
      total: queue.length,
      synced: syncedCount,
      remaining: remaining.length,
      skipped_by_backoff: skippedByBackoff,
    };
  },
};
