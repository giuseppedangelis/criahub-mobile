import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react-native";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppButton } from "@/src/components/ui/AppButton";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/services/base";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatRole } from "@/src/utils/format";

function ProfileLine({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.profileLine}>
      <Text style={[styles.profileLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

export function AccountScreen() {
  const { profile, role, signOut } = useAuth();
  const { mode, theme, toggleTheme } = useAppTheme();
  const [harasName, setHarasName] = useState<string | null>(null);

  useEffect(() => {
    const harasId = profile?.haras_id ?? null;
    let mounted = true;

    if (!harasId) {
      setHarasName(null);
      return () => {
        mounted = false;
      };
    }

    setHarasName(null);

    void (async () => {
      try {
        const { data } = await supabase.from("haras").select("nome").eq("id", harasId).maybeSingle();
        if (!mounted) return;
        setHarasName(data?.nome ?? null);
      } catch {
        if (!mounted) return;
        setHarasName(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.haras_id]);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={[styles.title, { color: theme.colors.text }]}>Conta</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
          Informações do usuário e preferências do app.
        </Text>
      </View>

      <Card>
        <ProfileLine label="Nome" value={profile?.full_name || "Não informado"} />
        <ProfileLine label="Email" value={profile?.email || "Não informado"} />
        <ProfileLine label="Perfil" value={formatRole(role)} />
        <ProfileLine label="Haras" value={harasName || "Não informado"} />
      </Card>

      <Card>
        <View style={styles.themeRow}>
          <View style={styles.themeInfo}>
            {mode === "dark" ? (
              <Moon size={18} color={theme.colors.text} />
            ) : (
              <Sun size={18} color={theme.colors.text} />
            )}
            <View>
              <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
                Tema {mode === "dark" ? "escuro" : "claro"}
              </Text>
              <Text style={[styles.themeDescription, { color: theme.colors.textMuted }]}>
                Alternar entre visual escuro e claro.
              </Text>
            </View>
          </View>

          <Switch
            value={mode === "dark"}
            onValueChange={() => {
              void toggleTheme();
            }}
            thumbColor="#ffffff"
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
      </Card>

      <Card>
        <AppButton
          label="Sair da conta"
          variant="danger"
          onPress={() => {
            void signOut();
          }}
        />
      </Card>

      <Pressable style={styles.footerInfo}>
        <Text style={[styles.footerText, { color: theme.colors.textMuted }]}> 
          CRIAHUB Mobile
        </Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileLine: {
    gap: 2,
  },
  profileLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  profileValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  themeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  themeDescription: {
    fontSize: 13,
  },
  footerInfo: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 12,
  },
});
