import { Redirect } from "expo-router";
import { FieldPendingsScreen } from "@/src/screens/FieldPendingsScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function CampoPendenciasRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldPendingsScreen />;
}
