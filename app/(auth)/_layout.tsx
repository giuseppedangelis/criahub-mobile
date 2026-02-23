import { Redirect, Stack } from "expo-router";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole, isMobileSupportedRole } from "@/src/lib/roles";

export default function AuthLayout() {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState fullscreen message="Verificando sessão..." />;
  }

  if (session) {
    if (isMobileSupportedRole(role)) {
      if (isCreatorRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
    }
    return <Redirect href="/(app)/unsupported" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
