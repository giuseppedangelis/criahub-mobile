import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldNotificationService } from "@/src/services/field-notifications";
import { fieldService } from "@/src/services/field";
import type { FieldBirthInput, FieldIssueInput } from "@/src/types/domain";

export const fieldKeys = {
  all: ["field"] as const,
  sync: (harasId: string) => [...fieldKeys.all, "sync", harasId] as const,
  myPendings: (harasId: string, userId: string) => [...fieldKeys.all, "my-pendings", harasId, userId] as const,
  notificationReads: (harasId: string, userId: string) => [...fieldKeys.all, "notification-reads", harasId, userId] as const,
};

export function useFieldSyncSnapshotQuery(harasId?: string | null) {
  return useQuery({
    queryKey: fieldKeys.sync(harasId || ""),
    queryFn: () => fieldService.getSyncSnapshot(),
    enabled: Boolean(harasId),
    refetchInterval: 5000,
  });
}

export function useMyFieldPendingValidationsQuery(harasId?: string | null, userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: fieldKeys.myPendings(harasId || "", userId || ""),
    queryFn: () => fieldService.listMyPendingValidations(harasId as string, userId as string),
    enabled: Boolean(enabled && harasId && userId),
    refetchInterval: 8000,
  });
}

export function useFieldNotificationReadsQuery(harasId?: string | null, userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: fieldKeys.notificationReads(harasId || "", userId || ""),
    queryFn: () => fieldNotificationService.readMap(harasId as string, userId as string),
    enabled: Boolean(enabled && harasId && userId),
  });
}

function useFieldInvalidate(harasId?: string | null) {
  const queryClient = useQueryClient();
  return async () => {
    if (!harasId) {
      await queryClient.invalidateQueries({ queryKey: fieldKeys.all });
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: fieldKeys.sync(harasId) }),
      queryClient.invalidateQueries({ queryKey: fieldKeys.all }),
    ]);
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

export function useMarkFieldNotificationReadMutation(harasId?: string | null, userId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pendingId: string) => fieldNotificationService.markRead(harasId as string, userId as string, pendingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fieldKeys.all }),
  });
}

export function useMarkAllFieldNotificationsReadMutation(harasId?: string | null, userId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pendingIds: string[]) =>
      fieldNotificationService.markAllRead(harasId as string, userId as string, pendingIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fieldKeys.all }),
  });
}
