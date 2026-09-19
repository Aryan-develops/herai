/**
 * Mirrors apps/api/src/utils/consent.ts so the form can ask for a guardian's
 * email as soon as a minor's date of birth is entered. The API re-checks this
 * server-side — this copy only drives the UI.
 */
export const MINOR_AGE = 18;

export function ageFromDateOfBirth(dateOfBirth: string, now = new Date()): number {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return Number.NaN;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function isMinor(dateOfBirth: string, now = new Date()): boolean {
  const age = ageFromDateOfBirth(dateOfBirth, now);
  return !Number.isNaN(age) && age < MINOR_AGE;
}
