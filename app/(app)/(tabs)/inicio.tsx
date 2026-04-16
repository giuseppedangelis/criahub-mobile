import { Redirect } from "expo-router";
import { CreatorDashboardScreen } from "@/src/screens/CreatorDashboardScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  getDefaultAppRouteForRole,
  isCreatorRole,
} from "@/src/lib/roles";

export default function InicioRoute() {
  const { role } = useAuth();
  if (!isCreatorRole(role)) return <Redirect href={getDefaultAppRouteForRole(role) as any} />;
  return <CreatorDashboardScreen />;
}
