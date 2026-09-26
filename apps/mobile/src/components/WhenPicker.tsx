import { createElement, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "./ui";
import { colors, radius } from "../theme";

const DAY_MS = 24 * 60 * 60 * 1000;

type Choice = "now" | "morning" | "yesterday" | "custom";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function niceDateTime(d: Date): string {
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * "When did this happen?" Quick choices plus a custom date and time (native pickers on phones, a datetime input
 * on web) so entries can be added for a day you forgot. `value` is an ISO timestamp, or undefined for "now".
 */
export function WhenPicker({ value, onChange }: { value: string | undefined; onChange: (iso: string | undefined) => void }) {
  const [choice, setChoice] = useState<Choice>(value ? "custom" : "now");
  const [custom, setCustom] = useState<Date>(value ? new Date(value) : new Date());
  const [showIos, setShowIos] = useState(false);

  function apply(next: Date) {
    const clamped = next.getTime() > Date.now() ? new Date() : next;
    setCustom(clamped);
    onChange(clamped.toISOString());
  }

  function pick(next: Choice) {
    setChoice(next);
    if (next === "now") onChange(undefined);
    if (next === "morning") {
      const d = new Date();
      d.setHours(8, 0, 0, 0);
      onChange(d.getTime() > Date.now() ? new Date(Date.now() - 3600 * 1000).toISOString() : d.toISOString());
    }
    if (next === "yesterday") {
      const d = new Date(Date.now() - DAY_MS);
      d.setHours(12, 0, 0, 0);
      onChange(d.toISOString());
    }
    if (next === "custom") {
      onChange(custom.toISOString());
      if (Platform.OS === "android") openAndroid();
      if (Platform.OS === "ios") setShowIos(true);
    }
  }

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: custom,
      mode: "date",
      maximumDate: new Date(),
      onChange: (e: DateTimePickerEvent, date?: Date) => {
        if (e.type !== "set" || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          is24Hour: false,
          onChange: (e2: DateTimePickerEvent, time?: Date) => {
            if (e2.type !== "set" || !time) return;
            const merged = new Date(date);
            merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
            apply(merged);
          },
        });
      },
    });
  }

  return (
    <View>
      <View style={styles.head}>
        <Ionicons name="calendar-outline" size={16} color={colors.brand600} />
        <Text style={styles.label}>When did this happen?</Text>
      </View>
      <View style={styles.chips}>
        <Chip label="Now" selected={choice === "now"} onPress={() => pick("now")} />
        <Chip label="This morning" selected={choice === "morning"} onPress={() => pick("morning")} />
        <Chip label="Yesterday" selected={choice === "yesterday"} onPress={() => pick("yesterday")} />
        <Chip label="Pick date & time" selected={choice === "custom"} onPress={() => pick("custom")} />
      </View>

      {choice === "custom" && Platform.OS === "web" &&
        createElement("input", {
          type: "datetime-local",
          value: toLocalInput(custom),
          max: toLocalInput(new Date()),
          "aria-label": "Date and time",
          onChange: (e: { target: { value: string } }) => e.target.value && apply(new Date(e.target.value)),
          style: { height: 46, borderRadius: 12, border: `1px solid ${colors.neutral300}`, padding: "0 12px", fontSize: 15, marginTop: 10, background: colors.white, color: colors.ink900 },
        })}

      {choice === "custom" && Platform.OS !== "web" && (
        <Pressable onPress={() => (Platform.OS === "android" ? openAndroid() : setShowIos((v) => !v))} accessibilityRole="button" accessibilityLabel="Change date and time" style={styles.customRow}>
          <Text style={styles.customText}>{niceDateTime(custom)}</Text>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      )}

      {choice === "custom" && Platform.OS === "ios" && showIos && (
        <DateTimePicker value={custom} mode="datetime" display="spinner" maximumDate={new Date()} onChange={(_e, d) => d && apply(d)} themeVariant={colors.white === "#ffffff" ? "light" : "dark"} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  customRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 46, marginTop: 10, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: colors.white },
  customText: { fontSize: 15, color: colors.ink900 },
  change: { fontSize: 13, fontWeight: "700", color: colors.brand600 },
});
