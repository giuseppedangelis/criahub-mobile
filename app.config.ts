import type { ConfigContext, ExpoConfig } from "expo/config";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, ".env.local") });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CRIAHUB Mobile",
  slug: "criahub-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon-criahub.png",
  scheme: "criahubmobile",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0d0d0d",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.criahub.mobile",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon-criahub.png",
      backgroundColor: "#0d0d0d",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: "resize",
    package: "com.criahub.mobile",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon-criahub.png",
  },
  plugins: ["expo-router", "expo-video", "@react-native-community/datetimepicker"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN ?? "",
  },
});
