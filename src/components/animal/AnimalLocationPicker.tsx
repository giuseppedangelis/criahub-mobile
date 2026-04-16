import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OptionSearchSelect } from "@/src/components/ui/OptionSearchSelect";
import { useHarasLocationSettingsQuery } from "@/src/hooks/useHarasSettings";
import { useAppTheme } from "@/src/theme/ThemeContext";
import {
  SERVICE_TYPE_OPTIONS,
  type AnimalLocationType,
  type AnimalServiceType,
} from "@/src/lib/animal-location";

interface AnimalLocationPickerProps {
  harasId: string;
  locationType: AnimalLocationType;
  locationName: string;
  serviceType: AnimalServiceType | "";
  onChange: (next: {
    locationType: AnimalLocationType;
    locationName: string;
    serviceType: AnimalServiceType | "";
  }) => void;
}

const LOCATION_TYPE_OPTIONS: { value: AnimalLocationType; label: string }[] = [
  { value: "Baia", label: "Baia" },
  { value: "Pasto", label: "Pasto" },
  { value: "Servico", label: "Serviço" },
];

export function AnimalLocationPicker({
  harasId,
  locationType,
  locationName,
  serviceType,
  onChange,
}: AnimalLocationPickerProps) {
  const { theme } = useAppTheme();
  const { data: settings, isLoading } = useHarasLocationSettingsQuery(harasId);

  const options = useMemo(() => {
    if (!settings) return [] as { id: string; label: string }[];
    const source =
      locationType === "Baia"
        ? settings.baias
        : locationType === "Pasto"
        ? settings.pastos
        : settings.servicos;
    return source.map((item) => ({ id: item, label: item }));
  }, [settings, locationType]);

  // Se a localização atual não está mais na lista (ex: removida nas configs web),
  // injeta como opção "extra" para não ficar órfão visualmente.
  const mergedOptions = useMemo(() => {
    if (!locationName) return options;
    const alreadyListed = options.some((opt) => opt.id === locationName);
    if (alreadyListed) return options;
    return [{ id: locationName, label: `${locationName} (fora da lista)` }, ...options];
  }, [options, locationName]);

  useEffect(() => {
    // Limpa o nome quando troca para um tipo onde o nome atual não existe.
    if (!settings || !locationName) return;
    const source =
      locationType === "Baia"
        ? settings.baias
        : locationType === "Pasto"
        ? settings.pastos
        : settings.servicos;
    if (!source.includes(locationName)) {
      // Mantém o valor atual como opção extra (mergedOptions já cobre isso).
    }
  }, [locationType, locationName, settings]);

  return (
    <View style={styles.container}>
      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Tipo de localização</Text>
      <View style={styles.pillRow}>
        {LOCATION_TYPE_OPTIONS.map((option) => {
          const active = locationType === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() =>
                onChange({
                  locationType: option.value,
                  locationName: "",
                  serviceType: option.value === "Servico" ? serviceType || "Outro" : "",
                })
              }
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.inputBackground,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.primaryText : theme.colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <OptionSearchSelect
        label={
          locationType === "Baia"
            ? "Baia"
            : locationType === "Pasto"
            ? "Pasto"
            : "Local do serviço"
        }
        options={mergedOptions}
        value={locationName}
        onChange={(value) =>
          onChange({ locationType, locationName: value, serviceType })
        }
        placeholder={
          isLoading
            ? "Carregando ambientes..."
            : options.length === 0
            ? "Cadastre ambientes na versão web"
            : "Buscar ambiente"
        }
        emptyText={
          options.length === 0
            ? "Nenhum ambiente cadastrado. Use as configurações do haras (web) para adicionar."
            : "Nenhum ambiente encontrado."
        }
      />

      {locationType === "Servico" ? (
        <>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Tipo de serviço</Text>
          <View style={styles.pillRow}>
            {SERVICE_TYPE_OPTIONS.map((option) => {
              const active = serviceType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    onChange({
                      locationType,
                      locationName,
                      serviceType: option.value,
                    })
                  }
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? theme.colors.primaryText : theme.colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
