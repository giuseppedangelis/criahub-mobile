import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, disabled, style, editable, ...props },
  ref
) {
  const { theme } = useAppTheme();
  const isMultiline = Boolean(props.multiline);
  const isEditable = disabled ? false : editable !== false;

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        editable={isEditable}
        style={[
          styles.input,
          isMultiline && styles.multilineInput,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.inputBackground,
            borderColor: error ? theme.colors.danger : theme.colors.border,
          },
          disabled && { backgroundColor: theme.colors.surfaceAlt },
          style,
        ]}
        placeholderTextColor={theme.colors.textMuted}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  multilineInput: {
    height: undefined,
    minHeight: 112,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  error: {
    fontSize: 12,
    fontWeight: "500",
  },
});
