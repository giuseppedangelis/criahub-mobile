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
  event_type: string;
  event_date: string;
  status: string | null;
  veterinarian: string | null;
  animal_name: string | null;
  mare_name: string | null;
  stallion_name: string | null;
  observations: string | null;
}

export interface GestationItem {
  id: string;
  status: string | null;
  data_diagnostico: string | null;
  data_prevista_parto: string | null;
  egua_name: string | null;
  garanhao_name: string | null;
  observacoes: string | null;
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
