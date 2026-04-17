import { useEffect } from "react";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { fieldService } from "@/src/services/field";
import { veterinaryService } from "@/src/services/veterinary";

/**
 * OFFLINE-03 (D-17/D-18): task de background sync que tenta flushar as filas
 * offline de campo + veterinária a cada ~15min quando o app está em background
 * e o device está online (gerenciado pelo SO via expo-background-fetch).
 *
 * A task é definida fora do hook para que `TaskManager.defineTask` só seja
 * chamada uma vez por processo (requisito da API). O hook apenas registra
 * a task no mount da árvore de providers.
 *
 * Falhas são silenciadas — background sync é best-effort, a UI principal
 * segue fazendo flush no foreground.
 */

export const BACKGROUND_SYNC_TASK_NAME = "criahub-offline-sync";

// defineTask é idempotente no paper, mas só o primeiro registro vale; chamar
// fora do hook garante um único side-effect por JS bundle.
if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
    try {
      // Roda em paralelo — cada service já tem ensureOnline() interno e
      // gerencia seu próprio retry/backoff. Se um der erro, o outro segue.
      const results = await Promise.allSettled([
        fieldService.flushOfflineQueue(),
        veterinaryService.flushOfflineQueue(),
      ]);

      const anySynced = results.some((result) => {
        if (result.status !== "fulfilled") return false;
        const value = result.value as unknown;
        if (typeof value === "number") return value > 0;
        if (value && typeof value === "object" && "synced" in value) {
          return Number((value as { synced?: number }).synced ?? 0) > 0;
        }
        return false;
      });

      return anySynced
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export function useBackgroundSync() {
  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
        if (cancelled || isRegistered) return;

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {
          minimumInterval: 15 * 60, // 15 minutos — mínimo efetivo do iOS
          stopOnTerminate: false, // Android: sobrevive ao app ser morto
          startOnBoot: true, // Android: roda depois do boot do device
        });
      } catch {
        // Silenciar: background fetch pode não estar disponível em certos
        // devices/simuladores. Foreground flush continua cobrindo o caso.
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);
}
