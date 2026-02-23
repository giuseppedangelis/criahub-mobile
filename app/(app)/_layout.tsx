import { Redirect, Stack, useSegments } from "expo-router";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { getDefaultAppRouteForRole, isMobileSupportedRole } from "@/src/lib/roles";

export default function AppLayout() {
  const { session, role, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) {
    return <LoadingState fullscreen message="Carregando aplicativo..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const isUnsupportedRoute = (segments as string[]).includes("unsupported");

  if (isUnsupportedRoute && isMobileSupportedRole(role)) {
    return <Redirect href={getDefaultAppRouteForRole(role) as any} />;
  }

  if (!isMobileSupportedRole(role) && !isUnsupportedRoute) {
    return <Redirect href="/(app)/unsupported" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="animal/[id]" options={{ headerShown: true, title: "Animal" }} />
      <Stack.Screen name="unsupported" />
    </Stack>
  );
}
