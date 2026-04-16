import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useMonthlyFinancialSummary,
  useTransactionsQuery,
} from "@/src/hooks/useFinancial";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { TransactionType } from "@/src/services/financial";

type Filter = TransactionType | "todos";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "Receita", label: "Receitas" },
  { value: "Despesa", label: "Despesas" },
];

const CATEGORY_SUGGESTIONS_RECEITA = [
  "Venda de animal",
  "Serviço de Reprodução",
  "Premiação",
  "Hospedagem",
  "Outros",
];
const CATEGORY_SUGGESTIONS_DESPESA = [
  "Alimentação",
  "Veterinário",
  "Medicamento",
  "Equipamento",
  "Funcionário",
  "Infraestrutura",
  "Outros",
];

function currencyBR(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function parseValue(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function CreatorFinancialScreen() {
  const { theme } = useAppTheme();
  const { harasId, role } = useAuth();
  const canAccess = isCreatorRole(role);

  const [filter, setFilter] = useState<Filter>("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const summaryQuery = useMonthlyFinancialSummary(canAccess ? harasId : null);
  const listQuery = useTransactionsQuery({
    haras_id: harasId ?? "",
    tipo: filter,
  });
  const createMutation = useCreateTransactionMutation(harasId);
  const deleteMutation = useDeleteTransactionMutation(harasId);

  const transactions = listQuery.data ?? [];

  const askDelete = (id: string) => {
    Alert.alert("Excluir transação", "Remover permanentemente esta movimentação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(id, {
            onError: (err) => {
              Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao remover.");
            },
          });
        },
      },
    ]);
  };

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Financeiro"
            description="Disponível apenas para o criador do haras."
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Financeiro</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Receitas e despesas do mês e histórico.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { borderColor: theme.colors.success + "55", backgroundColor: theme.colors.success + "14" },
          ]}
        >
          <View style={styles.summaryHeader}>
            <TrendingUp size={16} color={theme.colors.success} />
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Receita
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {currencyBR(summaryQuery.data?.receita ?? 0)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { borderColor: theme.colors.warning + "55", backgroundColor: theme.colors.warning + "14" },
          ]}
        >
          <View style={styles.summaryHeader}>
            <TrendingDown size={16} color={theme.colors.warning} />
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Despesa
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {currencyBR(summaryQuery.data?.despesa ?? 0)}
          </Text>
        </View>
      </View>

      <Card>
        <View style={styles.balanceHeader}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>
            Saldo do mês
          </Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  (summaryQuery.data?.saldo ?? 0) >= 0
                    ? theme.colors.success
                    : theme.colors.danger,
              },
            ]}
          >
            {currencyBR(summaryQuery.data?.saldo ?? 0)}
          </Text>
        </View>
      </Card>

      <AppButton label="Nova transação" icon={Plus} onPress={() => setCreateOpen(true)} />

      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
              style={({ pressed }) => [
                styles.filterPill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.inputBackground,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.primaryText : theme.colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {listQuery.isLoading ? <LoadingState message="Carregando transações..." /> : null}
      {listQuery.error ? (
        <Card>
          <Text style={{ color: theme.colors.danger, fontSize: 13 }}>
            {listQuery.error instanceof Error ? listQuery.error.message : "Erro"}
          </Text>
        </Card>
      ) : null}

      {!listQuery.isLoading && transactions.length === 0 ? (
        <Card>
          <EmptyState
            title="Sem movimentações"
            description="Nenhuma transação encontrada com esse filtro."
          />
        </Card>
      ) : null}

      {transactions.map((tx) => {
        const isReceita = tx.tipo === "Receita";
        return (
          <Card key={tx.id}>
            <View style={styles.txRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.txTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {tx.descricao || tx.categoria || tx.tipo}
                </Text>
                <Text style={[styles.txMeta, { color: theme.colors.textMuted }]}>
                  {tx.categoria ?? tx.tipo} • {formatDate(tx.data_transacao)}
                </Text>
                {tx.animal_name ? (
                  <Text style={[styles.txMeta, { color: theme.colors.textMuted }]}>
                    Animal: {tx.animal_name}
                  </Text>
                ) : null}
                {tx.forma_pagamento ? (
                  <Text style={[styles.txMeta, { color: theme.colors.textMuted }]}>
                    Pagamento: {tx.forma_pagamento}
                  </Text>
                ) : null}
              </View>
              <View style={styles.txRight}>
                <Text
                  style={[
                    styles.txAmount,
                    { color: isReceita ? theme.colors.success : theme.colors.warning },
                  ]}
                >
                  {isReceita ? "+" : "-"}
                  {currencyBR(tx.valor)}
                </Text>
                <Pressable
                  onPress={() => askDelete(tx.id)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    { borderColor: theme.colors.danger, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Trash2 size={14} color={theme.colors.danger} />
                </Pressable>
              </View>
            </View>
          </Card>
        );
      })}

      {createOpen && harasId ? (
        <TransactionFormModal
          visible={createOpen}
          harasId={harasId}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (input) => {
            try {
              await createMutation.mutateAsync(input);
              setCreateOpen(false);
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Falha ao criar transação."
              );
            }
          }}
          isSaving={createMutation.isPending}
        />
      ) : null}
    </AppScreen>
  );
}

interface TransactionFormModalProps {
  visible: boolean;
  harasId: string;
  onClose: () => void;
  onSubmit: (input: {
    haras_id: string;
    tipo: TransactionType;
    categoria: string;
    descricao: string | null;
    valor: number;
    data_transacao: string;
    forma_pagamento: string | null;
    observacoes: string | null;
  }) => void | Promise<void>;
  isSaving: boolean;
}

function TransactionFormModal({
  visible,
  harasId,
  onClose,
  onSubmit,
  isSaving,
}: TransactionFormModalProps) {
  const { theme } = useAppTheme();
  const [tipo, setTipo] = useState<TransactionType>("Despesa");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => (tipo === "Receita" ? CATEGORY_SUGGESTIONS_RECEITA : CATEGORY_SUGGESTIONS_DESPESA),
    [tipo]
  );

  const submit = async () => {
    setError(null);
    const valorNumber = parseValue(valor);
    if (!valorNumber || valorNumber <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!categoria.trim()) {
      setError("Informe uma categoria.");
      return;
    }
    if (!data) {
      setError("Informe a data.");
      return;
    }

    await onSubmit({
      haras_id: harasId,
      tipo,
      categoria: categoria.trim(),
      valor: valorNumber,
      data_transacao: data,
      descricao: descricao.trim() || null,
      forma_pagamento: formaPagamento.trim() || null,
      observacoes: observacoes.trim() || null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={modalStyles.root}
      >
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View
          style={[
            modalStyles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.colors.text }]}>
              Nova transação
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={modalStyles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[modalStyles.fieldLabel, { color: theme.colors.text }]}>Tipo</Text>
            <View style={modalStyles.pillRow}>
              {(["Receita", "Despesa"] as const).map((option) => {
                const active = tipo === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setTipo(option)}
                    style={({ pressed }) => [
                      modalStyles.pill,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.inputBackground,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.primaryText : theme.colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="Valor (R$)"
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <DateField label="Data" value={data} onChange={setData} />

            <TextField
              label="Categoria"
              value={categoria}
              onChangeText={setCategoria}
              placeholder="Ex: Alimentação"
            />
            <View style={modalStyles.suggestionsRow}>
              {suggestions.map((item) => {
                const active = categoria === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategoria(item)}
                    style={({ pressed }) => [
                      modalStyles.suggestion,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active
                          ? theme.colors.primary + "15"
                          : theme.colors.inputBackground,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.primary : theme.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="Descrição (opcional)"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Compra de ração"
            />
            <TextField
              label="Forma de pagamento"
              value={formaPagamento}
              onChangeText={setFormaPagamento}
              placeholder="Ex: Pix / Cartão / Dinheiro"
            />
            <TextField
              label="Observações"
              value={observacoes}
              onChangeText={setObservacoes}
              multiline
              numberOfLines={3}
            />

            {error ? (
              <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                {error}
              </Text>
            ) : null}

            <View style={modalStyles.actions}>
              <View style={{ flex: 1 }}>
                <AppButton label="Cancelar" variant="ghost" onPress={onClose} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={isSaving ? "Salvando..." : "Salvar"}
                  onPress={submit}
                  loading={isSaving}
                  disabled={isSaving}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  headerBlock: { gap: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  summaryValue: { fontSize: 18, fontWeight: "700" },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  balanceValue: { fontSize: 20, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  txRow: { flexDirection: "row", gap: 10 },
  txTitle: { fontSize: 14, fontWeight: "700" },
  txMeta: { fontSize: 12, lineHeight: 16 },
  txRight: { alignItems: "flex-end", gap: 6 },
  txAmount: { fontSize: 15, fontWeight: "700" },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  title: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 10 },
  fieldLabel: { fontSize: 14, fontWeight: "500" },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  suggestion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
});
