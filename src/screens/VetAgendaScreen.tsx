import { CalendarDays, Clock3, MapPin } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAgendaQuery, useConvertAgendaEventToTaskMutation, useUpdateAgendaStatusMutation } from "@/src/hooks/useAgenda";
import { resolveVetAccess } from "@/src/lib/vet-access";
import { getAgendaStatusTone, normalizeAgendaEventType } from "@/src/lib/vet-shared";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { AgendaEventItem } from "@/src/types/domain";
import { formatDateBR } from "@/src/utils/format";

type DateFilter = "today" | "week" | "month";

function formatTime(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function VetAgendaScreen() {
  const router = useRouter();
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();
  const vetAccess = resolveVetAccess(role, harasId);
  const vetHarasId = vetAccess.scopedHarasId;
  const [selectedEvent, setSelectedEvent] = useState<AgendaEventItem | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const updateStatusMutation = useUpdateAgendaStatusMutation(vetHarasId);
  const convertToTaskMutation = useConvertAgendaEventToTaskMutation(vetHarasId);

  if (!vetAccess.canAccessVet) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Agenda Veterinária" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  if (!vetAccess.hasHaras) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Haras não vinculado"
            description="Seu perfil veterinário está sem haras ativo. Ajuste o vínculo para carregar a agenda."
          />
        </View>
      </AppScreen>
    );
  }

  const agendaQuery = useAgendaQuery(vetHarasId);

  const onUpdateStatus = (status: "Pendente" | "Em andamento" | "Concluído" | "Cancelado") => {
    if (!selectedEvent) return;
    updateStatusMutation.mutate(
      { eventId: selectedEvent.id, status },
      {
        onSuccess: () => {
          setSelectedEvent((prev) => (prev ? { ...prev, status } : prev));
        },
      }
    );
  };

  const onConvertToTask = () => {
    if (!selectedEvent || !vetHarasId) return;
    convertToTaskMutation.mutate(
      {
        event_id: selectedEvent.id,
        haras_id: vetHarasId,
        responsible_id: user?.id ?? null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: () => setSelectedEvent(null),
      }
    );
  };

  const filtered = useMemo(() => {
    const source = agendaQuery.data ?? [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const plus7 = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const plus30 = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    return source
      .filter((item) => {
        const date = new Date(item.data_inicio);
        if (Number.isNaN(date.getTime())) return false;
        if (dateFilter === "today") return date >= todayStart && date < plus7 && date.getDate() === todayStart.getDate() && date.getMonth() === todayStart.getMonth() && date.getFullYear() === todayStart.getFullYear();
        if (dateFilter === "week") return date >= todayStart && date <= plus7;
        return date >= todayStart && date <= plus30;
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [agendaQuery.data, dateFilter]);

  const summary = useMemo(() => {
    const base = filtered;
    return {
      pending: base.filter((item) => getAgendaStatusTone(item.status) === "warning").length,
      inProgress: base.filter((item) => String(item.status || "").toLowerCase().includes("andamento")).length,
      done: base.filter((item) => getAgendaStatusTone(item.status) === "success").length,
    };
  }, [filtered]);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Agenda</Text>
      </View>

      <Card style={{ backgroundColor: `${theme.colors.info}12`, borderColor: `${theme.colors.info}55` }}>
        <Text style={[styles.line, { color: theme.colors.textMuted }]}>Agenda clínica com destaque por status para facilitar triagem no dia a dia.</Text>
      </Card>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { borderColor: `${theme.colors.warning}55`, backgroundColor: `${theme.colors.warning}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Pendentes</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.pending}</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: `${theme.colors.info}55`, backgroundColor: `${theme.colors.info}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Em andamento</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.inProgress}</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: `${theme.colors.success}55`, backgroundColor: `${theme.colors.success}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Concluídos</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.done}</Text>
        </View>
      </View>

      <Card>
        <View style={styles.row}>
          <CalendarDays size={18} color={theme.colors.info} />
          <Text style={[styles.cardTitle, { color: theme.colors.info }]}>Janela da agenda</Text>
        </View>
        <View style={styles.filterRow}>
          {([
            { id: "today", label: "Hoje" },
            { id: "week", label: "Próx. 7 dias" },
            { id: "month", label: "Próx. 30 dias" },
          ] as const).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setDateFilter(item.id)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: dateFilter === item.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: dateFilter === item.id ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.line, { color: theme.colors.textMuted }]}>Eventos no período: {filtered.length}. Toque em um evento para alterar status ou delegar como tarefa.</Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.success }]}>Eventos</Text>
        {agendaQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando eventos...</Text>
        ) : filtered.length ? (
          filtered.map((item) => {
            const tone = getAgendaStatusTone(item.status);
            const chipBorder =
              tone === "success"
                ? theme.colors.success
                : tone === "danger"
                ? theme.colors.danger
                : tone === "warning"
                ? theme.colors.warning
                : theme.colors.border;

            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedEvent(item)}
                style={({ pressed }) => [styles.itemRow, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.titulo}</Text>
                  <Text style={[styles.itemType, { color: theme.colors.textMuted }]}>
                    {normalizeAgendaEventType(item.tipo)} {item.animal_name ? `• ${item.animal_name}` : ""}
                  </Text>
                  <View style={styles.metaRow}>
                    <Clock3 size={12} color={theme.colors.textMuted} />
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.data_inicio)} às {formatTime(item.data_inicio)}</Text>
                  </View>
                  {item.local ? (
                    <View style={styles.metaRow}>
                      <MapPin size={12} color={theme.colors.textMuted} />
                      <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>{item.local}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.statusChip, { borderColor: chipBorder }]}> 
                  <Text style={[styles.statusChipLabel, { color: chipBorder }]}>{item.status || "Sem status"}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhum evento para o período selecionado.</Text>
        )}
      </Card>

      <Modal visible={Boolean(selectedEvent)} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEvent(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes do evento</Text>
            <Text style={[styles.modalMain, { color: theme.colors.text }]}>{selectedEvent?.titulo || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Tipo: {selectedEvent ? normalizeAgendaEventType(selectedEvent.tipo) : "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Data: {selectedEvent ? `${formatDateBR(selectedEvent.data_inicio)} às ${formatTime(selectedEvent.data_inicio)}` : "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Animal: {selectedEvent?.animal_name || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Local: {selectedEvent?.local || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Responsável: {selectedEvent?.responsavel || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Status: {selectedEvent?.status || "Sem status"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>{selectedEvent?.descricao || "Sem observações para este evento."}</Text>
            <View style={styles.modalActions}>
              <AppButton label="Marcar pendente" variant="ghost" onPress={() => onUpdateStatus("Pendente")} loading={updateStatusMutation.isPending} />
              <AppButton label="Marcar em andamento" variant="ghost" onPress={() => onUpdateStatus("Em andamento")} loading={updateStatusMutation.isPending} />
              <AppButton label="Marcar concluído" onPress={() => onUpdateStatus("Concluído")} loading={updateStatusMutation.isPending} />
              <AppButton
                label="Abrir em reprodução"
                variant="ghost"
                onPress={() => {
                  setSelectedEvent(null);
                  router.push("/(app)/(tabs)/reproducao");
                }}
              />
              <AppButton label="Delegar como tarefa" variant="ghost" onPress={onConvertToTask} loading={convertToTaskMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 2 },
  title: { fontSize: 24, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  filterChip: {
    borderWidth: 1,
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  itemType: { fontSize: 12 },
  itemMeta: { fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipLabel: { fontSize: 11, fontWeight: "700" },
  line: { fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "700" },
  summaryValue: { fontSize: 19, fontWeight: "700" },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalMain: { fontSize: 16, fontWeight: "700" },
  modalLine: { fontSize: 13, lineHeight: 19 },
  modalActions: { gap: 8, marginTop: 8 },
});
