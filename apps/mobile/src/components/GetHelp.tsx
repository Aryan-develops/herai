import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SupportForm } from "./SupportForm";
import { colors, radius } from "../theme";

// India national numbers; each row dials with one tap.
const HELPLINES = [
  { name: "Emergency (police, fire, ambulance)", number: "112" },
  { name: "Ambulance", number: "108" },
  { name: "Women helpline", number: "181" },
  { name: "Tele-MANAS mental health support (24x7)", number: "14416" },
];

export function GetHelpButton({ onFindCare }: { onFindCare?: (type?: "doctor") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Get help"
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="help-buoy" size={16} color={colors.brand700} />
        <Text style={styles.pillText}>Get help</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} accessibilityRole="header">
                  Get help
                </Text>
                <Text style={styles.sub}>If you're in danger or feel very unwell, call now.</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.ink700} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {HELPLINES.map((h) => (
                <Pressable
                  key={h.number}
                  onPress={() => Linking.openURL(`tel:${h.number}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${h.name} ${h.number}`}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.brand50 }]}
                >
                  <Text style={styles.rowName}>{h.name}</Text>
                  <Text style={styles.rowNumber}>{h.number}</Text>
                </Pressable>
              ))}

              {onFindCare && (
                <View style={styles.careBox}>
                  <Text style={styles.careTitle}>Want to see a clinician or get tested?</Text>
                  <Text style={styles.careSub}>Find labs and doctors near you.</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={() => {
                        setOpen(false);
                        onFindCare();
                      }}
                      style={styles.careBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.careBtnText}>Labs near me</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setOpen(false);
                        onFindCare("doctor");
                      }}
                      style={[styles.careBtn, styles.careBtnOutline]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.careBtnText, { color: colors.ink900 }]}>Doctors</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <SupportForm />
              <Text style={styles.note}>Numbers shown are for India. Lunee can't summon help for you and can't detect every emergency.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.brand50 },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.brand700 },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: "88%" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral200, paddingHorizontal: 14, marginTop: 8 },
  rowName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink900, paddingRight: 8 },
  rowNumber: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  careBox: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: 14, marginTop: 16 },
  careTitle: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  careSub: { fontSize: 13, color: colors.ink700, marginTop: 2 },
  careBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center" },
  careBtnOutline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral300 },
  careBtnText: { fontSize: 14, fontWeight: "700", color: colors.onBrand },
  note: { fontSize: 11, color: colors.muted, marginTop: 14, marginBottom: 8 },
});
