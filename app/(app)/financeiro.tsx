import { Redirect } from "expo-router";
import { CreatorFinancialScreen } from "@/src/screens/CreatorFinancialScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole } from "@/src/lib/roles";

export default function FinanceiroRoute() {
  const { role } = useAuth();
  if (!isCreatorRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <CreatorFinancialScreen />;
}
