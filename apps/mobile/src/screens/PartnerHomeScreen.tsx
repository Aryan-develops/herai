import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type Lang, type PartnerLink, type SubscriptionView, type SummaryResponse, type WomanCard, type WomanSummary } from "../lib/api";
import { DAY_PHASE_COLOR, PARTNER_PHASE_LOOK, shortDate } from "../lib/phases";
import { Button, ErrorText, Notice, ScreenTitle } from "../components/ui";
import { usePrefs } from "../context/PrefsContext";
import { CircleCard } from "../components/CircleCard";
import { InsightCards } from "../components/InsightCards";
import { moodOption } from "../components/moodOptions";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

function daysLabel(n: number | null, lang: Lang): string | null {
  if (n === null) return null;
  if (n <= 0) return lang === "hi" ? "पीरियड आज या जल्द अपेक्षित है" : "Period expected any day now";
  if (n === 1) return lang === "hi" ? "पीरियड कल अपेक्षित है" : "Period expected tomorrow";
  return lang === "hi" ? `पीरियड लगभग ${n} दिन में अपेक्षित है` : `Period expected in about ${n} days`;
}

function Hero({ s, lang }: { s: WomanSummary; lang: Lang }) {
  const key = s.phase.key;
  if (!key || !s.guidance) return null;
  const look = PARTNER_PHASE_LOOK[key];
  const day = s.phase.cycleDay ?? 1;
  const pct = Math.min(1, day / s.phase.cycleLengthDays);
  const countdown = daysLabel(s.phase.daysUntilNextPeriod, lang);
  return (
    <View style={[styles.hero, { backgroundColor: look.solid }]} accessible accessibilityLabel={`${s.guidance.title}, day ${day} of ${s.phase.cycleLengthDays}`}>
      <Text style={styles.eyebrow}>
        {s.link.firstName.toUpperCase()} · {lang === "hi" ? "अभी" : "RIGHT NOW"}
      </Text>
      <Text style={styles.heroTitle}>{s.guidance.title}</Text>
      <Text style={styles.heroBlurb}>{s.guidance.blurb}</Text>
      <View style={styles.trackRow}>
        <Text style={styles.dayText}>{lang === "hi" ? "दिन" : "Day"} {day}</Text>
        <Text style={styles.dayOf}>/ {s.phase.cycleLengthDays}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      {countdown ? <Text style={styles.heroMeta}>{countdown}</Text> : null}
      {s.phase.estimated ? (
        <View style={styles.estimate}>
          <Ionicons name="information-circle-outline" size={13} color={colors.onBrand} />
          <Text style={styles.estimateText}>{lang === "hi" ? "अनुमान" : "Estimate"}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MoodPanel({ s, lang }: { s: WomanSummary; lang: Lang }) {
  if (!s.mood) return null;
  const m = moodOption(s.mood.mood);
  const hours = Math.max(1, Math.round((Date.now() - new Date(s.mood.at).getTime()) / 3600000));
  return (
    <View style={styles.card}>
      <View style={styles.rowCenter}>
        <View style={[styles.moodIcon, { backgroundColor: m.bg }]}>
          <Ionicons name={m.icon} size={22} color={m.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {s.link.firstName} {lang === "hi" ? "का मूड" : "checked in"}: {m.label}
            {s.mood.energy ? ` · ${lang === "hi" ? "कितना" : "how much"} ${s.mood.energy}/5` : ""}
          </Text>
          <Text style={styles.small}>{hours}h ago</Text>
        </View>
      </View>
      {s.guidance?.moodNote ? <Text style={styles.body}>{s.guidance.moodNote}</Text> : null}
      {s.guidance?.need ? (
        <View style={styles.need}>
          <Ionicons name="hand-left-outline" size={18} color={colors.brand600} />
          <View style={{ flex: 1 }}>
            <Text style={styles.needTitle}>{s.guidance.need.title}</Text>
            <Text style={styles.body}>{s.guidance.need.text}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function GuidanceCards({ s, lang }: { s: WomanSummary; lang: Lang }) {
  const { width } = useWindowDimensions();
  const [copied, setCopied] = useState<string | null>(null);
  const g = s.guidance;
  if (!g) return null;
  const cardWidth = Math.min(width - 56, 340);
  const cards = [
    { id: "do", title: lang === "hi" ? "क्या करें" : "Do", items: g.do, bg: colors.emerald50, fg: colors.emerald700, copy: false },
    { id: "say", title: lang === "hi" ? "क्या कहें" : "Say", items: g.say, bg: colors.violet50, fg: colors.violet700, copy: true },
    { id: "avoid", title: lang === "hi" ? "क्या न करें" : "Avoid", items: g.avoid, bg: colors.peach50, fg: colors.peach600, copy: false },
  ];
  return (
    <ScrollView horizontal snapToInterval={cardWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
      {cards.map((c) => (
        <View key={c.id} style={[styles.guideCard, { width: cardWidth, backgroundColor: c.bg }]}>
          <Text style={[styles.guideTitle, { color: c.fg }]}>{c.title}</Text>
          {c.items.map((item) => (
            <View key={item} style={styles.guideItem}>
              <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
              {c.copy ? (
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(item.replace(/^["“”]+|["“”]+$/g, ""));
                    setCopied(item);
                    setTimeout(() => setCopied(null), 1600);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Copy message"
                  hitSlop={8}
                  style={styles.copy}
                >
                  <Ionicons name={copied === item ? "checkmark" : "copy-outline"} size={14} color={colors.brand700} />
                  <Text style={styles.copyText}>{copied === item ? (lang === "hi" ? "कॉपी हुआ" : "Copied") : lang === "hi" ? "कॉपी" : "Copy"}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Tasks({ s, linkId, lang, onProgress }: { s: WomanSummary; linkId: string; lang: Lang; onProgress: (p: WomanSummary["progress"]) => void }) {
  const [error, setError] = useState<string | null>(null);
  const tasks = s.guidance?.tasks ?? [];
  const done = s.progress.doneToday.filter((id) => tasks.some((t) => t.id === id));
  const allDone = tasks.length > 0 && done.length === tasks.length;

  async function toggle(id: string, next: boolean) {
    setError(null);
    try {
      const res = await api.partnerTask(linkId, { taskId: id, done: next });
      onProgress({ doneToday: res.doneToday, streak: res.streak });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowCenter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{lang === "hi" ? "आज की 3 छोटी बातें" : "Today's 3 small things"}</Text>
          <Text style={styles.small}>{allDone ? (lang === "hi" ? "शानदार! आज सब हो गया." : "Lovely. All done for today.") : lang === "hi" ? "छोटे कदम ही मायने रखते हैं." : "Small gestures matter most."}</Text>
        </View>
        <View style={[styles.streak, s.progress.streak > 0 && { backgroundColor: colors.peach100 }]} accessibilityLabel={`${s.progress.streak} day streak`}>
          <Ionicons name="flame" size={14} color={s.progress.streak > 0 ? colors.peach600 : colors.muted} />
          <Text style={[styles.streakText, s.progress.streak > 0 && { color: colors.peach600 }]}>{s.progress.streak}</Text>
        </View>
      </View>
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: tasks.length, now: done.length }}>
        <View style={[styles.progressFill, { width: `${tasks.length ? (done.length / tasks.length) * 100 : 0}%` }]} />
      </View>
      {tasks.map((t) => {
        const checked = done.includes(t.id);
        return (
          <Pressable
            key={t.id}
            onPress={() => toggle(t.id, !checked)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            style={[styles.task, checked && { backgroundColor: colors.emerald50, borderColor: colors.sage100 }]}
          >
            <View style={[styles.check, checked && { backgroundColor: colors.sage700, borderColor: colors.sage700 }]}>
              {checked ? <Ionicons name="checkmark" size={14} color={colors.neutral50} /> : null}
            </View>
            <Text style={[styles.body, { flex: 1 }, checked && { textDecorationLine: "line-through", color: colors.emerald700 }]}>{t.text}</Text>
          </Pressable>
        );
      })}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

function Outlook({ s, lang }: { s: WomanSummary; lang: Lang }) {
  if (!s.calendar) return null;
  const eventDates = new Set(s.events.map((e) => e.date));
  const today = s.calendar[0]?.date;
  const legend: [keyof typeof DAY_PHASE_COLOR, string, string][] = [
    ["menstrual", "Period", "पीरियड"],
    ["pms", "PMS", "PMS"],
    ["ovulation", "Fertile", "फर्टाइल"],
    ["follicular", "Fresh", "ताज़ा"],
    ["luteal", "Slow", "धीमा"],
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{lang === "hi" ? "अगले 14 दिन" : "Next 14 days"}</Text>
      <View style={styles.calendar}>
        {s.calendar.map((d) => {
          const date = new Date(`${d.date}T00:00:00`);
          return (
            <View key={d.date} style={[styles.day, d.date === today && { backgroundColor: colors.brand50 }]} accessible accessibilityLabel={`${shortDate(d.date)}: ${d.phase ?? "unknown"}${eventDates.has(d.date) ? ", plan" : ""}`}>
              <Text style={styles.dayWeek}>{date.toLocaleDateString(undefined, { weekday: "narrow" })}</Text>
              <Text style={styles.dayNum}>{date.getDate()}</Text>
              <View style={[styles.dot, { backgroundColor: d.phase ? DAY_PHASE_COLOR[d.phase] : colors.neutral300 }]} />
              <View style={[styles.planDot, { backgroundColor: eventDates.has(d.date) ? colors.ink900 : "transparent" }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {legend.map(([id, en, hi]) => (
          <View key={id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: DAY_PHASE_COLOR[id] }]} />
            <Text style={styles.small}>{lang === "hi" ? hi : en}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.planDot, { backgroundColor: colors.ink900 }]} />
          <Text style={styles.small}>{lang === "hi" ? "आपका प्लान" : "Your plan"}</Text>
        </View>
      </View>
    </View>
  );
}

function Plans({ s, linkId, lang, onChanged }: { s: WomanSummary; linkId: string; lang: Lang; onChanged: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await api.partnerAddEvent(linkId, { title: title.trim(), date: date.trim() });
      setTitle("");
      setDate("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that. Use a date like 2026-10-24.");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{lang === "hi" ? "आपके प्लान" : "Your plans"}</Text>
      <Text style={styles.small}>{lang === "hi" ? "बड़े दिनों से पहले हम आपको सचेत करेंगे." : "Add anniversaries or trips and we'll flag any that fall on a tougher day."}</Text>
      {s.events.length === 0 ? <Text style={styles.small}>{lang === "hi" ? "अभी कोई प्लान नहीं." : "No plans yet."}</Text> : null}
      {s.events.map((e) => (
        <View key={e.id} style={styles.event}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{e.title}</Text>
            <Text style={styles.small}>{shortDate(e.date)}</Text>
            {e.headsUp ? (
              <View style={styles.headsUp}>
                <Ionicons name="warning-outline" size={14} color={colors.amber900} />
                <Text style={[styles.small, { color: colors.amber900, flex: 1 }]}>
                  {e.headsUp === "menstrual"
                    ? lang === "hi" ? "यह दिन उसके पीरियड के आसपास पड़ सकता है. योजना हल्की रखें." : "Likely around her period. Keep the plan light and flexible."
                    : lang === "hi" ? "यह पीरियड से पहले के दिनों में पड़ सकता है. धैर्य रखें." : "Likely in her pre-period days. Extra patience helps."}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={async () => {
              await api.partnerDeleteEvent(linkId, e.id).catch(() => {});
              onChanged();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${e.title}`}
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={lang === "hi" ? "जैसे: सालगिरह डिनर" : "e.g. Anniversary dinner"} placeholderTextColor={colors.muted} maxLength={80} accessibilityLabel="Plan title" />
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} accessibilityLabel="Plan date" autoCorrect={false} />
      <ErrorText>{error}</ErrorText>
      <Button title={lang === "hi" ? "जोड़ें" : "Add plan"} variant="outline" onPress={add} disabled={!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())} />
    </View>
  );
}

function Feedback({ s, linkId, lang }: { s: WomanSummary; linkId: string; lang: Lang }) {
  const [given, setGiven] = useState<boolean | null>(null);
  const key = s.guidance?.key;
  if (!key) return null;
  async function send(helpful: boolean) {
    setGiven(helpful);
    await api.partnerFeedback(linkId, { guidanceKey: key!, helpful }).catch(() => {});
  }
  return (
    <View style={[styles.card, styles.rowCenter]}>
      <Text style={[styles.body, { flex: 1 }]}>{given === null ? (lang === "hi" ? "क्या ये सुझाव काम आए?" : "Were these suggestions helpful?") : lang === "hi" ? "धन्यवाद, इससे सुझाव बेहतर होंगे." : "Thanks, that helps us improve."}</Text>
      {given === null ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => send(true)} accessibilityRole="button" accessibilityLabel="Helpful" style={styles.thumb}>
            <Ionicons name="thumbs-up-outline" size={18} color={colors.ink900} />
          </Pressable>
          <Pressable onPress={() => send(false)} accessibilityRole="button" accessibilityLabel="Not helpful" style={styles.thumb}>
            <Ionicons name="thumbs-down-outline" size={18} color={colors.ink900} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function WomanView({ summary, lang, onRefresh }: { summary: WomanSummary; lang: Lang; onRefresh: () => void }) {
  const [progress, setProgress] = useState(summary.progress);
  useEffect(() => setProgress(summary.progress), [summary.progress]);
  const s = { ...summary, progress };
  const linkId = summary.link.id;
  return (
    <View style={{ gap: 14 }}>
      <Hero s={s} lang={lang} />
      <MoodPanel s={s} lang={lang} />
      <GuidanceCards s={s} lang={lang} />
      <InsightCards title={lang === "hi" ? "आज की जानकारी" : "Today's insights"} cards={s.insights} />
      <Tasks s={s} linkId={linkId} lang={lang} onProgress={setProgress} />
      <Outlook s={s} lang={lang} />
      {s.comfort && s.comfort.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{lang === "hi" ? "क्या उसे अच्छा लगता है" : "What helps her"}</Text>
          <View style={styles.wrap}>
            {s.comfort.map((c) => (
              <View key={c} style={styles.tag}>
                <Text style={styles.tagText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {s.symptoms && s.symptoms.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{lang === "hi" ? "हाल के लक्षण" : "Recently mentioned"}</Text>
          <View style={styles.wrap}>
            {s.symptoms.map((x) => (
              <View key={x} style={[styles.tag, { backgroundColor: colors.violet50 }]}>
                <Text style={[styles.tagText, { color: colors.violet700 }]}>{x}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.small}>{lang === "hi" ? "केवल नाम, कोई विवरण नहीं." : "Names only, no details."}</Text>
        </View>
      ) : null}
      {s.fertility ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{lang === "hi" ? "फर्टाइल विंडो" : "Fertile window"}</Text>
          <Text style={styles.body}>
            {shortDate(s.fertility.window.start)} – {shortDate(s.fertility.window.end)}
            {s.fertility.ovulationDate ? ` · ${lang === "hi" ? "ओव्यूलेशन" : "ovulation"} ~${shortDate(s.fertility.ovulationDate)}` : ""}
          </Text>
          <Text style={styles.small}>{lang === "hi" ? "अनुमान है, गारंटी नहीं. उसने इसे साझा करना चुना है, कृपया सम्मान से लें." : "An estimate, not a guarantee. She chose to share this, so treat it with care."}</Text>
        </View>
      ) : null}
      <Plans s={s} linkId={linkId} lang={lang} onChanged={onRefresh} />
      <Feedback s={s} linkId={linkId} lang={lang} />
      {s.guidance ? (
        <>
          <View style={styles.card}>
            <View style={styles.rowCenter}>
              <Ionicons name="book-outline" size={18} color={colors.violet700} />
              <Text style={styles.cardTitle}>{lang === "hi" ? "एक छोटी सीख" : "Quick lesson"}</Text>
            </View>
            <Text style={styles.body}>{s.guidance.lesson}</Text>
          </View>
          <Text style={styles.small}>{s.guidance.disclaimer}</Text>
          <Text style={styles.small}>{s.guidance.clinicianNote}</Text>
        </>
      ) : null}
    </View>
  );
}

export function PartnerHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [women, setWomen] = useState<WomanCard[] | null>(null);
  const [supporters, setSupporters] = useState<PartnerLink[] | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState<{ status: number; message: string } | null>(null);
  const { prefs, update } = usePrefs();
  const lang: Lang = prefs?.language ?? "en";
  const langReady = prefs !== null;

  useFocusEffect(
    useCallback(() => {
      if (!langReady) return;
      api
        .listWomen(lang)
        .then(({ women, subscription }) => {
          setWomen(women);
          setSubscription(subscription);
          setSelected((cur) => (cur && women.some((w) => w.linkId === cur) ? cur : women[0]?.linkId ?? null));
        })
        .catch(() => setWomen([]));
      const refreshLists = () => {
        api.listMyPartners().then(({ partners }) => setSupporters(partners)).catch(() => setSupporters((cur) => cur ?? []));
        api.listWomen(lang).then(({ women, subscription }) => { setWomen(women); setSubscription(subscription); }).catch(() => {});
      };
      refreshLists();
      const timer = setInterval(refreshLists, 60_000);
      return () => clearInterval(timer);
    }, [lang, langReady]),
  );

  const loadSummary = useCallback(() => {
    if (!selected) return;
    setSummaryError(null);
    api
      .womanSummary(selected, lang)
      .then((s) => {
        setSummary(s);
      })
      .catch((err) => {
        setSummary(null);
        setSummaryError({ status: err instanceof ApiError ? err.status : 0, message: err instanceof ApiError ? err.message : "Couldn't load this." });
      });
  }, [selected, lang]);

  useEffect(() => {
    setSummary(null);
    loadSummary();
  }, [loadSummary]);

  // Keep what she shares fresh: refetch whenever this tab is focused and every minute while it is.
  useFocusEffect(
    useCallback(() => {
      loadSummary();
      const timer = setInterval(loadSummary, 60_000);
      return () => clearInterval(timer);
    }, [loadSummary]),
  );

  function switchLang(next: Lang) {
    update({ language: next });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <ScreenTitle title="Partner home" subtitle="How she's doing today, and small ways to help." />
        </View>
        <View style={styles.langRow} accessibilityRole="radiogroup" accessibilityLabel="Language">
          {(["en", "hi"] as const).map((id) => (
            <Pressable key={id} onPress={() => switchLang(id)} accessibilityRole="radio" accessibilityState={{ checked: lang === id }} style={[styles.lang, lang === id && styles.langActive]}>
              <Text style={[styles.langText, lang === id && { color: colors.brand700 }]}>{id === "en" ? "EN" : "हिं"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {subscription ? (
        <Pressable onPress={() => navigation.navigate("PartnerUpgrade")} accessibilityRole="button" style={styles.banner}>
          <Ionicons name="sparkles" size={16} color={colors.violet700} />
          <Text style={styles.bannerText}>
            {!subscription.paywallOn
              ? "Following is free while we're in testing. See what's coming."
              : subscription.state === "trialing"
                ? `Free trial: ${subscription.daysLeft} day${subscription.daysLeft === 1 ? "" : "s"} left. ₹${subscription.priceInr}/month after.`
                : "Plan and gifts"}
          </Text>
        </Pressable>
      ) : null}

      {women === null ? <View style={styles.skeleton} /> : null}
      {women?.length === 0 && supporters?.filter((p) => p.status !== "revoked").length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-circle" size={30} color={colors.onBrand} />
          </View>
          <Text style={styles.emptyTitle}>Your circle starts here</Text>
          <Text style={styles.emptyBody}>Invite someone you trust to support you, or enter a code to follow someone. Whoever shares decides exactly what is seen, and can stop any time.</Text>
          <Button title="Invite or enter a code" onPress={() => navigation.navigate("PartnerSettings")} />
        </View>
      ) : null}

      <CircleCard supporters={supporters} following={women} selected={selected} onSelect={setSelected} onManage={() => navigation.navigate("PartnerSettings")} />

      {women && women.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
          {women.map((w) => {
            const active = w.linkId === selected;
            const look = w.phaseKey ? PARTNER_PHASE_LOOK[w.phaseKey] : null;
            return (
              <Pressable key={w.linkId} onPress={() => setSelected(w.linkId)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.switcher, active && styles.switcherActive]}>
                <View style={[styles.dot, { backgroundColor: look?.solid ?? colors.neutral300 }]} />
                <Text style={[styles.switcherText, active && { color: colors.brand700 }]}>{w.firstName}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {women && women.length > 0 ? (
        <View>
          {summaryError?.status === 402 ? (
            <Notice tone="warning">Your free trial has ended. Open Plan and gifts to keep following.</Notice>
          ) : summaryError ? (
            <ErrorText>{summaryError.message}</ErrorText>
          ) : null}
          {!summary && !summaryError ? <View style={styles.skeleton} /> : null}
          {summary && summary.available === false ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{summary.message}</Text>
              <Text style={styles.small}>Check back later.</Text>
            </View>
          ) : null}
          {summary && summary.available ? <WomanView key={summary.link.id} summary={summary} lang={lang} onRefresh={loadSummary} /> : null}
        </View>
      ) : null}

      <View style={{ gap: 8, marginTop: 8 }}>
        <Button title="Follow someone else" variant="outline" onPress={() => navigation.navigate("PartnerSettings")} />
        <Button title="Plan and gifts" variant="ghost" onPress={() => navigation.navigate("PartnerUpgrade")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  langRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  lang: { minWidth: 44, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  langActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  langText: { fontSize: 12, fontWeight: "700", color: colors.ink700 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.violet50, borderRadius: radius.md, padding: 12 },
  bannerText: { flex: 1, fontSize: 13, color: colors.violet700, lineHeight: 18 },
  skeleton: { height: 150, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  empty: { alignItems: "center", gap: 10, backgroundColor: colors.brand50, borderRadius: radius.lg, padding: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.ink900, textAlign: "center" },
  emptyBody: { fontSize: 14, color: colors.ink700, textAlign: "center", lineHeight: 20, marginBottom: 6 },
  switcher: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white },
  switcherActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  switcherText: { fontSize: 14, fontWeight: "600", color: colors.ink700 },
  hero: { borderRadius: radius.xl, padding: 20, gap: 4, ...shadow.soft },
  eyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { color: colors.onBrand, fontSize: 28, fontWeight: "700", marginTop: 2 },
  heroBlurb: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  trackRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 },
  dayText: { color: colors.onBrand, fontSize: 18, fontWeight: "700" },
  dayOf: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden", marginTop: 6 },
  fill: { height: 8, borderRadius: 4, backgroundColor: "#ffffff" },
  heroMeta: { color: "rgba(255,255,255,0.88)", fontSize: 12, marginTop: 8 },
  estimate: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  estimateText: { color: colors.onBrand, fontSize: 11, fontWeight: "700" },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 10, ...shadow.soft },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  body: { fontSize: 14, color: colors.ink700, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  moodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  need: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.brand50, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.brand100 },
  needTitle: { fontSize: 14, fontWeight: "700", color: colors.brand700 },
  guideCard: { borderRadius: radius.lg, padding: 16, gap: 10 },
  guideTitle: { fontSize: 18, fontWeight: "700" },
  guideItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  copy: { flexDirection: "row", alignItems: "center", gap: 3, minHeight: 32, paddingHorizontal: 6 },
  copyText: { fontSize: 12, fontWeight: "700", color: colors.brand700 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.neutral200 },
  streakText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.neutral200, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.brand500 },
  task: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, paddingHorizontal: 12 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center" },
  calendar: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  day: { width: "13%", alignItems: "center", gap: 3, paddingVertical: 6, borderRadius: 10 },
  dayWeek: { fontSize: 10, color: colors.muted },
  dayNum: { fontSize: 12, fontWeight: "600", color: colors.ink900 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  planDot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: colors.brand50, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontSize: 13, color: colors.brand700, fontWeight: "600" },
  event: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, padding: 12 },
  eventTitle: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  headsUp: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 6 },
  input: { height: 46, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white },
  thumb: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
});
