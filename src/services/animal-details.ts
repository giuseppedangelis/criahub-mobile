import { handleSupabaseError, supabase } from "@/src/services/base";
import { REPRODUCTIVE_EVENT_LABELS } from "@/src/types/domain";

export interface AnimalDocumentItem {
  id: string;
  title: string;
  type: string;
  url: string;
  notes: string | null;
  created_at: string | null;
}

export interface AnimalVideoItem {
  id: string;
  title: string;
  url: string;
  type: string;
  visibility: string | null;
  caption: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
}

export interface AnimalAwardItem {
  id: string;
  evento: string;
  local: string | null;
  data_evento: string | null;
  categoria: string | null;
  colocacao: string | null;
  pontuacao: number | null;
  observacoes: string | null;
}

export interface AnimalHealthItem {
  id: string;
  data: string | null;
  tipo: string;
  veterinario: string | null;
  descricao: string | null;
  observacoes: string | null;
}

export interface AnimalLocationHistoryItem {
  id: string;
  changed_at: string | null;
  previous_location: string | null;
  new_location: string | null;
  reason: string | null;
  service_type: string | null;
  notes: string | null;
}

export interface AnimalOffspringItem {
  id: string;
  nome: string;
  registro: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  status: string | null;
}

export interface AnimalTimelineItem {
  id: string;
  type: string;
  title: string;
  date: string | null;
  details: string | null;
}

export interface AnimalExtendedDetails {
  documents: AnimalDocumentItem[];
  videos: AnimalVideoItem[];
  awards: AnimalAwardItem[];
  health: AnimalHealthItem[];
  locations: AnimalLocationHistoryItem[];
  offspring: AnimalOffspringItem[];
  timeline: AnimalTimelineItem[];
  warnings?: string[];
}

function formatReproductionEventType(value: string) {
  return REPRODUCTIVE_EVENT_LABELS[value] || value;
}

function formatExamResult(result: string | null, laboratorio: string | null) {
  if (result && laboratorio) return `${result} (${laboratorio})`;
  return result || laboratorio || null;
}

export const animalDetailsService = {
  async getByAnimal(animalId: string, harasId: string): Promise<AnimalExtendedDetails> {
    const queryDefs = [
      {
        key: "documents",
        query: supabase
          .from("documents")
          .select("id, titulo, tipo, file_url, observacoes, created_at")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("created_at", { ascending: false }),
      },
      {
        key: "reproduction_documents",
        query: supabase
          .from("reproduction_documents")
          .select("id, title, document_type, file_url, created_at")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("created_at", { ascending: false }),
      },
      {
        key: "animal_videos",
        query: supabase
          .from("animal_videos")
          .select("id, title, url, type, visibility, caption, duration, thumbnail_url, created_at")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("created_at", { ascending: false }),
      },
      {
        key: "videos",
        query: supabase
          .from("videos")
          .select("id, titulo, descricao, video_url, thumbnail_url, duracao, created_at")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("created_at", { ascending: false }),
      },
      {
        key: "awards",
        query: supabase
          .from("awards")
          .select("id, evento, local, data_evento, categoria, colocacao, pontuacao, observacoes")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("data_evento", { ascending: false }),
      },
      {
        key: "health_records",
        query: supabase
          .from("health_records")
          .select("id, data_procedimento, tipo, veterinario, descricao, observacoes")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("data_procedimento", { ascending: false }),
      },
      {
        key: "vaccines",
        query: supabase
          .from("vaccines")
          .select("id, data_aplicacao, nome_vacina, veterinario, observacoes")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("data_aplicacao", { ascending: false }),
      },
      {
        key: "exams",
        query: supabase
          .from("exams")
          .select("id, data_exame, tipo_exame, veterinario, resultado, laboratorio, observacoes")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("data_exame", { ascending: false }),
      },
      {
        key: "animal_location_history",
        query: supabase
          .from("animal_location_history")
          .select("id, changed_at, previous_location, new_location, reason, service_type, notes")
          .eq("haras_id", harasId)
          .eq("animal_id", animalId)
          .order("changed_at", { ascending: false }),
      },
      {
        key: "reproductive_events",
        query: supabase
          .from("reproductive_events")
          .select("id, event_type, event_date, observations")
          .eq("haras_id", harasId)
          .or(`animal_id.eq.${animalId},mare_id.eq.${animalId},stallion_id.eq.${animalId}`)
          .order("event_date", { ascending: false })
          .limit(40),
      },
      {
        key: "offspring",
        query: supabase
          .from("animals")
          .select("id, nome, registro, data_nascimento, sexo, status")
          .eq("haras_id", harasId)
          .or(`pai_id.eq.${animalId},mae_id.eq.${animalId}`)
          .order("data_nascimento", { ascending: false })
          .limit(60),
      },
    ] as const;

    const settled = await Promise.all(queryDefs.map((item) => item.query));
    const resultMap = new Map<string, any[]>();
    const warnings: string[] = [];

    settled.forEach((result, index) => {
      const key = queryDefs[index].key;
      if (result.error) {
        warnings.push(`Falha ao carregar ${key}: ${result.error.message}`);
        resultMap.set(key, []);
        return;
      }
      resultMap.set(key, result.data ?? []);
    });

    const documentsResData = resultMap.get("documents") ?? [];
    const reproductionDocsResData = resultMap.get("reproduction_documents") ?? [];
    const videosResData = resultMap.get("animal_videos") ?? [];
    const legacyVideosResData = resultMap.get("videos") ?? [];
    const awardsResData = resultMap.get("awards") ?? [];
    const healthResData = resultMap.get("health_records") ?? [];
    const vaccinesResData = resultMap.get("vaccines") ?? [];
    const examsResData = resultMap.get("exams") ?? [];
    const locationsResData = resultMap.get("animal_location_history") ?? [];
    const reproductiveEventsResData = resultMap.get("reproductive_events") ?? [];
    const offspringResData = resultMap.get("offspring") ?? [];

    const documents: AnimalDocumentItem[] = [
      ...documentsResData.map((item) => ({
        id: item.id,
        title: item.titulo,
        type: item.tipo,
        url: item.file_url,
        notes: item.observacoes ?? null,
        created_at: item.created_at ?? null,
      })),
      ...reproductionDocsResData.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.document_type,
        url: item.file_url,
        notes: null,
        created_at: item.created_at ?? null,
      })),
    ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    const videos: AnimalVideoItem[] = [
      ...videosResData.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: item.type,
        visibility: item.visibility ?? null,
        caption: item.caption ?? null,
        duration: item.duration ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        created_at: item.created_at ?? null,
      })),
      ...legacyVideosResData.map((item) => ({
        id: item.id,
        title: item.titulo,
        url: item.video_url,
        type: "Outro",
        visibility: null,
        caption: item.descricao ?? null,
        duration: item.duracao ? `${item.duracao}s` : null,
        thumbnail_url: item.thumbnail_url ?? null,
        created_at: item.created_at ?? null,
      })),
    ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    const awards: AnimalAwardItem[] = awardsResData.map((item) => ({
      id: item.id,
      evento: item.evento,
      local: item.local ?? null,
      data_evento: item.data_evento ?? null,
      categoria: item.categoria ?? null,
      colocacao: item.colocacao ?? null,
      pontuacao: item.pontuacao ?? null,
      observacoes: item.observacoes ?? null,
    }));

    const health: AnimalHealthItem[] = [
      ...healthResData.map((item) => ({
        id: item.id,
        data: item.data_procedimento ?? null,
        tipo: item.tipo,
        veterinario: item.veterinario ?? null,
        descricao: item.descricao ?? null,
        observacoes: item.observacoes ?? null,
      })),
      ...vaccinesResData.map((item) => ({
        id: item.id,
        data: item.data_aplicacao ?? null,
        tipo: `Vacina: ${item.nome_vacina}`,
        veterinario: item.veterinario ?? null,
        descricao: null,
        observacoes: item.observacoes ?? null,
      })),
      ...examsResData.map((item) => ({
        id: item.id,
        data: item.data_exame ?? null,
        tipo: `Exame: ${item.tipo_exame}`,
        veterinario: item.veterinario ?? null,
        descricao: formatExamResult(item.resultado ?? null, item.laboratorio ?? null),
        observacoes: item.observacoes ?? null,
      })),
    ].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

    const locations: AnimalLocationHistoryItem[] = locationsResData.map((item) => ({
      id: item.id,
      changed_at: item.changed_at ?? null,
      previous_location: item.previous_location ?? null,
      new_location: item.new_location ?? null,
      reason: item.reason ?? null,
      service_type: item.service_type ?? null,
      notes: item.notes ?? null,
    }));

    const offspring: AnimalOffspringItem[] = offspringResData.map((item) => ({
      id: item.id,
      nome: item.nome,
      registro: item.registro ?? null,
      data_nascimento: item.data_nascimento ?? null,
      sexo: item.sexo ?? null,
      status: item.status ?? null,
    }));

    const timeline: AnimalTimelineItem[] = [
      ...reproductiveEventsResData.map((item) => ({
        id: item.id,
        type: "Reprodução",
        title: formatReproductionEventType(item.event_type),
        date: item.event_date ?? null,
        details: item.observations ?? null,
      })),
      ...health.map((item) => ({
        id: `health-${item.id}`,
        type: "Saúde",
        title: item.tipo,
        date: item.data,
        details: item.descricao || item.observacoes,
      })),
      ...locations.map((item) => ({
        id: `location-${item.id}`,
        type: "Localização",
        title: `${item.previous_location || "-"} -> ${item.new_location || "-"}`,
        date: item.changed_at,
        details: item.reason || item.notes,
      })),
      ...awards.map((item) => ({
        id: `award-${item.id}`,
        type: "Premiação",
        title: item.evento,
        date: item.data_evento,
        details: item.colocacao || item.categoria,
      })),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return {
      documents,
      videos,
      awards,
      health,
      locations,
      offspring,
      timeline,
      warnings,
    };
  },
};
