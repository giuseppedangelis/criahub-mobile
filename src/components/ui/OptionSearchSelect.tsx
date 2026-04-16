import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { SearchInput } from "@/src/components/ui/SearchInput";
import { useAppTheme } from "@/src/theme/ThemeContext";

export interface SelectOption {
  id: string;
  label: string;
  description?: string | null;
}

interface OptionSearchSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  maxHeight?: number;
  allowClear?: boolean;
  disabled?: boolean;
}

export function OptionSearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  maxHeight = 180,
  allowClear = true,
  disabled = false,
}: OptionSearchSelectProps) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [options, query]);

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}

      {selected ? (
        <View
          style={[
            styles.selectedPill,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedLabel, { color: theme.colors.text }]}>
              {selected.label}
            </Text>
            {selected.description ? (
              <Text style={[styles.selectedMeta, { color: theme.colors.textMuted }]}>
                {selected.description}
              </Text>
            ) : null}
          </View>
          {allowClear && !disabled ? (
            <Pressable
              onPress={() => onChange("")}
              hitSlop={8}
              accessibilityLabel="Limpar seleção"
            >
              <X size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!disabled ? (
        <>
          <SearchInput value={query} onChangeText={setQuery} placeholder={placeholder} />
          <View
            style={[
              styles.listWrap,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                maxHeight,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {filtered.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  {emptyText}
                </Text>
              ) : (
                filtered.map((option) => {
                  const isActive = option.id === value;
                  return (
                    <Pressable
                      key={option.id || "__empty__"}
                      onPress={() => onChange(option.id)}
                      style={({ pressed }) => [
                        styles.optionRow,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: isActive
                            ? theme.colors.surfaceAlt
                            : "transparent",
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 14,
                          fontWeight: isActive ? "700" : "500",
                        }}
                      >
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text
                          style={{ color: theme.colors.textMuted, fontSize: 12 }}
                          numberOfLines={1}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  selectedMeta: {
    fontSize: 12,
  },
  listWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  optionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  emptyText: {
    padding: 12,
    fontSize: 13,
  },
});
