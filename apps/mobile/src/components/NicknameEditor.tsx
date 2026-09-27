import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme";

/** Small inline "pencil → text field" editor for the private nickname each side can give the other. */
export function NicknameEditor({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (nickname: string | null) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <View style={s.row}>
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          maxLength={40}
          style={s.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save nickname"
          disabled={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave(draft.trim() || null);
              setEditing(false);
            } finally {
              setSaving(false);
            }
          }}
          style={s.iconBtn}
        >
          <Ionicons name="checkmark" size={16} color={colors.sage700} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => {
            setDraft(value ?? "");
            setEditing(false);
          }}
          style={s.iconBtn}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit nickname" onPress={() => setEditing(true)} style={s.iconBtn}>
      <Ionicons name="pencil" size={14} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  input: { height: 32, width: 110, borderWidth: 1, borderColor: colors.brand500, borderRadius: radius.sm, paddingHorizontal: 8, fontSize: 13, color: colors.ink900, backgroundColor: colors.white },
  iconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8 },
});
