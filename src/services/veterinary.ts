import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueueVeterinaryOfflineAction,
  getVeterinarySyncSnapshot,
  isNetworkLikeError,
  readVeterinaryOfflineQueue,
  writeVeterinaryLastSync,
  type VeterinaryMutationResult,
  writeVeterinaryOfflineQueue,
} from "@/src/services/veterinary-offline";
import { mapTaskPriorityFromDb, mapTaskStatusFromDb } from "@/src/lib/vet-shared";
import { handleSupabaseError, supabase } from "@/src/services/base";
import type {
  BreedingEventInput,
  HealthBatchInput,
  LavageOutcomeInput,
  ReproductiveExamInput,
  SemenEntryInput,
  TreatmentInput,
  VetDashboardData,
  VetTaskItem,
} from "@/src/types/domain";

function dashboardCacheKey(harasId: string) {
  return `@criahub:vet-dashboard:${harasId}`;
}

function semenCacheKey(harasId: string) {
  return `@criahub:vet-semen:${harasId}`;
}

function formatDateToBR(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

async function readCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCachedJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop cache failure
  }
}

async function ensureOnline() {
  const state = await NetInfo.fetch();
  if (state.isConnected === false) {
    throw new Error("offline");
  }
}

async function getAnimalNamesMap(ids: string[], harasId: string) {
  if (ids.length === 0) return new Map<string, string>();
  const { data, error } = await supabase
    .from("animals")
    .select("id, nome")
    .eq("haras_id", harasId)
    .in("id", ids);
  if (error) handleSupabaseError(error);
  return new Map((data ?? []).map((item) => [item.id, item.nome]));
}

async function executeCreateReproductiveExam(payload: ReproductiveExamInput) {
  const { data, error } = await supabase
    .from("reproductive_exams")
    .insert({
      haras_id: payload.haras_id,
      animal_id: payload.animal_id,
      exam_at: payload.exam_at ?? new Date().toISOString(),
      follicle_right_size: payload.follicle_right_size,
      follicle_left_size: payload.follicle_left_size,
      uterine_edema: payload.uterine_edema,
      cervix_score: payload.cervix_score,
      intrauterine_fluid: payload.intrauterine_fluid,
      induction: payload.induction,
      inductor: payload.induction ? payload.inductor : null,
      notes: payload.notes,
      created_by: payload.created_by ?? null,
    })
    .select("id")
    .single();

  if (error) handleSupabaseError(error);

  const { error: reproductiveError } = await supabase.from("reproductive_events").insert({
    haras_id: payload.haras_id,
    animal_id: payload.animal_id,
    event_type: "ovulacao",
    event_date: (payload.exam_at ?? new Date().toISOString()).slice(0, 10),
    veterinarian: payload.veterinarian_name,
    observations: payload.notes,
    details: {
      exam_id: data.id,
      follicle_right_size: payload.follicle_right_size,
      follicle_left_size: payload.follicle_left_size,
      uterine_edema: payload.uterine_edema,
      cervix_score: payload.cervix_score,
      intrauterine_fluid: payload.intrauterine_fluid,
      induction: payload.induction,
      inductor: payload.induction ? payload.inductor : null,
    },
  });

  if (reproductiveError) handleSupabaseError(reproductiveError);
}

async function executeCreateBreedingEvent(payload: BreedingEventInput) {
  const { data, error } = await supabase
    .from("breeding_events")
    .insert({
      haras_id: payload.haras_id,
      mare_id: payload.mare_id,
      stallion_id: payload.stallion_id,
      method: payload.method,
      semen_type: payload.semen_type,
      motility_quality: payload.motility_quality,
      motility_percent: payload.motility_percent,
      straws_used: payload.straws_used,
      event_at: payload.event_at ?? new Date().toISOString(),
      notes: payload.notes,
      created_by: payload.created_by ?? null,
    })
    .select("id")
    .single();

  if (error) handleSupabaseError(error);

  const { error: eventError } = await supabase.from("reproductive_events").insert({
    haras_id: payload.haras_id,
    animal_id: payload.mare_id,
    mare_id: payload.mare_id,
    stallion_id: payload.stallion_id,
    event_type: "inseminacao",
    event_date: (payload.event_at ?? new Date().toISOString()).slice(0, 10),
    veterinarian: payload.veterinarian_name,
    semen_type: payload.semen_type,
    observations: payload.notes,
    details: {
      breeding_event_id: data.id,
      method: payload.method,
      motility_quality: payload.motility_quality,
      motility_percent: payload.motility_percent,
      straws_used: payload.straws_used,
    },
  });

  if (eventError) handleSupabaseError(eventError);
}

async function executeAddSemenEntry(payload: SemenEntryInput) {
  const { error } = await supabase.from("semen_movements").insert({
    haras_id: payload.haras_id,
    stallion_id: payload.stallion_id,
    movement_type: "entrada",
    units_paletas: payload.units_paletas,
    semen_type: payload.semen_type,
    reason: payload.reason,
    notes: payload.notes,
    created_by: payload.created_by ?? null,
  });

  if (error) handleSupabaseError(error);
}

async function executeCreateHealthBatch(payload: HealthBatchInput) {
  const { data: batchData, error: batchError } = await supabase
    .from("health_batch_events")
    .insert({
      haras_id: payload.haras_id,
      procedure_type: payload.procedure_type,
      procedure_name: payload.procedure_name,
      application_date: payload.application_date,
      lot_code: payload.lot_code,
      expiration_date: payload.expiration_date,
      notes: payload.notes,
      veterinarian: payload.veterinarian_name,
      created_by: payload.created_by ?? null,
    })
    .select("id")
    .single();

  if (batchError) handleSupabaseError(batchError);

  const rows = payload.animal_ids.map((animalId) => ({
    batch_event_id: batchData.id,
    haras_id: payload.haras_id,
    animal_id: animalId,
  }));

  const { error: linkError } = await supabase.from("health_batch_event_animals").insert(rows);
  if (linkError) handleSupabaseError(linkError);

  if (payload.procedure_type === "Vacina") {
    const vaccineRows = payload.animal_ids.map((animalId) => ({
      haras_id: payload.haras_id,
      animal_id: animalId,
      nome_vacina: payload.procedure_name,
      data_aplicacao: payload.application_date,
      lote: payload.lot_code,
      veterinario: payload.veterinarian_name,
      observacoes: payload.notes,
    }));
    const { error } = await supabase.from("vaccines").insert(vaccineRows);
    if (error) handleSupabaseError(error);
  } else {
    const healthRows = payload.animal_ids.map((animalId) => ({
      haras_id: payload.haras_id,
      animal_id: animalId,
      data_procedimento: payload.application_date,
      tipo: "Vermifugação",
      veterinario: payload.veterinarian_name,
      descricao: payload.procedure_name,
      observacoes: payload.notes,
    }));
    const { error } = await supabase.from("health_records").insert(healthRows);
    if (error) handleSupabaseError(error);
  }
}

async function executeCompleteTask(payload: { taskId: string; harasId: string }) {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "concluida" })
    .eq("id", payload.taskId)
    .eq("haras_id", payload.harasId);
  if (error) handleSupabaseError(error);
}

async function executeCreateTreatment(payload: TreatmentInput) {
  const medicationPlan = payload.medication
    ? [
        {
          name: payload.medication,
          dosage: payload.dosage || "",
          frequency: "",
          duration: "",
          notes: null,
        },
      ]
    : [];

  const { error } = await supabase.from("health_records").insert({
    haras_id: payload.haras_id,
    animal_id: payload.animal_id,
    data_procedimento: payload.procedure_date,
    proximadata: payload.next_date,
    tipo: payload.type,
    veterinario: payload.veterinarian_name,
    descricao: payload.description,
    observacoes: payload.notes,
    medication_plan: medicationPlan,
  });
  if (error) handleSupabaseError(error);
}

async function executeRegisterLavageOutcome(payload: LavageOutcomeInput) {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, task_type, source_table, source_id, animal_id, title")
    .eq("id", payload.task_id)
    .eq("haras_id", payload.haras_id)
    .single();

  if (taskError) handleSupabaseError(taskError);

  if (task.task_type !== "lavado_d8" && !String(task.title || "").toLowerCase().includes("lavado")) {
    throw new Error("Esta tarefa não é do tipo Lavado D8.");
  }

  const { data: breedingEvent, error: breedingError } = await supabase
    .from("breeding_events")
    .select("id, mare_id, stallion_id, event_at")
    .eq("id", task.source_id)
    .eq("haras_id", payload.haras_id)
    .single();

  if (breedingError) handleSupabaseError(breedingError);

  const today = new Date().toISOString();
  const todayDate = today.slice(0, 10);

  if (payload.outcome === "negativo") {
    const { error } = await supabase.from("reproductive_events").insert({
      haras_id: payload.haras_id,
      animal_id: breedingEvent.mare_id,
      mare_id: breedingEvent.mare_id,
      stallion_id: breedingEvent.stallion_id,
      event_type: "diagnostico_gestacao",
      event_date: todayDate,
      status: "Vazia",
      observations: payload.notes ?? "Diagnóstico negativo após lavado D8.",
      details: {
        source_task_id: payload.task_id,
        outcome: "negativo",
      },
    });
    if (error) handleSupabaseError(error);
  }

  if (payload.outcome === "positivo") {
    if (!payload.action_when_positive) {
      throw new Error("Informe a ação para lavado positivo: transferir ou congelar.");
    }

    if (payload.action_when_positive === "congelar") {
      const { error } = await supabase.from("embryos").insert({
        haras_id: payload.haras_id,
        donor_id: breedingEvent.mare_id,
        stallion_id: breedingEvent.stallion_id,
        production_date: todayDate,
        quantity: 1,
        available: 1,
        grade: "B",
        storage_type: "Congelado",
        method: "TE",
        status: "Em estoque",
        veterinarian: null,
        observations: payload.notes ?? "Lavado D8 positivo com congelamento.",
      });
      if (error) handleSupabaseError(error);
    }

    if (payload.action_when_positive === "transferir") {
      if (!payload.recipient_id) {
        throw new Error("Selecione a receptora para transferência.");
      }

      const { error: gestationError } = await supabase.from("gestations").insert({
        haras_id: payload.haras_id,
        egua_id: payload.recipient_id,
        garanhao_id: breedingEvent.stallion_id,
        data_diagnostico: todayDate,
        status: "Em andamento",
        tipo_diagnostico: "Ultrassom",
        observacoes:
          payload.notes ??
          `Gestação criada por transferência de embrião da doadora ${breedingEvent.mare_id}.`,
      });
      if (gestationError) handleSupabaseError(gestationError);

      const { error: transferEventError } = await supabase.from("reproductive_events").insert({
        haras_id: payload.haras_id,
        animal_id: payload.recipient_id,
        mare_id: payload.recipient_id,
        stallion_id: breedingEvent.stallion_id,
        event_type: "transferencia_embriao",
        event_date: todayDate,
        status: "Positivo",
        observations: payload.notes ?? "Lavado D8 positivo com transferência imediata.",
        details: {
          source_task_id: payload.task_id,
          donor_mare_id: breedingEvent.mare_id,
          recipient_id: payload.recipient_id,
          action: "transferir",
        },
      });
      if (transferEventError) handleSupabaseError(transferEventError);

      const { data: donorEmbryo } = await supabase
        .from("embryos")
        .select("id, available")
        .eq("haras_id", payload.haras_id)
        .eq("donor_id", breedingEvent.mare_id)
        .gt("available", 0)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (donorEmbryo) {
        const nextAvailable = Math.max(donorEmbryo.available - 1, 0);
        const { error: embryoUpdateError } = await supabase
          .from("embryos")
          .update({
            available: nextAvailable,
            status: nextAvailable === 0 ? "Utilizado" : "Parcial",
            observations: payload.notes ?? "Embrião transferido para receptora.",
          })
          .eq("id", donorEmbryo.id);
        if (embryoUpdateError) handleSupabaseError(embryoUpdateError);
      }

      const d30 = new Date(today);
      d30.setDate(d30.getDate() + 30);
      const { error: d30TaskError } = await supabase.from("tasks").insert({
        haras_id: payload.haras_id,
        animal_id: payload.recipient_id,
        title: "Diagnóstico D30",
        observations: "Reavaliar gestação da receptora no D30.",
        due_date: d30.toISOString().slice(0, 10),
        status: "pendente",
        priority: "media",
        task_type: "diagnostico_d30",
        auto_generated: true,
        source_table: "tasks",
        source_id: payload.task_id,
        created_by: payload.created_by ?? null,
      });
      if (d30TaskError) handleSupabaseError(d30TaskError);
    }
  }

  const { error: closeTaskError } = await supabase
    .from("tasks")
    .update({ status: "concluida", updated_at: today })
    .eq("id", payload.task_id)
    .eq("haras_id", payload.haras_id);

  if (closeTaskError) handleSupabaseError(closeTaskError);
}

async function withOfflineFallback(
  type: Parameters<typeof enqueueVeterinaryOfflineAction>[0],
  payload: Record<string, any>,
  executor: () => Promise<void>,
  successMessage: string
): Promise<VeterinaryMutationResult> {
  try {
    await ensureOnline();
    await executor();
    return { synced: true, message: successMessage };
  } catch (error) {
    if (isNetworkLikeError(error)) {
      await enqueueVeterinaryOfflineAction(type, payload);
      return { synced: false, message: "Registro salvo localmente. Sincronização pendente." };
    }
    throw error;
  }
}

export const veterinaryService = {
  async getDashboard(harasId: string): Promise<VetDashboardData> {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nextThirtyDaysDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const cacheKey = dashboardCacheKey(harasId);

    try {
      const [tasksRes, waitingRes, treatmentRes, cycleRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, animal_id, task_type, title, observations, due_date, status, priority, source_table, source_id")
          .eq("haras_id", harasId)
          .gte("due_date", sevenDaysAgoDate)
          .lte("due_date", nextThirtyDaysDate)
          .neq("status", "concluida")
          .order("priority", { ascending: false })
          .order("due_date", { ascending: true })
          .limit(80),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("haras_id", harasId)
          .in("task_type", ["diagnostico_d15", "diagnostico_d30"])
          .neq("status", "concluida"),
        supabase
          .from("health_records")
          .select("id", { count: "exact", head: true })
          .eq("haras_id", harasId)
          .gte("proximadata", today),
        supabase
          .from("reproductive_exams")
          .select("id", { count: "exact", head: true })
          .eq("haras_id", harasId)
          .gte("exam_at", sevenDaysAgo),
      ]);

      if (tasksRes.error) handleSupabaseError(tasksRes.error);
      if (waitingRes.error) handleSupabaseError(waitingRes.error);
      if (treatmentRes.error) handleSupabaseError(treatmentRes.error);
      if (cycleRes.error) handleSupabaseError(cycleRes.error);

      const animalIds = Array.from(new Set((tasksRes.data ?? []).map((item) => item.animal_id).filter(Boolean))) as string[];
      const namesMap = await getAnimalNamesMap(animalIds, harasId);

      const todayTasks: VetTaskItem[] = (tasksRes.data ?? []).map((item) => ({
        id: item.id,
        animal_id: item.animal_id ?? null,
        animal_name: item.animal_id ? namesMap.get(item.animal_id) ?? null : null,
        task_type: item.task_type || "geral",
        title: item.title,
        description: item.observations ?? null,
        due_date: item.due_date,
        status: mapTaskStatusFromDb(item.status),
        priority: mapTaskPriorityFromDb(item.priority),
        source_table: item.source_table ?? null,
        source_id: item.source_id ?? null,
      }));

      const response = {
        todayTasks,
        waitingDiagnosis: waitingRes.count ?? 0,
        inTreatment: treatmentRes.count ?? 0,
        reproductiveCycle: cycleRes.count ?? 0,
      };

      await writeCachedJson(cacheKey, response);
      return response;
    } catch (error) {
      if (isNetworkLikeError(error)) {
        const cached = await readCachedJson<VetDashboardData>(cacheKey);
        if (cached) return cached;
      }
      throw error;
    }
  },

  async getSemenInventory(harasId: string) {
    const cacheKey = semenCacheKey(harasId);
    try {
      const { data, error } = await supabase
        .from("semen_inventory_stallion")
        .select("id, stallion_id, total_entries_paletas, total_outputs_paletas, available_paletas")
        .eq("haras_id", harasId)
        .order("available_paletas", { ascending: false })
        .limit(12);

      if (error) handleSupabaseError(error);

      const ids = Array.from(new Set((data ?? []).map((item) => item.stallion_id)));
      const namesMap = await getAnimalNamesMap(ids, harasId);

      const response = (data ?? []).map((item) => ({
        id: item.id,
        stallion_id: item.stallion_id,
        stallion_name: namesMap.get(item.stallion_id) ?? "Sem nome",
        total_entries_paletas: item.total_entries_paletas,
        total_outputs_paletas: item.total_outputs_paletas,
        available_paletas: item.available_paletas,
      }));

      await writeCachedJson(cacheKey, response);
      return response;
    } catch (error) {
      if (isNetworkLikeError(error)) {
        const cached = await readCachedJson<any[]>(cacheKey);
        if (cached) return cached;
      }
      throw error;
    }
  },

  createReproductiveExam(payload: ReproductiveExamInput) {
    return withOfflineFallback(
      "create_reproductive_exam",
      payload,
      () => executeCreateReproductiveExam(payload),
      "Exame salvo com sucesso."
    );
  },

  createBreedingEvent(payload: BreedingEventInput) {
    const base = payload.event_at ? new Date(payload.event_at) : new Date();
    const lavagemDate = new Date(base);
    lavagemDate.setDate(lavagemDate.getDate() + 8);

    return withOfflineFallback(
      "create_breeding_event",
      payload,
      () => executeCreateBreedingEvent(payload),
      `Inseminação registrada. Previsão de lavado: ${formatDateToBR(lavagemDate.toISOString())}.`
    );
  },

  createHealthBatch(payload: HealthBatchInput) {
    return withOfflineFallback(
      "create_health_batch",
      payload,
      () => executeCreateHealthBatch(payload),
      "Manejo sanitário em lote registrado com sucesso."
    );
  },

  addSemenEntry(payload: SemenEntryInput) {
    return withOfflineFallback(
      "add_semen_entry",
      payload,
      () => executeAddSemenEntry(payload),
      "Entrada de paletas registrada com sucesso."
    );
  },

  createTreatment(payload: TreatmentInput) {
    return withOfflineFallback(
      "create_treatment",
      payload,
      () => executeCreateTreatment(payload),
      "Tratamento salvo. Sincronização pendente se offline."
    );
  },

  completeTask(payload: { taskId: string; harasId: string }) {
    return withOfflineFallback(
      "complete_task",
      payload,
      () => executeCompleteTask(payload),
      "Tarefa marcada como concluída."
    );
  },

  registerLavageOutcome(payload: LavageOutcomeInput) {
    return withOfflineFallback(
      "register_lavage_outcome",
      payload,
      () => executeRegisterLavageOutcome(payload),
      payload.outcome === "positivo"
        ? "Lavado positivo registrado com sucesso."
        : "Lavado negativo registrado. Égua marcada como vazia."
    );
  },

  getSyncSnapshot() {
    return getVeterinarySyncSnapshot();
  },

  async flushOfflineQueue() {
    await ensureOnline();
    const queue = await readVeterinaryOfflineQueue();
    if (queue.length === 0) {
      await writeVeterinaryLastSync({
        last_sync_at: new Date().toISOString(),
        last_sync_result: "success",
        last_sync_message: "Sem registros pendentes para sincronizar.",
      });
      return 0;
    }

    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.type === "create_reproductive_exam") {
          await executeCreateReproductiveExam(item.payload as ReproductiveExamInput);
        } else if (item.type === "create_breeding_event") {
          await executeCreateBreedingEvent(item.payload as BreedingEventInput);
        } else if (item.type === "create_health_batch") {
          await executeCreateHealthBatch(item.payload as HealthBatchInput);
        } else if (item.type === "add_semen_entry") {
          await executeAddSemenEntry(item.payload as SemenEntryInput);
        } else if (item.type === "complete_task") {
          await executeCompleteTask(item.payload as { taskId: string; harasId: string });
        } else if (item.type === "register_lavage_outcome") {
          await executeRegisterLavageOutcome(item.payload as LavageOutcomeInput);
        } else if (item.type === "create_treatment") {
          await executeCreateTreatment(item.payload as TreatmentInput);
        }
      } catch {
        remaining.push(item);
      }
    }

    await writeVeterinaryOfflineQueue(remaining);
    const syncedCount = queue.length - remaining.length;

    await writeVeterinaryLastSync({
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
