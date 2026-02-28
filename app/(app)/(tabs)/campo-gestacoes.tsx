import { Redirect } from "expo-router";
import { FieldGestationsScreen } from "@/src/screens/FieldGestationsScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function CampoGestacoesTabRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldGestationsScreen />;
}
