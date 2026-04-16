import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimalSearchSelect } from "@/src/components/ui/AnimalSearchSelect";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { OptionSearchSelect } from "@/src/components/ui/OptionSearchSelect";
import { ScheduleSegmented } from "@/src/components/ui/ScheduleSegmented";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAssignableMembersQuery, useCreateTaskMutation, useTasksQuery, useUpdateTaskMutation } from "@/src/hooks/useTasks";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TaskPriority, TaskStatus } from "@/src/types/domain";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function withFallback(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function getStatusAccent(status: TaskStatus) {
  if (status === "concluida") return "success" as const;
  if (status === "em_andamento") return "info" as const;
  return "warning" as const;
}

function getPriorityAccent(priority: TaskPriority) {
  if (priority === "alta") return "danger" as const;
  if (priority === "media") return "warning" as const;
  return "success" as const;
}

export function CreatorRoutineScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();

  const canAccess = isCreatorRole(role);
  const tasksQuery = useTasksQuery(harasId ? { haras_id: harasId } : null, canAccess);
  const membersQuery = useAssignableMembersQuery(harasId);
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(today());
  const [status, setStatus] = useState<TaskStatus>("pendente");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [observations, setObservations] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [responsibleId, setResponsibleId] = useState("");

  const summary = useMemo(() => {
    const list = tasksQuery.data ?? [];
    return {
      pending: list.filter((item) => item.status === "pendente").length,
      inProgress: list.filter((item) => item.status === "em_andamento").length,
      done: list.filter((item) => item.status === "concluida").length,
    };
  }, [tasksQuery.data]);

  const members = useMemo(() => {
    const list = membersQuery.data ?? [];
    return list.map((item) => ({
      id: item.id,
      label: item.full_name || item.email || item.role,
      description: item.email && item.full_name ? item.email : item.role,
    }));
  }, [membersQuery.data]);

  const resetForm = () => {
    setTitle("");
    setDueDate(today());
    setStatus("pendente");
    setPriority("media");
    setObservations("");
    setAnimalId("");
    setAnimalSearch("");
    setResponsibleId("");
    setEditingTaskId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (taskId: string) => {
    const current = tasksQuery.data?.find((item) => item.id === taskId);
    if (!current) return;
    setEditingTaskId(taskId);
    setTitle(current.title);
    setDueDate(current.due_date);
    setStatus(current.status);
    setPriority(current.priority);
    setObservations(current.observations || "");
    setAnimalId(current.animal_id || "");
    setAnimalSearch(current.animal_name || "");
    setResponsibleId(current.responsible_id || "");
    setCreateOpen(true);
  };

  const onSave = () => {
    if (!harasId || !title.trim() || !dueDate.trim()) return;

    if (editingTaskId) {
      updateTaskMutation.mutate(
        {
          taskId: editingTaskId,
          input: {
            title: title.trim(),
            due_date: dueDate.trim(),
            status,
            priority,
            observations: observations.trim() || null,
            animal_id: animalId || null,
            responsible_id: responsibleId || null,
          },
        },
        {
          onSuccess: () => {
            setCreateOpen(false);
            resetForm();
          },
        }
      );
      return;
    }

    createTaskMutation.mutate(
      {
        haras_id: harasId,
        title: title.trim(),
        due_date: dueDate.trim(),
        status,
        priority,
        observations: observations.trim() || null,
        animal_id: animalId || null,
        responsible_id: responsibleId || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetForm();
        },
      }
    );
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Rotina indisponível" description="Disponível para perfil Criador." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Tarefas</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Gestão de tarefas do haras no mobile.</Text>
      </View>

      <ScheduleSegmented active="tarefas" />

      <Card>
        <AppButton label="Nova tarefa" onPress={openCreate} />
      </Card>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: `${theme.colors.warning}1A`, borderColor: `${theme.colors.warning}55` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Pendentes</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.pending}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: `${theme.colors.info}1A`, borderColor: `${theme.colors.info}55` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Em andamento</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.inProgress}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: `${theme.colors.success}1A`, borderColor: `${theme.colors.success}55` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Concluídas</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.done}</Text>
        </View>
      </View>

      <Card>
        {tasksQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : tasksQuery.data?.length ? (
          tasksQuery.data.slice(0, 80).map((task) => (
            <Pressable
              key={task.id}
              onPress={() => openEdit(task.id)}
              style={({ pressed }) => [
                styles.taskRow,
                { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <View style={styles.taskMain}>
                <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {task.title}
                </Text>
                <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  Prazo: {task.due_date}
                </Text>
                <View style={styles.taskBadgesRow}>
                  <View
                    style={[
                      styles.taskBadge,
                      {
                        borderColor:
                          getStatusAccent(task.status) === "success"
                            ? theme.colors.success
                            : getStatusAccent(task.status) === "info"
                            ? theme.colors.info
                            : theme.colors.warning,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskBadgeLabel,
                        {
                          color:
                            getStatusAccent(task.status) === "success"
                              ? theme.colors.success
                              : getStatusAccent(task.status) === "info"
                              ? theme.colors.info
                              : theme.colors.warning,
                        },
                      ]}
                    >
                      {task.status.replaceAll("_", " ")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.taskBadge,
                      {
                        borderColor:
                          getPriorityAccent(task.priority) === "danger"
                            ? theme.colors.danger
                            : getPriorityAccent(task.priority) === "warning"
                            ? theme.colors.warning
                            : theme.colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskBadgeLabel,
                        {
                          color:
                            getPriorityAccent(task.priority) === "danger"
                              ? theme.colors.danger
                              : getPriorityAccent(task.priority) === "warning"
                              ? theme.colors.warning
                              : theme.colors.success,
                        },
                      ]}
                    >
                      {task.priority}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  Animal: {withFallback(task.animal_name, "Não vinculado")}
                </Text>
                <Text style={[styles.line, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  Responsável: {withFallback(task.responsible_name, "Não atribuído")}
                </Text>
              </View>
              <Text style={[styles.editLabel, { color: theme.colors.primary }]}>Editar</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhuma tarefa cadastrada.</Text>
        )}
      </Card>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editingTaskId ? "Editar tarefa" : "Nova tarefa"}</Text>
            <TextField label="Título" value={title} onChangeText={setTitle} />
            <DateField label="Prazo" value={dueDate} onChange={setDueDate} />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Status</Text>
            <View style={styles.optionRow}>
              {(["pendente", "em_andamento", "concluida"] as TaskStatus[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setStatus(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: status === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: status === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Prioridade</Text>
            <View style={styles.optionRow}>
              {(["baixa", "media", "alta"] as TaskPriority[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setPriority(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: priority === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: priority === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <AnimalSearchSelect
              title="Animal (opcional)"
              harasId={harasId}
              enabled={canAccess}
              filters={{ status: "ativo" }}
              selectedId={animalId}
              searchValue={animalSearch}
              onSearchChange={setAnimalSearch}
              searchPlaceholder="Busque por nome ou registro"
              onSelect={(animal) => {
                setAnimalId(animal.id);
                setAnimalSearch(animal.name);
              }}
              onClearSelected={() => {
                setAnimalId("");
                setAnimalSearch("");
              }}
            />

            <OptionSearchSelect
              label="Responsável"
              options={members}
              value={responsibleId}
              onChange={setResponsibleId}
              placeholder="Buscar por nome ou email"
              emptyText="Nenhum membro encontrado."
              maxHeight={160}
            />
            <Text style={[styles.helperLine, { color: theme.colors.textMuted }]}>
              Deixe em branco para tarefa sem responsável.
            </Text>

            <TextField label="Observações" value={observations} onChangeText={setObservations} multiline style={styles.textArea} />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setCreateOpen(false)} variant="ghost" />
              <AppButton label={editingTaskId ? "Salvar" : "Criar tarefa"} onPress={onSave} loading={createTaskMutation.isPending || updateTaskMutation.isPending} />
            </View>
          </ScrollView>
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
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryValue: { fontSize: 20, fontWeight: "700" },
  line: { fontSize: 12 },
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
  taskMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  taskTitle: { fontSize: 14, fontWeight: "700" },
  taskBadgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  taskBadge: {
    borderWidth: 1,
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  taskBadgeLabel: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  editLabel: { fontSize: 12, fontWeight: "700", flexShrink: 0 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  modalCard: {
    maxHeight: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
  },
  modalContent: { padding: 16, gap: 10, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  helperLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  textArea: { minHeight: 90 },
  modalActions: { gap: 8, marginTop: 6 },
});
