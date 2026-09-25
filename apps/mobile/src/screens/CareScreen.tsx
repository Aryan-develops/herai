import { useCallback, useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { api, type CareProvider, type ProviderType } from "../lib/api";
import { Button, Chip, Notice, ScreenTitle } from "../components/ui";
import { Rating, rupees } from "../components/careBits";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Care">;

const TABS: { value: ProviderType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lab", label: "Labs" },
  { value: "doctor", label: "Doctors" },
  { value: "clinic", label: "Clinics" },
];

export function CareScreen({ navigation, route }: Props) {
  const [type, setType] = useState<ProviderType | "all">(route.params?.type ?? "all");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState("");
  const [home, setHome] = useState(false);
  const [tele, setTele] = useState(false);
  const [avail, setAvail] = useState(false);
  const [providers, setProviders] = useState<CareProvider[] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const load = useCallback(() => {
    setProviders(null);
    api
      .listProviders({
        type: type === "all" ? undefined : type,
        ...(coords ?? {}),
        radiusKm: 50,
        city: coords ? undefined : city.trim() || undefined,
        homeCollection: home,
        teleconsult: tele,
        available: avail,
      })
      .then(({ providers }) => setProviders(providers))
      .catch(() => setProviders([]));
  }, [type, coords, city, home, tele, avail]);

  useEffect(load, [load]);

  async function useMyLocation() {
    setLocError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") throw new Error("denied");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocError("Couldn't get your location. Search by city instead.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Find care near you" subtitle="Labs and doctors in the HERAI partner network." />

      <Button title="My requests" variant="outline" onPress={() => navigation.navigate("MyRequests")} />

      <View style={styles.searchRow}>
        <Pressable onPress={useMyLocation} disabled={locating} accessibilityRole="button" style={[styles.locBtn, coords && styles.locBtnOn]}>
          {locating ? <ActivityIndicator color={colors.onBrand} /> : <Text style={[styles.locText, coords && { color: colors.brand700 }]}>{coords ? "Using your location" : "Use my location"}</Text>}
        </Pressable>
        <TextInput
          style={styles.city}
          value={city}
          onChangeText={(t) => {
            setCity(t);
            setCoords(null);
          }}
          placeholder="Or search by city"
          placeholderTextColor={colors.muted}
          accessibilityLabel="City"
        />
      </View>
      {locError ? <Notice tone="warning">{locError}</Notice> : null}

      <View style={styles.chips}>
        {TABS.map((t) => (
          <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </View>
      <View style={styles.chips}>
        <Chip label="Home collection" selected={home} onPress={() => setHome((v) => !v)} />
        <Chip label="Video consult" selected={tele} onPress={() => setTele((v) => !v)} />
        <Chip label="Available now" selected={avail} onPress={() => setAvail((v) => !v)} />
      </View>

      {providers === null && <View style={styles.skeleton} />}
      {providers?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No partners here yet</Text>
          <Text style={styles.emptyBody}>We're growing the network. Try another city, or ask your usual lab or doctor to join.</Text>
        </View>
      )}

      {providers?.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => navigation.navigate("CareProvider", { id: p.id })}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.type}`}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{p.type[0].toUpperCase() + p.type.slice(1)}{p.specialties.length ? ` · ${p.specialties.join(", ")}` : ""}</Text>
                <Rating avg={p.ratingAvg} count={p.ratingCount} />
              </View>
            </View>
            {p.distanceKm !== null && <Text style={styles.dist}>{p.distanceKm} km</Text>}
          </View>
          <Text style={styles.addr}>{p.address}</Text>
          {p.isSample && <Text style={styles.sample}>Sample listing</Text>}
          <View style={styles.tags}>
            <Tag text={p.available ? "Available" : "Unavailable"} tone={p.available ? "ok" : "off"} />
            {p.priceFromInr !== null && <Tag text={`From ${rupees(p.priceFromInr)}`} />}
            {p.homeCollection && <Tag text="Home collection" tone="ok" />}
            {p.offersTeleconsult && <Tag text="Video consult" tone="violet" />}
          </View>
          <View style={styles.actions}>
            <Text style={styles.link}>View & book</Text>
            {p.phone && (
              <Pressable onPress={() => Linking.openURL(`tel:${p.phone}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Call ${p.name}`}>
                <Text style={styles.linkPlain}>Call</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Tag({ text, tone }: { text: string; tone?: "ok" | "off" | "violet" }) {
  const bg = tone === "ok" ? colors.sage100 : tone === "violet" ? colors.violet50 : tone === "off" ? colors.neutral200 : colors.neutral200;
  const fg = tone === "ok" ? colors.sage700 : tone === "violet" ? colors.violet700 : colors.ink700;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: fg }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  searchRow: { flexDirection: "row", gap: 8 },
  locBtn: { minHeight: 46, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center" },
  locBtnOn: { backgroundColor: colors.brand100 },
  locText: { color: colors.onBrand, fontWeight: "700", fontSize: 14 },
  city: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skeleton: { height: 120, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  empty: { borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brand500, padding: 20, backgroundColor: colors.white },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  emptyBody: { fontSize: 13, color: colors.ink700, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 8, ...shadow.soft },
  cardTop: { flexDirection: "row", gap: 8 },
  name: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 2 },
  meta: { fontSize: 13, color: colors.ink700 },
  dist: { fontSize: 12, fontWeight: "700", color: colors.ink900, backgroundColor: colors.neutral200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  addr: { fontSize: 13, color: colors.ink700 },
  sample: { fontSize: 11, fontWeight: "700", color: colors.amber900 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 4 },
  link: { fontSize: 14, fontWeight: "700", color: colors.brand600 },
  linkPlain: { fontSize: 14, fontWeight: "600", color: colors.ink700 },
});
