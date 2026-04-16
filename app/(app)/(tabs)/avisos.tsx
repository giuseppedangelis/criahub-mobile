import { Redirect } from "expo-router";
import { CreatorNoticesScreen } from "@/src/screens/CreatorNoticesScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole } from "@/src/lib/roles";

export default function AvisosRoute() {
  const { role } = useAuth();
  if (!isCreatorRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
  return <CreatorNoticesScreen />;
}
