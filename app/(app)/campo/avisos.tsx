import { Redirect } from "expo-router";
import { FieldNotificationsScreen } from "@/src/screens/FieldNotificationsScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function CampoAvisosRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldNotificationsScreen />;
}
