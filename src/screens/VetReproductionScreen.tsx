import { Activity, Baby, Plus } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import {
  useCreateGestationMutation,
  useCreateReproductiveEventMutation,
  useGestationsQuery,
  useReproductionStatsQuery,
  useReproductiveEventsQuery,
  useUpdateGestationStatusMutation,
} from "@/src/hooks/useReproduction";
import { resolveVetAccess } from "@/src/lib/vet-access";
import {
  normalizeGestationStatus,
  normalizeReproductionEventStatus,
  todayIsoDate,
} from "@/src/lib/vet-shared";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";

const EVENT_TYPE_OPTIONS = [
  { value: "cobertura", label: "Cobertura" },
  { value: "inseminacao", label: "Inseminação" },
  { value: "coleta_ovulos", label: "Coleta de Óvulos" },
  { value: "transferencia_embriao", label: "Transferência" },
  { value: "diagnostico_gestacao", label: "Diagnóstico" },
  { value: "parto", label: "Parto" },
] as const;

const EVENT_STATUS_OPTIONS = ["Pendente", "Confirmado", "Concluído"] as const;

const GESTATION_STATUS_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "confirmada", label: "Confirmada" },
  { value: "nascimento", label: "Nascimento" },
  { value: "aborto", label: "Aborto" },
  { value: "reabsorvida", label: "Reabsorvida" },
] as const;

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

function inferMareName(item: {
  mare_name: string | null;
  animal_name: string | null;
}) {
  return item.mare_name || item.animal_name;
}

function eventAccent(status: string | null | undefined) {
  const normalized = normalizeReproductionEventStatus(status);
  if (normalized === "concluido") return "success" as const;
  if (normalized === "confirmado") return "info" as const;
  return "warning" as const;
}

function gestationAccent(status: string | null | undefined) {
  const normalized = normalizeGestationStatus(status);
  if (normalized === "aborto") return "danger" as const;
  if (normalized === "nascimento") return "success" as const;
  if (normalized === "confirmada") return "info" as const;
  return "warning" as const;
}

function AnimalPicker({
  title,
  animals,
  selectedId,
  onSelect,
}: {
  title: string;
  animals: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return animals;
    return animals.filter((item) => item.name.toLowerCase().includes(text));
  }, [animals, search]);

  return (
    <View style={styles.selectorBlock}>
      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{title}</Text>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nome"
      />
      <View style={[styles.selectorList, { borderColor: theme.colors.border }]}>
        <ScrollView nestedScrollEnabled style={styles.selectorScroll}>
          {filtered.slice(0, 35).map((item) => {
            const active = selectedId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [
                  styles.selectorItem,
                  {
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: active ? theme.colors.surfaceAlt : "transparent",
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text }}>{item.name}</Text>
              </Pressable>
            );
          })}
          {filtered.length === 0 ? (
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Nenhum animal encontrado.</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

export function VetReproductionScreen() {
  const params = useLocalSearchParams<{ action?: string; animalId?: string }>();
  const { role, harasId, profile } = useAuth();
  const { theme } = useAppTheme();
  const vetAccess = resolveVetAccess(role, harasId);
  const vetHarasId = vetAccess.scopedHarasId;

  const eventsQuery = useReproductiveEventsQuery(vetHarasId);
  const gestationsQuery = useGestationsQuery(vetHarasId);
  const statsQuery = useReproductionStatsQuery(vetHarasId);
  const createEventMutation = useCreateReproductiveEventMutation();
  const createGestationMutation = useCreateGestationMutation();
  const updateGestationStatusMutation = useUpdateGestationStatusMutation();
  const maresQuery = useAnimalsQuery(
    { haras_id: vetHarasId ?? undefined, sex: "Fêmea", status: "ativo" },
    { page: 1, limit: 200 },
    vetAccess.canLoadVetData,
  );
  const stallionsQuery = useAnimalsQuery(
    { haras_id: vetHarasId ?? undefined, sex: "Macho", status: "ativo" },
    { page: 1, limit: 200 },
    vetAccess.canLoadVetData,
  );

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [gestationModalOpen, setGestationModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    id: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const [eventType, setEventType] = useState("inseminacao");
  const [eventFilter, setEventFilter] = useState<
    "all" | "pendente" | "confirmado" | "concluido"
  >("all");
  const [eventDate, setEventDate] = useState(todayIsoDate());
  const [eventMareId, setEventMareId] = useState("");
  const [eventStallionId, setEventStallionId] = useState("");
  const [eventStatus, setEventStatus] = useState("Pendente");
  const [eventNotes, setEventNotes] = useState("");

  const [gestationMareId, setGestationMareId] = useState("");
  const [gestationFilter, setGestationFilter] = useState<
    "all" | "em_andamento" | "confirmada" | "nascimento" | "aborto"
  >("all");
  const [gestationStallionId, setGestationStallionId] = useState("");
  const [gestationStartDate, setGestationStartDate] = useState(todayIsoDate());
  const [gestationConfirmDate, setGestationConfirmDate] =
    useState(todayIsoDate());
  const [gestationExpectedBirth, setGestationExpectedBirth] = useState("");
  const [gestationStatus, setGestationStatus] = useState("em_andamento");
  const [gestationNotes, setGestationNotes] = useState("");

  const mares = useMemo(
    () =>
      (maresQuery.data?.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      })),
    [maresQuery.data?.data],
  );
  const stallions = useMemo(
    () =>
      (stallionsQuery.data?.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      })),
    [stallionsQuery.data?.data],
  );
  const selectedEventMareName =
    mares.find((item) => item.id === eventMareId)?.name || "Nenhuma égua selecionada";
  const selectedEventStallionName =
    stallions.find((item) => item.id === eventStallionId)?.name ||
    "Sem garanhão vinculado";
  const selectedGestationMareName =
    mares.find((item) => item.id === gestationMareId)?.name ||
    "Nenhuma égua selecionada";
  const selectedGestationStallionName =
    stallions.find((item) => item.id === gestationStallionId)?.name ||
    "Sem garanhão vinculado";

  const resetEventForm = () => {
    setEventType("inseminacao");
    setEventDate(todayIsoDate());
    setEventMareId("");
    setEventStallionId("");
    setEventStatus("Pendente");
    setEventNotes("");
  };

  const resetGestationForm = () => {
    setGestationMareId("");
    setGestationStallionId("");
    setGestationStartDate(todayIsoDate());
    setGestationConfirmDate(todayIsoDate());
    setGestationExpectedBirth("");
    setGestationStatus("em_andamento");
    setGestationNotes("");
  };

  useEffect(() => {
    if (!params.action) return;
    if (params.animalId) {
      const value = String(params.animalId);
      setEventMareId(value);
      setGestationMareId(value);
    }
    if (params.action === "exam" || params.action === "insemination") {
      setEventModalOpen(true);
      if (params.action === "insemination") {
        setEventType("inseminacao");
      }
    }
  }, [params.action, params.animalId]);

  if (!vetAccess.canAccessVet) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Reprodução Veterinária"
            description="Disponível apenas para perfil Veterinária."
          />
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
            description="Seu perfil veterinário está sem haras ativo. Ajuste o vínculo para carregar reprodução."
          />
        </View>
      </AppScreen>
    );
  }

  const events = eventsQuery.data ?? [];
  const gestations = gestationsQuery.data ?? [];
  const stats = statsQuery.data;
  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return events;
    return events.filter(
      (item) => normalizeReproductionEventStatus(item.status) === eventFilter,
    );
  }, [eventFilter, events]);
  const filteredGestations = useMemo(() => {
    if (gestationFilter === "all") return gestations;
    return gestations.filter(
      (item) => normalizeGestationStatus(item.status) === gestationFilter,
    );
  }, [gestationFilter, gestations]);

  return (
    <AppScreen scroll>
      {message ? (
        <Card>
          <Text
            style={{
              color:
                message.tone === "success"
                  ? theme.colors.success
                  : theme.colors.danger,
              fontWeight: "600",
            }}
          >
            {message.text}
          </Text>
        </Card>
      ) : null}

      <View style={styles.summaryGrid}>
        <Card style={[styles.summaryCard, { borderColor: `${theme.colors.info}55`, backgroundColor: `${theme.colors.info}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Eventos</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}> 
            {stats?.total_events ?? events.length}
          </Text>
        </Card>
        <Card style={[styles.summaryCard, { borderColor: `${theme.colors.primary}55`, backgroundColor: `${theme.colors.primary}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Gestações</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}> 
            {stats?.total_gestations ?? gestations.length}
          </Text>
        </Card>
        <Card style={[styles.summaryCard, { borderColor: `${theme.colors.success}55`, backgroundColor: `${theme.colors.success}14` }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Ativas</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}> 
            {stats?.active_gestations ?? 0}
          </Text>
        </Card>
      </View>

      <Card>
        <View style={styles.row}>
          <Plus size={18} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}> 
            Novo registro reprodutivo
          </Text>
        </View>
        <View style={styles.actionGrid}>
          <AppButton
            label="Novo evento"
            onPress={() => setEventModalOpen(true)}
          />
          <AppButton
            label="Nova gestação"
            variant="ghost"
            onPress={() => setGestationModalOpen(true)}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Activity size={18} color={theme.colors.info} />
          <Text style={[styles.cardTitle, { color: theme.colors.info }]}> 
            Eventos Reprodutivos
          </Text>
        </View>
        <View style={styles.filterRow}>
          {([
            { id: "all", label: "Todos" },
            { id: "pendente", label: "Pendentes" },
            { id: "confirmado", label: "Confirmados" },
            { id: "concluido", label: "Concluídos" },
          ] as const).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setEventFilter(item.id)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor:
                    eventFilter === item.id
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    eventFilter === item.id
                      ? theme.colors.surfaceAlt
                      : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {eventsQuery.isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Carregando eventos...</Text>
        ) : eventsQuery.error ? (
          <Text style={[styles.emptyText, { color: theme.colors.danger }]}>Não foi possível carregar eventos.</Text>
        ) : filteredEvents.length ? (
          filteredEvents.slice(0, 20).map((item) => {
            const tone = eventAccent(item.status);
            const accent = tone === "success" ? theme.colors.success : tone === "info" ? theme.colors.info : theme.colors.warning;
            return (
              <View
                key={item.id}
                style={[styles.listRow, { borderColor: theme.colors.border }]}
              >
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}> 
                    {normalizeEventType(item.event_type)}
                  </Text>
                  <Text
                    style={[styles.rowMeta, { color: theme.colors.textMuted }]}
                  >
                    {formatDateBR(item.event_date)} • Égua:{" "}
                    {inferMareName(item) || "-"}
                  </Text>
                  <Text
                    style={[styles.rowMeta, { color: theme.colors.textMuted }]}
                  >
                    Garanhão: {item.stallion_name || "-"}
                  </Text>
                </View>
                <View style={[styles.statusPill, { borderColor: accent }]}> 
                  <Text style={[styles.statusPillLabel, { color: accent }]}>{item.status || "-"}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Nenhum evento reprodutivo.
          </Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <Baby size={18} color={theme.colors.success} />
          <Text style={[styles.cardTitle, { color: theme.colors.success }]}> 
            Gestações
          </Text>
        </View>
        <View style={styles.filterRow}>
          {([
            { id: "all", label: "Todas" },
            { id: "em_andamento", label: "Ativas" },
            { id: "confirmada", label: "Confirmadas" },
            { id: "nascimento", label: "Nascimento" },
            { id: "aborto", label: "Aborto" },
          ] as const).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setGestationFilter(item.id)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor:
                    gestationFilter === item.id
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    gestationFilter === item.id
                      ? theme.colors.surfaceAlt
                      : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {gestationsQuery.isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Carregando gestações...</Text>
        ) : gestationsQuery.error ? (
          <Text style={[styles.emptyText, { color: theme.colors.danger }]}>Não foi possível carregar gestações.</Text>
        ) : filteredGestations.length ? (
          filteredGestations.slice(0, 20).map((item) => {
            const tone = gestationAccent(item.status);
            const accent = tone === "danger" ? theme.colors.danger : tone === "success" ? theme.colors.success : tone === "info" ? theme.colors.info : theme.colors.warning;
            return (
              <View
                key={item.id}
                style={[styles.listRow, { borderColor: theme.colors.border }]}
              >
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}> 
                    Égua: {item.egua_name || "-"}
                  </Text>
                  <Text
                    style={[styles.rowMeta, { color: theme.colors.textMuted }]}
                  >
                    Diagnóstico: {formatDateBR(item.data_diagnostico)}
                  </Text>
                  <Text
                    style={[styles.rowMeta, { color: theme.colors.textMuted }]}
                  >
                    Garanhão: {item.garanhao_name || "-"}
                  </Text>
                  <Text
                    style={[styles.rowMeta, { color: theme.colors.textMuted }]}
                  >
                    Parto previsto: {formatDateBR(item.data_prevista_parto)}
                  </Text>
                </View>
                <Pressable onPress={() => setStatusModal({ id: item.id })}>
                  <View style={[styles.statusPill, { borderColor: accent }]}> 
                    <Text style={[styles.statusPillLabel, { color: accent }]}>{item.status || "-"}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Nenhuma gestação cadastrada.
          </Text>
        )}
      </Card>

      <Modal
        visible={eventModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEventModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEventModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={28}
            extraKeyboardSpace={30}
            keyboardShouldPersistTaps="handled"
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Novo evento reprodutivo
            </Text>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Tipo</Text>
            <View style={styles.optionRow}>
              {EVENT_TYPE_OPTIONS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setEventType(item.value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        eventType === item.value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        eventType === item.value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <DateField label="Data" value={eventDate} onChange={setEventDate} />
            <AnimalPicker
              title="Égua"
              animals={mares}
              selectedId={eventMareId}
              onSelect={setEventMareId}
            />
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Égua selecionada: {selectedEventMareName}</Text>
            <AnimalPicker
              title="Garanhão (opcional)"
              animals={stallions}
              selectedId={eventStallionId}
              onSelect={setEventStallionId}
            />
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Garanhão selecionado: {selectedEventStallionName}</Text>
            <AppButton
              label="Limpar garanhão"
              variant="ghost"
              onPress={() => setEventStallionId("")}
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Status</Text>
            <View style={styles.optionRow}>
              {EVENT_STATUS_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEventStatus(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        eventStatus === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        eventStatus === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Observações"
              value={eventNotes}
              onChangeText={setEventNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                variant="ghost"
                onPress={() => setEventModalOpen(false)}
              />
              <AppButton
                label="Salvar"
                loading={createEventMutation.isPending}
                disabled={!eventMareId.trim()}
                onPress={() => {
                  if (!vetHarasId || !eventMareId.trim()) return;
                  createEventMutation.mutate(
                    {
                      haras_id: vetHarasId,
                      animal_id: eventMareId.trim(),
                      mare_id: eventMareId.trim(),
                      stallion_id: eventStallionId.trim() || null,
                      event_type: eventType.trim(),
                      event_date: eventDate,
                      status: eventStatus.trim() || null,
                      observations: eventNotes.trim() || null,
                      veterinarian: profile?.full_name || null,
                    },
                    {
                      onSuccess: () => {
                        setMessage({
                          text: "Evento reprodutivo registrado.",
                          tone: "success",
                        });
                        resetEventForm();
                        setEventModalOpen(false);
                      },
                      onError: (e) =>
                        setMessage({
                          text:
                            e instanceof Error
                              ? e.message
                              : "Falha ao salvar evento.",
                          tone: "danger",
                        }),
                    },
                  );
                }}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={gestationModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGestationModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setGestationModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={28}
            extraKeyboardSpace={30}
            keyboardShouldPersistTaps="handled"
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Nova gestação
            </Text>
            <AnimalPicker
              title="Égua"
              animals={mares}
              selectedId={gestationMareId}
              onSelect={setGestationMareId}
            />
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Égua selecionada: {selectedGestationMareName}</Text>
            <AnimalPicker
              title="Garanhão (opcional)"
              animals={stallions}
              selectedId={gestationStallionId}
              onSelect={setGestationStallionId}
            />
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Garanhão selecionado: {selectedGestationStallionName}</Text>
            <AppButton
              label="Limpar garanhão"
              variant="ghost"
              onPress={() => setGestationStallionId("")}
            />
            <DateField
              label="Data inicial"
              value={gestationStartDate}
              onChange={setGestationStartDate}
            />
            <DateField
              label="Data diagnóstico"
              value={gestationConfirmDate}
              onChange={setGestationConfirmDate}
            />
            <DateField
              label="Parto previsto"
              value={gestationExpectedBirth}
              onChange={setGestationExpectedBirth}
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Status</Text>
            <View style={styles.optionRow}>
              {GESTATION_STATUS_OPTIONS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setGestationStatus(item.value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        gestationStatus === item.value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        gestationStatus === item.value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Observações"
              value={gestationNotes}
              onChangeText={setGestationNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                variant="ghost"
                onPress={() => setGestationModalOpen(false)}
              />
              <AppButton
                label="Salvar"
                loading={createGestationMutation.isPending}
                disabled={!gestationMareId.trim()}
                onPress={() => {
                  if (!vetHarasId || !gestationMareId.trim()) return;
                  createGestationMutation.mutate(
                    {
                      haras_id: vetHarasId,
                      mare_id: gestationMareId.trim(),
                      stallion_id: gestationStallionId.trim() || null,
                      start_date: gestationStartDate,
                      confirmation_date: gestationConfirmDate || null,
                      expected_birth_date: gestationExpectedBirth || null,
                      status: gestationStatus || "em_andamento",
                      veterinarian: profile?.full_name || null,
                      observations: gestationNotes.trim() || null,
                    },
                    {
                      onSuccess: () => {
                        setMessage({
                          text: "Gestação registrada.",
                          tone: "success",
                        });
                        resetGestationForm();
                        setGestationModalOpen(false);
                      },
                      onError: (e) =>
                        setMessage({
                          text:
                            e instanceof Error
                              ? e.message
                              : "Falha ao salvar gestação.",
                          tone: "danger",
                        }),
                    },
                  );
                }}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={Boolean(statusModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModal(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setStatusModal(null)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Atualizar status da gestação
            </Text>
            <View style={styles.actionGrid}>
              <AppButton
                label="Em andamento"
                variant="ghost"
                onPress={() => {
                  if (!statusModal) return;
                  updateGestationStatusMutation.mutate(
                    { id: statusModal.id, status: "em_andamento" },
                    {
                      onSuccess: () => {
                        setStatusModal(null);
                        setMessage({
                          text: "Status atualizado.",
                          tone: "success",
                        });
                      },
                    },
                  );
                }}
              />
              <AppButton
                label="Nascimento"
                variant="ghost"
                onPress={() => {
                  if (!statusModal) return;
                  updateGestationStatusMutation.mutate(
                    { id: statusModal.id, status: "nascimento" },
                    {
                      onSuccess: () => {
                        setStatusModal(null);
                        setMessage({
                          text: "Status atualizado.",
                          tone: "success",
                        });
                      },
                    },
                  );
                }}
              />
              <AppButton
                label="Aborto"
                onPress={() => {
                  if (!statusModal) return;
                  updateGestationStatusMutation.mutate(
                    { id: statusModal.id, status: "aborto" },
                    {
                      onSuccess: () => {
                        setStatusModal(null);
                        setMessage({
                          text: "Status atualizado.",
                          tone: "success",
                        });
                      },
                    },
                  );
                }}
              />
              <AppButton
                label="Reabsorvida"
                variant="ghost"
                onPress={() => {
                  if (!statusModal) return;
                  updateGestationStatusMutation.mutate(
                    { id: statusModal.id, status: "reabsorvida" },
                    {
                      onSuccess: () => {
                        setStatusModal(null);
                        setMessage({
                          text: "Status atualizado.",
                          tone: "success",
                        });
                      },
                    },
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  summaryGrid: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, minHeight: 86, justifyContent: "center", gap: 6 },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  actionGrid: { gap: 8, marginTop: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  listRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowMeta: { fontSize: 12 },
  rowStatus: { fontSize: 12, fontWeight: "700" },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 24,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statusPillLabel: { fontSize: 11, fontWeight: "700" },
  emptyText: { fontSize: 13 },
  inputLabel: { fontSize: 14, fontWeight: "600" },
  helperText: { fontSize: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorBlock: { gap: 8 },
  selectorList: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 90,
    maxHeight: 140,
    padding: 8,
  },
  selectorScroll: { flexGrow: 0 },
  selectorItem: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  modalCard: { borderWidth: 1, borderRadius: 16, maxHeight: "90%" },
  modalContent: { padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalActions: { gap: 8, marginTop: 6 },
});
