/**
 * Payment providers sit behind one interface so a failure at one can fall back to the next, the same way
 * the AI service falls back between LLM providers. No provider is connected yet: every adapter is a stub
 * that reports itself as not connected. Connecting one means implementing the methods and setting its keys.
 */
export type PaymentMethodId = "upi_intent" | "upi_id" | "upi_qr" | "card" | "netbanking" | "wallet";

export interface CheckoutInput {
  userId: string;
  amountInr: number;
  method: PaymentMethodId;
  /** UPI app chosen by the user for intent flows (gpay, phonepe, paytm, supermoney, bhim). */
  upiApp?: string;
  /** UPI ID (VPA) for collect requests. */
  vpa?: string;
  autopay: boolean;
  idempotencyKey: string;
}

export interface CheckoutResult {
  provider: string;
  status: "requires_action" | "paid" | "failed";
  /** Where the client should send the user: deep link, hosted page or QR payload. */
  redirectUrl?: string;
  providerRef?: string;
}

export interface PaymentProvider {
  id: string;
  label: string;
  /** True only once real credentials are configured. */
  connected: boolean;
  methods: PaymentMethodId[];
  supportsAutopay: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(headers: Record<string, unknown>, rawBody: string): Promise<{ eventId: string; type: string } | null>;
  cancelSubscription(providerRef: string): Promise<void>;
  refund(providerRef: string, amountInr: number): Promise<void>;
}

export class NotConnectedError extends Error {
  constructor(provider: string) {
    super(`${provider} is not connected yet`);
  }
}
