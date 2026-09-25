import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEY = "herai.biometricLock";

/** True when the phone has Face ID / fingerprint hardware and the person has enrolled one. */
export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** "Face ID", "Fingerprint" or a generic label, for button and toggle copy. */
export async function biometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  } catch {
    // Fall through to the generic label.
  }
  return "Biometrics";
}

/** Read synchronously so the lock screen can appear before the first frame of the app. */
export function biometricLockEnabled(): boolean {
  if (Platform.OS === "web") return false;
  try {
    return SecureStore.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setBiometricLockEnabled(enabled: boolean): void {
  try {
    if (enabled) SecureStore.setItem(KEY, "1");
    else SecureStore.deleteItemAsync(KEY);
  } catch {
    // Storage unavailable: the lock just won't persist.
  }
}

export async function authenticate(prompt: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: "Cancel", disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}
