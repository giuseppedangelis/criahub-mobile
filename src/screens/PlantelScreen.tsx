import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FilterChip } from "@/src/components/ui/FilterChip";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { SearchInput } from "@/src/components/ui/SearchInput";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { Animal, AnimalCategory, AnimalSex, AnimalStatus } from "@/src/types/domain";
import { formatCategoryLabel } from "@/src/utils/format";

type SexFilter = AnimalSex | "all";
type StatusFilter = AnimalStatus | "all";
type CategoryFilter = AnimalCategory | "all";

const PAGE_LIMIT = 20;

const SEX_OPTIONS: Array<{ label: string; value: SexFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Machos", value: "Macho" },
  { label: "Fêmeas", value: "Fêmea" },
];

const STATUS_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "ativo" },
  { label: "Vendidos", value: "vendido" },
  { label: "Falecidos", value: "morto" },
  { label: "Transferidos", value: "emprestado" },
];

const CATEGORY_OPTIONS: Array<{ label: string; value: CategoryFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Potro", value: "potro" },
  { label: "Potranca", value: "potra" },
  { label: "Garanhão", value: "garanhao" },
  { label: "Égua", value: "egua" },
  { label: "Castrado", value: "castrado" },
];

function AnimalItem({ item, onPress }: { item: Animal; onPress: (animalId: string) => void }) {
  const { theme } = useAppTheme();

  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleWrapper}>
            <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}>
              Registro: {item.registry_number || "Não informado"}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.itemMetaRow}>
          <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
            Sexo: {item.sex}
          </Text>
          <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
            Categoria: {formatCategoryLabel(item.category)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{value}</Text>
    </Card>
  );
}

export function PlantelScreen() {
  const router = useRouter();
  const { harasId } = useAuth();
  const { theme } = useAppTheme();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchText, sexFilter, statusFilter, categoryFilter]);

  const filters = useMemo(
    () => ({
      haras_id: harasId || undefined,
      search: debouncedSearchText || undefined,
      sex: sexFilter === "all" ? undefined : sexFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
    }),
    [categoryFilter, debouncedSearchText, harasId, sexFilter, statusFilter]
  );

  const { data, isLoading, isFetching, error, refetch } = useAnimalsQuery(
    filters,
    { page, limit: PAGE_LIMIT },
    Boolean(harasId)
  );

  const items = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const maleCount = items.filter((item) => item.sex === "Macho").length;
  const femaleCount = items.filter((item) => item.sex === "Fêmea").length;
  const activeCount = items.filter((item) => item.status === "ativo").length;

  const onPressAnimal = (id: string) => {
    router.push({
      pathname: "/(app)/animal/[id]",
      params: { id },
    });
  };

  const onPreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const onNextPage = () => {
    setPage((current) => Math.min(totalPages, current + 1));
  };

  const ListHeader = (
    <View style={styles.headerContent}>
      <BrandLogo compact />
      <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Plantel</Text>
      <Text style={[styles.pageSubtitle, { color: theme.colors.textMuted }]}> 
        Consulta completa dos animais do seu haras.
      </Text>

      <View style={styles.summaryGrid}>
        <SummaryCard label="Total" value={String(total)} />
        <SummaryCard label="Machos" value={String(maleCount)} />
        <SummaryCard label="Fêmeas" value={String(femaleCount)} />
        <SummaryCard label="Ativos" value={String(activeCount)} />
      </View>

      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Buscar por nome ou registro"
      />

      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, { color: theme.colors.textMuted }]}>Sexo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SEX_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={sexFilter === option.value}
              onPress={() => setSexFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, { color: theme.colors.textMuted }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={statusFilter === option.value}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, { color: theme.colors.textMuted }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={categoryFilter === option.value}
              onPress={() => setCategoryFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <Text style={[styles.resultsText, { color: theme.colors.textMuted }]}>
        {total} animal(is) encontrado(s)
      </Text>
    </View>
  );

  if (!harasId) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Haras não identificado"
            description="Não foi possível identificar o haras do usuário para carregar o plantel."
          />
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingState fullscreen message="Carregando plantel..." />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Falha ao carregar plantel"
            description={error instanceof Error ? error.message : "Tente novamente."}
          />
          <Pressable
            onPress={() => {
              void refetch();
            }}
            style={[
              styles.retryButton,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.text }]}>Tentar novamente</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => <AnimalItem item={item} onPress={onPressAnimal} />}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum animal encontrado"
            description="Ajuste a busca ou os filtros para encontrar animais no plantel."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <View
        style={[
          styles.pagination,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={onPreviousPage}
          disabled={page <= 1}
          style={({ pressed }) => [
            styles.paginationButton,
            {
              opacity: page <= 1 ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <ChevronLeft size={18} color={theme.colors.text} />
          <Text style={[styles.paginationLabel, { color: theme.colors.text }]}>Anterior</Text>
        </Pressable>

        <Text style={[styles.paginationCurrent, { color: theme.colors.textMuted }]}>
          Página {page} de {totalPages}
        </Text>

        <Pressable
          onPress={onNextPage}
          disabled={page >= totalPages}
          style={({ pressed }) => [
            styles.paginationButton,
            {
              opacity: page >= totalPages ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.paginationLabel, { color: theme.colors.text }]}>Próxima</Text>
          <ChevronRight size={18} color={theme.colors.text} />
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  headerContent: {
    gap: 14,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    minHeight: 76,
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  chips: {
    gap: 8,
    paddingRight: 12,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemCard: {
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitleWrapper: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  itemMeta: {
    fontSize: 13,
    fontWeight: "500",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  pagination: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 6,
  },
  paginationLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  paginationCurrent: {
    fontSize: 12,
    fontWeight: "600",
  },
});
