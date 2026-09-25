import type { CheckoutInput, CheckoutResult } from "./PaymentProvider.js";
import { PROVIDERS } from "./providers.js";

/** Tries each connected provider that supports the method, in priority order, until one succeeds. */
export async function createCheckoutWithFallback(
  input: CheckoutInput,
): Promise<{ result: CheckoutResult | null; tried: string[]; connected: boolean }> {
  const candidates = PROVIDERS.filter(
    (p) => p.connected && p.methods.includes(input.method) && (!input.autopay || p.supportsAutopay),
  );
  const tried: string[] = [];
  for (const provider of candidates) {
    tried.push(provider.id);
    try {
      return { result: await provider.createCheckout(input), tried, connected: true };
    } catch (err) {
      console.error(`[payments] ${provider.id} failed, trying next:`, err);
    }
  }
  return { result: null, tried, connected: candidates.length > 0 };
}
