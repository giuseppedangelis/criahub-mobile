import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksService } from "@/src/services/tasks";
import type { CreateTaskInput, ExecuteTaskInput, TaskListFilters, UpdateTaskInput } from "@/src/types/domain";

export const tasksKeys = {
  all: ["tasks"] as const,
  list: (harasId: string, filters: object) => [...tasksKeys.all, "list", harasId, filters] as const,
  executions: (taskId: string, harasId: string) => [...tasksKeys.all, "executions", taskId, harasId] as const,
  members: (harasId: string) => [...tasksKeys.all, "members", harasId] as const,
};

export function useTasksQuery(filters?: TaskListFilters | null, enabled = true) {
  return useQuery({
    queryKey: tasksKeys.list(filters?.haras_id || "", filters || {}),
    queryFn: () => tasksService.list(filters as TaskListFilters),
    enabled: Boolean(enabled && filters?.haras_id),
  });
}

export function useTaskExecutionsQuery(taskId?: string | null, harasId?: string | null) {
  return useQuery({
    queryKey: tasksKeys.executions(taskId || "", harasId || ""),
    queryFn: () => tasksService.listExecutions(taskId as string, harasId as string),
    enabled: Boolean(taskId && harasId),
  });
}

export function useAssignableMembersQuery(harasId?: string | null) {
  return useQuery({
    queryKey: tasksKeys.members(harasId || ""),
    queryFn: () => tasksService.listAssignableMembers(harasId as string),
    enabled: Boolean(harasId),
  });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["veterinary"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda"] }),
    ]);
  };
}

export function useCreateTaskMutation() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: CreateTaskInput) => tasksService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskMutation() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => tasksService.update(taskId, input),
    onSuccess: invalidate,
  });
}

export function useExecuteTaskMutation() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: ExecuteTaskInput) => tasksService.execute(payload),
    onSuccess: invalidate,
  });
}
