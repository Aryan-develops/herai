/**
 * Curated partner-support content: what each cycle phase can feel like and small, kind things to do.
 *
 * This is the reference for partner guidance. It is written by hand (not generated) so the wording is
 * safe and predictable: no diagnosis, no medical claims about her, no pressure. AI-personalised wording
 * (see partnerGuidance.ts) is only accepted if it passes the same safety filter; otherwise this is used.
 */

export type Lang = "en" | "hi";
export type PhaseKey = "menstrual" | "cramps" | "follicular" | "ovulation" | "luteal" | "pms";
export type Mood = "great" | "good" | "okay" | "low" | "irritable" | "anxious" | "sad";
export type Need = "space" | "hug" | "food" | "talk" | "rest";

interface Localised<T> {
  en: T;
  hi: T;
}

export interface PhaseContent {
  title: Localised<string>;
  blurb: Localised<string>;
  do: Localised<string[]>;
  say: Localised<string[]>;
  avoid: Localised<string[]>;
  tasks: { id: string; text: Localised<string> }[];
  lesson: Localised<string>;
}

export const PHASE_CONTENT: Record<PhaseKey, PhaseContent> = {
  menstrual: {
    title: { en: "Period days", hi: "पीरियड के दिन" },
    blurb: {
      en: "Energy can run lower and comfort matters more. Rest is useful, not lazy.",
      hi: "इन दिनों ऊर्जा कम हो सकती है और आराम ज़्यादा मायने रखता है। आराम करना आलस नहीं है।",
    },
    do: {
      en: ["Take over a chore or two without being asked", "Offer a warm drink or her favourite comfort food", "Keep plans light and flexible"],
      hi: ["बिना कहे एक-दो घर के काम संभाल लें", "गरम पेय या उसका पसंदीदा खाना पेश करें", "प्लान हल्के और बदलने लायक रखें"],
    },
    say: {
      en: ["\"Anything I can take off your plate today?\"", "\"Want company, or some quiet?\""],
      hi: ["\"आज कोई काम मैं संभाल लूँ?\"", "\"साथ बैठूँ या थोड़ी शांति चाहिए?\""],
    },
    avoid: {
      en: ["Asking \"is it that time?\" about her mood", "Pushing big plans or long outings"],
      hi: ["उसके मूड पर \"क्या वो दिन हैं?\" कहना", "बड़े प्लान या लंबे आउटिंग पर ज़ोर देना"],
    },
    tasks: [
      { id: "menstrual-chore", text: { en: "Take over one chore today", hi: "आज एक काम संभाल लें" } },
      { id: "menstrual-drink", text: { en: "Make her a warm drink", hi: "उसके लिए गरम पेय बनाएँ" } },
      { id: "menstrual-checkin", text: { en: "Check in gently, once", hi: "एक बार प्यार से हाल पूछें" } },
    ],
    lesson: {
      en: "A period usually lasts 3 to 7 days. Tiredness and low mood are common and pass.",
      hi: "पीरियड आमतौर पर 3 से 7 दिन चलता है। थकान और उदासी आम हैं और गुज़र जाती हैं।",
    },
  },
  cramps: {
    title: { en: "Cramp-prone days", hi: "ऐंठन वाले दिन" },
    blurb: {
      en: "Cramps can make even simple days feel heavy. Small comforts go a long way.",
      hi: "ऐंठन से आम दिन भी भारी लग सकते हैं। छोटी-छोटी राहतें बहुत काम आती हैं।",
    },
    do: {
      en: ["Offer a warm compress or hot-water bag", "Bring her favourite snack and water", "Handle dinner or errands"],
      hi: ["सेंकने के लिए गरम पानी की बोतल दें", "उसका पसंदीदा स्नैक और पानी लाएँ", "खाना या बाहर के काम आप देख लें"],
    },
    say: {
      en: ["\"I'm here. What would help most right now?\"", "\"Take your time, I've got the rest.\""],
      hi: ["\"मैं यहीं हूँ। अभी सबसे ज़्यादा क्या मदद करेगा?\"", "\"आराम से, बाकी मैं देख लूँगा।\""],
    },
    avoid: {
      en: ["Telling her it's \"not that bad\"", "Making her cancel things guiltily"],
      hi: ["यह कहना कि \"इतना भी बुरा नहीं है\"", "प्लान रद्द करने पर उसे बुरा महसूस कराना"],
    },
    tasks: [
      { id: "cramps-heat", text: { en: "Set up something warm for her", hi: "उसके लिए कुछ गरम इंतज़ाम करें" } },
      { id: "cramps-snack", text: { en: "Bring her comfort snack", hi: "उसका पसंदीदा स्नैक लाएँ" } },
      { id: "cramps-dinner", text: { en: "Take care of dinner", hi: "खाने की ज़िम्मेदारी लें" } },
    ],
    lesson: {
      en: "Mild cramps are common. If pain is severe or unusual for her, gently encourage her to see a clinician.",
      hi: "हल्की ऐंठन आम है। अगर दर्द बहुत तेज़ या उसके लिए असामान्य हो, तो प्यार से डॉक्टर को दिखाने की सलाह दें।",
    },
  },
  follicular: {
    title: { en: "Fresh-energy days", hi: "नई ऊर्जा के दिन" },
    blurb: {
      en: "Many people feel lighter and more energetic in this stretch.",
      hi: "इस दौर में कई लोग हल्का और ऊर्जावान महसूस करते हैं।",
    },
    do: {
      en: ["Plan something active or new together", "Support any goals she's working on", "Say yes to a spontaneous outing"],
      hi: ["साथ में कुछ नया या एक्टिव प्लान करें", "उसके लक्ष्यों में साथ दें", "अचानक बने आउटिंग के लिए हाँ कहें"],
    },
    say: {
      en: ["\"You seem full of energy, want to try something new?\"", "\"Proud of how you're doing.\""],
      hi: ["\"तुम काफ़ी ऊर्जा में लग रही हो, कुछ नया करें?\"", "\"मुझे तुम पर गर्व है।\""],
    },
    avoid: {
      en: ["Assuming she feels the same every day", "Overloading her just because she has energy"],
      hi: ["यह मान लेना कि वो हर दिन ऐसा ही महसूस करती है", "ऊर्जा है, इसलिए उस पर काम लाद देना"],
    },
    tasks: [
      { id: "follicular-plan", text: { en: "Suggest one fun plan", hi: "एक मज़ेदार प्लान सुझाएँ" } },
      { id: "follicular-praise", text: { en: "Tell her one thing you admire", hi: "उसकी एक बात की तारीफ़ करें" } },
      { id: "follicular-walk", text: { en: "Go for a walk together", hi: "साथ टहलने जाएँ" } },
    ],
    lesson: {
      en: "After a period, rising hormones often bring more energy and a brighter mood.",
      hi: "पीरियड के बाद हार्मोन बढ़ने से अक्सर ऊर्जा और मूड बेहतर होता है।",
    },
  },
  ovulation: {
    title: { en: "Peak-energy days", hi: "सबसे ज़्यादा ऊर्जा के दिन" },
    blurb: {
      en: "Often a more social, confident stretch. It is also her fertile window.",
      hi: "अक्सर ज़्यादा मिलनसार और आत्मविश्वास वाला दौर। यह उसकी फर्टाइल विंडो भी है।",
    },
    do: {
      en: ["Plan a date or a social evening", "Match her energy and enjoy it", "Talk openly about contraception or plans if relevant"],
      hi: ["डेट या सोशल शाम का प्लान बनाएँ", "उसकी ऊर्जा के साथ चलें और मज़ा लें", "ज़रूरत हो तो गर्भनिरोध या प्लान पर खुलकर बात करें"],
    },
    say: {
      en: ["\"Feels like a good day to do something fun.\"", "\"Want to go out tonight?\""],
      hi: ["\"आज कुछ मज़ेदार करने का अच्छा दिन लग रहा है।\"", "\"आज रात बाहर चलें?\""],
    },
    avoid: {
      en: ["Assuming or pressuring anything intimate", "Treating her fertile window as a topic to joke about"],
      hi: ["किसी भी अंतरंगता की उम्मीद या दबाव", "उसकी फर्टाइल विंडो का मज़ाक बनाना"],
    },
    tasks: [
      { id: "ovulation-date", text: { en: "Plan something for the two of you", hi: "दोनों के लिए कुछ प्लान करें" } },
      { id: "ovulation-compliment", text: { en: "Give a sincere compliment", hi: "सच्ची तारीफ़ करें" } },
      { id: "ovulation-talk", text: { en: "Have an unhurried chat", hi: "बिना जल्दी के बात करें" } },
    ],
    lesson: {
      en: "Ovulation happens about 14 days before the next period. Predictions are estimates, not guarantees.",
      hi: "ओव्यूलेशन अगले पीरियड से लगभग 14 दिन पहले होता है। अनुमान केवल अनुमान हैं, गारंटी नहीं।",
    },
  },
  luteal: {
    title: { en: "Slow-down days", hi: "धीमे चलने के दिन" },
    blurb: {
      en: "Energy can start to dip. Calm routines and less pressure help.",
      hi: "ऊर्जा घटने लगती है। शांत दिनचर्या और कम दबाव से मदद मिलती है।",
    },
    do: {
      en: ["Keep evenings calm and predictable", "Share the mental load at home", "Stock her go-to comfort food"],
      hi: ["शामें शांत और तयशुदा रखें", "घर की ज़िम्मेदारियाँ बाँटें", "उसका पसंदीदा कम्फर्ट फूड घर में रखें"],
    },
    say: {
      en: ["\"Want a quiet night in?\"", "\"I noticed you've had a lot on. How can I help?\""],
      hi: ["\"आज घर पर शांति से रहें?\"", "\"तुम पर काफ़ी काम है। मैं कैसे मदद करूँ?\""],
    },
    avoid: {
      en: ["Starting heavy arguments late in the day", "Saying she's \"overreacting\""],
      hi: ["दिन के अंत में भारी बहस छेड़ना", "यह कहना कि वो \"ज़्यादा रिएक्ट कर रही है\""],
    },
    tasks: [
      { id: "luteal-quiet", text: { en: "Offer a calm evening", hi: "एक शांत शाम का प्रस्ताव दें" } },
      { id: "luteal-load", text: { en: "Take one task off her list", hi: "उसकी सूची से एक काम ले लें" } },
      { id: "luteal-snack", text: { en: "Have her favourite snack ready", hi: "उसका पसंदीदा स्नैक तैयार रखें" } },
    ],
    lesson: {
      en: "In the second half of the cycle, energy and mood can shift gradually. Patience helps.",
      hi: "चक्र के दूसरे हिस्से में ऊर्जा और मूड धीरे-धीरे बदल सकते हैं। धैर्य मदद करता है।",
    },
  },
  pms: {
    title: { en: "Pre-period days", hi: "पीरियड से पहले के दिन" },
    blurb: {
      en: "Some people feel more sensitive, tired or irritable just before a period. It is common and temporary.",
      hi: "पीरियड से ठीक पहले कुछ लोग ज़्यादा संवेदनशील, थके या चिड़चिड़े महसूस करते हैं। यह आम और अस्थायी है।",
    },
    do: {
      en: ["Be extra patient and warm", "Offer her comfort food or a treat", "Give her space and time to rest if she wants it"],
      hi: ["ज़्यादा धैर्य और गर्मजोशी रखें", "पसंदीदा खाना या कोई ट्रीट दें", "अगर वो चाहे तो उसे आराम और समय दें"],
    },
    say: {
      en: ["\"I'm on your side. What do you need tonight?\"", "\"Want me to handle dinner?\""],
      hi: ["\"मैं तुम्हारे साथ हूँ। आज रात तुम्हें क्या चाहिए?\"", "\"खाना मैं बना दूँ?\""],
    },
    avoid: {
      en: ["Saying \"it's just hormones\"", "Bringing up sensitive topics or picking fights"],
      hi: ["यह कहना कि \"यह तो बस हार्मोन हैं\"", "संवेदनशील मुद्दे उठाना या झगड़ा करना"],
    },
    tasks: [
      { id: "pms-dinner", text: { en: "Handle dinner tonight", hi: "आज रात का खाना संभालें" } },
      { id: "pms-treat", text: { en: "Bring her a small treat", hi: "उसके लिए छोटा सा ट्रीट लाएँ" } },
      { id: "pms-listen", text: { en: "Listen without fixing", hi: "बिना हल बताए सुनें" } },
    ],
    lesson: {
      en: "Symptoms before a period vary a lot. What she feels is real, even if it is short-lived.",
      hi: "पीरियड से पहले के लक्षण बहुत अलग-अलग होते हैं। वो जो महसूस करती है वह असली है, भले ही थोड़े समय का हो।",
    },
  },
};

export const MOOD_NOTES: Record<Mood, Localised<string>> = {
  great: { en: "She's feeling great today. Enjoy it with her.", hi: "आज वो बहुत अच्छा महसूस कर रही है। उसके साथ इसका आनंद लें।" },
  good: { en: "She's in a good mood. A nice day to connect.", hi: "उसका मूड अच्छा है। जुड़ने का अच्छा दिन।" },
  okay: { en: "She's feeling okay. Keep things easy.", hi: "वो ठीक महसूस कर रही है। चीज़ें आसान रखें।" },
  low: { en: "She's feeling low. Be gentle and present.", hi: "वो उदास महसूस कर रही है। कोमल रहें और साथ रहें।" },
  irritable: { en: "She's feeling irritable. Don't take it personally; give her room.", hi: "वो चिड़चिड़ी है। इसे दिल पर न लें; उसे जगह दें।" },
  anxious: { en: "She's feeling anxious. Calm, steady company helps.", hi: "वो चिंतित है। शांत और स्थिर साथ मदद करता है।" },
  sad: { en: "She's feeling sad. Listen more than you advise.", hi: "वो दुखी है। सलाह देने से ज़्यादा सुनें।" },
};

export const NEED_TIPS: Record<Need, Localised<{ title: string; text: string }>> = {
  space: {
    en: { title: "She'd like some space", text: "Give her quiet time, no need to fix anything. A short kind message helps." },
    hi: { title: "उसे थोड़ी जगह चाहिए", text: "उसे शांत समय दें, कुछ ठीक करने की ज़रूरत नहीं। एक छोटा प्यारा संदेश काफ़ी है।" },
  },
  hug: {
    en: { title: "She'd like a hug", text: "Offer one, without needing to talk. Being close is the support." },
    hi: { title: "उसे गले लगना है", text: "बिना बात किए एक हग दें। पास रहना ही सहारा है।" },
  },
  food: {
    en: { title: "She'd like some food", text: "Bring her favourite comfort food or order something she loves." },
    hi: { title: "उसे कुछ खाना है", text: "उसका पसंदीदा कम्फर्ट फूड लाएँ या कुछ मँगवा दें।" },
  },
  talk: {
    en: { title: "She'd like to talk", text: "Put the phone away and listen. You don't have to solve it." },
    hi: { title: "वो बात करना चाहती है", text: "फ़ोन दूर रखें और सुनें। हल निकालना ज़रूरी नहीं।" },
  },
  rest: {
    en: { title: "She needs rest", text: "Take over what you can so she can lie down and recover." },
    hi: { title: "उसे आराम चाहिए", text: "जितना हो सके काम संभाल लें ताकि वो आराम कर सके।" },
  },
};

export const DISCLAIMER: Localised<string> = {
  en: "Based on the cycle she shares, so it's an estimate. General support tips, not medical advice.",
  hi: "उसके साझा किए चक्र पर आधारित, इसलिए यह अनुमान है। सामान्य सहयोग सुझाव हैं, चिकित्सा सलाह नहीं।",
};

export const SEE_CLINICIAN: Localised<string> = {
  en: "If she's in severe pain or seems unwell, encourage her to see a doctor. Don't treat this as an emergency tool.",
  hi: "अगर उसे बहुत तेज़ दर्द हो या तबीयत ठीक न लगे, तो डॉक्टर को दिखाने के लिए प्रोत्साहित करें।",
};

export function isPhaseKey(value: string): value is PhaseKey {
  return value in PHASE_CONTENT;
}

/** Phrases that must never appear in guidance shown to a partner: diagnoses, treatment claims, fertility promises. */
const BANNED = [
  /\bdiagnos/i,
  /\bprescri/i,
  /\bmedicine|\bmedication|\bdosage|\bpill\b/i,
  /\bpregnan/i,
  /\bguarantee/i,
  /\bdisorder|\bsyndrome|\bPCOS|\bendometriosis|\bPMDD/i,
  /\bcure\b|\btreat(ment)? her\b/i,
];

export function passesSafetyFilter(texts: string[]): boolean {
  return texts.every((t) => t.length > 0 && t.length <= 240 && !BANNED.some((re) => re.test(t)));
}
