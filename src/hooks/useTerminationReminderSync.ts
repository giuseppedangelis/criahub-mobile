import { useEffect, useRef } from "react";
import {
  requestNotificationPermissions,
  syncReminders,
} from "@/src/lib/notifications";
import { useUpcomingTerminationsQuery } from "@/src/hooks/useOwnership";
import type { UpcomingTerminationItem } from "@/src/types/domain";

const REMINDER_DAYS_BEFORE = [30, 7, 1];
const REMINDER_PREFIX = "termination:";

function buildTriggerDate(dueDateIso: string, daysBefore: number): Date {
  const [y, m, d] = dueDateIso.split("-").map((v) => Number.parseInt(v, 10));
  const due = new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0);
  due.setDate(due.getDate() - daysBefore);
  return due;
}

function buildReminderBody(
  termination: UpcomingTerminationItem,
  daysBefore: number
): { title: string; body: string } {
  const owner = termination.primary_owner || "o cotista";
  const where = termination.physical_location ? ` (em ${termination.physical_location})` : "";
  const when =
    daysBefore === 1
      ? "amanhã"
      : daysBefore === 7
      ? "em 7 dias"
      : `em ${daysBefore} dias`;
  return {
    title: `Condomínio vence ${when}`,
    body: `${termination.animal_name}${where} — prazo com ${owner}. Combine a devolução.`,
  };
}

export function useTerminationReminderSync(harasId: string | null) {
  const { data } = useUpcomingTerminationsQuery(harasId ?? "");
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!harasId) return;
    if (!data) return;

    const signature = data
      .map((t) => `${t.animal_id}|${t.due_date}`)
      .sort()
      .join(",");
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    const now = Date.now();
    const reminders = data
      .flatMap((termination) =>
        REMINDER_DAYS_BEFORE.map((days) => ({ termination, days }))
      )
      .map(({ termination, days }) => {
        const triggerDate = buildTriggerDate(termination.due_date, days);
        if (triggerDate.getTime() <= now) return null;
        const { title, body } = buildReminderBody(termination, days);
        return {
          key: `${REMINDER_PREFIX}${termination.animal_id}:${termination.due_date}:${days}`,
          title,
          body,
          triggerDate,
          data: {
            kind: "termination-reminder" as const,
            animal_id: termination.animal_id,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    void (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      await syncReminders(REMINDER_PREFIX, reminders);
    })();
  }, [data, harasId]);
}
