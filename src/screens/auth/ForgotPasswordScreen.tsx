import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { z } from "zod";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { AppButton } from "@/src/components/ui/AppButton";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAppTheme } from "@/src/theme/ThemeContext";

const ForgotSchema = z.object({
  email: z.string().email("Informe um email válido."),
});

type ForgotInput = z.infer<typeof ForgotSchema>;

export function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { theme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotInput>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsLoading(true);
      await resetPassword(values.email.trim());
      setIsSent(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o email de recuperação.";
      Alert.alert("Falha ao enviar email", message);
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Recuperar senha</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Informe o email da sua conta para receber o link de recuperação.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
              />
            )}
          />

          <AppButton label="Enviar link" onPress={onSubmit} loading={isLoading} />

          {isSent ? (
            <Text style={[styles.feedback, { color: theme.colors.success }]}>
              Verifique seu email. O link abrirá o CriaHub automaticamente para você criar a nova senha.
            </Text>
          ) : null}
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
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  feedback: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});
