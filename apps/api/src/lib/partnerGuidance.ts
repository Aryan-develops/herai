import { env } from "../config/env.js";
import type { CycleInsights } from "./cycleInsights.js";
import {
  DISCLAIMER,
  MOOD_NOTES,
  NEED_TIPS,
  PHASE_CONTENT,
  SEE_CLINICIAN,
  passesSafetyFilter,
  type Lang,
  type Mood,
  type Need,
  type PhaseKey,
} from "./partnerContent.js";

export interface PartnerGuidance {
  /** Stable id used for feedback and caching, e.g. "pms:irritable". */
  key: string;
  phaseKey: PhaseKey;
  title: string;
  blurb: string;
  do: string[];
  say: string[];
  avoid: string[];
  moodNote: string | null;
  need: { title: string; text: string } | null;
  tasks: { id: string; text: string }[];
  lesson: string;
  disclaimer: string;
  clinicianNote: string;
  source: "curated" | "ai";
}

export function effectivePhase(insights: CycleInsights): PhaseKey | null {
  if (!insights.phase) return null;
  return insights.subPhase ?? insights.phase;
}

export function curatedGuidance(phaseKey: PhaseKey, lang: Lang, mood: Mood | null, need: Need | null): PartnerGuidance {
  const c = PHASE_CONTENT[phaseKey];
  return {
    key: `${phaseKey}:${mood ?? "none"}`,
    phaseKey,
    title: c.title[lang],
    blurb: c.blurb[lang],
    do: c.do[lang],
    say: c.say[lang],
    avoid: c.avoid[lang],
    moodNote: mood ? MOOD_NOTES[mood][lang] : null,
    need: need ? NEED_TIPS[need][lang] : null,
    tasks: c.tasks.map((t) => ({ id: t.id, text: t.text[lang] })),
    lesson: c.lesson[lang],
    disclaimer: DISCLAIMER[lang],
    clinicianNote: SEE_CLINICIAN[lang],
    source: "curated",
  };
}

interface AiSuggestion {
  do: string[];
  say: string[];
  avoid: string[];
}

const aiCache = new Map<string, { at: number; value: AiSuggestion | null }>();
const AI_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Optionally asks the AI service to reword the tips for this (phase, mood, language). The model only ever
 * sees those three labels, never her data. The reply is accepted only when it has the expected shape and
 * passes the safety filter; anything else (slow, invalid, unsafe) falls back to the curated tips.
 */
async function aiSuggestion(phaseKey: PhaseKey, mood: Mood | null, lang: Lang): Promise<AiSuggestion | null> {
  if (!env.aiServiceUrl) return null;
  const cacheKey = `${phaseKey}:${mood ?? "none"}:${lang}`;
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AI_TTL_MS) return cached.value;

  let value: AiSuggestion | null = null;
  try {
    const response = await fetch(`${env.aiServiceUrl.replace(/\/$/, "")}/partner/guidance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: phaseKey, mood, language: lang }),
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const body = (await response.json()) as Partial<AiSuggestion>;
      const lists = [body.do, body.say, body.avoid];
      const valid = lists.every((l) => Array.isArray(l) && l.length >= 2 && l.length <= 4 && l.every((t) => typeof t === "string"));
      if (valid && passesSafetyFilter(lists.flat() as string[])) {
        value = { do: body.do!, say: body.say!, avoid: body.avoid! };
      }
    }
  } catch {
    value = null;
  }
  aiCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

export async function buildGuidance(
  insights: CycleInsights,
  lang: Lang,
  mood: Mood | null,
  need: Need | null,
): Promise<PartnerGuidance | null> {
  const phaseKey = effectivePhase(insights);
  if (!phaseKey) return null;
  const base = curatedGuidance(phaseKey, lang, mood, need);
  const ai = await aiSuggestion(phaseKey, mood, lang);
  return ai ? { ...base, do: ai.do, say: ai.say, avoid: ai.avoid, source: "ai" } : base;
}
