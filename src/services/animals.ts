import {
  applyPagination,
  formatPaginatedResponse,
  handleSupabaseError,
  supabase,
} from "@/src/services/base";
import type {
  Animal,
  AnimalCategory,
  AnimalFilters,
  AnimalRelative,
  AnimalStatus,
  PaginatedResponse,
  PaginationParams,
} from "@/src/types/domain";

const CATEGORY_MAPPING: Record<AnimalCategory, string> = {
  potro: "Potro",
  potra: "Potranca",
  garanhao: "Garanhão",
  egua: "Égua",
  castrado: "Castrado",
};

const CATEGORY_MAPPING_DB_TO_APP: Record<string, AnimalCategory> = {
  Potro: "potro",
  Potranca: "potra",
  "Garanhão": "garanhao",
  "Égua": "egua",
  Castrado: "castrado",
};

const STATUS_MAPPING_DB_TO_APP: Record<string, AnimalStatus> = {
  Ativo: "ativo",
  Vendido: "vendido",
  Falecido: "morto",
  Transferido: "emprestado",
};

const STATUS_MAPPING_APP_TO_DB: Record<AnimalStatus, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  morto: "Falecido",
  emprestado: "Transferido",
};

const ANIMAL_SELECT_FIELDS = `
  id, haras_id, nome, registro, chip, marca,
  sexo, categoria, data_nascimento, pelagem,
  status, pai_id, mae_id, localizacao,
  foto_url, images, documents, observacoes,
  father_name, mother_name,
  created_at, updated_at
`;

function mapAnimalFromDb(row: Record<string, any>): Animal {
  const images = Array.isArray(row.images) ? row.images : [];
  const mainImage = row.foto_url || images[0] || null;

  return {
    id: row.id,
    haras_id: row.haras_id,
    name: row.nome,
    registry_number: row.registro ?? null,
    chip_number: row.chip ?? null,
    brand: row.marca ?? null,
    sex: row.sexo,
    category: CATEGORY_MAPPING_DB_TO_APP[row.categoria] ?? "potro",
    birth_date: row.data_nascimento ?? null,
    coat_color: row.pelagem ?? null,
    status: STATUS_MAPPING_DB_TO_APP[row.status] ?? "ativo",
    father_id: row.pai_id ?? null,
    mother_id: row.mae_id ?? null,
    father_name: row.father_name ?? null,
    mother_name: row.mother_name ?? null,
    location: row.localizacao ?? null,
    observations: row.observacoes ?? null,
    main_image_url: mainImage,
    images: images.length > 0 ? images : mainImage ? [mainImage] : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    genealogy: {
      father: null,
      mother: null,
    },
  };
}

async function fetchRelative(id: string | null): Promise<AnimalRelative | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("animals")
    .select("id, nome, registro")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.nome,
    registry_number: data.registro ?? null,
  };
}

export const animalsService = {
  async list(
    filters: AnimalFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Animal>> {
    if (!filters.haras_id) {
      return formatPaginatedResponse([], 0, pagination);
    }

    let query = supabase
      .from("animals")
      .select(ANIMAL_SELECT_FIELDS, { count: "exact" })
      .eq("haras_id", filters.haras_id);

    if (filters.search) {
      query = query.or(
        `nome.ilike.%${filters.search}%,registro.ilike.%${filters.search}%`
      );
    }

    if (filters.sex) {
      query = query.eq("sexo", filters.sex);
    }

    if (filters.category) {
      query = query.eq("categoria", CATEGORY_MAPPING[filters.category]);
    }

    if (filters.status) {
      query = query.eq("status", STATUS_MAPPING_APP_TO_DB[filters.status]);
    }

    query = query.order("nome", { ascending: true });
    query = applyPagination(query, pagination);

    const { data, error, count } = await query;

    if (error) handleSupabaseError(error);

    const mappedData = (data || []).map((item) => mapAnimalFromDb(item));
    return formatPaginatedResponse(mappedData, count || 0, pagination);
  },

  async getById(id: string): Promise<Animal | null> {
    const { data, error } = await supabase
      .from("animals")
      .select(ANIMAL_SELECT_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    if (!data) return null;

    const [father, mother] = await Promise.all([
      fetchRelative(data.pai_id ?? null),
      fetchRelative(data.mae_id ?? null),
    ]);

    const mapped = mapAnimalFromDb(data);

    return {
      ...mapped,
      father_name: mapped.father_name ?? father?.name ?? null,
      mother_name: mapped.mother_name ?? mother?.name ?? null,
      genealogy: {
        father,
        mother,
      },
    };
  },
};
