import { Redirect } from "expo-router";
import { CreatorRoutineScreen } from "@/src/screens/CreatorRoutineScreen";
import { VetRoutineScreen } from "@/src/screens/VetRoutineScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole, isFieldStaffRole, isVeterinaryRole } from "@/src/lib/roles";

export default function RotinaRoute() {
  const { role } = useAuth();
  if (isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/campo" />;
  if (isVeterinaryRole(role)) return <VetRoutineScreen />;
  if (isCreatorRole(role)) return <CreatorRoutineScreen />;
  return <Redirect href="/(app)/(tabs)/plantel" />;
}
