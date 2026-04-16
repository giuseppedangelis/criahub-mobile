import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  reproductionExtrasService,
  type AddSemenMovementInput,
} from "@/src/services/reproduction-extras";

export const reproductionExtrasKeys = {
  all: ["reproduction-extras"] as const,
  semenInventory: (harasId: string) =>
    [...reproductionExtrasKeys.all, "semen-inventory", harasId] as const,
  embryos: (harasId: string) =>
    [...reproductionExtrasKeys.all, "embryos", harasId] as const,
};

export function useSemenInventoryQuery(harasId: string | null | undefined) {
  return useQuery({
    queryKey: reproductionExtrasKeys.semenInventory(harasId ?? ""),
    queryFn: () => reproductionExtrasService.listSemenInventory(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 30_000,
  });
}

export function useEmbryosQuery(harasId: string | null | undefined) {
  return useQuery({
    queryKey: reproductionExtrasKeys.embryos(harasId ?? ""),
    queryFn: () => reproductionExtrasService.listEmbryos(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 30_000,
  });
}

export function useAddSemenMovementMutation(harasId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSemenMovementInput) =>
      reproductionExtrasService.addSemenMovement(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reproductionExtrasKeys.semenInventory(harasId ?? ""),
      });
    },
  });
}
