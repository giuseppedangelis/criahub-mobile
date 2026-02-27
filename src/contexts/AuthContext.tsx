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
import { resolveUserHarasId } from "@/src/lib/haras";
import { normalizeRole } from "@/src/lib/roles";
import type { UserProfile, UserRole } from "@/src/types/domain";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  harasId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("unknown");
  const [harasId, setHarasId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearUserState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("unknown");
    setHarasId(null);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    clearUserState();
  }, [clearUserState]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      harasId,
      isLoading,
      signIn,
      signOut,
      resetPassword,
    }),
    [harasId, isLoading, profile, resetPassword, role, session, signIn, signOut, user]
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
