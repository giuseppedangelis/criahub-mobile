/**
 * Smoke tests for src/services/field-offline.ts (TEST-01).
 *
 * Covers:
 * - buildFieldActionFingerprint: minute bucketing, payload variance
 * - enqueueFieldOfflineAction: dedup within window / distinct across window
 * - clearDeadFieldActions: prunes dead items only
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildFieldActionFingerprint,
  clearDeadFieldActions,
  enqueueFieldOfflineAction,
  readFieldOfflineQueue,
  writeFieldOfflineQueue,
} from "@/src/services/field-offline";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("buildFieldActionFingerprint", () => {
  const basePayload = {
    haras_id: "h1",
    created_by: "u1",
    mare_id: "m1",
    note: "egua saudavel",
  };

  it("returns the same fingerprint for same payload in the same minute", () => {
    const fp1 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:23:10.000Z");
    const fp2 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:23:55.999Z");
    expect(fp1).toBe(fp2);
  });

  it("returns different fingerprints when the minute bucket changes", () => {
    const fp1 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:23:10.000Z");
    const fp2 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:24:00.001Z");
    expect(fp1).not.toBe(fp2);
  });

  it("differentiates by mare_id", () => {
    const fp1 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:23:10.000Z");
    const fp2 = buildFieldActionFingerprint(
      "birth_report",
      { ...basePayload, mare_id: "m2" },
      "2026-04-16T14:23:10.000Z",
    );
    expect(fp1).not.toBe(fp2);
  });

  it("differentiates by action type", () => {
    const fp1 = buildFieldActionFingerprint("birth_report", basePayload, "2026-04-16T14:23:10.000Z");
    const fp2 = buildFieldActionFingerprint("issue_report", basePayload, "2026-04-16T14:23:10.000Z");
    expect(fp1).not.toBe(fp2);
  });
});

describe("enqueueFieldOfflineAction", () => {
  const payload = {
    haras_id: "h1",
    created_by: "u1",
    mare_id: "m1",
    foal_sex: "Macho",
  };

  it("enqueues a single action", async () => {
    const result = await enqueueFieldOfflineAction("birth_report", payload);
    expect(result.enqueued).toBe(true);
    const queue = await readFieldOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("birth_report");
    expect(queue[0].retry_count).toBe(0);
    expect(queue[0].dead).toBe(false);
  });

  it("dedups identical payload within the dedup window (same minute)", async () => {
    await enqueueFieldOfflineAction("birth_report", payload);
    const result2 = await enqueueFieldOfflineAction("birth_report", payload);
    expect(result2.enqueued).toBe(false);
    const queue = await readFieldOfflineQueue();
    expect(queue).toHaveLength(1);
  });

  it("does NOT dedup when existing item is older than the dedup window", async () => {
    // Seed queue manually with a stale item (created_at > 2 min ago).
    const stale = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const staleFp = buildFieldActionFingerprint("birth_report", payload, stale);
    await writeFieldOfflineQueue([
      {
        id: "old",
        type: "birth_report",
        payload,
        fingerprint: staleFp,
        created_at: stale,
        retry_count: 0,
        last_error: null,
        last_attempt_at: null,
        next_retry_at: null,
        dead: false,
      },
    ]);

    const result = await enqueueFieldOfflineAction("birth_report", payload);
    expect(result.enqueued).toBe(true);
    const queue = await readFieldOfflineQueue();
    expect(queue).toHaveLength(2);
  });

  it("allows two different payloads to coexist in the queue", async () => {
    await enqueueFieldOfflineAction("birth_report", { ...payload, mare_id: "m1" });
    await enqueueFieldOfflineAction("birth_report", { ...payload, mare_id: "m2" });
    const queue = await readFieldOfflineQueue();
    expect(queue).toHaveLength(2);
  });
});

describe("clearDeadFieldActions", () => {
  it("removes only dead items", async () => {
    await writeFieldOfflineQueue([
      {
        id: "alive-1",
        type: "birth_report",
        payload: { haras_id: "h1" },
        fingerprint: "fp1",
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_error: null,
        last_attempt_at: null,
        next_retry_at: null,
        dead: false,
      },
      {
        id: "dead-1",
        type: "issue_report",
        payload: { haras_id: "h1" },
        fingerprint: "fp2",
        created_at: new Date().toISOString(),
        retry_count: 10,
        last_error: "boom",
        last_attempt_at: new Date().toISOString(),
        next_retry_at: null,
        dead: true,
      },
      {
        id: "dead-2",
        type: "birth_report",
        payload: { haras_id: "h1" },
        fingerprint: "fp3",
        created_at: new Date().toISOString(),
        retry_count: 10,
        last_error: "conflict",
        last_attempt_at: new Date().toISOString(),
        next_retry_at: null,
        dead: true,
      },
    ]);

    const removed = await clearDeadFieldActions();
    expect(removed).toBe(2);

    const queue = await readFieldOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("alive-1");
  });

  it("returns 0 when there are no dead items", async () => {
    await writeFieldOfflineQueue([]);
    const removed = await clearDeadFieldActions();
    expect(removed).toBe(0);
  });
});
