import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  FieldPendingValidationItem,
  FieldPendingValidationStatus,
  FieldReturnNotificationItem,
} from "@/src/types/domain";

type ReadMap = Record<string, string>;

function storageKey(harasId: string, userId: string) {
  return `@criahub:field-reads:${harasId}:${userId}`;
}

function readTitle(status: FieldPendingValidationStatus) {
  if (status === "correcao_solicitada") return "Correção solicitada";
  if (status === "rejeitado") return "Pendência rejeitada";
  if (status === "aprovado") return "Pendência aprovada";
  if (status === "em_analise") return "Pendência em análise";
  return "Atualização de pendência";
}

function defaultMessage(status: FieldPendingValidationStatus) {
  if (status === "correcao_solicitada") return "O escritório pediu ajustes neste envio.";
  if (status === "rejeitado") return "O escritório rejeitou este envio. Verifique os detalhes.";
  if (status === "aprovado") return "Seu envio foi aprovado e oficializado.";
  if (status === "em_analise") return "Seu envio está em análise pelo escritório.";
  return "Seu envio recebeu atualização.";
}

function shouldCreateNotification(status: FieldPendingValidationStatus) {
  return status === "correcao_solicitada" || status === "rejeitado" || status === "aprovado" || status === "em_analise";
}

export const fieldNotificationService = {
  async readMap(harasId: string, userId: string): Promise<ReadMap> {
    const raw = await AsyncStorage.getItem(storageKey(harasId, userId));
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed as ReadMap;
    } catch {
      return {};
    }
  },

  async markRead(harasId: string, userId: string, pendingId: string) {
    const map = await this.readMap(harasId, userId);
    map[pendingId] = new Date().toISOString();
    await AsyncStorage.setItem(storageKey(harasId, userId), JSON.stringify(map));
  },

  async markAllRead(harasId: string, userId: string, pendingIds: string[]) {
    if (pendingIds.length === 0) return;
    const map = await this.readMap(harasId, userId);
    const now = new Date().toISOString();
    for (const id of pendingIds) {
      map[id] = now;
    }
    await AsyncStorage.setItem(storageKey(harasId, userId), JSON.stringify(map));
  },

  toNotifications(items: FieldPendingValidationItem[], readMap: ReadMap): FieldReturnNotificationItem[] {
    return items
      .filter((item) => item.source === "remote" && shouldCreateNotification(item.status))
      .map((item) => {
        const readAt = readMap[item.id] ?? null;
        return {
          id: `field-return-${item.id}`,
          pending_id: item.id,
          type: item.type,
          status: item.status,
          created_at: item.created_at,
          title: readTitle(item.status),
          message: item.validation_notes?.trim() || defaultMessage(item.status),
          read_at: readAt,
          is_unread: !readAt,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
