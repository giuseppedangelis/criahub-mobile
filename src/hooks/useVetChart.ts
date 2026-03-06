import { useQuery } from "@tanstack/react-query";
import { vetChartService } from "@/src/services/vet-chart";

export const vetChartKeys = {
  all: ["vet-chart"] as const,
  clinical: (harasId: string, animalId: string) => [...vetChartKeys.all, "clinical", harasId, animalId] as const,
};

export function useVetChartClinicalQuery(harasId?: string | null, animalId?: string | null) {
  return useQuery({
    queryKey: vetChartKeys.clinical(harasId || "", animalId || ""),
    queryFn: () => vetChartService.getClinicalSnapshot(harasId as string, animalId as string),
    enabled: Boolean(harasId && animalId),
  });
}
