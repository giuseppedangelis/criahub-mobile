import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface FieldStatCardProps {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  compact?: boolean;
}

export function FieldStatCard({ label, value, tone = "default", compact = false }: FieldStatCardProps) {
  const { theme } = useAppTheme();

  const valueColor =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
      ? theme.colors.warning
      : tone === "danger"
      ? theme.colors.danger
      : tone === "info"
      ? theme.colors.info
      : theme.colors.text;

  return (
    <Card style={[styles.card, compact ? styles.cardCompact : null]}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    justifyContent: "center",
    gap: 4,
  },
  cardCompact: {
    minHeight: 68,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
  },
});
