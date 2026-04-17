import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  ChevronRight,
  Moon,
  Pencil,
  Sun,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { profileService } from "@/src/services/profile";
import { supabase } from "@/src/services/base";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatRole } from "@/src/utils/format";

function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  const src = (name || email || "").trim();
  if (!src) return "—";
  const parts = src.split(/\s+|@/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || src[0]?.toUpperCase() || "—";
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.profileLine}>
      <Text style={[styles.profileLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

export function AccountScreen() {
  const router = useRouter();
  const { profile, role, user, signOut, refreshProfile } = useAuth();
  const { mode, theme, toggleTheme } = useAppTheme();
  const [harasName, setHarasName] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const canManageCreatorPages = isCreatorRole(role);

  useEffect(() => {
    const harasId = profile?.haras_id ?? null;
    let mounted = true;

    if (!harasId) {
      setHarasName(null);
      return () => {
        mounted = false;
      };
    }

    setHarasName(null);

    void (async () => {
      try {
        const { data } = await supabase.from("haras").select("nome").eq("id", harasId).maybeSingle();
        if (!mounted) return;
        setHarasName(data?.nome ?? null);
      } catch {
        if (!mounted) return;
        setHarasName(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.haras_id]);

  const initials = useMemo(
    () => initialsOf(profile?.full_name, profile?.email),
    [profile?.full_name, profile?.email]
  );

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Conta</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Informações do usuário e preferências do app.
        </Text>
      </View>

      <Card>
        <View style={styles.profileHeader}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>
                {initials}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {profile?.full_name || "Sem nome"}
            </Text>
            <Text style={[styles.profileMeta, { color: theme.colors.textMuted }]}>
              {profile?.email || "—"}
            </Text>
            <Text style={[styles.profileMeta, { color: theme.colors.textMuted }]}>
              {formatRole(role)}
              {harasName ? ` • ${harasName}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setEditOpen(true)}
            accessibilityLabel="Editar perfil"
            style={({ pressed }) => [
              styles.editIconBtn,
              { borderColor: theme.colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Pencil size={16} color={theme.colors.text} />
          </Pressable>
        </View>

        <ProfileLine label="Telefone" value={profile?.phone || "Não informado"} />
      </Card>

      {canManageCreatorPages ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Atalhos</Text>
          <AccountShortcut
            icon={TrendingUp}
            label="Financeiro"
            onPress={() => router.push("/(app)/financeiro" as any)}
          />
          <AccountShortcut
            icon={Users}
            label="Equipe"
            onPress={() => router.push("/(app)/equipe" as any)}
          />
        </Card>
      ) : null}

      <Card>
        <View style={styles.themeRow}>
          <View style={styles.themeInfo}>
            {mode === "dark" ? (
              <Moon size={18} color={theme.colors.text} />
            ) : (
              <Sun size={18} color={theme.colors.text} />
            )}
            <View>
              <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
                Tema {mode === "dark" ? "escuro" : "claro"}
              </Text>
              <Text style={[styles.themeDescription, { color: theme.colors.textMuted }]}>
                Alternar entre visual escuro e claro.
              </Text>
            </View>
          </View>

          <Switch
            value={mode === "dark"}
            onValueChange={() => {
              void toggleTheme();
            }}
            thumbColor="#ffffff"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <AppButton
          label="Sair da conta"
          variant="ghost"
          onPress={() => {
            void signOut();
          }}
        />
        <AppButton
          label="Excluir minha conta"
          variant="danger"
          onPress={() => {
            // APPLE-01: exclusão in-app real (Apple 5.1.1(v)). Dupla confirmação
            // antes de invocar a edge function `delete-account` que grava audit
            // + chama auth.admin.deleteUser(). Após sucesso, signOut local dispara
            // redirect pra /(auth)/login via onAuthStateChange.
            Alert.alert(
              "Excluir conta?",
              "Esta ação remove permanentemente sua conta e todos os dados vinculados. Você não conseguirá mais acessar o CriaHub com este email.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Continuar",
                  style: "destructive",
                  onPress: () => {
                    Alert.alert(
                      "Tem certeza?",
                      "Última confirmação. Após tocar em \"Excluir minha conta\" a exclusão é processada e você será deslogado.",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Excluir minha conta",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const { data, error } = await supabase.functions.invoke<{
                                success?: boolean;
                                error?: string;
                                details?: string;
                              }>("delete-account", { method: "POST" });

                              if (error || !data?.success) {
                                const message =
                                  error?.message ??
                                  data?.error ??
                                  "Não foi possível excluir agora.";
                                Alert.alert(
                                  "Erro ao excluir conta",
                                  `${message}\n\nSe o problema persistir, escreva pra suporte@criahub.com.br.`
                                );
                                return;
                              }

                              Alert.alert(
                                "Conta excluída",
                                "Seu acesso foi encerrado. Se precisar de algo, escreva pra suporte@criahub.com.br."
                              );
                              await signOut();
                            } catch (err) {
                              const message =
                                err instanceof Error
                                  ? err.message
                                  : "Erro inesperado.";
                              Alert.alert(
                                "Erro ao excluir conta",
                                `${message}\n\nSe o problema persistir, escreva pra suporte@criahub.com.br.`
                              );
                            }
                          },
                        },
                      ]
                    );
                  },
                },
              ]
            );
          }}
        />
      </Card>

      <Pressable style={styles.footerInfo}>
        <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>CRIAHUB Mobile</Text>
      </Pressable>

      {editOpen && user ? (
        <EditProfileModal
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          userId={user.id}
          initialName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          onSaved={async () => {
            await refreshProfile();
          }}
        />
      ) : null}
    </AppScreen>
  );
}

function AccountShortcut({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        { borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon size={18} color={theme.colors.text} />
      <Text style={[styles.shortcutLabel, { color: theme.colors.text }]}>{label}</Text>
      <ChevronRight size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initialName: string;
  initialPhone: string;
  initialAvatarUrl: string | null;
  onSaved: () => void | Promise<void>;
}

function EditProfileModal({
  visible,
  onClose,
  userId,
  initialName,
  initialPhone,
  initialAvatarUrl,
  onSaved,
}: EditProfileModalProps) {
  const { theme } = useAppTheme();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAvatar = async () => {
    try {
      Alert.alert("Foto de perfil", "Escolha a origem", [
        {
          text: "Câmera",
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert("Permissão negada", "Habilite acesso à câmera para continuar.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (result.canceled || !result.assets?.length) return;
            await uploadAsset(result.assets[0].uri);
          },
        },
        {
          text: "Galeria",
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert("Permissão negada", "Habilite acesso à galeria para continuar.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (result.canceled || !result.assets?.length) return;
            await uploadAsset(result.assets[0].uri);
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao escolher foto.");
    }
  };

  const uploadAsset = async (uri: string) => {
    setIsUploading(true);
    try {
      const url = await profileService.uploadAvatar(userId, uri);
      setAvatarUrl(url);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao enviar foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    setIsSaving(true);
    try {
      await profileService.update(userId, {
        full_name: name.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={modalStyles.root}
      >
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View
          style={[
            modalStyles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.colors.text }]}>Editar perfil</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={modalStyles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={pickAvatar}
              disabled={isUploading}
              style={({ pressed }) => [
                modalStyles.avatarWrap,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  opacity: isUploading ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={modalStyles.avatar} />
              ) : (
                <UserRound size={36} color={theme.colors.textMuted} />
              )}
              <View
                style={[
                  modalStyles.avatarBadge,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surface,
                  },
                ]}
              >
                <Camera size={14} color={theme.colors.primaryText} />
              </View>
            </Pressable>
            <Text style={[modalStyles.avatarHint, { color: theme.colors.textMuted }]}>
              {isUploading ? "Enviando foto..." : "Toque para alterar foto"}
            </Text>

            <TextField
              label="Nome completo"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Maria da Silva"
            />
            <TextField
              label="Telefone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-0000"
              keyboardType="phone-pad"
            />

            {error ? (
              <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                {error}
              </Text>
            ) : null}

            <View style={modalStyles.actions}>
              <View style={{ flex: 1 }}>
                <AppButton label="Cancelar" variant="ghost" onPress={onClose} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={isSaving ? "Salvando..." : "Salvar"}
                  onPress={submit}
                  loading={isSaving}
                  disabled={isSaving || isUploading}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
  },
  profileMeta: {
    fontSize: 13,
    lineHeight: 17,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileLine: {
    gap: 2,
    marginTop: 6,
  },
  profileLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  profileValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  shortcutLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  themeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  themeDescription: {
    fontSize: 13,
  },
  footerInfo: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 12,
  },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    maxHeight: "92%",
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
  title: { fontSize: 17, fontWeight: "700" },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
    alignItems: "stretch",
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: "center",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: -4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
});
