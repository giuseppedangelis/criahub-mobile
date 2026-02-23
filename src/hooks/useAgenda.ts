import { useQuery } from "@tanstack/react-query";
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
