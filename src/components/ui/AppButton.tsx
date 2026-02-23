import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: AppButtonProps) {
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === "primary"
      ? {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
          color: theme.colors.primaryText,
        }
      : variant === "danger"
      ? {
          backgroundColor: theme.colors.danger,
          borderColor: theme.colors.danger,
          color: "#ffffff",
        }
      : {
          backgroundColor: "transparent",
          borderColor: theme.colors.border,
          color: theme.colors.text,
        };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.color} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.label, { color: variantStyle.color }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
