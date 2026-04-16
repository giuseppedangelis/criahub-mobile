import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface ScheduleSegmentedProps {
  active: "agenda" | "tarefas";
}

export function ScheduleSegmented({ active }: ScheduleSegmentedProps) {
  const { theme } = useAppTheme();
  const router = useRouter();

  const go = (target: "agenda" | "tarefas") => {
    if (target === active) return;
    if (target === "agenda") router.replace("/(app)/(tabs)/agenda");
    else router.replace("/(app)/(tabs)/rotina");
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
    >
      {(
        [
          { id: "agenda", label: "Eventos" },
          { id: "tarefas", label: "Tarefas" },
        ] as const
      ).map((item) => {
        const isActive = item.id === active;
        return (
          <Pressable
            key={item.id}
            onPress={() => go(item.id)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: isActive ? theme.colors.surface : "transparent",
                opacity: pressed && !isActive ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: isActive ? "700" : "600",
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
  },
});
