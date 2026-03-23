import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { SearchInput } from "@/src/components/ui/SearchInput";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import { isFieldStaffRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { Animal } from "@/src/types/domain";

function isCondominioAnimal(owner: string | null) {
  if (!owner) return false;
  const normalized = owner
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("CONDOMINIO");
}

function AnimalResultItem({ item, onPress }: { item: Animal; onPress: (id: string) => void }) {
  const { theme } = useAppTheme();
  const isCondominio = isCondominioAnimal(item.proprietario);

  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTextWrap}>
            <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}> 
              Registro {item.registry_number || "não informado"}
            </Text>
            {item.proprietario ? (
              <Text style={[styles.itemSubtitle, { color: theme.colors.textMuted }]}>Proprietário: {item.proprietario}</Text>
            ) : null}
          </View>
          <View style={styles.statusWrap}>
            {isCondominio ? (
              <View style={styles.condominioTag}>
                <Text style={styles.condominioTagLabel}>Condomínio</Text>
              </View>
            ) : null}
            <StatusBadge status={item.status} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function FieldAnimalSearchScreen() {
  const router = useRouter();
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const canAccess = isFieldStaffRole(role);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  const filters = useMemo(
    () => ({
      haras_id: harasId || undefined,
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch, harasId]
  );
  const shouldSearch = debouncedSearch.length >= 2;

  const { data, isLoading, isFetching, refetch, error } = useAnimalsQuery(
    filters,
    { page: 1, limit: 100 },
    canAccess && Boolean(harasId) && shouldSearch
  );

  const items = data?.data ?? [];

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Acesso restrito" description="Busca de animais disponível apenas para Peão/Funcionário." />
        </View>
      </AppScreen>
    );
  }

  if (!harasId) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Haras não identificado" description="Não foi possível identificar o haras deste usuário." />
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingState fullscreen message="Carregando animais..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Buscar Animal</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Encontre rápido para consulta em campo.</Text>
            <SearchInput value={searchText} onChangeText={setSearchText} placeholder="Nome ou registro do animal" />
            <Text style={[styles.resultText, { color: theme.colors.textMuted }]}>
              {shouldSearch ? `${items.length} resultado(s)` : "Digite ao menos 2 caracteres para buscar"}
            </Text>
            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>Falha ao carregar. Puxe para atualizar.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          <AnimalResultItem
            item={item}
            onPress={(id) =>
              router.push({
                pathname: "/(app)/animal/[id]",
                params: { id },
              })
            }
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          shouldSearch ? (
            <EmptyState title="Nenhum animal encontrado" description="Tente outro nome ou número de registro." />
          ) : (
            <EmptyState title="Buscar animal" description="Digite parte do nome ou número de registro para localizar no plantel." />
          )
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
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 10, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  resultText: { fontSize: 12, fontWeight: "500" },
  errorText: { fontSize: 12, fontWeight: "600" },
  itemCard: { gap: 8 },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  itemTextWrap: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 17, fontWeight: "700" },
  itemSubtitle: { fontSize: 12, lineHeight: 16 },
  statusWrap: { alignItems: "flex-end", gap: 6 },
  condominioTag: {
    borderWidth: 1,
    borderColor: "#B45309",
    backgroundColor: "#F59E0B22",
    borderRadius: 999,
    minHeight: 20,
    paddingHorizontal: 8,
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
});
