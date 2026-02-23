import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export function LoadingState({
  message = "Carregando...",
  fullscreen = false,
}: LoadingStateProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        fullscreen && styles.fullscreen,
        { backgroundColor: fullscreen ? theme.colors.background : "transparent" },
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.message, { color: theme.colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  fullscreen: {
    flex: 1,
    width: "100%",
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
  },
});
