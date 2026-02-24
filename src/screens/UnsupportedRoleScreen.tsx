import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatRole } from "@/src/utils/format";

export function UnsupportedRoleScreen() {
  const { role, signOut } = useAuth();
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <View style={styles.centered}>
        <Card style={styles.card}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Perfil ainda não suportado no mobile
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
            O perfil <Text style={{ fontWeight: "700" }}>{formatRole(role)}</Text> ainda não possui
            fluxo mobile nesta fase. Perfis ativos no momento: Criador, Veterinaria e Campo.
          </Text>
          <AppButton
            label="Sair da conta"
            variant="danger"
            onPress={() => {
              void signOut();
            }}
          />
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
});
