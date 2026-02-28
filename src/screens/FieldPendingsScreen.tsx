import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { FieldFilterChip } from "@/src/components/field/FieldFilterChip";
import { FieldStatCard } from "@/src/components/field/FieldStatCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useMyFieldPendingValidationsQuery } from "@/src/hooks/useField";
import { isFieldStaffRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { FieldPendingValidationStatus, FieldPendingValidationType } from "@/src/types/domain";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR");
}

function getStatusLabel(status: FieldPendingValidationStatus) {
  if (status === "pendente") return "Pendente";
  if (status === "em_analise") return "Em analise";
  if (status === "aprovado") return "Aprovado";
  if (status === "correcao_solicitada") return "Correcao solicitada";
  if (status === "rejeitado") return "Rejeitado";
  return "Atualizado";
}

export function FieldPendingsScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();
  const canAccess = isFieldStaffRole(role);

  const [typeFilter, setTypeFilter] = useState<"all" | FieldPendingValidationType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FieldPendingValidationStatus>("all");

  const pendingsQuery = useMyFieldPendingValidationsQuery(harasId, user?.id, canAccess);

  const list = useMemo(() => {
    return (pendingsQuery.data ?? []).filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [pendingsQuery.data, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const base = pendingsQuery.data ?? [];
    return {
      total: base.length,
      pending: base.filter((item) => item.status === "pendente" || item.status === "em_analise").length,
      returned: base.filter((item) => item.status === "correcao_solicitada" || item.status === "rejeitado").length,
      approved: base.filter((item) => item.status === "aprovado").length,
    };
  }, [pendingsQuery.data]);

  const statusColor = (status: FieldPendingValidationStatus) => {
    if (status === "aprovado") return theme.colors.success;
    if (status === "correcao_solicitada") return theme.colors.warning;
    if (status === "rejeitado") return theme.colors.danger;
    if (status === "em_analise") return theme.colors.info;
    return theme.colors.textMuted;
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Minhas pendencias" description="Disponivel apenas para Peao/Funcionario." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Minhas pendencias</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Acompanhe retorno do escritorio por envio.</Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Total" value={summary.total} compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Pendentes" value={summary.pending} tone="warning" compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Retornadas" value={summary.returned} tone="danger" compact />
        </View>
        <View style={styles.summaryItem}>
          <FieldStatCard label="Aprovadas" value={summary.approved} tone="success" compact />
        </View>
      </View>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos" },
            { key: "nascimento", label: "Nascimento" },
            { key: "ocorrencia", label: "Ocorrencia" },
          ].map((item) => (
            <FieldFilterChip
              key={item.key}
              label={item.label}
              active={typeFilter === item.key}
              onPress={() => setTypeFilter(item.key as "all" | FieldPendingValidationType)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos status" },
            { key: "pendente", label: "Pendente" },
            { key: "em_analise", label: "Em analise" },
            { key: "correcao_solicitada", label: "Correcao" },
            { key: "aprovado", label: "Aprovado" },
            { key: "rejeitado", label: "Rejeitado" },
          ].map((item) => (
            <FieldFilterChip
              key={item.key}
              label={item.label}
              active={statusFilter === item.key}
              onPress={() => setStatusFilter(item.key as "all" | FieldPendingValidationStatus)}
            />
          ))}
        </ScrollView>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Resultados: {list.length}</Text>
        {pendingsQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando pendencias...</Text>
        ) : pendingsQuery.error ? (
          <Text style={[styles.line, { color: theme.colors.danger }]}>Falha ao carregar pendencias.</Text>
        ) : list.length ? (
          list.slice(0, 30).map((item) => (
            <View key={item.id} style={[styles.row, { borderColor: theme.colors.border }]}> 
              <View style={styles.rowHeader}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {item.type === "nascimento" ? "Nascimento" : "Ocorrencia"}
                </Text>
                <View style={[styles.pill, { borderColor: statusColor(item.status) }]}>
                  <Text style={{ color: statusColor(item.status), fontSize: 11, fontWeight: "700" }}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
              <Text style={[styles.line, { color: theme.colors.textMuted }]}>Enviado em: {formatDateTime(item.created_at)}</Text>
              {item.mare_name ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Mae: {item.mare_name}</Text> : null}
              {item.animal_name ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Animal: {item.animal_name}</Text> : null}
              {item.description ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Descricao: {item.description}</Text> : null}
              {item.validation_notes ? <Text style={{ color: theme.colors.text }}>Retorno: {item.validation_notes}</Text> : null}
              {item.source === "offline" ? (
                <Text style={[styles.line, { color: theme.colors.warning }]}>Aguardando sincronizacao.</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Sem pendencias neste filtro.</Text>
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
  filterRow: { gap: 8, paddingVertical: 6, paddingRight: 6 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
    marginTop: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 24,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
