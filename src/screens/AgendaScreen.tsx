import { CalendarDays, PlusCircle } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAgendaQuery, useCreateAgendaEventMutation, useUpdateAgendaStatusMutation } from "@/src/hooks/useAgenda";
import { isCreatorRole, isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { AgendaEventItem } from "@/src/types/domain";
import { formatDateBR } from "@/src/utils/format";

function formatTime(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AgendaScreen() {
  const { role, harasId, profile } = useAuth();
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useAgendaQuery(harasId);
  const updateStatusMutation = useUpdateAgendaStatusMutation(harasId);
  const createEventMutation = useCreateAgendaEventMutation(harasId);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEventItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState("09:00");
  const [eventType, setEventType] = useState("Evento");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const canAccess = isCreatorRole(role) || isVeterinaryRole(role);

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const resetCreateForm = () => {
    setTitle("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEventTime("09:00");
    setEventType("Evento");
    setEventLocation("");
    setEventDescription("");
  };

  const buildStartDateTime = (dateValue: string, timeValue: string) => {
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hours, minutes] = timeValue.split(":").map(Number);
    if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
  };

  const onUpdateStatus = (status: "Pendente" | "Em andamento" | "Concluído" | "Cancelado") => {
    if (!selectedEvent) return;
    updateStatusMutation.mutate(
      { eventId: selectedEvent.id, status },
      {
        onSuccess: () => {
          setSelectedEvent((prev) => (prev ? { ...prev, status } : prev));
          setMessage({ text: `Evento marcado como ${status}.`, tone: "success" });
        },
        onError: (mutationError) => {
          setMessage({ text: mutationError instanceof Error ? mutationError.message : "Falha ao atualizar status do evento.", tone: "danger" });
        },
      }
    );
  };

  const onCreateEvent = () => {
    if (!harasId) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setMessage({ text: "Informe o título do evento.", tone: "warning" });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(eventTime.trim())) {
      setMessage({ text: "Use o formato de hora HH:MM.", tone: "warning" });
      return;
    }
    const startAt = buildStartDateTime(eventDate.trim(), eventTime.trim());
    if (!startAt) {
      setMessage({ text: "Data ou hora inválida para o evento.", tone: "warning" });
      return;
    }

    createEventMutation.mutate(
      {
        haras_id: harasId,
        titulo: normalizedTitle,
        tipo: eventType,
        data_inicio: startAt,
        status: "Pendente",
        local: eventLocation.trim() || null,
        descricao: eventDescription.trim() || null,
        responsavel: profile?.full_name || profile?.email || null,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetCreateForm();
          setMessage({ text: "Evento criado com sucesso.", tone: "success" });
        },
        onError: (mutationError) => {
          setMessage({ text: mutationError instanceof Error ? mutationError.message : "Falha ao criar evento.", tone: "danger" });
        },
      }
    );
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Agenda indisponível"
            description="Disponível nesta fase para Criador e Veterinária."
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Agenda</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
          Calendário do criador com foco no plantel e reprodução.
        </Text>
      </View>

      <Card>
        <View style={styles.row}>
          <CalendarDays size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Próximos eventos</Text>
        </View>

        {message ? (
          <Text
            style={[
              styles.message,
              {
                color:
                  message.tone === "danger"
                    ? theme.colors.danger
                    : message.tone === "warning"
                    ? theme.colors.warning
                    : theme.colors.success,
              },
            ]}
          >
            {message.text}
          </Text>
        ) : null}

        {isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando agenda...</Text>
        ) : error ? (
          <Text style={[styles.line, { color: theme.colors.danger }]}> 
            {error instanceof Error ? error.message : "Falha ao carregar agenda."}
          </Text>
        ) : data && data.length > 0 ? (
          data.slice(0, 14).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedEvent(item)}
              style={({ pressed }) => [
                styles.itemRow,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <View style={styles.itemMain}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {item.titulo}
                </Text>
                <Text style={[styles.itemType, { color: theme.colors.textMuted }]}> 
                  {item.tipo} {item.animal_name ? `• ${item.animal_name}` : ""}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                  {formatDateBR(item.data_inicio)} às {formatTime(item.data_inicio)}
                </Text>
              </View>
              <Text style={[styles.itemTime, { color: theme.colors.text }]} numberOfLines={1}>{item.status || "-"}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhum evento encontrado.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <PlusCircle size={18} color={theme.colors.info} />
          <Text style={[styles.hintTitle, { color: theme.colors.text }]}>Planejamento mobile</Text>
        </View>
        <Text style={[styles.hintText, { color: theme.colors.textMuted }]}> 
          Agenda conectada aos eventos do haras. Toque em um evento para marcar o status de execução.
        </Text>
        <AppButton
          label="Novo evento"
          onPress={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        />
      </Card>

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalhes do evento</Text>
              <Text style={[styles.modalStatus, { color: theme.colors.textMuted }]}>
                {selectedEvent?.status || "Sem status"}
              </Text>
            </View>

            <Text style={[styles.modalEventName, { color: theme.colors.text }]}>{selectedEvent?.titulo || "-"}</Text>

            <View style={styles.modalRows}>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Tipo: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.tipo || "-"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Início: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent ? `${formatDateBR(selectedEvent.data_inicio)} às ${formatTime(selectedEvent.data_inicio)}` : "-"}</Text>
              </Text>
              {selectedEvent?.data_fim ? (
                <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                  Término: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{`${formatDateBR(selectedEvent.data_fim)} às ${formatTime(selectedEvent.data_fim)}`}</Text>
                </Text>
              ) : null}
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Animal: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.animal_name || "Não informado"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Local: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.local || "Não informado"}</Text>
              </Text>
              <Text style={[styles.modalRow, { color: theme.colors.textMuted }]}> 
                Responsável: <Text style={[styles.modalValue, { color: theme.colors.text }]}>{selectedEvent?.responsavel || "Não informado"}</Text>
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: theme.colors.textMuted }]}>
              {selectedEvent?.descricao || "Sem observações para este evento."}
            </Text>

            <View style={styles.modalActions}>
              <AppButton label="Marcar pendente" variant="ghost" onPress={() => onUpdateStatus("Pendente")} loading={updateStatusMutation.isPending} />
              <AppButton label="Marcar em andamento" variant="ghost" onPress={() => onUpdateStatus("Em andamento")} loading={updateStatusMutation.isPending} />
              <AppButton label="Marcar concluído" onPress={() => onUpdateStatus("Concluído")} loading={updateStatusMutation.isPending} />
              <AppButton label="Marcar cancelado" variant="danger" onPress={() => onUpdateStatus("Cancelado")} loading={updateStatusMutation.isPending} />
              <AppButton label="Fechar" variant="ghost" onPress={closeModal} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalRootBottom}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)} />
          <ScrollView
            style={[styles.createModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.createModalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo evento</Text>
            <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Visita do ferrador" />
            <DateField label="Data" value={eventDate} onChange={setEventDate} />
            <TextField label="Hora" value={eventTime} onChangeText={setEventTime} placeholder="HH:MM" />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Tipo</Text>
            <View style={styles.typeRow}>
              {["Evento", "Serviço", "Veterinário", "Outro"].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setEventType(item)}
                  style={({ pressed }) => [
                    styles.typeChip,
                    {
                      borderColor: eventType === item ? theme.colors.primary : theme.colors.border,
                      backgroundColor: eventType === item ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 12 }}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <TextField label="Local (opcional)" value={eventLocation} onChangeText={setEventLocation} placeholder="Ex.: Pista coberta" />
            <TextField
              label="Descrição (opcional)"
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              style={styles.textArea}
              placeholder="Detalhes do evento"
            />

            <View style={styles.createActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setCreateOpen(false)} />
              <AppButton label="Criar evento" onPress={onCreateEvent} loading={createEventMutation.isPending} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  itemRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemMain: { flex: 1, minWidth: 0 },
  itemType: {
    fontSize: 12,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemTime: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 96,
  },
  line: {
    fontSize: 13,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalRootBottom: { flex: 1, justifyContent: "flex-end" },
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalEventName: {
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
  modalActions: {
    gap: 8,
    marginTop: 2,
  },
  createModalCard: {
    maxHeight: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
  },
  createModalContent: { padding: 16, gap: 10, paddingBottom: 30 },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderWidth: 1,
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  textArea: { minHeight: 90 },
  createActions: { gap: 8, marginTop: 4 },
});
