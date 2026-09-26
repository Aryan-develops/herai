import { createElement, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, radius } from "../theme";

/** Date-only field (YYYY-MM-DD, local). Native picker on phones, a date input on web. */
export function DateField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (day: string) => void; min?: string; max?: string }) {
  const [showIos, setShowIos] = useState(false);
  const date = new Date(`${value}T12:00:00`);
  const toDay = (d: Date) => d.toLocaleDateString("sv");

  function open() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        minimumDate: min ? new Date(`${min}T00:00:00`) : undefined,
        maximumDate: max ? new Date(`${max}T23:59:59`) : undefined,
        onChange: (e: DateTimePickerEvent, d?: Date) => e.type === "set" && d && onChange(toDay(d)),
      });
    } else setShowIos((v) => !v);
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "web" ? (
        createElement("input", {
          type: "date",
          value,
          min,
          max,
          "aria-label": label,
          onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
          style: { height: 46, borderRadius: 12, border: `1px solid ${colors.neutral300}`, padding: "0 12px", fontSize: 15, background: colors.white, color: colors.ink900 },
        })
      ) : (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change`} style={styles.box}>
          <Text style={styles.value}>{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</Text>
        </Pressable>
      )}
      {Platform.OS === "ios" && showIos && (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          minimumDate={min ? new Date(`${min}T00:00:00`) : undefined}
          maximumDate={max ? new Date(`${max}T23:59:59`) : undefined}
          onChange={(_e, d) => d && onChange(toDay(d))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700, marginBottom: 6 },
  box: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, justifyContent: "center", paddingHorizontal: 12 },
  value: { fontSize: 15, color: colors.ink900 },
});
