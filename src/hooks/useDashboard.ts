import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/src/services/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  creator: (harasId: string) => [...dashboardKeys.all, "creator", harasId] as const,
};

export function useCreatorDashboardQuery(harasId: string | null | undefined) {
  return useQuery({
    queryKey: dashboardKeys.creator(harasId || ""),
    queryFn: () => dashboardService.getCreatorDashboard(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 60_000,
  });
}
