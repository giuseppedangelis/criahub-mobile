import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { AnimalStatus } from "@/src/types/domain";
import { formatStatusLabel } from "@/src/utils/format";

interface StatusBadgeProps {
  status: AnimalStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { theme } = useAppTheme();

  const color =
    status === "ativo"
      ? theme.colors.success
      : status === "provisorio"
      ? theme.colors.info
      : status === "vendido"
      ? theme.colors.info
      : status === "em_servico"
      ? theme.colors.primary
      : status === "emprestado"
      ? theme.colors.warning
      : theme.colors.danger;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}88`,
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
