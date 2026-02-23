import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface BrandLogoProps {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function BrandLogo({ style, compact = false }: BrandLogoProps) {
  const { theme, mode } = useAppTheme();

  const logoBackground = mode === "dark" ? "#101010" : "#1a1a1a";

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: logoBackground,
          borderColor: theme.colors.border,
        },
        compact ? styles.compact : undefined,
        style,
      ]}
    >
      <Image
        source={require("../../../assets/images/logo-horizontal-white.png")}
        style={compact ? styles.logoCompact : styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 94,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  compact: {
    minHeight: 64,
    paddingVertical: 10,
  },
  logo: {
    width: 220,
    height: 54,
  },
  logoCompact: {
    width: 180,
    height: 40,
  },
});
