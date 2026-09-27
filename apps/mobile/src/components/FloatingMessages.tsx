import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MessagesPane, type Thread } from "./MessagesPane";
import { colors } from "../theme";

/** Same messaging feature as before, just reached from a floating bubble on Partner home instead of sitting inline on the page. */
export function FloatingMessages({ threads }: { threads: Thread[] }) {
  const [open, setOpen] = useState(false);
  if (threads.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Messages"
        style={({ pressed }) => [s.bubbleWrap, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <LinearGradient colors={[colors.brand600, colors.brand500]} style={s.bubbleFill}>
          <Ionicons name="chatbubble-ellipses" size={26} color={colors.onBrand} />
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <View style={s.handleRow}>
            <View style={s.handle} />
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" style={s.closeBtn}>
              <Ionicons name="close" size={20} color={colors.ink700} />
            </Pressable>
          </View>
          <MessagesPane threads={threads} />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bubbleWrap: { position: "absolute", right: 18, bottom: 96, width: 58, height: 58, borderRadius: 29, elevation: 6 },
  bubbleFill: { flex: 1, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "75%", backgroundColor: colors.neutral50, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 28 },
  handleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral300 },
  closeBtn: { position: "absolute", right: 0, top: -6, padding: 6 },
});
