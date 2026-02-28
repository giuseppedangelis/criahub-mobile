import { useLayoutEffect, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Activity, FileText, Pill, ShieldAlert, Weight } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { DateField } from "@/src/components/ui/DateField";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { TextField } from "@/src/components/ui/TextField";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  useAnimalExams,
  useHealthAuditLogs,
  useAnimalHealthRecords,
  useAnimalVaccines,
  useCreateExamMutation,
  useCreateHealthRecordMutation,
  useCreateVaccineMutation,
  useDeleteExamMutation,
  useDeleteHealthRecordMutation,
  useDeleteVaccineMutation,
  useUpdateExamMutation,
  useUpdateHealthRecordMutation,
  useUpdateVaccineMutation,
} from "@/src/hooks/useAnimalHealth";
import { useAnimalQuery } from "@/src/hooks/useAnimals";
import { isVeterinaryRole } from "@/src/lib/roles";
import { handleSupabaseError, supabase } from "@/src/services/base";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { ExamRecord, HealthRecord, VaccineRecord } from "@/src/types/domain";
import { formatCategoryLabel, formatDateBR } from "@/src/utils/format";

type ChartTab = "repro" | "procedures" | "vaccines" | "exams" | "biometry";

const TAB_OPTIONS: Array<{ id: ChartTab; label: string }> = [
  { id: "repro", label: "Reprodução" },
  { id: "procedures", label: "Procedimentos" },
  { id: "vaccines", label: "Vacinas" },
  { id: "exams", label: "Exames" },
  { id: "biometry", label: "Biometria" },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeReproType(type: string) {
  const map: Record<string, string> = {
    cobertura: "Cobertura",
    inseminacao: "Inseminação",
    coleta_ovulos: "Coleta de óvulos",
    transferencia_embriao: "Transferência de embrião",
    diagnostico_gestacao: "Diagnóstico de gestação",
    parto: "Parto",
    ovulacao: "Controle folicular",
  };
  return map[type] || type;
}

function isCondominioAnimal(owner: string | null) {
  if (!owner) return false;
  const normalized = owner
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("CONDOMINIO");
}

export function VetAnimalChartScreen() {
  const { role, harasId } = useAuth();
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const animalId = params.id || "";

  const [tab, setTab] = useState<ChartTab>("repro");
  const [menuOpen, setMenuOpen] = useState(false);
  const [procedureModalOpen, setProcedureModalOpen] = useState(false);
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "danger">("success");
  const [lastDeleted, setLastDeleted] = useState<
    | { type: "procedure"; payload: HealthRecord }
    | { type: "vaccine"; payload: VaccineRecord }
    | { type: "exam"; payload: ExamRecord }
    | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "procedure"; id: string; label: string }
    | { type: "vaccine"; id: string; label: string }
    | { type: "exam"; id: string; label: string }
    | null
  >(null);
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const [procedureType, setProcedureType] = useState("Consulta");
  const [procedureDate, setProcedureDate] = useState(todayIsoDate());
  const [procedureVet, setProcedureVet] = useState("");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [procedureNextDate, setProcedureNextDate] = useState("");
  const [procedureMedications, setProcedureMedications] = useState<
    Array<{ name: string; dosage: string; frequency: string; duration: string; notes?: string | null }>
  >([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");

  const [vaccineName, setVaccineName] = useState("");
  const [vaccineDate, setVaccineDate] = useState(todayIsoDate());
  const [vaccineNextDate, setVaccineNextDate] = useState("");
  const [vaccineLot, setVaccineLot] = useState("");
  const [vaccineVet, setVaccineVet] = useState("");

  const [examType, setExamType] = useState("");
  const [examDate, setExamDate] = useState(todayIsoDate());
  const [examResult, setExamResult] = useState("");
  const [examLab, setExamLab] = useState("");
  const [examVet, setExamVet] = useState("");
  const [examFiles, setExamFiles] = useState<Array<{ uri: string; file_name: string; mime_type?: string | null }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCurrentFile, setUploadCurrentFile] = useState<string | null>(null);

  const animalQuery = useAnimalQuery(animalId, Boolean(animalId));
  const proceduresQuery = useAnimalHealthRecords(animalId || null);
  const vaccinesQuery = useAnimalVaccines(animalId || null);
  const examsQuery = useAnimalExams(animalId || null);
  const auditQuery = useHealthAuditLogs(animalId || null);

  const createProcedureMutation = useCreateHealthRecordMutation();
  const createVaccineMutation = useCreateVaccineMutation();
  const createExamMutation = useCreateExamMutation();
  const updateProcedureMutation = useUpdateHealthRecordMutation();
  const deleteProcedureMutation = useDeleteHealthRecordMutation();
  const updateVaccineMutation = useUpdateVaccineMutation();
  const deleteVaccineMutation = useDeleteVaccineMutation();
  const updateExamMutation = useUpdateExamMutation();
  const deleteExamMutation = useDeleteExamMutation();

  const alertSource = (animalQuery.data?.observations || "").toLowerCase();
  const alerts =
    alertSource.includes("alerg") || alertSource.includes("penicilina")
      ? [animalQuery.data?.observations || "Atenção clínica registrada"]
      : [];

  const clinicalQuery = useQuery({
    queryKey: ["vet-chart", "clinical", animalId, harasId],
    enabled: Boolean(animalId && harasId),
    queryFn: async () => {
      const [reproRes, bioRes] = await Promise.all([
        supabase
          .from("reproductive_events")
          .select("id, event_type, event_date, status, observations")
          .eq("haras_id", harasId as string)
          .or(`animal_id.eq.${animalId},mare_id.eq.${animalId},stallion_id.eq.${animalId}`)
          .order("event_date", { ascending: false })
          .limit(40),
        supabase
          .from("animals")
          .select("weight, height, status_manejo, andamento")
          .eq("haras_id", harasId as string)
          .eq("id", animalId)
          .single(),
      ]);

      if (reproRes.error) handleSupabaseError(reproRes.error);
      if (bioRes.error) handleSupabaseError(bioRes.error);

      return {
        reproductiveEvents: reproRes.data ?? [],
        biometry: bioRes.data,
      };
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: animalQuery.data?.name || "Prontuário",
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.text,
    });
  }, [animalQuery.data?.name, navigation, theme.colors.surface, theme.colors.text]);

  if (!isVeterinaryRole(role)) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Prontuário Vet" description="Disponível apenas para perfil Veterinária." />
        </View>
      </AppScreen>
    );
  }

  if (!animalId || animalQuery.isLoading) {
    return (
      <AppScreen>
        <LoadingState fullscreen message="Carregando prontuário..." />
      </AppScreen>
    );
  }

  if (animalQuery.error || !animalQuery.data) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState title="Animal não encontrado" description="Não foi possível carregar este prontuário." />
        </View>
      </AppScreen>
    );
  }

  const animal = animalQuery.data;
  const isCondominio = isCondominioAnimal(animal.proprietario);
  const procedures = proceduresQuery.data ?? [];
  const vaccines = vaccinesQuery.data ?? [];
  const exams = examsQuery.data ?? [];

  const openVetAction = (action: "exam" | "insemination" | "batch") => {
    setMenuOpen(false);
    router.push({ pathname: "/(app)/(tabs)/veterinaria", params: { action, animalId } });
  };

  const onAddExamFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    const maxSize = 10 * 1024 * 1024;

    const validAssets = result.assets.filter((asset) => {
      if (asset.size && asset.size > maxSize) return false;
      if (asset.mimeType && !allowed.includes(asset.mimeType)) return false;
      return true;
    });

    if (validAssets.length === 0) {
      setFeedbackTone("danger");
      setFeedback("Nenhum arquivo válido. Use PDF/JPG/PNG até 10MB.");
      return;
    }

    setExamFiles((prev) => [
      ...prev,
      ...validAssets.map((asset) => ({
        uri: asset.uri,
        file_name: asset.name || `exame-${Date.now()}`,
        mime_type: asset.mimeType || null,
      })),
    ]);

    if (validAssets.length !== result.assets.length) {
      setFeedbackTone("danger");
      setFeedback("Alguns arquivos foram ignorados por formato/tamanho.");
    }
  };

  const openEditProcedure = (item: HealthRecord) => {
    setEditingProcedureId(item.id);
    setProcedureType(item.type);
    setProcedureDate(item.procedure_date);
    setProcedureVet(item.veterinarian || "");
    setProcedureDescription(item.description || "");
    setProcedureNextDate(item.next_date || "");
    setProcedureMedications(item.medications || []);
    setProcedureModalOpen(true);
  };

  const openEditVaccine = (item: VaccineRecord) => {
    setEditingVaccineId(item.id);
    setVaccineName(item.name);
    setVaccineDate(item.application_date);
    setVaccineNextDate(item.next_dose_date || "");
    setVaccineLot(item.lot || "");
    setVaccineVet(item.veterinarian || "");
    setVaccineModalOpen(true);
  };

  const openEditExam = (item: ExamRecord) => {
    setEditingExamId(item.id);
    setExamType(item.exam_type);
    setExamDate(item.exam_date);
    setExamResult(item.result || "");
    setExamLab(item.laboratory || "");
    setExamVet(item.veterinarian || "");
    setExamFiles([]);
    setExamModalOpen(true);
  };

  const onUndoLastDelete = () => {
    if (!lastDeleted || !animalId) return;

    if (lastDeleted.type === "procedure") {
      createProcedureMutation.mutate(
        {
          animal_id: lastDeleted.payload.animal_id,
          procedure_date: lastDeleted.payload.procedure_date,
          type: lastDeleted.payload.type,
          veterinarian: lastDeleted.payload.veterinarian,
          description: lastDeleted.payload.description,
          cost: lastDeleted.payload.cost,
          next_date: lastDeleted.payload.next_date,
          observations: lastDeleted.payload.observations,
          medications: lastDeleted.payload.medications,
        },
        {
          onSuccess: () => {
            setFeedbackTone("success");
            setFeedback("Procedimento restaurado.");
            setLastDeleted(null);
          },
        },
      );
      return;
    }

    if (lastDeleted.type === "vaccine") {
      createVaccineMutation.mutate(
        {
          animal_id: lastDeleted.payload.animal_id,
          name: lastDeleted.payload.name,
          application_date: lastDeleted.payload.application_date,
          next_dose_date: lastDeleted.payload.next_dose_date,
          lot: lastDeleted.payload.lot,
          manufacturer: lastDeleted.payload.manufacturer,
          veterinarian: lastDeleted.payload.veterinarian,
          observations: lastDeleted.payload.observations,
        },
        {
          onSuccess: () => {
            setFeedbackTone("success");
            setFeedback("Vacina restaurada.");
            setLastDeleted(null);
          },
        },
      );
      return;
    }

    createExamMutation.mutate(
      {
        animal_id: lastDeleted.payload.animal_id,
        exam_type: lastDeleted.payload.exam_type,
        exam_date: lastDeleted.payload.exam_date,
        veterinarian: lastDeleted.payload.veterinarian,
        laboratory: lastDeleted.payload.laboratory,
        result: lastDeleted.payload.result,
        observations: lastDeleted.payload.observations,
        file_urls: lastDeleted.payload.file_urls ?? [],
      },
      {
        onSuccess: () => {
          setFeedbackTone("success");
          setFeedback("Exame restaurado.");
          setLastDeleted(null);
        },
      },
    );
  };

  return (
    <AppScreen scroll>
      <Card>
        <Text style={[styles.animalName, { color: theme.colors.text }]}>{animal.name}</Text>
        <Text style={[styles.animalMeta, { color: theme.colors.textMuted }]}> 
          {animal.sex} • {formatCategoryLabel(animal.category)} • Registro {animal.registry_number || "-"}
        </Text>
        {animal.proprietario ? (
          <Text style={[styles.animalMeta, { color: theme.colors.textMuted }]}>Proprietário: {animal.proprietario}</Text>
        ) : null}
        {isCondominio ? (
          <View style={styles.condominioTag}>
            <Text style={styles.condominioTagLabel}>Condomínio</Text>
          </View>
        ) : null}
        {alerts.length ? (
          <View style={styles.alertsBlock}>
            {alerts.map((alert, index) => (
              <View key={`${alert}-${index}`} style={[styles.alertPill, { borderColor: theme.colors.warning }]}> 
                <ShieldAlert size={14} color={theme.colors.warning} />
                <Text style={[styles.alertText, { color: theme.colors.warning }]}>{alert}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.noAlerts, { color: theme.colors.textMuted }]}>Sem alertas clínicos cadastrados.</Text>
        )}
      </Card>

      <View style={styles.tabRow}>
        {TAB_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setTab(option.id)}
            style={({ pressed }) => [
              styles.tabChip,
              {
                borderColor: tab === option.id ? theme.colors.primary : theme.colors.border,
                backgroundColor: tab === option.id ? theme.colors.surfaceAlt : "transparent",
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.tabLabel, { color: theme.colors.text }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "repro" ? (
        <Card>
          {(clinicalQuery.data?.reproductiveEvents ?? []).map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{normalizeReproType(item.event_type)}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.event_date)} • {item.status || "-"}</Text>
            </View>
          ))}
          {(clinicalQuery.data?.reproductiveEvents ?? []).length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem eventos reprodutivos.</Text>
          ) : null}
        </Card>
      ) : null}

      {tab === "procedures" ? (
        <Card>
          {procedures.map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{item.type}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.procedure_date)} • {item.veterinarian || "-"}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Medicações: {item.medications?.length ?? 0}</Text>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => openEditProcedure(item)}>
                  <Text style={[styles.inlineActionText, { color: theme.colors.primary }]}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete({ type: "procedure", id: item.id, label: item.type })}
                >
                  <Text style={[styles.inlineActionText, { color: theme.colors.danger }]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {procedures.length === 0 ? <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem procedimentos registrados.</Text> : null}
        </Card>
      ) : null}

      {tab === "vaccines" ? (
        <Card>
          {vaccines.map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{item.name}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.application_date)} • Próx. dose: {formatDateBR(item.next_dose_date)}</Text>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => openEditVaccine(item)}>
                  <Text style={[styles.inlineActionText, { color: theme.colors.primary }]}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete({ type: "vaccine", id: item.id, label: item.name })}
                >
                  <Text style={[styles.inlineActionText, { color: theme.colors.danger }]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {vaccines.length === 0 ? <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem vacinas registradas.</Text> : null}
        </Card>
      ) : null}

      {tab === "exams" ? (
        <Card>
          {exams.map((item) => (
            <View key={item.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <View style={styles.row}>
                <FileText size={14} color={theme.colors.textMuted} />
                <Text style={[styles.lineTitle, { color: theme.colors.text }]}>{item.exam_type}</Text>
              </View>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{formatDateBR(item.exam_date)} • {item.result || "Sem resultado"}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>{item.laboratory || "Laboratório não informado"}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Arquivos: {item.file_urls?.length ?? 0}</Text>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => openEditExam(item)}>
                  <Text style={[styles.inlineActionText, { color: theme.colors.primary }]}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete({ type: "exam", id: item.id, label: item.exam_type })}
                >
                  <Text style={[styles.inlineActionText, { color: theme.colors.danger }]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {exams.length === 0 ? <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem exames registrados.</Text> : null}
        </Card>
      ) : null}

      {tab === "biometry" ? (
        <Card>
          <View style={styles.bioRow}><Weight size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Peso</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.weight ?? "Não informado"}</Text></View>
          <View style={styles.bioRow}><Activity size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Altura</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.height ?? "Não informado"}</Text></View>
          <View style={styles.bioRow}><Pill size={16} color={theme.colors.textMuted} /><Text style={[styles.bioLabel, { color: theme.colors.textMuted }]}>Escore/Andamento</Text><Text style={[styles.bioValue, { color: theme.colors.text }]}>{clinicalQuery.data?.biometry?.andamento || clinicalQuery.data?.biometry?.status_manejo || "Não informado"}</Text></View>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Últimas alterações</Text>
        {auditQuery.isLoading ? (
          <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Carregando auditoria...</Text>
        ) : auditQuery.data?.length ? (
          auditQuery.data.slice(0, 8).map((log) => (
            <View key={log.id} style={[styles.lineRow, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.lineTitle, { color: theme.colors.text }]}>[{log.action}] {log.table_name}</Text>
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>
                {new Date(log.changed_at).toLocaleString("pt-BR")} {log.changed_by_name ? `• ${log.changed_by_name}` : log.changed_by ? `• usuário ${log.changed_by.slice(0, 8)}` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Sem histórico recente de alterações.</Text>
        )}
      </Card>

      <Card>
        {feedback ? (
          <Text
            style={[
              styles.feedbackText,
              { color: feedbackTone === "success" ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {feedback}
          </Text>
        ) : null}
        {lastDeleted ? (
          <AppButton label="Desfazer última exclusão" variant="ghost" onPress={onUndoLastDelete} />
        ) : null}
        <AppButton label="Novo Registro" onPress={() => setMenuOpen(true)} />
      </Card>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Novo Registro</Text>
            <AppButton label="Controle Folicular" variant="ghost" onPress={() => openVetAction("exam")} />
            <AppButton label="Inseminação" variant="ghost" onPress={() => openVetAction("insemination")} />
            <AppButton label="Vacina/Vermífugo em lote" variant="ghost" onPress={() => openVetAction("batch")} />
            <AppButton
              label="Procedimento de saúde"
              variant="ghost"
              onPress={() => {
                setEditingProcedureId(null);
                setProcedureMedications([]);
                setMenuOpen(false);
                setProcedureModalOpen(true);
              }}
            />
            <AppButton
              label="Vacina individual"
              variant="ghost"
              onPress={() => {
                setEditingVaccineId(null);
                setMenuOpen(false);
                setVaccineModalOpen(true);
              }}
            />
            <AppButton
              label="Exame clínico"
              variant="ghost"
              onPress={() => {
                setEditingExamId(null);
                setMenuOpen(false);
                setExamModalOpen(true);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={procedureModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingProcedureId(null);
          setProcedureMedications([]);
          setProcedureModalOpen(false);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setEditingProcedureId(null);
              setProcedureMedications([]);
              setProcedureModalOpen(false);
            }}
          />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingProcedureId ? "Editar procedimento" : "Novo procedimento"}
            </Text>
            <TextField label="Tipo" value={procedureType} onChangeText={setProcedureType} />
            <DateField label="Data" value={procedureDate} onChange={setProcedureDate} />
            <DateField label="Próxima data" value={procedureNextDate} onChange={setProcedureNextDate} />
            <TextField label="Veterinário" value={procedureVet} onChangeText={setProcedureVet} />
            <TextField label="Descrição" value={procedureDescription} onChangeText={setProcedureDescription} multiline />
            <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Medicação estruturada</Text>
            <TextField label="Medicamento" value={medName} onChangeText={setMedName} />
            <TextField label="Dosagem" value={medDosage} onChangeText={setMedDosage} />
            <TextField label="Frequência" value={medFrequency} onChangeText={setMedFrequency} />
            <TextField label="Duração" value={medDuration} onChangeText={setMedDuration} />
            <AppButton
              label="Adicionar medicação"
              variant="ghost"
              onPress={() => {
                if (!medName.trim()) return;
                setProcedureMedications((prev) => [
                  ...prev,
                  {
                    name: medName.trim(),
                    dosage: medDosage.trim(),
                    frequency: medFrequency.trim(),
                    duration: medDuration.trim(),
                    notes: null,
                  },
                ]);
                setMedName("");
                setMedDosage("");
                setMedFrequency("");
                setMedDuration("");
              }}
            />
            {procedureMedications.map((med, index) => (
              <View key={`${med.name}-${index}`} style={[styles.fileRow, { borderColor: theme.colors.border }]}> 
                <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                  {med.name} • {med.dosage || "sem dosagem"}
                </Text>
                <Pressable onPress={() => setProcedureMedications((prev) => prev.filter((_, i) => i !== index))}>
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Remover</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setEditingProcedureId(null);
                  setProcedureMedications([]);
                  setProcedureModalOpen(false);
                }}
              />
              <AppButton
                label="Salvar"
                loading={createProcedureMutation.isPending}
                onPress={() => {
                  if (!animalId || !procedureType.trim()) return;
                  const payload = {
                    procedure_date: procedureDate,
                    type: procedureType,
                    veterinarian: procedureVet.trim() || null,
                    description: procedureDescription.trim() || null,
                    next_date: procedureNextDate || null,
                    medications: procedureMedications,
                  };

                  const onSuccess = () => {
                    setFeedbackTone("success");
                    setFeedback(
                      editingProcedureId
                        ? "Procedimento atualizado com sucesso."
                        : "Procedimento registrado com sucesso.",
                    );
                    setEditingProcedureId(null);
                    setProcedureMedications([]);
                    setProcedureModalOpen(false);
                  };

                  if (editingProcedureId) {
                    updateProcedureMutation.mutate(
                      {
                        id: editingProcedureId,
                        ...payload,
                      },
                      { onSuccess },
                    );
                  } else {
                    createProcedureMutation.mutate(
                      {
                        animal_id: animalId,
                        ...payload,
                      },
                      { onSuccess },
                    );
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={vaccineModalOpen} transparent animationType="fade" onRequestClose={() => setVaccineModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setVaccineModalOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingVaccineId ? "Editar vacina" : "Nova vacina"}
            </Text>
            <TextField label="Nome da vacina" value={vaccineName} onChangeText={setVaccineName} />
            <DateField label="Data aplicação" value={vaccineDate} onChange={setVaccineDate} />
            <DateField label="Próxima dose" value={vaccineNextDate} onChange={setVaccineNextDate} />
            <TextField label="Lote" value={vaccineLot} onChangeText={setVaccineLot} />
            <TextField label="Veterinário" value={vaccineVet} onChangeText={setVaccineVet} />
            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setVaccineModalOpen(false)} />
              <AppButton
                label="Salvar"
                loading={createVaccineMutation.isPending}
                onPress={() => {
                  if (!animalId || !vaccineName.trim()) return;
                  const payload = {
                    name: vaccineName.trim(),
                    application_date: vaccineDate,
                    next_dose_date: vaccineNextDate || null,
                    lot: vaccineLot.trim() || null,
                    veterinarian: vaccineVet.trim() || null,
                  };

                  const onSuccess = () => {
                    setFeedbackTone("success");
                    setFeedback(
                      editingVaccineId
                        ? "Vacina atualizada com sucesso."
                        : "Vacina registrada com sucesso.",
                    );
                    setEditingVaccineId(null);
                    setVaccineModalOpen(false);
                  };

                  if (editingVaccineId) {
                    updateVaccineMutation.mutate(
                      {
                        id: editingVaccineId,
                        ...payload,
                      },
                      { onSuccess },
                    );
                  } else {
                    createVaccineMutation.mutate(
                      {
                        animal_id: animalId,
                        ...payload,
                      },
                      { onSuccess },
                    );
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={examModalOpen} transparent animationType="fade" onRequestClose={() => { setExamModalOpen(false); setExamFiles([]); setUploadProgress(0); setUploadCurrentFile(null); }}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => { setExamModalOpen(false); setExamFiles([]); setUploadProgress(0); setUploadCurrentFile(null); }} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingExamId ? "Editar exame clínico" : "Novo exame clínico"}
            </Text>
            <TextField label="Tipo de exame" value={examType} onChangeText={setExamType} />
            <DateField label="Data" value={examDate} onChange={setExamDate} />
            <TextField label="Resultado" value={examResult} onChangeText={setExamResult} />
            <TextField label="Laboratório" value={examLab} onChangeText={setExamLab} />
            <TextField label="Veterinário" value={examVet} onChangeText={setExamVet} />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setExamModalOpen(false);
                  setExamFiles([]);
                  setUploadProgress(0);
                  setUploadCurrentFile(null);
                }}
              />
              <AppButton
                label="Salvar"
                loading={createExamMutation.isPending || updateExamMutation.isPending || uploadingFiles}
                onPress={() => {
                  if (!animalId || !examType.trim()) return;
                  setUploadingFiles(true);
                  const payload = {
                    exam_type: examType.trim(),
                    exam_date: examDate,
                    result: examResult.trim() || null,
                    laboratory: examLab.trim() || null,
                    veterinarian: examVet.trim() || null,
                    file_uris: examFiles,
                    on_upload_progress: (progress: {
                      completed_files: number;
                      total_files: number;
                      percent: number;
                      current_file_name?: string;
                    }) => {
                      setUploadProgress(progress.percent);
                      setUploadCurrentFile(progress.current_file_name || null);
                    },
                  };

                  const onSuccess = () => {
                    setFeedbackTone("success");
                    setFeedback(
                      editingExamId
                        ? "Exame atualizado com sucesso."
                        : "Exame registrado com sucesso.",
                    );
                    setEditingExamId(null);
                    setExamFiles([]);
                    setUploadProgress(0);
                    setUploadCurrentFile(null);
                    setExamModalOpen(false);
                  };

                  if (editingExamId) {
                    updateExamMutation.mutate(
                      {
                        id: editingExamId,
                        ...payload,
                      },
                      {
                        onSuccess: () => {
                          setUploadingFiles(false);
                          onSuccess();
                        },
                        onError: () => setUploadingFiles(false),
                      },
                    );
                  } else {
                    createExamMutation.mutate(
                      {
                        animal_id: animalId,
                        ...payload,
                      },
                      {
                        onSuccess: () => {
                          setUploadingFiles(false);
                          onSuccess();
                        },
                        onError: () => setUploadingFiles(false),
                      },
                    );
                  }
                }}
              />
            </View>

            <AppButton label="Anexar arquivo" variant="ghost" onPress={onAddExamFile} />
            {uploadingFiles ? (
              <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Enviando anexos: {uploadProgress}% {uploadCurrentFile ? `• ${uploadCurrentFile}` : ""}</Text>
            ) : null}
            {examFiles.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={[styles.fileRow, { borderColor: theme.colors.border }]}> 
                <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>{file.file_name}</Text>
                <Pressable onPress={() => setExamFiles((prev) => prev.filter((_, i) => i !== index))}>
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(confirmDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setConfirmDelete(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Confirmar exclusão</Text>
            <Text style={[styles.lineMeta, { color: theme.colors.textMuted }]}>Deseja excluir: {confirmDelete?.label}?</Text>
            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setConfirmDelete(null)} />
              <AppButton
                label="Excluir"
                onPress={() => {
                  if (!confirmDelete) return;

                  if (confirmDelete.type === "procedure") {
                    const snapshot = procedures.find((x) => x.id === confirmDelete.id) || null;
                    deleteProcedureMutation.mutate(confirmDelete.id, {
                      onSuccess: () => {
                        if (snapshot) setLastDeleted({ type: "procedure", payload: snapshot });
                        setFeedbackTone("success");
                        setFeedback("Procedimento removido.");
                        setConfirmDelete(null);
                      },
                    });
                    return;
                  }

                  if (confirmDelete.type === "vaccine") {
                    const snapshot = vaccines.find((x) => x.id === confirmDelete.id) || null;
                    deleteVaccineMutation.mutate(confirmDelete.id, {
                      onSuccess: () => {
                        if (snapshot) setLastDeleted({ type: "vaccine", payload: snapshot });
                        setFeedbackTone("success");
                        setFeedback("Vacina removida.");
                        setConfirmDelete(null);
                      },
                    });
                    return;
                  }

                  const snapshot = exams.find((x) => x.id === confirmDelete.id) || null;
                  deleteExamMutation.mutate(confirmDelete.id, {
                    onSuccess: () => {
                      if (snapshot) setLastDeleted({ type: "exam", payload: snapshot });
                      setFeedbackTone("success");
                      setFeedback("Exame removido.");
                      setConfirmDelete(null);
                    },
                  });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center" },
  animalName: { fontSize: 24, fontWeight: "700" },
  animalMeta: { fontSize: 13 },
  condominioTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B45309",
    backgroundColor: "#F59E0B22",
    borderRadius: 999,
    minHeight: 22,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  condominioTagLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  alertsBlock: { marginTop: 10, gap: 8 },
  alertPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, minHeight: 36, alignItems: "center", flexDirection: "row", gap: 8 },
  alertText: { fontSize: 12, fontWeight: "600", flex: 1 },
  noAlerts: { marginTop: 8, fontSize: 12 },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabChip: { borderWidth: 1, borderRadius: 999, minHeight: 34, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  lineRow: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8, gap: 2 },
  lineTitle: { fontSize: 14, fontWeight: "600" },
  lineMeta: { fontSize: 12 },
  inlineActions: { flexDirection: "row", gap: 14, marginTop: 4 },
  inlineActionText: { fontSize: 12, fontWeight: "700" },
  emptyLine: { fontSize: 13 },
  bioRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bioLabel: { fontSize: 13, width: 120 },
  bioValue: { fontSize: 13, fontWeight: "600", flex: 1 },
  feedbackText: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  modalRoot: { flex: 1, justifyContent: "center", padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalActions: { gap: 8, marginTop: 4 },
  fileRow: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fileName: { flex: 1, fontSize: 12 },
});
