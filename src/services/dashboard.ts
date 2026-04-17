import { handleSupabaseError, supabase } from "@/src/services/base";
import { REPRODUCTIVE_EVENT_LABELS } from "@/src/types/domain";

export interface DashboardCounters {
  totalAnimals: number;
  activeGestations: number;
  pendingServices: number;
  animalsNeedingCare: number;
  atHaras: number;
  away: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

export type DashboardActivityType =
  | "transaction"
  | "event"
  | "task"
  | "reproduction";

export interface DashboardActivityItem {
  id: string;
  type: DashboardActivityType;
  title: string;
  detail: string | null;
  date: string;
  amount?: number | null;
  variant?: "income" | "expense" | "pending" | "done" | "info";
}

export interface CreatorDashboardData {
  counters: DashboardCounters;
  activity: DashboardActivityItem[];
  warnings: string[];
}

const CARE_MANAGEMENT_STATUSES = ["Em tratamento", "Em observacao", "Em coleta"];

function monthRangeUtc(reference = new Date()) {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return {
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  };
}

async function countActiveAnimals(harasId: string): Promise<number> {
  const { count, error } = await supabase
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("haras_id", harasId)
    .eq("status", "Ativo");
  if (error) handleSupabaseError(error);
  return count ?? 0;
}

async function countPresence(harasId: string) {
  const [atRes, awayRes] = await Promise.all([
    supabase
      .from("animals")
      .select("id", { count: "exact", head: true })
      .eq("haras_id", harasId)
      .eq("status", "Ativo")
      .eq("is_at_haras", true),
    supabase
      .from("animals")
      .select("id", { count: "exact", head: true })
      .eq("haras_id", harasId)
      .eq("status", "Ativo")
      .eq("is_at_haras", false),
  ]);
  if (atRes.error) handleSupabaseError(atRes.error);
  if (awayRes.error) handleSupabaseError(awayRes.error);
  return { atHaras: atRes.count ?? 0, away: awayRes.count ?? 0 };
}

async function countActiveGestations(harasId: string): Promise<number> {
  const { count, error } = await supabase
    .from("gestations")
    .select("id", { count: "exact", head: true })
    .eq("haras_id", harasId)
    .ilike("status", "em andamento%");
  if (error) handleSupabaseError(error);
  return count ?? 0;
}

async function countPendingServices(harasId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("haras_id", harasId)
    .eq("status", "Pendente")
    .gte("data_inicio", today);
  if (error) handleSupabaseError(error);
  return count ?? 0;
}

async function countAnimalsNeedingCare(harasId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const [overdueVaccines, managedAnimals] = await Promise.all([
    supabase
      .from("vaccines")
      .select("animal_id")
      .eq("haras_id", harasId)
      .not("data_proxima_dose", "is", null)
      .lt("data_proxima_dose", today),
    supabase
      .from("animals")
      .select("id")
      .eq("haras_id", harasId)
      .eq("status", "Ativo")
      .in("status_manejo", CARE_MANAGEMENT_STATUSES),
  ]);

  if (overdueVaccines.error) handleSupabaseError(overdueVaccines.error);
  if (managedAnimals.error) handleSupabaseError(managedAnimals.error);

  const ids = new Set<string>();
  for (const row of overdueVaccines.data ?? []) {
    if (row.animal_id) ids.add(row.animal_id as string);
  }
  for (const row of managedAnimals.data ?? []) {
    if (row.id) ids.add(row.id as string);
  }
  return ids.size;
}

async function computeMonthlyFinance(harasId: string) {
  const { startIso, endIso } = monthRangeUtc();
  const { data, error } = await supabase
    .from("transactions")
    .select("tipo, valor")
    .eq("haras_id", harasId)
    .gte("data_transacao", startIso)
    .lt("data_transacao", endIso);
  if (error) handleSupabaseError(error);

  let revenue = 0;
  let expenses = 0;
  for (const row of data ?? []) {
    const value = Number(row.valor ?? 0) || 0;
    if ((row.tipo ?? "").toLowerCase() === "receita") revenue += value;
    else if ((row.tipo ?? "").toLowerCase() === "despesa") expenses += value;
  }
  return { monthlyRevenue: revenue, monthlyExpenses: expenses };
}

async function fetchRecentActivity(
  harasId: string,
  limit = 10
): Promise<DashboardActivityItem[]> {
  const [txRes, eventsRes, tasksRes, reproRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, tipo, descricao, valor, data_transacao, created_at")
      .eq("haras_id", harasId)
      .order("data_transacao", { ascending: false })
      .limit(limit),
    supabase
      .from("events")
      .select("id, titulo, tipo, status, data_inicio, created_at")
      .eq("haras_id", harasId)
      .order("data_inicio", { ascending: false })
      .limit(limit),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, completed_at, created_at")
      .eq("haras_id", harasId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reproductive_events")
      .select("id, event_type, event_date, observations, created_at")
      .eq("haras_id", harasId)
      .order("event_date", { ascending: false })
      .limit(limit),
  ]);

  const items: DashboardActivityItem[] = [];

  for (const row of txRes.data ?? []) {
    const tipoLower = (row.tipo ?? "").toLowerCase();
    items.push({
      id: `tx-${row.id}`,
      type: "transaction",
      title: row.descricao || (tipoLower === "receita" ? "Receita" : "Despesa"),
      detail: row.tipo ?? null,
      date: row.data_transacao || row.created_at,
      amount: Number(row.valor ?? 0) || 0,
      variant: tipoLower === "receita" ? "income" : "expense",
    });
  }

  for (const row of eventsRes.data ?? []) {
    const isPending = (row.status ?? "").toLowerCase() === "pendente";
    items.push({
      id: `ev-${row.id}`,
      type: "event",
      title: row.titulo || row.tipo || "Evento",
      detail: [row.tipo, row.status].filter(Boolean).join(" • ") || null,
      date: row.data_inicio || row.created_at,
      variant: isPending ? "pending" : "done",
    });
  }

  for (const row of tasksRes.data ?? []) {
    const statusLower = (row.status ?? "").toLowerCase();
    items.push({
      id: `tk-${row.id}`,
      type: "task",
      title: row.title || "Tarefa",
      detail: row.status ?? null,
      date: row.completed_at || row.due_date || row.created_at,
      variant: statusLower === "concluida" ? "done" : "pending",
    });
  }

  for (const row of reproRes.data ?? []) {
    const label = REPRODUCTIVE_EVENT_LABELS[row.event_type as string] ?? row.event_type;
    items.push({
      id: `rp-${row.id}`,
      type: "reproduction",
      title: label || "Evento reprodutivo",
      detail: row.observations ?? null,
      date: row.event_date || row.created_at,
      variant: "info",
    });
  }

  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return items.slice(0, limit);
}

export const dashboardService = {
  async getCreatorDashboard(harasId: string): Promise<CreatorDashboardData> {
    if (!harasId) {
      return {
        counters: {
          totalAnimals: 0,
          activeGestations: 0,
          pendingServices: 0,
          animalsNeedingCare: 0,
          atHaras: 0,
          away: 0,
          monthlyRevenue: 0,
          monthlyExpenses: 0,
        },
        activity: [],
        warnings: [],
      };
    }

    const warnings: string[] = [];
    const safe = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        warnings.push(`${label}: ${err instanceof Error ? err.message : "erro"}`);
        return fallback;
      }
    };

    const [
      totalAnimals,
      presence,
      activeGestations,
      pendingServices,
      animalsNeedingCare,
      finance,
      activity,
    ] = await Promise.all([
      safe("total_animais", () => countActiveAnimals(harasId), 0),
      safe(
        "presenca",
        () => countPresence(harasId),
        { atHaras: 0, away: 0 }
      ),
      safe("gestacoes", () => countActiveGestations(harasId), 0),
      safe("servicos", () => countPendingServices(harasId), 0),
      safe("cuidado", () => countAnimalsNeedingCare(harasId), 0),
      safe(
        "financeiro",
        () => computeMonthlyFinance(harasId),
        { monthlyRevenue: 0, monthlyExpenses: 0 }
      ),
      safe("atividade", () => fetchRecentActivity(harasId), [] as DashboardActivityItem[]),
    ]);

    return {
      counters: {
        totalAnimals,
        activeGestations,
        pendingServices,
        animalsNeedingCare,
        atHaras: presence.atHaras,
        away: presence.away,
        monthlyRevenue: finance.monthlyRevenue,
        monthlyExpenses: finance.monthlyExpenses,
      },
      activity,
      warnings,
    };
  },
};
