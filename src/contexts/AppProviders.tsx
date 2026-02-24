import { QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type PropsWithChildren } from "react";
import { getQueryClient } from "@/src/lib/query-client";
import { ThemeProvider } from "@/src/theme/ThemeContext";
import { AuthProvider } from "@/src/contexts/AuthContext";

const queryClient = getQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
