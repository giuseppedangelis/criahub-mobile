import * as ImageManipulator from "expo-image-manipulator";

/**
 * PERF-02 (D-08): cap de 2000px no maior lado antes de upload.
 *
 * Chamado em todos os pontos que mandam foto pro Supabase Storage
 * (avatar, animal-media, field birth/issue, task execution).
 *
 * Se o manipulate falhar (URI inválida, imagem corrompida), retorna
 * o URI original — o upload segue com a imagem sem resize, preservando
 * comportamento anterior em vez de bloquear o usuário.
 */
export async function resizeForUpload(
  uri: string,
  maxDimension = 2000
): Promise<string> {
  if (!uri) return uri;
  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manip.uri;
  } catch (err) {
    console.warn("[image-upload] resize falhou, usando URI original:", err);
    return uri;
  }
}
