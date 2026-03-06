import { isVeterinaryRole } from "@/src/lib/roles";

export type VetAccessState = {
  canAccessVet: boolean;
  hasHaras: boolean;
  canLoadVetData: boolean;
  scopedHarasId: string | null;
};

export function resolveVetAccess(role?: string | null, harasId?: string | null): VetAccessState {
  const canAccessVet = isVeterinaryRole(role);
  const hasHaras = Boolean(harasId);
  return {
    canAccessVet,
    hasHaras,
    canLoadVetData: canAccessVet && hasHaras,
    scopedHarasId: canAccessVet ? harasId ?? null : null,
  };
}
