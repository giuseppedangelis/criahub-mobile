import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AppButton } from "@/src/components/ui/AppButton";
import { DateField } from "@/src/components/ui/DateField";
import { TextField } from "@/src/components/ui/TextField";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TaskExecutionDraftAttachment, TaskExecutionOutcome } from "@/src/types/domain";

interface TaskExecutionModalProps {
  visible: boolean;
  task: { id: string; title: string } | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    outcome: TaskExecutionOutcome;
    notes: string | null;
    next_due_date: string | null;
    attachments: TaskExecutionDraftAttachment[];
  }) => void;
}

const OUTCOMES: Array<{ value: TaskExecutionOutcome; label: string }> = [
  { value: "concluida", label: "Concluída" },
  { value: "incompleta", label: "Incompleta" },
  { value: "nao_realizada", label: "Não realizada" },
  { value: "reagendada", label: "Reagendada" },
];

export function TaskExecutionModal({ visible, task, loading, onClose, onSubmit }: TaskExecutionModalProps) {
  const { theme } = useAppTheme();
  const [outcome, setOutcome] = useState<TaskExecutionOutcome>("concluida");
  const [notes, setNotes] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [attachments, setAttachments] = useState<TaskExecutionDraftAttachment[]>([]);

  const isNonConcluded = outcome !== "concluida";

  const suggestNextDate = (daysAhead: number) => {
    const base = new Date();
    base.setDate(base.getDate() + daysAhead);
    const iso = base.toISOString().slice(0, 10);
    setNextDueDate(iso);
  };

  const addPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAttachments((prev) => [
      ...prev,
      {
        kind: "photo",
        uri: asset.uri,
        file_name: asset.fileName || `foto-${Date.now()}.jpg`,
        mime_type: asset.mimeType || "image/jpeg",
      },
    ]);
  };

  const addDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAttachments((prev) => [
      ...prev,
      {
        kind: "document",
        uri: asset.uri,
        file_name: asset.name || `documento-${Date.now()}`,
        mime_type: asset.mimeType || null,
      },
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((outcome === "incompleta" || outcome === "nao_realizada") && !notes.trim()) return;
    if (outcome === "reagendada" && !nextDueDate.trim()) return;
    onSubmit({
      outcome,
      notes: notes.trim() || null,
      next_due_date: isNonConcluded ? nextDueDate.trim() || null : null,
      attachments,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAwareScrollView
          bottomOffset={32}
          extraKeyboardSpace={30}
          keyboardShouldPersistTaps="handled"
          style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Executar tarefa</Text>
          <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>{task?.title || "-"}</Text>

          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Resultado</Text>
          <View style={styles.optionRow}>
            {OUTCOMES.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setOutcome(item.value)}
                style={({ pressed }) => [
                  styles.optionChip,
                  {
                    borderColor: outcome === item.value ? theme.colors.primary : theme.colors.border,
                    backgroundColor: outcome === item.value ? theme.colors.surfaceAlt : "transparent",
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {isNonConcluded ? (
            <>
              <DateField
                label={outcome === "reagendada" ? "Nova data (obrigatória)" : "Sugerir nova data (opcional)"}
                value={nextDueDate}
                onChange={setNextDueDate}
              />
              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => suggestNextDate(1)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>Amanhã</Text>
                </Pressable>
                <Pressable
                  onPress={() => suggestNextDate(3)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>+3 dias</Text>
                </Pressable>
                <Pressable
                  onPress={() => suggestNextDate(7)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>+7 dias</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <TextField
            label="Devolutiva"
            value={notes}
            onChangeText={setNotes}
            placeholder={outcome === "concluida" ? "Observações opcionais" : "Descreva o motivo"}
            multiline
            style={styles.textArea}
          />

          <View style={styles.buttonsRow}>
            <AppButton label="Adicionar foto" variant="ghost" onPress={addPhoto} />
            <AppButton label="Adicionar doc" variant="ghost" onPress={addDocument} />
          </View>

          <View style={styles.attachmentList}>
            {attachments.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={[styles.attachmentItem, { borderColor: theme.colors.border }]}> 
                <Text style={[styles.attachmentName, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.kind === "photo" ? "[Foto]" : "[Doc]"} {item.file_name}
                </Text>
                <Pressable onPress={() => removeAttachment(index)}>
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.modalActions}>
            <AppButton label="Cancelar" onPress={onClose} variant="ghost" />
            <AppButton label="Salvar execução" onPress={handleSubmit} loading={loading} />
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalSubtitle: { fontSize: 13 },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  textArea: { minHeight: 96 },
  buttonsRow: { flexDirection: "row", gap: 8 },
  attachmentList: { gap: 8 },
  attachmentItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  attachmentName: { flex: 1, fontSize: 12 },
  modalActions: { gap: 8, marginTop: 6 },
});
