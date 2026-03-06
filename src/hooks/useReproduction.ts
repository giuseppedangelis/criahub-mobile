import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reproductionService } from "@/src/services/reproduction";
import type { CreateGestationInput, CreateReproductiveEventInput } from "@/src/types/domain";

export const reproductionKeys = {
  all: ["reproduction"] as const,
  overview: (harasId: string) => [...reproductionKeys.all, "overview", harasId] as const,
  events: (harasId: string) => [...reproductionKeys.all, "events", harasId] as const,
  gestations: (harasId: string) => [...reproductionKeys.all, "gestations", harasId] as const,
  stats: (harasId: string) => [...reproductionKeys.all, "stats", harasId] as const,
};

export function useReproductionOverviewQuery(harasId?: string | null) {
  return useQuery({
    queryKey: reproductionKeys.overview(harasId || ""),
    queryFn: () => reproductionService.getOverview(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useReproductiveEventsQuery(harasId?: string | null) {
  return useQuery({
    queryKey: reproductionKeys.events(harasId || ""),
    queryFn: () => reproductionService.listEvents(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useGestationsQuery(harasId?: string | null) {
  return useQuery({
    queryKey: reproductionKeys.gestations(harasId || ""),
    queryFn: () => reproductionService.listGestations(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useReproductionStatsQuery(harasId?: string | null) {
  return useQuery({
    queryKey: reproductionKeys.stats(harasId || ""),
    queryFn: () => reproductionService.getStats(harasId as string),
    enabled: Boolean(harasId),
  });
}

function useInvalidateReproduction() {
  const queryClient = useQueryClient();
  return async (harasId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: reproductionKeys.all }),
      harasId
        ? queryClient.invalidateQueries({ queryKey: reproductionKeys.events(harasId) })
        : Promise.resolve(),
      harasId
        ? queryClient.invalidateQueries({ queryKey: reproductionKeys.gestations(harasId) })
        : Promise.resolve(),
      harasId
        ? queryClient.invalidateQueries({ queryKey: reproductionKeys.stats(harasId) })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ["agenda"] }),
      queryClient.invalidateQueries({ queryKey: ["vet-chart"] }),
    ]);
  };
}

export function useCreateReproductiveEventMutation() {
  const invalidate = useInvalidateReproduction();
  return useMutation({
    mutationFn: (input: CreateReproductiveEventInput) => reproductionService.createEvent(input),
    onSuccess: (data) => invalidate(data.haras_id || undefined),
  });
}

export function useCreateGestationMutation() {
  const invalidate = useInvalidateReproduction();
  return useMutation({
    mutationFn: (input: CreateGestationInput) => reproductionService.createGestation(input),
    onSuccess: (data) => invalidate(data.haras_id || undefined),
  });
}

export function useUpdateGestationStatusMutation() {
  const invalidate = useInvalidateReproduction();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reproductionService.updateGestationStatus(id, status),
    onSuccess: (data) => invalidate(data.haras_id || undefined),
  });
}
