import { useCallback, useEffect, useRef, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

/**
 * UX-05 (D-12/D-13/D-14): hook que protege áreas sensíveis (ex.: /financeiro)
 * com biometria.
 *
 * Fluxo:
 * 1. Em mount, detecta hardware disponível e enrollment.
 * 2. Se hardware ausente ou biometria não enrolada: `isAuthenticated = true`
 *    (graceful — não trava o usuário em devices sem biometria).
 * 3. Se hardware + enrollment OK: começa `isAuthenticated = false`. UI mostra
 *    botão "Autenticar" que chama `requireAuth()` → `authenticateAsync`.
 * 4. Após sucesso, fica autenticado por 5min (reset via setTimeout).
 *
 * O `gateKey` existe para futuros gates com TTLs diferentes ou reset por
 * screen; por ora só serve como identificador semântico.
 */
export interface BiometricGateState {
  /** `true` quando o usuário passou pela biometria OU quando o hardware não suporta. */
  isAuthenticated: boolean;
  /** `true` se o device tem hardware biométrico (Face ID / Touch ID / fingerprint). */
  isHardwareAvailable: boolean;
  /** `true` se o usuário já enrolou biometria no sistema. */
  isEnrolled: boolean;
  /** `true` enquanto a detecção inicial está rodando. */
  isReady: boolean;
  /** Dispara authenticateAsync e seta isAuthenticated se der certo. */
  requireAuth: () => Promise<boolean>;
}

const AUTH_TTL_MS = 5 * 60 * 1000; // 5min

export function useBiometricGate(_gateKey: string): BiometricGateState {
  const [isHardwareAvailable, setIsHardwareAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const [hasHardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!mounted) return;
        setIsHardwareAvailable(hasHardware);
        setIsEnrolled(enrolled);
        // UX-05 (D-14): graceful — se não há hardware/enrollment, não trava o usuário.
        if (!hasHardware || !enrolled) {
          setIsAuthenticated(true);
        }
      } catch {
        if (!mounted) return;
        // Falha na detecção: libera acesso (graceful — prefira não travar).
        setIsHardwareAvailable(false);
        setIsEnrolled(false);
        setIsAuthenticated(true);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  const requireAuth = useCallback(async () => {
    if (!isHardwareAvailable || !isEnrolled) {
      setIsAuthenticated(true);
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se para ver o financeiro",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsAuthenticated(true);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setIsAuthenticated(false);
        }, AUTH_TTL_MS);
        return true;
      }
    } catch (err) {
      console.warn("[biometric] authenticateAsync falhou:", err);
    }
    return false;
  }, [isHardwareAvailable, isEnrolled]);

  return {
    isAuthenticated,
    isHardwareAvailable,
    isEnrolled,
    isReady,
    requireAuth,
  };
}
