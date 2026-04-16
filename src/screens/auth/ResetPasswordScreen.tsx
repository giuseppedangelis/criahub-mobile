import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { z } from "zod";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { AppButton } from "@/src/components/ui/AppButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { useAppTheme } from "@/src/theme/ThemeContext";

// AUTH-01 D-04: schema de nova senha.
const ResetSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });

type ResetInput = z.infer<typeof ResetSchema>;

export function ResetPasswordScreen() {
  const { session, signOut } = useAuth();
  const { theme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  // AUTH-01 D-12: sem sessão hidratada (link inválido/expirado ou acesso direto à rota),
  // mostra EmptyState orientando usuário a pedir novo link.
  // EmptyState aceita APENAS { title, description? } — o CTA é um AppButton ghost sibling.
  if (!session) {
    return (
      <AppScreen scroll>
        <View style={styles.backWrapper}>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.backButton}>
              <ArrowLeft size={18} color={theme.colors.text} />
              <Text style={[styles.backLabel, { color: theme.colors.text }]}>Voltar</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.wrapper}>
          <View style={styles.fallback}>
            <EmptyState
              title="Link inválido ou expirado"
              description="Solicite um novo link de recuperação para continuar."
            />
            <AppButton
              label="Solicitar novo link"
              variant="ghost"
              onPress={() => router.replace("/(auth)/forgot-password")}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsLoading(true);
      // AUTH-01 D-06: confirma a troca via Supabase.
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw new Error(error.message);

      // Sessão pós-reset deve terminar (LGPD: nova senha = nova sessão).
      // signOut também cancela reminders via NOTIF-01 já cabeado no plan 01.
      await signOut();
      Alert.alert("Senha atualizada", "Entre novamente com a nova senha.");
      router.replace("/(auth)/login");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar sua senha.";
      Alert.alert("Falha ao atualizar senha", message);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <AppScreen scroll>
      <View style={styles.backWrapper}>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.backButton}>
            <ArrowLeft size={18} color={theme.colors.text} />
            <Text style={[styles.backLabel, { color: theme.colors.text }]}>Voltar</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.wrapper}>
        <Card>
          <Text style={[styles.title, { color: theme.colors.text }]}>Criar nova senha</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Defina uma nova senha para acessar sua conta. Mínimo de 8 caracteres.
          </Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passwordWrapper}>
                <TextField
                  label="Nova senha"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  placeholder="Digite a nova senha"
                  error={errors.password?.message}
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.colors.textMuted} />
                  )}
                </Pressable>
              </View>
            )}
          />

          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passwordWrapper}>
                <TextField
                  label="Confirmar nova senha"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  error={errors.confirm?.message}
                />
                <Pressable
                  onPress={() => setShowConfirm((current) => !current)}
                  style={styles.passwordToggle}
                >
                  {showConfirm ? (
                    <EyeOff size={18} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.colors.textMuted} />
                  )}
                </Pressable>
              </View>
            )}
          />

          <AppButton
            label={isLoading ? "Salvando..." : "Salvar nova senha"}
            onPress={onSubmit}
            loading={isLoading}
            disabled={isLoading}
          />
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backWrapper: {
    paddingTop: 6,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  wrapper: {
    minHeight: "78%",
    justifyContent: "center",
  },
  fallback: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    top: 38,
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
