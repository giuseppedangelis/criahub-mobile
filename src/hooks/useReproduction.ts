import { useQuery } from "@tanstack/react-query";
import { reproductionService } from "@/src/services/reproduction";

export const reproductionKeys = {
  all: ["reproduction"] as const,
  overview: (harasId: string) => [...reproductionKeys.all, "overview", harasId] as const,
};

export function useReproductionOverviewQuery(harasId?: string | null) {
  return useQuery({
    queryKey: reproductionKeys.overview(harasId || ""),
    queryFn: () => reproductionService.getOverview(harasId as string),
    enabled: Boolean(harasId),
  });
}
