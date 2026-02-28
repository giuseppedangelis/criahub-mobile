import { Redirect } from "expo-router";
import { FieldHomeHubScreen } from "@/src/screens/FieldHomeHubScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function CampoRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldHomeHubScreen />;
}
