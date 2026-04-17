# Coding Conventions

**Analysis Date:** 2026-04-16

## TypeScript Strictness

**Config:** `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`.

**Path aliases:**
- `@/*` maps to project root (`./*`), so all imports begin with `@/src/...`, `@/app/...`, or `@/components/...`.

**Typecheck command:**
```bash
npm run typecheck   # runs `tsc --noEmit`
```

**No separate test/build TS configs.** The single `tsconfig.json` covers everything including `.expo/types/**/*.ts` and `expo-env.d.ts`.

**Type-only imports:** Explicitly prefer `import type` / inline `type` qualifiers. Seen consistently:
```ts
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Animal, AnimalCategory } from "@/src/types/domain";
```

**Domain types** all live in a single file: `src/types/domain.ts`. No per-module type files. Add new domain types there.

## Linting and Formatting

**No ESLint, Prettier, or Biome config present.**
- No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json`, or `.editorconfig` anywhere in the repo.
- No `lint` or `format` npm script.
- `devDependencies` contains only `@types/react`, `react-test-renderer`, and `typescript`.

**Implication:** Formatting is enforced only by editor defaults and reviewer discipline. When adding new files, match the observed style (below) rather than relying on tooling.

**Observed formatting conventions (de facto):**
- 2-space indent
- Double quotes for strings (`"..."`) — never single quotes
- Trailing commas in multi-line arrays/objects/type params
- Semicolons required
- Max line length ~100 chars (soft — `AnimalEditModal.tsx` goes longer in JSX)
- Arrow callbacks for inline handlers; named `function` declarations for top-level helpers and exported hooks/services

## Naming Patterns

**Files:**
- Components, screens, contexts: `PascalCase.tsx` — `AppButton.tsx`, `LoginScreen.tsx`, `AuthContext.tsx`
- Hooks: `camelCase.ts` starting with `use` — `useAnimals.ts`, `useOwnership.ts`
- Services, libs, utils, types, config: `kebab-case.ts` — `animal-location.ts`, `query-client.ts`, `vet-access.ts`, `format.ts`, `domain.ts`, `env.ts`
- Expo Router route segments: lowercase with parentheses for groups — `app/(auth)/login.tsx`, `app/(app)/animal/[id].tsx`

**Functions:**
- React components: PascalCase exported functions — `export function AnimalEditModal(...)`, `export const TextField = forwardRef(...)`
- Hooks: `useXxxQuery`, `useXxxMutation`, `useXxx` — `useAnimalsQuery`, `useUpdateAnimalMutation`, `useAuth`
- Services: camelCase object with async methods — `animalsService.list()`, `ownershipService.save()`

**Variables:**
- camelCase for runtime values, PascalCase for types/interfaces/components, SCREAMING_SNAKE for constants (`CATEGORY_MAPPING`, `ANIMAL_SELECT_FIELDS`, `STORAGE_KEY`).

**Types:**
- Interfaces for object shapes (`interface AppButtonProps`, `interface FormState`).
- `type` for unions/aliases (`type AnimalSex = "Macho" | "Fêmea"`).
- Domain type names use snake_case fields (matching DB columns) — e.g. `Animal.registry_number`, `birth_date`.

**Database column mapping:** Supabase tables use Portuguese snake_case (`nome`, `sexo`, `pai_id`, `data_nascimento`). Service layer maps DB rows → English-field TypeScript objects via explicit `mapFromDb` functions (see `src/services/animals.ts` `mapAnimalFromDb`). Never leak Portuguese DB names past the service boundary.

## File Organization

**Top-level layout:**
```
app/              # Expo Router file-based routes (thin screens that import from src/screens)
components/       # Legacy/unused — only holds empty __tests__ folder
src/
  components/     # Reusable UI organized by feature (animal/, field/, ownership/, ui/, reproduction/, tasks/, sync/)
  config/         # Environment validation (env.ts)
  contexts/       # React context providers (AppProviders, AuthContext)
  hooks/          # React Query hooks + query-key factories
  lib/            # Framework glue (supabase, query-client, notifications, roles, haras)
  screens/        # Full-screen composition components imported by app/ routes
  services/       # Supabase data-access layer (one file per domain)
  theme/          # ThemeContext + tokens (dark/light design tokens)
  types/          # domain.ts — all shared types
  utils/          # Pure formatting helpers
```

**Route → screen pattern:** Each `app/(app)/.../*.tsx` is a thin wrapper that imports one `*Screen` from `src/screens/`. Never put screen logic directly in `app/`.

**Barrel files:** None. Every import is fully qualified (`@/src/components/ui/AppButton`, not `@/src/components/ui`). Do not introduce `index.ts` barrels — it breaks the established pattern.

**Co-location:** Feature-scoped components (e.g. `OwnershipEditorModal`, `OwnershipSection`) live next to each other in `src/components/<feature>/` and use relative imports between siblings (`import { OwnershipEditorModal } from "./OwnershipEditorModal"`).

## Import Organization

**Observed order (top → bottom):**
1. External packages (`react`, `react-native`, `expo-*`, `@tanstack/react-query`, `@supabase/supabase-js`, `lucide-react-native`, `zod`, `@hookform/resolvers/zod`)
2. Alias-prefixed imports grouped roughly by layer: `@/src/components/...`, `@/src/hooks/...`, `@/src/lib/...`, `@/src/contexts/...`, `@/src/theme/...`, `@/src/services/...`, `@/src/utils/...`
3. Type-only imports last (`import type { Animal } from "@/src/types/domain"`)
4. Relative sibling imports for co-located feature modules (`import { OwnershipEditorModal } from "./OwnershipEditorModal"`)

Within each group alphabetical ordering is loose but generally followed.

**No import-sort tool** is configured, so keep the order manually.

## Styling Approach

**StyleSheet.create only.** No NativeWind, no Tailwind, no styled-components, no className props anywhere in `src/`.

**Pattern:**
```tsx
export function MyComponent() {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      ...
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12 },
});
```

**Rules:**
- Static layout values (padding, flex, borderRadius numbers, gap) go in `StyleSheet.create`.
- Theme-dependent values (`backgroundColor`, `borderColor`, `color`) go inline, pulled from `useAppTheme().theme.colors`.
- Style arrays merge static + inline: `style={[styles.input, { borderColor: error ? danger : border }]}`.
- Pressable opacity for press feedback uses the `({ pressed }) => [..., { opacity: pressed ? 0.8 : 1 }]` pattern (see `AppButton.tsx`).

**Theme tokens:** `src/theme/tokens.ts` exports `spacing`, `radii`, `typography`, and dark/light color palettes via `getThemeTokens(mode)`. Access through `useAppTheme()` from `src/theme/ThemeContext.tsx`.

**Never hardcode colors** inside `styles.*`. Use `theme.colors.primary`, `theme.colors.surface`, `theme.colors.danger`, etc. One exception: the constant overlay `"rgba(0,0,0,0.45)"` for modal backdrops.

**Icons:** `lucide-react-native` only. Size passed as a prop (`<Lock size={14} color={theme.colors.info} />`). Pass theme colors, never hex literals.

## Error Handling

**No toast / snackbar library.** User-facing errors are surfaced via:

1. **`Alert.alert("Title", message)`** from `react-native` — used in 9 files, mostly for mutation failures triggered from Pressables (`OwnershipSection.tsx`, `AccountScreen.tsx`, `CreatorTeamScreen.tsx`, `AnimalMediaActions.tsx`).
   ```tsx
   presenceMutation.mutate(next, {
     onError: (err) => {
       const message = err instanceof Error ? err.message : "Erro ao atualizar presença.";
       Alert.alert("Erro", message);
     },
   });
   ```

2. **Inline error boxes** inside modals — `AnimalEditModal.tsx` renders a red-bordered `<View>` with the error message under the form when `setError(...)` was called.

3. **Inline field errors** in react-hook-form screens — the `TextField` component accepts `error?: string` and renders it in red under the input (`LoginScreen.tsx`).

**Service-layer error pattern:** Every Supabase call goes through `handleSupabaseError` which throws:
```ts
// src/services/base.ts
export function handleSupabaseError(error: { message?: string } | null): never {
  const message = error?.message || "Erro ao acessar o banco de dados.";
  throw new Error(message);
}
```
Services throw `Error` with Portuguese user-facing messages. Callers catch via `try/catch` or React Query's `onError`.

**Try/catch pattern in screens/components:**
```ts
try {
  await updateMutation.mutateAsync(input);
  onClose();
} catch (err) {
  setError(err instanceof Error ? err.message : "Falha ao salvar alterações.");
}
```
Always narrow unknown with `err instanceof Error ? err.message : "fallback PT-BR message"`.

**User-facing messages are always in Portuguese** ("Informe um email válido.", "Falha ao salvar alterações.", "Animal ou haras inválido para atualizar."). Matches the `pt-BR` locale used in `formatDateBR`.

**Never surface raw Supabase errors** to UI — funnel through `handleSupabaseError` so the thrown `Error.message` is already PT-BR.

## Form Handling

**Two patterns coexist — choose based on screen type:**

### 1. `react-hook-form` + `zodResolver` (auth screens only)

Used in `src/screens/auth/LoginScreen.tsx` and `src/screens/auth/ForgotPasswordScreen.tsx`.

```tsx
const LoginSchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});
type LoginInput = z.infer<typeof LoginSchema>;

const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
  resolver: zodResolver(LoginSchema),
  defaultValues: { email: "", password: "" },
});

<Controller
  control={control}
  name="email"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextField label="Email" value={value} onChangeText={onChange} onBlur={onBlur}
               error={errors.email?.message} />
  )}
/>
```

### 2. Local `useState` form + manual validation (most app modals/screens)

Used in `AnimalEditModal.tsx`, `OwnershipEditorModal.tsx`, `TaskExecutionModal.tsx`, etc.

```tsx
interface FormState { name: string; registry: string; /* ... */ }
const [form, setForm] = useState<FormState>(() => buildInitialState(animal));
const [error, setError] = useState<string | null>(null);

const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
  setForm((prev) => ({ ...prev, [key]: value }));
};

const handleSubmit = async () => {
  setError(null);
  if (!canSubmit) { setError("O nome do animal é obrigatório."); return; }
  // manual validators (parseNumber, normalizeString) then mutation.mutateAsync
};
```

**Rule of thumb:** Use `react-hook-form` + Zod only when the screen has a clear submit-and-navigate flow (auth). For feature modals that mix pickers, search selects, toggles, and conditional logic (`AnimalEditModal`, `OwnershipEditorModal`), use the local-state pattern — it's easier to build `buildInitialState(entity)` from a domain object and diff only changed fields on submit.

**Normalization helpers** defined at the top of each form file:
```ts
function normalizeString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function parseNumber(value: string): number | null { /* accepts "," or "." */ }
```
Duplicate across files rather than extract — the implementations vary slightly per form.

**Zod schemas** are defined inline at the top of the screen file (not in a separate `schemas/` folder). Reuse types via `z.infer<typeof Schema>`.

## React Query Conventions

**Client:** Single lazily-created `QueryClient` from `src/lib/query-client.ts`:
```ts
staleTime: 60 * 1000,
gcTime: 5 * 60 * 1000,
retry: 1,
refetchOnWindowFocus: false,
// mutations: retry: 0
```
Per-query overrides (e.g. `staleTime: 30_000` on `useActiveOwnershipSharesQuery`) are allowed when the default is too long/short.

**Provider:** `QueryClientProvider` sits inside `AppProviders` (`src/contexts/AppProviders.tsx`), wrapping `ThemeProvider` and `AuthProvider`.

**Query-key factories are mandatory.** Every hooks file exports a `const xxxKeys = { ... } as const` object:
```ts
// src/hooks/useAnimals.ts
export const animalKeys = {
  all: ["animals"] as const,
  list: (filters: AnimalFilters, pagination: PaginationParams) =>
    [...animalKeys.all, "list", filters, pagination] as const,
  detail: (id: string) => [...animalKeys.all, "detail", id] as const,
};
```
Invalidate with the most specific key available. Cross-hook invalidation imports sibling key factories:
```ts
// src/hooks/useOwnership.ts imports animalKeys + animalDetailsKeys
queryClient.invalidateQueries({ queryKey: animalKeys.detail(animalId) });
```

**Hook naming:**
- `useXxxQuery(...)` for reads — always accept an `enabled = true` argument and gate with `enabled: enabled && Boolean(requiredParam)`.
- `useXxxMutation(...)` for writes — always `onSuccess` invalidates related queries via `Promise.all([...invalidateQueries...])`.

**Calling services:** Hooks never contain Supabase code — they call `xxxService.method()` imported from `@/src/services/xxx`. Hooks translate React Query concerns (keys, enabled, invalidation); services translate DB concerns.

**Mutation usage in components:**
```tsx
const updateMutation = useUpdateAnimalMutation(animal.id, animal.haras_id);
// Use mutation.isPending for button loading state
<AppButton label={updateMutation.isPending ? "Salvando..." : "Salvar"}
           loading={updateMutation.isPending}
           disabled={updateMutation.isPending || !canSubmit}
           onPress={handleSubmit} />
// Use mutateAsync when you need try/catch; mutate + onError for fire-and-forget
await updateMutation.mutateAsync(input);
```

## Supabase Client Usage Patterns

**Single client:** `src/lib/supabase.ts` creates one `createClient(...)` instance. Never construct another.

**Platform-aware storage:**
- Web: custom `webStorage` wrapping `window.localStorage` with try/catch.
- Native (iOS/Android): `AsyncStorage` from `@react-native-async-storage/async-storage`.
- SSR guard: `autoRefreshToken` / `persistSession` set to `!isServerEnvironment`.

**`detectSessionInUrl: false`** — mobile handles session via AsyncStorage, not URL hash.

**Only anon key from client.** The comment in `src/lib/supabase.ts` is load-bearing:
```ts
// O app usa somente URL pública + anon key. Nunca usar service role no cliente.
```
Do not import or reference `SUPABASE_SERVICE_ROLE` anywhere in mobile.

**Env validation** happens once at import-time in `src/config/env.ts` using a Zod schema. If env is missing/invalid, the app crashes on boot with a PT-BR error. Both keys use the `NEXT_PUBLIC_` prefix (shared convention with the web repo) and are exposed via `app.config.ts` → `extra`.

**Services always re-export from `base.ts`:**
```ts
// src/services/xxx.ts
import { handleSupabaseError, supabase } from "@/src/services/base";
```
`src/services/base.ts` re-exports `supabase` plus pagination/error helpers (`applyPagination`, `formatPaginatedResponse`, `handleSupabaseError`). Don't import `supabase` directly from `@/src/lib/supabase` inside a service — go through `base`.

**Query pattern:**
```ts
const { data, error, count } = await supabase
  .from("animals")
  .select(ANIMAL_SELECT_FIELDS, { count: "exact" })
  .eq("haras_id", filters.haras_id)
  .order("nome", { ascending: true });
if (error) handleSupabaseError(error);
return (data || []).map(mapAnimalFromDb);
```

**Field selection:** Define a module-local `const XXX_SELECT_FIELDS = "col1, col2, ..."` template string and reuse across `list`/`getById` (`ANIMAL_SELECT_FIELDS`, `SHARE_SELECT_FIELDS`). Never `select("*")`.

**DB ↔ app mapping:** Write dedicated `mapXxxFromDb(row: Record<string, any>): XxxType` functions at the top of each service. Handle fallbacks (`row.x ?? null`), type coercions (`Number.parseFloat`), and DB→app enum maps (`STATUS_MAPPING_DB_TO_APP`).

**Write payloads:** Build a `Record<string, unknown>` inline, only adding keys when `input.field !== undefined` (partial updates) and always setting `updated_at: new Date().toISOString()`. Scope writes with `.eq("haras_id", harasId)` in addition to `.eq("id", ...)` so RLS-violating rows never match.

**Type escape hatch:** The project frequently casts via `(supabase as any)` (see `src/services/animals.ts` lines 164, 179) for tables not yet in the generated Database type. Tolerated — continue the pattern rather than over-engineering types.

**RLS assumptions:** Client relies entirely on Postgres RLS policies — never check permissions in mutations. Role gating in UI uses helpers from `src/lib/roles.ts` (`isCreatorRole`, `isFieldStaffRole`, `isVeterinaryRole`, `isMobileSupportedRole`). See comments like `// RLS: user_can_manage_haras_team — só admin/criador/assessor` in `OwnershipSection.tsx`.

## Comments

**Language:** Comments are written in Portuguese. Code identifiers are English (except DB-mirror fields like `criador`, `proprietario`, `nome` which match Supabase columns).

**When to comment:**
- RLS constraints and role permissions — `// Permite editar cotistas (RLS: user_can_manage_haras_team — só admin/criador/assessor).`
- Business rules tied to ABCCMM (official studbook) — `// Campos oficiais (ABCCMM) só podem ser editados em animais avulsos/manuais.`
- Security invariants — `// O app usa somente URL pública + anon key. Nunca usar service role no cliente.`

**JSDoc:** Used sparingly via `/** ... */` on public props to surface RLS notes in IntelliSense (see `OwnershipSectionProps.canManageShares`). No full JSDoc coverage of hooks/services — types carry the contract.

**Avoid** narrating what the code does. Comment WHY (business rule, RLS, platform quirk) only.

## Context Providers

**Nesting order in `src/contexts/AppProviders.tsx`** (outermost → innermost):
```
KeyboardProvider → SafeAreaProvider → QueryClientProvider → ThemeProvider → AuthProvider
```
- Keyboard and safe-area at top because they're used by deepest children via hooks.
- ThemeProvider outside AuthProvider so unauthenticated screens (login) can toggle theme.

**Context-hook pattern:** Every context exports a `useXxx()` hook that throws a PT-BR error if used outside the provider:
```ts
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
```

**Value memoization:** Always wrap the context `value` in `useMemo` with a complete dependency array (see `AuthContext.tsx` lines 164-189). Callback identities are stabilized with `useCallback`.

## Expo Router Conventions

**Route groups:** `(auth)` and `(app)` group segments without appearing in URL. `(tabs)` is nested inside `(app)`.

**Auth gating:** Done in `app/(app)/_layout.tsx` and `app/index.tsx` via `useAuth()` + `<Redirect href="...">`. When `isLoading`, render `<LoadingState fullscreen />` — never flicker to login.

**Role gating:** `getDefaultAppRouteForRole(role)` + `isMobileSupportedRole(role)` route users to `/(app)/(tabs)/inicio | campo | veterinaria` or `/(app)/unsupported`. All role checks go through `src/lib/roles.ts`.

**Typed routes enabled** (`experiments.typedRoutes: true` in `app.config.ts`). Occasional `as "/(app)/unsupported"` casts needed when composing hrefs dynamically.

**Screen files in `app/`** should only import + render a `src/screens/XxxScreen.tsx`. Put logic, hooks, and styles in the screen file under `src/screens/`.

---

*Convention analysis: 2026-04-16*
