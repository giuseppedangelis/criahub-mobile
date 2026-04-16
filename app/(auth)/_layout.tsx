import { Redirect, router, Stack, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole, isMobileSupportedRole } from "@/src/lib/roles";
import { supabase } from "@/src/lib/supabase";

// AUTH-01 D-05/D-16: extrai access_token + refresh_token do fragment da URL.
// Supabase envia recovery no formato: criahubmobile://reset-password#access_token=...&refresh_token=...&type=recovery
// `Linking.parse` NÃO expõe o fragment — precisamos parsear manualmente via
// split por '&' e depois por '=' + decodeURIComponent do valor (sem usar parser builtin).
function parseResetTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return null;
  const fragment = url.slice(hashIndex + 1);
  if (!fragment) return null;

  const pairs: Record<string, string> = Object.fromEntries(
    fragment.split("&").map((kv) => {
      const [key, ...rest] = kv.split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );

  if (pairs.type !== "recovery") return null;
  if (!pairs.access_token || !pairs.refresh_token) return null;
  return { accessToken: pairs.access_token, refreshToken: pairs.refresh_token };
}

function isResetPasswordUrl(url: string): boolean {
  // Aceita qualquer URL cujo path contenha "reset-password" (scheme-agnóstico p/ permitir futura migração p/ universal link).
  return url.includes("reset-password");
}

export default function AuthLayout() {
  const { session, role, isLoading } = useAuth();
  const pathname = usePathname();
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);
  const processedUrlsRef = useRef<Set<string>>(new Set());

  // AUTH-01 D-05/D-14: guard anti-race. Quando pathname é reset-password, skip
  // o branch de redirect baseado em role — mesmo que AuthContext já tenha session=true
  // após setSession. Sem isso, o render seguinte ao setSession empurra usuário pro
  // dashboard ANTES do router.replace("/(auth)/reset-password") commitar.
  const isResetPasswordRoute = pathname?.includes("reset-password") ?? false;

  useEffect(() => {
    let mounted = true;

    // AUTH-01 D-05: handler central para deep links de reset. Tratado em um único
    // ponto para cobrir cold start (getInitialURL) + foreground (addEventListener).
    const handleUrl = async (incomingUrl: string | null) => {
      if (!incomingUrl || !mounted) return;
      if (!isResetPasswordUrl(incomingUrl)) return;
      if (processedUrlsRef.current.has(incomingUrl)) return;
      processedUrlsRef.current.add(incomingUrl);

      const tokens = parseResetTokens(incomingUrl);
      if (!tokens) {
        // Link malformado — manda usuário pedir novo link.
        router.replace("/(auth)/forgot-password");
        return;
      }

      setIsProcessingDeepLink(true);
      try {
        // AUTH-01 D-07: se já houver sessão ativa (outro usuário logado no device),
        // signOut silencioso ANTES de hidratar a sessão de reset para evitar ambiguidade
        // e vazamento de contexto entre contas. A limpeza de reminders vem do handler
        // de user-mismatch do plano 01-01 (NOTIF-01) via onAuthStateChange.
        const { data: current } = await supabase.auth.getSession();
        if (current?.session) {
          try {
            await supabase.auth.signOut();
          } catch {
            // Silencioso: signOut direto do client pode falhar por rede — mesmo assim
            // prosseguimos. setSession a seguir sobrescreve a sessão local persistida.
          }
        }

        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (!mounted) return;
        if (error) {
          // Link inválido/expirado — sem sessão. Volta a pedir novo link.
          router.replace("/(auth)/forgot-password");
          return;
        }

        // AUTH-01 D-05: navega para a tela de reset. router.replace evita
        // empilhar histórico com o link que estava sendo processado.
        router.replace("/(auth)/reset-password");
      } finally {
        if (mounted) setIsProcessingDeepLink(false);
      }
    };

    // Cold start: app foi aberto diretamente pelo link (processo não existia).
    Linking.getInitialURL().then((initial) => {
      void handleUrl(initial);
    });

    // Foreground: app já estava aberto e recebeu o link.
    const subscription = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (isLoading || isProcessingDeepLink) {
    return <LoadingState fullscreen message="Verificando sessão..." />;
  }

  // AUTH-01 D-05/D-14: guarda anti-race contra onAuthStateChange pós-setSession
  // empurrar usuário para dashboard antes de router.replace("/(auth)/reset-password")
  // commitar. Se estamos na rota de reset-password, NÃO redirecionar por role.
  if (session && !isResetPasswordRoute) {
    if (isMobileSupportedRole(role)) {
      if (isCreatorRole(role)) return <Redirect href="/(app)/(tabs)/plantel" />;
    }
    return <Redirect href="/(app)/unsupported" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
