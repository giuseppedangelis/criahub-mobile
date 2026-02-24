import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldService } from "@/src/services/field";
import type { FieldBirthInput, FieldIssueInput } from "@/src/types/domain";

export const fieldKeys = {
  all: ["field"] as const,
  sync: (harasId: string) => [...fieldKeys.all, "sync", harasId] as const,
};

export function useFieldSyncSnapshotQuery(harasId?: string | null) {
  return useQuery({
    queryKey: fieldKeys.sync(harasId || ""),
    queryFn: () => fieldService.getSyncSnapshot(),
    enabled: Boolean(harasId),
    refetchInterval: 5000,
  });
}

function useFieldInvalidate(harasId?: string | null) {
  const queryClient = useQueryClient();
  return async () => {
    if (!harasId) return;
    await queryClient.invalidateQueries({ queryKey: fieldKeys.sync(harasId) });
  };
}

export function useReportBirthMutation(harasId?: string | null) {
  const invalidate = useFieldInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: FieldBirthInput) => fieldService.reportBirth(payload),
    onSuccess: invalidate,
  });
}

export function useReportIssueMutation(harasId?: string | null) {
  const invalidate = useFieldInvalidate(harasId);
  return useMutation({
    mutationFn: (payload: FieldIssueInput) => fieldService.reportIssue(payload),
    onSuccess: invalidate,
  });
}

export function useFlushFieldQueueMutation(harasId?: string | null) {
  const invalidate = useFieldInvalidate(harasId);
  return useMutation({
    mutationFn: () => fieldService.flushOfflineQueue(),
    onSuccess: invalidate,
  });
}
