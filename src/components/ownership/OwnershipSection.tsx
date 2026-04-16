import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { Card } from "@/src/components/ui/Card";
import {
  useActiveOwnershipSharesQuery,
  useSaveOwnershipSharesMutation,
  useSetAnimalPresenceMutation,
} from "@/src/hooks/useOwnership";
import { useAppTheme } from "@/src/theme/ThemeContext";
import type { AnimalOwnershipShare } from "@/src/types/domain";
import { OwnershipEditorModal } from "./OwnershipEditorModal";

interface OwnershipSectionProps {
  animalId: string;
  harasId: string;
  animalBirthDate: string | null;
  isAtHaras: boolean;
  defaultOwnerName: string | null;
  /** Permite alternar o switch de presença (RLS: animals UPDATE aceita criador, vet, funcionário). */
  canTogglePresence?: boolean;
  /** Permite editar cotistas (RLS: user_can_manage_haras_team — só admin/criador/assessor). */
  canManageShares?: boolean;
}

function formatTerminationDescription(share: AnimalOwnershipShare, birthDate: string | null) {
  if (share.termination_type === "date" && share.termination_date) {
    return `Devolução prevista: ${toPtBr(share.termination_date)}`;
  }
  if (share.termination_type === "age" && share.termination_age_years) {
    if (birthDate) {
      const base = new Date(`${birthDate}T00:00:00`);
      base.setFullYear(base.getFullYear() + share.termination_age_years);
      return `Devolução quando completar ${share.termination_age_years} anos (${toPtBr(
        base.toISOString().slice(0, 10)
      )})`;
    }
    return `Devolução aos ${share.termination_age_years} anos de idade`;
  }
  return "Sem prazo definido";
}

function toPtBr(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function OwnershipSection({
  animalId,
  harasId,
  animalBirthDate,
  isAtHaras,
  defaultOwnerName,
  canTogglePresence = false,
  canManageShares = false,
}: OwnershipSectionProps) {
  const { theme } = useAppTheme();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const sharesQuery = useActiveOwnershipSharesQuery(animalId, harasId);
  const saveMutation = useSaveOwnershipSharesMutation(animalId, harasId);
  const presenceMutation = useSetAnimalPresenceMutation(animalId, harasId);

  const shares = sharesQuery.data ?? [];
  const hasCondominio = shares.length >= 2;
  const primaryShare = shares.find((s) => s.is_primary) ?? shares[0] ?? null;

  const totalPct = useMemo(
    () => shares.reduce((sum, s) => sum + (Number.isFinite(s.percentage) ? s.percentage : 0), 0),
    [shares]
  );

  const onTogglePresence = (next: boolean) => {
    presenceMutation.mutate(next, {
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Erro ao atualizar presença.";
        Alert.alert("Erro", message);
      },
    });
  };

  return (
    <>
      <Card>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Presença no haras</Text>
          <Switch
            value={isAtHaras}
            onValueChange={onTogglePresence}
            disabled={!canTogglePresence || presenceMutation.isPending}
            trackColor={{ true: theme.colors.success, false: theme.colors.surfaceAlt }}
            thumbColor={theme.colors.primary}
          />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          {isAtHaras
            ? "O animal está dentro do haras."
            : "O animal está fora do haras (em outro local/sociedade)."}
        </Text>
        {presenceMutation.isError ? (
          <Text style={[styles.warning, { color: theme.colors.danger }]}>
            Não foi possível salvar. Tente novamente.
          </Text>
        ) : null}
      </Card>

      <Card>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Propriedade</Text>
          {canManageShares ? (
            <AppButton
              label={shares.length === 0 ? "Cadastrar cotistas" : "Gerenciar"}
              variant="ghost"
              onPress={() => setIsEditorOpen(true)}
            />
          ) : null}
        </View>

        {sharesQuery.isLoading ? (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Carregando cotas...
          </Text>
        ) : null}

        {!sharesQuery.isLoading && shares.length === 0 ? (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {canManageShares
              ? 'Nenhum cotista cadastrado. Use "Cadastrar cotistas" para registrar dono único ou condomínio.'
              : "Nenhum cotista cadastrado."}
          </Text>
        ) : null}

        {shares.map((share) => (
          <View
            key={share.id}
            style={[styles.shareRow, { borderColor: theme.colors.border }]}
          >
            <View style={styles.shareRowTop}>
              <View style={styles.shareNameBlock}>
                <Text style={[styles.shareName, { color: theme.colors.text }]}>
                  {share.owner_name}
                </Text>
                {share.is_primary ? (
                  <View
                    style={[
                      styles.primaryPill,
                      { backgroundColor: theme.colors.warning + "20" },
                    ]}
                  >
                    <Star size={12} color={theme.colors.warning} fill={theme.colors.warning} />
                    <Text style={[styles.primaryPillText, { color: theme.colors.warning }]}>
                      Principal
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.sharePct, { color: theme.colors.text }]}>
                {share.percentage.toFixed(2)}%
              </Text>
            </View>
            {share.physical_location ? (
              <Text style={[styles.shareMeta, { color: theme.colors.textMuted }]}>
                Local: {share.physical_location}
                {share.is_external ? " (fora do haras)" : ""}
              </Text>
            ) : null}
            {share.termination_type ? (
              <Text style={[styles.shareMeta, { color: theme.colors.textMuted }]}>
                {formatTerminationDescription(share, animalBirthDate)}
              </Text>
            ) : null}
          </View>
        ))}

        {shares.length > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Total</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    Math.abs(totalPct - 100) <= 0.01
                      ? theme.colors.success
                      : theme.colors.warning,
                },
              ]}
            >
              {totalPct.toFixed(2)}%
            </Text>
          </View>
        ) : null}
        {hasCondominio && primaryShare?.physical_location ? (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Condomínio com {shares.length} cotistas — localização:{" "}
            {primaryShare.physical_location}.
          </Text>
        ) : null}
      </Card>

      {isEditorOpen ? (
        <OwnershipEditorModal
          visible={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialShares={shares}
          defaultOwnerName={defaultOwnerName}
          animalBirthDate={animalBirthDate}
          isSaving={saveMutation.isPending}
          onSave={async (drafts) => {
            try {
              await saveMutation.mutateAsync({
                animalId,
                harasId,
                shares: drafts,
              });
              setIsEditorOpen(false);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Não foi possível salvar as cotas.";
              Alert.alert("Erro", message);
            }
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  warning: {
    fontSize: 12,
    lineHeight: 16,
  },
  shareRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  shareRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  shareNameBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  shareName: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  primaryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sharePct: {
    fontSize: 15,
    fontWeight: "700",
  },
  shareMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
});
