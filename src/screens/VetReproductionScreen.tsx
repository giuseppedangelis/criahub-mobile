import { Activity, Baby, HeartPulse } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useReproductionOverviewQuery } from "@/src/hooks/useReproduction";
import { isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";
import type { GestationItem, ReproductionEventItem } from "@/src/types/domain";

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

export function VetReproductionScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useReproductionOverviewQuery(harasId);
  const [selectedEvent, setSelectedEvent] = useState<ReproductionEventItem | null>(null);
  const [selectedGestation, setSelectedGestation] = useState<GestationItem | null>(null);

  if (!isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Reprodução Veterinária" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  if (!harasId) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Haras não vinculado"
            description="Seu perfil veterinário está sem haras ativo. Ajuste o vínculo para carregar reprodução."
          />
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <Text style={[styles.loading, { color: theme.colors.textMuted }]}>Carregando reprodução clínica...</Text>
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

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Reprodução Clínica</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Painel técnico para decisão veterinária no manejo reprodutivo.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Eventos técnicos</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{events.length}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Gestações</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{gestations.length}</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.row}>
          <Activity size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Últimos Procedimentos</Text>
        </View>
        {events.length ? (
          events.slice(0, 10).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedEvent(item)}
              style={({ pressed }) => [
                styles.listRow,
                { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{normalizeEventType(item.event_type)}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>Data: {formatDateBR(item.event_date)}</Text>
              </View>
              <Text style={[styles.rowStatus, { color: theme.colors.textMuted }]}>{item.status || "-"}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhum evento técnico encontrado.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <Baby size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Gestação e Receptoras</Text>
        </View>
        {gestations.length ? (
          gestations.slice(0, 10).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedGestation(item)}
              style={({ pressed }) => [
                styles.listRow,
                { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Égua: {item.egua_name || "Não informada"}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>Parto: {formatDateBR(item.data_prevista_parto)}</Text>
              </View>
              <Text style={[styles.rowStatus, { color: theme.colors.textMuted }]}>{item.status || "-"}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhuma gestação encontrada.</Text>
        )}
      </Card>

      <Modal visible={Boolean(selectedEvent)} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEvent(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.row}>
              <HeartPulse size={18} color={theme.colors.info} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Evento Clínico</Text>
            </View>
            <Text style={[styles.modalMainText, { color: theme.colors.text }]}>
              {selectedEvent ? normalizeEventType(selectedEvent.event_type) : "-"}
            </Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Data: {selectedEvent ? formatDateBR(selectedEvent.event_date) : "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Status: {selectedEvent?.status || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>{selectedEvent?.observations || "Sem observações."}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedGestation)} transparent animationType="fade" onRequestClose={() => setSelectedGestation(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedGestation(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Gestação</Text>
            <Text style={[styles.modalMainText, { color: theme.colors.text }]}>Égua: {selectedGestation?.egua_name || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Garanhão: {selectedGestation?.garanhao_name || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Diagnóstico: {formatDateBR(selectedGestation?.data_diagnostico)}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Parto previsto: {formatDateBR(selectedGestation?.data_prevista_parto)}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Status: {selectedGestation?.status || "-"}</Text>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  loading: { fontSize: 14 },
  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  summaryGrid: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, minHeight: 86, justifyContent: "center", gap: 6 },
  summaryLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  listRow: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowMeta: { fontSize: 12 },
  rowStatus: { fontSize: 12, fontWeight: "700" },
  emptyText: { fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalMainText: { fontSize: 16, fontWeight: "700" },
  modalLine: { fontSize: 13, lineHeight: 18 },
});
