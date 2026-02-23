import { handleSupabaseError, supabase } from "@/src/services/base";

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
}

function formatReproductionEventType(value: string) {
  const labels: Record<string, string> = {
    cobertura: "Cobertura",
    inseminacao: "Inseminação",
    coleta_ovulos: "Coleta de Óvulos",
    transferencia_embriao: "Transferência de Embrião",
    diagnostico_gestacao: "Diagnóstico de Gestação",
    parto: "Parto",
  };
  return labels[value] || value;
}

function formatExamResult(result: string | null, laboratorio: string | null) {
  if (result && laboratorio) return `${result} (${laboratorio})`;
  return result || laboratorio || null;
}

export const animalDetailsService = {
  async getByAnimal(animalId: string, harasId: string): Promise<AnimalExtendedDetails> {
    const [
      documentsRes,
      reproductionDocsRes,
      videosRes,
      legacyVideosRes,
      awardsRes,
      healthRes,
      vaccinesRes,
      examsRes,
      locationsRes,
      reproductiveEventsRes,
      offspringRes,
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id, titulo, tipo, file_url, observacoes, created_at")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("created_at", { ascending: false }),
      supabase
        .from("reproduction_documents")
        .select("id, title, document_type, file_url, created_at")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("created_at", { ascending: false }),
      supabase
        .from("animal_videos")
        .select("id, title, url, type, visibility, caption, duration, thumbnail_url, created_at")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("created_at", { ascending: false }),
      supabase
        .from("videos")
        .select("id, titulo, descricao, video_url, thumbnail_url, duracao, created_at")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("created_at", { ascending: false }),
      supabase
        .from("awards")
        .select("id, evento, local, data_evento, categoria, colocacao, pontuacao, observacoes")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("data_evento", { ascending: false }),
      supabase
        .from("health_records")
        .select("id, data_procedimento, tipo, veterinario, descricao, observacoes")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("data_procedimento", { ascending: false }),
      supabase
        .from("vaccines")
        .select("id, data_aplicacao, nome_vacina, veterinario, observacoes")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("data_aplicacao", { ascending: false }),
      supabase
        .from("exams")
        .select("id, data_exame, tipo_exame, veterinario, resultado, laboratorio, observacoes")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("data_exame", { ascending: false }),
      supabase
        .from("animal_location_history")
        .select("id, changed_at, previous_location, new_location, reason, service_type, notes")
        .eq("haras_id", harasId)
        .eq("animal_id", animalId)
        .order("changed_at", { ascending: false }),
      supabase
        .from("reproductive_events")
        .select("id, event_type, event_date, observations")
        .eq("haras_id", harasId)
        .or(`animal_id.eq.${animalId},mare_id.eq.${animalId},stallion_id.eq.${animalId}`)
        .order("event_date", { ascending: false })
        .limit(40),
      supabase
        .from("animals")
        .select("id, nome, registro, data_nascimento, sexo, status")
        .eq("haras_id", harasId)
        .or(`pai_id.eq.${animalId},mae_id.eq.${animalId}`)
        .order("data_nascimento", { ascending: false })
        .limit(60),
    ]);

    const allErrors = [
      documentsRes.error,
      reproductionDocsRes.error,
      videosRes.error,
      legacyVideosRes.error,
      awardsRes.error,
      healthRes.error,
      vaccinesRes.error,
      examsRes.error,
      locationsRes.error,
      reproductiveEventsRes.error,
      offspringRes.error,
    ].filter(Boolean);

    if (allErrors.length > 0) {
      handleSupabaseError(allErrors[0] as any);
    }

    const documents: AnimalDocumentItem[] = [
      ...(documentsRes.data ?? []).map((item) => ({
        id: item.id,
        title: item.titulo,
        type: item.tipo,
        url: item.file_url,
        notes: item.observacoes ?? null,
        created_at: item.created_at ?? null,
      })),
      ...(reproductionDocsRes.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.document_type,
        url: item.file_url,
        notes: null,
        created_at: item.created_at ?? null,
      })),
    ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    const videos: AnimalVideoItem[] = [
      ...(videosRes.data ?? []).map((item) => ({
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
      ...(legacyVideosRes.data ?? []).map((item) => ({
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

    const awards: AnimalAwardItem[] = (awardsRes.data ?? []).map((item) => ({
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
      ...(healthRes.data ?? []).map((item) => ({
        id: item.id,
        data: item.data_procedimento ?? null,
        tipo: item.tipo,
        veterinario: item.veterinario ?? null,
        descricao: item.descricao ?? null,
        observacoes: item.observacoes ?? null,
      })),
      ...(vaccinesRes.data ?? []).map((item) => ({
        id: item.id,
        data: item.data_aplicacao ?? null,
        tipo: `Vacina: ${item.nome_vacina}`,
        veterinario: item.veterinario ?? null,
        descricao: null,
        observacoes: item.observacoes ?? null,
      })),
      ...(examsRes.data ?? []).map((item) => ({
        id: item.id,
        data: item.data_exame ?? null,
        tipo: `Exame: ${item.tipo_exame}`,
        veterinario: item.veterinario ?? null,
        descricao: formatExamResult(item.resultado ?? null, item.laboratorio ?? null),
        observacoes: item.observacoes ?? null,
      })),
    ].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

    const locations: AnimalLocationHistoryItem[] = (locationsRes.data ?? []).map((item) => ({
      id: item.id,
      changed_at: item.changed_at ?? null,
      previous_location: item.previous_location ?? null,
      new_location: item.new_location ?? null,
      reason: item.reason ?? null,
      service_type: item.service_type ?? null,
      notes: item.notes ?? null,
    }));

    const offspring: AnimalOffspringItem[] = (offspringRes.data ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
      registro: item.registro ?? null,
      data_nascimento: item.data_nascimento ?? null,
      sexo: item.sexo ?? null,
      status: item.status ?? null,
    }));

    const timeline: AnimalTimelineItem[] = [
      ...(reproductiveEventsRes.data ?? []).map((item) => ({
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
    };
  },
};
