import { Redirect } from "expo-router";
import { ReproductionScreen } from "@/src/screens/ReproductionScreen";
import { VetReproductionScreen } from "@/src/screens/VetReproductionScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole, isVeterinaryRole } from "@/src/lib/roles";

export default function ReproducaoRoute() {
  const { role } = useAuth();
  if (isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/campo" />;
  if (isVeterinaryRole(role)) return <VetReproductionScreen />;
  return <ReproductionScreen />;
}
