import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import { useAssignableMembersQuery, useCreateTaskMutation, useTasksQuery, useUpdateTaskMutation } from "@/src/hooks/useTasks";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TaskPriority, TaskStatus } from "@/src/types/domain";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CreatorRoutineScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();

  const canAccess = isCreatorRole(role);
  const tasksQuery = useTasksQuery(harasId ? { haras_id: harasId } : null, canAccess);
  const animalsQuery = useAnimalsQuery({ haras_id: harasId ?? undefined, status: "ativo" }, { page: 1, limit: 150 }, canAccess);
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
  const [responsibleId, setResponsibleId] = useState("");

  const animals = animalsQuery.data?.data ?? [];
  const members = useMemo(() => {
    const list = membersQuery.data ?? [];
    return [{ id: "", label: "Sem responsável" }, ...list.map((item) => ({ id: item.id, label: item.full_name || item.email || item.role }))];
  }, [membersQuery.data]);

  const resetForm = () => {
    setTitle("");
    setDueDate(today());
    setStatus("pendente");
    setPriority("media");
    setObservations("");
    setAnimalId("");
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Rotina</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Gestão de tarefas do haras no mobile.</Text>
      </View>

      <Card>
        <AppButton label="Nova tarefa" onPress={openCreate} />
      </Card>

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
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{task.title}</Text>
                <Text style={[styles.line, { color: theme.colors.textMuted }]}>
                  {task.due_date} • {task.status} • {task.priority}
                </Text>
                <Text style={[styles.line, { color: theme.colors.textMuted }]}>
                  {task.animal_name || "Sem animal"} • {task.responsible_name || "Sem responsável"}
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

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Animal (opcional)</Text>
            <View style={styles.selectWrap}>
              {animals.slice(0, 40).map((animal) => (
                <Pressable key={animal.id} onPress={() => setAnimalId(animal.id)} style={[styles.selectItem, { borderColor: animalId === animal.id ? theme.colors.primary : theme.colors.border }]}> 
                  <Text style={{ color: theme.colors.text }}>{animal.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Responsável</Text>
            <View style={styles.selectWrap}>
              {members.map((member) => (
                <Pressable key={member.id || "none"} onPress={() => setResponsibleId(member.id)} style={[styles.selectItem, { borderColor: responsibleId === member.id ? theme.colors.primary : theme.colors.border }]}> 
                  <Text style={{ color: theme.colors.text }}>{member.label}</Text>
                </Pressable>
              ))}
            </View>

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
  taskTitle: { fontSize: 14, fontWeight: "700" },
  editLabel: { fontSize: 12, fontWeight: "700" },
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
  selectWrap: { gap: 6, maxHeight: 180 },
  selectItem: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  textArea: { minHeight: 90 },
  modalActions: { gap: 8, marginTop: 6 },
});
