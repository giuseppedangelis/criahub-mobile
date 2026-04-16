import { useMemo, useState } from "react";
import {
  Alert,
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
import { Plus, Power, Trash2, UserPlus, X } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useSetMemberStatusMutation,
  useTeamMembersQuery,
  useUpdateMemberPermissionsMutation,
} from "@/src/hooks/useTeam";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import {
  DEFAULT_TEAM_PERMISSIONS,
  PERMISSION_LABELS,
  type TeamMember,
  type TeamPermissionKey,
  type TeamPermissions,
} from "@/src/services/team";

const ROLE_OPTIONS = [
  { value: "assessor", label: "Assessor" },
  { value: "veterinario", label: "Veterinário" },
  { value: "peao", label: "Peão" },
  { value: "funcionario", label: "Funcionário" },
];

const PERMISSION_KEYS: TeamPermissionKey[] = [
  "viewHerd",
  "registerActivities",
  "reproduction",
  "healthManagement",
  "financialManagement",
  "trainingManagement",
  "documentManagement",
  "teamManagement",
  "fullAdministrative",
];

function getRoleLabel(value: string | null) {
  if (!value) return "Sem perfil";
  const match = ROLE_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function CreatorTeamScreen() {
  const { theme } = useAppTheme();
  const { harasId, role, user } = useAuth();
  const canAccess = isCreatorRole(role);

  const [addOpen, setAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const membersQuery = useTeamMembersQuery(canAccess ? harasId : null);
  const addMutation = useAddTeamMemberMutation(harasId, user?.id);
  const updateMutation = useUpdateMemberPermissionsMutation(harasId);
  const statusMutation = useSetMemberStatusMutation(harasId);
  const removeMutation = useRemoveTeamMemberMutation(harasId);

  const members = membersQuery.data ?? [];

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Equipe"
            description="Disponível apenas para o criador do haras."
          />
        </View>
      </AppScreen>
    );
  }

  const askRemove = (member: TeamMember) => {
    Alert.alert(
      "Remover membro",
      `Remover ${member.profile.full_name || member.profile.email || "este membro"} da equipe?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            removeMutation.mutate(member.user_id, {
              onError: (err) =>
                Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao remover."),
            });
          },
        },
      ]
    );
  };

  const toggleStatus = (member: TeamMember) => {
    const next = member.status === "Ativo" ? "Inativo" : "Ativo";
    statusMutation.mutate(
      { userId: member.user_id, status: next },
      {
        onError: (err) =>
          Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao atualizar status."),
      }
    );
  };

  return (
    <AppScreen scroll>
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Equipe</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Gerencie os membros e suas permissões no haras.
        </Text>
      </View>

      <AppButton label="Adicionar membro" icon={UserPlus} onPress={() => setAddOpen(true)} />

      {membersQuery.isLoading ? <LoadingState message="Carregando equipe..." /> : null}
      {membersQuery.error ? (
        <Card>
          <Text style={{ color: theme.colors.danger, fontSize: 13 }}>
            {membersQuery.error instanceof Error ? membersQuery.error.message : "Erro"}
          </Text>
        </Card>
      ) : null}

      {!membersQuery.isLoading && members.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum membro"
            description="Use o botão acima para adicionar alguém pelo email cadastrado."
          />
        </Card>
      ) : null}

      {members.map((member) => (
        <Card key={member.id}>
          <View style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>
                {member.profile.full_name || "Sem nome"}
              </Text>
              <Text style={[styles.memberMeta, { color: theme.colors.textMuted }]}>
                {member.profile.email || "Sem email"}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        member.status === "Ativo"
                          ? theme.colors.success + "20"
                          : theme.colors.warning + "20",
                      borderColor:
                        member.status === "Ativo" ? theme.colors.success : theme.colors.warning,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        member.status === "Ativo" ? theme.colors.success : theme.colors.warning,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {member.status}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme.colors.info + "20",
                      borderColor: theme.colors.info,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.info,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {getRoleLabel(member.profile.role)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <AppButton
                label="Permissões"
                variant="ghost"
                onPress={() => setEditingMember(member)}
              />
            </View>
            <Pressable
              onPress={() => toggleStatus(member)}
              disabled={statusMutation.isPending}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: theme.colors.border,
                  opacity: statusMutation.isPending ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Power size={16} color={theme.colors.text} />
            </Pressable>
            <Pressable
              onPress={() => askRemove(member)}
              disabled={removeMutation.isPending}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: theme.colors.danger,
                  opacity: removeMutation.isPending ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Trash2 size={16} color={theme.colors.danger} />
            </Pressable>
          </View>
        </Card>
      ))}

      {addOpen ? (
        <AddMemberModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          isSaving={addMutation.isPending}
          onSubmit={async (input) => {
            try {
              await addMutation.mutateAsync(input);
              setAddOpen(false);
              Alert.alert("Sucesso", "Membro adicionado à equipe.");
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Falha ao adicionar membro."
              );
            }
          }}
        />
      ) : null}

      {editingMember ? (
        <PermissionsModal
          visible={Boolean(editingMember)}
          member={editingMember}
          isSaving={updateMutation.isPending}
          onClose={() => setEditingMember(null)}
          onSubmit={async (permissions) => {
            try {
              await updateMutation.mutateAsync({
                memberId: editingMember.id,
                permissions,
              });
              setEditingMember(null);
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Falha ao salvar permissões."
              );
            }
          }}
        />
      ) : null}
    </AppScreen>
  );
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    email: string;
    role: string;
    permissions: Partial<TeamPermissions>;
  }) => void | Promise<void>;
  isSaving: boolean;
}

function AddMemberModal({ visible, onClose, onSubmit, isSaving }: AddMemberModalProps) {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("funcionario");
  const [permissions, setPermissions] = useState<TeamPermissions>({
    ...DEFAULT_TEAM_PERMISSIONS,
  });
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (key: TeamPermissionKey) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Informe o email do membro.");
      return;
    }
    await onSubmit({ email: trimmed, role: selectedRole, permissions });
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
            <Text style={[modalStyles.title, { color: theme.colors.text }]}>
              Adicionar membro
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={modalStyles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[modalStyles.hint, { color: theme.colors.textMuted }]}>
              O membro precisa já ter um cadastro no CriaHub. Informe o email utilizado no login.
            </Text>

            <TextField
              label="Email do membro"
              value={email}
              onChangeText={setEmail}
              placeholder="membro@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[modalStyles.fieldLabel, { color: theme.colors.text }]}>Função</Text>
            <View style={modalStyles.pillRow}>
              {ROLE_OPTIONS.map((option) => {
                const active = selectedRole === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedRole(option.value)}
                    style={({ pressed }) => [
                      modalStyles.pill,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.inputBackground,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.primaryText : theme.colors.text,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[modalStyles.fieldLabel, { color: theme.colors.text }]}>
              Permissões iniciais
            </Text>
            {PERMISSION_KEYS.map((key) => (
              <View key={key} style={modalStyles.permissionRow}>
                <Text style={[modalStyles.permissionLabel, { color: theme.colors.text }]}>
                  {PERMISSION_LABELS[key]}
                </Text>
                <Switch
                  value={permissions[key]}
                  onValueChange={() => togglePermission(key)}
                  trackColor={{
                    true: theme.colors.success,
                    false: theme.colors.surfaceAlt,
                  }}
                  thumbColor={theme.colors.primary}
                />
              </View>
            ))}

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
                  label={isSaving ? "Adicionando..." : "Adicionar"}
                  onPress={submit}
                  loading={isSaving}
                  disabled={isSaving}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface PermissionsModalProps {
  visible: boolean;
  member: TeamMember;
  onClose: () => void;
  onSubmit: (permissions: TeamPermissions) => void | Promise<void>;
  isSaving: boolean;
}

function PermissionsModal({
  visible,
  member,
  onClose,
  onSubmit,
  isSaving,
}: PermissionsModalProps) {
  const { theme } = useAppTheme();
  const [permissions, setPermissions] = useState<TeamPermissions>(() => ({ ...member.permissions }));

  const togglePermission = (key: TeamPermissionKey) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
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
            <Text style={[modalStyles.title, { color: theme.colors.text }]}>Permissões</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content}>
            <Text style={[modalStyles.hint, { color: theme.colors.textMuted }]}>
              Ajuste o que {member.profile.full_name || member.profile.email || "este membro"} pode
              ver e editar.
            </Text>
            {PERMISSION_KEYS.map((key) => (
              <View key={key} style={modalStyles.permissionRow}>
                <Text style={[modalStyles.permissionLabel, { color: theme.colors.text }]}>
                  {PERMISSION_LABELS[key]}
                </Text>
                <Switch
                  value={permissions[key]}
                  onValueChange={() => togglePermission(key)}
                  trackColor={{
                    true: theme.colors.success,
                    false: theme.colors.surfaceAlt,
                  }}
                  thumbColor={theme.colors.primary}
                />
              </View>
            ))}

            <View style={modalStyles.actions}>
              <View style={{ flex: 1 }}>
                <AppButton label="Cancelar" variant="ghost" onPress={onClose} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={isSaving ? "Salvando..." : "Salvar"}
                  onPress={() => onSubmit(permissions)}
                  loading={isSaving}
                  disabled={isSaving}
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
  centered: { flex: 1, justifyContent: "center" },
  headerBlock: { gap: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  memberRow: { flexDirection: "row", alignItems: "flex-start" },
  memberName: { fontSize: 15, fontWeight: "700" },
  memberMeta: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  iconButton: {
    width: 40,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
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
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 10 },
  hint: { fontSize: 12, lineHeight: 17 },
  fieldLabel: { fontSize: 14, fontWeight: "500", marginTop: 6 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 10,
  },
  permissionLabel: { fontSize: 13, flex: 1, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
