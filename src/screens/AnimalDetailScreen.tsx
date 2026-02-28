import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useAnimalDetailsQuery } from "@/src/hooks/useAnimalDetails";
import { useAnimalQuery } from "@/src/hooks/useAnimals";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatCategoryLabel, formatDateBR, formatStatusLabel } from "@/src/utils/format";

type DetailTab =
  | "overview"
  | "photos"
  | "videos"
  | "awards"
  | "location"
  | "health"
  | "genealogy"
  | "offspring"
  | "documents"
  | "history";

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Visão Geral" },
  { id: "photos", label: "Fotos" },
  { id: "videos", label: "Vídeos" },
  { id: "awards", label: "Premiações" },
  { id: "location", label: "Localização" },
  { id: "health", label: "Saúde" },
  { id: "genealogy", label: "Genealogia" },
  { id: "offspring", label: "Filhos" },
  { id: "documents", label: "Documentos" },
  { id: "history", label: "Histórico" },
];

function getVideoThumbnail(url: string, fallback: string | null) {
  if (fallback) return fallback;
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/i);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }
  return null;
}

function formatHealthType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function supportsInlineVideo(url: string) {
  if (!url) return false;
  const blockedDomains = /youtube\.com|youtu\.be|vimeo\.com/i;
  if (blockedDomains.test(url)) return false;
  return true;
}

function isCondominioAnimal(owner: string | null) {
  if (!owner) return false;
  const normalized = owner
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("CONDOMINIO");
}

function InlineVideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url }, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      style={styles.inlineVideoPlayer}
      player={player}
      nativeControls
      allowsFullscreen
      contentFit="contain"
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>;
}

function MetaBadge({ label }: { label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.metaBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}> 
      <Text style={[styles.metaBadgeText, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

export function AnimalDetailScreen() {
  const { theme } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const modalViewportWidth = Math.min(screenWidth - 32, 460);
  const modalViewportHeight = Math.min(Math.max(screenHeight * 0.68, 300), 520);
  const navigation = useNavigation();
  const photoPagerRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id?: string }>();
  const animalId = useMemo(() => params.id || "", [params.id]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: animal, isLoading, error } = useAnimalQuery(animalId, Boolean(animalId));
  const {
    data: extra,
    isLoading: isExtraLoading,
    error: extraError,
  } = useAnimalDetailsQuery(animal?.id, animal?.haras_id);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: animal?.name || "Detalhe do animal",
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text,
    });
  }, [animal?.name, navigation, theme.colors.surface, theme.colors.text]);

  const photoUrls = useMemo(() => {
    if (animal?.images && animal.images.length > 0) return animal.images;
    if (animal?.main_image_url) return [animal.main_image_url];
    return [];
  }, [animal?.images, animal?.main_image_url]);

  const videos = extra?.videos ?? [];
  const extraWarnings = extra?.warnings ?? [];
  const selectedVideo = videos.find((item) => item.id === selectedVideoId) ?? null;
  const isCondominio = isCondominioAnimal(animal?.proprietario ?? null);

  useEffect(() => {
    if (!isPhotoModalVisible) return;
    const timer = setTimeout(() => {
      photoPagerRef.current?.scrollTo({ x: activePhotoIndex * modalViewportWidth, animated: false });
    }, 10);
    return () => clearTimeout(timer);
  }, [activePhotoIndex, isPhotoModalVisible, modalViewportWidth]);

  useEffect(() => {
    if (activeTab !== "videos") return;
    if (videos.length === 0) {
      setSelectedVideoId(null);
      return;
    }
    const selectedExists = videos.some((item) => item.id === selectedVideoId);
    if (!selectedVideoId || !selectedExists) {
      setSelectedVideoId(videos[0].id);
    }
  }, [activeTab, selectedVideoId, videos]);

  if (!animalId) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Animal não identificado"
            description="O código do animal não foi informado."
          />
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingState fullscreen message="Carregando ficha do animal..." />
      </AppScreen>
    );
  }

  if (error || !animal) {
    return (
      <AppScreen>
        <View style={styles.centered}>
          <EmptyState
            title="Falha ao carregar animal"
            description={
              error instanceof Error ? error.message : "Não foi possível carregar este animal."
            }
          />
        </View>
      </AppScreen>
    );
  }

  const openExternalUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return;
    await Linking.openURL(url);
  };

  const onOpenPhoto = (index: number) => {
    setActivePhotoIndex(index);
    setIsPhotoModalVisible(true);
  };

  const onClosePhotoModal = () => {
    setIsPhotoModalVisible(false);
  };

  const onPreviousPhoto = () => {
    const nextIndex = Math.max(0, activePhotoIndex - 1);
    setActivePhotoIndex(nextIndex);
    photoPagerRef.current?.scrollTo({ x: nextIndex * modalViewportWidth, animated: true });
  };

  const onNextPhoto = () => {
    const nextIndex = Math.min(photoUrls.length - 1, activePhotoIndex + 1);
    setActivePhotoIndex(nextIndex);
    photoPagerRef.current?.scrollTo({ x: nextIndex * modalViewportWidth, animated: true });
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.topHeader}>
            <View style={styles.titleBlock}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{animal.name}</Text>
              <Text style={[styles.registry, { color: theme.colors.textMuted }]}> 
                Registro: {animal.registry_number || "Não informado"}
              </Text>
            </View>
            <StatusBadge status={animal.status} />
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}> 
            Ficha completa do animal, alinhada ao conteúdo da versão web.
          </Text>
          <View style={styles.badgesRow}>
            <MetaBadge label={animal.sex} />
            <MetaBadge label={formatCategoryLabel(animal.category)} />
            <MetaBadge label={animal.location || "Sem localização"} />
            {isCondominio ? <MetaBadge label="Condomínio" /> : null}
          </View>
        </Card>

        <Card>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiBox, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Vídeos</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{extra?.videos.length || 0}</Text>
            </View>
            <View style={[styles.kpiBox, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Documentos</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{extra?.documents.length || 0}</Text>
            </View>
            <View style={[styles.kpiBox, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Saúde</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{extra?.health.length || 0}</Text>
            </View>
            <View style={[styles.kpiBox, { borderColor: theme.colors.border }]}> 
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Eventos</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{extra?.timeline.length || 0}</Text>
            </View>
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {DETAIL_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={({ pressed }) => [
                  styles.tabButton,
                  {
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
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
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isExtraLoading ? <LoadingState message="Carregando dados complementares..." /> : null}
        {extraError ? (
          <Card>
            <Text style={[styles.warningText, { color: theme.colors.warning }]}> 
              Alguns blocos não foram carregados: {extraError instanceof Error ? extraError.message : "erro"}
            </Text>
          </Card>
        ) : null}
        {!extraError && extraWarnings.length > 0 ? (
          <Card>
            <Text style={[styles.warningText, { color: theme.colors.warning }]}> 
              Alguns blocos estão indisponíveis no momento.
            </Text>
          </Card>
        ) : null}

        {activeTab === "overview" ? (
          <Card>
            <SectionTitle title="Informações Básicas" />
            <DetailRow label="Sexo" value={animal.sex} />
            <DetailRow label="Categoria" value={formatCategoryLabel(animal.category)} />
            <DetailRow label="Nascimento" value={formatDateBR(animal.birth_date)} />
            <DetailRow label="Idade" value={animal.birth_date ? formatDateBR(animal.birth_date) : "Não informado"} />
            <DetailRow label="Pelagem" value={animal.coat_color || "Não informado"} />
            <DetailRow label="Marca/Ferro" value={animal.brand || "Não informado"} />
            <DetailRow label="Chip RFID" value={animal.chip_number || "Não informado"} />
            <DetailRow label="Status" value={formatStatusLabel(animal.status)} />
            <DetailRow label="Proprietário" value={animal.proprietario || "Não informado"} />
            <DetailRow label="Criador" value={animal.criador || "Não informado"} />
            <DetailRow label="Haras Atual" value="Meu Haras" />
            <DetailRow label="Haras de origem" value={animal.origin_haras || "Não informado"} />
            <DetailRow label="Tipo de serviço" value={animal.service_type || "Não informado"} />
            <DetailRow label="Status de manejo" value={animal.management_status || "Não informado"} />
            <DetailRow label="Local atual" value={animal.location || "Não informado"} />
            <DetailRow label="Total de documentos" value={String(extra?.documents.length || 0)} />
            <DetailRow label="Total de vídeos" value={String(extra?.videos.length || 0)} />

            <View style={styles.gallerySection}>
              <SectionTitle title="Galeria de Fotos" />
              {photoUrls.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photosRow}
                  >
                    {photoUrls.map((url, index) => (
                      <Pressable
                        key={`${url}-${index}`}
                        onPress={() => onOpenPhoto(index)}
                        style={({ pressed }) => [
                          styles.photoCard,
                          {
                            borderColor:
                              index === activePhotoIndex ? theme.colors.primary : theme.colors.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Image source={{ uri: url }} style={styles.photoImage} resizeMode="cover" />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={[styles.photoCounter, { color: theme.colors.textMuted }]}> 
                    Foto {activePhotoIndex + 1} de {photoUrls.length}
                  </Text>
                </>
              ) : (
                <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhuma foto cadastrada.</Text>
              )}
            </View>
          </Card>
        ) : null}

        {activeTab === "genealogy" ? (
          <Card>
            <SectionTitle title="Genealogia" />
            <DetailRow
              label="Pai"
              value={animal.genealogy.father?.name || animal.father_name || "Não informado"}
            />
            <DetailRow
              label="Registro do pai"
              value={animal.genealogy.father?.registry_number || "Não informado"}
            />
            <DetailRow
              label="Mãe"
              value={animal.genealogy.mother?.name || animal.mother_name || "Não informado"}
            />
            <DetailRow
              label="Registro da mãe"
              value={animal.genealogy.mother?.registry_number || "Não informado"}
            />
          </Card>
        ) : null}

        {activeTab === "videos" ? (
          <Card>
            <SectionTitle title="Galeria de Vídeos" />
            {extra?.videos.length ? (
              <>
                {selectedVideo ? (
                  <View style={styles.featuredVideoSection}>
                    {supportsInlineVideo(selectedVideo.url) ? (
                      <InlineVideoPlayer url={selectedVideo.url} />
                    ) : getVideoThumbnail(selectedVideo.url, selectedVideo.thumbnail_url) ? (
                      <Image
                        source={{ uri: getVideoThumbnail(selectedVideo.url, selectedVideo.thumbnail_url) as string }}
                        style={styles.featuredVideoFallback}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.featuredVideoFallback,
                          styles.featuredVideoFallbackEmpty,
                          { borderColor: theme.colors.border },
                        ]}
                      >
                        <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem prévia disponível</Text>
                      </View>
                    )}

                    <View style={styles.featuredVideoHeader}>
                      <Text style={[styles.featuredVideoTitle, { color: theme.colors.text }]}>{selectedVideo.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: theme.colors.info + "20" }]}>
                        <Text style={[styles.statusPillText, { color: theme.colors.info }]}>{selectedVideo.type}</Text>
                      </View>
                    </View>

                    {!supportsInlineVideo(selectedVideo.url) ? (
                      <Text style={[styles.videoNote, { color: theme.colors.textMuted }]}> 
                        Este link abre melhor no navegador.
                      </Text>
                    ) : null}

                    <Pressable
                      onPress={() => {
                        void openExternalUrl(selectedVideo.url);
                      }}
                      style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={[styles.itemLink, { color: theme.colors.primary }]}>Abrir vídeo em tela externa</Text>
                    </Pressable>
                  </View>
                ) : null}

                {(extra?.videos ?? []).slice(0, 25).map((video) => (
                <View key={video.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <Pressable onPress={() => setSelectedVideoId(video.id)}>
                      {getVideoThumbnail(video.url, video.thumbnail_url) ? (
                      <Image
                        source={{ uri: getVideoThumbnail(video.url, video.thumbnail_url) as string }}
                        style={styles.videoThumb}
                        resizeMode="cover"
                      />
                      ) : null}
                    </Pressable>
                    <View style={styles.itemTitleRow}>
                      <Pressable onPress={() => setSelectedVideoId(video.id)} style={styles.videoTitlePressable}>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{video.title}</Text>
                      </Pressable>
                      <View style={[styles.statusPill, { backgroundColor: theme.colors.info + "20" }]}> 
                        <Text style={[styles.statusPillText, { color: theme.colors.info }]}>{video.type}</Text>
                      </View>
                    </View>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {video.visibility ? `Visibilidade: ${video.visibility}` : "Sem visibilidade definida"}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      Data: {formatDateBR(video.created_at)}
                    </Text>
                    <Pressable
                      onPress={() => setSelectedVideoId(video.id)}
                      style={({ pressed }) => [
                        styles.selectVideoButton,
                        { borderColor: theme.colors.border, opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Text style={[styles.selectVideoLabel, { color: theme.colors.text }]}>Ver no player</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void openExternalUrl(video.url);
                      }}
                      style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={[styles.itemLink, { color: theme.colors.primary }]}>Abrir vídeo</Text>
                    </Pressable>
                  </View>
                </View>
                ))}
              </>
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhum vídeo registrado.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "photos" ? (
          <Card>
            <SectionTitle title="Galeria de Fotos" />
            {photoUrls.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosRow}
                >
                  {photoUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      onPress={() => onOpenPhoto(index)}
                      style={({ pressed }) => [
                        styles.photoCardLarge,
                        {
                          borderColor:
                            index === activePhotoIndex ? theme.colors.primary : theme.colors.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Image source={{ uri: url }} style={styles.photoImage} resizeMode="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.photoCounter, { color: theme.colors.textMuted }]}> 
                  Foto {activePhotoIndex + 1} de {photoUrls.length}
                </Text>
              </>
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhuma foto cadastrada.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "awards" ? (
          <Card>
            <SectionTitle title="Premiações" />
            {extra?.awards.length ? (
              extra.awards.slice(0, 25).map((award) => (
                <View key={award.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{award.evento}</Text>
                      {award.colocacao ? (
                        <View style={[styles.statusPill, { backgroundColor: theme.colors.warning + "20" }]}> 
                          <Text style={[styles.statusPillText, { color: theme.colors.warning }]}>{award.colocacao}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {award.categoria || "Sem categoria"}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {award.local || "Local não informado"} • {formatDateBR(award.data_evento)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhuma premiação registrada.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "location" ? (
          <Card>
            <SectionTitle title="Localização" />
            <DetailRow label="Local atual" value={animal.location || "Não informado"} />
            {extra?.locations.length ? (
              extra.locations.slice(0, 25).map((entry) => (
                <View key={entry.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}> 
                      {entry.previous_location || "-"} {"->"} {entry.new_location || "-"}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {formatDateBR(entry.changed_at)} {entry.service_type ? `• ${entry.service_type}` : ""}
                    </Text>
                    {entry.reason || entry.notes ? (
                      <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
                        {entry.reason || entry.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem histórico de localização.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "health" ? (
          <Card>
            <SectionTitle title="Saúde" />
            {extra?.health.length ? (
              extra.health.slice(0, 40).map((item) => (
                <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.tipo}</Text>
                      <View style={[styles.statusPill, { backgroundColor: theme.colors.success + "20" }]}> 
                        <Text style={[styles.statusPillText, { color: theme.colors.success }]}>Saúde</Text>
                      </View>
                    </View>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {formatDateBR(item.data)} {item.veterinario ? `• Responsável: ${item.veterinario}` : ""}
                    </Text>
                    {item.descricao ? (
                      <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>{item.descricao}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem registros de saúde.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "offspring" ? (
          <Card>
            <SectionTitle title="Filhos registrados" />
            {extra?.offspring.length ? (
              extra.offspring.slice(0, 40).map((item) => (
                <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.nome}</Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {item.registro || "Sem registro"} • {item.sexo || "Sexo não informado"}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      Nasc.: {formatDateBR(item.data_nascimento)} • {item.status || "-"}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhum descendente registrado.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "documents" ? (
          <Card>
            <SectionTitle title="Documentos" />
            {extra?.documents.length ? (
              extra.documents.slice(0, 40).map((item) => (
                <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {item.type} • {formatDateBR(item.created_at)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        void openExternalUrl(item.url);
                      }}
                      style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={[styles.itemLink, { color: theme.colors.primary }]}>Abrir documento</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Nenhum documento cadastrado.</Text>
            )}
          </Card>
        ) : null}

        {activeTab === "history" ? (
          <Card>
            <SectionTitle title="Linha do Tempo" />
            {extra?.timeline.length ? (
              extra.timeline.slice(0, 60).map((item) => (
                <View key={item.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: theme.colors.primary + "20" }]}> 
                        <Text style={[styles.statusPillText, { color: theme.colors.primary }]}>
                          {formatHealthType(item.type)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}> 
                      {formatDateBR(item.date)}
                    </Text>
                    {item.details ? (
                      <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>{item.details}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyLine, { color: theme.colors.textMuted }]}>Sem histórico consolidado.</Text>
            )}
          </Card>
        ) : null}

        <Modal
          visible={isPhotoModalVisible && photoUrls.length > 0}
          transparent
          animationType="fade"
          onRequestClose={onClosePhotoModal}
        >
          <View style={styles.photoModalRoot}>
            <Pressable style={styles.photoModalBackdrop} onPress={onClosePhotoModal} />
            <View style={styles.photoModalContent}>
              <ScrollView
                ref={photoPagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={[styles.photoPager, { width: modalViewportWidth, height: modalViewportHeight }]}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / modalViewportWidth);
                  setActivePhotoIndex(nextIndex);
                }}
              >
                {photoUrls.map((url, index) => (
                  <View key={`${url}-modal-${index}`} style={[styles.photoSlide, { width: modalViewportWidth }]}>
                    <ScrollView
                      style={styles.photoZoomScroll}
                      contentContainerStyle={styles.photoZoomContent}
                      maximumZoomScale={3}
                      minimumZoomScale={1}
                      bouncesZoom
                      pinchGestureEnabled
                      centerContent
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                    >
                      <Image source={{ uri: url }} style={styles.photoModalImage} resizeMode="contain" />
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.photoModalFooter}>
                <Pressable
                  onPress={onPreviousPhoto}
                  disabled={activePhotoIndex === 0}
                  style={({ pressed }) => [
                    styles.photoModalButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      opacity: activePhotoIndex === 0 ? 0.35 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.photoModalButtonLabel, { color: theme.colors.text }]}>Anterior</Text>
                </Pressable>

                <Text style={[styles.photoModalCounter, { color: theme.colors.text }]}> 
                  Foto {activePhotoIndex + 1} de {photoUrls.length}
                </Text>

                <Pressable
                  onPress={onNextPhoto}
                  disabled={activePhotoIndex >= photoUrls.length - 1}
                  style={({ pressed }) => [
                    styles.photoModalButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      opacity: activePhotoIndex >= photoUrls.length - 1 ? 0.35 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.photoModalButtonLabel, { color: theme.colors.text }]}>Próxima</Text>
                </Pressable>
              </View>

              <Text style={[styles.photoModalHint, { color: theme.colors.textMuted }]}>Use dois dedos para zoom</Text>

              <Pressable
                onPress={onClosePhotoModal}
                style={({ pressed }) => [
                  styles.photoModalClose,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.photoModalCloseLabel, { color: theme.colors.text }]}>Fechar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
  },
  registry: {
    fontSize: 13,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaBadge: {
    borderWidth: 1,
    borderRadius: 999,
    height: 28,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiBox: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  tabsContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  tabButton: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  listRow: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 999,
    height: 22,
    minWidth: 52,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  gallerySection: {
    marginTop: 8,
    gap: 8,
  },
  photosRow: {
    gap: 10,
  },
  photoCard: {
    width: 180,
    height: 124,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoCardLarge: {
    width: 260,
    height: 180,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoCounter: {
    fontSize: 12,
  },
  photoModalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  photoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
  },
  photoModalContent: {
    width: "100%",
    maxWidth: 460,
    alignItems: "center",
    gap: 12,
  },
  photoPager: {
    borderRadius: 14,
  },
  photoSlide: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalImage: {
    width: "100%",
    height: "100%",
  },
  photoZoomScroll: {
    width: "100%",
    height: "100%",
  },
  photoZoomContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalFooter: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  photoModalButton: {
    minHeight: 40,
    minWidth: 86,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  photoModalButtonLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  photoModalCounter: {
    fontSize: 13,
    fontWeight: "600",
  },
  photoModalHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  photoModalClose: {
    minHeight: 40,
    minWidth: 110,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  photoModalCloseLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  inlineVideoPlayer: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#000000",
  },
  featuredVideoSection: {
    gap: 10,
    marginBottom: 10,
  },
  featuredVideoFallback: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  featuredVideoFallbackEmpty: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredVideoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  featuredVideoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  videoTitlePressable: {
    flex: 1,
  },
  selectVideoButton: {
    marginTop: 6,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
  },
  selectVideoLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  videoNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  videoThumb: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#1a1a1a",
  },
  linkButton: {
    marginTop: 4,
  },
  emptyLine: {
    fontSize: 13,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
