import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { FieldFilterChip } from "@/src/components/field/FieldFilterChip";
import { FieldStatCard } from "@/src/components/field/FieldStatCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TaskExecutionModal } from "@/src/components/tasks/TaskExecutionModal";
import { useAuth } from "@/src/contexts/AuthContext";
import { useExecuteTaskMutation, useTaskExecutionsQuery, useTasksQuery } from "@/src/hooks/useTasks";
import { isFieldStaffRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TaskPriority, TaskStatus } from "@/src/types/domain";

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function withFallback(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function FieldTasksScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();
  const canAccess = isFieldStaffRole(role);

  const [scope, setScope] = useState<"mine" | "haras">("mine");
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [historyTask, setHistoryTask] = useState<{ id: string; title: string } | null>(null);
  const [taskDueFilter, setTaskDueFilter] = useState<"all" | "overdue" | "today" | "next7" | "next30">("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | TaskStatus>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const myTasksQuery = useTasksQuery(
    harasId && user?.id
      ? {
          haras_id: harasId,
          responsible_id: user.id,
        }
      : null,
    canAccess
  );
  const harasTasksQuery = useTasksQuery(
    harasId
      ? {
          haras_id: harasId,
        }
      : null,
    canAccess
  );
  const taskHistoryQuery = useTaskExecutionsQuery(historyTask?.id, harasId);
  const executeTaskMutation = useExecuteTaskMutation();

  const activeTasksQuery = scope === "mine" ? myTasksQuery : harasTasksQuery;

  const list = useMemo(() => {
    const items = activeTasksQuery.data ?? [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end7 = new Date(today);
    end7.setDate(end7.getDate() + 7);
    const end30 = new Date(today);
    end30.setDate(end30.getDate() + 30);

    return items
      .filter((item) => {
        if (taskStatusFilter !== "all" && item.status !== taskStatusFilter) return false;
        if (taskPriorityFilter !== "all" && item.priority !== taskPriorityFilter) return false;

        const dueDate = new Date(`${item.due_date}T00:00:00`);
        if (Number.isNaN(dueDate.getTime())) return taskDueFilter === "all";
        if (taskDueFilter === "overdue") return dueDate.getTime() < today.getTime();
        if (taskDueFilter === "today") return dueDate.getTime() === today.getTime();
        if (taskDueFilter === "next7") return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= end7.getTime();
        if (taskDueFilter === "next30") return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= end30.getTime();
        return true;
      })
      .sort((a, b) => {
        if (a.status === "concluida" && b.status !== "concluida") return 1;
        if (a.status !== "concluida" && b.status === "concluida") return -1;
        return new Date(`${a.due_date}T00:00:00`).getTime() - new Date(`${b.due_date}T00:00:00`).getTime();
      });
  }, [activeTasksQuery.data, taskDueFilter, taskPriorityFilter, taskStatusFilter]);

  const summary = useMemo(() => {
    const base = activeTasksQuery.data ?? [];
    return {
      pending: base.filter((item) => item.status === "pendente").length,
      inProgress: base.filter((item) => item.status === "em_andamento").length,
      done: base.filter((item) => item.status === "concluida").length,
    };
  }, [activeTasksQuery.data]);

  const statusColor = (status: TaskStatus) => {
    if (status === "concluida") return theme.colors.success;
    if (status === "em_andamento") return theme.colors.info;
    return theme.colors.warning;
  };

  const priorityColor = (priority: TaskPriority) => {
    if (priority === "alta") return theme.colors.danger;
    if (priority === "media") return theme.colors.warning;
    return theme.colors.success;
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Minhas tarefas" description="Disponivel apenas para Peao/Funcionario." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Minhas tarefas</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Prioridade para tarefas atribuidas a voce, com visao secundaria do haras.</Text>

      <Card>
        <View style={styles.scopeRow}>
          <FieldFilterChip label="Minhas atribuidas" active={scope === "mine"} onPress={() => setScope("mine")} />
          <FieldFilterChip label="Todas do haras" active={scope === "haras"} onPress={() => setScope("haras")} />
        </View>
      </Card>

      {message ? (
        <Card>
          <Text style={{ color: message.tone === "danger" ? theme.colors.danger : message.tone === "warning" ? theme.colors.warning : theme.colors.success, fontSize: 13, fontWeight: "600" }}>{message.text}</Text>
        </Card>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <FieldStatCard label="Pendentes" value={summary.pending} tone="warning" compact />
        </View>
        <View style={styles.summaryBox}>
          <FieldStatCard label="Em andamento" value={summary.inProgress} tone="info" compact />
        </View>
        <View style={styles.summaryBox}>
          <FieldStatCard label="Concluidas" value={summary.done} tone="success" compact />
        </View>
      </View>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos prazos" },
            { key: "overdue", label: "Atrasadas" },
            { key: "today", label: "Hoje" },
            { key: "next7", label: "Prox. 7 dias" },
            { key: "next30", label: "Prox. 30 dias" },
          ].map((item) => (
            <FieldFilterChip
              key={item.key}
              label={item.label}
              active={taskDueFilter === item.key}
              onPress={() => setTaskDueFilter(item.key as "all" | "overdue" | "today" | "next7" | "next30")}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos status" },
            { key: "pendente", label: "Pendente" },
            { key: "em_andamento", label: "Em andamento" },
            { key: "concluida", label: "Concluida" },
          ].map((item) => (
            <FieldFilterChip
              key={item.key}
              label={item.label}
              active={taskStatusFilter === item.key}
              onPress={() => setTaskStatusFilter(item.key as "all" | TaskStatus)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todas prioridades" },
            { key: "alta", label: "Alta" },
            { key: "media", label: "Media" },
            { key: "baixa", label: "Baixa" },
          ].map((item) => (
            <FieldFilterChip
              key={item.key}
              label={item.label}
              active={taskPriorityFilter === item.key}
              onPress={() => setTaskPriorityFilter(item.key as "all" | TaskPriority)}
            />
          ))}
        </ScrollView>
      </Card>

      <Card>
        {activeTasksQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : activeTasksQuery.error ? (
          <Text style={[styles.line, { color: theme.colors.danger }]}>Falha ao carregar tarefas.</Text>
        ) : list.length ? (
          list.slice(0, 20).map((task) => (
            <View key={task.id} style={[styles.taskRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.rowHeader}>
                <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {task.title}
                </Text>
                <Text style={[styles.taskStatus, { color: statusColor(task.status) }]}>{task.status.replaceAll("_", " ")}</Text>
              </View>
              <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>Prazo: {formatDate(task.due_date)}</Text>
              <Text style={[styles.line, { color: priorityColor(task.priority) }]} numberOfLines={1}>Prioridade: {task.priority}</Text>
              <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>Animal: {withFallback(task.animal_name, "Nao vinculado")}</Text>
              {scope === "haras" ? (
                <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>Responsavel: {withFallback(task.responsible_name, "Nao atribuido")}</Text>
              ) : null}
              <View style={styles.actionsRow}>
                <AppButton label="Historico" variant="ghost" onPress={() => setHistoryTask({ id: task.id, title: task.title })} />
                {task.status !== "concluida" && task.responsible_id === user?.id ? (
                  <AppButton label="Executar" variant="ghost" onPress={() => setSelectedTask({ id: task.id, title: task.title })} />
                ) : null}
              </View>
              {scope === "haras" && task.responsible_id !== user?.id ? (
                <Text style={[styles.line, { color: theme.colors.warning }]}>Execucao permitida apenas para o responsavel atribuido.</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhuma tarefa neste filtro.</Text>
        )}
      </Card>

      <TaskExecutionModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        loading={executeTaskMutation.isPending}
        onClose={() => setSelectedTask(null)}
        onSubmit={async (payload) => {
          if (!harasId || !user?.id || !selectedTask) return;
          const selectedFromList = list.find((item) => item.id === selectedTask.id) || null;
          if (selectedFromList?.responsible_id && selectedFromList.responsible_id !== user.id) {
            setMessage({ text: "Somente o responsavel pode executar esta tarefa.", tone: "warning" });
            return;
          }
          const connection = await NetInfo.fetch();
          if (!connection.isConnected) {
            setMessage({ text: "Execucao de tarefa requer internet no momento.", tone: "warning" });
            return;
          }
          const suggestedNextDueDate =
            payload.outcome !== "concluida" && !payload.next_due_date
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              : payload.next_due_date;

          executeTaskMutation.mutate(
            {
              task_id: selectedTask.id,
              haras_id: harasId,
              executed_by: user.id,
              outcome: payload.outcome,
              notes: payload.notes,
              next_due_date: suggestedNextDueDate,
              attachments: payload.attachments,
            },
            {
              onSuccess: () => {
                setSelectedTask(null);
                const attachmentsCount = payload.attachments.length;
                setMessage({
                  text:
                    attachmentsCount > 0
                      ? `Execucao enviada com sucesso (${attachmentsCount} anexo(s)).`
                      : "Execucao enviada com sucesso.",
                  tone: "success",
                });
              },
              onError: (error) => {
                setMessage({ text: error instanceof Error ? error.message : "Falha ao executar tarefa.", tone: "danger" });
              },
            }
          );
        }}
      />

      <Modal visible={Boolean(historyTask)} transparent animationType="slide" onRequestClose={() => setHistoryTask(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setHistoryTask(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Historico da tarefa</Text>
              <Text style={[styles.line, { color: theme.colors.textMuted }]}>{historyTask?.title || "-"}</Text>

              {taskHistoryQuery.isLoading ? (
                <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando historico...</Text>
              ) : taskHistoryQuery.data?.length ? (
                taskHistoryQuery.data.slice(0, 12).map((item) => (
                  <View key={item.id} style={[styles.historyRow, { borderColor: theme.colors.border }]}> 
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.outcome.replaceAll("_", " ")}</Text>
                    <Text style={[styles.line, { color: theme.colors.textMuted }]}>Executado em: {formatDateTime(item.executed_at)}</Text>
                    <Text style={[styles.line, { color: theme.colors.textMuted }]}>Anexos: {item.attachments.length}</Text>
                    {item.notes ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Notas: {item.notes}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={[styles.line, { color: theme.colors.textMuted }]}>Sem historico de execucao.</Text>
              )}

              <AppButton label="Fechar" variant="ghost" onPress={() => setHistoryTask(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  line: { fontSize: 12 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: { flex: 1 },
  scopeRow: { flexDirection: "row", gap: 8 },
  filterRow: { gap: 8, paddingVertical: 6, paddingRight: 6 },
  taskRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: { fontWeight: "700", flex: 1, minWidth: 0 },
  taskStatus: { fontWeight: "700", flexShrink: 0 },
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: {
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
  },
  modalContent: { padding: 16, gap: 10, paddingBottom: 26 },
  historyRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
});
