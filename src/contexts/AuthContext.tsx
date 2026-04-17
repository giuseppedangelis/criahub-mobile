import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { listUserHaras, resolveUserHarasId, type UserHarasMembership } from "@/src/lib/haras";
import { getQueryClient } from "@/src/lib/query-client";
import { normalizeRole } from "@/src/lib/roles";
import {
  clearAllReminders,
  clearOwnerUserId,
  readOwnerUserId,
  writeOwnerUserId,
} from "@/src/lib/notifications";
import type { UserProfile, UserRole } from "@/src/types/domain";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  harasId: string | null;
  availableHaras: UserHarasMembership[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  hotSwapHaras: (harasId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("unknown");
  const [harasId, setHarasId] = useState<string | null>(null);
  const [availableHaras, setAvailableHaras] = useState<UserHarasMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearUserState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("unknown");
    setHarasId(null);
    setAvailableHaras([]);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, haras_id, phone")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      setProfile(null);
      setRole("unknown");
      setHarasId(null);
      setAvailableHaras([]);
      return;
    }

    const normalizedRole = normalizeRole(data.role);
    const resolvedHarasId = await resolveUserHarasId(supabase, userId, data.haras_id ?? null);
    const nextProfile: UserProfile = {
      id: data.id,
      email: data.email ?? null,
      full_name: data.full_name ?? null,
      avatar_url: data.avatar_url ?? null,
      role: normalizedRole,
      haras_id: resolvedHarasId,
      phone: data.phone ?? null,
    };

    setProfile(nextProfile);
    setRole(normalizedRole);
    setHarasId(nextProfile.haras_id);

    // AUTH-02 (D-11): pré-carrega a lista de haras onde o usuário tem
    // membership ativo. Em paralelo seria ideal, mas resolveUserHarasId já
    // depende do profile — mantemos sequencial por simplicidade.
    try {
      const memberships = await listUserHaras(supabase, userId);
      setAvailableHaras(memberships);
    } catch {
      setAvailableHaras([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new Error(error.message);

        if (!mounted) return;

        const nextSession = data.session;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          clearUserState();
        }
      } catch {
        if (mounted) {
          clearUserState();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    const { data: authState } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;

        // NOTIF-01 D-10: detecta troca de usuário no mesmo device ANTES de
        // trocar a state, para não vazar lembretes do usuário anterior.
        // Este handler dispara também em INITIAL_SESSION no mount (supabase-js v2),
        // então cobre tanto o caso de troca em tempo real quanto o bootstrap inicial
        // quando há sessão persistida — sem duplicar a lógica em bootstrap().
        const nextUserId = nextSession?.user?.id ?? null;
        const storedOwnerId = await readOwnerUserId();

        if (nextUserId) {
          if (storedOwnerId !== nextUserId) {
            await clearAllReminders();
            await writeOwnerUserId(nextUserId);
          }
        } else if (storedOwnerId) {
          // Sessão terminou por qualquer via (signOut, refresh-fail, etc.)
          await clearAllReminders();
          await clearOwnerUserId();
        }

        if (!mounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          try {
            await loadProfile(nextSession.user.id);
          } catch {
            setProfile(null);
            setRole("unknown");
            setHarasId(null);
          }
        } else {
          clearUserState();
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authState.subscription.unsubscribe();
    };
  }, [clearUserState, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    // NOTIF-01 D-09: cancelar reminders + owner antes de limpar state para evitar
    // que usuário B receba lembretes de A no mesmo device.
    try {
      await clearAllReminders();
      await clearOwnerUserId();
    } catch {
      // clearAllReminders/clearOwnerUserId já silenciam erros internamente;
      // catch aqui é defensivo contra regressão futura.
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    clearUserState();
  }, [clearUserState]);

  const resetPassword = useCallback(async (email: string) => {
    // AUTH-01 D-01: redirectTo aponta para o scheme custom do app para que o link
    // do email abra direto a rota /(auth)/reset-password. Universal Link fica
    // para milestone dedicado (exige apple-app-site-association + assetlinks).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "criahubmobile://reset-password",
    });
    if (error) throw new Error(error.message);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadProfile(user.id);
  }, [loadProfile, user?.id]);

  const hotSwapHaras = useCallback(
    async (nextHarasId: string) => {
      // AUTH-02 (D-12): troca o haras ativo do usuário in-memory sem signOut.
      // Regras:
      // - usuário PRECISA ter membership ativo no haras alvo (availableHaras)
      // - clear() no QueryClient invalida tudo que é scoped por harasId
      //   (animais, dashboard, agenda, tasks, ownership, etc.) — as hooks
      //   re-disparam as queries com o novo haras ativo na próxima leitura
      if (!nextHarasId) return;
      const membership = availableHaras.find((item) => item.haras_id === nextHarasId);
      if (!membership) {
        throw new Error("Você não tem acesso a este haras.");
      }
      if (nextHarasId === harasId) return;

      setHarasId(nextHarasId);
      setProfile((prev) => (prev ? { ...prev, haras_id: nextHarasId } : prev));
      // Limpa todo o cache React Query — evita dados do haras anterior vazarem.
      try {
        getQueryClient().clear();
      } catch {
        // Clear é best-effort; falhas são inofensivas (cache velho é só UX stale).
      }
    },
    [availableHaras, harasId]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      harasId,
      availableHaras,
      isLoading,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      hotSwapHaras,
    }),
    [
      availableHaras,
      harasId,
      hotSwapHaras,
      isLoading,
      profile,
      refreshProfile,
      resetPassword,
      role,
      session,
      signIn,
      signOut,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
