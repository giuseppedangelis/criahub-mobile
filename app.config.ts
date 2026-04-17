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
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // OFFLINE-03 (D-17): background-fetch precisa de "fetch" em
      // UIBackgroundModes para o iOS acordar o app periodicamente e rodar
      // a task criahub-offline-sync.
      UIBackgroundModes: ["fetch"],
      NSCameraUsageDescription:
        "O CriaHub usa a câmera para registrar fotos de animais, documentos e foto de perfil.",
      NSPhotoLibraryUsageDescription:
        "O CriaHub acessa sua galeria para anexar fotos de animais, documentos e foto de perfil.",
      NSPhotoLibraryAddUsageDescription:
        "O CriaHub pode salvar imagens e comprovantes compartilhados na galeria.",
      NSMicrophoneUsageDescription:
        "O CriaHub usa o microfone para registrar áudios de ocorrências em campo.",
      NSLocationWhenInUseUsageDescription:
        "O CriaHub usa sua localização para registrar onde nascimentos e ocorrências acontecem.",
    },
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
    versionCode: 1,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon-criahub.png",
  },
  plugins: [
    "expo-router",
    "expo-video",
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon-criahub.png",
        color: "#0d0d0d",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "O CriaHub acessa sua galeria para anexar fotos de animais, documentos e foto de perfil.",
        cameraPermission:
          "O CriaHub usa a câmera para registrar fotos de animais, documentos e foto de perfil.",
        microphonePermission:
          "O CriaHub usa o microfone para registrar áudios de ocorrências em campo.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "O CriaHub usa sua localização para registrar onde nascimentos e ocorrências acontecem.",
      },
    ],
    [
      "expo-document-picker",
      {
        iCloudContainerEnvironment: "Production",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "4069d525-bbce-4f86-9863-a51ccfe4af32",
    },
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
});
