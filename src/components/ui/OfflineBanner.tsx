import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/theme/ThemeContext";

/**
 * OFFLINE-05 (D-05/D-06/D-07): banner global que aparece quando o device
 * perde conexão. Monta-se uma vez no topo da árvore (AppProviders) e
 * flutua absolute acima de qualquer screen, respeitando a safe area.
 *
 * Estado considerado offline: `isConnected === false`. Estados nulos/undefined
 * são tratados como online (evita falso positivo em cold start).
 */
export function OfflineBanner() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          paddingTop: insets.top + 6,
          backgroundColor: theme.colors.warning,
        },
      ]}
    >
      <Text style={styles.text}>
        Sem conexão. Mudanças ficam pendentes até voltar online.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
