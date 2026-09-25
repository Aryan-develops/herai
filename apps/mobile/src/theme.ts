import { Appearance } from "react-native";
import { readThemePreference } from "./themePref";

/** Design tokens shared in spirit with apps/web/src/index.css ("soft & warm"):
 * cream canvas, blush borders, plum-tinted ink, rose primary. Screens read
 * from here rather than hardcoding hex. `white` is the raised-surface colour
 * (cards, sheets, tab bar); use `onBrand` for text or icons sitting on a
 * filled brand colour so they stay white in both themes. */
const light = {
  brand50: "#fff1f5",
  brand100: "#ffe1ea",
  brand500: "#e8447c",
  brand600: "#d12468",
  brand700: "#ac1a55",
  ink900: "#2a1f2d",
  ink700: "#4f3f54",
  neutral50: "#fff9f7",
  neutral200: "#f2e3df",
  neutral300: "#e3cfcb",
  white: "#ffffff",
  onBrand: "#ffffff",
  red50: "#fef2f2",
  red600: "#dc2626",
  emerald50: "#f0f8f4",
  emerald700: "#2f7658",
  amber50: "#fff8e8",
  amber900: "#78350f",
  violet50: "#f6f3ff",
  violet700: "#6641bf",
  sage100: "#dcf0e5",
  sage700: "#2f7658",
  peach50: "#fff4ee",
  peach100: "#ffe6d8",
  peach600: "#d9622f",
  muted: "#7d6a74",
  scrim: "rgba(42,31,45,0.5)",
};

const dark: typeof light = {
  brand50: "#3a1626",
  brand100: "#4d1c31",
  brand500: "#e8447c",
  brand600: "#d9346f",
  brand700: "#ffa3c0",
  ink900: "#f7eef1",
  ink700: "#dccdd4",
  neutral50: "#1a1216",
  neutral200: "#3a2a33",
  neutral300: "#4d3a45",
  white: "#241a20",
  onBrand: "#ffffff",
  red50: "#3a1618",
  red600: "#ff8a8f",
  emerald50: "#14261e",
  emerald700: "#7fd3a9",
  amber50: "#33260e",
  amber900: "#f0b458",
  violet50: "#241b3a",
  violet700: "#bcaaff",
  sage100: "#1c3a2c",
  sage700: "#7fd3a9",
  peach50: "#33201a",
  peach100: "#452a20",
  peach600: "#ffa27a",
  muted: "#b6a3ad",
  scrim: "rgba(0,0,0,0.65)",
};

const preference = readThemePreference();
export const isDark = preference === "dark" || (preference === "system" && Appearance.getColorScheme() === "dark");
export const colors = isDark ? dark : light;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  soft: {
    shadowColor: isDark ? "#000000" : "#4a1f34",
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
