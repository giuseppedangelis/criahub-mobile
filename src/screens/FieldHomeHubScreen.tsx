import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Baby, BellRing, CalendarDays, CheckCircle2, ChevronRight, Cloud, Search, Send } from "lucide-react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import {
  useFieldNotificationReadsQuery,
  useFieldSyncSnapshotQuery,
  useFlushFieldQueueMutation,
  useMyFieldPendingValidationsQuery,
  useReportBirthMutation,
  useReportIssueMutation,
} from "@/src/hooks/useField";
import { isFieldStaffRole } from "@/src/lib/roles";
import { fieldNotificationService } from "@/src/services/field-notifications";
import { useAppTheme } from "@/src/theme/ThemeContext";

type IssueType = "Animal Doente/Ferido" | "Estrutura" | "Falta de Comida" | "Outros";

async function capturePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Permissao de camera negada.");
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
    return { latitude: current.coords.latitude, longitude: current.coords.longitude };
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

export function FieldHomeHubScreen() {
  const params = useLocalSearchParams<{ openBirth?: string; mareId?: string; mareName?: string }>();
  const { role, harasId, profile, user } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const canAccess = isFieldStaffRole(role);

  const syncQuery = useFieldSyncSnapshotQuery(harasId);
  const flushQueue = useFlushFieldQueueMutation(harasId);
  const reportBirth = useReportBirthMutation(harasId);
  const reportIssue = useReportIssueMutation(harasId);

  const myPendingsQuery = useMyFieldPendingValidationsQuery(harasId, user?.id, canAccess);
  const readsQuery = useFieldNotificationReadsQuery(harasId, user?.id, canAccess);

  const femalesQuery = useAnimalsQuery({ haras_id: harasId ?? undefined, sex: "Fêmea", status: "ativo" }, { page: 1, limit: 120 }, canAccess);
  const animalsQuery = useAnimalsQuery({ haras_id: harasId ?? undefined, status: "ativo" }, { page: 1, limit: 120 }, canAccess);

  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const [birthModal, setBirthModal] = useState(false);
  const [birthPhotoUri, setBirthPhotoUri] = useState<string | null>(null);
  const [birthMareSearch, setBirthMareSearch] = useState("");
  const [birthMareId, setBirthMareId] = useState("");
  const [birthUnknownMare, setBirthUnknownMare] = useState(false);
  const [birthSex, setBirthSex] = useState<"Macho" | "Fêmea">("Macho");
  const [birthNote, setBirthNote] = useState("");

  const [issueModal, setIssueModal] = useState(false);
  const [issuePhotoUri, setIssuePhotoUri] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<IssueType>("Animal Doente/Ferido");
  const [issueAnimalSearch, setIssueAnimalSearch] = useState("");
  const [issueAnimalId, setIssueAnimalId] = useState("");
  const [issueNote, setIssueNote] = useState("");

  const females = femalesQuery.data?.data ?? [];
  const animals = animalsQuery.data?.data ?? [];

  const filteredMares = useMemo(
    () => females.filter((item) => item.name.toLowerCase().includes(birthMareSearch.trim().toLowerCase())),
    [birthMareSearch, females]
  );
  const selectedMare = females.find((item) => item.id === birthMareId) || null;

  const filteredIssueAnimals = useMemo(
    () => animals.filter((item) => item.name.toLowerCase().includes(issueAnimalSearch.trim().toLowerCase())),
    [animals, issueAnimalSearch]
  );
  const selectedIssueAnimal = animals.find((item) => item.id === issueAnimalId) || null;

  const notifications = useMemo(
    () => fieldNotificationService.toNotifications(myPendingsQuery.data ?? [], readsQuery.data ?? {}),
    [myPendingsQuery.data, readsQuery.data]
  );
  const unreadCount = notifications.filter((item) => item.is_unread).length;

  const refresh = () => {
    void Promise.all([syncQuery.refetch(), myPendingsQuery.refetch(), readsQuery.refetch()]);
  };

  const runSyncWithFeedback = (manual = false) => {
    flushQueue.mutate(undefined, {
      onSuccess: (result) => {
        refresh();
        if (result.synced > 0) {
          setMessage({ text: `${result.synced} registro(s) offline sincronizado(s).`, tone: "success" });
          return;
        }
        if (result.remaining > 0) {
          setMessage({
            text:
              result.skipped_by_backoff > 0
                ? `${result.remaining} pendencia(s) aguardando janela de nova tentativa.`
                : `${result.remaining} pendencia(s) ainda com falha de sincronizacao.`,
            tone: "warning",
          });
          return;
        }
        if (manual) {
          setMessage({ text: "Sincronizacao concluida. Nada pendente no momento.", tone: "success" });
        }
      },
      onError: (error) => {
        refresh();
        setMessage({ text: error instanceof Error ? error.message : "Falha ao sincronizar agora.", tone: "danger" });
      },
    });
  };

  useEffect(() => {
    if (!canAccess) return;
    runSyncWithFeedback();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) runSyncWithFeedback();
    });
    return () => unsubscribe();
  }, [canAccess]);

  useEffect(() => {
    if (params.openBirth !== "1") return;
    setBirthUnknownMare(false);
    if (params.mareId) setBirthMareId(String(params.mareId));
    if (params.mareName) setBirthMareSearch(String(params.mareName));
    setBirthModal(true);
  }, [params.mareId, params.mareName, params.openBirth]);

  const syncColor =
    syncQuery.data?.last_sync_result === "error"
      ? theme.colors.danger
      : syncQuery.data?.last_sync_result === "partial"
      ? theme.colors.warning
      : theme.colors.success;

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.textMuted }}>Modulo Campo disponivel apenas para Peao/Funcionario.</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Inicio - Campo</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Acesse cada rotina em sessoes separadas.</Text>

      <Card style={[styles.heroCard, { borderColor: theme.colors.border }]}> 
        <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Operacao de campo</Text>
        <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>Use as sessoes para nao misturar contexto durante o dia.</Text>
      </Card>

      {message ? (
        <Card>
          <Text style={[styles.messageText, { color: message.tone === "success" ? theme.colors.success : message.tone === "warning" ? theme.colors.warning : theme.colors.danger }]}>{message.text}</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.syncHeader}>
          <Cloud size={18} color={syncColor} />
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Sincronizacao</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Pendentes: {syncQuery.data?.pending_count ?? 0}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Nascimentos na fila: {syncQuery.data?.pending_by_type?.birth_report ?? 0}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Ocorrencias na fila: {syncQuery.data?.pending_by_type?.issue_report ?? 0}</Text>
        <Text style={[styles.syncText, { color: syncColor }]}>{syncQuery.data?.last_sync_message || "Salvamentos offline aparecerao aqui."}</Text>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Ultima sync: {formatDateTime(syncQuery.data?.last_sync_at)}</Text>
        <AppButton label="Sincronizar agora" variant="ghost" onPress={() => runSyncWithFeedback(true)} loading={flushQueue.isPending} />
      </Card>

      <Card>
        <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Acoes rapidas</Text>
        <View style={styles.quickGrid}>
          <Pressable onPress={() => setBirthModal(true)} style={({ pressed }) => [styles.quickCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
            <Baby size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Registrar nascimento</Text>
              <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Envio imediato ou offline.</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setIssueModal(true)} style={({ pressed }) => [styles.quickCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
            <AlertTriangle size={20} color={theme.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Registrar ocorrencia</Text>
              <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Observacao, correcao ou alerta em campo.</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/(app)/(tabs)/buscar-animal")} style={({ pressed }) => [styles.quickCard, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
            <Search size={20} color={theme.colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Buscar animal</Text>
              <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Consulta rapida em campo.</Text>
            </View>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Sessoes do modulo</Text>
        <Pressable onPress={() => router.push("/(app)/(tabs)/campo-pendencias")} style={({ pressed }) => [styles.moduleRow, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
          <CheckCircle2 size={18} color={theme.colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Minhas pendencias</Text>
            <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Acompanhe status e retorno do escritorio.</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => router.push("/(app)/(tabs)/campo-gestacoes")} style={({ pressed }) => [styles.moduleRow, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
          <CalendarDays size={18} color={theme.colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Gestacoes em campo</Text>
            <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Prioridades de parto e previsoes.</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => router.push("/(app)/(tabs)/campo-tarefas")} style={({ pressed }) => [styles.moduleRow, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
          <CheckCircle2 size={18} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Minhas tarefas</Text>
            <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Execucao, filtros e historico.</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => router.push("/(app)/(tabs)/campo-avisos")} style={({ pressed }) => [styles.moduleRow, { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}>
          <BellRing size={18} color={theme.colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Avisos de retorno</Text>
            <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Nao lidos: {unreadCount}</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </Pressable>
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo nascimento</Text>

            <AppButton label={birthPhotoUri ? "Trocar foto" : "Tirar foto do potro"} onPress={async () => {
              try {
                const uri = await capturePhoto();
                if (uri) setBirthPhotoUri(uri);
              } catch (error) {
                setMessage({ text: error instanceof Error ? error.message : "Falha ao capturar foto.", tone: "danger" });
              }
            }} />

            {birthPhotoUri ? (
              <View style={[styles.photoCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}> 
                <Image source={{ uri: birthPhotoUri }} style={styles.photoPreview} resizeMode="cover" />
                <AppButton label="Remover foto" variant="ghost" onPress={() => setBirthPhotoUri(null)} />
              </View>
            ) : null}

            <TextField value={birthMareSearch} onChangeText={setBirthMareSearch} placeholder="Buscar mae pelo nome" />
            {!birthUnknownMare ? (
              <View style={[styles.selectList, { borderColor: theme.colors.border }]}> 
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {filteredMares.slice(0, 30).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setBirthMareId(item.id)}
                      style={({ pressed }) => [
                        styles.selectItem,
                        {
                          borderColor: birthMareId === item.id ? theme.colors.primary : theme.colors.border,
                          backgroundColor: birthMareId === item.id ? theme.colors.surfaceAlt : "transparent",
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text }}>{item.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <AppButton label={birthUnknownMare ? "Mae desconhecida: sim" : "Mae desconhecida / nao sei"} variant="ghost" onPress={() => setBirthUnknownMare((prev) => !prev)} />

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

            <TextField value={birthNote} onChangeText={setBirthNote} placeholder="Observacao rapida (opcional)" multiline style={styles.textArea} />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setBirthModal(false)} />
              <AppButton
                label="Enviar"
                icon={Send}
                loading={reportBirth.isPending}
                onPress={async () => {
                  if (!harasId) return;
                  if (!birthPhotoUri) {
                    setMessage({ text: "Foto do nascimento e obrigatoria.", tone: "danger" });
                    return;
                  }
                  if (!birthUnknownMare && !birthMareId) {
                    setMessage({ text: "Selecione a mae ou marque mae desconhecida.", tone: "danger" });
                    return;
                  }

                  const gps = await readGps();
                  reportBirth.mutate(
                    {
                      haras_id: harasId,
                      mare_id: birthUnknownMare ? null : birthMareId,
                      mare_name: birthUnknownMare ? "Mae desconhecida" : selectedMare?.name || "Nao informado",
                      unknown_mare: birthUnknownMare,
                      foal_sex: birthSex,
                      photo_uri: birthPhotoUri,
                      note: birthNote.trim() || null,
                      gps,
                      reported_by: profile?.full_name || "Peao",
                      created_by: user?.id ?? null,
                    },
                    {
                      onSuccess: (result) => {
                        setBirthModal(false);
                        setBirthPhotoUri(null);
                        setBirthMareId("");
                        setBirthUnknownMare(false);
                        setBirthNote("");
                        refresh();
                        setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
                      },
                      onError: (error) => {
                        setMessage({ text: error instanceof Error ? error.message : "Falha ao enviar nascimento.", tone: "danger" });
                      },
                    }
                  );
                }}
              />
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Registrar ocorrencia</Text>

            <AppButton label={issuePhotoUri ? "Trocar foto" : "Tirar foto (opcional)"} variant="ghost" onPress={async () => {
              try {
                const uri = await capturePhoto();
                if (uri) setIssuePhotoUri(uri);
              } catch (error) {
                setMessage({ text: error instanceof Error ? error.message : "Falha ao capturar foto.", tone: "danger" });
              }
            }} />

            {issuePhotoUri ? (
              <View style={[styles.photoCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}> 
                <Image source={{ uri: issuePhotoUri }} style={styles.photoPreview} resizeMode="cover" />
                <AppButton label="Remover foto" variant="ghost" onPress={() => setIssuePhotoUri(null)} />
              </View>
            ) : null}

            <View style={styles.optionColumn}>
              {(["Animal Doente/Ferido", "Estrutura", "Falta de Comida", "Outros"] as IssueType[]).map((value) => (
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

            <TextField value={issueAnimalSearch} onChangeText={setIssueAnimalSearch} placeholder="Animal (opcional)" />
            <View style={[styles.selectList, { borderColor: theme.colors.border }]}> 
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredIssueAnimals.slice(0, 20).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setIssueAnimalId(item.id)}
                    style={({ pressed }) => [
                      styles.selectItem,
                      {
                        borderColor: issueAnimalId === item.id ? theme.colors.primary : theme.colors.border,
                        backgroundColor: issueAnimalId === item.id ? theme.colors.surfaceAlt : "transparent",
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.text }}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {selectedIssueAnimal ? <Text style={{ color: theme.colors.success, fontSize: 12, fontWeight: "600" }}>Animal selecionado: {selectedIssueAnimal.name}</Text> : null}

            <TextField value={issueNote} onChangeText={setIssueNote} placeholder="Descreva a ocorrencia, observacao ou correcao" multiline style={styles.textArea} />

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setIssueModal(false)} />
              <AppButton
                label="Enviar ocorrencia"
                icon={Send}
                loading={reportIssue.isPending}
                onPress={async () => {
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
                      reported_by: profile?.full_name || "Peao",
                      created_by: user?.id ?? null,
                    },
                    {
                      onSuccess: (result) => {
                        setIssueModal(false);
                        setIssuePhotoUri(null);
                        setIssueAnimalId("");
                        setIssueNote("");
                        refresh();
                        setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
                      },
                      onError: (error) => {
                        setMessage({ text: error instanceof Error ? error.message : "Falha ao enviar ocorrencia.", tone: "danger" });
                      },
                    }
                  );
                }}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  heroCard: { gap: 6 },
  heroTitle: { fontSize: 16, fontWeight: "700" },
  heroSubtitle: { fontSize: 12, lineHeight: 17 },
  messageText: { fontSize: 13, fontWeight: "600" },
  syncHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  syncTitle: { fontSize: 15, fontWeight: "700" },
  syncText: { fontSize: 12 },
  quickGrid: { gap: 8 },
  quickCard: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  moduleRow: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: {
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
  },
  modalContent: { padding: 16, gap: 10, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
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
  selectList: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 110,
    maxHeight: 170,
    padding: 8,
  },
  selectItem: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    justifyContent: "center",
    marginBottom: 8,
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
