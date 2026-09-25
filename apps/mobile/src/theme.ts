/** Design tokens shared in spirit with apps/web/src/index.css ("soft & warm"):
 * cream canvas, blush borders, plum-tinted ink, rose primary. Screens read
 * from here rather than hardcoding hex. */
export const colors = {
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
  peach100: "#ffe6d8",
  peach600: "#d9622f",
  muted: "#7d6a74",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  soft: {
    shadowColor: "#4a1f34",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
