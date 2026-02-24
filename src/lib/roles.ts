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
    case "veterinario":
    case "veterinaria":
    case "veterinary":
    case "vet":
      return "veterinario";
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
    case "peao":
      return "peao";
    default:
      return "unknown";
  }
}

export function isCreatorRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "criador" || normalized === "breeder";
}

export function isVeterinaryRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "veterinario" || normalized === "vet";
}

export function isFieldStaffRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === "peao" ||
    normalized === "funcionario" ||
    normalized === "employee"
  );
}

export function isMobileSupportedRole(role?: string | null): boolean {
  return isCreatorRole(role) || isVeterinaryRole(role) || isFieldStaffRole(role);
}

export function getDefaultAppRouteForRole(role?: string | null): string {
  if (isFieldStaffRole(role)) return "/(app)/(tabs)/campo";
  if (isVeterinaryRole(role)) return "/(app)/(tabs)/veterinaria";
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
    case "veterinario":
    case "vet":
      return "Veterinária";
    case "assessor":
    case "acessor":
    case "advisor":
      return "Assessor";
    case "employee":
    case "funcionario":
    case "peao":
      return "Peão";
    default:
      return "Perfil desconhecido";
  }
}
