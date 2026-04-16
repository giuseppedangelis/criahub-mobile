import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamService, type TeamPermissions } from "@/src/services/team";

export const teamKeys = {
  all: ["team"] as const,
  list: (harasId: string) => [...teamKeys.all, "list", harasId] as const,
};

export function useTeamMembersQuery(harasId: string | null | undefined) {
  return useQuery({
    queryKey: teamKeys.list(harasId ?? ""),
    queryFn: () => teamService.list(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 30_000,
  });
}

function useInvalidateTeam(harasId: string | null | undefined) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: teamKeys.list(harasId ?? "") });
}

export function useAddTeamMemberMutation(
  harasId: string | null | undefined,
  createdBy?: string | null
) {
  const invalidate = useInvalidateTeam(harasId);
  return useMutation({
    mutationFn: async (input: {
      email: string;
      role: string;
      permissions: Partial<TeamPermissions>;
    }) => {
      if (!harasId) throw new Error("Haras não identificado.");
      const profile = await teamService.findProfileByEmail(input.email);
      if (!profile) {
        throw new Error(
          "Nenhum usuário encontrado com este email. Peça que a pessoa se cadastre primeiro."
        );
      }
      await teamService.upsertMember({
        harasId,
        userId: profile.id,
        permissions: input.permissions,
        role: input.role,
        createdBy: createdBy ?? null,
      });
      return profile;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMemberPermissionsMutation(harasId: string | null | undefined) {
  const invalidate = useInvalidateTeam(harasId);
  return useMutation({
    mutationFn: (input: { memberId: string; permissions: Partial<TeamPermissions> }) =>
      teamService.updatePermissions(input.memberId, input.permissions),
    onSuccess: invalidate,
  });
}

export function useSetMemberStatusMutation(harasId: string | null | undefined) {
  const invalidate = useInvalidateTeam(harasId);
  return useMutation({
    mutationFn: (input: { userId: string; status: "Ativo" | "Inativo" }) => {
      if (!harasId) throw new Error("Haras não identificado.");
      return teamService.setStatus(input.userId, harasId, input.status);
    },
    onSuccess: invalidate,
  });
}

export function useRemoveTeamMemberMutation(harasId: string | null | undefined) {
  const invalidate = useInvalidateTeam(harasId);
  return useMutation({
    mutationFn: (userId: string) => {
      if (!harasId) throw new Error("Haras não identificado.");
      return teamService.remove(userId, harasId);
    },
    onSuccess: invalidate,
  });
}
