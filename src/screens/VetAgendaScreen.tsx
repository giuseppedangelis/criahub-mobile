import { CalendarDays, CheckCircle2, ClipboardList } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAgendaQuery } from "@/src/hooks/useAgenda";
import { useVeterinaryDashboardQuery } from "@/src/hooks/useVeterinary";
import { isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";
import type { VetTaskItem } from "@/src/types/domain";
import type { AgendaEventItem } from "@/src/types/domain";

function formatTime(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function getStatusTone(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("concl")) return "success" as const;
  if (normalized.includes("cancel")) return "danger" as const;
  if (normalized.includes("pend")) return "warning" as const;
  return "neutral" as const;
}

export function VetAgendaScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const [selectedTask, setSelectedTask] = useState<VetTaskItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEventItem | null>(null);

  if (!isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Agenda Veterinária" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  const dashboardQuery = useVeterinaryDashboardQuery(harasId);
  const agendaQuery = useAgendaQuery(harasId);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Agenda Veterinária</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Tarefas reprodutivas e manejo sanitário do dia.</Text>
      </View>

      <Card>
        <View style={styles.row}>
          <ClipboardList size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Tarefas Reprodutivas</Text>
        </View>

        {dashboardQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : dashboardQuery.data?.todayTasks.length ? (
          dashboardQuery.data.todayTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => setSelectedTask(task)}
              style={({ pressed }) => [
                styles.itemRow,
                { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{task.title}</Text>
                <Text style={[styles.itemType, { color: theme.colors.textMuted }]}>
                  {task.animal_name || "Animal não informado"} • {task.priority}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>Até {formatDateBR(task.due_date)}</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    borderColor:
                      getStatusTone(task.status) === "success"
                        ? theme.colors.success
                        : getStatusTone(task.status) === "danger"
                        ? theme.colors.danger
                        : getStatusTone(task.status) === "warning"
                        ? theme.colors.warning
                        : theme.colors.border,
                    backgroundColor:
                      getStatusTone(task.status) === "success"
                        ? `${theme.colors.success}20`
                        : getStatusTone(task.status) === "danger"
                        ? `${theme.colors.danger}20`
                        : getStatusTone(task.status) === "warning"
                        ? `${theme.colors.warning}20`
                        : theme.colors.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipLabel,
                    {
                      color:
                        getStatusTone(task.status) === "success"
                          ? theme.colors.success
                          : getStatusTone(task.status) === "danger"
                          ? theme.colors.danger
                          : getStatusTone(task.status) === "warning"
                          ? theme.colors.warning
                          : theme.colors.textMuted,
                    },
                  ]}
                >
                  {task.status}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhuma tarefa vet para hoje.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <CalendarDays size={18} color={theme.colors.info} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Agenda Geral de Eventos</Text>
        </View>
        {agendaQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando eventos...</Text>
        ) : agendaQuery.data?.length ? (
          agendaQuery.data.slice(0, 8).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedEvent(item)}
              style={({ pressed }) => [
                styles.itemRow,
                { borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.itemType, { color: theme.colors.textMuted }]}> 
                  {item.tipo} {item.animal_name ? `• ${item.animal_name}` : ""}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
                  {formatDateBR(item.data_inicio)} às {formatTime(item.data_inicio)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    borderColor:
                      getStatusTone(item.status) === "success"
                        ? theme.colors.success
                        : getStatusTone(item.status) === "danger"
                        ? theme.colors.danger
                        : getStatusTone(item.status) === "warning"
                        ? theme.colors.warning
                        : theme.colors.border,
                    backgroundColor:
                      getStatusTone(item.status) === "success"
                        ? `${theme.colors.success}20`
                        : getStatusTone(item.status) === "danger"
                        ? `${theme.colors.danger}20`
                        : getStatusTone(item.status) === "warning"
                        ? `${theme.colors.warning}20`
                        : theme.colors.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipLabel,
                    {
                      color:
                        getStatusTone(item.status) === "success"
                          ? theme.colors.success
                          : getStatusTone(item.status) === "danger"
                          ? theme.colors.danger
                          : getStatusTone(item.status) === "warning"
                          ? theme.colors.warning
                          : theme.colors.textMuted,
                    },
                  ]}
                >
                  {item.status || "-"}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhum evento geral encontrado.</Text>
        )}
      </Card>

      <Modal visible={Boolean(selectedTask)} transparent animationType="fade" onRequestClose={() => setSelectedTask(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTask(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <View style={styles.row}>
              <CheckCircle2 size={18} color={theme.colors.info} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes da Tarefa</Text>
            </View>
            <Text style={[styles.modalMain, { color: theme.colors.text }]}>{selectedTask?.title || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Animal: {selectedTask?.animal_name || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Prioridade: {selectedTask?.priority || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Status: {selectedTask?.status || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Data: {selectedTask ? formatDateBR(selectedTask.due_date) : "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>
              {selectedTask?.description || "Sem descrição adicional."}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedEvent)} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEvent(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <View style={styles.row}>
              <CalendarDays size={18} color={theme.colors.info} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes do Evento</Text>
            </View>
            <Text style={[styles.modalMain, { color: theme.colors.text }]}>{selectedEvent?.titulo || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Tipo: {selectedEvent?.tipo || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}> 
              Início: {selectedEvent ? `${formatDateBR(selectedEvent.data_inicio)} às ${formatTime(selectedEvent.data_inicio)}` : "-"}
            </Text>
            {selectedEvent?.data_fim ? (
              <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}> 
                Fim: {`${formatDateBR(selectedEvent.data_fim)} às ${formatTime(selectedEvent.data_fim)}`}
              </Text>
            ) : null}
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Animal: {selectedEvent?.animal_name || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Local: {selectedEvent?.local || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Responsável: {selectedEvent?.responsavel || "Não informado"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>Status: {selectedEvent?.status || "-"}</Text>
            <Text style={[styles.modalLine, { color: theme.colors.textMuted }]}>
              {selectedEvent?.descricao || "Sem observações para este evento."}
            </Text>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  itemRow: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: "600" },
  itemType: { fontSize: 12 },
  itemMeta: { fontSize: 12 },
  itemTime: { fontSize: 12, fontWeight: "700" },
  statusChip: {
    minHeight: 26,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  line: { fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalMain: { fontSize: 16, fontWeight: "700" },
  modalLine: { fontSize: 13, lineHeight: 19 },
});
