import { Link, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { useAppTheme } from "@/src/theme/ThemeContext";

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <AppScreen>
        <View style={styles.centered}>
          <Card style={styles.card}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Esta tela não existe.
            </Text>
            <Text style={[styles.description, { color: theme.colors.textMuted }]}>
              O caminho acessado não foi encontrado no CRIAHUB Mobile.
            </Text>

            <Link href="/" asChild>
              <Pressable
                style={[
                  styles.button,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Voltar para o início
                </Text>
              </Pressable>
            </Link>
          </Card>
        </View>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
