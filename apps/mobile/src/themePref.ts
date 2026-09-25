import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemePreference = "system" | "light" | "dark";

const KEY = "herai.theme";

/**
 * Read synchronously so `theme.ts` can pick its palette before any screen builds its StyleSheet.
 * Changing the preference takes effect the next time the app starts (styles are created once at load).
 */
export function readThemePreference(): ThemePreference {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(KEY) : SecureStore.getItem(KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(pref: ThemePreference): void {
  try {
    if (Platform.OS === "web") {
      if (pref === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, pref);
    } else if (pref === "system") {
      SecureStore.deleteItemAsync(KEY);
    } else {
      SecureStore.setItem(KEY, pref);
    }
  } catch {
    // Storage unavailable: the preference just won't persist.
  }
}
