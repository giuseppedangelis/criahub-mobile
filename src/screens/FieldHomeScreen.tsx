import { useEffect, useState } from "react";
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
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import {
  useFieldSyncSnapshotQuery,
  useFlushFieldQueueMutation,
  useReportBirthMutation,
  useReportIssueMutation,
} from "@/src/hooks/useField";
import { isFieldStaffRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";

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

export function FieldHomeScreen() {
  const { role, harasId, profile, user } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();

  const canAccess = isFieldStaffRole(role);
  const syncQuery = useFieldSyncSnapshotQuery(harasId);
  const flushQueue = useFlushFieldQueueMutation(harasId);
  const reportBirth = useReportBirthMutation(harasId);
  const reportIssue = useReportIssueMutation(harasId);

  const femalesQuery = useAnimalsQuery(
    { haras_id: harasId ?? undefined, sex: "Fêmea", status: "ativo" },
    { page: 1, limit: 120 },
    canAccess
  );
  const animalsQuery = useAnimalsQuery(
    { haras_id: harasId ?? undefined, status: "ativo" },
    { page: 1, limit: 120 },
    canAccess
  );

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

  const runSyncWithFeedback = () => {
    flushQueue.mutate(undefined, {
      onSuccess: (syncedCount) => {
        if (syncedCount > 0) {
          setMessage({ text: `${syncedCount} arquivo(s) offline sincronizado(s) com sucesso.`, tone: "success" });
          return;
        }
        setMessage({ text: "Sincronização concluída. Nada pendente no momento.", tone: "success" });
      },
      onError: (error) => {
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

  const females = femalesQuery.data?.data ?? [];
  const animals = animalsQuery.data?.data ?? [];

  const filteredMares = females.filter((item) =>
    item.name.toLowerCase().includes(birthMareSearch.trim().toLowerCase())
  );
  const selectedMare = females.find((item) => item.id === birthMareId) || null;

  const filteredIssueAnimals = animals.filter((item) =>
    item.name.toLowerCase().includes(issueAnimalSearch.trim().toLowerCase())
  );
  const selectedIssueAnimal = animals.find((item) => item.id === issueAnimalId) || null;

  const syncColor =
    syncQuery.data?.last_sync_result === "error"
      ? theme.colors.danger
      : syncQuery.data?.last_sync_result === "partial"
      ? theme.colors.warning
      : theme.colors.success;

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
    if (!birthUnknownMare && !birthMareId) {
      setMessage({ text: "Selecione a mãe ou marque mãe desconhecida.", tone: "danger" });
      return;
    }

    const gps = await readGps();

    reportBirth.mutate(
      {
        haras_id: harasId,
        mare_id: birthUnknownMare ? null : birthMareId,
        mare_name: birthUnknownMare ? "Mãe desconhecida" : selectedMare?.name || "Não informado",
        unknown_mare: birthUnknownMare,
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
          setBirthUnknownMare(false);
          setBirthNote("");
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
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
      setMessage({ text: "Descreva rapidamente o problema.", tone: "danger" });
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
          setIssueNote("");
          setMessage({ text: result.message, tone: result.synced ? "success" : "warning" });
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
        <View style={styles.syncHeader}>
          <Cloud size={18} color={syncColor} />
          <Text style={[styles.syncTitle, { color: theme.colors.text }]}>Sincronização</Text>
        </View>
        <Text style={[styles.syncText, { color: theme.colors.textMuted }]}>Pendentes: {syncQuery.data?.pending_count ?? 0}</Text>
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

              <TextField value={birthMareSearch} onChangeText={setBirthMareSearch} placeholder="Buscar mãe pelo nome" />
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

              <AppButton
                label={birthUnknownMare ? "Mãe desconhecida: sim" : "Mãe desconhecida / não sei"}
                variant="ghost"
                onPress={() => setBirthUnknownMare((prev) => !prev)}
              />
              {birthUnknownMare ? (
                <Text style={{ color: theme.colors.warning, fontSize: 12 }}>
                  Atenção: mantenha a foto bem visível com o potro e a mãe.
                </Text>
              ) : null}

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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Reportar Problema</Text>
              <Text style={[styles.modalHint, { color: theme.colors.textMuted }]}>Descreva a ocorrência e envie para validação.</Text>

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
              {selectedIssueAnimal ? (
                <Text style={[styles.selectedAnimalText, { color: theme.colors.success }]}>Animal selecionado: {selectedIssueAnimal.name}</Text>
              ) : null}

              <TextField
                value={issueNote}
                onChangeText={setIssueNote}
                placeholder="Explique rápido o problema"
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
  selectedAnimalText: { fontSize: 12, fontWeight: "600" },
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
