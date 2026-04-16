import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { AnimalSearchSelect } from "@/src/components/ui/AnimalSearchSelect";
import { AppButton } from "@/src/components/ui/AppButton";
import { DateField } from "@/src/components/ui/DateField";
import { TextField } from "@/src/components/ui/TextField";
import {
  useCreateAnimalMutation,
  useUpdateAnimalMutation,
} from "@/src/hooks/useAnimals";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type {
  Animal,
  AnimalCategory,
  AnimalSex,
  AnimalStatus,
  CreateAnimalInput,
  UpdateAnimalInput,
} from "@/src/types/domain";

type FormMode = "create" | "edit";

interface AnimalFormModalProps {
  visible: boolean;
  onClose: () => void;
  mode: FormMode;
  harasId: string;
  animal?: Animal | null;
  onCreated?: (animal: Animal) => void;
}

interface FormState {
  name: string;
  registry: string;
  chip: string;
  brand: string;
  sex: AnimalSex;
  category: AnimalCategory;
  birthDate: string;
  coatColor: string;
  status: AnimalStatus;
  managementStatus: string;
  location: string;
  serviceType: string;
  criador: string;
  proprietario: string;
  originHaras: string;
  heightCm: string;
  weightKg: string;
  fatherId: string;
  fatherName: string;
  fatherSearch: string;
  motherId: string;
  motherName: string;
  motherSearch: string;
  observations: string;
}

const SEX_OPTIONS: { value: AnimalSex; label: string }[] = [
  { value: "Macho", label: "Macho" },
  { value: "Fêmea", label: "Fêmea" },
];

const CATEGORY_OPTIONS: { value: AnimalCategory; label: string }[] = [
  { value: "potro", label: "Potro" },
  { value: "potra", label: "Potra" },
  { value: "garanhao", label: "Garanhão" },
  { value: "egua", label: "Égua" },
  { value: "castrado", label: "Castrado" },
];

const STATUS_OPTIONS: { value: AnimalStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "provisorio", label: "Provisório" },
  { value: "em_servico", label: "Em serviço" },
  { value: "emprestado", label: "Transferido" },
  { value: "vendido", label: "Vendido" },
  { value: "morto", label: "Falecido" },
];

function normalizeString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCreateState(): FormState {
  return {
    name: "",
    registry: "",
    chip: "",
    brand: "",
    sex: "Fêmea",
    category: "potra",
    birthDate: "",
    coatColor: "",
    status: "ativo",
    managementStatus: "",
    location: "",
    serviceType: "",
    criador: "",
    proprietario: "",
    originHaras: "",
    heightCm: "",
    weightKg: "",
    fatherId: "",
    fatherName: "",
    fatherSearch: "",
    motherId: "",
    motherName: "",
    motherSearch: "",
    observations: "",
  };
}

function buildEditState(animal: Animal): FormState {
  return {
    name: animal.name ?? "",
    registry: animal.registry_number ?? "",
    chip: animal.chip_number ?? "",
    brand: animal.brand ?? "",
    sex: animal.sex,
    category: animal.category,
    birthDate: animal.birth_date ?? "",
    coatColor: animal.coat_color ?? "",
    status: animal.status,
    managementStatus: animal.management_status ?? "",
    location: animal.location ?? "",
    serviceType: animal.service_type ?? "",
    criador: animal.criador ?? "",
    proprietario: animal.proprietario ?? "",
    originHaras: animal.origin_haras ?? "",
    heightCm: animal.height != null ? String(animal.height) : "",
    weightKg: animal.weight != null ? String(animal.weight) : "",
    fatherId: animal.father_id ?? "",
    fatherName: animal.father_name ?? "",
    fatherSearch: animal.genealogy?.father?.name ?? animal.father_name ?? "",
    motherId: animal.mother_id ?? "",
    motherName: animal.mother_name ?? "",
    motherSearch: animal.genealogy?.mother?.name ?? animal.mother_name ?? "",
    observations: animal.observations ?? "",
  };
}

export function AnimalFormModal({
  visible,
  onClose,
  mode,
  harasId,
  animal,
  onCreated,
}: AnimalFormModalProps) {
  const { theme } = useAppTheme();
  const isEdit = mode === "edit" && !!animal;

  const updateMutation = useUpdateAnimalMutation(
    isEdit ? animal!.id : "",
    isEdit ? animal!.haras_id : harasId
  );
  const createMutation = useCreateAnimalMutation();

  const [form, setForm] = useState<FormState>(() =>
    isEdit ? buildEditState(animal!) : buildCreateState()
  );
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);
  const isSaving = isEdit ? updateMutation.isPending : createMutation.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("O nome do animal é obrigatório.");
      return;
    }

    const heightValue = parseNumber(form.heightCm);
    const weightValue = parseNumber(form.weightKg);
    if (form.heightCm.trim() && heightValue === null) {
      setError("Altura inválida.");
      return;
    }
    if (form.weightKg.trim() && weightValue === null) {
      setError("Peso inválido.");
      return;
    }

    try {
      if (isEdit) {
        const input: UpdateAnimalInput = {
          name: form.name.trim(),
          registry_number: normalizeString(form.registry),
          chip_number: normalizeString(form.chip),
          brand: normalizeString(form.brand),
          sex: form.sex,
          category: form.category,
          birth_date: normalizeString(form.birthDate),
          coat_color: normalizeString(form.coatColor),
          status: form.status,
          management_status: normalizeString(form.managementStatus),
          location: normalizeString(form.location),
          service_type: normalizeString(form.serviceType),
          criador: normalizeString(form.criador),
          proprietario: normalizeString(form.proprietario),
          origin_haras: normalizeString(form.originHaras),
          height: heightValue,
          weight: weightValue,
          father_id: normalizeString(form.fatherId),
          father_name: normalizeString(form.fatherName),
          mother_id: normalizeString(form.motherId),
          mother_name: normalizeString(form.motherName),
          observations: normalizeString(form.observations),
        };
        await updateMutation.mutateAsync(input);
      } else {
        const input: CreateAnimalInput = {
          haras_id: harasId,
          name: form.name.trim(),
          registry_number: normalizeString(form.registry),
          chip_number: normalizeString(form.chip),
          brand: normalizeString(form.brand),
          sex: form.sex,
          category: form.category,
          birth_date: normalizeString(form.birthDate),
          coat_color: normalizeString(form.coatColor),
          status: form.status,
          management_status: normalizeString(form.managementStatus),
          location: normalizeString(form.location),
          service_type: normalizeString(form.serviceType),
          criador: normalizeString(form.criador),
          proprietario: normalizeString(form.proprietario),
          origin_haras: normalizeString(form.originHaras),
          height: heightValue,
          weight: weightValue,
          father_id: normalizeString(form.fatherId),
          father_name: normalizeString(form.fatherName),
          mother_id: normalizeString(form.motherId),
          mother_name: normalizeString(form.motherName),
          observations: normalizeString(form.observations),
        };
        const created = await createMutation.mutateAsync(input);
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  };

  const title = isEdit ? "Editar animal" : "Cadastrar animal";
  const submitLabel = isEdit ? "Salvar" : "Cadastrar";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Identificação
            </Text>
            <TextField
              label="Nome *"
              value={form.name}
              onChangeText={(value) => setField("name", value)}
              placeholder="Nome do animal"
            />
            <TextField
              label="Registro ABCCMM"
              value={form.registry}
              onChangeText={(value) => setField("registry", value)}
              placeholder="Ex: 0001234"
            />
            <TextField
              label="Chip / RFID"
              value={form.chip}
              onChangeText={(value) => setField("chip", value)}
            />
            <TextField
              label="Marca / Ferro"
              value={form.brand}
              onChangeText={(value) => setField("brand", value)}
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Classificação
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Sexo</Text>
            <View style={styles.pillRow}>
              {SEX_OPTIONS.map((option) => {
                const active = form.sex === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setField("sex", option.value)}
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

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Categoria</Text>
            <View style={styles.pillRow}>
              {CATEGORY_OPTIONS.map((option) => {
                const active = form.category === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setField("category", option.value)}
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

            <DateField
              label="Data de nascimento"
              value={form.birthDate}
              onChange={(value) => setField("birthDate", value)}
            />
            <TextField
              label="Pelagem"
              value={form.coatColor}
              onChangeText={(value) => setField("coatColor", value)}
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Status</Text>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Situação</Text>
            <View style={styles.pillRow}>
              {STATUS_OPTIONS.map((option) => {
                const active = form.status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setField("status", option.value)}
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
            <TextField
              label="Status de manejo"
              value={form.managementStatus}
              onChangeText={(value) => setField("managementStatus", value)}
              placeholder="Ex: Em tratamento / Apto / Em treinamento"
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Localização
            </Text>
            <TextField
              label="Local atual"
              value={form.location}
              onChangeText={(value) => setField("location", value)}
              placeholder="Ex: Baia 3 / Pasto Norte"
            />
            <TextField
              label="Tipo de serviço"
              value={form.serviceType}
              onChangeText={(value) => setField("serviceType", value)}
              placeholder="Ex: Reprodução / Treinamento"
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Medidas</Text>
            <View style={styles.twoCol}>
              <View style={styles.twoColItem}>
                <TextField
                  label="Altura (cm)"
                  value={form.heightCm}
                  onChangeText={(value) => setField("heightCm", value)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.twoColItem}>
                <TextField
                  label="Peso (kg)"
                  value={form.weightKg}
                  onChangeText={(value) => setField("weightKg", value)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Propriedade
            </Text>
            <TextField
              label="Criador"
              value={form.criador}
              onChangeText={(value) => setField("criador", value)}
            />
            <TextField
              label="Proprietário"
              value={form.proprietario}
              onChangeText={(value) => setField("proprietario", value)}
            />
            <TextField
              label="Haras de origem"
              value={form.originHaras}
              onChangeText={(value) => setField("originHaras", value)}
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Genealogia
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Pai (buscar no plantel)
            </Text>
            <AnimalSearchSelect
              searchValue={form.fatherSearch}
              onSearchChange={(value) => setField("fatherSearch", value)}
              onSelect={(selected) => {
                setField("fatherId", selected.id);
                setField("fatherName", selected.name);
                setField("fatherSearch", selected.name);
              }}
              harasId={harasId}
              selectedId={form.fatherId}
              selectedLabelPrefix="Pai selecionado"
              onClearSelected={() => {
                setField("fatherId", "");
                setField("fatherSearch", "");
              }}
              filters={{ sex: "Macho" }}
              searchPlaceholder="Buscar pai"
              maxHeight={160}
            />
            <TextField
              label="Ou digite o nome do pai (se não cadastrado)"
              value={form.fatherName}
              onChangeText={(value) => setField("fatherName", value)}
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Mãe (buscar no plantel)
            </Text>
            <AnimalSearchSelect
              searchValue={form.motherSearch}
              onSearchChange={(value) => setField("motherSearch", value)}
              onSelect={(selected) => {
                setField("motherId", selected.id);
                setField("motherName", selected.name);
                setField("motherSearch", selected.name);
              }}
              harasId={harasId}
              selectedId={form.motherId}
              selectedLabelPrefix="Mãe selecionada"
              onClearSelected={() => {
                setField("motherId", "");
                setField("motherSearch", "");
              }}
              filters={{ sex: "Fêmea" }}
              searchPlaceholder="Buscar mãe"
              maxHeight={160}
            />
            <TextField
              label="Ou digite o nome da mãe (se não cadastrada)"
              value={form.motherName}
              onChangeText={(value) => setField("motherName", value)}
            />

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              Observações
            </Text>
            <TextField
              label="Notas"
              value={form.observations}
              onChangeText={(value) => setField("observations", value)}
              multiline
              numberOfLines={4}
              placeholder="Anotações livres sobre o animal"
            />

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: theme.colors.danger + "15",
                    borderColor: theme.colors.danger,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <View style={styles.footerButton}>
              <AppButton label="Cancelar" variant="ghost" onPress={onClose} />
            </View>
            <View style={styles.footerButton}>
              <AppButton
                label={isSaving ? "Salvando..." : submitLabel}
                onPress={handleSubmit}
                loading={isSaving}
                disabled={isSaving || !canSubmit}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    maxHeight: "94%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
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
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  twoColItem: {
    flex: 1,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
