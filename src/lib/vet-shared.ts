import type { TaskPriority, TaskStatus } from "@/src/types/domain";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isCondominioAnimal(owner: string | null) {
  if (!owner) return false;
  const normalized = owner
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("CONDOMINIO");
}

export function normalizeAgendaEventType(type: string | null | undefined) {
  const value = (type || "").toLowerCase();
  if (value.includes("vet") || value.includes("diagn") || value.includes("coleta") || value.includes("p4")) {
    return "Veterinário";
  }
  if (value.includes("serv")) return "Serviço";
  return "Evento";
}

export function getAgendaStatusTone(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("concl")) return "success" as const;
  if (normalized.includes("cancel")) return "danger" as const;
  if (normalized.includes("pend")) return "warning" as const;
  return "neutral" as const;
}

export function formatTaskStatus(value: TaskStatus) {
  if (value === "concluida") return "Concluída";
  if (value === "em_andamento") return "Em andamento";
  return "Pendente";
}

export function formatTaskPriority(value: TaskPriority) {
  if (value === "alta") return "Alta";
  if (value === "baixa") return "Baixa";
  return "Média";
}

export function mapTaskStatusFromDb(status: string | null | undefined) {
  if (status === "concluida") return "Concluído";
  if (status === "em_andamento") return "Em andamento";
  return "Pendente";
}

export function mapTaskPriorityFromDb(priority: string | null | undefined) {
  if (priority === "alta") return "Alta";
  if (priority === "baixa") return "Baixa";
  return "Média";
}

export function normalizeReproductionEventStatus(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("concl")) return "concluido";
  if (normalized.includes("confirm") || normalized.includes("andamento")) return "confirmado";
  return "pendente";
}

export function mapDbGestationStatus(value: string | null | undefined) {
  if (!value) return "confirmada";
  const normalized = value.toLowerCase();
  if (normalized.includes("parto")) return "nascimento";
  if (normalized.includes("abort")) return "aborto";
  if (normalized.includes("reabsor")) return "reabsorvida";
  if (normalized.includes("andamento")) return "em_andamento";
  return "confirmada";
}

export function normalizeGestationStatus(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("nasc") || normalized.includes("parto")) {
    return "nascimento";
  }
  if (normalized.includes("abort")) return "aborto";
  if (normalized.includes("reabsor")) return "reabsorvida";
  if (normalized.includes("confirm")) return "confirmada";
  return "em_andamento";
}

export function toDbGestationStatus(value: string | null | undefined) {
  if (!value) return "Em andamento";
  const normalized = value.toLowerCase();
  if (normalized === "nascimento") return "Parto realizado";
  if (normalized === "aborto") return "Abortada";
  if (normalized === "reabsorvida") return "Reabsorvida";
  if (normalized === "confirmada" || normalized === "em_andamento") return "Em andamento";
  return value;
}
