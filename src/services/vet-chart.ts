import { handleSupabaseError, supabase } from "@/src/services/base";

export type VetChartClinicalSnapshot = {
  reproductiveEvents: Array<{
    id: string;
    event_type: string;
    event_date: string;
    status: string | null;
    observations: string | null;
  }>;
  biometry: {
    weight: string | number | null;
    height: string | number | null;
    status_manejo: string | null;
    andamento: string | null;
  } | null;
};

export const vetChartService = {
  async getClinicalSnapshot(harasId: string, animalId: string): Promise<VetChartClinicalSnapshot> {
    const [reproRes, bioRes] = await Promise.all([
      supabase
        .from("reproductive_events")
        .select("id, event_type, event_date, status, observations")
        .eq("haras_id", harasId)
        .or(`animal_id.eq.${animalId},mare_id.eq.${animalId},stallion_id.eq.${animalId}`)
        .order("event_date", { ascending: false })
        .limit(40),
      supabase
        .from("animals")
        .select("weight, height, status_manejo, andamento")
        .eq("haras_id", harasId)
        .eq("id", animalId)
        .single(),
    ]);

    if (reproRes.error) handleSupabaseError(reproRes.error);
    if (bioRes.error) handleSupabaseError(bioRes.error);

    return {
      reproductiveEvents: (reproRes.data ?? []).map((item) => ({
        id: item.id,
        event_type: item.event_type,
        event_date: item.event_date,
        status: item.status ?? null,
        observations: item.observations ?? null,
      })),
      biometry: bioRes.data
        ? {
            weight: bioRes.data.weight ?? null,
            height: bioRes.data.height ?? null,
            status_manejo: bioRes.data.status_manejo ?? null,
            andamento: bioRes.data.andamento ?? null,
          }
        : null,
    };
  },
};
