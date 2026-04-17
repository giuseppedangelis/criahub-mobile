import { handleSupabaseError, supabase } from "@/src/services/base";
import { resizeForUpload } from "@/src/lib/image-upload";
import { storageNonce } from "@/src/lib/storage-nonce";
import type {
  CreateTaskInput,
  ExecuteTaskInput,
  TaskAttachment,
  TaskExecutionItem,
  TaskItem,
  TaskListFilters,
  TeamMemberOption,
  UpdateTaskInput,
} from "@/src/types/domain";

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_\.]/g, "");
}

function mapAttachment(value: any): TaskAttachment {
  return {
    kind: value?.kind === "photo" ? "photo" : "document",
    url: String(value?.url || ""),
    name: String(value?.name || "arquivo"),
    mime_type: value?.mime_type ?? null,
    uploaded_at: value?.uploaded_at ?? new Date().toISOString(),
  };
}

function mapTaskRow(row: any): TaskItem {
  const documents = Array.isArray(row.documents) ? row.documents.map(mapAttachment) : [];
  const photos = Array.isArray(row.photos) ? row.photos.map(mapAttachment) : [];

  return {
    id: row.id,
    haras_id: row.haras_id,
    title: row.title,
    due_date: row.due_date,
    status: row.status,
    priority: row.priority,
    observations: row.observations ?? null,
    task_type: row.task_type ?? null,
    animal_id: row.animal_id ?? null,
    responsible_id: row.responsible_id ?? null,
    documents,
    photos,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    last_execution_id: row.last_execution_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    animal_name: row.animal?.nome ?? null,
    responsible_name: row.responsible?.full_name ?? row.responsible?.email ?? null,
  };
}

function mapExecutionRow(row: any): TaskExecutionItem {
  return {
    id: row.id,
    task_id: row.task_id,
    haras_id: row.haras_id,
    executed_by: row.executed_by,
    outcome: row.outcome,
    notes: row.notes ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments.map(mapAttachment) : [],
    executed_at: row.executed_at,
    created_at: row.created_at,
  };
}

export const tasksService = {
  async list(filters: TaskListFilters): Promise<TaskItem[]> {
    let query = supabase
      .from("tasks")
      .select("*, animal:animals(id,nome), responsible:profiles!tasks_responsible_id_fkey(id,full_name,email)")
      .eq("haras_id", filters.haras_id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(150);

    if (filters.responsible_id) query = query.eq("responsible_id", filters.responsible_id);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.from_due_date) query = query.gte("due_date", filters.from_due_date);
    if (filters.to_due_date) query = query.lte("due_date", filters.to_due_date);
    if (filters.search?.trim()) {
      const value = filters.search.trim();
      query = query.or(`title.ilike.%${value}%,observations.ilike.%${value}%`);
    }

    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapTaskRow);
  },

  async create(input: CreateTaskInput): Promise<TaskItem> {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        haras_id: input.haras_id,
        title: input.title,
        due_date: input.due_date,
        status: input.status ?? "pendente",
        priority: input.priority ?? "media",
        observations: input.observations ?? null,
        task_type: input.task_type ?? null,
        animal_id: input.animal_id ?? null,
        responsible_id: input.responsible_id ?? null,
        created_by: input.created_by ?? null,
      })
      .select("*, animal:animals(id,nome), responsible:profiles!tasks_responsible_id_fkey(id,full_name,email)")
      .single();

    if (error) handleSupabaseError(error);
    return mapTaskRow(data);
  },

  async update(taskId: string, input: UpdateTaskInput): Promise<TaskItem> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) payload.title = input.title;
    if (input.due_date !== undefined) payload.due_date = input.due_date;
    if (input.status !== undefined) payload.status = input.status;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.observations !== undefined) payload.observations = input.observations;
    if (input.task_type !== undefined) payload.task_type = input.task_type;
    if (input.animal_id !== undefined) payload.animal_id = input.animal_id;
    if (input.responsible_id !== undefined) payload.responsible_id = input.responsible_id;

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .select("*, animal:animals(id,nome), responsible:profiles!tasks_responsible_id_fkey(id,full_name,email)")
      .single();

    if (error) handleSupabaseError(error);
    return mapTaskRow(data);
  },

  async uploadAttachment(taskId: string, harasId: string, file: { uri: string; file_name: string; mime_type?: string | null; kind: "photo" | "document"; }) {
    const sanitized = sanitizeFileName(file.file_name || `${file.kind}-${Date.now()}`);
    // RLS-04 (D-02): nonce impede enumeração de anexos de task.
    const nonce = storageNonce();
    const filePath = `${harasId}/tasks/${taskId}/${file.kind}/${Date.now()}_${nonce}_${sanitized}`;
    // PERF-02 (D-08/D-09): resize apenas quando é foto; documentos
    // (pdf, docx etc) passam direto sem processar.
    const sourceUri = file.kind === "photo" ? await resizeForUpload(file.uri) : file.uri;
    const response = await fetch(sourceUri);
    const blob = await response.blob();

    const { error } = await supabase.storage.from("task-attachments").upload(filePath, blob, {
      contentType: file.mime_type ?? undefined,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) handleSupabaseError(error);

    const { data } = supabase.storage.from("task-attachments").getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error("Falha ao gerar URL do anexo.");

    return {
      kind: file.kind,
      url: data.publicUrl,
      name: file.file_name,
      mime_type: file.mime_type ?? null,
      uploaded_at: new Date().toISOString(),
    } as TaskAttachment;
  },

  async execute(input: ExecuteTaskInput): Promise<TaskExecutionItem> {
    const uploadedAttachments = input.attachments?.length
      ? await Promise.all(
          input.attachments.map((item) =>
            this.uploadAttachment(input.task_id, input.haras_id, {
              uri: item.uri,
              file_name: item.file_name,
              mime_type: item.mime_type,
              kind: item.kind,
            })
          )
        )
      : [];

    const { data: execution, error: executionError } = await supabase
      .from("task_executions")
      .insert({
        task_id: input.task_id,
        haras_id: input.haras_id,
        executed_by: input.executed_by,
        outcome: input.outcome,
        notes: input.notes ?? null,
        attachments: uploadedAttachments,
        metadata: input.next_due_date ? { next_due_date: input.next_due_date } : {},
      })
      .select("*")
      .single();

    if (executionError) handleSupabaseError(executionError);

    const nextStatus =
      input.outcome === "concluida"
        ? "concluida"
        : input.outcome === "reagendada"
        ? "pendente"
        : "em_andamento";

    const { data: currentTask, error: currentTaskError } = await supabase
      .from("tasks")
      .select("documents, photos")
      .eq("id", input.task_id)
      .single();
    if (currentTaskError) handleSupabaseError(currentTaskError);

    const currentDocs = Array.isArray(currentTask.documents) ? currentTask.documents : [];
    const currentPhotos = Array.isArray(currentTask.photos) ? currentTask.photos : [];
    const nextDocs = [...currentDocs, ...uploadedAttachments.filter((item) => item.kind === "document")];
    const nextPhotos = [...currentPhotos, ...uploadedAttachments.filter((item) => item.kind === "photo")];

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        due_date: input.next_due_date ?? undefined,
        started_at: new Date().toISOString(),
        completed_at: input.outcome === "concluida" ? new Date().toISOString() : null,
        last_execution_id: execution.id,
        observations: input.notes ?? undefined,
        documents: nextDocs,
        photos: nextPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.task_id)
      .eq("haras_id", input.haras_id);
    if (updateError) handleSupabaseError(updateError);

    return mapExecutionRow(execution);
  },

  async listExecutions(taskId: string, harasId: string): Promise<TaskExecutionItem[]> {
    const { data, error } = await supabase
      .from("task_executions")
      .select("*")
      .eq("task_id", taskId)
      .eq("haras_id", harasId)
      .order("executed_at", { ascending: false })
      .limit(30);
    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapExecutionRow);
  },

  async listAssignableMembers(harasId: string): Promise<TeamMemberOption[]> {
    const { data, error } = await supabase.rpc("list_haras_assignable_members", {
      p_haras_id: harasId,
    });
    if (error) handleSupabaseError(error);
    return (data ?? []).map((item: { user_id: string; full_name: string | null; email: string | null; role: string }) => ({
      id: item.user_id,
      full_name: item.full_name ?? null,
      email: item.email ?? null,
      role: item.role,
    }));
  },
};
