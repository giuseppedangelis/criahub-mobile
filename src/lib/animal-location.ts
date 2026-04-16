export type AnimalLocationType = "Baia" | "Pasto" | "Servico";

export type AnimalServiceType =
  | "Reproducao"
  | "Trabalho"
  | "Repouso"
  | "Hospedagem"
  | "Compra"
  | "Nascimento"
  | "Outro";

export const SERVICE_TYPE_OPTIONS: { value: AnimalServiceType; label: string }[] = [
  { value: "Reproducao", label: "Reprodução" },
  { value: "Trabalho", label: "Trabalho" },
  { value: "Repouso", label: "Repouso" },
  { value: "Hospedagem", label: "Hospedagem" },
  { value: "Compra", label: "Compra" },
  { value: "Nascimento", label: "Nascimento" },
  { value: "Outro", label: "Outro" },
];

function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeServiceType(value?: string | null): AnimalServiceType | null {
  const key = normalizeText(value);
  if (!key) return null;
  if (key.includes("reproducao")) return "Reproducao";
  if (key.includes("trabalho")) return "Trabalho";
  if (key.includes("repouso")) return "Repouso";
  if (key.includes("hospedagem")) return "Hospedagem";
  if (key.includes("compra")) return "Compra";
  if (key.includes("nascimento")) return "Nascimento";
  return "Outro";
}

export function getServiceTypeLabel(value?: string | null): string {
  const normalized = normalizeServiceType(value);
  if (!normalized) return value || "";
  const match = SERVICE_TYPE_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? value ?? "";
}

export function buildAnimalLocationLabel(
  locationType: AnimalLocationType,
  locationName: string,
  serviceType?: string | null
): string {
  const trimmed = (locationName || "").trim();
  if (locationType === "Servico") {
    const resolvedServiceType = normalizeServiceType(serviceType) ?? "Outro";
    return `Servico - ${getServiceTypeLabel(resolvedServiceType)} - ${trimmed}`.replace(
      /\s+-\s+$/,
      ""
    );
  }
  return trimmed;
}

export function resolveLocationTypeFromLabel(
  location?: string | null,
  serviceType?: string | null
): AnimalLocationType {
  const key = normalizeText(location);
  if (normalizeServiceType(serviceType)) return "Servico";
  if (key.startsWith("servico")) return "Servico";
  if (key.includes("pasto")) return "Pasto";
  if (key.includes("baia")) return "Baia";
  return "Baia";
}

/** Extrai o nome do ambiente do label combinado. Ex: "Servico - Reprodução - Haras X" → "Haras X" */
export function extractLocationName(
  label: string | null | undefined,
  locationType: AnimalLocationType
): string {
  if (!label) return "";
  if (locationType !== "Servico") return label.trim();
  const match = label.match(/^servico\s*-\s*[^-]+-\s*(.+)$/i);
  if (match) return match[1].trim();
  return label.trim();
}
