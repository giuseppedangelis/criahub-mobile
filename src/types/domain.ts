export type ThemeMode = "light" | "dark";

export type UserRole =
  | "admin"
  | "criador"
  | "breeder"
  | "veterinario"
  | "vet"
  | "assessor"
  | "acessor"
  | "advisor"
  | "employee"
  | "peao"
  | "funcionario"
  | "unknown";

export type AnimalSex = "Macho" | "Fêmea";

export type AnimalCategory =
  | "potro"
  | "potra"
  | "garanhao"
  | "egua"
  | "castrado";

export type AnimalStatus = "ativo" | "vendido" | "morto" | "emprestado";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  haras_id: string | null;
  phone: string | null;
}

export interface AnimalRelative {
  id: string;
  name: string;
  registry_number: string | null;
}

export interface AnimalGenealogyBasic {
  father: AnimalRelative | null;
  mother: AnimalRelative | null;
}

export interface Animal {
  id: string;
  haras_id: string;
  name: string;
  registry_number: string | null;
  chip_number: string | null;
  brand: string | null;
  sex: AnimalSex;
  category: AnimalCategory;
  birth_date: string | null;
  coat_color: string | null;
  status: AnimalStatus;
  father_id: string | null;
  mother_id: string | null;
  father_name: string | null;
  mother_name: string | null;
  location: string | null;
  observations: string | null;
  main_image_url: string | null;
  images: string[];
  documents: string[];
  created_at: string | null;
  updated_at: string | null;
  genealogy: AnimalGenealogyBasic;
}

export interface AnimalFilters {
  haras_id?: string;
  search?: string;
  sex?: AnimalSex;
  category?: AnimalCategory;
  status?: AnimalStatus;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReproductionEventItem {
  id: string;
  haras_id?: string;
  animal_id?: string | null;
  mare_id?: string | null;
  stallion_id?: string | null;
  event_type: string;
  event_date: string;
  status: string | null;
  veterinarian: string | null;
  protocol?: string | null;
  semen_type?: string | null;
  animal_name: string | null;
  mare_name: string | null;
  stallion_name: string | null;
  observations: string | null;
}

export interface GestationItem {
  id: string;
  haras_id?: string;
  mare_id?: string | null;
  stallion_id?: string | null;
  status: string | null;
  start_date?: string | null;
  data_diagnostico: string | null;
  data_prevista_parto: string | null;
  data_parto?: string | null;
  egua_name: string | null;
  garanhao_name: string | null;
  observacoes: string | null;
}

export interface ReproductionStats {
  total_events: number;
  total_gestations: number;
  active_gestations: number;
  births: number;
  abortions: number;
}

export interface CreateReproductiveEventInput {
  haras_id: string;
  animal_id: string;
  event_type: string;
  event_date: string;
  stallion_id?: string | null;
  mare_id?: string | null;
  veterinarian?: string | null;
  protocol?: string | null;
  observations?: string | null;
  status?: string | null;
  semen_type?: string | null;
}

export interface CreateGestationInput {
  haras_id: string;
  mare_id: string;
  stallion_id?: string | null;
  reproductive_event_id?: string | null;
  start_date: string;
  confirmation_date?: string | null;
  expected_birth_date?: string | null;
  status?: string | null;
  veterinarian?: string | null;
  observations?: string | null;
}

export interface AgendaEventItem {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  tipo: string;
  status: string | null;
  local: string | null;
  responsavel: string | null;
  animal_id: string | null;
  animal_name: string | null;
}

export interface VetTaskItem {
  id: string;
  animal_id: string | null;
  animal_name: string | null;
  task_type: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  priority: string;
  source_table: string | null;
  source_id: string | null;
}

export type TaskStatus = "pendente" | "em_andamento" | "concluida";
export type TaskPriority = "baixa" | "media" | "alta";
export type TaskExecutionOutcome = "concluida" | "incompleta" | "nao_realizada" | "reagendada";

export interface TaskAttachment {
  kind: "photo" | "document";
  url: string;
  name: string;
  mime_type: string | null;
  uploaded_at: string;
}

export interface TaskExecutionItem {
  id: string;
  task_id: string;
  haras_id: string;
  executed_by: string;
  outcome: TaskExecutionOutcome;
  notes: string | null;
  attachments: TaskAttachment[];
  executed_at: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  haras_id: string;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  observations: string | null;
  task_type: string | null;
  animal_id: string | null;
  responsible_id: string | null;
  documents: TaskAttachment[];
  photos: TaskAttachment[];
  started_at: string | null;
  completed_at: string | null;
  last_execution_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  animal_name: string | null;
  responsible_name: string | null;
}

export interface TaskListFilters {
  haras_id: string;
  responsible_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  from_due_date?: string;
  to_due_date?: string;
}

export interface CreateTaskInput {
  haras_id: string;
  title: string;
  due_date: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  observations?: string | null;
  task_type?: string | null;
  animal_id?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  due_date?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  observations?: string | null;
  task_type?: string | null;
  animal_id?: string | null;
  responsible_id?: string | null;
}

export interface TaskExecutionDraftAttachment {
  kind: "photo" | "document";
  uri: string;
  file_name: string;
  mime_type?: string | null;
}

export interface ExecuteTaskInput {
  task_id: string;
  haras_id: string;
  executed_by: string;
  outcome: TaskExecutionOutcome;
  notes?: string | null;
  next_due_date?: string | null;
  attachments?: TaskExecutionDraftAttachment[];
}

export interface TeamMemberOption {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

export interface VetDashboardData {
  todayTasks: VetTaskItem[];
  waitingDiagnosis: number;
  inTreatment: number;
  reproductiveCycle: number;
}

export interface ReproductiveExamInput {
  haras_id: string;
  animal_id: string;
  exam_at?: string;
  follicle_right_size: number | null;
  follicle_left_size: number | null;
  uterine_edema: number;
  cervix_score: number;
  intrauterine_fluid: boolean;
  induction: boolean;
  inductor: "HCG" | "Deslorelin" | null;
  notes: string | null;
  veterinarian_name: string | null;
  created_by?: string | null;
}

export interface BreedingEventInput {
  haras_id: string;
  mare_id: string;
  stallion_id: string;
  method: "IA" | "Monta" | "Transfer";
  semen_type: "Fresco" | "Resfriado" | "Congelado";
  motility_quality: "Ótima" | "Boa" | "Regular" | "Ruim";
  motility_percent: number | null;
  straws_used: number;
  event_at?: string;
  notes: string | null;
  veterinarian_name: string | null;
  created_by?: string | null;
}

export interface SemenEntryInput {
  haras_id: string;
  stallion_id: string;
  units_paletas: number;
  semen_type: "Fresco" | "Resfriado" | "Congelado";
  reason: string | null;
  notes: string | null;
  created_by?: string | null;
}

export interface HealthBatchInput {
  haras_id: string;
  procedure_type: "Vacina" | "Vermífugo";
  procedure_name: string;
  application_date: string;
  lot_code: string | null;
  expiration_date: string | null;
  notes: string | null;
  veterinarian_name: string | null;
  animal_ids: string[];
  created_by?: string | null;
}

export interface LavageOutcomeInput {
  task_id: string;
  haras_id: string;
  outcome: "positivo" | "negativo";
  action_when_positive?: "transferir" | "congelar";
  recipient_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface TreatmentInput {
  haras_id: string;
  animal_id: string;
  procedure_date: string;
  type: string;
  description: string | null;
  medication: string | null;
  dosage: string | null;
  next_date: string | null;
  veterinarian_name: string | null;
  notes: string | null;
  created_by?: string | null;
}

export interface HealthRecord {
  id: string;
  animal_id: string;
  haras_id: string;
  procedure_date: string;
  type: string;
  veterinarian: string | null;
  description: string | null;
  cost: number | null;
  next_date: string | null;
  observations: string | null;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface VaccineRecord {
  id: string;
  animal_id: string;
  haras_id: string;
  name: string;
  application_date: string;
  next_dose_date: string | null;
  lot: string | null;
  manufacturer: string | null;
  veterinarian: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamRecord {
  id: string;
  animal_id: string;
  haras_id: string;
  exam_type: string;
  exam_date: string;
  veterinarian: string | null;
  laboratory: string | null;
  result: string | null;
  file_urls: string[] | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthRecordInput {
  animal_id: string;
  haras_id?: string;
  procedure_date: string;
  type: string;
  veterinarian?: string | null;
  description?: string | null;
  cost?: number | null;
  next_date?: string | null;
  observations?: string | null;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string | null;
  }>;
}

export interface UpdateHealthRecordInput {
  id: string;
  procedure_date?: string;
  type?: string;
  veterinarian?: string | null;
  description?: string | null;
  cost?: number | null;
  next_date?: string | null;
  observations?: string | null;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string | null;
  }>;
}

export interface CreateVaccineInput {
  animal_id: string;
  haras_id?: string;
  name: string;
  application_date: string;
  next_dose_date?: string | null;
  lot?: string | null;
  manufacturer?: string | null;
  veterinarian?: string | null;
  observations?: string | null;
}

export interface UpdateVaccineInput {
  id: string;
  name?: string;
  application_date?: string;
  next_dose_date?: string | null;
  lot?: string | null;
  manufacturer?: string | null;
  veterinarian?: string | null;
  observations?: string | null;
}

export interface CreateExamInput {
  animal_id: string;
  haras_id?: string;
  exam_type: string;
  exam_date: string;
  veterinarian?: string | null;
  laboratory?: string | null;
  result?: string | null;
  observations?: string | null;
  file_urls?: string[];
  file_uris?: Array<{ uri: string; file_name: string; mime_type?: string | null }>;
  on_upload_progress?: (progress: {
    completed_files: number;
    total_files: number;
    percent: number;
    current_file_name?: string;
  }) => void;
}

export interface UpdateExamInput {
  id: string;
  exam_type?: string;
  exam_date?: string;
  veterinarian?: string | null;
  laboratory?: string | null;
  result?: string | null;
  observations?: string | null;
  file_urls?: string[] | null;
  file_uris?: Array<{ uri: string; file_name: string; mime_type?: string | null }>;
  on_upload_progress?: (progress: {
    completed_files: number;
    total_files: number;
    percent: number;
    current_file_name?: string;
  }) => void;
}

export interface HealthAuditLog {
  id: string;
  table_name: "health_records" | "vaccines" | "exams";
  record_id: string;
  haras_id: string;
  animal_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

export interface HealthSummary {
  totalAnimals: number;
  vaccinatedUpToDate: number;
  vaccineOverdue: number;
  activeAlerts: number;
}

export interface FieldBirthInput {
  haras_id: string;
  mare_id: string | null;
  mare_name: string;
  unknown_mare: boolean;
  foal_sex: "Macho" | "Fêmea";
  photo_uri: string;
  note: string | null;
  audio_url?: string | null;
  gps?: { latitude: number; longitude: number } | null;
  reported_by: string;
  created_by?: string | null;
}

export interface FieldIssueInput {
  haras_id: string;
  issue_kind: "Animal Doente/Ferido" | "Estrutura" | "Falta de Comida" | "Outros";
  animal_id: string | null;
  animal_name: string | null;
  photo_uri: string | null;
  note: string | null;
  audio_url?: string | null;
  gps?: { latitude: number; longitude: number } | null;
  reported_by: string;
  created_by?: string | null;
}
