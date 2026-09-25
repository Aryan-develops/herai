import { NotConnectedError, type PaymentMethodId, type PaymentProvider } from "./PaymentProvider.js";

function stub(id: string, label: string, methods: PaymentMethodId[], supportsAutopay: boolean): PaymentProvider {
  const fail = () => {
    throw new NotConnectedError(label);
  };
  return {
    id,
    label,
    connected: false,
    methods,
    supportsAutopay,
    createCheckout: async () => fail(),
    verifyWebhook: async () => null,
    cancelSubscription: async () => fail(),
    refund: async () => fail(),
  };
}

/** Priority order = fallback order. Razorpay first; Stripe last because it doesn't do India UPI AutoPay. */
export const PROVIDERS: PaymentProvider[] = [
  stub("razorpay", "Razorpay", ["upi_intent", "upi_id", "upi_qr", "card", "netbanking", "wallet"], true),
  stub("cashfree", "Cashfree", ["upi_intent", "upi_id", "upi_qr", "card", "netbanking", "wallet"], true),
  stub("payu", "PayU", ["upi_intent", "upi_id", "card", "netbanking"], true),
  stub("stripe", "Stripe (international cards)", ["card"], false),
];

export const METHOD_LABELS: Record<PaymentMethodId, string> = {
  upi_intent: "UPI apps",
  upi_id: "Enter UPI ID",
  upi_qr: "Scan UPI QR",
  card: "Credit / debit card",
  netbanking: "Net banking",
  wallet: "Wallets",
};

export const UPI_APPS = [
  { id: "gpay", label: "Google Pay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
  { id: "supermoney", label: "super.money" },
  { id: "bhim", label: "BHIM" },
];
