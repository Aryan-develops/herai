/**
 * Daily insight cards, shown as swipeable cards to the person tracking and (in a partner voice) to the people
 * she shares with. Written by hand and general on purpose: no diagnosis, no medical claims, no supplements.
 */
import type { Lang, Mood, PhaseKey } from "./partnerContent.js";

export type InsightTone = "body" | "food" | "move" | "mind" | "care" | "talk" | "plan";

export interface InsightCard {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
}

type Loc = { en: string; hi: string };
type Raw = { id: string; tone: InsightTone; title: Loc; body: Loc };

const SELF: Record<PhaseKey, Raw[]> = {
  menstrual: [
    { id: "body", tone: "body", title: { en: "Go easy today", hi: "आज आराम से" }, body: { en: "Energy is often lowest in the first days. Rest is useful, not lazy.", hi: "शुरुआती दिनों में ऊर्जा अक्सर कम होती है। आराम करना आलस नहीं है।" } },
    { id: "food", tone: "food", title: { en: "Warm, iron-rich food", hi: "गरम, आयरन वाला खाना" }, body: { en: "Dal, spinach, jaggery or eggs with something warm to drink can feel good now.", hi: "दाल, पालक, गुड़ या अंडे के साथ कुछ गरम पीना अच्छा लग सकता है।" } },
    { id: "move", tone: "move", title: { en: "Gentle movement", hi: "हल्की हलचल" }, body: { en: "A slow walk or light stretching can ease cramps for some people.", hi: "धीमी सैर या हल्की स्ट्रेचिंग कुछ लोगों में ऐंठन कम करती है।" } },
    { id: "mind", tone: "mind", title: { en: "Lower the bar", hi: "उम्मीदें हल्की रखें" }, body: { en: "Pick one thing that matters today and let the rest wait.", hi: "आज एक ज़रूरी काम चुनें, बाकी को रुकने दें।" } },
  ],
  cramps: [
    { id: "body", tone: "body", title: { en: "Cramps are common", hi: "ऐंठन आम है" }, body: { en: "Heat on your lower belly and a comfortable position often help.", hi: "पेट के निचले हिस्से पर सेंक और आरामदायक मुद्रा अक्सर मदद करती है।" } },
    { id: "food", tone: "food", title: { en: "Warm and simple", hi: "गरम और सादा" }, body: { en: "Warm drinks and light meals can feel easier than heavy food.", hi: "गरम पेय और हल्का खाना भारी खाने से आसान लग सकता है।" } },
    { id: "move", tone: "move", title: { en: "Move if it feels okay", hi: "ठीक लगे तो हिलें" }, body: { en: "Slow yoga or a short walk. Skip it if it hurts more.", hi: "धीमा योग या छोटी सैर। दर्द बढ़े तो छोड़ दें।" } },
    { id: "care", tone: "care", title: { en: "When to see someone", hi: "डॉक्टर को कब दिखाएँ" }, body: { en: "If pain is severe, new for you, or stops you doing normal things, talk to a clinician.", hi: "दर्द बहुत तेज़, नया या रोज़ के काम रोकने वाला हो तो डॉक्टर से बात करें।" } },
  ],
  follicular: [
    { id: "body", tone: "body", title: { en: "Energy is building", hi: "ऊर्जा बढ़ रही है" }, body: { en: "Many people feel lighter and more motivated in this stretch.", hi: "इस दौर में कई लोग हल्का और उत्साहित महसूस करते हैं।" } },
    { id: "food", tone: "food", title: { en: "Fresh and colourful", hi: "ताज़ा और रंगीन" }, body: { en: "Fruit, vegetables and protein keep energy steady.", hi: "फल, सब्ज़ियाँ और प्रोटीन ऊर्जा को स्थिर रखते हैं।" } },
    { id: "move", tone: "move", title: { en: "Good time to push a little", hi: "थोड़ा ज़्यादा करने का समय" }, body: { en: "Try a harder workout or something new if you feel up to it.", hi: "मन हो तो थोड़ी कठिन कसरत या कुछ नया आज़माएँ।" } },
    { id: "plan", tone: "plan", title: { en: "Start things", hi: "नई शुरुआत करें" }, body: { en: "A good window for plans, learning and difficult conversations.", hi: "योजनाओं, सीखने और कठिन बातचीत के लिए अच्छा समय।" } },
  ],
  ovulation: [
    { id: "body", tone: "body", title: { en: "Often a high-energy stretch", hi: "अक्सर ऊँची ऊर्जा का दौर" }, body: { en: "You may feel more social and confident. This is also your most fertile time.", hi: "आप ज़्यादा मिलनसार और आत्मविश्वासी महसूस कर सकती हैं। यह सबसे फर्टाइल समय भी है।" } },
    { id: "food", tone: "food", title: { en: "Stay hydrated", hi: "पानी पीती रहें" }, body: { en: "Water and fibre-rich food help you feel your best.", hi: "पानी और फाइबर वाला खाना बेहतर महसूस कराता है।" } },
    { id: "move", tone: "move", title: { en: "Make the most of it", hi: "इसका फ़ायदा उठाएँ" }, body: { en: "Group workouts and social plans often feel great now.", hi: "समूह में कसरत और मिलना-जुलना अक्सर अच्छा लगता है।" } },
    { id: "care", tone: "care", title: { en: "Plan ahead", hi: "पहले से सोचें" }, body: { en: "If you're avoiding or planning pregnancy, this is the time to be deliberate.", hi: "गर्भधारण से बचना या योजना हो तो अभी सोच-समझकर चलें।" } },
  ],
  luteal: [
    { id: "body", tone: "body", title: { en: "Slowing down", hi: "गति धीमी हो रही है" }, body: { en: "Energy can start to dip. Listen to your body.", hi: "ऊर्जा घटने लग सकती है। शरीर की सुनें।" } },
    { id: "food", tone: "food", title: { en: "Steady meals", hi: "नियमित भोजन" }, body: { en: "Regular meals with protein and complex carbs can help with cravings.", hi: "प्रोटीन और कॉम्प्लेक्स कार्ब वाले नियमित भोजन से क्रेविंग में मदद मिलती है।" } },
    { id: "move", tone: "move", title: { en: "Steady movement", hi: "स्थिर हलचल" }, body: { en: "Walks, yoga or strength work at a comfortable pace.", hi: "आराम की गति से सैर, योग या स्ट्रेंथ वर्क।" } },
    { id: "mind", tone: "mind", title: { en: "Protect your sleep", hi: "नींद का ध्यान रखें" }, body: { en: "A regular bedtime makes the next days easier.", hi: "नियमित सोने का समय आने वाले दिन आसान बनाता है।" } },
  ],
  pms: [
    { id: "body", tone: "body", title: { en: "Pre-period days", hi: "पीरियड से पहले के दिन" }, body: { en: "Tiredness, bloating and a shorter fuse are common and temporary.", hi: "थकान, पेट फूलना और चिड़चिड़ापन आम और अस्थायी हैं।" } },
    { id: "food", tone: "food", title: { en: "Cut down on the extremes", hi: "अति से बचें" }, body: { en: "Less salt and caffeine, more water and regular meals can ease bloating.", hi: "कम नमक और कैफ़ीन, ज़्यादा पानी और नियमित भोजन से सूजन कम हो सकती है।" } },
    { id: "mind", tone: "mind", title: { en: "Be kind to yourself", hi: "खुद के साथ नरमी रखें" }, body: { en: "If something feels huge today, sleep on it before deciding.", hi: "आज कुछ बहुत बड़ा लगे तो फ़ैसले से पहले एक रात सो लें।" } },
    { id: "talk", tone: "talk", title: { en: "Tell someone", hi: "किसी से कहें" }, body: { en: "Let your partner or a friend know you may need a little extra patience.", hi: "अपने साथी या दोस्त को बताएँ कि आपको थोड़ा ज़्यादा धैर्य चाहिए।" } },
  ],
};

const PARTNER: Record<PhaseKey, Raw[]> = {
  menstrual: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "Tired, achy or low on energy. Comfort matters more than plans.", hi: "थकी हुई या दर्द में, कम ऊर्जा। योजनाओं से ज़्यादा आराम मायने रखता है।" } },
    { id: "food", tone: "food", title: { en: "Food that helps", hi: "क्या खिलाएँ" }, body: { en: "Something warm and her favourite comfort food. Offer, don't insist.", hi: "कुछ गरम और उसका पसंदीदा कम्फर्ट फूड। पेश करें, ज़िद न करें।" } },
    { id: "plan", tone: "plan", title: { en: "Keep plans light", hi: "योजनाएँ हल्की रखें" }, body: { en: "Stay flexible. A quiet evening in beats a big outing.", hi: "लचीले रहें। बड़े आउटिंग से शांत शाम बेहतर है।" } },
    { id: "talk", tone: "talk", title: { en: "One kind check-in", hi: "एक प्यार भरा हाल-चाल" }, body: { en: "Ask once what would help most, then do that.", hi: "एक बार पूछें कि सबसे ज़्यादा क्या मदद करेगा, फिर वही करें।" } },
  ],
  cramps: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "Cramps can make simple things hard. Believe her.", hi: "ऐंठन से साधारण काम भी मुश्किल हो सकते हैं। उसकी बात मानें।" } },
    { id: "food", tone: "care", title: { en: "Small comforts", hi: "छोटी राहतें" }, body: { en: "A warm compress, a warm drink and a snack within reach.", hi: "गरम सेंक, गरम पेय और पास में स्नैक।" } },
    { id: "plan", tone: "plan", title: { en: "Take over chores", hi: "काम संभाल लें" }, body: { en: "Dinner, errands, dishes. Do it without being asked.", hi: "खाना, बाहर के काम, बर्तन। बिना कहे कर दें।" } },
    { id: "talk", tone: "talk", title: { en: "Watch for severe pain", hi: "तेज़ दर्द पर ध्यान दें" }, body: { en: "If it seems severe or unusual, gently suggest seeing a doctor.", hi: "बहुत तेज़ या असामान्य लगे तो प्यार से डॉक्टर को दिखाने को कहें।" } },
  ],
  follicular: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "Often lighter and more energetic. A good stretch to enjoy together.", hi: "अक्सर हल्का और ऊर्जावान। साथ में आनंद लेने का अच्छा दौर।" } },
    { id: "plan", tone: "plan", title: { en: "Suggest something new", hi: "कुछ नया सुझाएँ" }, body: { en: "A hike, a class or a new place. She may be up for it.", hi: "ट्रेक, कोई क्लास या नई जगह। उसका मन हो सकता है।" } },
    { id: "talk", tone: "talk", title: { en: "Say what you admire", hi: "जो पसंद है कहें" }, body: { en: "Tell her one specific thing you appreciate about her.", hi: "उसकी एक ख़ास बात बताएँ जो आपको पसंद है।" } },
    { id: "food", tone: "food", title: { en: "Cook together", hi: "साथ पकाएँ" }, body: { en: "Fresh, colourful food. Make it a shared activity.", hi: "ताज़ा, रंगीन खाना। इसे साथ का काम बनाएँ।" } },
  ],
  ovulation: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "Often social and confident. It is also her fertile window.", hi: "अक्सर मिलनसार और आत्मविश्वासी। यह उसकी फर्टाइल विंडो भी है।" } },
    { id: "plan", tone: "plan", title: { en: "A good day for a date", hi: "डेट के लिए अच्छा दिन" }, body: { en: "Plan something for the two of you.", hi: "दोनों के लिए कुछ प्लान करें।" } },
    { id: "talk", tone: "talk", title: { en: "Talk about plans", hi: "योजनाओं पर बात करें" }, body: { en: "If relevant, talk openly about contraception or trying for a baby.", hi: "ज़रूरी हो तो गर्भनिरोध या बच्चे की योजना पर खुलकर बात करें।" } },
    { id: "care", tone: "care", title: { en: "No pressure", hi: "कोई दबाव नहीं" }, body: { en: "Never assume or push anything intimate. Her comfort comes first.", hi: "अंतरंगता की उम्मीद या दबाव न रखें। उसका आराम पहले।" } },
  ],
  luteal: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "Energy may start to dip. She might want calmer evenings.", hi: "ऊर्जा घटने लग सकती है। शायद शांत शामें चाहे।" } },
    { id: "plan", tone: "plan", title: { en: "Keep evenings calm", hi: "शामें शांत रखें" }, body: { en: "Predictable, low-pressure plans work best.", hi: "तय और कम दबाव वाली योजनाएँ सबसे अच्छी रहती हैं।" } },
    { id: "food", tone: "food", title: { en: "Stock her favourites", hi: "उसकी पसंद घर में रखें" }, body: { en: "Comfort snacks and drinks she likes.", hi: "उसके पसंदीदा स्नैक और पेय।" } },
    { id: "talk", tone: "talk", title: { en: "Share the load", hi: "ज़िम्मेदारी बाँटें" }, body: { en: "Take a task off her list before she asks.", hi: "कहने से पहले उसकी सूची से एक काम ले लें।" } },
  ],
  pms: [
    { id: "feel", tone: "body", title: { en: "How she may feel", hi: "वह कैसा महसूस कर सकती है" }, body: { en: "More sensitive, tired or irritable. It is common and temporary.", hi: "ज़्यादा संवेदनशील, थकी या चिड़चिड़ी। यह आम और अस्थायी है।" } },
    { id: "talk", tone: "talk", title: { en: "Listen, don't fix", hi: "सुनें, हल न बताएँ" }, body: { en: "Let her vent. \"That sounds hard\" goes a long way.", hi: "उसे कहने दें। \"यह मुश्किल लग रहा है\" कहना बहुत काम आता है।" } },
    { id: "food", tone: "food", title: { en: "Treat her", hi: "कुछ अच्छा खिलाएँ" }, body: { en: "A small treat or her favourite meal tonight.", hi: "आज रात कोई छोटा ट्रीट या उसका पसंदीदा खाना।" } },
    { id: "plan", tone: "plan", title: { en: "Skip the big talks", hi: "बड़ी बहस टालें" }, body: { en: "Save heavy topics for a calmer day.", hi: "भारी मुद्दे शांत दिन के लिए रखें।" } },
  ],
};

const MOOD_CARD: Partial<Record<Mood, { self: Raw; partner: Raw }>> = {
  low: {
    self: { id: "mood", tone: "mind", title: { en: "Feeling low", hi: "मन उदास है" }, body: { en: "Low days pass. Small things count: water, a walk, a message to a friend.", hi: "उदास दिन गुज़र जाते हैं। छोटी बातें मायने रखती हैं: पानी, सैर, दोस्त को संदेश।" } },
    partner: { id: "mood", tone: "talk", title: { en: "She's feeling low", hi: "वह उदास है" }, body: { en: "Be present. Listen more than you advise.", hi: "साथ रहें। सलाह से ज़्यादा सुनें।" } },
  },
  irritable: {
    self: { id: "mood", tone: "mind", title: { en: "Feeling irritated", hi: "चिड़चिड़ाहट है" }, body: { en: "Take a short break before reacting. A few deep breaths or a quick walk can help.", hi: "जवाब देने से पहले थोड़ा रुकें। कुछ गहरी साँसें या छोटी सैर मदद करती है।" } },
    partner: { id: "mood", tone: "talk", title: { en: "She's feeling irritated", hi: "वह चिड़चिड़ी है" }, body: { en: "Don't take it personally. Give her room and stay kind.", hi: "इसे दिल पर न लें। उसे जगह दें और नरम रहें।" } },
  },
  anxious: {
    self: { id: "mood", tone: "mind", title: { en: "Feeling anxious", hi: "घबराहट है" }, body: { en: "Slow breathing (in 4, out 6) and grounding on what you can see around you can settle things.", hi: "धीमी साँस (4 अंदर, 6 बाहर) और आसपास की चीज़ों पर ध्यान देने से शांति मिल सकती है।" } },
    partner: { id: "mood", tone: "talk", title: { en: "She's feeling anxious", hi: "वह घबराई हुई है" }, body: { en: "Calm, steady company helps. Avoid rushing her.", hi: "शांत और स्थिर साथ मदद करता है। उसे जल्दी में न डालें।" } },
  },
  sad: {
    self: { id: "mood", tone: "mind", title: { en: "Feeling sad", hi: "उदासी है" }, body: { en: "It's okay to feel it. Reach out to someone you trust, and if it lasts, talk to a professional.", hi: "इसे महसूस करना ठीक है। भरोसे के किसी से बात करें, और लंबा चले तो विशेषज्ञ से मिलें।" } },
    partner: { id: "mood", tone: "talk", title: { en: "She's feeling sad", hi: "वह दुखी है" }, body: { en: "Sit with her. You don't have to fix it.", hi: "उसके साथ बैठें। हल निकालना ज़रूरी नहीं।" } },
  },
};

function pick(list: Raw[], lang: Lang): InsightCard[] {
  return list.map((c) => ({ id: c.id, tone: c.tone, title: c.title[lang], body: c.body[lang] }));
}

/** Cards for the person tracking. A mood card leads when she logged one today. */
export function selfInsights(phase: PhaseKey, mood: Mood | null, lang: Lang): InsightCard[] {
  const cards = pick(SELF[phase], lang);
  const extra = mood ? MOOD_CARD[mood]?.self : undefined;
  if (extra) cards.unshift({ id: extra.id, tone: extra.tone, title: extra.title[lang], body: extra.body[lang] });
  return cards;
}

/** Cards for someone following her: what she may be feeling and how to help. */
export function partnerInsights(phase: PhaseKey, mood: Mood | null, lang: Lang): InsightCard[] {
  const cards = pick(PARTNER[phase], lang);
  const extra = mood ? MOOD_CARD[mood]?.partner : undefined;
  if (extra) cards.unshift({ id: extra.id, tone: extra.tone, title: extra.title[lang], body: extra.body[lang] });
  return cards;
}
