import { Redirect } from "expo-router";
import { VeterinaryScreen } from "@/src/screens/VeterinaryScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole, isVeterinaryRole } from "@/src/lib/roles";

export default function VeterinariaRoute() {
  const { role } = useAuth();
  if (isVeterinaryRole(role)) return <VeterinaryScreen />;
  if (isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/campo" />;
  return <Redirect href="/(app)/(tabs)/plantel" />;
}
