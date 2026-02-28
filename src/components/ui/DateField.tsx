import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function parseIsoDate(value: string) {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toPtBrDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function DateField({ label, value, onChange, placeholder = "DD/MM/AAAA" }: DateFieldProps) {
  const { theme } = useAppTheme();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [iosTempDate, setIosTempDate] = useState<Date>(parseIsoDate(value));
  const displayValue = useMemo(() => toPtBrDate(value), [value]);

  const openPicker = () => {
    const base = parseIsoDate(value);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "date",
        onChange: (event, selectedDate) => {
          if (event.type !== "set" || !selectedDate) return;
          onChange(toIsoDate(selectedDate));
        },
      });
      return;
    }

    setIosTempDate(base);
    setIosPickerOpen(true);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.input,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.inputBackground,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={{ color: displayValue ? theme.colors.text : theme.colors.textMuted, fontSize: 15 }}>
          {displayValue || placeholder}
        </Text>
      </Pressable>

      <Modal visible={iosPickerOpen} transparent animationType="fade" onRequestClose={() => setIosPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIosPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <DateTimePicker
              value={iosTempDate}
              mode="date"
              display="spinner"
              onChange={(_, selectedDate) => {
                if (!selectedDate) return;
                setIosTempDate(selectedDate);
              }}
            />
            <View style={styles.actions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setIosPickerOpen(false)} />
              <AppButton
                label="Confirmar"
                onPress={() => {
                  onChange(toIsoDate(iosTempDate));
                  setIosPickerOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500" },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  actions: { gap: 8 },
});
