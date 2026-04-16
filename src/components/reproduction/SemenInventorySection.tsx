import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Droplets, Minus, Plus } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { TextField } from "@/src/components/ui/TextField";
import {
  useAddSemenMovementMutation,
  useSemenInventoryQuery,
} from "@/src/hooks/useReproductionExtras";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { StallionInventoryItem } from "@/src/services/reproduction-extras";

interface SemenInventorySectionProps {
  harasId: string;
  userId?: string | null;
}

type SemenType = "Fresco" | "Refrigerado" | "Congelado";

const SEMEN_TYPES: SemenType[] = ["Fresco", "Refrigerado", "Congelado"];

export function SemenInventorySection({ harasId, userId }: SemenInventorySectionProps) {
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useSemenInventoryQuery(harasId);
  const mutation = useAddSemenMovementMutation(harasId);

  const [activeStallionId, setActiveStallionId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
  const [quantity, setQuantity] = useState("");
  const [semenType, setSemenType] = useState<SemenType>("Congelado");

  const items = useMemo<StallionInventoryItem[]>(() => data ?? [], [data]);

  const openDrawer = (stallionId: string, type: "entrada" | "saida") => {
    setActiveStallionId(stallionId);
    setMovementType(type);
    setQuantity("");
    setSemenType("Congelado");
  };

  const submit = async () => {
    if (!activeStallionId) return;
    const units = Number.parseInt(quantity.trim(), 10);
    if (!Number.isFinite(units) || units <= 0) {
      Alert.alert("Quantidade inválida", "Informe um número inteiro maior que zero.");
      return;
    }
    try {
      await mutation.mutateAsync({
        haras_id: harasId,
        stallion_id: activeStallionId,
        movement_type: movementType,
        units_paletas: units,
        semen_type: semenType,
        created_by: userId ?? null,
      });
      setActiveStallionId(null);
      setQuantity("");
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao registrar.");
    }
  };

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Droplets size={18} color={theme.colors.info} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Estoque de sêmen por garanhão
        </Text>
      </View>

      {isLoading ? (
        <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>
          Carregando estoque...
        </Text>
      ) : null}
      {error ? (
        <Text style={[styles.emptyLine, { color: theme.colors.danger }]}>
          Não foi possível carregar o estoque.
        </Text>
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>
          Nenhum estoque registrado. Adicione uma entrada para um garanhão abaixo.
        </Text>
      ) : null}

      {items.map((item) => {
        const isActive = activeStallionId === item.stallion_id;
        return (
          <View
            key={item.stallion_id}
            style={[styles.stallionBlock, { borderColor: theme.colors.border }]}
          >
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stallionName, { color: theme.colors.text }]}>
                  {item.stallion_name}
                </Text>
                <Text style={[styles.stallionMeta, { color: theme.colors.textMuted }]}>
                  Entradas {item.total_entries} • Saídas {item.total_outputs}
                </Text>
              </View>
              <View
                style={[
                  styles.availablePill,
                  { backgroundColor: theme.colors.success + "20", borderColor: theme.colors.success },
                ]}
              >
                <Text style={[styles.availableText, { color: theme.colors.success }]}>
                  {item.available} paletas
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => openDrawer(item.stallion_id, "entrada")}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Plus size={14} color={theme.colors.primaryText} />
                <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "700" }}>
                  Entrada
                </Text>
              </Pressable>
              <Pressable
                onPress={() => openDrawer(item.stallion_id, "saida")}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Minus size={14} color={theme.colors.text} />
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "700" }}>
                  Saída
                </Text>
              </Pressable>
            </View>

            {isActive ? (
              <View
                style={[
                  styles.inlineForm,
                  { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.inlineTitle, { color: theme.colors.text }]}>
                  {movementType === "entrada" ? "Nova entrada" : "Nova saída"}
                </Text>
                <TextField
                  label="Quantidade (paletas)"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="Ex: 12"
                />
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Tipo</Text>
                <View style={styles.pillRow}>
                  {SEMEN_TYPES.map((option) => {
                    const active = semenType === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setSemenType(option)}
                        style={({ pressed }) => [
                          styles.pill,
                          {
                            backgroundColor: active
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: active ? theme.colors.primary : theme.colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? theme.colors.primaryText : theme.colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.inlineActions}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label="Cancelar"
                      variant="ghost"
                      onPress={() => setActiveStallionId(null)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label={mutation.isPending ? "Salvando..." : "Confirmar"}
                      onPress={submit}
                      loading={mutation.isPending}
                      disabled={mutation.isPending}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stallionBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stallionName: {
    fontSize: 15,
    fontWeight: "700",
  },
  stallionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  availablePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  availableText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inlineForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  inlineTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
  },
  emptyLine: {
    fontSize: 13,
    lineHeight: 18,
  },
});
