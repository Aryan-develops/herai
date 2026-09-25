/** An invite link opened while signed out is remembered here so it survives login or registration. */
export const PENDING_JOIN_KEY = "herai.pendingJoin";

export function takePendingJoin(): string | null {
  try {
    return sessionStorage.getItem(PENDING_JOIN_KEY);
  } catch {
    return null;
  }
}
