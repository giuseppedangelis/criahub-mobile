import { useQuery } from "@tanstack/react-query";
import { animalDetailsService } from "@/src/services/animal-details";

export const animalDetailsKeys = {
  all: ["animal-details"] as const,
  detail: (animalId: string, harasId: string) =>
    [...animalDetailsKeys.all, "detail", animalId, harasId] as const,
};

export function useAnimalDetailsQuery(animalId?: string | null, harasId?: string | null) {
  return useQuery({
    queryKey: animalDetailsKeys.detail(animalId || "", harasId || ""),
    queryFn: () => animalDetailsService.getByAnimal(animalId as string, harasId as string),
    enabled: Boolean(animalId && harasId),
  });
}
