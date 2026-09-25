import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const isProduction = process.env.NODE_ENV === "production";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  showSampleProviders: process.env.SHOW_SAMPLE_PROVIDERS === "true",
  demoMode: (process.env.DEMO_MODE ?? "true") === "true",
  port: Number(process.env.PORT ?? 4000),
  // Comma-separated. Native apps (iOS/Android) never hit browser CORS at all
  // — this only matters for the web app and for `expo start --web`, which
  // does run in a browser and needs its own dev origin allowed alongside it.
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:8081")
    .split(",")
    .map((origin) => origin.trim()),
  // Where guardian-facing consent links point. Defaults to the web app's dev
  // origin; must be the public app URL in production.
  appBaseUrl: process.env.APP_BASE_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Used only to sign users in (see createAuthClient) — no elevated privileges.
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
};
