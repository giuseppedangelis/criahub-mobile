import { useAuth } from "@/src/contexts/AuthContext";
import { useTerminationReminderSync } from "@/src/hooks/useTerminationReminderSync";
import { isCreatorRole } from "@/src/lib/roles";

/**
 * Renderiza nada. Mantém a sincronização de lembretes locais de condomínio
 * viva enquanto o criador estiver dentro do app.
 */
export function TerminationReminderMount() {
  const { harasId, role } = useAuth();
  const enabled = isCreatorRole(role) ? harasId : null;
  useTerminationReminderSync(enabled);
  return null;
}
