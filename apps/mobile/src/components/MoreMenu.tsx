import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { isPartnerOnly } from "../lib/gender";
import type { AppStackParamList } from "../navigation/types";
import { colors, radius, shadow } from "../theme";

export interface MoreItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function MoreMenu({ items }: { items: MoreItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="More" style={s.btn}>
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.ink900} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close menu">
          <View style={s.menu}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.neutral50 }]}
              >
                <Ionicons name={item.icon} size={20} color={colors.ink700} />
                <Text style={s.label}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Header-left menu for tab screens; reaches the parent stack for Settings, Reports and History. */
export function TabsMoreMenu() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>() ?? navigation;
  const { user } = useAuth();
  const items: MoreItem[] = [
    { label: "Settings", icon: "settings-outline", onPress: () => stack.navigate("Settings") },
    ...(isPartnerOnly(user)
      ? []
      : [
          { label: "Lab reports", icon: "document-text-outline" as const, onPress: () => stack.navigate("Reports") },
          { label: "History", icon: "time-outline" as const, onPress: () => stack.navigate("TimelinePage") },
        ]),
  ];
  return (
    <View style={{ marginLeft: 8 }}>
      <MoreMenu items={items} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  menu: {
    position: "absolute",
    top: 92,
    left: 12,
    minWidth: 190,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 4,
    ...shadow.soft,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
});
