import { Redirect, Tabs } from "expo-router";
import { CalendarDays, Heart, List, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/contexts/AuthContext";
import { isCreatorRole, isMobileSupportedRole } from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";

export default function TabsLayout() {
  const { role, isLoading, session } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isCreator = isCreatorRole(role);

  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isMobileSupportedRole(role)) return <Redirect href="/(app)/unsupported" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="plantel"
        options={{
          title: "Plantel",
          tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          href: isCreator ? undefined : null,
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reproducao"
        options={{
          title: "Reprodução",
          href: isCreator ? undefined : null,
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: "Conta",
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
