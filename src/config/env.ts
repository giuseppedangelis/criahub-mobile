import Constants from "expo-constants";
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ACCESS_TOKEN: z.string().min(1),
});

const constantsAny = Constants as unknown as {
  expoConfig?: { extra?: Record<string, unknown> };
  manifest2?: { extra?: Record<string, unknown> };
};

const rawExtra = (constantsAny.expoConfig?.extra ??
  constantsAny.manifest2?.extra ??
  {}) as Record<string, unknown>;

const parsed = EnvSchema.safeParse(rawExtra);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(" | ");
  throw new Error(`Configuração de ambiente inválida: ${issues}`);
}

const env = parsed.data;

// Mantemos as chaves sensíveis validadas, mas não expostas ao app cliente.
void env.SUPABASE_SERVICE_ROLE_KEY;
void env.SUPABASE_ACCESS_TOKEN;

export const publicSupabaseEnv = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;
