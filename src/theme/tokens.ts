import type { ThemeMode } from "@/src/types/domain";

const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

const typography = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
};

const lightColors = {
  background: "#f5f5f5",
  surface: "#ffffff",
  surfaceAlt: "#e8e8e8",
  text: "#1a1a1a",
  textMuted: "#6a7282",
  border: "rgba(0, 0, 0, 0.1)",
  primary: "#1a1a1a",
  primaryText: "#ffffff",
  inputBackground: "#ffffff",
  success: "#1f8f4d",
  warning: "#b25f00",
  danger: "#cc2432",
  info: "#2563eb",
  tabInactive: "#717182",
  overlay: "rgba(0, 0, 0, 0.45)",
};

const darkColors = {
  background: "#0d0d0d",
  surface: "#1a1a1a",
  surfaceAlt: "#2a2a2a",
  text: "#ffffff",
  textMuted: "#99a1af",
  border: "rgba(255, 255, 255, 0.12)",
  primary: "#ffffff",
  primaryText: "#111111",
  inputBackground: "#0d0d0d",
  success: "#34d399",
  warning: "#f59e0b",
  danger: "#f87171",
  info: "#60a5fa",
  tabInactive: "#99a1af",
  overlay: "rgba(0, 0, 0, 0.6)",
};

export function getThemeTokens(mode: ThemeMode) {
  return {
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    spacing,
    radii,
    typography,
  };
}

export type AppTheme = ReturnType<typeof getThemeTokens>;
