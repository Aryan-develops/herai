import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type PaymentPlans } from "../lib/api";
import { Button, Chip, ErrorText, Field, Notice } from "../components/ui";
import { ToggleRow } from "../components/settingsBits";
import { colors, radius, shadow } from "../theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const METHOD_ICON: Record<string, IconName> = {
  upi_intent: "phone-portrait-outline",
  upi_id: "at-outline",
  upi_qr: "qr-code-outline",
  card: "card-outline",
  netbanking: "business-outline",
  wallet: "wallet-outline",
};

const VPA = /^[\w.-]{2,256}@[A-Za-z]{2,64}$/;

function niceDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";
}

export function PartnerUpgradeScreen() {
  const [plans, setPlans] = useState<PaymentPlans | null>(null);
  const [method, setMethod] = useState("upi_intent");
  const [upiApp, setUpiApp] = useState("gpay");
  const [vpa, setVpa] = useState("");
  const [autopay, setAutopay] = useState(true);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{ tone: "info" | "warning"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [giftMonths, setGiftMonths] = useState(1);
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [redeem, setRedeem] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  useEffect(() => {
    api.paymentPlans().then(setPlans).catch(() => setError("Couldn't load plan details."));
  }, []);

  async function pay() {
    setPaying(true);
    setResult(null);
    try {
      const res = await api.checkout({ method, upiApp: method === "upi_intent" ? upiApp : undefined, vpa: method === "upi_id" ? vpa.trim() : undefined, autopay });
      setResult({ tone: res.status === "failed" ? "warning" : "info", text: res.message ?? "Nothing was charged." });
    } catch (err) {
      setResult({ tone: "warning", text: err instanceof ApiError ? err.message : "Couldn't start payment." });
    } finally {
      setPaying(false);
    }
  }

  async function makeGift() {
    setGiftBusy(true);
    setGiftError(null);
    setGiftCode(null);
    try {
      setGiftCode((await api.createGift(giftMonths)).code);
    } catch (err) {
      setGiftError(err instanceof ApiError ? err.message : "Couldn't create a gift.");
    } finally {
      setGiftBusy(false);
    }
  }

  async function redeemGift() {
    setRedeemBusy(true);
    setRedeemMessage(null);
    try {
      const res = await api.redeemGift(redeem.trim());
      setRedeemMessage({ tone: "success", text: `Gift added: ${res.months} month${res.months === 1 ? "" : "s"} of access.` });
      setRedeem("");
      setPlans(await api.paymentPlans());
    } catch (err) {
      setRedeemMessage({ tone: "warning", text: err instanceof ApiError ? err.message : "Couldn't redeem that code." });
    } finally {
      setRedeemBusy(false);
    }
  }

  const sub = plans?.subscription;
  const current = plans?.methods.find((m) => m.id === method);
  const canPay = method !== "upi_id" || VPA.test(vpa.trim());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ErrorText>{error}</ErrorText>
      {!plans && !error ? <View style={styles.skeleton} /> : null}

      {plans && sub ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Lunee PARTNER</Text>
            <Text style={styles.price}>
              ₹{plans.plan.priceInr}
              <Text style={styles.per}> / month</Text>
            </Text>
            <Text style={styles.heroBody}>Follow as many people as you like. {plans.plan.trialDays}-day free trial, cancel any time.</Text>
            {["Daily phase and mood updates, with what to do, say and avoid", "Plans that flag tougher days ahead", "Hindi and English tips"].map((t) => (
              <View key={t} style={styles.perk}>
                <Ionicons name="checkmark" size={16} color={colors.onBrand} />
                <Text style={styles.perkText}>{t}</Text>
              </View>
            ))}
          </View>

          {plans.testingPhase ? <Notice tone="info">Free while we're testing. Nothing below will charge you. This is a preview of how paying will work.</Notice> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your plan</Text>
            <Text style={styles.body}>
              {sub.state === "trialing" && `Free trial, ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left (ends ${niceDate(sub.trialEndsAt)}).`}
              {sub.state === "active" && `Active until ${niceDate(sub.currentPeriodEnd)}.`}
              {sub.state === "expired" && "Your trial has ended."}
              {sub.state === "none" && "Your free trial starts the first time you follow someone."}
            </Text>
            {sub.state !== "none" ? (
              <ToggleRow
                label="AutoPay"
                hint="Charge ₹100 monthly through UPI AutoPay or your card. You get a reminder about a day before each charge and can stop any time."
                value={sub.autopay}
                onChange={async (v) => {
                  await api.setAutopay(v).catch(() => {});
                  setPlans(await api.paymentPlans());
                }}
              />
            ) : null}
            {sub.state === "active" || sub.state === "trialing" ? (
              <Button
                title="Cancel plan"
                variant="ghost"
                onPress={async () => {
                  await api.cancelSubscription().catch(() => {});
                  setPlans(await api.paymentPlans());
                }}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pay</Text>
            <View style={styles.methods} accessibilityRole="tablist">
              {plans.methods.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    setMethod(m.id);
                    setResult(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: method === m.id }}
                  style={[styles.method, method === m.id && styles.methodActive]}
                >
                  <Ionicons name={METHOD_ICON[m.id] ?? "card-outline"} size={20} color={method === m.id ? colors.brand700 : colors.ink700} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodText, method === m.id && { color: colors.brand700 }]}>{m.label}</Text>
                    {!m.available ? <Text style={styles.tiny}>Not connected yet</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>

            {method === "upi_intent" ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.body}>Choose your UPI app. We'll open it to approve the payment.</Text>
                <View style={styles.wrap}>
                  {plans.upiApps.map((a) => (
                    <Chip key={a.id} label={a.label} selected={upiApp === a.id} onPress={() => setUpiApp(a.id)} />
                  ))}
                </View>
              </View>
            ) : null}
            {method === "upi_id" ? (
              <View>
                <Field label="Your UPI ID" value={vpa} onChangeText={setVpa} placeholder="name@bank" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
                {vpa.length > 3 && !VPA.test(vpa.trim()) ? <Text style={[styles.tiny, { color: colors.red600 }]}>Enter a valid UPI ID, like name@bank.</Text> : <Text style={styles.tiny}>We'll send a payment request to your UPI app.</Text>}
              </View>
            ) : null}
            {method === "upi_qr" ? (
              <View style={styles.qr}>
                <Ionicons name="qr-code-outline" size={44} color={colors.muted} />
                <Text style={[styles.body, { flex: 1 }]}>A UPI QR code appears here. Scan it with any UPI app to pay.</Text>
              </View>
            ) : null}
            {method === "card" ? <Text style={styles.body}>You'll enter your card on your bank's secure page. We never see or store card details.</Text> : null}
            {method === "netbanking" ? <Text style={styles.body}>You'll pick your bank and sign in on its own page.</Text> : null}
            {method === "wallet" ? <Text style={styles.body}>Pay with Paytm or other wallets.</Text> : null}

            <ToggleRow label="Set up AutoPay" hint="Renews monthly. Available with UPI apps, UPI ID and cards." value={autopay} onChange={setAutopay} disabled={["upi_qr", "netbanking", "wallet"].includes(method)} />
            {current && !current.available ? <Text style={styles.tiny}>{current.label} isn't connected yet. If one payment provider is down we automatically try another.</Text> : null}
            {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
            <Button title={`Pay ₹${plans.plan.priceInr}`} onPress={pay} loading={paying} disabled={!canPay} />
            <Text style={styles.tiny}>Secure payment. We never see your bank or card details.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gift a plan</Text>
            <Text style={styles.body}>Give someone months of Partner access. They redeem the code in their own account.</Text>
            <View style={styles.wrap}>
              {[1, 3, 6, 12].map((m) => (
                <Chip key={m} label={`${m} mo · ₹${m * plans.plan.priceInr}`} selected={giftMonths === m} onPress={() => setGiftMonths(m)} />
              ))}
            </View>
            <Button title="Create gift code" variant="outline" onPress={makeGift} loading={giftBusy} />
            <ErrorText>{giftError}</ErrorText>
            {giftCode ? (
              <View style={styles.giftBox}>
                <Text style={styles.giftCode} selectable>
                  {giftCode}
                </Text>
                <Button title="Copy" variant="outline" onPress={() => Clipboard.setStringAsync(giftCode)} />
              </View>
            ) : null}
            <View style={styles.divider} />
            <Field label="Got a gift code?" value={redeem} onChangeText={setRedeem} placeholder="GIFT-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false} />
            <Button title="Redeem" onPress={redeemGift} loading={redeemBusy} disabled={redeem.trim().length < 8} />
            {redeemMessage ? <Notice tone={redeemMessage.tone}>{redeemMessage.text}</Notice> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Invoices</Text>
            <Text style={styles.body}>No invoices yet.</Text>
            <Text style={styles.tiny}>The person being followed always uses Lunee free. Only followers pay.</Text>
          </View>
        </>
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, gap: 14 },
  skeleton: { height: 180, borderRadius: radius.xl, backgroundColor: colors.neutral200 },
  hero: { backgroundColor: colors.brand600, borderRadius: radius.xl, padding: 20, gap: 6, ...shadow.soft },
  eyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  price: { color: colors.onBrand, fontSize: 38, fontWeight: "700" },
  per: { fontSize: 16, fontWeight: "400", color: "rgba(255,255,255,0.85)" },
  heroBody: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  perk: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  perkText: { flex: 1, color: colors.onBrand, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 12, ...shadow.soft },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  body: { fontSize: 14, color: colors.ink700, lineHeight: 20 },
  tiny: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  methods: { gap: 8 },
  method: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, paddingHorizontal: 12 },
  methodActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  methodText: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qr: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.neutral300, borderRadius: radius.md, padding: 14 },
  giftBox: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: 14, gap: 10, alignItems: "center" },
  giftCode: { fontSize: 20, fontWeight: "700", letterSpacing: 1.5, color: colors.brand700 },
  divider: { height: 1, backgroundColor: colors.neutral200 },
});
