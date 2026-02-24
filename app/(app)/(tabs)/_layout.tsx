import { Redirect, Tabs } from "expo-router";
import {
  AlertTriangle,
  CalendarDays,
  Heart,
  Home,
  List,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  isCreatorRole,
  isFieldStaffRole,
  isMobileSupportedRole,
  isVeterinaryRole,
} from "@/src/lib/roles";
import { useAppTheme } from "@/src/theme/ThemeContext";

export default function TabsLayout() {
  const { role, isLoading, session } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isCreator = isCreatorRole(role);
  const isVet = isVeterinaryRole(role);
  const isField = isFieldStaffRole(role);

  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isMobileSupportedRole(role)) return <Redirect href="/(app)/unsupported" />;

  const commonScreenOptions = {
    headerShown: false as const,
    tabBarHideOnKeyboard: true,
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
      fontWeight: "600" as const,
    },
  };

  if (isVet) {
    return (
      <Tabs screenOptions={commonScreenOptions}>
        <Tabs.Screen
          name="plantel"
          options={{
            title: "Plantel",
            tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="veterinaria"
          options={{
            title: "Veterinária",
            tabBarIcon: ({ color, size }) => <Stethoscope color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: "Agenda",
            tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reproducao"
          options={{
            title: "Reprodução",
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

  if (isField) {
    return (
      <Tabs screenOptions={commonScreenOptions}>
        <Tabs.Screen
          name="campo"
          options={{
            title: "Início",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="buscar-animal"
          options={{
            title: "Buscar",
            tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="conta"
          options={{
            title: "Conta",
            tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="plantel" options={{ href: null }} />
        <Tabs.Screen name="agenda" options={{ href: null }} />
        <Tabs.Screen name="reproducao" options={{ href: null }} />
        <Tabs.Screen name="veterinaria" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={commonScreenOptions}>
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
        name="veterinaria"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="campo"
        options={{
          href: null,
          tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="buscar-animal"
        options={{
          href: null,
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
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
