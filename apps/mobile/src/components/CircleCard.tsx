import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { PartnerLink, WomanCard } from "../lib/api";
import { PARTNER_PHASE_LOOK } from "../lib/phases";
import { colors, radius, shadow } from "../theme";

const REL: Record<string, string> = { partner: "Partner", family: "Family", friend: "Friend" };

/** Both sides of the circle: people supporting you and people you follow. Refreshed with the page's polling. */
export function CircleCard({
  supporters,
  following,
  selected,
  onSelect,
  onManage,
}: {
  supporters: PartnerLink[] | null;
  following: WomanCard[] | null;
  selected: string | null;
  onSelect: (linkId: string) => void;
  onManage: () => void;
}) {
  const live = (supporters ?? []).filter((s) => s.status !== "revoked");
  if (!live.length && !following?.length) return null;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title} accessibilityRole="header">Your circle</Text>
        <Pressable onPress={onManage} accessibilityRole="button" hitSlop={10}>
          <Text style={s.manage}>Manage</Text>
        </Pressable>
      </View>

      {live.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={s.group}>SUPPORTING YOU</Text>
          {live.map((p) => {
            const shared = Object.values(p.scopes).filter(Boolean).length;
            const active = p.status === "active";
            return (
              <View key={p.id} style={s.row}>
                <Avatar name={p.nickname ?? p.firstName} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.nickname ?? p.firstName}</Text>
                  <Text style={s.sub}>{REL[p.relationship] ?? p.relationship} · sees {shared} of {Object.keys(p.scopes).length} things</Text>
                </View>
                <View style={[s.pill, { backgroundColor: active ? colors.sage100 : colors.amber50 }]}>
                  <Text style={[s.pillText, { color: active ? colors.sage700 : colors.amber900 }]}>{active ? "Active" : "Paused"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!!following?.length && (
        <View style={{ marginTop: 14 }}>
          <Text style={s.group}>YOU'RE FOLLOWING</Text>
          {following.map((w) => {
            const look = w.phaseKey ? PARTNER_PHASE_LOOK[w.phaseKey] : null;
            const on = w.linkId === selected;
            return (
              <Pressable key={w.linkId} onPress={() => onSelect(w.linkId)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.row, on && s.rowOn]}>
                <Avatar name={w.firstName} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{w.firstName}</Text>
                  <Text style={s.sub}>{REL[w.relationship] ?? w.relationship}</Text>
                </View>
                {w.available && w.cycleDay ? (
                  <View style={s.dayWrap}>
                    <View style={[s.dot, { backgroundColor: look?.solid ?? colors.neutral300 }]} />
                    <Text style={s.day}>Day {w.cycleDay}</Text>
                  </View>
                ) : (
                  <View style={[s.pill, { backgroundColor: colors.neutral200 }]}>
                    <Text style={[s.pillText, { color: colors.ink700 }]}>{w.available ? "Synced" : "Not sharing now"}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={s.foot}>
        <Ionicons name="sync" size={13} color={colors.muted} />
        <Text style={s.footText}>Updates on both sides within a minute. Whoever shares can pause or stop any time.</Text>
      </View>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <LinearGradient colors={[colors.brand500, "#7c4dd6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
      <Text style={s.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 14, ...shadow.soft },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  manage: { fontSize: 14, fontWeight: "700", color: colors.brand700 },
  group: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.4, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, padding: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral200, marginBottom: 8 },
  rowOn: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  name: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  dayWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  day: { fontSize: 12, fontWeight: "600", color: colors.ink700 },
  foot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  footText: { flex: 1, fontSize: 11, color: colors.muted },
});
