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
