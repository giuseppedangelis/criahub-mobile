import { handleSupabaseError, supabase } from "@/src/services/base";
import type {
  CreateGestationInput,
  CreateReproductiveEventInput,
  GestationItem,
  ReproductionEventItem,
  ReproductionStats,
} from "@/src/types/domain";

function unique(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

async function loadAnimalNames(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.from("animals").select("id, nome").in("id", ids);
  if (error) handleSupabaseError(error);

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    map.set(item.id, item.nome);
  }
  return map;
}

function mapDbGestationStatus(value: string | null | undefined) {
  if (!value) return "confirmada";
  const normalized = value.toLowerCase();
  if (normalized.includes("parto")) return "nascimento";
  if (normalized.includes("abort")) return "aborto";
  if (normalized.includes("reabsor")) return "reabsorvida";
  if (normalized.includes("andamento")) return "em_andamento";
  return "confirmada";
}

function toDbGestationStatus(value: string | null | undefined) {
  if (!value) return "Em andamento";
  const normalized = value.toLowerCase();
  if (normalized === "nascimento") return "Parto realizado";
  if (normalized === "aborto") return "Abortada";
  if (normalized === "reabsorvida") return "Reabsorvida";
  if (normalized === "confirmada" || normalized === "em_andamento") return "Em andamento";
  return value;
}

export const reproductionService = {
  async listEvents(harasId: string): Promise<ReproductionEventItem[]> {
    const { data, error } = await supabase
      .from("reproductive_events")
      .select("id, haras_id, animal_id, mare_id, stallion_id, event_type, event_date, status, veterinarian, protocol, semen_type, observations")
      .eq("haras_id", harasId)
      .order("event_date", { ascending: false })
      .limit(120);

    if (error) handleSupabaseError(error);

    const animalIds = unique(
      (data ?? []).flatMap((item) => [item.animal_id, item.mare_id, item.stallion_id]),
    );
    const names = await loadAnimalNames(animalIds);

    return (data ?? []).map((item) => ({
      id: item.id,
      haras_id: item.haras_id,
      animal_id: item.animal_id ?? null,
      mare_id: item.mare_id ?? null,
      stallion_id: item.stallion_id ?? null,
      event_type: item.event_type,
      event_date: item.event_date,
      status: item.status ?? null,
      veterinarian: item.veterinarian ?? null,
      protocol: item.protocol ?? null,
      semen_type: item.semen_type ?? null,
      animal_name: item.animal_id ? names.get(item.animal_id) ?? null : null,
      mare_name: item.mare_id ? names.get(item.mare_id) ?? null : null,
      stallion_name: item.stallion_id ? names.get(item.stallion_id) ?? null : null,
      observations: item.observations ?? null,
    }));
  },

  async listGestations(harasId: string): Promise<GestationItem[]> {
    const { data, error } = await supabase
      .from("gestations")
      .select("id, haras_id, egua_id, garanhao_id, status, data_diagnostico, data_prevista_parto, data_parto, observacoes")
      .eq("haras_id", harasId)
      .order("data_prevista_parto", { ascending: true })
      .limit(120);

    if (error) handleSupabaseError(error);

    const animalIds = unique((data ?? []).flatMap((item) => [item.egua_id, item.garanhao_id]));
    const names = await loadAnimalNames(animalIds);

    return (data ?? []).map((item) => ({
      id: item.id,
      haras_id: item.haras_id,
      mare_id: item.egua_id ?? null,
      stallion_id: item.garanhao_id ?? null,
      status: mapDbGestationStatus(item.status),
      data_diagnostico: item.data_diagnostico ?? null,
      data_prevista_parto: item.data_prevista_parto ?? null,
      data_parto: item.data_parto ?? null,
      egua_name: item.egua_id ? names.get(item.egua_id) ?? null : null,
      garanhao_name: item.garanhao_id ? names.get(item.garanhao_id) ?? null : null,
      observacoes: item.observacoes ?? null,
    }));
  },

  async getStats(harasId: string): Promise<ReproductionStats> {
    const [eventsRes, gestRes] = await Promise.all([
      supabase
        .from("reproductive_events")
        .select("id", { count: "exact", head: true })
        .eq("haras_id", harasId),
      supabase
        .from("gestations")
        .select("status")
        .eq("haras_id", harasId),
    ]);

    if (eventsRes.error) handleSupabaseError(eventsRes.error);
    if (gestRes.error) handleSupabaseError(gestRes.error);

    const gestRows = gestRes.data ?? [];
    const normalized = gestRows.map((item) => mapDbGestationStatus(item.status));

    return {
      total_events: eventsRes.count ?? 0,
      total_gestations: gestRows.length,
      active_gestations: normalized.filter((s) => s === "em_andamento" || s === "confirmada").length,
      births: normalized.filter((s) => s === "nascimento").length,
      abortions: normalized.filter((s) => s === "aborto").length,
    };
  },

  async createEvent(input: CreateReproductiveEventInput): Promise<ReproductionEventItem> {
    const { data, error } = await supabase
      .from("reproductive_events")
      .insert({
        haras_id: input.haras_id,
        animal_id: input.animal_id,
        event_type: input.event_type,
        event_date: input.event_date,
        stallion_id: input.stallion_id ?? null,
        mare_id: input.mare_id ?? null,
        veterinarian: input.veterinarian ?? null,
        protocol: input.protocol ?? null,
        observations: input.observations ?? null,
        status: input.status ?? "Pendente",
        semen_type: input.semen_type ?? null,
      })
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    const names = await loadAnimalNames(unique([data.animal_id, data.mare_id, data.stallion_id]));

    return {
      id: data.id,
      haras_id: data.haras_id,
      animal_id: data.animal_id ?? null,
      mare_id: data.mare_id ?? null,
      stallion_id: data.stallion_id ?? null,
      event_type: data.event_type,
      event_date: data.event_date,
      status: data.status ?? null,
      veterinarian: data.veterinarian ?? null,
      protocol: data.protocol ?? null,
      semen_type: data.semen_type ?? null,
      animal_name: data.animal_id ? names.get(data.animal_id) ?? null : null,
      mare_name: data.mare_id ? names.get(data.mare_id) ?? null : null,
      stallion_name: data.stallion_id ? names.get(data.stallion_id) ?? null : null,
      observations: data.observations ?? null,
    };
  },

  async createGestation(input: CreateGestationInput): Promise<GestationItem> {
    const start = new Date(input.start_date);
    const expected = input.expected_birth_date
      ? input.expected_birth_date
      : new Date(start.getTime() + 340 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("gestations")
      .insert({
        haras_id: input.haras_id,
        egua_id: input.mare_id,
        garanhao_id: input.stallion_id ?? null,
        covering_id: input.reproductive_event_id ?? null,
        data_diagnostico: input.confirmation_date ?? input.start_date,
        data_prevista_parto: expected,
        status: toDbGestationStatus(input.status),
        observacoes: input.observations ?? null,
      })
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    const names = await loadAnimalNames(unique([data.egua_id, data.garanhao_id]));

    return {
      id: data.id,
      haras_id: data.haras_id,
      mare_id: data.egua_id ?? null,
      stallion_id: data.garanhao_id ?? null,
      status: mapDbGestationStatus(data.status),
      data_diagnostico: data.data_diagnostico ?? null,
      data_prevista_parto: data.data_prevista_parto ?? null,
      data_parto: data.data_parto ?? null,
      egua_name: data.egua_id ? names.get(data.egua_id) ?? null : null,
      garanhao_name: data.garanhao_id ? names.get(data.garanhao_id) ?? null : null,
      observacoes: data.observacoes ?? null,
    };
  },

  async updateGestationStatus(id: string, status: string): Promise<GestationItem> {
    const payload: Record<string, unknown> = {
      status: toDbGestationStatus(status),
      updated_at: new Date().toISOString(),
    };
    if (status === "nascimento") {
      payload.data_parto = new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabase
      .from("gestations")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) handleSupabaseError(error);
    const names = await loadAnimalNames(unique([data.egua_id, data.garanhao_id]));

    return {
      id: data.id,
      haras_id: data.haras_id,
      mare_id: data.egua_id ?? null,
      stallion_id: data.garanhao_id ?? null,
      status: mapDbGestationStatus(data.status),
      data_diagnostico: data.data_diagnostico ?? null,
      data_prevista_parto: data.data_prevista_parto ?? null,
      data_parto: data.data_parto ?? null,
      egua_name: data.egua_id ? names.get(data.egua_id) ?? null : null,
      garanhao_name: data.garanhao_id ? names.get(data.garanhao_id) ?? null : null,
      observacoes: data.observacoes ?? null,
    };
  },

  async getOverview(harasId: string) {
    const [events, gestations] = await Promise.all([
      this.listEvents(harasId),
      this.listGestations(harasId),
    ]);
    return { events, gestations };
  },
};
