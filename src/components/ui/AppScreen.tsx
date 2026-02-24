import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface AppScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function AppScreen({
  children,
  scroll = false,
  style,
  contentContainerStyle,
}: AppScreenProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (scroll) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.safeArea, { backgroundColor: theme.colors.background }, style]}
      >
        <KeyboardAwareScrollView
          bottomOffset={24}
          extraKeyboardSpace={18}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: 24 + insets.bottom },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }, style]}
    >
      <View style={[styles.container, { paddingBottom: 16 + insets.bottom }, contentContainerStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
