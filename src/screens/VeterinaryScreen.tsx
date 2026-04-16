import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  ShieldPlus,
  Syringe,
} from "lucide-react-native";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AnimalSearchSelect } from "@/src/components/ui/AnimalSearchSelect";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useHealthSummary } from "@/src/hooks/useAnimalHealth";
import {
  useAddSemenEntryMutation,
  useCreateBreedingEventMutation,
  useCreateHealthBatchMutation,
  useCreateReproductiveExamMutation,
  useCreateTreatmentMutation,
  useFlushVetQueueMutation,
  useSemenInventoryQuery,
  useVeterinaryDashboardQuery,
  useVeterinarySyncSnapshotQuery,
} from "@/src/hooks/useVeterinary";
import { veterinaryService } from "@/src/services/veterinary";
import { resolveVetAccess } from "@/src/lib/vet-access";
import { todayIsoDate } from "@/src/lib/vet-shared";
import { useAppTheme } from "@/src/theme/ThemeContext";

const EDEMA_OPTIONS = [0, 1, 2, 3, 4];
const CERVIX_OPTIONS = [0, 1, 2, 3];

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function QuickKpi({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <Card style={styles.kpiCard}>
      <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
        {value}
      </Text>
    </Card>
  );
}

export function VeterinaryScreen() {
  const params = useLocalSearchParams<{ action?: string; animalId?: string }>();
  const router = useRouter();
  const { role, harasId, user, profile } = useAuth();
  const { theme } = useAppTheme();
  const vetAccess = resolveVetAccess(role, harasId);
  const vetHarasId = vetAccess.scopedHarasId;

  const dashboardQuery = useVeterinaryDashboardQuery(vetHarasId);
  const healthSummaryQuery = useHealthSummary(vetHarasId);
  const semenQuery = useSemenInventoryQuery(vetHarasId);
  const syncSnapshotQuery = useVeterinarySyncSnapshotQuery(vetHarasId);

  const createExamMutation = useCreateReproductiveExamMutation(vetHarasId);
  const createBreedingMutation = useCreateBreedingEventMutation(vetHarasId);
  const createBatchMutation = useCreateHealthBatchMutation(vetHarasId);
  const addSemenMutation = useAddSemenEntryMutation(vetHarasId);
  const createTreatmentMutation = useCreateTreatmentMutation(vetHarasId);
  const flushQueueMutation = useFlushVetQueueMutation(vetHarasId);

  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "warning" | "danger";
  } | null>(null);

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examAnimalId, setExamAnimalId] = useState("");
  const [examAnimalSearch, setExamAnimalSearch] = useState("");
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
  const [mareSearch, setMareSearch] = useState("");
  const [stallionId, setStallionId] = useState("");
  const [stallionSearch, setStallionSearch] = useState("");
  const [method, setMethod] = useState<"IA" | "Monta" | "Transfer">("IA");
  const [semenType, setSemenType] = useState<
    "Fresco" | "Resfriado" | "Congelado"
  >("Congelado");
  const [motilityQuality, setMotilityQuality] = useState<
    "Ótima" | "Boa" | "Regular" | "Ruim"
  >("Boa");
  const [motilityPercent, setMotilityPercent] = useState("");
  const [strawsUsed, setStrawsUsed] = useState("1");
  const [inseminationNotes, setInseminationNotes] = useState("");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProcedureType, setBatchProcedureType] = useState<
    "Vacina" | "Vermífugo"
  >("Vacina");
  const [batchProcedureName, setBatchProcedureName] = useState("");
  const [batchDate, setBatchDate] = useState(todayIsoDate());
  const [batchLot, setBatchLot] = useState("");
  const [batchExpiration, setBatchExpiration] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [batchSelected, setBatchSelected] = useState<Record<string, boolean>>(
    {},
  );
  const [batchAnimalSearch, setBatchAnimalSearch] = useState("");
  const [batchCategoryFilter, setBatchCategoryFilter] = useState<
    "all" | "egua" | "garanhao" | "potro" | "potra" | "castrado"
  >("all");

  const [semenEntryModalOpen, setSemenEntryModalOpen] = useState(false);
  const [entryStallionId, setEntryStallionId] = useState("");
  const [entryStallionSearch, setEntryStallionSearch] = useState("");
  const [entryUnits, setEntryUnits] = useState("1");
  const [entrySemenType, setEntrySemenType] = useState<
    "Fresco" | "Resfriado" | "Congelado"
  >("Congelado");
  const [entryReason, setEntryReason] = useState("");
  const [entryNotes, setEntryNotes] = useState("");

  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [treatmentAnimalId, setTreatmentAnimalId] = useState("");
  const [treatmentAnimalSearch, setTreatmentAnimalSearch] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [treatmentDate, setTreatmentDate] = useState(todayIsoDate());
  const [treatmentNextDate, setTreatmentNextDate] = useState("");
  const [treatmentDescription, setTreatmentDescription] = useState("");
  const [treatmentMedication, setTreatmentMedication] = useState("");
  const [treatmentDosage, setTreatmentDosage] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [treatmentFormError, setTreatmentFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!vetAccess.canLoadVetData) return;
    flushQueueMutation.mutate(undefined, {
      onSuccess: (flushed) => {
        if (flushed > 0) {
          setMessage({
            text: `${flushed} registro(s) offline sincronizado(s).`,
            tone: "success",
          });
        }
      },
    });
  }, [vetAccess.canLoadVetData]);

  const handleClearDead = () => {
    const deadCount = syncSnapshotQuery.data?.dead_count ?? 0;
    if (deadCount <= 0) return;
    Alert.alert(
      "Descartar falhas permanentes?",
      `${deadCount} item(ns) não puderam ser sincronizados após 10 tentativas. Esta ação remove os itens do app e não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: async () => {
            try {
              const removed = await veterinaryService.clearDeadActions();
              await syncSnapshotQuery.refetch();
              setMessage({
                text: `${removed} falha(s) permanente(s) descartada(s).`,
                tone: "success",
              });
            } catch (error) {
              setMessage({
                text: error instanceof Error ? error.message : "Falha ao descartar itens.",
                tone: "danger",
              });
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!params.action) return;
    if (params.action === "exam") {
      router.push({
        pathname: "/(app)/(tabs)/reproducao",
        params: params.animalId ? { animalId: String(params.animalId), action: "exam" } : undefined,
      });
      return;
    }
    if (params.action === "insemination") {
      router.push({
        pathname: "/(app)/(tabs)/reproducao",
        params: params.animalId ? { animalId: String(params.animalId), action: "insemination" } : undefined,
      });
      return;
    }
    if (params.action === "batch") {
      setBatchModalOpen(true);
      if (params.animalId) {
        const id = String(params.animalId);
        setBatchSelected((prev) => ({ ...prev, [id]: true }));
      }
    }
  }, [params.action, params.animalId, router]);

  if (!vetAccess.canAccessVet) {
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

  if (!vetAccess.hasHaras) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Haras não vinculado"
            description="Seu perfil veterinário está sem haras ativo. Ajuste o vínculo para carregar o módulo."
          />
        </View>
      </AppScreen>
    );
  }

  const selectedBatchIds = Object.keys(batchSelected).filter(
    (item) => batchSelected[item],
  );

  const onSaveExam = () => {
    if (!vetHarasId || !examAnimalId) {
      setMessage({
        text: "Selecione a matriz para registrar o exame.",
        tone: "danger",
      });
      return;
    }
    const right = parseOptionalNumber(follicleRight);
    const left = parseOptionalNumber(follicleLeft);
    if (right === null && left === null) {
      setMessage({
        text: "Informe pelo menos um folículo (OD ou OE).",
        tone: "danger",
      });
      return;
    }

    createExamMutation.mutate(
      {
        haras_id: vetHarasId,
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
          setMessage({
            text: result.message,
            tone: result.synced ? "success" : "warning",
          });
          setExamModalOpen(false);
          setExamAnimalId("");
          setExamAnimalSearch("");
          setFollicleRight("");
          setFollicleLeft("");
          setExamNotes("");
        },
        onError: (error) => {
          setMessage({
            text:
              error instanceof Error ? error.message : "Falha ao salvar exame.",
            tone: "danger",
          });
        },
      },
    );
  };

  const onSaveBreeding = () => {
    if (!vetHarasId || !mareId || !stallionId) {
      setMessage({ text: "Selecione matriz e garanhão.", tone: "danger" });
      return;
    }
    const motility = parseOptionalNumber(motilityPercent);
    const paletas = Number(strawsUsed);
    if (
      semenType === "Congelado" &&
      (!Number.isFinite(paletas) || paletas <= 0)
    ) {
      setMessage({
        text: "Informe a quantidade de paletas para sêmen congelado.",
        tone: "danger",
      });
      return;
    }

    createBreedingMutation.mutate(
      {
        haras_id: vetHarasId,
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
          setMessage({
            text: result.message,
            tone: result.synced ? "success" : "warning",
          });
          setInseminationModalOpen(false);
          setMareId("");
          setMareSearch("");
          setStallionId("");
          setStallionSearch("");
          setInseminationNotes("");
        },
        onError: (error) => {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Falha ao registrar inseminação.",
            tone: "danger",
          });
        },
      },
    );
  };

  const onSaveBatch = () => {
    if (!vetHarasId || !batchProcedureName.trim()) {
      setMessage({ text: "Informe o procedimento sanitário.", tone: "danger" });
      return;
    }
    if (selectedBatchIds.length === 0) {
      setMessage({ text: "Selecione pelo menos um animal.", tone: "danger" });
      return;
    }

    createBatchMutation.mutate(
      {
        haras_id: vetHarasId,
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
          setMessage({
            text: result.message,
            tone: result.synced ? "success" : "warning",
          });
          setBatchModalOpen(false);
          setBatchProcedureName("");
          setBatchNotes("");
          setBatchLot("");
          setBatchExpiration("");
          setBatchSelected({});
          setBatchAnimalSearch("");
        },
        onError: (error) => {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Falha no manejo em lote.",
            tone: "danger",
          });
        },
      },
    );
  };

  const onAddSemenEntry = () => {
    if (!vetHarasId || !entryStallionId) {
      setMessage({
        text: "Selecione o garanhão para entrada de paletas.",
        tone: "danger",
      });
      return;
    }
    const units = Number(entryUnits);
    if (!Number.isFinite(units) || units <= 0) {
      setMessage({
        text: "Informe quantidade válida de paletas.",
        tone: "danger",
      });
      return;
    }

    addSemenMutation.mutate(
      {
        haras_id: vetHarasId,
        stallion_id: entryStallionId,
        units_paletas: Math.round(units),
        semen_type: entrySemenType,
        reason: entryReason.trim() || null,
        notes: entryNotes.trim() || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setMessage({
            text: result.message,
            tone: result.synced ? "success" : "warning",
          });
          setSemenEntryModalOpen(false);
          setEntryStallionId("");
          setEntryStallionSearch("");
          setEntryUnits("1");
          setEntryReason("");
          setEntryNotes("");
        },
        onError: (error) => {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Falha ao registrar entrada de paletas.",
            tone: "danger",
          });
        },
      },
    );
  };

  const onSaveTreatment = () => {
    setTreatmentFormError(null);

    if (!vetHarasId || !treatmentAnimalId || !treatmentType.trim()) {
      setTreatmentFormError("Selecione o animal e informe o tipo de tratamento.");
      setMessage({
        text: "Informe animal e tipo de tratamento.",
        tone: "danger",
      });
      return;
    }

    if (!treatmentDate.trim()) {
      setTreatmentFormError("Informe a data do procedimento.");
      return;
    }

    createTreatmentMutation.mutate(
      {
        haras_id: vetHarasId,
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
          setTreatmentFormError(null);
          setMessage({
            text: result.message,
            tone: result.synced ? "success" : "warning",
          });
          setTreatmentModalOpen(false);
          setTreatmentAnimalId("");
          setTreatmentAnimalSearch("");
          setTreatmentType("");
          setTreatmentDescription("");
          setTreatmentMedication("");
          setTreatmentDosage("");
          setTreatmentNextDate("");
          setTreatmentNotes("");
        },
        onError: (error) => {
          setTreatmentFormError(
            error instanceof Error ? error.message : "Falha ao salvar tratamento.",
          );
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Falha ao salvar tratamento.",
            tone: "danger",
          });
        },
      },
    );
  };

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Clínica Veterinária
        </Text>
      </View>

      {message ? (
        <Card>
          <Text
            style={{
              color:
                message.tone === "success"
                  ? theme.colors.success
                  : message.tone === "warning"
                    ? theme.colors.warning
                    : theme.colors.danger,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {message.text}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.info }]}> 
            Sincronização Offline
          </Text>
          <Pressable
            onPress={() => flushQueueMutation.mutate()}
            style={({ pressed }) => [
              styles.syncButton,
              { borderColor: theme.colors.border, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <RefreshCw size={14} color={theme.colors.textMuted} />
            <Text
              style={[styles.syncButtonText, { color: theme.colors.textMuted }]}
            >
              Sincronizar
            </Text>
          </Pressable>
        </View>
        <View style={styles.syncGrid}>
          <View style={[styles.syncBox, { borderColor: `${theme.colors.warning}66` }]}> 
            <Text style={[styles.syncLabel, { color: theme.colors.textMuted }]}> 
              Pendentes
            </Text>
            <Text style={[styles.syncValue, { color: theme.colors.text }]}> 
              {syncSnapshotQuery.data?.pending_count ?? 0}
            </Text>
          </View>
          <View style={[styles.syncBox, { borderColor: `${theme.colors.info}66` }]}>
            <Text style={[styles.syncLabel, { color: theme.colors.textMuted }]}>
              Última sync
            </Text>
            <Text style={[styles.syncValueSmall, { color: theme.colors.text }]}>
              {syncSnapshotQuery.data?.last_sync_at
                ? new Date(syncSnapshotQuery.data.last_sync_at).toLocaleString(
                    "pt-BR",
                  )
                : "Ainda não sincronizado"}
            </Text>
          </View>
        </View>
        {syncSnapshotQuery.data?.dead_count != null && syncSnapshotQuery.data.dead_count > 0 ? (
          <AppButton
            variant="ghost"
            label={`Descartar ${syncSnapshotQuery.data.dead_count} falha(s) permanente(s)`}
            onPress={handleClearDead}
          />
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.primary }]}> 
          Painel rápido
        </Text>
        <View style={styles.kpiGrid}>
          <QuickKpi
            label="Animais no haras"
            value={String(healthSummaryQuery.data?.totalAnimals ?? 0)}
          />
          <QuickKpi
            label="Vacinação em dia"
            value={String(healthSummaryQuery.data?.vaccinatedUpToDate ?? 0)}
          />
          <QuickKpi
            label="Vacinas em atraso"
            value={String(healthSummaryQuery.data?.vaccineOverdue ?? 0)}
          />
          <QuickKpi
            label="Alertas ativos"
            value={String(healthSummaryQuery.data?.activeAlerts ?? 0)}
          />
          <QuickKpi
            label="Aguardando diagnóstico"
            value={String(dashboardQuery.data?.waitingDiagnosis ?? 0)}
          />
          <QuickKpi
            label="Em tratamento"
            value={String(dashboardQuery.data?.inTreatment ?? 0)}
          />
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.info }]}> 
          Hub Veterinário
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Use os módulos dedicados para lançamentos completos e mantenha este espaço para visão geral e operações rápidas.</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/reproducao")}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.info}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Activity size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}> 
              Reprodução
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/agenda")}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.primary}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <CalendarDays size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}> 
              Agenda
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/rotina")}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.warning}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <ClipboardList size={18} color={theme.colors.warning} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}> 
              Rotina
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/plantel")}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.success}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <ShieldPlus size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}> 
              Plantel clínico
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.warning }]}>Operações rápidas no hub</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Ações de suporte que ainda permanecem no hub veterinário.</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            onPress={() => setBatchModalOpen(true)}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.info}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Syringe size={18} color={theme.colors.info} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}> 
              Vacinação em lote
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSemenEntryModalOpen(true)}
            style={({ pressed }) => [
              styles.actionCard,
              { borderColor: `${theme.colors.warning}66`, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <ShieldPlus size={18} color={theme.colors.warning} />
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
              Entrada de paletas
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: theme.colors.success }]}> 
          Estoque de sêmen por garanhão
        </Text>
        {semenQuery.isLoading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Carregando estoque...
          </Text>
        ) : semenQuery.data?.length ? (
          semenQuery.data.map((item) => (
            <View
              key={item.id}
              style={[styles.stockRow, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.stockName, { color: theme.colors.text }]}>
                {item.stallion_name}
              </Text>
              <Text
                style={[styles.stockCount, { color: theme.colors.textMuted }]}
              >
                {item.available_paletas} paletas
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Sem entradas de paletas registradas.
          </Text>
        )}
      </Card>

      <Modal
        visible={examModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setExamModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setExamModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={32}
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
              Registro de Exame Reprodutivo
            </Text>
            <AnimalSearchSelect
              title="Matriz"
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{ sex: "Fêmea", status: "ativo" }}
              selectedId={examAnimalId}
              searchValue={examAnimalSearch}
              onSearchChange={setExamAnimalSearch}
              onSelect={(animal) => {
                setExamAnimalId(animal.id);
                setExamAnimalSearch(animal.name);
              }}
              onClearSelected={() => {
                setExamAnimalId("");
                setExamAnimalSearch("");
              }}
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Matriz"
            />
            <TextField
              label="Folículo OD (mm)"
              value={follicleRight}
              onChangeText={setFollicleRight}
              keyboardType="decimal-pad"
            />
            <TextField
              label="Folículo OE (mm)"
              value={follicleLeft}
              onChangeText={setFollicleLeft}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Edema uterino
            </Text>
            <View style={styles.optionRow}>
              {EDEMA_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEdema(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        edema === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        edema === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Cérvix
            </Text>
            <View style={styles.optionRow}>
              {CERVIX_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setCervix(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        cervix === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        cervix === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.booleanRow}>
              <AppButton
                label={liu ? "LIU: Sim" : "LIU: Não"}
                onPress={() => setLiu((prev) => !prev)}
                variant="ghost"
              />
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
                        borderColor:
                          inductor === value
                            ? theme.colors.primary
                            : theme.colors.border,
                        backgroundColor:
                          inductor === value
                            ? theme.colors.surfaceAlt
                            : "transparent",
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
              <AppButton
                label="Cancelar"
                onPress={() => setExamModalOpen(false)}
                variant="ghost"
              />
              <AppButton
                label="Salvar Exame"
                onPress={onSaveExam}
                loading={createExamMutation.isPending}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={inseminationModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInseminationModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setInseminationModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={32}
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
              Registro de Inseminação
            </Text>
            <AnimalSearchSelect
              title="Matriz"
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{ sex: "Fêmea", status: "ativo" }}
              selectedId={mareId}
              searchValue={mareSearch}
              onSearchChange={setMareSearch}
              onSelect={(animal) => {
                setMareId(animal.id);
                setMareSearch(animal.name);
              }}
              onClearSelected={() => {
                setMareId("");
                setMareSearch("");
              }}
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Matriz"
            />
            <AnimalSearchSelect
              title="Garanhão"
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{ sex: "Macho", status: "ativo" }}
              selectedId={stallionId}
              searchValue={stallionSearch}
              onSearchChange={setStallionSearch}
              onSelect={(animal) => {
                setStallionId(animal.id);
                setStallionSearch(animal.name);
              }}
              onClearSelected={() => {
                setStallionId("");
                setStallionSearch("");
              }}
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Garanhão"
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Método
            </Text>
            <View style={styles.optionRow}>
              {(["IA", "Monta", "Transfer"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMethod(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        method === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        method === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Tipo de sêmen
            </Text>
            <View style={styles.optionRow}>
              {(["Fresco", "Resfriado", "Congelado"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setSemenType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        semenType === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        semenType === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Qualidade
            </Text>
            <View style={styles.optionRow}>
              {(["Ótima", "Boa", "Regular", "Ruim"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMotilityQuality(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        motilityQuality === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        motilityQuality === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
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
              <AppButton
                label="Cancelar"
                onPress={() => setInseminationModalOpen(false)}
                variant="ghost"
              />
              <AppButton
                label="Confirmar Inseminação"
                onPress={onSaveBreeding}
                loading={createBreedingMutation.isPending}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={batchModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBatchModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setBatchModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={32}
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
              Manejo Sanitário em Lote
            </Text>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Procedimento
            </Text>
            <View style={styles.optionRow}>
              {(["Vacina", "Vermífugo"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setBatchProcedureType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        batchProcedureType === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        batchProcedureType === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Nome do procedimento"
              value={batchProcedureName}
              onChangeText={setBatchProcedureName}
            />
            <DateField label="Data" value={batchDate} onChange={setBatchDate} />
            <TextField
              label="Lote"
              value={batchLot}
              onChangeText={setBatchLot}
            />
            <DateField label="Validade" value={batchExpiration} onChange={setBatchExpiration} />
            <TextField
              label="Observações"
              value={batchNotes}
              onChangeText={setBatchNotes}
              multiline
              style={styles.textArea}
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Filtro por categoria
            </Text>
            <View style={styles.optionRow}>
              {(
                [
                  "all",
                  "egua",
                  "garanhao",
                  "potro",
                  "potra",
                  "castrado",
                ] as const
              ).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setBatchCategoryFilter(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        batchCategoryFilter === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        batchCategoryFilter === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>
                    {value === "all" ? "Todos" : value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <AnimalSearchSelect
              title={`Selecionar animais (${selectedBatchIds.length})`}
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{
                status: "ativo",
                category: batchCategoryFilter === "all" ? undefined : batchCategoryFilter,
              }}
              searchValue={batchAnimalSearch}
              onSearchChange={setBatchAnimalSearch}
              isSelected={(id) => Boolean(batchSelected[id])}
              onSelect={(animal) =>
                setBatchSelected((prev) => ({ ...prev, [animal.id]: !prev[animal.id] }))
              }
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Animal"
            />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                onPress={() => setBatchModalOpen(false)}
                variant="ghost"
              />
              <AppButton
                label="Confirmar Lote"
                onPress={onSaveBatch}
                loading={createBatchMutation.isPending}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={semenEntryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSemenEntryModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSemenEntryModalOpen(false)}
          />
          <KeyboardAwareScrollView
            bottomOffset={32}
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
              Entrada de paletas
            </Text>
            <AnimalSearchSelect
              title="Garanhão"
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{ sex: "Macho", status: "ativo" }}
              selectedId={entryStallionId}
              searchValue={entryStallionSearch}
              onSearchChange={setEntryStallionSearch}
              onSelect={(animal) => {
                setEntryStallionId(animal.id);
                setEntryStallionSearch(animal.name);
              }}
              onClearSelected={() => {
                setEntryStallionId("");
                setEntryStallionSearch("");
              }}
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Garanhão"
            />
            <TextField
              label="Quantidade de paletas"
              value={entryUnits}
              onChangeText={setEntryUnits}
              keyboardType="number-pad"
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Tipo de sêmen
            </Text>
            <View style={styles.optionRow}>
              {(["Fresco", "Resfriado", "Congelado"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEntrySemenType(value)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    {
                      borderColor:
                        entrySemenType === value
                          ? theme.colors.primary
                          : theme.colors.border,
                      backgroundColor:
                        entrySemenType === value
                          ? theme.colors.surfaceAlt
                          : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Motivo"
              value={entryReason}
              onChangeText={setEntryReason}
              placeholder="Compra, reposição, transferência"
            />
            <TextField
              label="Observações"
              value={entryNotes}
              onChangeText={setEntryNotes}
              multiline
              style={styles.textArea}
            />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                onPress={() => setSemenEntryModalOpen(false)}
                variant="ghost"
              />
              <AppButton
                label="Registrar Entrada"
                onPress={onAddSemenEntry}
                loading={addSemenMutation.isPending}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal
        visible={treatmentModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setTreatmentFormError(null);
          setTreatmentModalOpen(false);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setTreatmentFormError(null);
              setTreatmentModalOpen(false);
            }}
          />
          <KeyboardAwareScrollView
            bottomOffset={32}
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
              Novo Tratamento
            </Text>
            <AnimalSearchSelect
              title="Animal"
              harasId={vetHarasId}
              enabled={vetAccess.canLoadVetData}
              filters={{ status: "ativo" }}
              selectedId={treatmentAnimalId}
              searchValue={treatmentAnimalSearch}
              onSearchChange={setTreatmentAnimalSearch}
              onSelect={(animal) => {
                setTreatmentAnimalId(animal.id);
                setTreatmentAnimalSearch(animal.name);
              }}
              onClearSelected={() => {
                setTreatmentAnimalId("");
                setTreatmentAnimalSearch("");
              }}
              searchPlaceholder="Buscar animal"
              selectedLabelPrefix="Animal"
            />
            <TextField
              label="Tipo"
              value={treatmentType}
              onChangeText={setTreatmentType}
              placeholder="Ex: Antibiótico, anti-inflamatório"
            />
            <DateField label="Data" value={treatmentDate} onChange={setTreatmentDate} />
            <DateField
              label="Próxima data"
              value={treatmentNextDate}
              onChange={setTreatmentNextDate}
            />
            <TextField
              label="Descrição"
              value={treatmentDescription}
              onChangeText={setTreatmentDescription}
            />
            <TextField
              label="Medicamento"
              value={treatmentMedication}
              onChangeText={setTreatmentMedication}
            />
            <TextField
              label="Dosagem"
              value={treatmentDosage}
              onChangeText={setTreatmentDosage}
            />
            <TextField
              label="Observações"
              value={treatmentNotes}
              onChangeText={setTreatmentNotes}
              multiline
              style={styles.textArea}
            />
            {treatmentFormError ? (
              <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                {treatmentFormError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                onPress={() => {
                  setTreatmentFormError(null);
                  setTreatmentModalOpen(false);
                }}
                variant="ghost"
              />
              <AppButton
                label="Salvar Tratamento"
                onPress={onSaveTreatment}
                loading={createTreatmentMutation.isPending}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 2 },
  title: { fontSize: 24, fontWeight: "700" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "48%", minHeight: 82, justifyContent: "center", gap: 6 },
  kpiLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: { fontSize: 24, fontWeight: "700" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  syncGrid: { flexDirection: "row", gap: 10 },
  syncBox: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  syncLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  syncValue: { fontSize: 22, fontWeight: "700" },
  syncValueSmall: { fontSize: 12, fontWeight: "600" },
  syncButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncButtonText: { fontSize: 12, fontWeight: "600" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    width: "48%",
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    justifyContent: "center",
  },
  actionTitle: { fontSize: 13, fontWeight: "700" },
  emptyText: { fontSize: 13 },
  stockRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockName: { fontSize: 14, fontWeight: "600" },
  stockCount: { fontSize: 13, fontWeight: "600" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
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
  modalContent: { padding: 16, gap: 10, paddingBottom: 28 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  booleanRow: { flexDirection: "row", gap: 8 },
  textArea: { minHeight: 120 },
  modalActions: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    paddingTop: 4,
  },
});
