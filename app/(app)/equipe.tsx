import { Redirect } from "expo-router";
import { CreatorTeamScreen } from "@/src/screens/CreatorTeamScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole } from "@/src/lib/roles";

export default function EquipeRoute() {
  const { role } = useAuth();
  if (!isCreatorRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <CreatorTeamScreen />;
}
