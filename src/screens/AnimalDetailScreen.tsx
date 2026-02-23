import { useMemo, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useAnimalDetailsQuery } from "@/src/hooks/useAnimalDetails";
import { useAnimalQuery } from "@/src/hooks/useAnimals";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { formatCategoryLabel, formatDateBR } from "@/src/utils/format";

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
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const animalId = useMemo(() => params.id || "", [params.id]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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

  const photoUrls =
    animal.images && animal.images.length > 0
      ? animal.images
      : animal.main_image_url
        ? [animal.main_image_url]
        : [];

  const openExternalUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return;
    await Linking.openURL(url);
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
            <DetailRow label="Haras Atual" value="Meu Haras" />
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
                        onPress={() => setActivePhotoIndex(index)}
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
              extra.videos.slice(0, 25).map((video) => (
                <View key={video.id} style={[styles.listRow, { borderColor: theme.colors.border }]}> 
                  <View style={{ flex: 1 }}>
                    {getVideoThumbnail(video.url, video.thumbnail_url) ? (
                      <Image
                        source={{ uri: getVideoThumbnail(video.url, video.thumbnail_url) as string }}
                        style={styles.videoThumb}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{video.title}</Text>
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
                      onPress={() => {
                        void openExternalUrl(video.url);
                      }}
                      style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={[styles.itemLink, { color: theme.colors.primary }]}>Abrir vídeo</Text>
                    </Pressable>
                  </View>
                </View>
              ))
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
                      onPress={() => setActivePhotoIndex(index)}
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
