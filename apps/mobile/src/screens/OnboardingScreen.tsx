import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type HealthProfile } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { PillSelect } from "../components/PillSelect";
import { colors } from "../theme";

const AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"] as const;
const EXERCISE = ["none", "light", "moderate", "active"] as const;
const ALCOHOL = ["none", "occasional", "regular"] as const;

// Exact wording from apps/ai-service/app/orchestrator.py's DISCLAIMER — kept
// identical, not paraphrased, so the app-store-facing promise and the text
// every AI response actually carries never drift apart. Apple guideline
// 1.4.1 / Google Play's medical-apps policy both expect this to be explicit
// up front, not buried inside results (see docs/COMPLIANCE-NOTES.md §4).
const DISCLAIMER =
  "HERAI provides health information and risk-awareness support. It does not diagnose " +
  "conditions and is not a substitute for professional medical care. If you're worried, " +
  "please consult a licensed clinician.";

/** Ported from apps/web/src/pages/Onboarding.tsx — same fields, one scroll
 * instead of a 3-step wizard (the web version's steps are cosmetic, not
 * validation boundaries, so collapsing them loses nothing functionally).
 * Known/medications/allergies are comma-separated text here rather than the
 * web's tag-input widget — same data shape, simpler native control. */
export function OnboardingScreen() {
  const { refreshUser } = useAuth();
  const [ageRange, setAgeRange] = useState<HealthProfile["ageRange"]>(undefined);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [cycleLengthDays, setCycleLengthDays] = useState("");
  const [exerciseFrequency, setExerciseFrequency] = useState<HealthProfile["lifestyle"]["exerciseFrequency"]>("none");
  const [alcohol, setAlcohol] = useState<HealthProfile["lifestyle"]["alcohol"]>("none");
  const [smoker, setSmoker] = useState(false);
  const [sleepHoursAvg, setSleepHoursAvg] = useState("");
  const [knownConditions, setKnownConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  function splitTags(value: string): string[] {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function finish() {
    if (!acknowledged) {
      setError("Please confirm you understand HERAI's disclaimer before continuing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.updateProfile({
        ageRange,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        cycleLengthDays: cycleLengthDays ? Number(cycleLengthDays) : undefined,
        knownConditions: splitTags(knownConditions),
        medications: splitTags(medications),
        allergies: splitTags(allergies),
        lifestyle: {
          smoker,
          alcohol,
          exerciseFrequency,
          sleepHoursAvg: sleepHoursAvg ? Number(sleepHoursAvg) : undefined,
        },
      });
      await refreshUser();
      // RootNavigator swaps to MainTabs once onboardingComplete is true —
      // no explicit navigation call needed here.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.subtitle}>Helps personalize insight to your body. Everything here is optional.</Text>

        <PillSelect label="Age range" value={ageRange ?? ""} options={["", ...AGE_RANGES] as const} onChange={(v) => setAgeRange(v || undefined)} />

        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Height (cm)" keyboardType="numeric" placeholder="165" value={heightCm} onChangeText={setHeightCm} />
          </View>
          <View style={styles.half}>
            <Field label="Weight (kg)" keyboardType="numeric" placeholder="60" value={weightKg} onChangeText={setWeightKg} />
          </View>
        </View>

        <Field
          label="Average cycle length (days)"
          keyboardType="numeric"
          placeholder="28"
          value={cycleLengthDays}
          onChangeText={setCycleLengthDays}
        />

        <PillSelect label="Exercise frequency" value={exerciseFrequency} options={EXERCISE} onChange={setExerciseFrequency} />
        <PillSelect label="Alcohol" value={alcohol} options={ALCOHOL} onChange={setAlcohol} />

        <Field label="Avg. sleep (hrs)" keyboardType="numeric" placeholder="7" value={sleepHoursAvg} onChangeText={setSleepHoursAvg} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Smoker</Text>
          <Switch value={smoker} onValueChange={setSmoker} trackColor={{ true: colors.brand500 }} />
        </View>

        <Field label="Known conditions (comma-separated)" placeholder="PCOS, thyroid" value={knownConditions} onChangeText={setKnownConditions} />
        <Field label="Medications (comma-separated)" placeholder="e.g. metformin" value={medications} onChangeText={setMedications} />
        <Field label="Allergies (comma-separated)" placeholder="e.g. penicillin" value={allergies} onChangeText={setAllergies} />

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
          <Pressable
            style={styles.ackRow}
            onPress={() => setAcknowledged((a) => !a)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            accessibilityLabel="I understand HERAI does not provide medical diagnoses"
          >
            <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
              {acknowledged && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.ackText}>I understand HERAI does not provide medical diagnoses.</Text>
          </Pressable>
        </View>

        <ErrorText>{error}</ErrorText>
        <Button title={submitting ? "Saving…" : "Finish"} onPress={finish} loading={submitting} disabled={!acknowledged} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 6, marginBottom: 24, fontSize: 14, color: colors.ink700 },
  row2: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  disclaimerBox: { backgroundColor: colors.neutral50, borderWidth: 1, borderColor: colors.neutral200, borderRadius: 12, padding: 14, marginBottom: 16, gap: 12 },
  disclaimerText: { fontSize: 12, color: colors.ink700, lineHeight: 17, fontStyle: "italic" },
  ackRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  checkboxChecked: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  checkboxMark: { color: colors.white, fontSize: 13, fontWeight: "700" },
  ackText: { flex: 1, fontSize: 13, color: colors.ink900, fontWeight: "500" },
});
