import { handleSupabaseError, supabase } from "@/src/services/base";

export interface HarasLocationSettings {
  baias: string[];
  pastos: string[];
  servicos: string[];
  partner_locations: string[];
}

export const DEFAULT_HARAS_LOCATION_SETTINGS: HarasLocationSettings = {
  baias: ["Baia 01", "Baia 02", "Baia 03"],
  pastos: ["Pasto Maternidade", "Pasto Norte", "Pasto Sul"],
  servicos: ["Centro de Treinamento", "Hospedagem Externa"],
  partner_locations: [],
};

function normalizeList(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return [...fallback];
  const seen = new Set<string>();
  const items = (input as unknown[])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .filter((value) => {
      const key = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  items.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  return items;
}

function normalizeSettings(row: any): HarasLocationSettings {
  const source = row?.location_settings ?? {};
  return {
    baias: normalizeList(source.baias, DEFAULT_HARAS_LOCATION_SETTINGS.baias),
    pastos: normalizeList(source.pastos, DEFAULT_HARAS_LOCATION_SETTINGS.pastos),
    servicos: normalizeList(source.servicos, DEFAULT_HARAS_LOCATION_SETTINGS.servicos),
    partner_locations: normalizeList(source.partner_locations, []),
  };
}

export const harasSettingsService = {
  async getLocationSettings(harasId: string): Promise<HarasLocationSettings> {
    if (!harasId) return { ...DEFAULT_HARAS_LOCATION_SETTINGS };
    const { data, error } = await supabase
      .from("haras_settings")
      .select("location_settings")
      .eq("haras_id", harasId)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return normalizeSettings(data);
  },
};
