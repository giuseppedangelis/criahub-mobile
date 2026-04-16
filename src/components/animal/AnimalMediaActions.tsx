import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Camera, FileUp, Image as ImageIcon, Link2, Trash2, X } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { TextField } from "@/src/components/ui/TextField";
import {
  useAddDocumentMutation,
  useAddPhotoMutation,
  useAddVideoLinkMutation,
  useRemoveDocumentMutation,
  useRemovePhotoMutation,
  useRemoveVideoMutation,
} from "@/src/hooks/useAnimalMedia";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface AddPhotoProps {
  animalId: string;
  harasId: string;
}

export function AddPhotoButton({ animalId, harasId }: AddPhotoProps) {
  const { theme } = useAppTheme();
  const addMutation = useAddPhotoMutation(animalId, harasId);

  const askSource = () => {
    Alert.alert("Adicionar foto", "Escolha uma origem", [
      { text: "Câmera", onPress: () => pickPhoto("camera") },
      { text: "Galeria", onPress: () => pickPhoto("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const pickPhoto = async (source: "camera" | "library") => {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão negada", "Habilite acesso para continuar.");
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.8,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
              allowsEditing: false,
            });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      await addMutation.mutateAsync(asset.uri);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao adicionar foto.");
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={askSource}
        disabled={addMutation.isPending}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: addMutation.isPending ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Camera size={16} color={theme.colors.primaryText} />
        <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>
          {addMutation.isPending ? "Enviando..." : "Adicionar foto"}
        </Text>
      </Pressable>
    </View>
  );
}

interface RemoveControlProps {
  onConfirm: () => void | Promise<unknown>;
  disabled?: boolean;
  label?: string;
}

export function RemoveMediaButton({ onConfirm, disabled, label = "Remover" }: RemoveControlProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={() =>
        Alert.alert("Confirmar", "Remover este item?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: () => void onConfirm() },
        ])
      }
      disabled={disabled}
      style={({ pressed }) => [
        styles.removePill,
        {
          borderColor: theme.colors.danger,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Trash2 size={13} color={theme.colors.danger} />
      <Text style={[styles.removePillText, { color: theme.colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

export function usePhotoRemover(animalId: string, harasId: string) {
  const mutation = useRemovePhotoMutation(animalId, harasId);
  const remove = (photoUrl: string) =>
    mutation.mutateAsync(photoUrl).catch((err) => {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao remover foto.");
    });
  return { remove, isPending: mutation.isPending };
}

export function useVideoRemover(animalId: string, harasId: string) {
  const mutation = useRemoveVideoMutation(animalId, harasId);
  const remove = (videoId: string) =>
    mutation.mutateAsync(videoId).catch((err) => {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao remover vídeo.");
    });
  return { remove, isPending: mutation.isPending };
}

export function useDocumentRemover(animalId: string, harasId: string) {
  const mutation = useRemoveDocumentMutation(animalId, harasId);
  const remove = (documentId: string) =>
    mutation.mutateAsync(documentId).catch((err) => {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao remover documento.");
    });
  return { remove, isPending: mutation.isPending };
}

interface AddVideoProps {
  animalId: string;
  harasId: string;
}

export function AddVideoLinkButton({ animalId, harasId }: AddVideoProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("Avaliação");
  const [error, setError] = useState<string | null>(null);
  const mutation = useAddVideoLinkMutation(animalId, harasId);

  const submit = async () => {
    setError(null);
    if (!url.trim()) {
      setError("Informe a URL do vídeo.");
      return;
    }
    try {
      await mutation.mutateAsync({
        title: title.trim() || "Vídeo",
        url: url.trim(),
        type: type.trim() || "Outro",
      });
      setOpen(false);
      setTitle("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar vídeo.");
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Link2 size={16} color={theme.colors.primaryText} />
        <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>
          Adicionar vídeo (link)
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.root}
        >
          <Pressable style={modalStyles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              modalStyles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.colors.text }]}>
                Adicionar vídeo
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={modalStyles.content}>
              <TextField
                label="Título"
                placeholder="Ex: Avaliação na pista"
                value={title}
                onChangeText={setTitle}
              />
              <TextField
                label="URL do vídeo"
                placeholder="https://youtube.com/..."
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TextField
                label="Tipo"
                placeholder="Ex: Avaliação / Treino / Exame"
                value={type}
                onChangeText={setType}
              />
              {error ? (
                <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                  {error}
                </Text>
              ) : null}
              <View style={modalStyles.actions}>
                <View style={{ flex: 1 }}>
                  <AppButton label="Cancelar" variant="ghost" onPress={() => setOpen(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label={mutation.isPending ? "Salvando..." : "Salvar"}
                    onPress={submit}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                  />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

interface AddDocumentProps {
  animalId: string;
  harasId: string;
}

export function AddDocumentButton({ animalId, harasId }: AddDocumentProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("outro");
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useAddDocumentMutation(animalId, harasId);

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setFile(asset);
      if (!titulo) setTitulo(asset.name ?? "");
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao selecionar arquivo.");
    }
  };

  const submit = async () => {
    setError(null);
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    try {
      await mutation.mutateAsync({
        fileUri: file.uri,
        fileName: file.name ?? `documento-${Date.now()}`,
        mimeType: file.mimeType ?? null,
        titulo: titulo.trim() || file.name || "Documento",
        tipo: tipo.trim() || "outro",
      });
      setOpen(false);
      setFile(null);
      setTitulo("");
      setTipo("outro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar documento.");
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <FileUp size={16} color={theme.colors.primaryText} />
        <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>
          Adicionar documento
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.root}
        >
          <Pressable style={modalStyles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              modalStyles.sheet,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.colors.text }]}>
                Adicionar documento
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={modalStyles.content}>
              <Pressable
                onPress={pick}
                style={({ pressed }) => [
                  modalStyles.filePicker,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.inputBackground,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <ImageIcon size={18} color={theme.colors.text} />
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: "600" }}>
                  {file ? file.name : "Selecionar arquivo"}
                </Text>
              </Pressable>

              <TextField
                label="Título"
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ex: Certificado ABCCMM"
              />
              <TextField
                label="Tipo"
                value={tipo}
                onChangeText={setTipo}
                placeholder="Ex: certificado / exame / contrato"
              />
              {error ? (
                <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                  {error}
                </Text>
              ) : null}

              <View style={modalStyles.actions}>
                <View style={{ flex: 1 }}>
                  <AppButton label="Cancelar" variant="ghost" onPress={() => setOpen(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label={mutation.isPending ? "Enviando..." : "Enviar"}
                    onPress={submit}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                  />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  removePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  removePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 10,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
