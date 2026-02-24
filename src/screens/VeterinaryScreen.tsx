import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Activity, RefreshCw, ShieldPlus, Syringe } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import {
  useAddSemenEntryMutation,
  useCompleteVetTaskMutation,
  useCreateBreedingEventMutation,
  useCreateHealthBatchMutation,
  useCreateReproductiveExamMutation,
  useCreateTreatmentMutation,
  useFlushVetQueueMutation,
  useRegisterLavageOutcomeMutation,
  useSemenInventoryQuery,
  useVeterinarySyncSnapshotQuery,
  useVeterinaryDashboardQuery,
} from "@/src/hooks/useVeterinary";
import { isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";

const EDEMA_OPTIONS = [0, 1, 2, 3, 4];
const CERVIX_OPTIONS = [0, 1, 2, 3];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function AnimalSelector({
  title,
  animals,
  selectedId,
  isSelected,
  onSelect,
}: {
  title: string;
  animals: { id: string; name: string }[];
  selectedId: string;
  isSelected?: (id: string) => boolean;
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
      <Text style={[styles.selectorTitle, { color: theme.colors.text }]}>{title}</Text>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar animal"
      />
      <View style={[styles.selectorList, { borderColor: theme.colors.border }]}>
        <ScrollView nestedScrollEnabled style={styles.selectorScroll}>
          {filtered.slice(0, 40).map((item) => {
            const active = selectedId === item.id || Boolean(isSelected?.(item.id));
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [
                  styles.selectorItem,
                  {
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: active ? theme.colors.surfaceAlt : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.selectorItemLabel, { color: theme.colors.text }]}>{item.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function QuickKpi({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <Card style={styles.kpiCard}>
      <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{value}</Text>
    </Card>
  );
}

export function VeterinaryScreen() {
  const params = useLocalSearchParams<{ action?: string; animalId?: string }>();
  const { role, harasId, user, profile } = useAuth();
  const { theme } = useAppTheme();
  const canAccess = isVeterinaryRole(role);

  const dashboardQuery = useVeterinaryDashboardQuery(harasId);
  const semenQuery = useSemenInventoryQuery(harasId);
  const syncSnapshotQuery = useVeterinarySyncSnapshotQuery(harasId);
  const femalesQuery = useAnimalsQuery(
    { haras_id: harasId ?? undefined, sex: "Fêmea", status: "ativo" },
    { page: 1, limit: 160 },
    canAccess
  );
  const stallionsQuery = useAnimalsQuery(
    { haras_id: harasId ?? undefined, sex: "Macho", status: "ativo" },
    { page: 1, limit: 120 },
    canAccess
  );

  const createExamMutation = useCreateReproductiveExamMutation(harasId);
  const createBreedingMutation = useCreateBreedingEventMutation(harasId);
  const createBatchMutation = useCreateHealthBatchMutation(harasId);
  const addSemenMutation = useAddSemenEntryMutation(harasId);
  const completeTaskMutation = useCompleteVetTaskMutation(harasId);
  const createTreatmentMutation = useCreateTreatmentMutation(harasId);
  const registerLavageOutcomeMutation = useRegisterLavageOutcomeMutation(harasId);
  const flushQueueMutation = useFlushVetQueueMutation(harasId);

  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examAnimalId, setExamAnimalId] = useState("");
  const [follicleRight, setFollicleRight] = useState("");
  const [follicleLeft, setFollicleLeft] = useState("");
  const [edema, setEdema] = useState(2);
  const [cervix, setCervix] = useState(1);
  const [liu, setLiu] = useState(false);
  const [induction, setInduction] = useState(false);
  const [inductor, setInductor] = useState<"HCG" | "Deslorelin">("HCG");
  const [examNotes, setExamNotes] = useState("");

  const [inseminationModalOpen, setInseminationModalOpen] = useState(false);
  const [mareId, setMareId] = useState("");
  const [stallionId, setStallionId] = useState("");
  const [method, setMethod] = useState<"IA" | "Monta" | "Transfer">("IA");
  const [semenType, setSemenType] = useState<"Fresco" | "Resfriado" | "Congelado">("Congelado");
  const [motilityQuality, setMotilityQuality] = useState<"Ótima" | "Boa" | "Regular" | "Ruim">("Boa");
  const [motilityPercent, setMotilityPercent] = useState("");
  const [strawsUsed, setStrawsUsed] = useState("1");
  const [inseminationNotes, setInseminationNotes] = useState("");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProcedureType, setBatchProcedureType] = useState<"Vacina" | "Vermífugo">("Vacina");
  const [batchProcedureName, setBatchProcedureName] = useState("");
  const [batchDate, setBatchDate] = useState(todayIsoDate());
  const [batchLot, setBatchLot] = useState("");
  const [batchExpiration, setBatchExpiration] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [batchSelected, setBatchSelected] = useState<Record<string, boolean>>({});
  const [batchCategoryFilter, setBatchCategoryFilter] = useState<"all" | "egua" | "garanhao" | "potro" | "potra" | "castrado">("all");

  const [semenEntryModalOpen, setSemenEntryModalOpen] = useState(false);
  const [entryStallionId, setEntryStallionId] = useState("");
  const [entryUnits, setEntryUnits] = useState("1");
  const [entrySemenType, setEntrySemenType] = useState<"Fresco" | "Resfriado" | "Congelado">("Congelado");
  const [entryReason, setEntryReason] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [treatmentAnimalId, setTreatmentAnimalId] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [treatmentDate, setTreatmentDate] = useState(todayIsoDate());
  const [treatmentNextDate, setTreatmentNextDate] = useState("");
  const [treatmentDescription, setTreatmentDescription] = useState("");
  const [treatmentMedication, setTreatmentMedication] = useState("");
  const [treatmentDosage, setTreatmentDosage] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");

  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "Pendente" | "Concluído">("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "Alta" | "Média" | "Baixa">("all");
  const [taskSearch, setTaskSearch] = useState("");

  const [lavageModalOpen, setLavageModalOpen] = useState(false);
  const [selectedLavageTaskId, setSelectedLavageTaskId] = useState("");
  const [lavageOutcome, setLavageOutcome] = useState<"positivo" | "negativo">("positivo");
  const [lavageAction, setLavageAction] = useState<"transferir" | "congelar">("transferir");
  const [lavageRecipientId, setLavageRecipientId] = useState("");
  const [lavageNotes, setLavageNotes] = useState("");

  useEffect(() => {
    if (!canAccess) return;
    flushQueueMutation.mutate(undefined, {
      onSuccess: (flushed) => {
        if (flushed > 0) {
          setMessage({ text: `${flushed} registro(s) offline sincronizado(s).`, tone: "success" });
        } else {
          setMessage({ text: "Sem pendências de sincronização no momento.", tone: "success" });
        }
      },
    });
  }, [canAccess]);

  useEffect(() => {
    if (!params.action) return;
    if (params.action === "exam") {
      setExamModalOpen(true);
      if (params.animalId) setExamAnimalId(String(params.animalId));
    }
    if (params.action === "insemination") {
      setInseminationModalOpen(true);
      if (params.animalId) setMareId(String(params.animalId));
    }
    if (params.action === "batch") {
      setBatchModalOpen(true);
      if (params.animalId) {
        const id = String(params.animalId);
        setBatchSelected((prev) => ({ ...prev, [id]: true }));
      }
    }
  }, [params.action, params.animalId]);

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Módulo veterinário"
            description="Disponível apenas para o perfil de Veterinária."
          />
        </View>
      </AppScreen>
    );
  }

  const females = (femalesQuery.data?.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const stallions = (stallionsQuery.data?.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const allAnimalsSource = [...(femalesQuery.data?.data ?? []), ...(stallionsQuery.data?.data ?? [])];
  const allAnimals = allAnimalsSource
    .filter((item) => (batchCategoryFilter === "all" ? true : item.category === batchCategoryFilter))
    .map((item) => ({ id: item.id, name: item.name }));

  const selectedBatchIds = Object.keys(batchSelected).filter((item) => batchSelected[item]);

  const filteredTasks = useMemo(() => {
    const source = dashboardQuery.data?.todayTasks ?? [];
    const query = taskSearch.trim().toLowerCase();

    return source.filter((task) => {
      if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
      if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;
      if (!query) return true;

      const haystack = `${task.title} ${task.description ?? ""} ${task.animal_name ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [dashboardQuery.data?.todayTasks, taskPriorityFilter, taskSearch, taskStatusFilter]);

  const onSaveExam = () => {
    if (!harasId || !examAnimalId) {
      setMessage({ text: "Selecione a matriz para registrar o exame.", tone: "danger" });
      return;
    }
    const right = parseOptionalNumber(follicleRight);
    const left = parseOptionalNumber(follicleLeft);
    if (right === null && left === null) {
      setMessage({ text: "Informe pelo menos um folículo (OD ou OE).", tone: "danger" });
      return;
    }

    createExamMutation.mutate(
      {
        haras_id: harasId,
        animal_id: examAnimalId,
        follicle_right_size: right,
        follicle_left_size: left,
        uterine_edema: edema,
        cervix_score: cervix,
        intrauterine_fluid: liu,
        induction,
        inductor: induction ? inductor : null,
        notes: examNotes.trim() || null,
        veterinarian_name: profile?.full_name ?? null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setExamModalOpen(false);
          setFollicleRight("");
          setFollicleLeft("");
          setExamNotes("");
        },
        onError: (error) => {
          setMessage({ text: error instanceof Error ? error.message : "Falha ao salvar exame.", tone: "danger" });
        },
      }
    );
  };

  const onSaveBreeding = () => {
    if (!harasId || !mareId || !stallionId) {
      setMessage({ text: "Selecione matriz e garanhão.", tone: "danger" });
      return;
    }

    const motility = parseOptionalNumber(motilityPercent);
    const paletas = Number(strawsUsed);
    if (semenType === "Congelado" && (!Number.isFinite(paletas) || paletas <= 0)) {
      setMessage({ text: "Informe a quantidade de paletas para sêmen congelado.", tone: "danger" });
      return;
    }

    createBreedingMutation.mutate(
      {
        haras_id: harasId,
        mare_id: mareId,
        stallion_id: stallionId,
        method,
        semen_type: semenType,
        motility_quality: motilityQuality,
        motility_percent: motility === null ? null : Math.round(motility),
        straws_used: semenType === "Congelado" ? paletas : 0,
        notes: inseminationNotes.trim() || null,
        veterinarian_name: profile?.full_name ?? null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setInseminationModalOpen(false);
          setInseminationNotes("");
        },
        onError: (error) => {
          setMessage({
            text: error instanceof Error ? error.message : "Falha ao registrar inseminação.",
            tone: "danger",
          });
        },
      }
    );
  };

  const onSaveBatch = () => {
    if (!harasId || !batchProcedureName.trim()) {
      setMessage({ text: "Informe o procedimento sanitário.", tone: "danger" });
      return;
    }
    if (selectedBatchIds.length === 0) {
      setMessage({ text: "Selecione pelo menos um animal.", tone: "danger" });
      return;
    }

    createBatchMutation.mutate(
      {
        haras_id: harasId,
        procedure_type: batchProcedureType,
        procedure_name: batchProcedureName.trim(),
        application_date: batchDate,
        lot_code: batchLot.trim() || null,
        expiration_date: batchExpiration.trim() || null,
        notes: batchNotes.trim() || null,
        veterinarian_name: profile?.full_name ?? null,
        animal_ids: selectedBatchIds,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setBatchModalOpen(false);
          setBatchProcedureName("");
          setBatchNotes("");
          setBatchLot("");
          setBatchExpiration("");
          setBatchSelected({});
        },
        onError: (error) => {
          setMessage({ text: error instanceof Error ? error.message : "Falha no manejo em lote.", tone: "danger" });
        },
      }
    );
  };

  const onAddSemenEntry = () => {
    if (!harasId || !entryStallionId) {
      setMessage({ text: "Selecione o garanhão para entrada de paletas.", tone: "danger" });
      return;
    }

    const units = Number(entryUnits);
    if (!Number.isFinite(units) || units <= 0) {
      setMessage({ text: "Informe quantidade válida de paletas.", tone: "danger" });
      return;
    }

    addSemenMutation.mutate(
      {
        haras_id: harasId,
        stallion_id: entryStallionId,
        units_paletas: Math.round(units),
        semen_type: entrySemenType,
        reason: entryReason.trim() || null,
        notes: entryNotes.trim() || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setSemenEntryModalOpen(false);
          setEntryUnits("1");
          setEntryReason("");
          setEntryNotes("");
        },
        onError: (error) => {
          setMessage({
            text: error instanceof Error ? error.message : "Falha ao registrar entrada de paletas.",
            tone: "danger",
          });
        },
      }
    );
  };

  const onOpenLavageModal = (taskId: string) => {
    setSelectedLavageTaskId(taskId);
    setLavageOutcome("positivo");
    setLavageAction("transferir");
    setLavageRecipientId("");
    setLavageNotes("");
    setLavageModalOpen(true);
  };

  const onRegisterLavage = () => {
    if (!harasId || !selectedLavageTaskId) return;
    if (lavageOutcome === "positivo" && lavageAction === "transferir" && !lavageRecipientId) {
      setMessage({ text: "Selecione a receptora para transferência.", tone: "danger" });
      return;
    }

    registerLavageOutcomeMutation.mutate(
      {
        task_id: selectedLavageTaskId,
        haras_id: harasId,
        outcome: lavageOutcome,
        action_when_positive: lavageOutcome === "positivo" ? lavageAction : undefined,
        recipient_id: lavageOutcome === "positivo" && lavageAction === "transferir" ? lavageRecipientId : null,
        notes: lavageNotes.trim() || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setLavageModalOpen(false);
          setSelectedLavageTaskId("");
        },
        onError: (error) => {
          setMessage({
            text: error instanceof Error ? error.message : "Falha ao registrar resultado do lavado.",
            tone: "danger",
          });
        },
      }
    );
  };

  const onSaveTreatment = () => {
    if (!harasId || !treatmentAnimalId || !treatmentType.trim()) {
      setMessage({ text: "Informe animal e tipo de tratamento.", tone: "danger" });
      return;
    }

    createTreatmentMutation.mutate(
      {
        haras_id: harasId,
        animal_id: treatmentAnimalId,
        procedure_date: treatmentDate,
        type: treatmentType.trim(),
        description: treatmentDescription.trim() || null,
        medication: treatmentMedication.trim() || null,
        dosage: treatmentDosage.trim() || null,
        next_date: treatmentNextDate.trim() || null,
        veterinarian_name: profile?.full_name ?? null,
        notes: treatmentNotes.trim() || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
          setTreatmentModalOpen(false);
          setTreatmentType("");
          setTreatmentDescription("");
          setTreatmentMedication("");
          setTreatmentDosage("");
          setTreatmentNextDate("");
          setTreatmentNotes("");
        },
        onError: (error) => {
          setMessage({
            text: error instanceof Error ? error.message : "Falha ao salvar tratamento.",
            tone: "danger",
          });
        },
      }
    );
  };

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Minha Rotina Hoje</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Módulo veterinário com coleta técnica e sync offline.</Text>
      </View>

      {message ? (
        <Card style={styles.feedbackCard}>
          <Text
            style={[
              styles.feedbackText,
              {
                color:
                  message.tone === "success"
                    ? theme.colors.success
                    : message.tone === "warning"
                    ? theme.colors.warning
                    : theme.colors.danger,
              },
            ]}
          >
            {message.text}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Sincronização Offline</Text>
          <Pressable
            onPress={() => flushQueueMutation.mutate()}
            style={({ pressed }) => [styles.syncButton, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <RefreshCw size={14} color={theme.colors.textMuted} />
            <Text style={[styles.syncButtonText, { color: theme.colors.textMuted }]}>Sincronizar</Text>
          </Pressable>
        </View>

        <View style={styles.syncGrid}>
          <View style={[styles.syncBox, { borderColor: theme.colors.border }]}>
            <Text style={[styles.syncLabel, { color: theme.colors.textMuted }]}>Pendentes</Text>
            <Text style={[styles.syncValue, { color: theme.colors.text }]}>
              {syncSnapshotQuery.data?.pending_count ?? 0}
            </Text>
          </View>
          <View style={[styles.syncBox, { borderColor: theme.colors.border }]}>
            <Text style={[styles.syncLabel, { color: theme.colors.textMuted }]}>Última sync</Text>
            <Text style={[styles.syncValueSmall, { color: theme.colors.text }]}>
              {syncSnapshotQuery.data?.last_sync_at
                ? new Date(syncSnapshotQuery.data.last_sync_at).toLocaleString("pt-BR")
                : "Ainda não sincronizado"}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.syncFooter,
            {
              color:
                syncSnapshotQuery.data?.last_sync_result === "error"
                  ? theme.colors.danger
                  : syncSnapshotQuery.data?.last_sync_result === "partial"
                  ? theme.colors.warning
                  : theme.colors.textMuted,
            },
          ]}
        >
          {syncSnapshotQuery.data?.last_sync_message || "Salvamentos offline aparecem aqui para acompanhamento."}
        </Text>
      </Card>

      <View style={styles.kpiGrid}>
        <QuickKpi label="Aguardando diagnóstico" value={String(dashboardQuery.data?.waitingDiagnosis ?? 0)} />
        <QuickKpi label="Em tratamento" value={String(dashboardQuery.data?.inTreatment ?? 0)} />
        <QuickKpi label="Ciclo reprodutivo" value={String(dashboardQuery.data?.reproductiveCycle ?? 0)} />
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Agenda do dia</Text>
          <Pressable
            onPress={() => flushQueueMutation.mutate()}
            style={({ pressed }) => [styles.syncButton, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <RefreshCw size={14} color={theme.colors.textMuted} />
            <Text style={[styles.syncButtonText, { color: theme.colors.textMuted }]}>Sincronizar</Text>
          </Pressable>
        </View>

        <TextField
          value={taskSearch}
          onChangeText={setTaskSearch}
          placeholder="Buscar por animal ou tarefa"
        />

        <View style={styles.filterRow}>
          {(["all", "Pendente", "Concluído"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTaskStatusFilter(value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: taskStatusFilter === value ? theme.colors.primary : theme.colors.border,
                  backgroundColor: taskStatusFilter === value ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={[styles.filterChipLabel, { color: theme.colors.text }]}>
                {value === "all" ? "Status: todos" : value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(["all", "Alta", "Média", "Baixa"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTaskPriorityFilter(value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: taskPriorityFilter === value ? theme.colors.primary : theme.colors.border,
                  backgroundColor: taskPriorityFilter === value ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={[styles.filterChipLabel, { color: theme.colors.text }]}> 
                {value === "all" ? "Prioridade: todas" : value}
              </Text>
            </Pressable>
          ))}
        </View>

        {dashboardQuery.isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : filteredTasks.length ? (
          filteredTasks.map((task) => (
            <View key={task.id} style={[styles.taskRow, { borderColor: theme.colors.border }]}> 
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskMeta, { color: theme.colors.textMuted }]}> 
                  {task.animal_name || "Animal não identificado"} • {formatDateBR(task.due_date)} • {task.priority}
                </Text>
                <Text style={[styles.taskMeta, { color: theme.colors.textMuted }]}> 
                  Status: {task.status}
                </Text>
              </View>
              <View style={styles.taskActions}>
                {task.task_type === "lavado_d8" && task.status !== "Concluído" ? (
                  <AppButton label="Resultado" onPress={() => onOpenLavageModal(task.id)} variant="ghost" />
                ) : null}
                {task.status !== "Concluído" ? (
                  <AppButton
                    label="Concluir"
                    onPress={() => completeTaskMutation.mutate(task.id)}
                    variant="ghost"
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nenhuma tarefa pendente hoje.</Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Ações rápidas</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            onPress={() => setExamModalOpen(true)}
            style={({ pressed }) => [styles.actionCard, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <Activity size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Novo Exame</Text>
          </Pressable>

          <Pressable
            onPress={() => setInseminationModalOpen(true)}
            style={({ pressed }) => [styles.actionCard, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <ShieldPlus size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Nova Inseminação</Text>
          </Pressable>

          <Pressable
            onPress={() => setBatchModalOpen(true)}
            style={({ pressed }) => [styles.actionCard, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <Syringe size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Vacinação em lote</Text>
          </Pressable>

          <Pressable
            onPress={() => setSemenEntryModalOpen(true)}
            style={({ pressed }) => [styles.actionCard, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <ShieldPlus size={18} color={theme.colors.warning} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Entrada de paletas</Text>
          </Pressable>

          <Pressable
            onPress={() => setTreatmentModalOpen(true)}
            style={({ pressed }) => [styles.actionCard, { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 }]}
          >
            <Syringe size={18} color={theme.colors.warning} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Novo Tratamento</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Estoque de sêmen por garanhão</Text>
        {semenQuery.isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Carregando estoque...</Text>
        ) : semenQuery.data?.length ? (
          semenQuery.data.map((item) => (
            <View key={item.id} style={[styles.stockRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.stockName, { color: theme.colors.text }]}>{item.stallion_name}</Text>
              <Text style={[styles.stockCount, { color: theme.colors.textMuted }]}>{item.available_paletas} paletas</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Sem entradas de paletas registradas.</Text>
        )}
      </Card>

      <Modal visible={examModalOpen} transparent animationType="slide" onRequestClose={() => setExamModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setExamModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Registro de Exame Reprodutivo</Text>
            <AnimalSelector title="Matriz" animals={females} selectedId={examAnimalId} onSelect={setExamAnimalId} />
            <TextField label="Folículo OD (mm)" value={follicleRight} onChangeText={setFollicleRight} keyboardType="decimal-pad" />
            <TextField label="Folículo OE (mm)" value={follicleLeft} onChangeText={setFollicleLeft} keyboardType="decimal-pad" />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Edema uterino</Text>
            <View style={styles.optionRow}>
              {EDEMA_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEdema(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: edema === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: edema === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Cérvix</Text>
            <View style={styles.optionRow}>
              {CERVIX_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setCervix(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: cervix === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: cervix === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.booleanRow}>
              <AppButton label={liu ? "LIU: Sim" : "LIU: Não"} onPress={() => setLiu((prev) => !prev)} variant="ghost" />
              <AppButton
                label={induction ? "Indução: Sim" : "Indução: Não"}
                onPress={() => setInduction((prev) => !prev)}
                variant="ghost"
              />
            </View>

            {induction ? (
              <View style={styles.optionRow}>
                {(["HCG", "Deslorelin"] as const).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setInductor(value)}
                    style={({ pressed }) => [
                      styles.optionChip,
                      {
                        borderColor: inductor === value ? theme.colors.primary : theme.colors.border,
                        backgroundColor: inductor === value ? theme.colors.surfaceAlt : "transparent",
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.text }}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <TextField
              label="Observações"
              value={examNotes}
              onChangeText={setExamNotes}
              multiline
              style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setExamModalOpen(false)} variant="ghost" />
              <AppButton label="Salvar Exame" onPress={onSaveExam} loading={createExamMutation.isPending} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={inseminationModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInseminationModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInseminationModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Registro de Inseminação</Text>

            <AnimalSelector title="Matriz" animals={females} selectedId={mareId} onSelect={setMareId} />
            <AnimalSelector title="Garanhão" animals={stallions} selectedId={stallionId} onSelect={setStallionId} />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Método</Text>
            <View style={styles.optionRow}>
              {(["IA", "Monta", "Transfer"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMethod(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: method === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: method === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Tipo de sêmen</Text>
            <View style={styles.optionRow}>
              {(["Fresco", "Resfriado", "Congelado"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setSemenType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: semenType === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: semenType === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Qualidade</Text>
            <View style={styles.optionRow}>
              {(["Ótima", "Boa", "Regular", "Ruim"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMotilityQuality(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: motilityQuality === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: motilityQuality === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <TextField
              label="Motilidade (%)"
              value={motilityPercent}
              onChangeText={setMotilityPercent}
              keyboardType="number-pad"
            />
            <TextField
              label="Paletas usadas"
              value={strawsUsed}
              onChangeText={setStrawsUsed}
              keyboardType="number-pad"
            />
            <TextField
              label="Observações"
              value={inseminationNotes}
              onChangeText={setInseminationNotes}
              multiline
              style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setInseminationModalOpen(false)} variant="ghost" />
              <AppButton
                label="Confirmar Inseminação"
                onPress={onSaveBreeding}
                loading={createBreedingMutation.isPending}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={batchModalOpen} transparent animationType="slide" onRequestClose={() => setBatchModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBatchModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Manejo Sanitário em Lote</Text>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Procedimento</Text>
            <View style={styles.optionRow}>
              {(["Vacina", "Vermífugo"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setBatchProcedureType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: batchProcedureType === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: batchProcedureType === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <TextField label="Nome do procedimento" value={batchProcedureName} onChangeText={setBatchProcedureName} />
            <TextField label="Data" value={batchDate} onChangeText={setBatchDate} placeholder="YYYY-MM-DD" />
            <TextField label="Lote" value={batchLot} onChangeText={setBatchLot} />
            <TextField
              label="Validade"
              value={batchExpiration}
              onChangeText={setBatchExpiration}
              placeholder="YYYY-MM-DD"
            />
            <TextField label="Observações" value={batchNotes} onChangeText={setBatchNotes} multiline style={styles.textArea} />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Filtro por categoria</Text>
            <View style={styles.optionRow}>
              {(["all", "egua", "garanhao", "potro", "potra", "castrado"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setBatchCategoryFilter(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: batchCategoryFilter === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: batchCategoryFilter === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value === "all" ? "Todos" : value}</Text>
                </Pressable>
              ))}
            </View>

            <AnimalSelector
              title={`Selecionar animais (${selectedBatchIds.length})`}
              animals={allAnimals}
              selectedId=""
              isSelected={(id) => Boolean(batchSelected[id])}
              onSelect={(id) => setBatchSelected((prev) => ({ ...prev, [id]: !prev[id] }))}
            />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setBatchModalOpen(false)} variant="ghost" />
              <AppButton label="Confirmar Lote" onPress={onSaveBatch} loading={createBatchMutation.isPending} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={semenEntryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSemenEntryModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSemenEntryModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Entrada de paletas</Text>

            <AnimalSelector title="Garanhão" animals={stallions} selectedId={entryStallionId} onSelect={setEntryStallionId} />
            <TextField label="Quantidade de paletas" value={entryUnits} onChangeText={setEntryUnits} keyboardType="number-pad" />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Tipo de sêmen</Text>
            <View style={styles.optionRow}>
              {(["Fresco", "Resfriado", "Congelado"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEntrySemenType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: entrySemenType === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: entrySemenType === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <TextField label="Motivo" value={entryReason} onChangeText={setEntryReason} placeholder="Compra, reposição, transferência" />
            <TextField label="Observações" value={entryNotes} onChangeText={setEntryNotes} multiline style={styles.textArea} />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setSemenEntryModalOpen(false)} variant="ghost" />
              <AppButton label="Registrar Entrada" onPress={onAddSemenEntry} loading={addSemenMutation.isPending} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={lavageModalOpen} transparent animationType="slide" onRequestClose={() => setLavageModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLavageModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Resultado do Lavado D8</Text>

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Resultado</Text>
            <View style={styles.optionRow}>
              {(["positivo", "negativo"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setLavageOutcome(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor: lavageOutcome === value ? theme.colors.primary : theme.colors.border,
                      backgroundColor: lavageOutcome === value ? theme.colors.surfaceAlt : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value === "positivo" ? "Positivo" : "Negativo"}</Text>
                </Pressable>
              ))}
            </View>

            {lavageOutcome === "positivo" ? (
              <>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Ação para embrião</Text>
                <View style={styles.optionRow}>
                  {(["transferir", "congelar"] as const).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setLavageAction(value)}
                      style={({ pressed }) => [
                        styles.optionChip,
                        {
                          borderColor: lavageAction === value ? theme.colors.primary : theme.colors.border,
                          backgroundColor: lavageAction === value ? theme.colors.surfaceAlt : "transparent",
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text }}>{value === "transferir" ? "Transferir" : "Congelar"}</Text>
                    </Pressable>
                  ))}
                </View>

                {lavageAction === "transferir" ? (
                  <AnimalSelector
                    title="Receptora"
                    animals={females}
                    selectedId={lavageRecipientId}
                    onSelect={setLavageRecipientId}
                  />
                ) : null}
              </>
            ) : null}

            <TextField
              label="Observações"
              value={lavageNotes}
              onChangeText={setLavageNotes}
              multiline
              style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setLavageModalOpen(false)} variant="ghost" />
              <AppButton
                label="Registrar Resultado"
                onPress={onRegisterLavage}
                loading={registerLavageOutcomeMutation.isPending}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={treatmentModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTreatmentModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTreatmentModalOpen(false)} />
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo Tratamento</Text>

            <AnimalSelector title="Animal" animals={allAnimalsSource.map((item) => ({ id: item.id, name: item.name }))} selectedId={treatmentAnimalId} onSelect={setTreatmentAnimalId} />
            <TextField label="Tipo" value={treatmentType} onChangeText={setTreatmentType} placeholder="Ex: Antibiótico, anti-inflamatório" />
            <TextField label="Data" value={treatmentDate} onChangeText={setTreatmentDate} placeholder="YYYY-MM-DD" />
            <TextField label="Próxima data" value={treatmentNextDate} onChangeText={setTreatmentNextDate} placeholder="YYYY-MM-DD" />
            <TextField label="Descrição" value={treatmentDescription} onChangeText={setTreatmentDescription} />
            <TextField label="Medicamento" value={treatmentMedication} onChangeText={setTreatmentMedication} />
            <TextField label="Dosagem" value={treatmentDosage} onChangeText={setTreatmentDosage} />
            <TextField label="Observações" value={treatmentNotes} onChangeText={setTreatmentNotes} multiline style={styles.textArea} />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" onPress={() => setTreatmentModalOpen(false)} variant="ghost" />
              <AppButton label="Salvar Tratamento" onPress={onSaveTreatment} loading={createTreatmentMutation.isPending} />
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
  feedbackCard: {
    marginTop: 2,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: "600",
  },
  syncGrid: {
    flexDirection: "row",
    gap: 10,
  },
  syncBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  syncLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  syncValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  syncValueSmall: {
    fontSize: 12,
    fontWeight: "600",
  },
  syncFooter: {
    fontSize: 12,
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48%",
    minHeight: 82,
    justifyContent: "center",
    gap: 6,
  },
  kpiLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  syncButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskRow: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  taskMeta: {
    fontSize: 12,
  },
  taskActions: {
    gap: 8,
    minWidth: 110,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "48%",
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  stockRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockName: {
    fontSize: 14,
    fontWeight: "600",
  },
  stockCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: "90%",
  },
  modalContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  selectorBlock: {
    gap: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectorList: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 140,
    maxHeight: 220,
    padding: 8,
  },
  selectorScroll: {
    flex: 1,
  },
  selectorItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  selectorItemLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  booleanRow: {
    flexDirection: "row",
    gap: 8,
  },
  textArea: {
    minHeight: 120,
  },
  modalActions: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    paddingTop: 4,
  },
});
