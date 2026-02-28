import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { FieldStatCard } from "@/src/components/field/FieldStatCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  useFieldNotificationReadsQuery,
  useMarkAllFieldNotificationsReadMutation,
  useMarkFieldNotificationReadMutation,
  useMyFieldPendingValidationsQuery,
} from "@/src/hooks/useField";
import { isFieldStaffRole } from "@/src/lib/roles";
import { fieldNotificationService } from "@/src/services/field-notifications";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { FieldPendingValidationStatus } from "@/src/types/domain";

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

export function FieldNotificationsScreen() {
  const { role, harasId, user } = useAuth();
  const { theme } = useAppTheme();
  const canAccess = isFieldStaffRole(role);

  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "danger" } | null>(null);

  const pendingsQuery = useMyFieldPendingValidationsQuery(harasId, user?.id, canAccess);
  const readsQuery = useFieldNotificationReadsQuery(harasId, user?.id, canAccess);
  const markReadMutation = useMarkFieldNotificationReadMutation(harasId, user?.id);
  const markAllReadMutation = useMarkAllFieldNotificationsReadMutation(harasId, user?.id);

  const notifications = useMemo(() => {
    return fieldNotificationService.toNotifications(pendingsQuery.data ?? [], readsQuery.data ?? {});
  }, [pendingsQuery.data, readsQuery.data]);

  const unread = useMemo(() => notifications.filter((item) => item.is_unread), [notifications]);

  const colorByStatus = (status: FieldPendingValidationStatus) => {
    if (status === "rejeitado") return theme.colors.danger;
    if (status === "correcao_solicitada") return theme.colors.warning;
    if (status === "aprovado") return theme.colors.success;
    return theme.colors.info;
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Avisos de retorno" description="Disponivel apenas para Peao/Funcionario." />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: theme.colors.text }]}>Avisos de retorno</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Correcoes e rejeicoes do escritorio ficam centralizadas aqui.</Text>

      {message ? (
        <Card>
          <Text style={{ color: message.tone === "danger" ? theme.colors.danger : message.tone === "warning" ? theme.colors.warning : theme.colors.success, fontSize: 13, fontWeight: "600" }}>{message.text}</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <FieldStatCard label="Nao lidos" value={unread.length} tone="warning" compact />
          </View>
          <View style={styles.summaryBox}>
            <FieldStatCard label="Total" value={notifications.length} compact />
          </View>
        </View>
        <AppButton
          label="Marcar todos como lidos"
          variant="ghost"
          loading={markAllReadMutation.isPending}
          disabled={unread.length === 0}
          onPress={() => {
            const ids = unread.map((item) => item.pending_id);
            if (ids.length === 0) return;
            markAllReadMutation.mutate(ids, {
              onSuccess: async () => {
                await Promise.all([pendingsQuery.refetch(), readsQuery.refetch()]);
                setMessage({ text: "Avisos marcados como lidos.", tone: "success" });
              },
            });
          }}
        />
      </Card>

      <Card>
        {pendingsQuery.isLoading || readsQuery.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando avisos...</Text>
        ) : notifications.length ? (
          notifications.slice(0, 20).map((item) => (
            <View key={item.id} style={[styles.row, { borderColor: theme.colors.border }]}> 
              <Text style={{ color: colorByStatus(item.status), fontWeight: "700" }}>{item.title}</Text>
              <Text style={[styles.line, { color: theme.colors.textMuted }]}>{item.type === "nascimento" ? "Nascimento" : "Ocorrencia"} • {formatDateTime(item.created_at)}</Text>
              <Text style={{ color: theme.colors.text }}>{item.message}</Text>
              <AppButton
                label={item.is_unread ? "Marcar como lido" : "Lido"}
                variant="ghost"
                disabled={!item.is_unread}
                loading={markReadMutation.isPending}
                onPress={() => {
                  if (!item.is_unread) return;
                  markReadMutation.mutate(item.pending_id, {
                    onSuccess: async () => {
                      await Promise.all([pendingsQuery.refetch(), readsQuery.refetch()]);
                      setMessage({ text: "Aviso marcado como lido.", tone: "success" });
                    },
                  });
                }}
              />
            </View>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Sem avisos no momento.</Text>
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  line: { fontSize: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  summaryBox: { flex: 1 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
});
