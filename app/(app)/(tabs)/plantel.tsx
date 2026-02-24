import { Redirect } from "expo-router";
import { PlantelScreen } from "@/src/screens/PlantelScreen";
import { VetPlantelScreen } from "@/src/screens/VetPlantelScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isFieldStaffRole, isVeterinaryRole } from "@/src/lib/roles";

export default function PlantelRoute() {
  const { role } = useAuth();
  if (isFieldStaffRole(role)) return <Redirect href="/(app)/(tabs)/campo" />;
  if (isVeterinaryRole(role)) return <VetPlantelScreen />;
  return <PlantelScreen />;
}
