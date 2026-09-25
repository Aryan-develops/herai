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
  // Partner Mode is free while this is false (testing phase); flip to enforce trial/subscription.
  partnerPaywall: process.env.PARTNER_PAYWALL === "true",
  partnerTrialDays: Number(process.env.PARTNER_TRIAL_DAYS ?? 14),
  partnerPriceInr: Number(process.env.PARTNER_PRICE_INR ?? 100),
  // Shared secret for scheduled jobs (Vercel Cron sends it as a Bearer token).
  cronSecret: process.env.CRON_SECRET,
  // Optional transactional email (Resend). Without it, non-critical email is skipped.
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "HERAI <onboarding@resend.dev>",
  // Optional: personalises partner wording. Falls back to the curated bank when unset or slow.
  aiServiceUrl: process.env.AI_SERVICE_URL,
  internalApiToken: process.env.INTERNAL_API_TOKEN,
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Used only to sign users in (see createAuthClient) — no elevated privileges.
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
};
