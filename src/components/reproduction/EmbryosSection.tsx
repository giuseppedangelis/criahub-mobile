import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Sprout } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { useEmbryosQuery } from "@/src/hooks/useReproductionExtras";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface EmbryosSectionProps {
  harasId: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function EmbryosSection({ harasId }: EmbryosSectionProps) {
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useEmbryosQuery(harasId);

  const embryos = data ?? [];

  const summary = useMemo(() => {
    const total = embryos.reduce((sum, item) => sum + item.quantity, 0);
    const available = embryos.reduce((sum, item) => sum + item.available, 0);
    const toConfirm = embryos.filter((item) => {
      const statusLower = (item.status ?? "").toLowerCase();
      return !statusLower || statusLower.includes("pend") || statusLower.includes("desenvolv");
    }).length;
    return { total, available, toConfirm };
  }, [embryos]);

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Sprout size={18} color={theme.colors.info} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Embriões</Text>
      </View>

      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryBox,
            { backgroundColor: theme.colors.primary + "14", borderColor: theme.colors.primary + "55" },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Produzidos</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.total}</Text>
        </View>
        <View
          style={[
            styles.summaryBox,
            { backgroundColor: theme.colors.success + "14", borderColor: theme.colors.success + "55" },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Disponíveis</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {summary.available}
          </Text>
        </View>
        <View
          style={[
            styles.summaryBox,
            { backgroundColor: theme.colors.warning + "14", borderColor: theme.colors.warning + "55" },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>A confirmar</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {summary.toConfirm}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>
          Carregando embriões...
        </Text>
      ) : null}
      {error ? (
        <Text style={[styles.emptyLine, { color: theme.colors.danger }]}>
          Não foi possível carregar os embriões.
        </Text>
      ) : null}
      {!isLoading && !error && embryos.length === 0 ? (
        <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>
          Nenhum embrião registrado.
        </Text>
      ) : null}

      {embryos.slice(0, 8).map((item) => (
        <View key={item.id} style={[styles.row, { borderColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
              {item.donor_name ?? "Doadora"} × {item.stallion_name ?? "Garanhão"}
            </Text>
            <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
              {formatDate(item.production_date)} • {item.quantity} produzido(s) • {item.available}{" "}
              disponível(is)
            </Text>
            {item.status ? (
              <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                Status: {item.status}
                {item.grade ? ` • Qualidade: ${item.grade}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  summaryBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  emptyLine: {
    fontSize: 13,
    lineHeight: 18,
  },
});
