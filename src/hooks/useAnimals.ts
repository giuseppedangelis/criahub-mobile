import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { animalsService } from "@/src/services/animals";
import { animalDetailsKeys } from "@/src/hooks/useAnimalDetails";
import type {
  AnimalFilters,
  PaginationParams,
  UpdateAnimalInput,
} from "@/src/types/domain";

export const animalKeys = {
  all: ["animals"] as const,
  list: (filters: AnimalFilters, pagination: PaginationParams) =>
    [...animalKeys.all, "list", filters, pagination] as const,
  detail: (id: string) => [...animalKeys.all, "detail", id] as const,
};

export function useAnimalsQuery(
  filters: AnimalFilters,
  pagination: PaginationParams,
  enabled = true
) {
  const hasHaras = Boolean(filters.haras_id);

  return useQuery({
    queryKey: animalKeys.list(filters, pagination),
    queryFn: () => animalsService.list(filters, pagination),
    enabled: enabled && hasHaras,
  });
}

export function useAnimalQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: animalKeys.detail(id),
    queryFn: () => animalsService.getById(id),
    enabled: enabled && Boolean(id),
  });
}

export function useUpdateAnimalMutation(animalId: string, harasId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAnimalInput) =>
      animalsService.update(animalId, harasId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: animalKeys.all }),
        queryClient.invalidateQueries({
          queryKey: animalDetailsKeys.detail(animalId, harasId),
        }),
      ]);
    },
  });
}
