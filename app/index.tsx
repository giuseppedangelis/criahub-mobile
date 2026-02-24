import { Redirect } from "expo-router";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  getDefaultAppRouteForRole,
  isMobileSupportedRole,
} from "@/src/lib/roles";

export default function Index() {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState fullscreen message="Carregando sessão..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isMobileSupportedRole(role)) {
    return <Redirect href={getDefaultAppRouteForRole(role) as "/(app)/unsupported"} />;
  }

  return <Redirect href="/(app)/unsupported" />;
}
