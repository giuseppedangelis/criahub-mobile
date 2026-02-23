import { supabase } from "@/src/lib/supabase";
import type { PaginationParams, PaginatedResponse } from "@/src/types/domain";

export { supabase };

export function applyPagination<TQuery extends { range: Function }>(
  query: TQuery,
  params: PaginationParams
) {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  return query.range(from, to);
}

export function formatPaginatedResponse<T>(
  data: T[],
  count: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    total: count,
    page: params.page,
    limit: params.limit,
    totalPages: Math.max(1, Math.ceil(count / params.limit)),
  };
}

export function handleSupabaseError(error: { message?: string } | null): never {
  const message = error?.message || "Erro ao acessar o banco de dados.";
  throw new Error(message);
}
