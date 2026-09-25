import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "./api";

/**
 * Asks for permission and registers this phone for the daily partner note. Returns false when the person
 * declines or the environment can't issue a token (Expo Go on Android, simulators, web); never throws.
 */
export async function registerForPush(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    const { data } = await Notifications.getExpoPushTokenAsync();
    await api.registerPushToken(data);
    return true;
  } catch {
    return false;
  }
}
