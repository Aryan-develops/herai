import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { Mood } from "../lib/api";
import { colors } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const MOOD_OPTIONS: { id: Mood; label: string; icon: IconName; bg: string; fg: string }[] = [
  { id: "great", label: "Great", icon: "happy", bg: colors.sage100, fg: colors.sage700 },
  { id: "good", label: "Good", icon: "happy-outline", bg: colors.sage100, fg: colors.sage700 },
  { id: "okay", label: "Okay", icon: "remove-circle-outline", bg: colors.amber50, fg: colors.amber900 },
  { id: "low", label: "Low", icon: "sad-outline", bg: colors.violet50, fg: colors.violet700 },
  { id: "irritable", label: "Irritated", icon: "flame-outline", bg: colors.peach100, fg: colors.peach600 },
  { id: "anxious", label: "Anxious", icon: "cloud-outline", bg: colors.violet50, fg: colors.violet700 },
  { id: "sad", label: "Sad", icon: "rainy-outline", bg: colors.brand100, fg: colors.brand700 },
];

export function moodOption(id: Mood) {
  return MOOD_OPTIONS.find((m) => m.id === id)!;
}

/** "How much?" scale used with a mood, from barely there to very strong. */
export const INTENSITY_LABELS = ["A little", "Some", "Moderate", "Quite a lot", "Very much"] as const;
