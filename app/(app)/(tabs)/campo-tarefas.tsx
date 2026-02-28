import { Redirect } from "expo-router";
import { FieldTasksScreen } from "@/src/screens/FieldTasksScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function CampoTarefasTabRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldTasksScreen />;
}
