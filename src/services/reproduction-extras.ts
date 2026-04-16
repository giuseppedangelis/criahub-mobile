import { handleSupabaseError, supabase } from "@/src/services/base";

export interface StallionInventoryItem {
  stallion_id: string;
  stallion_name: string;
  total_entries: number;
  total_outputs: number;
  available: number;
}

export interface EmbryoItem {
  id: string;
  donor_id: string;
  donor_name: string | null;
  stallion_id: string | null;
  stallion_name: string | null;
  production_date: string;
  quantity: number;
  available: number;
  status: string | null;
  grade: string | null;
  observations: string | null;
}

export interface AddSemenMovementInput {
  haras_id: string;
  stallion_id: string;
  movement_type: "entrada" | "saida";
  units_paletas: number;
  semen_type?: "Fresco" | "Refrigerado" | "Congelado" | null;
  reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export const reproductionExtrasService = {
  async listSemenInventory(harasId: string): Promise<StallionInventoryItem[]> {
    if (!harasId) return [];
    const { data, error } = await supabase
      .from("semen_inventory_stallion")
      .select(
        "stallion_id, total_entries_paletas, total_outputs_paletas, available_paletas, animals:stallion_id(nome)"
      )
      .eq("haras_id", harasId);

    if (error) handleSupabaseError(error);

    const items: StallionInventoryItem[] = (data ?? []).map((row: any) => {
      const animal = Array.isArray(row.animals) ? row.animals[0] : row.animals;
      return {
        stallion_id: row.stallion_id,
        stallion_name: animal?.nome ?? "Garanhão",
        total_entries: Number(row.total_entries_paletas ?? 0) || 0,
        total_outputs: Number(row.total_outputs_paletas ?? 0) || 0,
        available: Number(row.available_paletas ?? 0) || 0,
      };
    });
    items.sort((a, b) => a.stallion_name.localeCompare(b.stallion_name));
    return items;
  },

  async addSemenMovement(input: AddSemenMovementInput): Promise<void> {
    if (!input.haras_id || !input.stallion_id) {
      throw new Error("Haras ou garanhão inválido.");
    }
    if (!Number.isFinite(input.units_paletas) || input.units_paletas <= 0) {
      throw new Error("Informe quantidade de paletas maior que zero.");
    }
    const { error } = await supabase.from("semen_movements").insert({
      haras_id: input.haras_id,
      stallion_id: input.stallion_id,
      movement_type: input.movement_type,
      units_paletas: Math.round(input.units_paletas),
      semen_type: input.semen_type ?? null,
      reason: input.reason?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: input.created_by ?? null,
    });
    if (error) handleSupabaseError(error);
  },

  async listEmbryos(harasId: string): Promise<EmbryoItem[]> {
    if (!harasId) return [];
    const { data, error } = await supabase
      .from("embryos")
      .select(
        `id, donor_id, stallion_id, production_date, quantity, available, status, grade, observations,
         donor:donor_id(nome), stallion:stallion_id(nome)`
      )
      .eq("haras_id", harasId)
      .order("production_date", { ascending: false })
      .limit(50);

    if (error) handleSupabaseError(error);

    return (data ?? []).map((row: any) => {
      const donor = Array.isArray(row.donor) ? row.donor[0] : row.donor;
      const stallion = Array.isArray(row.stallion) ? row.stallion[0] : row.stallion;
      return {
        id: row.id,
        donor_id: row.donor_id,
        donor_name: donor?.nome ?? null,
        stallion_id: row.stallion_id ?? null,
        stallion_name: stallion?.nome ?? null,
        production_date: row.production_date,
        quantity: Number(row.quantity ?? 0) || 0,
        available: Number(row.available ?? 0) || 0,
        status: row.status ?? null,
        grade: row.grade ?? null,
        observations: row.observations ?? null,
      };
    });
  },
};
