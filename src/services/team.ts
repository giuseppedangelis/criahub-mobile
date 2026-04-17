import { z } from "zod";
import { handleSupabaseError, supabase } from "@/src/services/base";

// SEC-01 (D-16): RPCs retornam shape `{ ok?: boolean, error?: string }` (ou null).
// Usar .passthrough para não rejeitar campos extras que o backend possa adicionar.
// Se o shape vier totalmente diferente, safeParse falha e a gente loga warning
// + segue com fallback seguro (vira sucesso silencioso pra evitar travar o usuário
// quando o retorno é null mas o erro foi nulo).
const RpcResultSchema = z
  .object({
    ok: z.boolean().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type TeamPermissionKey =
  | "viewHerd"
  | "registerActivities"
  | "healthManagement"
  | "reproduction"
  | "financialManagement"
  | "trainingManagement"
  | "teamManagement"
  | "documentManagement"
  | "fullAdministrative";

export type TeamPermissions = Record<TeamPermissionKey, boolean>;

export const DEFAULT_TEAM_PERMISSIONS: TeamPermissions = {
  viewHerd: true,
  registerActivities: false,
  healthManagement: false,
  reproduction: false,
  financialManagement: false,
  trainingManagement: false,
  teamManagement: false,
  documentManagement: false,
  fullAdministrative: false,
};

export const PERMISSION_LABELS: Record<TeamPermissionKey, string> = {
  viewHerd: "Visualizar plantel",
  registerActivities: "Registrar atividades",
  healthManagement: "Gerenciar saúde",
  reproduction: "Reprodução",
  financialManagement: "Gerenciar financeiro",
  trainingManagement: "Gerenciar treinos",
  teamManagement: "Gerenciar equipe",
  documentManagement: "Gerenciar documentos",
  fullAdministrative: "Acesso administrativo total",
};

export interface TeamMemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
}

export interface TeamMember {
  id: string;
  haras_id: string;
  user_id: string;
  permissions: TeamPermissions;
  status: "Ativo" | "Inativo";
  profile: TeamMemberProfile;
  created_at: string | null;
  updated_at: string | null;
}

function normalizePermissions(input: Partial<TeamPermissions> | null | undefined): TeamPermissions {
  if (!input) return { ...DEFAULT_TEAM_PERMISSIONS };
  return {
    viewHerd: Boolean(input.viewHerd),
    registerActivities: Boolean(input.registerActivities),
    healthManagement: Boolean(input.healthManagement),
    reproduction: Boolean(input.reproduction),
    financialManagement: Boolean(input.financialManagement),
    trainingManagement: Boolean(input.trainingManagement),
    teamManagement: Boolean(input.teamManagement),
    documentManagement: Boolean(input.documentManagement),
    fullAdministrative: Boolean(input.fullAdministrative),
  };
}

const MEMBER_SELECT = `
  id, haras_id, user_id, permissions, status, created_at, updated_at,
  profile:profiles!haras_members_user_id_fkey (
    id, full_name, email, phone, avatar_url, role
  )
`;

function mapMember(row: any): TeamMember {
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return {
    id: row.id,
    haras_id: row.haras_id,
    user_id: row.user_id,
    permissions: normalizePermissions(row.permissions),
    status: (row.status === "Inativo" ? "Inativo" : "Ativo") as "Ativo" | "Inativo",
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    profile: {
      id: profile?.id ?? row.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: profile?.role ?? null,
    },
  };
}

export const teamService = {
  async list(harasId: string): Promise<TeamMember[]> {
    if (!harasId) return [];
    const { data, error } = await supabase
      .from("haras_members")
      .select(MEMBER_SELECT)
      .eq("haras_id", harasId);
    if (error) handleSupabaseError(error);

    const items = (data ?? []).map(mapMember);
    items.sort((a, b) => {
      const leftName = a.profile.full_name || a.profile.email || "";
      const rightName = b.profile.full_name || b.profile.email || "";
      return leftName.localeCompare(rightName, "pt-BR");
    });
    return items;
  },

  async findProfileByEmail(
    email: string
  ): Promise<{ id: string; full_name: string | null; email: string | null } | null> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", trimmed)
      .maybeSingle();
    if (error) handleSupabaseError(error);
    return data ?? null;
  },

  async upsertMember(input: {
    harasId: string;
    userId: string;
    permissions?: Partial<TeamPermissions>;
    role?: string | null;
    createdBy?: string | null;
  }): Promise<void> {
    const payload = {
      haras_id: input.harasId,
      user_id: input.userId,
      permissions: normalizePermissions(input.permissions ?? null),
      status: "Ativo",
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("haras_members")
      .upsert(payload, { onConflict: "haras_id,user_id" });
    if (error) handleSupabaseError(error);

    if (input.role) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          haras_id: input.harasId,
          role: input.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.userId);
      if (profileError) handleSupabaseError(profileError);
    }
  },

  async updatePermissions(
    memberId: string,
    permissions: Partial<TeamPermissions>
  ): Promise<void> {
    const { error } = await supabase
      .from("haras_members")
      .update({
        permissions: normalizePermissions(permissions),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);
    if (error) handleSupabaseError(error);
  },

  async setStatus(userId: string, harasId: string, status: "Ativo" | "Inativo"): Promise<void> {
    const { data, error } = await (supabase as any).rpc("set_haras_member_status", {
      p_user_id: userId,
      p_haras_id: harasId,
      p_status: status,
    });
    if (error) handleSupabaseError(error);
    // SEC-01 (D-16): valida shape do retorno com Zod antes de consumir.
    if (data != null && typeof data === "object") {
      const parsed = RpcResultSchema.safeParse(data);
      if (!parsed.success) {
        console.warn("[team] set_haras_member_status returned unexpected shape:", data);
        return;
      }
      if (parsed.data.error) {
        throw new Error(parsed.data.error);
      }
    }
  },

  async remove(userId: string, harasId: string): Promise<void> {
    const { data, error } = await (supabase as any).rpc("remove_haras_member", {
      p_user_id: userId,
      p_haras_id: harasId,
    });
    if (error) handleSupabaseError(error);
    // SEC-01 (D-16): valida shape do retorno com Zod antes de consumir.
    if (data != null && typeof data === "object") {
      const parsed = RpcResultSchema.safeParse(data);
      if (!parsed.success) {
        console.warn("[team] remove_haras_member returned unexpected shape:", data);
        return;
      }
      if (parsed.data.error) {
        throw new Error(parsed.data.error);
      }
    }
  },
};
