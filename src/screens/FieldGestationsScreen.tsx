import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { FieldStatCard } from "@/src/components/field/FieldStatCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useGestationsQuery } from "@/src/hooks/useReproduction";
import { isFieldStaffRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR");
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = due.getTime() - today.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

export function FieldGestationsScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const canAccess = isFieldStaffRole(role);

  const gestationsQuery = useGestationsQuery(harasId);

  const list = useMemo(() => {
    return (gestationsQuery.data ?? [])
      .filter((item) => item.status === "confirmada" || item.status === "em_andamento")
      .map((item) => ({ ...item, days_until_birth: getDaysUntil(item.data_prevista_parto) }))
      .sort((a, b) => {
        const aDays = a.days_until_birth ?? Number.POSITIVE_INFINITY;
        const bDays = b.days_until_birth ?? Number.POSITIVE_INFINITY;
        return aDays - bDays;
      });
  }, [gestationsQuery.data]);

  const summary = useMemo(() => {
    const windows = { upTo7: 0, upTo15: 0, upTo30: 0, overdue: 0 };
    for (const item of list) {
      const d = item.days_until_birth;
      if (d === null) continue;
      if (d < 0) windows.overdue += 1;
      else if (d <= 7) windows.upTo7 += 1;
      else if (d <= 15) windows.upTo15 += 1;
      else if (d <= 30) windows.upTo30 += 1;
    }
    return windows;
  }, [list]);

  const windowLabel = (days: number | null) => {
    if (days === null) return "Sem previsao";
    if (days < 0) return `${Math.abs(days)} dia(s) em atraso`;
    if (days <= 7) return "Parto em ate 7 dias";
    if (days <= 15) return "Parto em ate 15 dias";
    if (days <= 30) return "Parto em ate 30 dias";
    return `Previsao em ${days} dia(s)`;
  };

  const windowColor = (days: number | null) => {
    if (days === null) return theme.colors.textMuted;
    if (days < 0 || days <= 7) return theme.colors.danger;
    if (days <= 15) return theme.colors.warning;
    if (days <= 30) return theme.colors.info;
    return theme.colors.success;
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Gestacoes" description="Disponivel apenas para Peao/Funcionario." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Gestacoes em campo</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Prioridade de parto para rotina diaria.</Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Ate 7 dias" value={summary.upTo7} tone="danger" compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Ate 15 dias" value={summary.upTo15} tone="warning" compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Ate 30 dias" value={summary.upTo30} tone="info" compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Em atraso" value={summary.overdue} tone="danger" compact />
        </View>
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ativas: {list.length}</Text>
        {!harasId ? (
          <Text style={[styles.line, { color: theme.colors.warning }]}>Haras nao identificado para este usuario.</Text>
        ) : gestationsQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando gestacoes...</Text>
        ) : list.length ? (
          list.slice(0, 20).map((item) => (
            <View key={item.id} style={[styles.row, { borderColor: theme.colors.border }]}> 
              <View style={styles.rowHeader}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.egua_name || "Egua nao informada"}</Text>
                <Text style={{ color: windowColor(item.days_until_birth), fontWeight: "700" }}>
                  {item.status === "em_andamento" ? "Em andamento" : "Confirmada"}
                </Text>
              </View>
              <Text style={[styles.line, { color: theme.colors.textMuted }]}>Previsao de parto: {formatDate(item.data_prevista_parto)}</Text>
              {item.garanhao_name ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Garanhao: {item.garanhao_name}</Text> : null}
              <Text style={{ color: windowColor(item.days_until_birth), fontWeight: "600" }}>{windowLabel(item.days_until_birth)}</Text>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(tabs)/campo",
                    params: { openBirth: "1", mareId: item.mare_id || "", mareName: item.egua_name || "" },
                  })
                }
                style={({ pressed }) => [styles.actionButton, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Registrar nascimento desta egua</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Sem gestacoes ativas no haras.</Text>
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  line: { fontSize: 12 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryItem: { width: "48%" },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
});
