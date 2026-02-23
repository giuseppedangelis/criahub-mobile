import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { ThemeMode } from "@/src/types/domain";
import { getThemeTokens, type AppTheme } from "@/src/theme/tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  theme: AppTheme;
  isHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "criahub_mobile_theme_mode";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (storedMode === "light" || storedMode === "dark") {
          setMode(storedMode);
        }
      } finally {
        if (mounted) setIsHydrated(true);
      }
    };

    restoreMode();

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (nextMode: ThemeMode) => {
    setMode(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    await setThemeMode(nextMode);
  }, [mode, setThemeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      theme: getThemeTokens(mode),
      isHydrated,
      setThemeMode,
      toggleTheme,
    }),
    [isHydrated, mode, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme deve ser usado dentro de ThemeProvider");
  }
  return context;
}
