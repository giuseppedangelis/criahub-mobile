import { Search, Stethoscope } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalsQuery } from "@/src/hooks/useAnimals";
import { isVeterinaryRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";

export function VetPlantelScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const query = useAnimalsQuery(
    { haras_id: harasId ?? undefined, status: "ativo", search },
    { page: 1, limit: 120 },
    Boolean(harasId)
  );

  if (!isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Plantel Veterinário" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  const animals = query.data?.data ?? [];

  const totals = useMemo(() => {
    const females = animals.filter((item) => item.sex === "Fêmea").length;
    const males = animals.filter((item) => item.sex === "Macho").length;
    return { females, males, total: animals.length };
  }, [animals]);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Plantel Clínico</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Selecione o animal para abrir o prontuário veterinário.</Text>
      </View>

      <Card>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>Total: {totals.total}</Text>
          <Text style={[styles.summaryText, { color: theme.colors.textMuted }]}>Fêmeas: {totals.females}</Text>
          <Text style={[styles.summaryText, { color: theme.colors.textMuted }]}>Machos: {totals.males}</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.searchHeader}>
          <Search size={16} color={theme.colors.textMuted} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Buscar Animal</Text>
        </View>
        <TextField value={search} onChangeText={setSearch} placeholder="Nome ou registro" />
      </Card>

      <Card>
        <View style={styles.searchHeader}>
          <Stethoscope size={16} color={theme.colors.info} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Prontuários</Text>
        </View>

        {query.isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando animais...</Text>
        ) : animals.length ? (
          animals.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({ pathname: "/(app)/vet-prontuario/[id]", params: { id: item.id } })
              }
              style={({ pressed }) => [
                styles.itemRow,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                  {item.sex} • {item.category} • Registro {item.registry_number || "-"}
                </Text>
              </View>
              <Text style={[styles.openLabel, { color: theme.colors.primary }]}>Abrir</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhum animal encontrado.</Text>
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  summaryRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  summaryText: { fontSize: 13, fontWeight: "600" },
  searchHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  itemRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: { fontSize: 14, fontWeight: "600" },
  itemMeta: { fontSize: 12 },
  openLabel: { fontSize: 12, fontWeight: "700" },
  line: { fontSize: 13 },
});
