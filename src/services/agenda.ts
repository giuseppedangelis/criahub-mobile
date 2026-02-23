import { handleSupabaseError, supabase } from "@/src/services/base";
import type { AgendaEventItem } from "@/src/types/domain";

function unique(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

export const agendaService = {
  async list(harasId: string): Promise<AgendaEventItem[]> {
    const { data, error } = await supabase
      .from("events")
      .select("id, titulo, descricao, data_inicio, data_fim, tipo, status, local, responsavel, animal_id")
      .eq("haras_id", harasId)
      .order("data_inicio", { ascending: true })
      .limit(40);

    if (error) handleSupabaseError(error);

    const animalIds = unique((data ?? []).map((item) => item.animal_id));

    let namesMap = new Map<string, string>();
    if (animalIds.length > 0) {
      const { data: animalsData, error: animalError } = await supabase
        .from("animals")
        .select("id, nome")
        .in("id", animalIds);

      if (animalError) handleSupabaseError(animalError);
      namesMap = new Map((animalsData ?? []).map((item) => [item.id, item.nome]));
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao ?? null,
      data_inicio: item.data_inicio,
      data_fim: item.data_fim ?? null,
      tipo: item.tipo,
      status: item.status ?? null,
      local: item.local ?? null,
      responsavel: item.responsavel ?? null,
      animal_name: item.animal_id ? namesMap.get(item.animal_id) ?? null : null,
    }));
  },
};
