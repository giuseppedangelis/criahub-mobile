import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Plus, Star, Trash2, X } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { DateField } from "@/src/components/ui/DateField";
import { TextField } from "@/src/components/ui/TextField";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type {
  AnimalOwnershipShare,
  OwnershipShareDraft,
  OwnershipTerminationType,
} from "@/src/types/domain";

interface OwnershipEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (shares: OwnershipShareDraft[]) => void | Promise<void>;
  initialShares: AnimalOwnershipShare[];
  defaultOwnerName: string | null;
  animalBirthDate: string | null;
  isSaving: boolean;
}

interface ShareRow {
  tempId: string;
  id?: string;
  owner_name: string;
  percentage: string;
  is_primary: boolean;
}

interface CondominioTerms {
  start_date: string;
  physical_location: string;
  is_external: boolean;
  termination_type: OwnershipTerminationType | "";
  termination_date: string;
  termination_age_years: string;
}

function randomTempId() {
  return `share-${Math.random().toString(36).slice(2, 10)}`;
}

function buildInitialRows(
  initialShares: AnimalOwnershipShare[],
  defaultOwnerName: string | null
): ShareRow[] {
  if (initialShares.length > 0) {
    return initialShares.map((share) => ({
      tempId: randomTempId(),
      id: share.id,
      owner_name: share.owner_name,
      percentage: String(share.percentage ?? 0),
      is_primary: Boolean(share.is_primary),
    }));
  }
  return [
    {
      tempId: randomTempId(),
      owner_name: defaultOwnerName ?? "",
      percentage: "100",
      is_primary: true,
    },
  ];
}

function buildInitialTerms(initialShares: AnimalOwnershipShare[]): CondominioTerms {
  const ref = initialShares.find((s) => s.termination_type) ?? initialShares[0];
  return {
    start_date: ref?.start_date ?? "",
    physical_location: ref?.physical_location ?? "",
    is_external: Boolean(ref?.is_external),
    termination_type: (ref?.termination_type as OwnershipTerminationType) ?? "",
    termination_date: ref?.termination_date ?? "",
    termination_age_years:
      ref?.termination_age_years != null ? String(ref.termination_age_years) : "",
  };
}

function calcRemainingLabel(terms: CondominioTerms, birthDate: string | null): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let due: Date | null = null;

  if (terms.termination_type === "date" && terms.termination_date) {
    due = new Date(`${terms.termination_date}T00:00:00`);
  } else if (
    terms.termination_type === "age" &&
    terms.termination_age_years &&
    birthDate
  ) {
    const years = Number.parseInt(terms.termination_age_years, 10);
    if (!Number.isFinite(years) || years <= 0) return null;
    const birth = new Date(`${birthDate}T00:00:00`);
    birth.setFullYear(birth.getFullYear() + years);
    due = birth;
  }

  if (!due) return null;

  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) {
    return `Vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}.`;
  }
  if (days === 0) return "Vence hoje";
  if (days <= 45) return `Devolver em ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  if (months <= 18) {
    if (terms.termination_type === "age") {
      return `Faltam ~${months} mês(es) para completar ${terms.termination_age_years} anos`;
    }
    return `Devolver em ~${months} mês(es)`;
  }
  const yrs = (days / 365).toFixed(1);
  return `Devolver em ~${yrs} anos`;
}

export function OwnershipEditorModal({
  visible,
  onClose,
  onSave,
  initialShares,
  defaultOwnerName,
  animalBirthDate,
  isSaving,
}: OwnershipEditorModalProps) {
  const { theme } = useAppTheme();
  const [rows, setRows] = useState<ShareRow[]>(() =>
    buildInitialRows(initialShares, defaultOwnerName)
  );
  const [terms, setTerms] = useState<CondominioTerms>(() => buildInitialTerms(initialShares));
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalPct = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const parsed = Number.parseFloat(row.percentage.replace(",", "."));
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [rows]
  );
  const isCondominio = rows.length >= 2;
  const remainingLabel = useMemo(
    () => calcRemainingLabel(terms, animalBirthDate),
    [terms, animalBirthDate]
  );

  const updateRow = (tempId: string, patch: Partial<ShareRow>) => {
    setRows((current) =>
      current.map((row) => (row.tempId === tempId ? { ...row, ...patch } : row))
    );
  };

  const handleSetPrimary = (tempId: string) => {
    setRows((current) =>
      current.map((row) => ({ ...row, is_primary: row.tempId === tempId }))
    );
  };

  const handleAddShare = () => {
    setRows((current) => [
      ...current,
      {
        tempId: randomTempId(),
        owner_name: "",
        percentage: "0",
        is_primary: current.length === 0,
      },
    ]);
  };

  const handleRemoveShare = (tempId: string) => {
    setRows((current) => {
      const next = current.filter((row) => row.tempId !== tempId);
      if (next.length === 0) {
        return [
          {
            tempId: randomTempId(),
            owner_name: defaultOwnerName ?? "",
            percentage: "100",
            is_primary: true,
          },
        ];
      }
      if (!next.some((row) => row.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setValidationError(null);

    const parsedRows = rows.map((row) => ({
      id: row.id,
      owner_name: row.owner_name.trim(),
      percentage: Number.parseFloat(row.percentage.replace(",", ".")),
      is_primary: row.is_primary,
    }));

    if (parsedRows.some((s) => !s.owner_name)) {
      setValidationError("Preencha o nome de todos os cotistas.");
      return;
    }
    if (parsedRows.some((s) => !Number.isFinite(s.percentage) || s.percentage <= 0)) {
      setValidationError("Toda cota precisa ter percentual maior que zero.");
      return;
    }
    if (!parsedRows.some((s) => s.is_primary)) {
      setValidationError("Defina um dono principal.");
      return;
    }
    const seen = new Set<string>();
    for (const s of parsedRows) {
      const key = s.owner_name.toUpperCase();
      if (seen.has(key)) {
        setValidationError("Não repita o mesmo cotista.");
        return;
      }
      seen.add(key);
    }
    if (Math.abs(totalPct - 100) > 0.01) {
      setValidationError("A soma das cotas precisa fechar em 100%.");
      return;
    }

    const sharedTerms = {
      start_date: terms.start_date || null,
      termination_type: null as OwnershipTerminationType | null,
      termination_date: null as string | null,
      termination_age_years: null as number | null,
      physical_location: terms.physical_location.trim() || null,
      is_external: terms.is_external,
    };

    if (isCondominio && terms.termination_type) {
      if (terms.termination_type === "date") {
        if (!terms.termination_date) {
          setValidationError("Informe a data de término do condomínio.");
          return;
        }
        sharedTerms.termination_type = "date";
        sharedTerms.termination_date = terms.termination_date;
      } else if (terms.termination_type === "age") {
        const yrs = Number.parseInt(terms.termination_age_years, 10);
        if (!Number.isFinite(yrs) || yrs <= 0) {
          setValidationError("Informe a idade de término.");
          return;
        }
        if (!animalBirthDate) {
          setValidationError(
            "O animal precisa ter data de nascimento para usar critério por idade."
          );
          return;
        }
        sharedTerms.termination_type = "age";
        sharedTerms.termination_age_years = yrs;
      }
    }

    const drafts: OwnershipShareDraft[] = parsedRows.map((s) => ({
      id: s.id,
      owner_name: s.owner_name,
      percentage: s.percentage,
      is_primary: s.is_primary,
      ...sharedTerms,
    }));

    await onSave(drafts);
  };

  const pctColor =
    Math.abs(totalPct - 100) <= 0.01 ? theme.colors.success : theme.colors.warning;

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
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Gerenciar propriedade
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: theme.colors.textMuted }]}>
                A soma das cotas deve totalizar 100%.
              </Text>
              <Text style={[styles.summaryValue, { color: pctColor }]}>
                Total: {totalPct.toFixed(2)}%
              </Text>
            </View>

            {rows.map((row, index) => (
              <View
                key={row.tempId}
                style={[
                  styles.rowCard,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    Cotista {index + 1}
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveShare(row.tempId)}
                    style={({ pressed }) => [styles.removeButton, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Trash2 size={14} color={theme.colors.danger} />
                    <Text style={[styles.removeLabel, { color: theme.colors.danger }]}>
                      {row.id ? "Encerrar" : "Remover"}
                    </Text>
                  </Pressable>
                </View>

                <TextField
                  label="Nome do cotista"
                  placeholder="Nome completo"
                  value={row.owner_name}
                  onChangeText={(value) => updateRow(row.tempId, { owner_name: value })}
                />

                <View style={styles.twoCol}>
                  <View style={styles.twoColItem}>
                    <TextField
                      label="Participação (%)"
                      value={row.percentage}
                      onChangeText={(value) => updateRow(row.tempId, { percentage: value })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.twoColItem}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                      Dono principal
                    </Text>
                    <Pressable
                      onPress={() => handleSetPrimary(row.tempId)}
                      style={({ pressed }) => [
                        styles.primaryToggle,
                        {
                          backgroundColor: row.is_primary
                            ? theme.colors.warning + "20"
                            : theme.colors.inputBackground,
                          borderColor: row.is_primary
                            ? theme.colors.warning
                            : theme.colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Star
                        size={14}
                        color={
                          row.is_primary ? theme.colors.warning : theme.colors.textMuted
                        }
                        fill={row.is_primary ? theme.colors.warning : "transparent"}
                      />
                      <Text
                        style={{
                          color: row.is_primary
                            ? theme.colors.warning
                            : theme.colors.textMuted,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {row.is_primary ? "Principal" : "Definir"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            <AppButton
              label="Adicionar cotista"
              variant="ghost"
              icon={Plus}
              onPress={handleAddShare}
            />

            {isCondominio ? (
              <View
                style={[
                  styles.condoCard,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.condoTitle, { color: theme.colors.text }]}>
                  Condições do condomínio
                </Text>

                <DateField
                  label="Data de início"
                  value={terms.start_date}
                  onChange={(value) => setTerms((t) => ({ ...t, start_date: value }))}
                />

                <TextField
                  label="Localização física (com quem/onde)"
                  placeholder="Ex: Haras São João / Fazenda do sócio"
                  value={terms.physical_location}
                  onChangeText={(value) =>
                    setTerms((t) => ({ ...t, physical_location: value }))
                  }
                />

                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  Critério de término
                </Text>
                <View style={styles.pillRow}>
                  {(
                    [
                      { value: "", label: "Sem prazo" },
                      { value: "date", label: "Por data" },
                      { value: "age", label: "Por idade" },
                    ] as const
                  ).map((opt) => {
                    const active = terms.termination_type === opt.value;
                    return (
                      <Pressable
                        key={opt.label}
                        onPress={() =>
                          setTerms((t) => ({
                            ...t,
                            termination_type: opt.value as OwnershipTerminationType | "",
                          }))
                        }
                        style={({ pressed }) => [
                          styles.pill,
                          {
                            backgroundColor: active
                              ? theme.colors.primary
                              : theme.colors.inputBackground,
                            borderColor: active
                              ? theme.colors.primary
                              : theme.colors.border,
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
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {terms.termination_type === "date" ? (
                  <DateField
                    label="Data de término"
                    value={terms.termination_date}
                    onChange={(value) =>
                      setTerms((t) => ({ ...t, termination_date: value }))
                    }
                  />
                ) : null}

                {terms.termination_type === "age" ? (
                  <TextField
                    label="Idade (anos)"
                    value={terms.termination_age_years}
                    onChangeText={(value) =>
                      setTerms((t) => ({ ...t, termination_age_years: value }))
                    }
                    keyboardType="number-pad"
                    placeholder="Ex: 4"
                  />
                ) : null}

                {remainingLabel ? (
                  <View
                    style={[
                      styles.remainingBox,
                      {
                        backgroundColor: theme.colors.info + "15",
                        borderColor: theme.colors.info,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.info, fontSize: 13, fontWeight: "600" }}>
                      {remainingLabel}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
                    Animal está fora do haras enquanto em sociedade
                  </Text>
                  <Switch
                    value={terms.is_external}
                    onValueChange={(value) =>
                      setTerms((t) => ({ ...t, is_external: value }))
                    }
                    trackColor={{
                      true: theme.colors.warning,
                      false: theme.colors.surfaceAlt,
                    }}
                    thumbColor={theme.colors.primary}
                  />
                </View>
              </View>
            ) : null}

            {validationError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.colors.danger + "15", borderColor: theme.colors.danger },
                ]}
              >
                <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>
                  {validationError}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerButton}>
              <AppButton label="Cancelar" variant="ghost" onPress={onClose} />
            </View>
            <View style={styles.footerButton}>
              <AppButton
                label={isSaving ? "Salvando..." : "Salvar"}
                onPress={handleSubmit}
                loading={isSaving}
                disabled={isSaving}
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
    maxHeight: "92%",
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
    gap: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  removeLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  twoColItem: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  primaryToggle: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  condoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  condoTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  remainingBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  switchLabel: {
    fontSize: 13,
    flex: 1,
    lineHeight: 17,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingTop: 12,
  },
  footerButton: {
    flex: 1,
  },
});
