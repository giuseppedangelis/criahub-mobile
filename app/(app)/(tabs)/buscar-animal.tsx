import { Redirect } from "expo-router";
import { FieldAnimalSearchScreen } from "@/src/screens/FieldAnimalSearchScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole } from "@/src/lib/roles";

export default function BuscarAnimalRoute() {
  const { role } = useAuth();
  if (!isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <FieldAnimalSearchScreen />;
}
