import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  financialService,
  type CreateTransactionInput,
  type FinancialFilters,
} from "@/src/services/financial";
import { dashboardKeys } from "@/src/hooks/useDashboard";

export const financialKeys = {
  all: ["financial"] as const,
  list: (filters: FinancialFilters) =>
    [...financialKeys.all, "list", filters] as const,
  summary: (harasId: string) =>
    [...financialKeys.all, "summary", harasId] as const,
};

export function useTransactionsQuery(filters: FinancialFilters) {
  return useQuery({
    queryKey: financialKeys.list(filters),
    queryFn: () => financialService.list(filters),
    enabled: Boolean(filters.haras_id),
    staleTime: 30_000,
  });
}

export function useMonthlyFinancialSummary(harasId: string | null | undefined) {
  return useQuery({
    queryKey: financialKeys.summary(harasId ?? ""),
    queryFn: () => financialService.monthlySummary(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 60_000,
  });
}

function useInvalidateFinancial(harasId: string | null | undefined) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: financialKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.creator(harasId ?? "") }),
    ]);
}

export function useCreateTransactionMutation(harasId: string | null | undefined) {
  const invalidate = useInvalidateFinancial(harasId);
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => financialService.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransactionMutation(harasId: string | null | undefined) {
  const invalidate = useInvalidateFinancial(harasId);
  return useMutation({
    mutationFn: (id: string) =>
      financialService.remove(id, harasId as string),
    onSuccess: invalidate,
  });
}
