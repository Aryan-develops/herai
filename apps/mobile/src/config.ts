import { Platform } from "react-native";

/**
 * The Express gateway has no dev-proxy on native the way Vite gives the web
 * app (`/api/*` → localhost:4000) — there is no "same origin" on a phone, so
 * the base URL must be explicit and configured per environment.
 *
 * Override with EXPO_PUBLIC_API_URL (e.g. in a `.env` file, inlined by Expo
 * at build/runtime) when testing on a physical device or a deployed gateway:
 * a phone on the same Wi-Fi needs your machine's LAN IP, not "localhost".
 */
function defaultApiUrl(): string {
  // Android's emulator routes 10.0.2.2 to the host machine's localhost;
  // "localhost" inside the emulator means the emulator itself.
  if (Platform.OS === "android") return "http://10.0.2.2:4000/api";
  return "http://localhost:4000/api";
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl();

/**
 * apps/ai-service has no Express passthrough (see docs/COMPLIANCE-NOTES.md §7
 * — it is reachable directly, same as the web app's Vite `/ai/*` proxy target),
 * so the mobile client talks to it directly too, same pattern as web.
 *
 * Default port is 8000 (the documented default); override with
 * EXPO_PUBLIC_AI_SERVICE_URL if your machine runs it on a different port
 * (see AI_SERVICE_PORT in the root .env).
 */
function defaultAiServiceUrl(): string {
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://localhost:8000";
}

export const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL ?? defaultAiServiceUrl();
