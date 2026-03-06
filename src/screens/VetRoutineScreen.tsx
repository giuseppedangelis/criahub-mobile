import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TaskExecutionModal } from "@/src/components/tasks/TaskExecutionModal";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useExecuteTaskMutation, useTasksQuery } from "@/src/hooks/useTasks";
import { resolveVetAccess } from "@/src/lib/vet-access";
import { formatTaskPriority, formatTaskStatus } from "@/src/lib/vet-shared";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TaskPriority, TaskStatus } from "@/src/types/domain";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

function withFallback(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function taskStatusAccent(status: TaskStatus) {
  if (status === "concluida") return "success" as const;
  if (status === "em_andamento") return "info" as const;
  return "warning" as const;
}

function taskPriorityAccent(priority: TaskPriority) {
  if (priority === "alta") return "danger" as const;
  if (priority === "media") return "warning" as const;
  return "success" as const;
}

export function VetRoutineScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();
  const vetAccess = resolveVetAccess(role, harasId);
  const vetHarasId = vetAccess.scopedHarasId;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  const tasksQuery = useTasksQuery(
    vetHarasId
      ? {
          haras_id: vetHarasId,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          search,
          from_due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          to_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }
      : null,
    vetAccess.canLoadVetData
  );

  const executeTaskMutation = useExecuteTaskMutation();

  const tasks = useMemo(() => {
    const list = tasksQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const haystack = `${item.title} ${item.animal_name || ""} ${item.observations || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [tasksQuery.data, search]);

  const summary = useMemo(() => {
    const list = tasksQuery.data ?? [];
    return {
      pending: list.filter((item) => item.status === "pendente").length,
      inProgress: list.filter((item) => item.status === "em_andamento").length,
      done: list.filter((item) => item.status === "concluida").length,
    };
  }, [tasksQuery.data]);

  if (!vetAccess.canAccessVet) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Rotina Veterinária" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  if (!vetAccess.hasHaras) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Haras não vinculado" description="Ajuste o vínculo do perfil para carregar tarefas." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Rotina Veterinária</Text>
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.info }]}>Resumo</Text>
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
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Concluídas</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.done}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.warning }]}>Filtros</Text>
        <TextField value={search} onChangeText={setSearch} placeholder="Buscar tarefa, animal ou observação" />

        <View style={styles.filterRow}>
          {(["all", "pendente", "em_andamento", "concluida"] as StatusFilter[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => setStatusFilter(value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: statusFilter === value ? theme.colors.primary : theme.colors.border,
                  backgroundColor: statusFilter === value ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>{value === "all" ? "Status: todos" : formatTaskStatus(value)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(["all", "alta", "media", "baixa"] as PriorityFilter[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => setPriorityFilter(value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: priorityFilter === value ? theme.colors.primary : theme.colors.border,
                  backgroundColor: priorityFilter === value ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>{value === "all" ? "Prioridade: todas" : formatTaskPriority(value)}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>Tarefas do período</Text>
        {tasksQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : tasks.length ? (
          tasks.map((task) => {
            const statusTone = taskStatusAccent(task.status);
            const statusColor =
              statusTone === "success"
                ? theme.colors.success
                : statusTone === "info"
                ? theme.colors.info
                : theme.colors.warning;
            const priorityTone = taskPriorityAccent(task.priority);
            const priorityColor =
              priorityTone === "danger"
                ? theme.colors.danger
                : priorityTone === "warning"
                ? theme.colors.warning
                : theme.colors.success;

            return (
              <View key={task.id} style={[styles.taskRow, { borderColor: theme.colors.border }]}> 
                <View style={styles.taskMain}>
                  <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={2}>{task.title}</Text>
                  <Text style={[styles.taskMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    Prazo: {task.due_date}
                  </Text>
                  <View style={styles.badgesRow}>
                    <View style={[styles.badge, { borderColor: statusColor }]}> 
                      <Text style={[styles.badgeLabel, { color: statusColor }]}>{formatTaskStatus(task.status)}</Text>
                    </View>
                    <View style={[styles.badge, { borderColor: priorityColor }]}> 
                      <Text style={[styles.badgeLabel, { color: priorityColor }]}>{formatTaskPriority(task.priority)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.taskMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    Animal: {withFallback(task.animal_name, "Não vinculado")}
                  </Text>
                </View>
                {task.status !== "concluida" ? (
                  <Pressable onPress={() => setSelectedTask({ id: task.id, title: task.title })}>
                    <Text style={[styles.executeLabel, { color: theme.colors.primary }]}>Executar</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.doneLabel, { color: theme.colors.success }]}>Concluída</Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhuma tarefa no período selecionado.</Text>
        )}
      </Card>

      <TaskExecutionModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        loading={executeTaskMutation.isPending}
        onClose={() => setSelectedTask(null)}
        onSubmit={(payload) => {
          if (!vetHarasId || !user?.id || !selectedTask) return;
          executeTaskMutation.mutate(
            {
              task_id: selectedTask.id,
              haras_id: vetHarasId,
              executed_by: user.id,
              outcome: payload.outcome,
              notes: payload.notes,
              next_due_date: payload.next_due_date,
              attachments: payload.attachments,
            },
            {
              onSuccess: () => setSelectedTask(null),
            }
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 2 },
  title: { fontSize: 24, fontWeight: "700" },
  line: { fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  summaryLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "700" },
  summaryValue: { fontSize: 20, fontWeight: "700" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  filterChip: {
    borderWidth: 1,
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  taskRow: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 72,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  taskMain: { flex: 1, gap: 2, minWidth: 0 },
  taskTitle: { fontSize: 14, fontWeight: "700" },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 22,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { fontSize: 10, fontWeight: "700" },
  taskMeta: { fontSize: 12 },
  executeLabel: { fontSize: 12, fontWeight: "700" },
  doneLabel: { fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
});
