import { handleSupabaseError, supabase } from "@/src/services/base";
import type {
  AnimalOwnershipShare,
  OwnershipShareDraft,
  OwnershipTerminationType,
  SaveAnimalOwnershipSharesInput,
  UpcomingTerminationItem,
} from "@/src/types/domain";

const SHARE_SELECT_FIELDS = `
  id, animal_id, haras_id, owner_name, percentage, is_primary,
  start_date, end_date, notes, source,
  termination_type, termination_date, termination_age_years,
  physical_location, is_external,
  created_at, updated_at
`;

function normalizeShare(row: any): AnimalOwnershipShare {
  return {
    id: row.id,
    animal_id: row.animal_id,
    haras_id: row.haras_id,
    owner_name: row.owner_name,
    percentage:
      typeof row.percentage === "number"
        ? row.percentage
        : Number.parseFloat(String(row.percentage ?? 0)) || 0,
    is_primary: Boolean(row.is_primary),
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    notes: row.notes ?? null,
    source: row.source ?? null,
    termination_type: (row.termination_type as OwnershipTerminationType | null) ?? null,
    termination_date: row.termination_date ?? null,
    termination_age_years: row.termination_age_years ?? null,
    physical_location: row.physical_location ?? null,
    is_external: Boolean(row.is_external),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number): Date {
  const base = new Date(`${isoDate}T00:00:00`);
  base.setFullYear(base.getFullYear() + years);
  return base;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86400000);
}

export const ownershipService = {
  async listActive(animalId: string, harasId: string): Promise<AnimalOwnershipShare[]> {
    if (!animalId || !harasId) return [];
    const todayStr = today();
    const { data, error } = await supabase
      .from("animal_ownership_shares")
      .select(SHARE_SELECT_FIELDS)
      .eq("animal_id", animalId)
      .eq("haras_id", harasId)
      .or(`end_date.is.null,end_date.gte.${todayStr}`)
      .order("is_primary", { ascending: false })
      .order("percentage", { ascending: false })
      .order("owner_name", { ascending: true });

    if (error) handleSupabaseError(error);
    return (data || []).map(normalizeShare);
  },

  async save(input: SaveAnimalOwnershipSharesInput): Promise<AnimalOwnershipShare[]> {
    const { animalId, harasId, shares } = input;
    if (!animalId || !harasId) {
      throw new Error("Animal ou haras inválido para salvar cotas.");
    }
    if (!shares.length) {
      throw new Error("Informe ao menos um cotista.");
    }

    const normalized = shares.map((share) => ({
      id: share.id,
      owner_name: share.owner_name.trim(),
      percentage:
        typeof share.percentage === "number"
          ? share.percentage
          : Number.parseFloat(String(share.percentage ?? 0)) || 0,
      is_primary: Boolean(share.is_primary),
      start_date: share.start_date ?? null,
      termination_type: share.termination_type ?? null,
      termination_date: share.termination_date ?? null,
      termination_age_years: share.termination_age_years ?? null,
      physical_location: share.physical_location?.trim() || null,
      is_external: Boolean(share.is_external),
    }));

    if (normalized.some((s) => !s.owner_name)) {
      throw new Error("Preencha o nome de todos os cotistas.");
    }
    if (normalized.some((s) => !Number.isFinite(s.percentage) || s.percentage <= 0)) {
      throw new Error("Toda cota precisa ter um percentual maior que zero.");
    }
    const totalPct = normalized.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error("A soma das cotas ativas precisa fechar em 100%.");
    }

    const seenNames = new Set<string>();
    for (const s of normalized) {
      const key = s.owner_name.toUpperCase();
      if (seenNames.has(key)) {
        throw new Error("Não repita o mesmo cotista nas cotas ativas.");
      }
      seenNames.add(key);
    }

    const primaryIndex = normalized.findIndex((s) => s.is_primary);
    const resolvedPrimary = primaryIndex >= 0 ? primaryIndex : 0;
    const prepared = normalized.map((s, index) => ({
      ...s,
      is_primary: index === resolvedPrimary,
    }));

    const todayStr = today();

    const { data: existingActive, error: existingError } = await supabase
      .from("animal_ownership_shares")
      .select("id")
      .eq("animal_id", animalId)
      .eq("haras_id", harasId)
      .or(`end_date.is.null,end_date.gte.${todayStr}`);

    if (existingError) handleSupabaseError(existingError);

    const existingIds = new Set((existingActive || []).map((row) => row.id));
    const incomingIds = new Set(
      prepared
        .map((s) => s.id)
        .filter((id): id is string => Boolean(id && existingIds.has(id)))
    );

    for (const share of prepared) {
      if (share.id && existingIds.has(share.id)) {
        const updatePayload: Record<string, unknown> = {
          owner_name: share.owner_name,
          percentage: share.percentage,
          is_primary: share.is_primary,
          end_date: null,
          termination_type: share.termination_type,
          termination_date: share.termination_date,
          termination_age_years: share.termination_age_years,
          physical_location: share.physical_location,
          is_external: share.is_external,
          updated_at: new Date().toISOString(),
        };
        if (share.start_date) updatePayload.start_date = share.start_date;
        const { error: updateError } = await supabase
          .from("animal_ownership_shares")
          .update(updatePayload)
          .eq("id", share.id)
          .eq("animal_id", animalId)
          .eq("haras_id", harasId);
        if (updateError) handleSupabaseError(updateError);
        continue;
      }

      const { error: insertError } = await supabase
        .from("animal_ownership_shares")
        .insert({
          animal_id: animalId,
          haras_id: harasId,
          owner_name: share.owner_name,
          percentage: share.percentage,
          is_primary: share.is_primary,
          start_date: share.start_date || todayStr,
          end_date: null,
          source: "manual",
          termination_type: share.termination_type,
          termination_date: share.termination_date,
          termination_age_years: share.termination_age_years,
          physical_location: share.physical_location,
          is_external: share.is_external,
        });
      if (insertError) handleSupabaseError(insertError);
    }

    const toDeactivate = (existingActive || []).filter((row) => !incomingIds.has(row.id));
    for (const row of toDeactivate) {
      const { error: deactivateError } = await supabase
        .from("animal_ownership_shares")
        .update({
          is_primary: false,
          end_date: todayStr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("animal_id", animalId)
        .eq("haras_id", harasId);
      if (deactivateError) handleSupabaseError(deactivateError);
    }

    const primaryOwner = prepared[resolvedPrimary]?.owner_name || prepared[0].owner_name;
    const hasExternalShare = prepared.some((s) => s.is_external);
    const animalPayload: Record<string, unknown> = {
      proprietario: primaryOwner,
      updated_at: new Date().toISOString(),
    };
    if (hasExternalShare) {
      animalPayload.is_at_haras = false;
      animalPayload.presence_manual_override = false;
    }
    const { error: animalErr } = await supabase
      .from("animals")
      .update(animalPayload)
      .eq("id", animalId)
      .eq("haras_id", harasId);
    if (animalErr) handleSupabaseError(animalErr);

    return this.listActive(animalId, harasId);
  },

  async listUpcomingTerminations(
    harasId: string,
    daysAhead: number = 45
  ): Promise<UpcomingTerminationItem[]> {
    if (!harasId) return [];
    const todayStr = today();

    const { data, error } = await supabase
      .from("animal_ownership_shares")
      .select(
        `animal_id, haras_id, owner_name, termination_type, termination_date, termination_age_years, physical_location,
         animals!inner(id, nome, data_nascimento, proprietario)`
      )
      .eq("haras_id", harasId)
      .eq("is_primary", true)
      .or(`end_date.is.null,end_date.gte.${todayStr}`)
      .not("termination_type", "is", null);

    if (error) handleSupabaseError(error);

    const now = new Date(`${todayStr}T00:00:00`);
    const horizon = new Date(now.getTime() + daysAhead * 86400000);
    const results: UpcomingTerminationItem[] = [];

    for (const row of (data as any[]) || []) {
      const animalRow = Array.isArray(row.animals) ? row.animals[0] : row.animals;
      if (!animalRow) continue;

      let due: Date | null = null;
      if (row.termination_type === "date" && row.termination_date) {
        due = new Date(`${row.termination_date}T00:00:00`);
      } else if (
        row.termination_type === "age" &&
        row.termination_age_years &&
        animalRow.data_nascimento
      ) {
        due = addYears(animalRow.data_nascimento, Number(row.termination_age_years));
      }
      if (!due) continue;
      if (due.getTime() > horizon.getTime()) continue;

      results.push({
        animal_id: row.animal_id,
        animal_name: animalRow.nome ?? "Animal",
        haras_id: row.haras_id,
        termination_type: row.termination_type as OwnershipTerminationType,
        due_date: due.toISOString().slice(0, 10),
        days_remaining: daysBetween(now, due),
        physical_location: row.physical_location ?? null,
        primary_owner: animalRow.proprietario ?? row.owner_name ?? null,
      });
    }

    results.sort((a, b) => a.days_remaining - b.days_remaining);
    return results;
  },
};
