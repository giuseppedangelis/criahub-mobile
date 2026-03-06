import { Heart, LoaderCircle } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useReproductionOverviewQuery } from "@/src/hooks/useReproduction";
import { isCreatorRole, isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { GestationItem, ReproductionEventItem } from "@/src/types/domain";
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

function getStatusTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("concl") || normalized.includes("confirm") || normalized.includes("nasc")) return "success" as const;
  if (normalized.includes("abort") || normalized.includes("cancel") || normalized.includes("rejeit")) return "danger" as const;
  if (normalized.includes("andamento")) return "info" as const;
  return "warning" as const;
}

export function ReproductionScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useReproductionOverviewQuery(harasId);
  const [selectedEvent, setSelectedEvent] = useState<ReproductionEventItem | null>(null);
  const [selectedGestation, setSelectedGestation] = useState<GestationItem | null>(null);

  const closeModals = () => {
    setSelectedEvent(null);
    setSelectedGestation(null);
  };

  if (!isCreatorRole(role) && !isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Módulo de reprodução"
            description="Disponível nesta fase para Criador e Veterinária."
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
        {[
          { label: "Eventos reprodutivos", value: events.length, accent: theme.colors.info },
          { label: "Gestações", value: gestations.length, accent: theme.colors.primary },
          { label: "Ativas", value: gestantesAtivas.length, accent: theme.colors.success },
          { label: "Parto previsto", value: withExpectedBirth.length, accent: theme.colors.warning },
        ].map((item) => (
          <Card key={item.label} style={[styles.summaryCard, { backgroundColor: `${item.accent}14`, borderColor: `${item.accent}55` }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>{item.label}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{item.value}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Heart size={18} color={theme.colors.info} />
          <Text style={[styles.cardTitle, { color: theme.colors.info }]}>Últimos eventos reprodutivos</Text>
        </View>
        {events.length > 0 ? (
          events.slice(0, 10).map((item) => {
            const tone = getStatusTone(item.status);
            const accent = tone === "success" ? theme.colors.success : tone === "danger" ? theme.colors.danger : tone === "info" ? theme.colors.info : theme.colors.warning;

            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedEvent(item)}
                style={({ pressed }) => [
                  styles.listRow,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}> 
                    {normalizeEventType(item.event_type)}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}> 
                    Animal: {item.animal_name || item.mare_name || item.stallion_name || "Não informado"}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>Data: {formatDateBR(item.event_date)}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: accent }]}> 
                  <Text style={[styles.statusBadgeLabel, { color: accent }]}>{item.status || "-"}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhum evento encontrado.</Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.success }]}>Gestações</Text>
        {gestations.length > 0 ? (
          gestations.slice(0, 10).map((item) => {
            const tone = getStatusTone(item.status);
            const accent = tone === "success" ? theme.colors.success : tone === "danger" ? theme.colors.danger : tone === "info" ? theme.colors.info : theme.colors.warning;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedGestation(item)}
                style={({ pressed }) => [
                  styles.listRow,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
                ]}
              >
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
                <View style={[styles.statusBadge, { borderColor: accent }]}> 
                  <Text style={[styles.statusBadgeLabel, { color: accent }]}>{item.status || "-"}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhuma gestação encontrada.</Text>
        )}
      </Card>

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="fade"
        onRequestClose={closeModals}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModals} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes do evento</Text>
            <Text style={[styles.modalMainText, { color: theme.colors.text }]}>
              {selectedEvent ? normalizeEventType(selectedEvent.event_type) : "-"}
            </Text>

            <View style={styles.modalRows}>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Animal: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.animal_name || selectedEvent?.mare_name || selectedEvent?.stallion_name || "Não informado"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Data: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent ? formatDateBR(selectedEvent.event_date) : "-"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Veterinário: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.veterinarian || "Não informado"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Status: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.status || "Não informado"}</Text>
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: theme.colors.textMuted }]}>
              {selectedEvent?.observations || "Sem observações para este evento."}
            </Text>

            <Pressable
              onPress={closeModals}
              style={({ pressed }) => [
                styles.modalCloseButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={[styles.modalCloseLabel, { color: theme.colors.text }]}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedGestation)}
        transparent
        animationType="fade"
        onRequestClose={closeModals}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModals} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes da gestação</Text>
            <Text style={[styles.modalMainText, { color: theme.colors.text }]}>
              Égua: {selectedGestation?.egua_name || "Não informada"}
            </Text>

            <View style={styles.modalRows}>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Garanhão: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedGestation?.garanhao_name || "Não informado"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Diagnóstico: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedGestation ? formatDateBR(selectedGestation.data_diagnostico) : "-"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Parto previsto: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedGestation ? formatDateBR(selectedGestation.data_prevista_parto) : "-"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Status: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedGestation?.status || "Não informado"}</Text>
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: theme.colors.textMuted }]}>
              {selectedGestation?.observacoes || "Sem observações para esta gestação."}
            </Text>

            <Pressable
              onPress={closeModals}
              style={({ pressed }) => [
                styles.modalCloseButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={[styles.modalCloseLabel, { color: theme.colors.text }]}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 26,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeLabel: { fontSize: 11, fontWeight: "700" },
  emptyText: {
    fontSize: 13,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalMainText: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalRows: {
    gap: 6,
  },
  modalRow: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalValue: {
    fontWeight: "600",
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalCloseButton: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
