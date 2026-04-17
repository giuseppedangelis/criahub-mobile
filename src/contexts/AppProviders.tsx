import { QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type PropsWithChildren } from "react";
import { getQueryClient } from "@/src/lib/query-client";
import { ThemeProvider } from "@/src/theme/ThemeContext";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { useBackgroundSync } from "@/src/hooks/useBackgroundSync";

const queryClient = getQueryClient();

function BackgroundSyncMount() {
  // OFFLINE-03 (D-18): single entry point para registrar a task de background
  // sync. Componente side-effect only — retorna null e só existe para chamar
  // o hook dentro da árvore de providers.
  useBackgroundSync();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <BackgroundSyncMount />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
