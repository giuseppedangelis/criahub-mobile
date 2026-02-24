import { useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Activity, Pill, ShieldAlert, Syringe, Weight } from "lucide-react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAnimalDetailsQuery } from "@/src/hooks/useAnimalDetails";
import { useAnimalQuery } from "@/src/hooks/useAnimals";
import { isVeterinaryRole } from "@/src/lib/roles";
import { handleSupabaseError, supabase } from "@/src/services/base";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatCategoryLabel, formatDateBR } from "@/src/utils/format";

type ChartTab = "repro" | "sanitary" | "treatments" | "biometry";

const TAB_OPTIONS: Array<{ id: ChartTab; label: string }> = [
  { id: "repro", label: "Reprodução" },
  { id: "sanitary", label: "Sanitário" },
  { id: "treatments", label: "Tratamentos" },
  { id: "biometry", label: "Biometria" },
];

function normalizeReproType(type: string) {
  const map: Record<string, string> = {
    cobertura: "Cobertura",
    inseminacao: "Inseminação",
    coleta_ovulos: "Coleta de óvulos",
    transferencia_embriao: "Transferência de embrião",
    diagnostico_gestacao: "Diagnóstico de gestação",
    parto: "Parto",
    ovulacao: "Controle folicular",
  };
  return map[type] || type;
}

export function VetAnimalChartScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const animalId = params.id || "";

  const [tab, setTab] = useState<ChartTab>("repro");
  const [menuOpen, setMenuOpen] = useState(false);

  const animalQuery = useAnimalQuery(animalId, Boolean(animalId));
  const detailsQuery = useAnimalDetailsQuery(animalQuery.data?.id, animalQuery.data?.haras_id);
  const alertSource = (animalQuery.data?.observations || "").toLowerCase();
  const alerts =
    alertSource.includes("alerg") || alertSource.includes("penicilina")
      ? [animalQuery.data?.observations || "Atenção clínica registrada"]
      : [];

  const clinicalQuery = useQuery({
    queryKey: ["vet-chart", "clinical", animalId, harasId],
    enabled: Boolean(animalId && harasId),
    queryFn: async () => {
      const [reproRes, gestRes, bioRes] = await Promise.all([
        supabase
          .from("reproductive_events")
          .select("id, event_type, event_date, status, observations")
          .eq("haras_id", harasId as string)
          .or(`animal_id.eq.${animalId},mare_id.eq.${animalId},stallion_id.eq.${animalId}`)
          .order("event_date", { ascending: false })
          .limit(40),
        supabase
          .from("gestations")
          .select("id, status, data_diagnostico, data_prevista_parto, observacoes, egua_id")
          .eq("haras_id", harasId as string)
          .eq("egua_id", animalId)
          .order("data_diagnostico", { ascending: false })
          .limit(20),
        supabase
          .from("animals")
          .select("weight, height, status_manejo, andamento, observacoes")
          .eq("haras_id", harasId as string)
          .eq("id", animalId)
          .single(),
      ]);

      if (reproRes.error) handleSupabaseError(reproRes.error);
      if (gestRes.error) handleSupabaseError(gestRes.error);
      if (bioRes.error) handleSupabaseError(bioRes.error);

      return {
        reproductiveEvents: reproRes.data ?? [],
        gestations: gestRes.data ?? [],
        biometry: bioRes.data,
      };
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: animalQuery.data?.name || "Prontuário",
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.text,
    });
  }, [animalQuery.data?.name, navigation, theme.colors.surface, theme.colors.text]);

  if (!isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Prontuário Vet" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  if (!animalId || animalQuery.isLoading) {
    return (
      <AppScreen>
        <LoadingState fullscreen message="Carregando prontuário..." />
      </AppScreen>
    );
  }

  if (animalQuery.error || !animalQuery.data) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Animal não encontrado" description="Não foi possível carregar este prontuário." />
        </View>
      </AppScreen>
    );
  }

  const animal = animalQuery.data;
  const health = detailsQuery.data?.health ?? [];
  const sanitary = health.filter((item) => item.tipo.toLowerCase().includes("vacina") || item.tipo.toLowerCase().includes("verm"));
  const treatments = health.filter((item) => !item.tipo.toLowerCase().includes("vacina"));
  const openVetAction = (action: "exam" | "insemination" | "batch") => {
    setMenuOpen(false);
    router.push({ pathname: "/(app)/(tabs)/veterinaria", params: { action, animalId } });
  };

  return (
    <AppScreen scroll>
      <Card>
        <Text style={[styles.animalName, { color: theme.colors.text }]}>{animal.name}</Text>
        <Text style={[styles.animalMeta, { color: theme.colors.textMuted }]}> 
          {animal.sex} • {formatCategoryLabel(animal.category)} • Registro {animal.registry_number || "-"}
        </Text>
        {alerts.length ? (
          <View style={styles.alertsBlock}>
            {alerts.map((alert, index) => (
              <View key={`${alert}-${index}`} style={[styles.alertPill, { borderColor: theme.colors.warning }]}> 
                <ShieldAlert size={14} color={theme.colors.warning} />
                <Text style={[styles.alertText, { color: theme.colors.warning }]}>{alert}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.noAlerts, { color: theme.colors.textMuted }]}>Sem alertas clínicos cadastrados.</Text>
        )}
      </Card>

      <View style={styles.tabRow}>
        {TAB_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setTab(option.id)}
            style={({ pressed }) => [
              styles.tabChip,
              {
                borderColor: tab === option.id ? theme.colors.primary : theme.colors.border,
                backgroundColor: tab === option.id ? theme.colors.surfaceAlt : "transparent",
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.tabLabel, { color: theme.colors.text }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "repro" ? (
        <Card>
          {(clinicalQuery.data?.reproductiveEvents ?? []).map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{normalizeReproType(item.event_type)}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.event_date)} • {item.status || "-"}</Text>
            </View>
          ))}
          {(clinicalQuery.data?.reproductiveEvents ?? []).length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem eventos reprodutivos.</Text>
          ) : null}
        </Card>
      ) : null}

      {tab === "sanitary" ? (
        <Card>
          {sanitary.map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{item.tipo}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.data)} • {item.veterinario || "-"}</Text>
            </View>
          ))}
          {sanitary.length === 0 ? <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem histórico sanitário.</Text> : null}
        </Card>
      ) : null}

      {tab === "treatments" ? (
        <Card>
          {treatments.map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{item.tipo}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{item.descricao || "Sem descrição"}</Text>
            </View>
          ))}
          {treatments.length === 0 ? <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem tratamentos registrados.</Text> : null}
        </Card>
      ) : null}

      {tab === "biometry" ? (
        <Card>
          <View style={styles.bioRow}><Weight size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Peso</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.weight ?? "Não informado"}</Text></View>
          <View style={styles.bioRow}><Activity size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Altura</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.height ?? "Não informado"}</Text></View>
          <View style={styles.bioRow}><Pill size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Escore/Andamento</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.andamento || clinicalQuery.data?.biometry?.status_manejo || "Não informado"}</Text></View>
        </Card>
      ) : null}

      <Card>
        <AppButton label="Novo Registro" onPress={() => setMenuOpen(true)} />
      </Card>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo Registro</Text>
            <AppButton label="Controle Folicular" variant="ghost" onPress={() => openVetAction("exam")} />
            <AppButton label="Inseminação" variant="ghost" onPress={() => openVetAction("insemination")} />
            <AppButton label="Vacina/Vermífugo" variant="ghost" onPress={() => openVetAction("batch")} />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  animalName: { fontSize: 24, fontWeight: "700" },
  animalMeta: { fontSize: 13 },
  alertsBlock: { marginTop: 10, gap: 8 },
  alertPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, minHeight: 36, alignItems: "center", flexDirection: "row", gap: 8 },
  alertText: { fontSize: 12, fontWeight: "600", flex: 1 },
  noAlerts: { marginTop: 8, fontSize: 12 },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabChip: { borderWidth: 1, borderRadius: 999, minHeight: 34, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  lineRow: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8, gap: 2 },
  lineTitle: { fontSize: 14, fontWeight: "600" },
  lineMeta: { fontSize: 12 },
  emptyLine: { fontSize: 13 },
  bioRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bioLabel: { fontSize: 13, width: 120 },
  bioValue: { fontSize: 13, fontWeight: "600", flex: 1 },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
});
