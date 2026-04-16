import { handleSupabaseError, supabase } from "@/src/services/base";

export interface UpdateProfileInput {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

function sanitizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_\.]/g, "");
}

function extractPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export const profileService = {
  async update(userId: string, input: UpdateProfileInput): Promise<void> {
    if (!userId) throw new Error("Usuário inválido.");
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.full_name !== undefined) payload.full_name = input.full_name;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.avatar_url !== undefined) payload.avatar_url = input.avatar_url;

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) handleSupabaseError(error);
  },

  async uploadAvatar(userId: string, uri: string): Promise<string> {
    if (!userId || !uri) throw new Error("Parâmetros inválidos.");
    const lower = uri.split("?")[0].toLowerCase();
    const ext = lower.endsWith(".png") ? "png" : lower.endsWith(".webp") ? "webp" : "jpg";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const path = `${userId}/${Date.now()}_${sanitizeName("avatar")}.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
    if (uploadError) handleSupabaseError(uploadError);

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Erro ao obter URL do avatar.");
    return data.publicUrl;
  },

  async removeAvatar(url: string): Promise<void> {
    const path = extractPathFromPublicUrl(url, "avatars");
    if (!path) return;
    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) {
      // silent fail: não aborta
      console.warn("Falha ao remover avatar:", error.message);
    }
  },
};
