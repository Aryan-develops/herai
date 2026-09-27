import type { AuthUser, Gender } from "@/lib/api";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "undisclosed", label: "Prefer not to say" },
];

/** null (never asked) is treated as a woman, so accounts made before this question existed keep the full app. */
export function isPartnerOnly(user: Pick<AuthUser, "gender"> | null | undefined): boolean {
  return !!user?.gender && user.gender !== "woman";
}
