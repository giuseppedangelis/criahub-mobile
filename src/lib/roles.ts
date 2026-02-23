import type { UserRole } from "@/src/types/domain";

export type NormalizedRole = UserRole;

export function normalizeRole(role?: string | null): NormalizedRole {
  const normalized = (role || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  switch (normalized) {
    case "admin":
      return "admin";
    case "criador":
      return "criador";
    case "breeder":
      return "breeder";
    case "assessor":
      return "assessor";
    case "acessor":
      return "acessor";
    case "advisor":
      return "advisor";
    case "employee":
      return "employee";
    case "funcionario":
      return "funcionario";
    default:
      return "unknown";
  }
}

export function isCreatorRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "criador" || normalized === "breeder";
}

export function isMobileSupportedRole(role?: string | null): boolean {
  return isCreatorRole(role);
}

export function getDefaultAppRouteForRole(role?: string | null): string {
  if (isCreatorRole(role)) return "/(app)/(tabs)/plantel";
  return "/(app)/unsupported";
}

export function getRoleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "admin":
      return "Administrador";
    case "criador":
    case "breeder":
      return "Criador";
    case "assessor":
    case "acessor":
    case "advisor":
      return "Assessor";
    case "employee":
    case "funcionario":
      return "Funcionário";
    default:
      return "Perfil desconhecido";
  }
}
