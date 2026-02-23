import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Moon, Sun } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { z } from "zod";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { AppButton } from "@/src/components/ui/AppButton";
import { BrandLogo } from "@/src/components/ui/BrandLogo";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAppTheme } from "@/src/theme/ThemeContext";

const LoginSchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginInput = z.infer<typeof LoginSchema>;

export function LoginScreen() {
  const { signIn } = useAuth();
  const { mode, theme, toggleTheme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsLoading(true);
      await signIn(values.email.trim(), values.password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível realizar o login.";
      Alert.alert("Falha no login", message);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <AppScreen scroll>
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => {
            void toggleTheme();
          }}
          style={[
            styles.themeButton,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          {mode === "dark" ? (
            <Sun size={18} color={theme.colors.text} />
          ) : (
            <Moon size={18} color={theme.colors.text} />
          )}
        </Pressable>
      </View>

      <View style={styles.wrapper}>
        <Card>
          <View style={styles.brand}>
            <BrandLogo />
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
              Gestão mobile do seu haras
            </Text>
          </View>

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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passwordWrapper}>
                <TextField
                  label="Senha"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  placeholder="Digite sua senha"
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

          <View style={styles.actions}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text style={[styles.forgotText, { color: theme.colors.text }]}>
                  Esqueci minha senha
                </Text>
              </Pressable>
            </Link>
            <AppButton label="Entrar" onPress={onSubmit} loading={isLoading} />
          </View>
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    width: "100%",
    alignItems: "flex-end",
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wrapper: {
    minHeight: "78%",
    justifyContent: "center",
  },
  brand: {
    marginBottom: 8,
    gap: 8,
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
  actions: {
    marginTop: 8,
    gap: 16,
  },
  forgotText: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "500",
  },
});
