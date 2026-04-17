import { getRoleLabel } from "@/src/lib/roles";
import type { AnimalCategory, AnimalStatus } from "@/src/types/domain";

export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatCategoryLabel(category: AnimalCategory): string {
  const labels: Record<AnimalCategory, string> = {
    potro: "Potro",
    potra: "Potra",
    garanhao: "Garanhão",
    egua: "Égua",
    castrado: "Castrado",
    // PAR-02 (D-15): categoria surfaced quando o DB traz valor fora do mapa
    // canônico. Mostra "Desconhecida" em vez de classificar mal como potro.
    unknown: "Desconhecida",
  };
  return labels[category];
}

export function formatStatusLabel(status: AnimalStatus): string {
  const labels: Record<AnimalStatus, string> = {
    ativo: "Ativo",
    provisorio: "Provisório",
    vendido: "Vendido",
    morto: "Falecido",
    emprestado: "Transferido",
    em_servico: "Em serviço",
  };
  return labels[status];
}

export function formatRole(role?: string | null): string {
  return getRoleLabel(role);
}
