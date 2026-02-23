import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/src/config/env";

// O app usa somente URL pública + anon key. Nunca usar service role no cliente.
export const supabase = createClient(
  publicSupabaseEnv.url,
  publicSupabaseEnv.anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
