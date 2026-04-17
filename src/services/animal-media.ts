import { handleSupabaseError, supabase } from "@/src/services/base";
import { resizeForUpload } from "@/src/lib/image-upload";
import { storageNonce } from "@/src/lib/storage-nonce";

function sanitizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_\.]/g, "");
}

function guessImageMime(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

function extractPathFromPublicUrl(
  publicUrl: string,
  bucket: string
): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export const animalMediaService = {
  async addPhoto(animalId: string, harasId: string, uri: string): Promise<string[]> {
    if (!animalId || !harasId) throw new Error("Animal ou haras inválido.");
    // PERF-02 (D-08/D-09): redimensiona antes de subir. Helper força JPEG 0.8
    // a 2000px, então o contentType/extensão aqui viram jpeg.
    const resizedUri = await resizeForUpload(uri);
    const contentType = "image/jpeg";
    const ext = "jpg";
    // RLS-04 (D-01): injeta nonce no path para impedir enumeração.
    const nonce = storageNonce();
    const fileName = `${Date.now()}_${nonce}_${sanitizeName(animalId.slice(0, 8))}.${ext}`;
    const path = `${harasId}/animals/${animalId}/${fileName}`;

    const blob = await uriToBlob(resizedUri);
    const { error: uploadError } = await supabase.storage
      .from("animal-photos")
      .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
    if (uploadError) handleSupabaseError(uploadError);

    // A partir daqui, qualquer falha precisa remover o arquivo do storage
    // para não deixar mídia órfã.
    const rollback = async () => {
      try {
        await supabase.storage.from("animal-photos").remove([path]);
      } catch {
        // nada a fazer — log silencioso já cobre em outros fluxos
      }
    };

    try {
      const { data: urlData } = supabase.storage.from("animal-photos").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Erro ao obter URL da foto enviada.");

      const { data: current, error: readError } = await supabase
        .from("animals")
        .select("images, foto_url")
        .eq("id", animalId)
        .eq("haras_id", harasId)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!current) throw new Error("Animal não encontrado para anexar a foto.");

      const nextImages = Array.isArray(current.images) ? [...current.images] : [];
      nextImages.push(publicUrl);

      const payload: Record<string, unknown> = {
        images: nextImages,
        updated_at: new Date().toISOString(),
      };
      if (!current.foto_url) payload.foto_url = publicUrl;

      const { error: updateError } = await supabase
        .from("animals")
        .update(payload)
        .eq("id", animalId)
        .eq("haras_id", harasId);
      if (updateError) throw new Error(updateError.message);

      return nextImages;
    } catch (err) {
      await rollback();
      throw err instanceof Error ? err : new Error("Falha ao anexar foto.");
    }
  },

  async removePhoto(
    animalId: string,
    harasId: string,
    photoUrl: string
  ): Promise<string[]> {
    if (!animalId || !harasId || !photoUrl) {
      throw new Error("Parâmetros inválidos para remover foto.");
    }

    const { data: current, error: readError } = await supabase
      .from("animals")
      .select("images, foto_url")
      .eq("id", animalId)
      .eq("haras_id", harasId)
      .single();
    if (readError) handleSupabaseError(readError);

    const currentImages = Array.isArray(current?.images) ? current.images : [];
    const nextImages = currentImages.filter((url: string) => url !== photoUrl);

    const payload: Record<string, unknown> = {
      images: nextImages,
      updated_at: new Date().toISOString(),
    };
    if (current?.foto_url === photoUrl) {
      payload.foto_url = nextImages[0] ?? null;
    }

    const { error: updateError } = await supabase
      .from("animals")
      .update(payload)
      .eq("id", animalId)
      .eq("haras_id", harasId);
    if (updateError) handleSupabaseError(updateError);

    const storagePath = extractPathFromPublicUrl(photoUrl, "animal-photos");
    if (storagePath) {
      const { error: removeError } = await supabase.storage
        .from("animal-photos")
        .remove([storagePath]);
      if (removeError) {
        // Best-effort: não aborta; manter DB consistente.
        console.warn("Falha ao remover arquivo do storage:", removeError.message);
      }
    }

    return nextImages;
  },

  async addVideoLink(
    animalId: string,
    harasId: string,
    input: { title: string; url: string; type?: string | null; caption?: string | null }
  ): Promise<void> {
    if (!animalId || !harasId) throw new Error("Animal ou haras inválido.");
    const trimmedUrl = input.url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      throw new Error("Informe uma URL válida (começando com http ou https).");
    }

    const { error } = await supabase.from("animal_videos").insert({
      animal_id: animalId,
      haras_id: harasId,
      title: input.title.trim() || "Vídeo",
      url: trimmedUrl,
      type: input.type?.trim() || "Outro",
      source: "link",
      visibility: "Privado",
      caption: input.caption?.trim() || null,
    });
    if (error) handleSupabaseError(error);
  },

  async removeVideo(videoId: string, harasId: string): Promise<void> {
    if (!videoId || !harasId) throw new Error("Vídeo inválido.");
    const { error } = await supabase
      .from("animal_videos")
      .delete()
      .eq("id", videoId)
      .eq("haras_id", harasId);
    if (error) handleSupabaseError(error);
  },

  async addDocument(
    animalId: string,
    harasId: string,
    input: {
      fileUri: string;
      fileName: string;
      mimeType?: string | null;
      titulo: string;
      tipo: string;
      observacoes?: string | null;
    }
  ): Promise<void> {
    if (!animalId || !harasId) throw new Error("Animal ou haras inválido.");
    const safeName = sanitizeName(input.fileName || `documento-${Date.now()}`);
    // RLS-04 (D-02): nonce impede enumeração do bucket "documents" também.
    const nonce = storageNonce();
    const path = `${harasId}/animals/${animalId}/${Date.now()}_${nonce}_${safeName}`;

    const blob = await uriToBlob(input.fileUri);
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: input.mimeType || "application/octet-stream",
      });
    if (uploadError) handleSupabaseError(uploadError);

    const rollback = async () => {
      try {
        await supabase.storage.from("documents").remove([path]);
      } catch {
        // silencioso
      }
    };

    try {
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Erro ao obter URL do documento.");

      const { error: insertError } = await supabase.from("documents").insert({
        animal_id: animalId,
        haras_id: harasId,
        titulo: input.titulo.trim() || input.fileName,
        tipo: input.tipo.trim() || "outro",
        file_url: publicUrl,
        observacoes: input.observacoes?.trim() || null,
      });
      if (insertError) throw new Error(insertError.message);
    } catch (err) {
      await rollback();
      throw err instanceof Error ? err : new Error("Falha ao enviar documento.");
    }
  },

  async removeDocument(documentId: string, harasId: string): Promise<void> {
    if (!documentId || !harasId) throw new Error("Documento inválido.");
    const { data: current } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", documentId)
      .eq("haras_id", harasId)
      .maybeSingle();

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("haras_id", harasId);
    if (error) handleSupabaseError(error);

    if (current?.file_url) {
      const path = extractPathFromPublicUrl(current.file_url, "documents");
      if (path) {
        const { error: removeError } = await supabase.storage
          .from("documents")
          .remove([path]);
        if (removeError) {
          console.warn("Falha ao remover documento do storage:", removeError.message);
        }
      }
    }
  },
};
