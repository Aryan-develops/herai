import { Angry, CloudRain, Frown, HeartCrack, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import type { Mood } from "@/lib/api";

export const MOOD_OPTIONS: { id: Mood; label: string; icon: LucideIcon; tone: string }[] = [
  { id: "great", label: "Great", icon: Laugh, tone: "text-sage-700 bg-sage-100" },
  { id: "good", label: "Good", icon: Smile, tone: "text-sage-700 bg-sage-100" },
  { id: "okay", label: "Okay", icon: Meh, tone: "text-amber-700 bg-amber-100" },
  { id: "low", label: "Low", icon: Frown, tone: "text-violet-700 bg-violet-100" },
  { id: "irritable", label: "Irritable", icon: Angry, tone: "text-peach-600 bg-peach-100" },
  { id: "anxious", label: "Anxious", icon: CloudRain, tone: "text-violet-700 bg-violet-100" },
  { id: "sad", label: "Sad", icon: HeartCrack, tone: "text-brand-700 bg-brand-100" },
];

export function moodOption(id: Mood) {
  return MOOD_OPTIONS.find((m) => m.id === id)!;
}
