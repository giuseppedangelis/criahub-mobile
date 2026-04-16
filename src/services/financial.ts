import { handleSupabaseError, supabase } from "@/src/services/base";

export type TransactionType = "Receita" | "Despesa";

export interface FinancialTransaction {
  id: string;
  haras_id: string;
  tipo: TransactionType;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  data_transacao: string;
  animal_id: string | null;
  animal_name: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FinancialSummary {
  receita: number;
  despesa: number;
  saldo: number;
  periodStart: string;
  periodEnd: string;
}

export interface FinancialFilters {
  haras_id: string;
  tipo?: TransactionType | "todos";
  from?: string;
  to?: string;
}

export interface CreateTransactionInput {
  haras_id: string;
  tipo: TransactionType;
  categoria: string;
  descricao?: string | null;
  valor: number;
  data_transacao: string;
  animal_id?: string | null;
  forma_pagamento?: string | null;
  observacoes?: string | null;
}

const TRANSACTION_SELECT = `
  id, haras_id, tipo, categoria, descricao, valor, data_transacao,
  animal_id, forma_pagamento, observacoes, created_at, updated_at,
  animals:animal_id(nome)
`;

function mapTransaction(row: any): FinancialTransaction {
  const animal = Array.isArray(row.animals) ? row.animals[0] : row.animals;
  return {
    id: row.id,
    haras_id: row.haras_id,
    tipo: (row.tipo as TransactionType) ?? "Despesa",
    categoria: row.categoria ?? null,
    descricao: row.descricao ?? null,
    valor: Number(row.valor ?? 0) || 0,
    data_transacao: row.data_transacao,
    animal_id: row.animal_id ?? null,
    animal_name: animal?.nome ?? null,
    forma_pagamento: row.forma_pagamento ?? null,
    observacoes: row.observacoes ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export const financialService = {
  async list(filters: FinancialFilters): Promise<FinancialTransaction[]> {
    if (!filters.haras_id) return [];
    let query = supabase
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("haras_id", filters.haras_id)
      .order("data_transacao", { ascending: false })
      .limit(200);

    if (filters.tipo && filters.tipo !== "todos") {
      query = query.eq("tipo", filters.tipo);
    }
    if (filters.from) query = query.gte("data_transacao", filters.from);
    if (filters.to) query = query.lte("data_transacao", filters.to);

    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    return (data ?? []).map(mapTransaction);
  },

  async monthlySummary(harasId: string, reference = new Date()): Promise<FinancialSummary> {
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("transactions")
      .select("tipo, valor")
      .eq("haras_id", harasId)
      .gte("data_transacao", startIso)
      .lt("data_transacao", endIso);

    if (error) handleSupabaseError(error);

    let receita = 0;
    let despesa = 0;
    for (const row of data ?? []) {
      const value = Number(row.valor ?? 0) || 0;
      if ((row.tipo ?? "").toLowerCase() === "receita") receita += value;
      else if ((row.tipo ?? "").toLowerCase() === "despesa") despesa += value;
    }

    return {
      receita,
      despesa,
      saldo: receita - despesa,
      periodStart: startIso,
      periodEnd: endIso,
    };
  },

  async create(input: CreateTransactionInput): Promise<void> {
    if (!input.haras_id) throw new Error("Haras não identificado.");
    if (!input.tipo) throw new Error("Informe o tipo da transação.");
    if (!input.categoria?.trim()) throw new Error("Informe a categoria.");
    if (!Number.isFinite(input.valor) || input.valor <= 0) {
      throw new Error("Informe um valor maior que zero.");
    }
    if (!input.data_transacao) throw new Error("Informe a data da transação.");

    const { error } = await supabase.from("transactions").insert({
      haras_id: input.haras_id,
      tipo: input.tipo,
      categoria: input.categoria.trim(),
      descricao: input.descricao?.trim() || null,
      valor: input.valor,
      data_transacao: input.data_transacao,
      animal_id: input.animal_id ?? null,
      forma_pagamento: input.forma_pagamento?.trim() || null,
      observacoes: input.observacoes?.trim() || null,
    });
    if (error) handleSupabaseError(error);
  },

  async remove(id: string, harasId: string): Promise<void> {
    if (!id || !harasId) throw new Error("Transação inválida.");
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("haras_id", harasId);
    if (error) handleSupabaseError(error);
  },
};
