import { Redirect } from "expo-router";
import { AgendaScreen } from "@/src/screens/AgendaScreen";
import { VetAgendaScreen } from "@/src/screens/VetAgendaScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole, isVeterinaryRole } from "@/src/lib/roles";

export default function AgendaRoute() {
  const { role } = useAuth();
  if (isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/campo" />;
  if (isVeterinaryRole(role)) return <VetAgendaScreen />;
  return <AgendaScreen />;
}
