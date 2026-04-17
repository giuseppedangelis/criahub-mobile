import {
  applyPagination,
  formatPaginatedResponse,
  handleSupabaseError,
  supabase,
} from "@/src/services/base";
import type {
  Animal,
  AnimalCategory,
  AnimalEnvironment,
  AnimalFilters,
  AnimalRelative,
  AnimalStatus,
  PaginatedResponse,
  PaginationParams,
  UpdateAnimalInput,
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
  Provisorio: "provisorio",
  "Provisório": "provisorio",
  Vendido: "vendido",
  Falecido: "morto",
  Transferido: "emprestado",
  "Em Servico": "em_servico",
  "Em Serviço": "em_servico",
};

const STATUS_MAPPING_APP_TO_DB: Record<AnimalStatus, string> = {
  ativo: "Ativo",
  provisorio: "Provisorio",
  vendido: "Vendido",
  morto: "Falecido",
  emprestado: "Transferido",
  em_servico: "Em Servico",
};

function resolveCategoryByAge(
  sex: "Macho" | "Fêmea" | null | undefined,
  birthDate: string | null | undefined,
  fallback: AnimalCategory
): AnimalCategory {
  if (!sex || !birthDate) return fallback;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return fallback;
  const today = new Date();
  const ageInMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (ageInMonths < 24) return sex === "Fêmea" ? "potra" : "potro";
  return sex === "Fêmea" ? "egua" : "garanhao";
}

const ANIMAL_SELECT_FIELDS = `
  id, haras_id, nome, registro, chip, marca,
  sexo, categoria, data_nascimento, pelagem,
  status, status_manejo, pai_id, mae_id, localizacao,
  haras_origem, tipo_servico, criador, proprietario,
  foto_url, images, documents, observacoes,
  father_name, mother_name, height, weight,
  is_at_haras, presence_manual_override, abccmm_rowid,
  created_at, updated_at
`;

function mapAnimalFromDb(row: Record<string, any>): Animal {
  const images = Array.isArray(row.images) ? row.images : [];
  const mainImage = row.foto_url || images[0] || null;
  const mappedCategory = CATEGORY_MAPPING_DB_TO_APP[row.categoria] ?? "potro";
  const category = resolveCategoryByAge(row.sexo ?? null, row.data_nascimento ?? null, mappedCategory);

  return {
    id: row.id,
    haras_id: row.haras_id,
    name: row.nome,
    registry_number: row.registro ?? null,
    chip_number: row.chip ?? null,
    brand: row.marca ?? null,
    sex: row.sexo,
    category,
    birth_date: row.data_nascimento ?? null,
    coat_color: row.pelagem ?? null,
    status: STATUS_MAPPING_DB_TO_APP[row.status] ?? "ativo",
    father_id: row.pai_id ?? null,
    mother_id: row.mae_id ?? null,
    father_name: row.father_name ?? null,
    mother_name: row.mother_name ?? null,
    location: row.localizacao ?? null,
    origin_haras: row.haras_origem ?? null,
    service_type: row.tipo_servico ?? null,
    management_status: row.status_manejo ?? null,
    criador: row.criador ?? null,
    proprietario: row.proprietario ?? null,
    observations: row.observacoes ?? null,
    main_image_url: mainImage,
    images: images.length > 0 ? images : mainImage ? [mainImage] : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    height: row.height != null ? Number(row.height) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    is_at_haras: row.is_at_haras ?? true,
    presence_manual_override: row.presence_manual_override ?? false,
    abccmm_rowid: row.abccmm_rowid ?? null,
    is_official: Boolean(row.abccmm_rowid),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    genealogy: {
      father: null,
      mother: null,
    },
  };
}

interface FetchRelativeResult {
  relative: AnimalRelative | null;
  warning: string | null;
}

async function fetchRelative(id: string | null, harasId: string): Promise<FetchRelativeResult> {
  if (!id) return { relative: null, warning: null };

  const { data, error } = await supabase
    .from("animals")
    .select("id, nome, registro")
    .eq("haras_id", harasId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // PGRST116 = "no rows" em maybeSingle já cai no data=null, error=null.
    // Qualquer erro real aqui é RLS ou network — não existe "not found" silencioso.
    return {
      relative: null,
      warning: "Pai/mãe pode existir em outro haras ou sem permissão de acesso.",
    };
  }

  if (!data) return { relative: null, warning: null };

  return {
    relative: {
      id: data.id,
      name: data.nome,
      registry_number: data.registro ?? null,
    },
    warning: null,
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

    let environmentAnimalIds: string[] | null = null;
    const environment = filters.environment as AnimalEnvironment | undefined;

    if (environment === "condominio") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: shares, error: sharesError } = await (supabase as any)
        .from("animal_ownership_shares")
        .select("animal_id")
        .eq("haras_id", filters.haras_id)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (sharesError) handleSupabaseError(sharesError);

      environmentAnimalIds = Array.from(new Set((shares || []).map((row: { animal_id: string }) => row.animal_id)));
      if (environmentAnimalIds.length === 0) {
        return formatPaginatedResponse([], 0, pagination);
      }
    }

    if (environment === "vinculacao") {
      const { data: queueRows, error: queueError } = await (supabase as any)
        .from("animal_link_queue")
        .select("provisional_animal_id")
        .eq("haras_id", filters.haras_id)
        .eq("status", "pending");

      if (queueError) handleSupabaseError(queueError);

      environmentAnimalIds = Array.from(new Set((queueRows || []).map((row: { provisional_animal_id: string }) => row.provisional_animal_id)));
      if (environmentAnimalIds.length === 0) {
        return formatPaginatedResponse([], 0, pagination);
      }
    }

    let query = supabase
      .from("animals")
      .select(ANIMAL_SELECT_FIELDS, { count: "exact" })
      .eq("haras_id", filters.haras_id);

    if (environment === "oficial") {
      query = query.not("abccmm_rowid", "is", null);
    }

    if (environment === "avulsos") {
      query = query.is("abccmm_rowid", null);
    }

    if (environmentAnimalIds && environmentAnimalIds.length > 0) {
      query = query.in("id", environmentAnimalIds);
    }

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

    const [fatherResult, motherResult] = await Promise.all([
      fetchRelative(data.pai_id ?? null, data.haras_id),
      fetchRelative(data.mae_id ?? null, data.haras_id),
    ]);

    const mapped = mapAnimalFromDb(data);

    // RLS-03: agrega warnings em genealogy.warnings quando o fetch foi
    // bloqueado (RLS ou network). Nenhuma UI consome ainda — apenas
    // disponibiliza para futuros consumidores (RLS-04).
    const warnings = [fatherResult.warning, motherResult.warning].filter(
      (value): value is string => Boolean(value)
    );

    return {
      ...mapped,
      father_name: mapped.father_name ?? fatherResult.relative?.name ?? null,
      mother_name: mapped.mother_name ?? motherResult.relative?.name ?? null,
      genealogy: {
        father: fatherResult.relative,
        mother: motherResult.relative,
        ...(warnings.length > 0 ? { warnings } : {}),
      },
    };
  },

  async update(id: string, harasId: string, input: UpdateAnimalInput): Promise<void> {
    if (!id || !harasId) {
      throw new Error("Animal ou haras inválido para atualizar.");
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) payload.nome = input.name;
    if (input.registry_number !== undefined) payload.registro = input.registry_number || null;
    if (input.chip_number !== undefined) payload.chip = input.chip_number || null;
    if (input.brand !== undefined) payload.marca = input.brand || null;
    if (input.sex !== undefined) payload.sexo = input.sex;
    if (input.category !== undefined) {
      payload.categoria = CATEGORY_MAPPING[input.category] ?? input.category;
    }
    if (input.birth_date !== undefined) payload.data_nascimento = input.birth_date || null;
    if (input.coat_color !== undefined) payload.pelagem = input.coat_color || null;
    if (input.status !== undefined) {
      payload.status = STATUS_MAPPING_APP_TO_DB[input.status] ?? input.status;
    }
    if (input.management_status !== undefined) payload.status_manejo = input.management_status || null;
    if (input.location !== undefined) payload.localizacao = input.location || null;
    if (input.service_type !== undefined) payload.tipo_servico = input.service_type || null;
    if (input.father_id !== undefined) payload.pai_id = input.father_id || null;
    if (input.mother_id !== undefined) payload.mae_id = input.mother_id || null;
    if (input.father_name !== undefined) payload.father_name = input.father_name || null;
    if (input.mother_name !== undefined) payload.mother_name = input.mother_name || null;
    if (input.criador !== undefined) payload.criador = input.criador || null;
    if (input.proprietario !== undefined) payload.proprietario = input.proprietario || null;
    if (input.origin_haras !== undefined) payload.haras_origem = input.origin_haras || null;
    if (input.height !== undefined) payload.height = input.height;
    if (input.weight !== undefined) payload.weight = input.weight;
    if (input.observations !== undefined) payload.observacoes = input.observations || null;

    const { error } = await supabase
      .from("animals")
      .update(payload)
      .eq("id", id)
      .eq("haras_id", harasId);

    if (error) handleSupabaseError(error);
  },

  async setPresence(animalId: string, harasId: string, isAtHaras: boolean): Promise<void> {
    if (!animalId || !harasId) {
      throw new Error("Animal ou haras inválido para atualizar presença.");
    }
    const { error } = await supabase
      .from("animals")
      .update({
        is_at_haras: isAtHaras,
        presence_manual_override: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", animalId)
      .eq("haras_id", harasId);

    if (error) handleSupabaseError(error);
  },
};
