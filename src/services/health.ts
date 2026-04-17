import { handleSupabaseError, supabase } from "@/src/services/base";
import type {
  CreateExamInput,
  CreateHealthRecordInput,
  CreateVaccineInput,
  ExamRecord,
  HealthRecord,
  HealthAuditLog,
  HealthSummary,
  UpdateExamInput,
  UpdateHealthRecordInput,
  UpdateVaccineInput,
  VaccineRecord,
} from "@/src/types/domain";

const PROCEDURE_TYPE_DB_MAP: Record<string, string> = {
  consulta: "Consulta",
  cirurgia: "Cirurgia",
  dentista: "Dentista",
  casqueamento: "Casqueamento",
  vermifugacao: "Vermifugação",
  vacinacao: "Vacinação",
  exame: "Exame",
  outro: "Outro",
  emergencia: "Outro",
};

function normalizeKey(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toDbProcedureType(value: string): string {
  const key = normalizeKey(value);
  return PROCEDURE_TYPE_DB_MAP[key] || value;
}

async function resolveHarasId(animalId: string, explicitHarasId?: string) {
  if (explicitHarasId) return explicitHarasId;
  const { data, error } = await supabase.from("animals").select("haras_id").eq("id", animalId).single();
  if (error) handleSupabaseError(error);
  return (data?.haras_id as string | null) ?? null;
}

type UploadExamFile = {
  uri: string;
  file_name: string;
  mime_type?: string | null;
  onUploaded?: () => void;
};

// TODO PAR-03: confirmar com criahub-web-v2 se "animal-photos" é o bucket
// canônico para anexos de exames/saúde. Por ora alinhamos ao bucket
// predominante no codebase mobile (animal-media.ts também usa animal-photos).
async function uploadExamFiles(animalId: string, files?: UploadExamFile[]) {
  if (!files?.length) return [] as string[];

  const uploaded: string[] = [];
  for (const file of files) {
    const ext = file.file_name.includes(".") ? file.file_name.split(".").pop() : undefined;
    const fileName = `${animalId}/exams/${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ""}`;
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage.from("animal-photos").upload(fileName, blob, {
      contentType: file.mime_type || undefined,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) handleSupabaseError(uploadError);

    const { data } = supabase.storage.from("animal-photos").getPublicUrl(fileName);
    if (data?.publicUrl) uploaded.push(data.publicUrl);
    file.onUploaded?.();
  }

  return uploaded;
}

function mapHealthAuditLog(row: any): HealthAuditLog {
  const changedByName =
    row.changed_by_profile?.full_name ??
    row.changed_by_profile?.email ??
    null;

  return {
    id: row.id,
    table_name: row.table_name,
    record_id: row.record_id,
    haras_id: row.haras_id,
    animal_id: row.animal_id ?? null,
    action: row.action,
    changed_by: row.changed_by ?? null,
    changed_by_name: changedByName,
    changed_at: row.changed_at,
    before_data: row.before_data ?? null,
    after_data: row.after_data ?? null,
  };
}

function mapHealthRecord(row: any): HealthRecord {
  const medications = Array.isArray(row.medication_plan)
    ? row.medication_plan.map((item: any) => ({
        name: String(item?.name || ""),
        dosage: String(item?.dosage || ""),
        frequency: String(item?.frequency || ""),
        duration: String(item?.duration || ""),
        notes: item?.notes ?? null,
      }))
    : [];

  return {
    id: row.id,
    animal_id: row.animal_id,
    haras_id: row.haras_id,
    procedure_date: row.data_procedimento,
    type: row.tipo,
    veterinarian: row.veterinario ?? null,
    description: row.descricao ?? null,
    cost: row.custo == null ? null : Number(row.custo),
    next_date: row.proximadata ?? null,
    observations: row.observacoes ?? null,
    medications,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVaccineRecord(row: any): VaccineRecord {
  return {
    id: row.id,
    animal_id: row.animal_id,
    haras_id: row.haras_id,
    name: row.nome_vacina,
    application_date: row.data_aplicacao,
    next_dose_date: row.data_proxima_dose ?? null,
    lot: row.lote ?? null,
    manufacturer: row.fabricante ?? null,
    veterinarian: row.veterinario ?? null,
    observations: row.observacoes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapExamRecord(row: any): ExamRecord {
  return {
    id: row.id,
    animal_id: row.animal_id,
    haras_id: row.haras_id,
    exam_type: row.tipo_exame,
    exam_date: row.data_exame,
    veterinarian: row.veterinario ?? null,
    laboratory: row.laboratorio ?? null,
    result: row.resultado ?? null,
    file_urls: Array.isArray(row.file_urls) ? row.file_urls : null,
    observations: row.observacoes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const healthService = {
  async listHealthRecords(animalId: string): Promise<HealthRecord[]> {
    const { data, error } = await supabase
      .from("health_records")
      .select("*")
      .eq("animal_id", animalId)
      .order("data_procedimento", { ascending: false });

    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapHealthRecord);
  },

  async listVaccines(animalId: string): Promise<VaccineRecord[]> {
    const { data, error } = await supabase
      .from("vaccines")
      .select("*")
      .eq("animal_id", animalId)
      .order("data_aplicacao", { ascending: false });

    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapVaccineRecord);
  },

  async listExams(animalId: string): Promise<ExamRecord[]> {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("animal_id", animalId)
      .order("data_exame", { ascending: false });

    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapExamRecord);
  },

  async createHealthRecord(input: CreateHealthRecordInput): Promise<HealthRecord> {
    const harasId = await resolveHarasId(input.animal_id, input.haras_id);
    if (!harasId) throw new Error("Haras não encontrado para registrar procedimento.");

    const { data, error } = await supabase
      .from("health_records")
      .insert({
        haras_id: harasId,
        animal_id: input.animal_id,
        data_procedimento: input.procedure_date,
        tipo: toDbProcedureType(input.type),
        veterinario: input.veterinarian ?? null,
        descricao: input.description ?? null,
        custo: input.cost ?? null,
        proximadata: input.next_date ?? null,
        observacoes: input.observations ?? null,
        medication_plan: input.medications ?? [],
      })
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapHealthRecord(data);
  },

  async updateHealthRecord(input: UpdateHealthRecordInput): Promise<HealthRecord> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.procedure_date !== undefined) payload.data_procedimento = input.procedure_date;
    if (input.type !== undefined) payload.tipo = toDbProcedureType(input.type);
    if (input.veterinarian !== undefined) payload.veterinario = input.veterinarian;
    if (input.description !== undefined) payload.descricao = input.description;
    if (input.cost !== undefined) payload.custo = input.cost;
    if (input.next_date !== undefined) payload.proximadata = input.next_date;
    if (input.observations !== undefined) payload.observacoes = input.observations;
    if (input.medications !== undefined) payload.medication_plan = input.medications;

    const { data, error } = await supabase
      .from("health_records")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapHealthRecord(data);
  },

  async deleteHealthRecord(id: string): Promise<{ animal_id: string; haras_id: string }> {
    const { data, error } = await supabase
      .from("health_records")
      .delete()
      .eq("id", id)
      .select("animal_id,haras_id")
      .single();
    if (error) handleSupabaseError(error);
    return { animal_id: data.animal_id, haras_id: data.haras_id };
  },

  async createVaccine(input: CreateVaccineInput): Promise<VaccineRecord> {
    const harasId = await resolveHarasId(input.animal_id, input.haras_id);
    if (!harasId) throw new Error("Haras não encontrado para registrar vacina.");

    const { data, error } = await supabase
      .from("vaccines")
      .insert({
        haras_id: harasId,
        animal_id: input.animal_id,
        nome_vacina: input.name,
        data_aplicacao: input.application_date,
        data_proxima_dose: input.next_dose_date ?? null,
        lote: input.lot ?? null,
        fabricante: input.manufacturer ?? null,
        veterinario: input.veterinarian ?? null,
        observacoes: input.observations ?? null,
      })
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapVaccineRecord(data);
  },

  async updateVaccine(input: UpdateVaccineInput): Promise<VaccineRecord> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.nome_vacina = input.name;
    if (input.application_date !== undefined) payload.data_aplicacao = input.application_date;
    if (input.next_dose_date !== undefined) payload.data_proxima_dose = input.next_dose_date;
    if (input.lot !== undefined) payload.lote = input.lot;
    if (input.manufacturer !== undefined) payload.fabricante = input.manufacturer;
    if (input.veterinarian !== undefined) payload.veterinario = input.veterinarian;
    if (input.observations !== undefined) payload.observacoes = input.observations;

    const { data, error } = await supabase
      .from("vaccines")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapVaccineRecord(data);
  },

  async deleteVaccine(id: string): Promise<{ animal_id: string; haras_id: string }> {
    const { data, error } = await supabase
      .from("vaccines")
      .delete()
      .eq("id", id)
      .select("animal_id,haras_id")
      .single();
    if (error) handleSupabaseError(error);
    return { animal_id: data.animal_id, haras_id: data.haras_id };
  },

  async createExam(input: CreateExamInput): Promise<ExamRecord> {
    const harasId = await resolveHarasId(input.animal_id, input.haras_id);
    if (!harasId) throw new Error("Haras não encontrado para registrar exame.");

    const totalFiles = input.file_uris?.length ?? 0;
    let uploadedCount = 0;
    const uploaded = await uploadExamFiles(input.animal_id, input.file_uris?.map((file) => {
      return {
        ...file,
        onUploaded: () => {
          uploadedCount += 1;
          input.on_upload_progress?.({
            completed_files: uploadedCount,
            total_files: totalFiles,
            percent: totalFiles === 0 ? 100 : Math.round((uploadedCount / totalFiles) * 100),
            current_file_name: file.file_name,
          });
        },
      };
    }));
    const fileUrls = [...(input.file_urls ?? []), ...uploaded];

    const { data, error } = await supabase
      .from("exams")
      .insert({
        haras_id: harasId,
        animal_id: input.animal_id,
        tipo_exame: input.exam_type,
        data_exame: input.exam_date,
        veterinario: input.veterinarian ?? null,
        laboratorio: input.laboratory ?? null,
        resultado: input.result ?? null,
        observacoes: input.observations ?? null,
        file_urls: fileUrls.length ? fileUrls : null,
      })
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapExamRecord(data);
  },

  async updateExam(input: UpdateExamInput): Promise<ExamRecord> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.exam_type !== undefined) payload.tipo_exame = input.exam_type;
    if (input.exam_date !== undefined) payload.data_exame = input.exam_date;
    if (input.veterinarian !== undefined) payload.veterinario = input.veterinarian;
    if (input.laboratory !== undefined) payload.laboratorio = input.laboratory;
    if (input.result !== undefined) payload.resultado = input.result;
    if (input.observations !== undefined) payload.observacoes = input.observations;

    const { data: existing, error: existingError } = await supabase
      .from("exams")
      .select("animal_id, file_urls")
      .eq("id", input.id)
      .single();
    if (existingError) handleSupabaseError(existingError);

    const totalFiles = input.file_uris?.length ?? 0;
    let uploadedCount = 0;
    const uploaded = await uploadExamFiles(
      existing.animal_id as string,
      input.file_uris?.map((file) => {
        return {
          ...file,
          onUploaded: () => {
            uploadedCount += 1;
            input.on_upload_progress?.({
              completed_files: uploadedCount,
              total_files: totalFiles,
              percent: totalFiles === 0 ? 100 : Math.round((uploadedCount / totalFiles) * 100),
              current_file_name: file.file_name,
            });
          },
        };
      }),
    );

    if (input.file_urls !== undefined || uploaded.length > 0) {
      payload.file_urls = [...(input.file_urls ?? []), ...uploaded];
    }

    if (uploaded.length > 0) {
      payload.file_urls = [
        ...((input.file_urls ?? existing.file_urls ?? []) as string[]),
        ...uploaded,
      ];
    }

    const { data, error } = await supabase
      .from("exams")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    return mapExamRecord(data);
  },

  async deleteExam(id: string): Promise<{ animal_id: string; haras_id: string }> {
    const { data, error } = await supabase
      .from("exams")
      .delete()
      .eq("id", id)
      .select("animal_id,haras_id")
      .single();
    if (error) handleSupabaseError(error);
    return { animal_id: data.animal_id, haras_id: data.haras_id };
  },

  async getHealthSummary(harasId: string): Promise<HealthSummary> {
    const [animalsRes, vaccineRes, upcomingRes] = await Promise.all([
      supabase.from("animals").select("id", { count: "exact", head: true }).eq("haras_id", harasId),
      supabase
        .from("vaccines")
        .select("animal_id, data_proxima_dose")
        .eq("haras_id", harasId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("haras_id", harasId)
        .in("status", ["pendente", "em_andamento"]),
    ]);

    if (animalsRes.error) handleSupabaseError(animalsRes.error);
    if (vaccineRes.error) handleSupabaseError(vaccineRes.error);
    if (upcomingRes.error) handleSupabaseError(upcomingRes.error);

    const vaccineRows = vaccineRes.data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const lastByAnimal = new Map<string, string | null>();
    for (const row of vaccineRows) {
      const animalId = row.animal_id as string;
      const nextDose = (row.data_proxima_dose as string | null) ?? null;
      const current = lastByAnimal.get(animalId) ?? null;
      if (!current || (nextDose && nextDose > current)) {
        lastByAnimal.set(animalId, nextDose);
      }
    }

    let overdue = 0;
    let upToDate = 0;
    for (const value of lastByAnimal.values()) {
      if (!value) continue;
      if (value < today) overdue += 1;
      else upToDate += 1;
    }

    return {
      totalAnimals: animalsRes.count ?? 0,
      vaccinatedUpToDate: upToDate,
      vaccineOverdue: overdue,
      activeAlerts: upcomingRes.count ?? 0,
    };
  },

  async listHealthAuditLogs(animalId: string, limit = 30): Promise<HealthAuditLog[]> {
    const { data, error } = await supabase
      .from("health_audit_logs")
      .select("*, changed_by_profile:profiles!health_audit_logs_changed_by_fkey(full_name,email)")
      .eq("animal_id", animalId)
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapHealthAuditLog);
  },
};
