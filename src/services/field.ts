import NetInfo from "@react-native-community/netinfo";
import { handleSupabaseError, supabase } from "@/src/services/base";
import {
  enqueueFieldOfflineAction,
  getFieldSyncSnapshot,
  isNetworkLikeError,
  readFieldOfflineQueue,
  writeFieldLastSync,
  writeFieldOfflineQueue,
} from "@/src/services/field-offline";
import type { FieldBirthInput, FieldIssueInput } from "@/src/types/domain";

export interface FieldMutationResult {
  synced: boolean;
  message: string;
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
  payload: Record<string, any>,
  executor: () => Promise<void>,
  successMessage: string
): Promise<FieldMutationResult> {
  try {
    await ensureOnline();
    await executor();
    return { synced: true, message: successMessage };
  } catch (error) {
    if (isNetworkLikeError(error)) {
      await enqueueFieldOfflineAction(type, payload);
      return {
        synced: false,
        message: "Salvo no celular. Enviaremos quando tiver internet.",
      };
    }
    throw error;
  }
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

  async flushOfflineQueue() {
    await ensureOnline();
    const queue = await readFieldOfflineQueue();

    if (queue.length === 0) {
      await writeFieldLastSync({
        last_sync_at: new Date().toISOString(),
        last_sync_result: "success",
        last_sync_message: "Sem registros pendentes para sincronizar.",
      });
      return 0;
    }

    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.type === "birth_report") {
          await executeBirthReport(item.payload as FieldBirthInput);
        } else if (item.type === "issue_report") {
          await executeIssueReport(item.payload as FieldIssueInput);
        }
      } catch {
        remaining.push(item);
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
          : `Sincronização parcial (${syncedCount} de ${queue.length}).`,
    });

    return syncedCount;
  },
};
