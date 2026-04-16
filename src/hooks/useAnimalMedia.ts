import { useMutation, useQueryClient } from "@tanstack/react-query";
import { animalMediaService } from "@/src/services/animal-media";
import { animalKeys } from "@/src/hooks/useAnimals";
import { animalDetailsKeys } from "@/src/hooks/useAnimalDetails";

function useInvalidateAnimalMedia(animalId: string, harasId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: animalKeys.detail(animalId) }),
      queryClient.invalidateQueries({
        queryKey: animalDetailsKeys.detail(animalId, harasId),
      }),
    ]);
}

export function useAddPhotoMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (uri: string) => animalMediaService.addPhoto(animalId, harasId, uri),
    onSuccess: invalidate,
  });
}

export function useRemovePhotoMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (photoUrl: string) =>
      animalMediaService.removePhoto(animalId, harasId, photoUrl),
    onSuccess: invalidate,
  });
}

export function useAddVideoLinkMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (input: {
      title: string;
      url: string;
      type?: string | null;
      caption?: string | null;
    }) => animalMediaService.addVideoLink(animalId, harasId, input),
    onSuccess: invalidate,
  });
}

export function useRemoveVideoMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (videoId: string) => animalMediaService.removeVideo(videoId, harasId),
    onSuccess: invalidate,
  });
}

export function useAddDocumentMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (input: {
      fileUri: string;
      fileName: string;
      mimeType?: string | null;
      titulo: string;
      tipo: string;
      observacoes?: string | null;
    }) => animalMediaService.addDocument(animalId, harasId, input),
    onSuccess: invalidate,
  });
}

export function useRemoveDocumentMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimalMedia(animalId, harasId);
  return useMutation({
    mutationFn: (documentId: string) =>
      animalMediaService.removeDocument(documentId, harasId),
    onSuccess: invalidate,
  });
}
