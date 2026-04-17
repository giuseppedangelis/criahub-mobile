import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeMembershipStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export async function resolveUserHarasId(
  client: SupabaseClient,
  userId: string,
  profileHarasId: string | null
): Promise<string | null> {
  if (profileHarasId) return profileHarasId;

  const { data, error } = await client
    .from("haras_members")
    .select("haras_id, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) return null;

  const activeMembership = data.find((item) =>
    normalizeMembershipStatus(item.status).startsWith("ativo")
  );

  if (activeMembership?.haras_id) return activeMembership.haras_id as string;

  const fallbackMembership = data.find((item) => Boolean(item.haras_id));
  return (fallbackMembership?.haras_id as string | undefined) ?? null;
}

export interface UserHarasMembership {
  haras_id: string;
  haras_name: string;
  role: string;
}

/**
 * AUTH-02 (D-11): lista todos os haras ativos onde o usuário tem membership.
 * Usado pelo AccountScreen para oferecer hot-swap quando o usuário pertence a
 * mais de um haras. RLS em haras_members + haras garante que o resultado já
 * vem filtrado pelo próprio backend.
 */
export async function listUserHaras(
  client: SupabaseClient,
  userId: string
): Promise<UserHarasMembership[]> {
  const { data, error } = await client
    .from("haras_members")
    .select("haras_id, role, status, haras:haras_id(id, nome)")
    .eq("user_id", userId);

  if (error || !data?.length) return [];

  const active = data.filter((item) =>
    normalizeMembershipStatus(item.status).startsWith("ativo")
  );

  const byId = new Map<string, UserHarasMembership>();
  for (const row of active) {
    const harasId = (row as { haras_id?: unknown }).haras_id;
    if (typeof harasId !== "string" || !harasId) continue;
    const harasJoin = (row as { haras?: unknown }).haras;
    // Supabase retorna o join como object (maybe-single) quando FK é única.
    // Mantemos fallback para array defensivo.
    const harasObj = Array.isArray(harasJoin) ? harasJoin[0] : harasJoin;
    const harasName =
      harasObj && typeof harasObj === "object" && "nome" in harasObj
        ? String((harasObj as { nome?: unknown }).nome ?? "")
        : "";
    const roleRaw = (row as { role?: unknown }).role;
    const role = typeof roleRaw === "string" ? roleRaw : "";

    if (!byId.has(harasId)) {
      byId.set(harasId, {
        haras_id: harasId,
        haras_name: harasName || "Haras sem nome",
        role,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.haras_name.localeCompare(b.haras_name, "pt-BR")
  );
}
