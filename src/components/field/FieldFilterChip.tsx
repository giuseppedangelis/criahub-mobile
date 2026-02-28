import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface FieldFilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function FieldFilterChip({ label, active = false, onPress }: FieldFilterChipProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.surfaceAlt : "transparent",
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
