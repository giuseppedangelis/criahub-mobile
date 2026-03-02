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
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react-native";
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
import type { Animal, AnimalCategory, AnimalEnvironment, AnimalSex, AnimalStatus } from "@/src/types/domain";
import { formatCategoryLabel } from "@/src/utils/format";

type SexFilter = AnimalSex | "all";
type StatusFilter = AnimalStatus | "all";
type CategoryFilter = AnimalCategory | "all";
type EnvironmentFilter = AnimalEnvironment;

const PAGE_LIMIT = 20;

const SEX_OPTIONS: Array<{ label: string; value: SexFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Machos", value: "Macho" },
  { label: "Fêmeas", value: "Fêmea" },
];

const STATUS_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "ativo" },
  { label: "Provisórios", value: "provisorio" },
  { label: "Em serviço", value: "em_servico" },
  { label: "Vendidos", value: "vendido" },
  { label: "Falecidos", value: "morto" },
  { label: "Transferidos", value: "emprestado" },
];

const CATEGORY_OPTIONS: Array<{ label: string; value: CategoryFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Potro", value: "potro" },
  { label: "Potra", value: "potra" },
  { label: "Garanhão", value: "garanhao" },
  { label: "Égua", value: "egua" },
  { label: "Castrado", value: "castrado" },
];

const ENVIRONMENT_OPTIONS: Array<{ label: string; value: EnvironmentFilter }> = [
  { label: "Oficial", value: "oficial" },
  { label: "Avulsos", value: "avulsos" },
  { label: "Vinculação", value: "vinculacao" },
  { label: "Condomínio", value: "condominio" },
];

function isCondominioAnimal(owner: string | null) {
  if (!owner) return false;
  const normalized = owner
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("CONDOMINIO");
}

function AnimalItem({ item, onPress }: { item: Animal; onPress: (animalId: string) => void }) {
  const { theme } = useAppTheme();
  const isCondominio = isCondominioAnimal(item.proprietario);
  const returnDueDate = (() => {
    if (!item.observations) return null;
    const match = item.observations.match(/Retorno previsto da hospedagem:\s*(\d{4}-\d{2}-\d{2})/i);
    if (!match?.[1]) return null;
    const [year, month, day] = match[1].split("-");
    return `${day}/${month}/${year}`;
  })();

  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleWrapper}>
            <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}> 
              Registro {item.registry_number || "não informado"}
            </Text>
            {item.proprietario ? (
              <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}>Proprietário: {item.proprietario}</Text>
            ) : null}
            {item.criador ? (
              <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}>Criador: {item.criador}</Text>
            ) : null}
            {returnDueDate ? (
              <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}>Retorno hospedagem: {returnDueDate}</Text>
            ) : null}
          </View>
          <View style={styles.itemStatusWrap}>
            {isCondominio ? (
              <View
                style={[
                  styles.condominioTag,
                  {
                    borderColor: "#B45309",
                    backgroundColor: "#F59E0B22",
                  },
                ]}
              >
                <Text style={styles.condominioTagLabel}>Condomínio</Text>
              </View>
            ) : null}
            <StatusBadge status={item.status} />
          </View>
        </View>

        <View style={styles.itemMetaRow}>
          <View
            style={[
              styles.itemMetaPill,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.inputBackground,
              },
            ]}
          >
            <Text style={[styles.itemMetaLabel, { color: theme.colors.textMuted }]}>Sexo</Text>
            <Text style={[styles.itemMetaValue, { color: theme.colors.text }]}>{item.sex}</Text>
          </View>
          <View
            style={[
              styles.itemMetaPill,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.inputBackground,
              },
            ]}
          >
            <Text style={[styles.itemMetaLabel, { color: theme.colors.textMuted }]}>Categoria</Text>
            <Text style={[styles.itemMetaValue, { color: theme.colors.text }]}>
              {formatCategoryLabel(item.category)}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function SummaryCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const { theme } = useAppTheme();
  return (
    <Card
      style={[
        styles.summaryCard,
        highlight && {
          borderColor: theme.colors.primary,
          backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
        },
      ]}
    >
      <Text style={[styles.summaryLabel, { color: highlight ? theme.colors.text : theme.colors.textMuted }]}>
        {label}
      </Text>
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ativo");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>("oficial");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchText, sexFilter, statusFilter, categoryFilter, environmentFilter]);

  const filters = useMemo(
    () => ({
      haras_id: harasId || undefined,
      search: debouncedSearchText || undefined,
      sex: sexFilter === "all" ? undefined : sexFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      environment: environmentFilter,
    }),
    [categoryFilter, debouncedSearchText, environmentFilter, harasId, sexFilter, statusFilter]
  );

  const { data, isLoading, isFetching, error, refetch } = useAnimalsQuery(
    filters,
    { page, limit: PAGE_LIMIT },
    Boolean(harasId)
  );

  const items = data?.data ?? [];
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aHasMedia = (a.images?.length || 0) > 0 || !!a.main_image_url;
      const bHasMedia = (b.images?.length || 0) > 0 || !!b.main_image_url;
      if (aHasMedia !== bHasMedia) return aHasMedia ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [items]);
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const maleCount = sortedItems.filter((item) => item.sex === "Macho").length;
  const femaleCount = sortedItems.filter((item) => item.sex === "Fêmea").length;
  const activeCount = sortedItems.filter((item) => item.status === "ativo").length;
  const condominioCount = sortedItems.filter((item) => isCondominioAnimal(item.proprietario)).length;
  const hasActiveFilters = sexFilter !== "all" || statusFilter !== "ativo" || categoryFilter !== "all" || environmentFilter !== "oficial";

  const selectedFiltersText = [
    sexFilter !== "all" ? `Sexo: ${sexFilter}` : null,
    statusFilter !== "ativo"
      ? `Status: ${STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? statusFilter}`
      : null,
    categoryFilter !== "all"
      ? `Categoria: ${CATEGORY_OPTIONS.find((option) => option.value === categoryFilter)?.label ?? categoryFilter}`
      : null,
    environmentFilter !== "oficial"
      ? `Ambiente: ${ENVIRONMENT_OPTIONS.find((option) => option.value === environmentFilter)?.label ?? environmentFilter}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

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

  const clearFilters = () => {
    setSexFilter("all");
    setStatusFilter("ativo");
    setCategoryFilter("all");
    setEnvironmentFilter("oficial");
  };

  const ListHeader = (
    <View style={styles.headerContent}>
      <BrandLogo compact />
      <Card style={styles.heroCard}>
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Plantel</Text>
        <Text style={[styles.pageSubtitle, { color: theme.colors.textMuted }]}>Consulta completa dos animais do seu haras.</Text>

        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nome ou registro"
        />

        <View style={styles.filterActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.filterToggle,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.inputBackground,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => setShowFilters((current) => !current)}
          >
            <Text style={[styles.filterToggleLabel, { color: theme.colors.text }]}>Filtros</Text>
            {hasActiveFilters ? (
              <View style={[styles.filterCounter, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.filterCounterLabel, { color: theme.colors.primaryText }]}>Ativo</Text>
              </View>
            ) : null}
            {showFilters ? (
              <ChevronUp size={16} color={theme.colors.textMuted} />
            ) : (
              <ChevronDown size={16} color={theme.colors.textMuted} />
            )}
          </Pressable>

          {hasActiveFilters ? (
            <Pressable
              style={({ pressed }) => [
                styles.clearFiltersButton,
                { borderColor: theme.colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearFiltersLabel, { color: theme.colors.textMuted }]}>Limpar</Text>
            </Pressable>
          ) : null}
        </View>

        {hasActiveFilters && !showFilters ? (
          <Text style={[styles.selectedFiltersText, { color: theme.colors.textMuted }]}>{selectedFiltersText}</Text>
        ) : null}

        {showFilters ? (
          <View style={styles.filtersWrapper}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.colors.textMuted }]}>Ambiente</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {ENVIRONMENT_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={environmentFilter === option.value}
                    onPress={() => setEnvironmentFilter(option.value)}
                  />
                ))}
              </ScrollView>
            </View>

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
          </View>
        ) : null}
      </Card>

      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Visão rápida</Text>
        <Text style={[styles.summaryHint, { color: theme.colors.textMuted }]}>Página {page} de {totalPages}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
        <SummaryCard label="Total" value={String(total)} highlight />
        <SummaryCard label="Machos" value={String(maleCount)} />
        <SummaryCard label="Fêmeas" value={String(femaleCount)} />
        <SummaryCard label="Ativos" value={String(activeCount)} />
        <SummaryCard label="Condomínio" value={String(condominioCount)} />
      </ScrollView>

      <Text style={[styles.resultsText, { color: theme.colors.textMuted }]}>{total} animal(is) encontrado(s)</Text>
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
        data={sortedItems}
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
    gap: 12,
    marginBottom: 16,
  },
  heroCard: {
    gap: 12,
  },
  summaryCard: {
    width: 132,
    minHeight: 84,
    justifyContent: "center",
    gap: 6,
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
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  summaryScrollContent: {
    gap: 10,
    paddingRight: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterToggle: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterToggleLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterCounter: {
    marginLeft: "auto",
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCounterLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  clearFiltersButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  clearFiltersLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectedFiltersText: {
    fontSize: 12,
    lineHeight: 18,
  },
  filtersWrapper: {
    gap: 12,
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
    paddingRight: 4,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 2,
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
  itemStatusWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  condominioTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  condominioTagLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    gap: 8,
  },
  itemMetaPill: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  itemMetaLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  itemMetaValue: {
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
