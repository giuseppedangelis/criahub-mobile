import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BellRing, Clock } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useUpcomingTerminationsQuery } from "@/src/hooks/useOwnership";
import { useTerminationReminderSync } from "@/src/hooks/useTerminationReminderSync";
import { requestNotificationPermissions } from "@/src/lib/notifications";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { UpcomingTerminationItem } from "@/src/types/domain";

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatRemaining(days: number) {
  if (days < 0) return `Vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days <= 30) return `Em ${days} dias`;
  const months = Math.round(days / 30);
  return `Em ~${months} mês${months === 1 ? "" : "es"}`;
}

function resolveTone(days: number) {
  if (days < 0) return "danger";
  if (days <= 7) return "warning";
  return "info";
}

export function CreatorNoticesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { harasId, role } = useAuth();
  const canAccess = isCreatorRole(role);

  const { data, isLoading, error, refetch, isFetching } = useUpcomingTerminationsQuery(
    harasId ?? "",
    60
  );
  useTerminationReminderSync(canAccess ? harasId : null);
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied">(
    "unknown"
  );

  const sorted = useMemo<UpcomingTerminationItem[]>(() => {
    return (data ?? []).slice().sort((a, b) => a.days_remaining - b.days_remaining);
  }, [data]);

  const overdue = sorted.filter((item) => item.days_remaining < 0);
  const thisWeek = sorted.filter(
    (item) => item.days_remaining >= 0 && item.days_remaining <= 7
  );
  const later = sorted.filter((item) => item.days_remaining > 7);

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Avisos"
            description="Disponível apenas para o criador do haras."
          />
        </View>
      </AppScreen>
    );
  }

  const requestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionState(granted ? "granted" : "denied");
    if (!granted) {
      Alert.alert(
        "Permissão negada",
        "Habilite notificações em Ajustes para receber lembretes de devolução."
      );
    }
  };

  const renderItem = (item: UpcomingTerminationItem) => {
    const tone = resolveTone(item.days_remaining);
    const toneColor =
      tone === "danger"
        ? theme.colors.danger
        : tone === "warning"
        ? theme.colors.warning
        : theme.colors.info;

    return (
      <Pressable
        key={`${item.animal_id}-${item.due_date}`}
        onPress={() => router.push(`/(app)/animal/${item.animal_id}` as any)}
        style={({ pressed }) => [styles.itemRow, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View
          style={[
            styles.itemDot,
            {
              backgroundColor: toneColor + "20",
              borderColor: toneColor,
            },
          ]}
        >
          <Clock size={16} color={toneColor} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
            {item.animal_name}
          </Text>
          <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
            Vence em {formatDateBR(item.due_date)} •{" "}
            {item.termination_type === "age" ? "por idade" : "por data"}
          </Text>
          {item.physical_location ? (
            <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
              Local: {item.physical_location}
            </Text>
          ) : null}
          {item.primary_owner ? (
            <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
              Sócio: {item.primary_owner}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.itemRemaining, { color: toneColor }]}>
          {formatRemaining(item.days_remaining)}
        </Text>
      </Pressable>
    );
  };

  return (
    <AppScreen scroll>
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Avisos</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Lembretes de devolução de animais em sociedade/condomínio.
        </Text>
      </View>

      <Card>
        <View style={styles.permissionRow}>
          <BellRing size={20} color={theme.colors.text} />
          <View style={styles.permissionText}>
            <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
              Notificações locais
            </Text>
            <Text style={[styles.permissionSub, { color: theme.colors.textMuted }]}>
              Lembretes são agendados 30, 7 e 1 dia antes do prazo.
            </Text>
          </View>
          {permissionState !== "granted" ? (
            <AppButton label="Ativar" variant="ghost" onPress={requestPermission} />
          ) : (
            <Text style={[styles.permissionStatus, { color: theme.colors.success }]}>
              Ativo
            </Text>
          )}
        </View>
      </Card>

      {isLoading ? <LoadingState message="Carregando avisos..." /> : null}
      {error ? (
        <Card>
          <Text style={{ color: theme.colors.danger, fontSize: 13 }}>
            Não foi possível carregar avisos: {error instanceof Error ? error.message : "erro"}
          </Text>
          <AppButton label="Tentar novamente" variant="ghost" onPress={() => refetch()} />
        </Card>
      ) : null}

      {!isLoading && sorted.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum prazo à vista"
            description="Quando um condomínio tiver data/idade de término próxima, ele aparece aqui."
          />
        </Card>
      ) : null}

      {overdue.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Atrasados ({overdue.length})
          </Text>
          {overdue.map(renderItem)}
        </Card>
      ) : null}

      {thisWeek.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Próximos 7 dias ({thisWeek.length})
          </Text>
          {thisWeek.map(renderItem)}
        </Card>
      ) : null}

      {later.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            A seguir ({later.length})
          </Text>
          {later.map(renderItem)}
        </Card>
      ) : null}

      {isFetching && !isLoading ? (
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Atualizando...</Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  headerBlock: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionText: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  permissionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  permissionStatus: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  itemDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  itemRemaining: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
});
