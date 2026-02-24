import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { publicSupabaseEnv } from "@/src/config/env";

// O app usa somente URL pública + anon key. Nunca usar service role no cliente.
const isServerEnvironment = typeof window === "undefined";
const isWebPlatform = Platform.OS === "web";

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  },
};

export const supabase = createClient(
  publicSupabaseEnv.url,
  publicSupabaseEnv.anonKey,
  {
    auth: {
      storage: isWebPlatform ? webStorage : AsyncStorage,
      autoRefreshToken: !isServerEnvironment,
      persistSession: !isServerEnvironment,
      detectSessionInUrl: false,
    },
  }
);
