import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ANDROID_CHANNEL_ID = "criahub-reminders";
const SCHEDULED_MAP_KEY = "@criahub/notifications/scheduled-v1";

let handlerRegistered = false;
let channelRegistered = false;

export function ensureNotificationHandler() {
  if (handlerRegistered) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerRegistered = true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || channelRegistered) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Lembretes CriaHub",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#FFFFFF",
  });
  channelRegistered = true;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  ensureNotificationHandler();
  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;

  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return Boolean(result.granted);
}

interface ScheduleLocalInput {
  key: string;
  title: string;
  body: string;
  triggerDate: Date;
  data?: Record<string, unknown>;
}

type ScheduledMap = Record<string, string>;

async function readScheduledMap(): Promise<ScheduledMap> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as ScheduledMap) : {};
  } catch {
    return {};
  }
}

async function writeScheduledMap(map: ScheduledMap) {
  await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));
}

export async function cancelScheduled(key: string) {
  const map = await readScheduledMap();
  const id = map[key];
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // silencioso: id pode já ter sido disparado/removido
    }
    delete map[key];
    await writeScheduledMap(map);
  }
}

export async function scheduleLocal(input: ScheduleLocalInput) {
  ensureNotificationHandler();
  await ensureAndroidChannel();

  const { key, title, body, triggerDate, data } = input;
  if (triggerDate.getTime() <= Date.now()) {
    await cancelScheduled(key);
    return;
  }

  await cancelScheduled(key);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined,
    },
  });

  const map = await readScheduledMap();
  map[key] = id;
  await writeScheduledMap(map);
}

interface ReminderInput {
  key: string;
  title: string;
  body: string;
  triggerDate: Date;
  data?: Record<string, unknown>;
}

/**
 * Sincroniza um conjunto de lembretes: agenda os desejados e cancela os que não
 * estão mais na lista (mas foram agendados anteriormente pelo mesmo prefixo).
 */
export async function syncReminders(prefix: string, reminders: ReminderInput[]) {
  ensureNotificationHandler();
  await ensureAndroidChannel();

  const map = await readScheduledMap();
  const desired = new Set(reminders.map((r) => r.key));

  for (const key of Object.keys(map)) {
    if (!key.startsWith(prefix)) continue;
    if (desired.has(key)) continue;
    const id = map[key];
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignora
    }
    delete map[key];
  }
  await writeScheduledMap(map);

  for (const reminder of reminders) {
    await scheduleLocal(reminder);
  }
}

export async function clearAllReminders() {
  const map = await readScheduledMap();
  for (const id of Object.values(map)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignora
    }
  }
  await writeScheduledMap({});
}
