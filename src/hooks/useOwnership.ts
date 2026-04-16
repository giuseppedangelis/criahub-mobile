import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { animalsService } from "@/src/services/animals";
import { ownershipService } from "@/src/services/ownership";
import { animalKeys } from "@/src/hooks/useAnimals";
import { animalDetailsKeys } from "@/src/hooks/useAnimalDetails";
import type { SaveAnimalOwnershipSharesInput } from "@/src/types/domain";

export const ownershipKeys = {
  all: ["ownership"] as const,
  shares: (animalId: string) => [...ownershipKeys.all, "shares", animalId] as const,
  upcomingTerminations: (harasId: string) =>
    [...ownershipKeys.all, "upcoming", harasId] as const,
};

export function useActiveOwnershipSharesQuery(
  animalId: string,
  harasId: string,
  enabled = true
) {
  return useQuery({
    queryKey: ownershipKeys.shares(animalId),
    queryFn: () => ownershipService.listActive(animalId, harasId),
    enabled: enabled && Boolean(animalId) && Boolean(harasId),
    staleTime: 30_000,
  });
}

export function useUpcomingTerminationsQuery(harasId: string, daysAhead = 45) {
  return useQuery({
    queryKey: ownershipKeys.upcomingTerminations(harasId),
    queryFn: () => ownershipService.listUpcomingTerminations(harasId, daysAhead),
    enabled: Boolean(harasId),
    staleTime: 60_000,
  });
}

function useInvalidateAnimal(animalId: string, harasId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ownershipKeys.shares(animalId) }),
      queryClient.invalidateQueries({ queryKey: ownershipKeys.upcomingTerminations(harasId) }),
      queryClient.invalidateQueries({ queryKey: animalKeys.detail(animalId) }),
      queryClient.invalidateQueries({ queryKey: animalDetailsKeys.detail(animalId, harasId) }),
    ]);
}

export function useSaveOwnershipSharesMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimal(animalId, harasId);
  return useMutation({
    mutationFn: (input: SaveAnimalOwnershipSharesInput) => ownershipService.save(input),
    onSuccess: invalidate,
  });
}

export function useSetAnimalPresenceMutation(animalId: string, harasId: string) {
  const invalidate = useInvalidateAnimal(animalId, harasId);
  return useMutation({
    mutationFn: (isAtHaras: boolean) => animalsService.setPresence(animalId, harasId, isAtHaras),
    onSuccess: invalidate,
  });
}
