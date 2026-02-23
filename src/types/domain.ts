export type ThemeMode = "light" | "dark";

export type UserRole =
  | "admin"
  | "criador"
  | "breeder"
  | "assessor"
  | "acessor"
  | "advisor"
  | "employee"
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
