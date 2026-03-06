import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agendaService } from "@/src/services/agenda";

export const agendaKeys = {
  all: ["agenda"] as const,
  list: (harasId: string) => [...agendaKeys.all, "list", harasId] as const,
};

export function useAgendaQuery(harasId?: string | null) {
  return useQuery({
    queryKey: agendaKeys.list(harasId || ""),
    queryFn: () => agendaService.list(harasId as string),
    enabled: Boolean(harasId),
  });
}

export function useUpdateAgendaStatusMutation(harasId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: "Pendente" | "Em andamento" | "Concluído" | "Cancelado" }) =>
      agendaService.updateStatus(eventId, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agendaKeys.list(harasId || "") }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });
}

export function useCreateAgendaEventMutation(harasId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agendaService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agendaKeys.list(harasId || "") });
    },
  });
}
