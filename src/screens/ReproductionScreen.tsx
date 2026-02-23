import { Heart, LoaderCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useReproductionOverviewQuery } from "@/src/hooks/useReproduction";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";

function normalizeEventType(value: string) {
  const map: Record<string, string> = {
    cobertura: "Cobertura",
    inseminacao: "Inseminação",
    coleta_ovulos: "Coleta de Óvulos",
    transferencia_embriao: "Transferência de Embrião",
    diagnostico_gestacao: "Diagnóstico de Gestação",
    parto: "Parto",
  };
  return map[value] || value;
}

export function ReproductionScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useReproductionOverviewQuery(harasId);

  if (!isCreatorRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Módulo de reprodução"
            description="Disponível nesta fase apenas para o perfil Criador."
          />
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <LoaderCircle color={theme.colors.primary} size={28} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Carregando reprodução...</Text>
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Falha na reprodução"
            description={error instanceof Error ? error.message : "Não foi possível carregar dados."}
          />
        </View>
      </AppScreen>
    );
  }

  const events = data?.events ?? [];
  const gestations = data?.gestations ?? [];
  const gestantesAtivas = gestations.filter((item) => (item.status || "").toLowerCase().includes("ativa"));
  const withExpectedBirth = gestations.filter((item) => Boolean(item.data_prevista_parto));

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Reprodução</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
          Acompanhamento reprodutivo do plantel do criador.
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Eventos reprodutivos</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{events.length}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Gestações</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{gestations.length}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Ativas</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{gestantesAtivas.length}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Parto previsto</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{withExpectedBirth.length}</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Heart size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Últimos eventos reprodutivos</Text>
        </View>
        {events.length > 0 ? (
          events.slice(0, 10).map((item) => (
            <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                  {normalizeEventType(item.event_type)}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                  Animal: {item.animal_name || item.mare_name || item.stallion_name || "Não informado"}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>Data: {formatDateBR(item.event_date)}</Text>
              </View>
              <Text style={[styles.rowStatus, { color: theme.colors.textMuted }]}>{item.status || "-"}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhum evento encontrado.</Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Gestações</Text>
        {gestations.length > 0 ? (
          gestations.slice(0, 10).map((item) => (
            <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                  Égua: {item.egua_name || "Não informada"}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                  Garanhão: {item.garanhao_name || "Não informado"}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}> 
                  Parto previsto: {formatDateBR(item.data_prevista_parto)}
                </Text>
              </View>
              <Text style={[styles.rowStatus, { color: theme.colors.textMuted }]}>{item.status || "-"}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhuma gestação encontrada.</Text>
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    minHeight: 74,
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  listRow: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowMain: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowMeta: {
    fontSize: 12,
  },
  rowStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
  },
});
