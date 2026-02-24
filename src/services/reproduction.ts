import { handleSupabaseError, supabase } from "@/src/services/base";
import type { GestationItem, ReproductionEventItem } from "@/src/types/domain";
import AsyncStorage from "@react-native-async-storage/async-storage";

function cacheKey(harasId: string) {
  return `@criahub:reproduction:${harasId}`;
}

function isNetworkLikeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("network") || message.includes("fetch") || message.includes("offline");
}

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

export const reproductionService = {
  async getOverview(harasId: string) {
    try {
      const [{ data: eventsData, error: eventsError }, { data: gestationsData, error: gestationsError }] =
        await Promise.all([
          supabase
            .from("reproductive_events")
            .select(
              "id, event_type, event_date, animal_id, mare_id, stallion_id, veterinarian, observations, status"
            )
            .eq("haras_id", harasId)
            .order("event_date", { ascending: false })
            .limit(30),
          supabase
            .from("gestations")
            .select(
              "id, status, data_diagnostico, data_prevista_parto, egua_id, garanhao_id, observacoes"
            )
            .eq("haras_id", harasId)
            .order("data_prevista_parto", { ascending: true })
            .limit(30),
        ]);

      if (eventsError) handleSupabaseError(eventsError);
      if (gestationsError) handleSupabaseError(gestationsError);

      const animalIds = unique([
        ...(eventsData ?? []).flatMap((event) => [event.animal_id, event.mare_id, event.stallion_id]),
        ...(gestationsData ?? []).flatMap((gestation) => [gestation.egua_id, gestation.garanhao_id]),
      ]);

      const namesMap = await loadAnimalNames(animalIds);

      const events: ReproductionEventItem[] = (eventsData ?? []).map((event) => ({
        id: event.id,
        event_type: event.event_type,
        event_date: event.event_date,
        status: event.status ?? null,
        veterinarian: event.veterinarian ?? null,
        animal_name: event.animal_id ? namesMap.get(event.animal_id) ?? null : null,
        mare_name: event.mare_id ? namesMap.get(event.mare_id) ?? null : null,
        stallion_name: event.stallion_id ? namesMap.get(event.stallion_id) ?? null : null,
        observations: event.observations ?? null,
      }));

      const gestations: GestationItem[] = (gestationsData ?? []).map((gestation) => ({
        id: gestation.id,
        status: gestation.status ?? null,
        data_diagnostico: gestation.data_diagnostico ?? null,
        data_prevista_parto: gestation.data_prevista_parto ?? null,
        egua_name: gestation.egua_id ? namesMap.get(gestation.egua_id) ?? null : null,
        garanhao_name: gestation.garanhao_id ? namesMap.get(gestation.garanhao_id) ?? null : null,
        observacoes: gestation.observacoes ?? null,
      }));

      const response = { events, gestations };
      await AsyncStorage.setItem(cacheKey(harasId), JSON.stringify(response));
      return response;
    } catch (error) {
      if (isNetworkLikeError(error)) {
        const cached = await AsyncStorage.getItem(cacheKey(harasId));
        if (cached) return JSON.parse(cached) as { events: ReproductionEventItem[]; gestations: GestationItem[] };
      }
      throw error;
    }
  },
};
