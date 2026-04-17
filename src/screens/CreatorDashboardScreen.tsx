import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarClock,
  HeartPulse,
  Home,
  MapPinOff,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useCreatorDashboardQuery } from "@/src/hooks/useDashboard";
import { useUpcomingTerminationsQuery } from "@/src/hooks/useOwnership";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { DashboardActivityItem } from "@/src/services/dashboard";

type CardTone = "default" | "success" | "warning" | "danger" | "info";

interface CardProps {
  title: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  tone?: CardTone;
  onPress?: () => void;
}

function currencyBR(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  if (!value) return "";
  const parsed = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function DashboardTile({ title, value, hint, icon: Icon, tone = "default", onPress }: CardProps) {
  const { theme } = useAppTheme();

  const toneColor =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
      ? theme.colors.warning
      : tone === "danger"
      ? theme.colors.danger
      : tone === "info"
      ? theme.colors.info
      : theme.colors.text;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.tileIconWrap,
          { backgroundColor: toneColor + "18", borderColor: toneColor + "55" },
        ]}
      >
        <Icon size={18} color={toneColor} />
      </View>
      <Text style={[styles.tileTitle, { color: theme.colors.textMuted }]}>{title}</Text>
      <Text style={[styles.tileValue, { color: theme.colors.text }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.tileHint, { color: theme.colors.textMuted }]}>{hint}</Text>
      ) : null}
    </Pressable>
  );
}

function activityIconFor(item: DashboardActivityItem) {
  switch (item.type) {
    case "transaction":
      return item.variant === "income" ? TrendingUp : Wallet;
    case "event":
      return CalendarClock;
    case "task":
      return Activity;
    case "reproduction":
      return HeartPulse;
    default:
      return Activity;
  }
}

function activityColorFor(item: DashboardActivityItem, theme: ReturnType<typeof useAppTheme>["theme"]) {
  switch (item.variant) {
    case "income":
      return theme.colors.success;
    case "expense":
      return theme.colors.warning;
    case "pending":
      return theme.colors.info;
    case "done":
      return theme.colors.success;
    case "info":
      return theme.colors.primary;
    default:
      return theme.colors.textMuted;
  }
}

export function CreatorDashboardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { role, harasId, profile } = useAuth();
  const canAccess = isCreatorRole(role);

  const query = useCreatorDashboardQuery(canAccess ? harasId : null);
  const terminationsQuery = useUpcomingTerminationsQuery(canAccess ? harasId ?? "" : "");
  const data = query.data;

  const balance = useMemo(() => {
    if (!data) return 0;
    return data.counters.monthlyRevenue - data.counters.monthlyExpenses;
  }, [data]);

  const pendingNotices = (terminationsQuery.data ?? []).length;

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Dashboard"
            description="Disponível apenas para o criador do haras."
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={theme.colors.text}
          />
        }
      >
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={[styles.hello, { color: theme.colors.textMuted }]}>
                Olá{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
              </Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Visão geral do haras
              </Text>
            </View>
            <Pressable
              // UX-04 (D-10): object form é inferido pelo Expo Router com typedRoutes.
              onPress={() => router.push({ pathname: "/(app)/(tabs)/avisos" })}
              accessibilityLabel="Avisos"
              style={({ pressed }) => [
                styles.bellButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <BellRing size={20} color={theme.colors.text} />
              {pendingNotices > 0 ? (
                <View
                  style={[
                    styles.bellBadge,
                    {
                      backgroundColor: theme.colors.danger,
                      borderColor: theme.colors.surface,
                    },
                  ]}
                >
                  <Text style={styles.bellBadgeText}>
                    {pendingNotices > 9 ? "9+" : pendingNotices}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {query.isLoading && !data ? (
          <LoadingState message="Carregando dashboard..." />
        ) : null}

        {query.error ? (
          <Card>
            <Text style={{ color: theme.colors.danger, fontSize: 13 }}>
              Não foi possível carregar: {query.error instanceof Error ? query.error.message : "erro"}
            </Text>
          </Card>
        ) : null}

        {data ? (
          <>
            <View style={styles.grid}>
              <DashboardTile
                title="Total de animais"
                value={String(data.counters.totalAnimals)}
                icon={Home}
                onPress={() => router.push("/(app)/(tabs)/plantel")}
              />
              <DashboardTile
                title="Receita no mês"
                value={currencyBR(data.counters.monthlyRevenue)}
                hint={
                  data.counters.monthlyExpenses
                    ? `Saldo ${currencyBR(balance)}`
                    : undefined
                }
                icon={TrendingUp}
                tone={balance >= 0 ? "success" : "warning"}
                onPress={() => router.push({ pathname: "/(app)/financeiro" })}
              />
              <DashboardTile
                title="Precisam de cuidado"
                value={String(data.counters.animalsNeedingCare)}
                hint="Vacinas vencidas ou em tratamento"
                icon={HeartPulse}
                tone={data.counters.animalsNeedingCare > 0 ? "danger" : "success"}
              />
              <DashboardTile
                title="Serviços pendentes"
                value={String(data.counters.pendingServices)}
                icon={CalendarClock}
                tone="info"
                onPress={() => router.push("/(app)/(tabs)/agenda")}
              />
              <DashboardTile
                title="Gestações ativas"
                value={String(data.counters.activeGestations)}
                icon={Activity}
                tone="info"
                onPress={() => router.push("/(app)/(tabs)/reproducao")}
              />
              <DashboardTile
                title="No haras / fora"
                value={`${data.counters.atHaras} / ${data.counters.away}`}
                hint={
                  data.counters.away > 0
                    ? `${data.counters.away} fora do haras`
                    : "Todos no haras"
                }
                icon={data.counters.away > 0 ? MapPinOff : Home}
                tone={data.counters.away > 0 ? "warning" : "success"}
                onPress={() => router.push("/(app)/(tabs)/plantel")}
              />
            </View>

            {data.warnings.length > 0 ? (
              <Card>
                <View style={styles.warningRow}>
                  <AlertTriangle size={16} color={theme.colors.warning} />
                  <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                    Alguns blocos podem estar desatualizados.
                  </Text>
                </View>
              </Card>
            ) : null}

            <Card>
              <View style={styles.activityHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Atividade recente
                </Text>
                {data.activity.length === 0 ? null : (
                  <Text style={[styles.sectionHint, { color: theme.colors.textMuted }]}>
                    Últimas {data.activity.length}
                  </Text>
                )}
              </View>

              {data.activity.length === 0 ? (
                <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>
                  Sem movimentações recentes.
                </Text>
              ) : (
                data.activity.map((item) => {
                  const Icon = activityIconFor(item);
                  const color = activityColorFor(item, theme);
                  return (
                    <View
                      key={item.id}
                      style={[styles.activityRow, { borderColor: theme.colors.border }]}
                    >
                      <View
                        style={[
                          styles.activityIcon,
                          {
                            backgroundColor: color + "18",
                            borderColor: color + "55",
                          },
                        ]}
                      >
                        <Icon size={14} color={color} />
                      </View>
                      <View style={styles.activityBody}>
                        <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                          {item.title}
                        </Text>
                        {item.detail ? (
                          <Text
                            style={[styles.activityDetail, { color: theme.colors.textMuted }]}
                            numberOfLines={2}
                          >
                            {item.detail}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.activityRight}>
                        {item.amount != null && item.type === "transaction" ? (
                          <Text
                            style={[
                              styles.activityAmount,
                              {
                                color:
                                  item.variant === "income"
                                    ? theme.colors.success
                                    : theme.colors.warning,
                              },
                            ]}
                          >
                            {item.variant === "income" ? "+" : "-"}
                            {currencyBR(Math.abs(item.amount))}
                          </Text>
                        ) : null}
                        <Text style={[styles.activityDate, { color: theme.colors.textMuted }]}>
                          {formatDate(item.date)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 12,
  },
  headerBlock: {
    gap: 4,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  hello: {
    fontSize: 13,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  tileValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  tileHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHint: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  activityRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activityBody: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  activityDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  activityDate: {
    fontSize: 11,
  },
  emptyLine: {
    fontSize: 13,
  },
});
