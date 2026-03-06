import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { veterinaryService } from "@/src/services/veterinary";
import type {
  BreedingEventInput,
  HealthBatchInput,
  LavageOutcomeInput,
  ReproductiveExamInput,
  SemenEntryInput,
  TreatmentInput,
} from "@/src/types/domain";

export const veterinaryKeys = {
  all: ["veterinary"] as const,
  dashboard: (harasId: string) => [...veterinaryKeys.all, "dashboard", harasId] as const,
  semen: (harasId: string) => [...veterinaryKeys.all, "semen", harasId] as const,
  sync: (harasId: string) => [...veterinaryKeys.all, "sync", harasId] as const,
};

export function useVeterinaryDashboardQuery(harasId?: string | null) {
  return useQuery({
    queryKey: veterinaryKeys.dashboard(harasId || ""),
    queryFn: () => veterinaryService.getDashboard(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useSemenInventoryQuery(harasId?: string | null) {
  return useQuery({
    queryKey: veterinaryKeys.semen(harasId || ""),
    queryFn: () => veterinaryService.getSemenInventory(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useVeterinarySyncSnapshotQuery(harasId?: string | null) {
  return useQuery({
    queryKey: veterinaryKeys.sync(harasId || ""),
    queryFn: () => veterinaryService.getSyncSnapshot(),
    enabled: Boolean(harasId),
    refetchInterval: 5000,
  });
}

function useVeterinaryInvalidate(harasId?: string | null) {
  const queryClient = useQueryClient();
  return async () => {
    if (!harasId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: veterinaryKeys.dashboard(harasId) }),
      queryClient.invalidateQueries({ queryKey: veterinaryKeys.semen(harasId) }),
      queryClient.invalidateQueries({ queryKey: veterinaryKeys.sync(harasId) }),
      queryClient.invalidateQueries({ queryKey: ["reproduction"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda"] }),
      queryClient.invalidateQueries({ queryKey: ["vet-chart"] }),
    ]);
  };
}

export function useCreateReproductiveExamMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: ReproductiveExamInput) => veterinaryService.createReproductiveExam(payload),
    onSuccess: invalidate,
  });
}

export function useCreateBreedingEventMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: BreedingEventInput) => veterinaryService.createBreedingEvent(payload),
    onSuccess: invalidate,
  });
}

export function useCreateHealthBatchMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: HealthBatchInput) => veterinaryService.createHealthBatch(payload),
    onSuccess: invalidate,
  });
}

export function useAddSemenEntryMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: SemenEntryInput) => veterinaryService.addSemenEntry(payload),
    onSuccess: invalidate,
  });
}

export function useCompleteVetTaskMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (taskId: string) => veterinaryService.completeTask({ taskId, harasId: harasId as string }),
    onSuccess: invalidate,
  });
}

export function useFlushVetQueueMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: () => veterinaryService.flushOfflineQueue(),
    onSuccess: invalidate,
  });
}

export function useRegisterLavageOutcomeMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: LavageOutcomeInput) => veterinaryService.registerLavageOutcome(payload),
    onSuccess: invalidate,
  });
}

export function useCreateTreatmentMutation(harasId?: string | null) {
  const invalidate = useVeterinaryInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: TreatmentInput) => veterinaryService.createTreatment(payload),
    onSuccess: invalidate,
  });
}
