import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { AlertTriangle, Baby, Camera, Cloud, Search, Send } from "lucide-react-native";
import { useRouter } from "expo-router";
import { AnimalSearchSelect } from "@/src/components/ui/AnimalSearchSelect";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { TaskExecutionModal } from "@/src/components/tasks/TaskExecutionModal";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalQuery } from "@/src/hooks/useAnimals";
import { useExecuteTaskMutation, useTaskExecutionsQuery, useTasksQuery } from "@/src/hooks/useTasks";
import {
  useFieldNotificationReadsQuery,
  useMarkAllFieldNotificationsReadMutation,
  useMarkFieldNotificationReadMutation,
  useMyFieldPendingValidationsQuery,
  useFieldSyncSnapshotQuery,
  useFlushFieldQueueMutation,
  useReportBirthMutation,
  useReportIssueMutation,
} from "@/src/hooks/useField";
import { useGestationsQuery } from "@/src/hooks/useReproduction";
import { isFieldStaffRole } from "@/src/lib/roles";
import { fieldNotificationService } from "@/src/services/field-notifications";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type {
  FieldPendingValidationStatus,
  FieldPendingValidationType,
  FieldReturnNotificationItem,
  TaskPriority,
  TaskStatus,
} from "@/src/types/domain";

type IssueType = "Animal Doente/Ferido" | "Estrutura" | "Falta de Comida" | "Outros";

async function capturePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissão de câmera negada.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

async function readGps() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  try {
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
  } catch {
    return null;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR");
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = due.getTime() - today.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function getPendingStatusLabel(status: FieldPendingValidationStatus) {
  switch (status) {
    case "pendente":
      return "Pendente";
    case "em_analise":
      return "Em análise";
    case "aprovado":
      return "Aprovado";
    case "correcao_solicitada":
      return "Correção solicitada";
    case "rejeitado":
      return "Rejeitado";
    default:
      return "Atualizado";
  }
}

function getTaskStatusLabel(status: TaskStatus) {
  if (status === "pendente") return "Pendente";
  if (status === "em_andamento") return "Em andamento";
  return "Concluída";
}

function getTaskPriorityLabel(priority: TaskPriority) {
  if (priority === "alta") return "Alta";
  if (priority === "media") return "Média";
  return "Baixa";
}

export function FieldHomeScreen() {
  const { role, harasId, profile, user } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();

  const canAccess = isFieldStaffRole(role);
  const syncQuery = useFieldSyncSnapshotQuery(harasId);
  const flushQueue = useFlushFieldQueueMutation(harasId);
  const reportBirth = useReportBirthMutation(harasId);
  const reportIssue = useReportIssueMutation(harasId);
  const myPendingsQuery = useMyFieldPendingValidationsQuery(harasId, user?.id, canAccess);
  const notificationReadsQuery = useFieldNotificationReadsQuery(harasId, user?.id, canAccess);
  const markNotificationRead = useMarkFieldNotificationReadMutation(harasId, user?.id);
  const markAllNotificationsRead = useMarkAllFieldNotificationsReadMutation(harasId, user?.id);
  const gestationsQuery = useGestationsQuery(harasId);

  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const [birthModal, setBirthModal] = useState(false);
  const [birthPhotoUri, setBirthPhotoUri] = useState<string | null>(null);
  const [birthMareSearch, setBirthMareSearch] = useState("");
  const [birthMareId, setBirthMareId] = useState("");
  const [birthSex, setBirthSex] = useState<"Macho" | "Fêmea">("Macho");
  const [birthNote, setBirthNote] = useState("");

  const [issueModal, setIssueModal] = useState(false);
  const [issuePhotoUri, setIssuePhotoUri] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<IssueType>("Animal Doente/Ferido");
  const [issueAnimalSearch, setIssueAnimalSearch] = useState("");
  const [issueAnimalId, setIssueAnimalId] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [historyTask, setHistoryTask] = useState<{ id: string; title: string } | null>(null);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<"all" | FieldPendingValidationType>("all");
  const [pendingStatusFilter, setPendingStatusFilter] = useState<"all" | FieldPendingValidationStatus>("all");
  const [taskDueFilter, setTaskDueFilter] = useState<"all" | "overdue" | "today" | "next7" | "next30">("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | TaskStatus>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | TaskPriority>("all");

  const selectedMareQuery = useAnimalQuery(birthMareId, canAccess && Boolean(birthMareId));
  const selectedIssueAnimalQuery = useAnimalQuery(issueAnimalId, canAccess && Boolean(issueAnimalId));

  const tasksQuery = useTasksQuery(
    harasId && user?.id
      ? {
          haras_id: harasId,
          responsible_id: user.id,
        }
      : null,
    canAccess
  );
  const taskHistoryQuery = useTaskExecutionsQuery(historyTask?.id, harasId);
  const executeTaskMutation = useExecuteTaskMutation();

  const refreshFieldPanels = () => {
    void Promise.all([
      syncQuery.refetch(),
      myPendingsQuery.refetch(),
      gestationsQuery.refetch(),
      notificationReadsQuery.refetch(),
    ]);
  };

  const runSyncWithFeedback = () => {
    flushQueue.mutate(undefined, {
      onSuccess: (result) => {
        refreshFieldPanels();
        if (result.synced > 0) {
          setMessage({ text: `${result.synced} arquivo(s) offline sincronizado(s) com sucesso.`, tone: "success" });
          return;
        }
        if (result.remaining > 0) {
          setMessage({
            text:
              result.skipped_by_backoff > 0
                ? `${result.remaining} item(ns) aguardando nova tentativa de sincronizacao.`
                : `${result.remaining} item(ns) ainda com falha de sincronizacao.`,
            tone: "warning",
          });
          return;
        }
        setMessage({ text: "Sincronização concluída. Nada pendente no momento.", tone: "success" });
      },
        onError: (error) => {
          refreshFieldPanels();
          setMessage({ text: error instanceof Error ? error.message : "Falha ao sincronizar agora.", tone: "danger" });
        },
      });
  };

  useEffect(() => {
    if (!canAccess) return;
    runSyncWithFeedback();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        runSyncWithFeedback();
      }
    });

    return () => unsubscribe();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.textMuted }}>Módulo Campo disponível apenas para Peão/Funcionário.</Text>
        </View>
      </AppScreen>
    );
  }

  const selectedMare = selectedMareQuery.data ?? null;
  const selectedIssueAnimal = selectedIssueAnimalQuery.data ?? null;

  const syncColor =
    syncQuery.data?.last_sync_result === "error"
      ? theme.colors.danger
      : syncQuery.data?.last_sync_result === "partial"
      ? theme.colors.warning
      : theme.colors.success;

  const filteredPendings = useMemo(() => {
    const list = myPendingsQuery.data ?? [];
    return list.filter((item) => {
      if (pendingTypeFilter !== "all" && item.type !== pendingTypeFilter) return false;
      if (pendingStatusFilter !== "all" && item.status !== pendingStatusFilter) return false;
      return true;
    });
  }, [myPendingsQuery.data, pendingStatusFilter, pendingTypeFilter]);

  const returnNotifications = useMemo<FieldReturnNotificationItem[]>(() => {
    const reads = notificationReadsQuery.data ?? {};
    return fieldNotificationService.toNotifications(myPendingsQuery.data ?? [], reads);
  }, [myPendingsQuery.data, notificationReadsQuery.data]);

  const unreadReturnNotifications = useMemo(
    () => returnNotifications.filter((item) => item.is_unread),
    [returnNotifications]
  );

  const fieldGestations = useMemo(() => {
    const items = gestationsQuery.data ?? [];
    return items
      .filter((item) => item.status === "confirmada" || item.status === "em_andamento")
      .map((item) => ({
        ...item,
        days_until_birth: getDaysUntil(item.data_prevista_parto),
      }))
      .sort((a, b) => {
        const aDays = a.days_until_birth ?? Number.POSITIVE_INFINITY;
        const bDays = b.days_until_birth ?? Number.POSITIVE_INFINITY;
        return aDays - bDays;
      });
  }, [gestationsQuery.data]);

  const filteredTasks = useMemo(() => {
    const list = tasksQuery.data ?? [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end7 = new Date(today);
    end7.setDate(end7.getDate() + 7);
    const end30 = new Date(today);
    end30.setDate(end30.getDate() + 30);

    return list
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
  }, [taskDueFilter, taskPriorityFilter, taskStatusFilter, tasksQuery.data]);

  const getPendingStatusColor = (status: FieldPendingValidationStatus) => {
    if (status === "aprovado") return theme.colors.success;
    if (status === "correcao_solicitada") return theme.colors.warning;
    if (status === "rejeitado") return theme.colors.danger;
    if (status === "em_analise") return theme.colors.info;
    return theme.colors.textMuted;
  };

  const getTaskStatusColor = (status: TaskStatus) => {
    if (status === "concluida") return theme.colors.success;
    if (status === "em_andamento") return theme.colors.info;
    return theme.colors.warning;
  };

  const getTaskPriorityColor = (priority: TaskPriority) => {
    if (priority === "alta") return theme.colors.danger;
    if (priority === "media") return theme.colors.warning;
    return theme.colors.success;
  };

  const getNotificationColor = (status: FieldPendingValidationStatus) => {
    if (status === "rejeitado") return theme.colors.danger;
    if (status === "correcao_solicitada") return theme.colors.warning;
    if (status === "aprovado") return theme.colors.success;
    return theme.colors.info;
  };

  const getGestationWindowLabel = (daysUntilBirth: number | null) => {
    if (daysUntilBirth === null) return "Sem previsão";
    if (daysUntilBirth < 0) return `${Math.abs(daysUntilBirth)} dia(s) em atraso`;
    if (daysUntilBirth <= 7) return "Parto previsto em até 7 dias";
    if (daysUntilBirth <= 15) return "Parto previsto em até 15 dias";
    if (daysUntilBirth <= 30) return "Parto previsto em até 30 dias";
    return `Previsão em ${daysUntilBirth} dia(s)`;
  };

  const getGestationWindowColor = (daysUntilBirth: number | null) => {
    if (daysUntilBirth === null) return theme.colors.textMuted;
    if (daysUntilBirth < 0 || daysUntilBirth <= 7) return theme.colors.danger;
    if (daysUntilBirth <= 15) return theme.colors.warning;
    if (daysUntilBirth <= 30) return theme.colors.info;
    return theme.colors.success;
  };

  const onTakeBirthPhoto = async () => {
    try {
      const uri = await capturePhoto();
      if (uri) setBirthPhotoUri(uri);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Falha ao capturar foto.", tone: "danger" });
    }
  };

  const onTakeIssuePhoto = async () => {
    try {
      const uri = await capturePhoto();
      if (uri) setIssuePhotoUri(uri);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Falha ao capturar foto.", tone: "danger" });
    }
  };

  const onSubmitBirth = async () => {
    if (!harasId) return;
    if (!birthPhotoUri) {
      setMessage({ text: "Foto do nascimento é obrigatória.", tone: "danger" });
      return;
    }
    if (!birthMareId) {
      setMessage({ text: "Selecione a mãe (receptora/matriz).", tone: "danger" });
      return;
    }

    const gps = await readGps();

    reportBirth.mutate(
      {
        haras_id: harasId,
        mare_id: birthMareId,
        mare_name: selectedMare?.name || "Não informado",
        unknown_mare: false,
        foal_sex: birthSex,
        photo_uri: birthPhotoUri,
        note: birthNote.trim() || null,
        gps,
        reported_by: profile?.full_name || "Peão",
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setBirthModal(false);
          setBirthPhotoUri(null);
          setBirthMareId("");
          setBirthMareSearch("");
          setBirthNote("");
          refreshFieldPanels();
          setMessage({
            text:
              result.delivery === "queued_offline"
                ? `${result.message} Toque em "Sincronizar agora" quando voltar a internet.`
                : result.message,
            tone: result.synced ? "success" : "warning",
          });
        },
        onError: (error) => {
          setMessage({ text: error instanceof Error ? error.message : "Falha ao enviar nascimento.", tone: "danger" });
        },
      }
    );
  };

  const onSubmitIssue = async () => {
    if (!harasId) return;
    if (!issueNote.trim()) {
      setMessage({ text: "Descreva rapidamente a ocorrencia, observacao ou correcao.", tone: "danger" });
      return;
    }

    const gps = await readGps();

    reportIssue.mutate(
      {
        haras_id: harasId,
        issue_kind: issueType,
        animal_id: issueAnimalId || null,
        animal_name: selectedIssueAnimal?.name || null,
        photo_uri: issuePhotoUri,
        note: issueNote.trim() || null,
        gps,
        reported_by: profile?.full_name || "Peão",
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (result) => {
          setIssueModal(false);
          setIssuePhotoUri(null);
          setIssueAnimalId("");
          setIssueAnimalSearch("");
          setIssueNote("");
          refreshFieldPanels();
          setMessage({
            text:
              result.delivery === "queued_offline"
                ? `${result.message} Toque em "Sincronizar agora" quando voltar a internet.`
                : result.message,
            tone: result.synced ? "success" : "warning",
          });
        },
        onError: (error) => {
          setMessage({ text: error instanceof Error ? error.message : "Falha ao enviar ocorrência.", tone: "danger" });
        },
      }
    );
  };

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Início - Campo</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Registre nascimento e alertas em poucos toques.</Text>

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
            }}
          >
            {message.text}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.pendingHeaderRow}>
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Avisos de retorno</Text>
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>{unreadReturnNotifications.length} não lido(s)</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Correções e rejeições do escritório aparecem aqui.</Text>

        {returnNotifications.length > 0 ? (
          <AppButton
            label="Marcar todos como lidos"
            variant="ghost"
            loading={markAllNotificationsRead.isPending}
            onPress={() => {
              const unreadIds = unreadReturnNotifications.map((item) => item.pending_id);
              if (unreadIds.length === 0) return;
              markAllNotificationsRead.mutate(unreadIds, {
                onSuccess: () => {
                  setMessage({ text: "Avisos marcados como lidos.", tone: "success" });
                  refreshFieldPanels();
                },
              });
            }}
          />
        ) : null}

        {myPendingsQuery.isLoading || notificationReadsQuery.isLoading ? (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Carregando avisos...</Text>
        ) : returnNotifications.length ? (
          returnNotifications.slice(0, 12).map((item) => (
            <View key={item.id} style={[styles.notificationRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.pendingTopRow}>
                <Text style={{ color: getNotificationColor(item.status), fontWeight: "700", flex: 1 }}>{item.title}</Text>
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}> {formatDateTime(item.created_at)}</Text>
              </View>
              <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>
                {item.type === "nascimento" ? "Nascimento" : "Ocorrência"}
              </Text>
              <Text style={{ color: theme.colors.text }}>{item.message}</Text>
              <View style={styles.taskActionsRow}>
                <AppButton
                  label={item.is_unread ? "Marcar como lido" : "Lido"}
                  variant="ghost"
                  disabled={!item.is_unread}
                  loading={markNotificationRead.isPending}
                  onPress={() => {
                    if (!item.is_unread) return;
                    markNotificationRead.mutate(item.pending_id, {
                      onSuccess: () => {
                        setMessage({ text: "Aviso marcado como lido.", tone: "success" });
                        refreshFieldPanels();
                      },
                    });
                  }}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Sem avisos de retorno no momento.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.syncHeader}>
          <Cloud size={18} color={syncColor} />
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Sincronização</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Pendentes: {syncQuery.data?.pending_count ?? 0}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Nascimentos na fila: {syncQuery.data?.pending_by_type?.birth_report ?? 0}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Ocorrências na fila: {syncQuery.data?.pending_by_type?.issue_report ?? 0}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Falhas para retentar: {syncQuery.data?.failed_count ?? 0}</Text>
        {syncQuery.data?.next_retry_at ? (
          <Text style={[styles.syncText, { color: theme.colors.warning }]}>Próxima tentativa automática: {formatDateTime(syncQuery.data.next_retry_at)}</Text>
        ) : null}
        {syncQuery.data?.last_error ? (
          <Text style={[styles.syncText, { color: theme.colors.warning }]}>Último erro: {syncQuery.data.last_error}</Text>
        ) : null}
        <Text style={[styles.syncText, { color: syncColor }]}> 
          {syncQuery.data?.last_sync_message || "Salvamentos offline aparecerão aqui."}
        </Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Última sync: {formatDateTime(syncQuery.data?.last_sync_at)}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Mais antigo pendente: {formatDateTime(syncQuery.data?.oldest_pending_at)}</Text>
        <AppButton
          label="Sincronizar agora"
          variant="ghost"
          onPress={runSyncWithFeedback}
          loading={flushQueue.isPending}
        />
      </Card>

      <Pressable
        onPress={() => setBirthModal(true)}
        style={({ pressed }) => [styles.bigCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}
      >
        <Baby size={34} color={theme.colors.primary} />
        <Text style={[styles.bigCardTitle, { color: theme.colors.text }]}>Registrar Nascimento</Text>
      </Pressable>

      <Pressable
        onPress={() => setIssueModal(true)}
        style={({ pressed }) => [styles.bigCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}
      >
        <AlertTriangle size={34} color={theme.colors.warning} />
        <Text style={[styles.bigCardTitle, { color: theme.colors.text }]}>Registrar Ocorrência</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(app)/(tabs)/buscar-animal")}
        style={({ pressed }) => [styles.bigCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}
      >
        <Search size={34} color={theme.colors.info} />
        <Text style={[styles.bigCardTitle, { color: theme.colors.text }]}>Buscar Animal</Text>
      </Pressable>

      <Card>
        <View style={styles.pendingHeaderRow}>
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Gestações em campo</Text>
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>{fieldGestations.length} ativa(s)</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Priorize os próximos partos e registre o nascimento no mesmo fluxo.</Text>

        {!harasId ? (
          <Text style={[styles.syncText, { color: theme.colors.warning }]}>Haras não identificado para este usuário.</Text>
        ) : gestationsQuery.isLoading ? (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Carregando gestações...</Text>
        ) : gestationsQuery.error ? (
          <Text style={[styles.syncText, { color: theme.colors.danger }]}>Falha ao carregar gestações.</Text>
        ) : fieldGestations.length ? (
          fieldGestations.slice(0, 12).map((item) => {
            const windowColor = getGestationWindowColor(item.days_until_birth);
            return (
              <View key={item.id} style={[styles.gestationRow, { borderColor: theme.colors.border }]}> 
                <View style={styles.pendingTopRow}>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.egua_name || "Égua não informada"}</Text>
                  <View style={[styles.statusPill, { borderColor: windowColor }]}>
                    <Text style={{ color: windowColor, fontSize: 11, fontWeight: "700" }}>{item.status === "em_andamento" ? "Em andamento" : "Confirmada"}</Text>
                  </View>
                </View>

                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Previsão de parto: {formatDate(item.data_prevista_parto)}</Text>
                {item.garanhao_name ? (
                  <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Garanhão: {item.garanhao_name}</Text>
                ) : null}
                <Text style={[styles.syncText, { color: windowColor, fontWeight: "600" }]}>{getGestationWindowLabel(item.days_until_birth)}</Text>

                <AppButton
                  label="Registrar nascimento desta égua"
                  variant="ghost"
                  disabled={!item.mare_id}
                  onPress={() => {
                    if (!item.mare_id) return;
                    setBirthMareId(item.mare_id);
                    setBirthMareSearch(item.egua_name ?? "");
                    setBirthModal(true);
                  }}
                />
              </View>
            );
          })
        ) : (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Sem gestações ativas no haras.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.pendingHeaderRow}>
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Minhas pendências</Text>
          <AppButton
            label="Atualizar"
            variant="ghost"
            onPress={refreshFieldPanels}
            loading={myPendingsQuery.isFetching && !myPendingsQuery.isLoading}
          />
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Acompanhe o retorno do escritório. {filteredPendings.length} item(ns).</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos" },
            { key: "nascimento", label: "Nascimento" },
            { key: "ocorrencia", label: "Ocorrência" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setPendingTypeFilter(item.key as "all" | FieldPendingValidationType)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: pendingTypeFilter === item.key ? theme.colors.primary : theme.colors.border,
                  backgroundColor: pendingTypeFilter === item.key ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos status" },
            { key: "pendente", label: "Pendente" },
            { key: "em_analise", label: "Em análise" },
            { key: "correcao_solicitada", label: "Correção" },
            { key: "aprovado", label: "Aprovado" },
            { key: "rejeitado", label: "Rejeitado" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setPendingStatusFilter(item.key as "all" | FieldPendingValidationStatus)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: pendingStatusFilter === item.key ? theme.colors.primary : theme.colors.border,
                  backgroundColor: pendingStatusFilter === item.key ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {myPendingsQuery.isLoading ? (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Carregando pendências...</Text>
        ) : myPendingsQuery.error ? (
          <Text style={[styles.syncText, { color: theme.colors.danger }]}>Falha ao carregar pendências.</Text>
        ) : filteredPendings.length ? (
          filteredPendings.slice(0, 20).map((item) => (
            <View key={item.id} style={[styles.pendingRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.pendingTopRow}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {item.type === "nascimento" ? "Nascimento" : "Ocorrência"}
                </Text>
                <View style={[styles.statusPill, { borderColor: getPendingStatusColor(item.status) }]}>
                  <Text style={{ color: getPendingStatusColor(item.status), fontSize: 11, fontWeight: "700" }}>
                    {getPendingStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Enviado em: {formatDateTime(item.created_at)}</Text>
              {item.mare_name ? (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Mãe: {item.mare_name}</Text>
              ) : null}
              {item.animal_name ? (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Animal: {item.animal_name}</Text>
              ) : null}
              {item.description ? (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Descrição: {item.description}</Text>
              ) : null}
              {item.source === "offline" ? (
                <Text style={[styles.syncText, { color: theme.colors.warning }]}>Aguardando sincronização com internet.</Text>
              ) : null}
              {item.validation_notes ? (
                <Text style={[styles.pendingNotes, { color: theme.colors.text }]}>Retorno do escritório: {item.validation_notes}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Sem pendências neste filtro.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.pendingHeaderRow}>
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Minhas tarefas</Text>
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>{filteredTasks.length} item(ns)</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Somente tarefas atribuídas a você.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos prazos" },
            { key: "overdue", label: "Atrasadas" },
            { key: "today", label: "Hoje" },
            { key: "next7", label: "Próx. 7 dias" },
            { key: "next30", label: "Próx. 30 dias" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTaskDueFilter(item.key as "all" | "overdue" | "today" | "next7" | "next30")}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: taskDueFilter === item.key ? theme.colors.primary : theme.colors.border,
                  backgroundColor: taskDueFilter === item.key ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todos status" },
            { key: "pendente", label: "Pendente" },
            { key: "em_andamento", label: "Em andamento" },
            { key: "concluida", label: "Concluída" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTaskStatusFilter(item.key as "all" | TaskStatus)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: taskStatusFilter === item.key ? theme.colors.primary : theme.colors.border,
                  backgroundColor: taskStatusFilter === item.key ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "Todas prioridades" },
            { key: "alta", label: "Alta" },
            { key: "media", label: "Média" },
            { key: "baixa", label: "Baixa" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTaskPriorityFilter(item.key as "all" | TaskPriority)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: taskPriorityFilter === item.key ? theme.colors.primary : theme.colors.border,
                  backgroundColor: taskPriorityFilter === item.key ? theme.colors.surfaceAlt : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tasksQuery.isLoading ? (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Carregando tarefas...</Text>
        ) : filteredTasks.length ? (
          filteredTasks.slice(0, 16).map((task) => (
            <View key={task.id} style={[styles.taskRowEnhanced, { borderColor: theme.colors.border }]}> 
              <View style={styles.pendingTopRow}>
                <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={2}>{task.title}</Text>
                <View style={[styles.statusPill, { borderColor: getTaskStatusColor(task.status) }]}> 
                  <Text style={{ color: getTaskStatusColor(task.status), fontSize: 11, fontWeight: "700" }}>
                    {getTaskStatusLabel(task.status)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.syncText, { color: theme.colors.textMuted }]} numberOfLines={1}>Prazo: {formatDate(task.due_date)}</Text>
              <Text style={[styles.syncText, { color: getTaskPriorityColor(task.priority) }]} numberOfLines={1}>Prioridade: {getTaskPriorityLabel(task.priority)}</Text>
              <Text style={[styles.syncText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                Animal: {task.animal_name?.trim() ? task.animal_name.trim() : "Não vinculado"}
              </Text>
              {task.last_execution_id ? (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Histórico disponível de execução.</Text>
              ) : (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Sem execuções registradas ainda.</Text>
              )}

              <View style={styles.taskActionsRow}>
                <AppButton
                  label="Histórico"
                  variant="ghost"
                  onPress={() => setHistoryTask({ id: task.id, title: task.title })}
                />
                <AppButton
                  label="Executar"
                  variant="ghost"
                  onPress={() => setSelectedTask({ id: task.id, title: task.title })}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Nenhuma tarefa neste filtro.</Text>
        )}
      </Card>

      <Modal visible={birthModal} transparent animationType="slide" onRequestClose={() => setBirthModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBirthModal(false)} />
          <KeyboardAwareScrollView
            bottomOffset={20}
            extraKeyboardSpace={16}
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo Nascimento</Text>
              <Text style={[styles.modalHint, { color: theme.colors.textMuted }]}>Preencha os dados e envie em menos de 1 minuto.</Text>

              <AppButton
                label={birthPhotoUri ? "Trocar foto" : "Tirar foto do potro"}
                onPress={onTakeBirthPhoto}
                icon={Camera}
              />
              {birthPhotoUri ? (
                <View style={[styles.photoCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}> 
                  <Image source={{ uri: birthPhotoUri }} style={styles.photoPreview} resizeMode="cover" />
                  <AppButton label="Remover foto" variant="ghost" onPress={() => setBirthPhotoUri(null)} />
                </View>
              ) : null}

              <AnimalSearchSelect
                harasId={harasId}
                enabled={canAccess}
                filters={{ sex: "Fêmea", status: "ativo" }}
                selectedId={birthMareId}
                searchValue={birthMareSearch}
                onSearchChange={setBirthMareSearch}
                onSelect={(animal) => {
                  setBirthMareId(animal.id);
                  setBirthMareSearch(animal.name);
                }}
                onClearSelected={() => {
                  setBirthMareId("");
                  setBirthMareSearch("");
                }}
                searchPlaceholder="Buscar receptora/matriz pelo nome"
                selectedLabelPrefix="Matriz"
              />

              <View style={styles.optionRow}>
                {(["Macho", "Fêmea"] as const).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setBirthSex(value)}
                    style={({ pressed }) => [
                      styles.sexButton,
                      {
                        borderColor: birthSex === value ? theme.colors.primary : theme.colors.border,
                        backgroundColor: birthSex === value ? theme.colors.surfaceAlt : "transparent",
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.sexLabel, { color: theme.colors.text }]}>{value}</Text>
                  </Pressable>
                ))}
              </View>

              <TextField
                value={birthNote}
                onChangeText={setBirthNote}
                placeholder="Observação rápida (opcional)"
                multiline
                style={styles.textArea}
              />

              <View style={styles.modalActions}>
                <AppButton label="Cancelar" variant="ghost" onPress={() => setBirthModal(false)} />
                <AppButton label="Enviar" onPress={onSubmitBirth} loading={reportBirth.isPending} icon={Send} />
              </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <Modal visible={issueModal} transparent animationType="slide" onRequestClose={() => setIssueModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIssueModal(false)} />
          <KeyboardAwareScrollView
            bottomOffset={20}
            extraKeyboardSpace={16}
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Registrar Ocorrência</Text>
              <Text style={[styles.modalHint, { color: theme.colors.textMuted }]}>Descreva a ocorrência, observação ou correção e envie para validação.</Text>

              <AppButton
                label={issuePhotoUri ? "Trocar foto" : "Tirar foto (opcional)"}
                onPress={onTakeIssuePhoto}
                icon={Camera}
                variant="ghost"
              />
              {issuePhotoUri ? (
                <View style={[styles.photoCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}> 
                  <Image source={{ uri: issuePhotoUri }} style={styles.photoPreview} resizeMode="cover" />
                  <AppButton label="Remover foto" variant="ghost" onPress={() => setIssuePhotoUri(null)} />
                </View>
              ) : null}

              <View style={styles.optionColumn}>
                {([
                  "Animal Doente/Ferido",
                  "Estrutura",
                  "Falta de Comida",
                  "Outros",
                ] as IssueType[]).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setIssueType(value)}
                    style={({ pressed }) => [
                      styles.issueButton,
                      {
                        borderColor: issueType === value ? theme.colors.primary : theme.colors.border,
                        backgroundColor: issueType === value ? theme.colors.surfaceAlt : "transparent",
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.text }}>{value}</Text>
                  </Pressable>
                ))}
              </View>

              <AnimalSearchSelect
                harasId={harasId}
                enabled={canAccess}
                filters={{ status: "ativo" }}
                selectedId={issueAnimalId}
                searchValue={issueAnimalSearch}
                onSearchChange={setIssueAnimalSearch}
                onSelect={(animal) => {
                  setIssueAnimalId(animal.id);
                  setIssueAnimalSearch(animal.name);
                }}
                onClearSelected={() => {
                  setIssueAnimalId("");
                  setIssueAnimalSearch("");
                }}
                searchPlaceholder="Animal (opcional)"
                selectedLabelPrefix="Animal"
              />

              <TextField
                value={issueNote}
                onChangeText={setIssueNote}
                placeholder="Descreva a ocorrência, observação ou correção"
                multiline
                style={styles.textArea}
              />

              <View style={styles.modalActions}>
                <AppButton label="Cancelar" variant="ghost" onPress={() => setIssueModal(false)} />
                <AppButton label="Enviar Alerta" onPress={onSubmitIssue} loading={reportIssue.isPending} icon={Send} />
              </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      <TaskExecutionModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        loading={executeTaskMutation.isPending}
        onClose={() => setSelectedTask(null)}
        onSubmit={async (payload) => {
          if (!harasId || !user?.id || !selectedTask) return;

          const connection = await NetInfo.fetch();
          if (!connection.isConnected) {
            setMessage({
              text: "Execução de tarefa requer internet no momento. Assim que voltar conexão, tente novamente.",
              tone: "warning",
            });
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
                const baseMessage =
                  attachmentsCount > 0
                    ? `Execução enviada com sucesso (${attachmentsCount} anexo(s)).`
                    : "Execução enviada com sucesso.";
                const rescheduleMessage =
                  payload.outcome !== "concluida" && suggestedNextDueDate
                    ? ` Reagendada para ${formatDate(suggestedNextDueDate)}.`
                    : "";
                setMessage({ text: `${baseMessage}${rescheduleMessage}`.trim(), tone: "success" });
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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Histórico da tarefa</Text>
              <Text style={[styles.modalHint, { color: theme.colors.textMuted }]}>{historyTask?.title || "-"}</Text>

              {taskHistoryQuery.isLoading ? (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Carregando histórico...</Text>
              ) : taskHistoryQuery.error ? (
                <Text style={[styles.syncText, { color: theme.colors.danger }]}>Falha ao carregar histórico.</Text>
              ) : taskHistoryQuery.data?.length ? (
                taskHistoryQuery.data.slice(0, 12).map((item) => (
                  <View key={item.id} style={[styles.historyRow, { borderColor: theme.colors.border }]}> 
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.outcome.replaceAll("_", " ")}</Text>
                    <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Executado em: {formatDateTime(item.executed_at)}</Text>
                    <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Anexos: {item.attachments.length}</Text>
                    {item.notes ? (
                      <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Notas: {item.notes}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Sem histórico de execução.</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  syncHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  syncTitle: { fontSize: 15, fontWeight: "700" },
  syncText: { fontSize: 12 },
  bigCard: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bigCardTitle: { fontSize: 18, fontWeight: "700" },
  pendingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterRow: {
    gap: 8,
    paddingVertical: 6,
    paddingRight: 6,
  },
  filterChip: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  gestationRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  pendingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 24,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingNotes: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  notificationRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  taskRow: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 72,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  taskRowEnhanced: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  taskTitle: { fontWeight: "700", flex: 1, minWidth: 0 },
  taskActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  historyRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: {
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
  },
  modalHandle: {
    width: 46,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#6b7280",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalContent: { padding: 16, gap: 10, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalHint: { fontSize: 12, marginTop: -2, marginBottom: 4 },
  photoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  optionRow: { flexDirection: "row", gap: 8 },
  sexButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sexLabel: { fontSize: 15, fontWeight: "700" },
  optionColumn: { gap: 8 },
  issueButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  textArea: { minHeight: 110 },
  modalActions: { gap: 8, marginTop: 8 },
});
