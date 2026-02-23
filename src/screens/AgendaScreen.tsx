import { CalendarDays, PlusCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAgendaQuery } from "@/src/hooks/useAgenda";
import { isCreatorRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatDateBR } from "@/src/utils/format";

function formatTime(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AgendaScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const { data, isLoading, error } = useAgendaQuery(harasId);

  const isCreator = isCreatorRole(role);
  const canAccess = isCreator;

  if (!canAccess) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Agenda indisponível"
            description="Disponível nesta fase apenas para o perfil Criador."
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Agenda</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
          Calendário do criador com foco no plantel e reprodução.
        </Text>
      </View>

      <Card>
        <View style={styles.row}>
          <CalendarDays size={18} color={theme.colors.text} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Próximos eventos</Text>
        </View>

        {isLoading ? (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Carregando agenda...</Text>
        ) : error ? (
          <Text style={[styles.line, { color: theme.colors.danger }]}> 
            {error instanceof Error ? error.message : "Falha ao carregar agenda."}
          </Text>
        ) : data && data.length > 0 ? (
          data.slice(0, 14).map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderColor: theme.colors.border }]}> 
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.itemType, { color: theme.colors.textMuted }]}>
                  {item.tipo} {item.animal_name ? `• ${item.animal_name}` : ""}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                  {formatDateBR(item.data_inicio)} às {formatTime(item.data_inicio)}
                </Text>
              </View>
              <Text style={[styles.itemTime, { color: theme.colors.text }]}>{item.status || "-"}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Nenhum evento encontrado.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <PlusCircle size={18} color={theme.colors.info} />
          <Text style={[styles.hintTitle, { color: theme.colors.text }]}>Planejamento mobile</Text>
        </View>
        <Text style={[styles.hintText, { color: theme.colors.textMuted }]}> 
          Agenda conectada aos eventos do haras. Os eventos ficam centralizados apenas neste módulo.
        </Text>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemType: {
    fontSize: 12,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemTime: {
    fontSize: 12,
    fontWeight: "700",
  },
  line: {
    fontSize: 13,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
