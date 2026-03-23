import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAnimalQuery, useAnimalsQuery } from "@/src/hooks/useAnimals";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { AnimalFilters } from "@/src/types/domain";
import { SearchInput } from "./SearchInput";

export interface AnimalSearchSelectOption {
  id: string;
  name: string;
}

interface AnimalSearchSelectProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelect: (animal: AnimalSearchSelectOption) => void;
  harasId?: string | null;
  enabled?: boolean;
  title?: string;
  selectedId?: string;
  isSelected?: (id: string) => boolean;
  filters?: Omit<AnimalFilters, "haras_id" | "search">;
  searchPlaceholder?: string;
  idleText?: string;
  loadingText?: string;
  emptyText?: string;
  selectedLabelPrefix?: string;
  onClearSelected?: () => void;
  resultLimit?: number;
  minSearchLength?: number;
  maxHeight?: number;
}

export function AnimalSearchSelect({
  searchValue,
  onSearchChange,
  onSelect,
  harasId,
  enabled = true,
  title,
  selectedId,
  isSelected,
  filters,
  searchPlaceholder = "Buscar animal",
  idleText = "Digite ao menos 2 caracteres para buscar no plantel.",
  loadingText = "Buscando animais...",
  emptyText = "Nenhum animal encontrado para essa busca.",
  selectedLabelPrefix = "Selecionado",
  onClearSelected,
  resultLimit = 40,
  minSearchLength = 2,
  maxHeight = 180,
}: AnimalSearchSelectProps) {
  const { theme } = useAppTheme();
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchValue]);

  const normalizedSearch = debouncedSearch.trim();
  const shouldSearch = normalizedSearch.length >= minSearchLength;
  const queryFilters = useMemo(
    () => ({
      ...filters,
      haras_id: harasId ?? undefined,
      search: shouldSearch ? normalizedSearch : undefined,
    }),
    [filters, harasId, normalizedSearch, shouldSearch],
  );

  const animalsQuery = useAnimalsQuery(
    queryFilters,
    { page: 1, limit: resultLimit },
    enabled && Boolean(harasId) && shouldSearch,
  );
  const selectedAnimalQuery = useAnimalQuery(
    selectedId ?? "",
    enabled && Boolean(selectedId),
  );

  const animals = animalsQuery.data?.data ?? [];
  const selectedAnimal = useMemo(() => {
    if (!selectedId) return null;
    return (
      animals.find((item) => item.id === selectedId) ??
      selectedAnimalQuery.data ??
      null
    );
  }, [animals, selectedAnimalQuery.data, selectedId]);

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      ) : null}

      <SearchInput
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={searchPlaceholder}
      />

      {selectedAnimal ? (
        <View
          style={[
            styles.selectedRow,
            {
              borderColor: theme.colors.success,
              backgroundColor: `${theme.colors.success}12`,
            },
          ]}
        >
          <Text
            style={[styles.selectedLabel, { color: theme.colors.success }]}
            numberOfLines={1}
          >
            {selectedLabelPrefix}: {selectedAnimal.name}
          </Text>
          {onClearSelected ? (
            <Pressable onPress={onClearSelected}>
              <Text style={[styles.clearLabel, { color: theme.colors.primary }]}>
                Remover
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.listWrap,
          { borderColor: theme.colors.border, maxHeight },
        ]}
      >
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {!shouldSearch ? (
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              {idleText}
            </Text>
          ) : animalsQuery.isLoading ? (
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              {loadingText}
            </Text>
          ) : animalsQuery.error ? (
            <Text style={[styles.helperText, { color: theme.colors.danger }]}>
              {animalsQuery.error instanceof Error
                ? animalsQuery.error.message
                : "Falha ao buscar animais."}
            </Text>
          ) : animals.length ? (
            animals.map((animal) => {
              const active =
                selectedId === animal.id || Boolean(isSelected?.(animal.id));

              return (
                <Pressable
                  key={animal.id}
                  onPress={() => onSelect({ id: animal.id, name: animal.name })}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      borderColor: active
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.surfaceAlt
                        : "transparent",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>{animal.name}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              {emptyText}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 13, fontWeight: "600" },
  selectedRow: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedLabel: { flex: 1, fontSize: 12, fontWeight: "600" },
  clearLabel: { fontSize: 12, fontWeight: "700" },
  listWrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
  },
  listContent: { gap: 6 },
  item: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  helperText: { fontSize: 12, lineHeight: 18 },
});
