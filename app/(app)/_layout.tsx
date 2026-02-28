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
      <Stack.Screen name="campo/pendencias" options={{ headerShown: true, title: "Minhas Pendências" }} />
      <Stack.Screen name="campo/gestacoes" options={{ headerShown: true, title: "Gestações" }} />
      <Stack.Screen name="campo/tarefas" options={{ headerShown: true, title: "Minhas Tarefas" }} />
      <Stack.Screen name="campo/avisos" options={{ headerShown: true, title: "Avisos de Retorno" }} />
      <Stack.Screen name="animal/[id]" options={{ headerShown: true, title: "Animal" }} />
      <Stack.Screen name="vet-prontuario/[id]" options={{ headerShown: true, title: "Prontuário" }} />
      <Stack.Screen name="unsupported" />
    </Stack>
  );
}
