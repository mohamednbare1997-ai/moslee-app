import { useState, useEffect, useRef, useCallback } from "react";
import { BackHandler } from "react-native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
  AppState,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Magnetometer } from "expo-sensors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── PERSISTENCE KEYS ─────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  TASBEEH_TOTAL: "@moslee:tasbeehTotal",
  TASBEEH_COUNT: "@moslee:tasbeehCount",
  BOOKMARK: "@moslee:bookmark",
  UNLOCKED_IDS: "@moslee:unlockedIds",
  ACTIVE_THEME: "@moslee:activeThemeId",
  AD_FREE: "@moslee:adFree",
  MAMA_MODE: "@moslee:mamaMode",
  VIP_PURCHASED: "@moslee:vipPurchased",
  FLOAT_W: "@moslee:floatW",
  FLOAT_TASBEEH_W: "@moslee:floatTasbeehW",
  FLOAT_W_POS: "@moslee:floatWPos",
  FLOAT_TASBEEH_POS: "@moslee:floatTasbeehPos",
  AYAHS_READ_TOTAL: "@moslee:ayahsReadTotal",
  READING_SECONDS_TOTAL: "@moslee:readingSecondsTotal",
  DAILY_LOG: "@moslee:dailyLog", // { "YYYY-MM-DD": { tasbeeh, ayahs, mins } }
  FIRST_USE_DATE: "@moslee:firstUseDate",
  LAST_USE_DATE: "@moslee:lastUseDate",
  STREAK_COUNT: "@moslee:streakCount",
  AZAN_ON: "@moslee:azanOn",
  SALAH_ON: "@moslee:salahOn",
  SALAH_INT: "@moslee:salahInt",
  PRE_ON: "@moslee:preOn",
  AUTO_AZKAR: "@moslee:autoAzkar",
  TRAVEL_ON: "@moslee:travelOn",
  FAST_ON: "@moslee:fastOn",
  FAST_MT: "@moslee:fastMT",
  FAST_WD: "@moslee:fastWD",
  ACHIEVEMENT_KAHF: "@moslee:achievementKahf",
};

async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage write failed silently; app continues with in-memory state
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T00:00:00");
  const b = new Date(dateStrB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ─── HAPTICS HELPER (fails silently on unsupported platforms) ───────────────
const haptic = {
  light: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} },
  medium: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {} },
  success: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} },
  warning: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {} },
  selection: () => { try { Haptics.selectionAsync(); } catch (e) {} },
};

// ─── THEME DEFINITIONS ────────────────────────────────────────────────────────
const THEMES = [
  { id: "royal_black", name: "الثيم الأسود الملكي", price: "مجاني", free: true, emoji: "🖤",
    accent: "#d4d4d8", accentSoft: "#ffffff14", accentBorder: "#ffffff28",
    bg: "#000", cardBg: "#0a0a0a", cardBorder: "#1e1e1e",
    ayahNumBg: "#1a1a1a", ayahNumColor: "#d4d4d8",
    grad: ["#0d0d0d", "#1c1c1c"], desc: "أناقة الأسود الكلاسيكية الصافية" },
  { id: "spiritual_green", name: "الثيم الأخضر الروحاني", price: "مجاني", free: true, emoji: "💚",
    accent: "#22c55e", accentSoft: "#22c55e1a", accentBorder: "#22c55e40",
    bg: "#000", cardBg: "#021a0a", cardBorder: "#0a3318",
    ayahNumBg: "#0a3318", ayahNumColor: "#22c55e",
    grad: ["#021a0a", "#0a3318"], desc: "خضرة الجنة وسكينة القلوب" },
  { id: "royal_gold", name: "الثيم الذهبي الملكي", price: "$1", free: false, emoji: "👑",
    accent: "#f59e0b", accentSoft: "#f59e0b1a", accentBorder: "#f59e0b40",
    bg: "#000", cardBg: "#120a00", cardBorder: "#2a1800",
    ayahNumBg: "#2a1800", ayahNumColor: "#f59e0b",
    grad: ["#120a00", "#2a1800"], desc: "فخامة الذهب وبهاء القرآن" },
  { id: "sufi_purple", name: "ثيم روحانية البنفسج", price: "$1", free: false, emoji: "🔮",
    accent: "#a855f7", accentSoft: "#a855f71a", accentBorder: "#a855f740",
    bg: "#000", cardBg: "#0d0518", cardBorder: "#1e0a35",
    ayahNumBg: "#1e0a35", ayahNumColor: "#a855f7",
    grad: ["#0d0518", "#1e0a35"], desc: "روحانية البنفسج وسكينة الليل" },
  { id: "vip_royal", name: "باقة الـ VIP الملكية", price: "$10", free: false, emoji: "💎",
    accent: "#ec4899", accentSoft: "#ec48991a", accentBorder: "#ec489940",
    bg: "#000", cardBg: "#150010", cardBorder: "#2d0025",
    ayahNumBg: "#2d0025", ayahNumColor: "#ec4899",
    grad: ["#150010", "#2d0025", "#0a0020"], desc: "ثيم متحرك ⊕ متابع الختمة ⊕ كل المميزات" },
];

const getTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES[1];

// ─── QURAN DATA (Uthmani verified) ───────────────────────────────────────────
const FATIHA = [
  { id: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", words: ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"] },
  { id: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ", words: ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"] },
  { id: 3, text: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", words: ["ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"] },
  { id: 4, text: "مَـٰلِكِ يَوْمِ ٱلدِّينِ", words: ["مَـٰلِكِ", "يَوْمِ", "ٱلدِّينِ"] },
  { id: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", words: ["إِيَّاكَ", "نَعْبُدُ", "وَإِيَّاكَ", "نَسْتَعِينُ"] },
  { id: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", words: ["ٱهْدِنَا", "ٱلصِّرَٰطَ", "ٱلْمُسْتَقِيمَ"] },
  { id: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", words: ["صِرَٰطَ", "ٱلَّذِينَ", "أَنْعَمْتَ", "عَلَيْهِمْ", "غَيْرِ", "ٱلْمَغْضُوبِ", "عَلَيْهِمْ", "وَلَا", "ٱلضَّآلِّينَ"] },
];

const WORD_MEANINGS = {
  "بِسْمِ": { m: "باسم / بذكر اسم", r: "س م و", g: "جار ومجرور" },
  "ٱللَّهِ": { m: "اسم الجلالة الأعظم", r: "أ ل ه", g: "لفظ الجلالة" },
  "ٱلرَّحْمَـٰنِ": { m: "ذو الرحمة الواسعة الشاملة", r: "ر ح م", g: "صفة مشبهة" },
  "ٱلرَّحِيمِ": { m: "ذو الرحمة الخاصة بالمؤمنين", r: "ر ح م", g: "صفة مشبهة" },
  "ٱلْحَمْدُ": { m: "الثناء الكامل والشكر", r: "ح م د", g: "مبتدأ مرفوع" },
  "لِلَّهِ": { m: "خاص بالله وحده لا شريك له", r: "أ ل ه", g: "جار ومجرور" },
  "رَبِّ": { m: "المالك المربي المدبر", r: "ر ب ب", g: "بدل" },
  "ٱلْعَـٰلَمِينَ": { m: "كل ما سوى الله تعالى", r: "ع ل م", g: "مضاف إليه" },
  "مَـٰلِكِ": { m: "صاحب الملك والسلطان المطلق", r: "م ل ك", g: "بدل" },
  "يَوْمِ": { m: "يوم القيامة", r: "ي و م", g: "مضاف إليه" },
  "ٱلدِّينِ": { m: "الجزاء والحساب", r: "د ي ن", g: "مضاف إليه" },
  "إِيَّاكَ": { m: "أنت وحدك لا غيرك", r: "إ ي ا", g: "ضمير منفصل" },
  "نَعْبُدُ": { m: "نطيع ونخضع ونتذلل", r: "ع ب د", g: "فعل مضارع" },
  "وَإِيَّاكَ": { m: "وإياك وحدك", r: "إ ي ا", g: "معطوف" },
  "نَسْتَعِينُ": { m: "نطلب العون والمساعدة", r: "ع و ن", g: "فعل مضارع" },
  "ٱهْدِنَا": { m: "أرشدنا وثبتنا ووفقنا", r: "هـ د ي", g: "فعل أمر دعائي" },
  "ٱلصِّرَٰطَ": { m: "الطريق والسبيل", r: "ص ر ط", g: "مفعول به" },
  "ٱلْمُسْتَقِيمَ": { m: "المعتدل الصحيح الموصل", r: "ق و م", g: "نعت" },
  "صِرَٰطَ": { m: "طريق وسبيل", r: "ص ر ط", g: "بدل" },
  "ٱلَّذِينَ": { m: "الذين", r: "ذ ل ل", g: "اسم موصول" },
  "أَنْعَمْتَ": { m: "أكرمت وأفضلت ومننت", r: "ن ع م", g: "فعل ماضٍ" },
  "عَلَيْهِمْ": { m: "عليهم", r: "ع ل و", g: "جار ومجرور" },
  "غَيْرِ": { m: "سوى وخلاف", r: "غ ي ر", g: "بدل" },
  "ٱلْمَغْضُوبِ": { m: "الذين غضب الله عليهم", r: "غ ض ب", g: "مضاف إليه" },
  "وَلَا": { m: "وليس", r: "ل ا", g: "حرف عطف ونفي" },
  "ٱلضَّآلِّينَ": { m: "الذين ضلوا عن الحق", r: "ض ل ل", g: "معطوف" },
};

// ─── AZKAR DATA ───────────────────────────────────────────────────────────────
const MORNING_AZKAR = [
  { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", count: 1, label: "الاستعاذة" },
  { text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ", count: 1, label: "آية الكرسي" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", count: 100, label: "تسبيح الصباح" },
  { text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 10, label: "التهليل" },
  { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ", count: 1, label: "سيد الاستغفار" },
  { text: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ", count: 1, label: "ذكر الصباح" },
];
const EVENING_AZKAR = [
  { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", count: 1, label: "ذكر المساء" },
  { text: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ", count: 1, label: "ذكر المساء" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", count: 100, label: "تسبيح المساء" },
  { text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي وَبَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ", count: 3, label: "دعاء العافية" },
];
const SLEEP_AZKAR = [
  { text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", count: 1, label: "عند النوم" },
  { text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", count: 3, label: "عند النوم" },
  { text: "سُبْحَانَ اللَّهِ", count: 33, label: "تسبيح النوم" },
  { text: "الْحَمْدُ لِلَّهِ", count: 33, label: "تحميد النوم" },
  { text: "اللَّهُ أَكْبَرُ", count: 34, label: "تكبير النوم" },
];
const TRAVEL_AZKAR = [
  { text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ", count: 1, label: "دعاء السفر" },
  { text: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى", count: 1, label: "دعاء السفر" },
  { text: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ", count: 1, label: "دعاء السفر" },
];
const HOME_AZKAR = [
  { text: "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا", count: 1, label: "دخول المنزل" },
  { text: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", count: 1, label: "الخروج من المنزل" },
  { text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ", count: 1, label: "الخروج" },
];
const SUNNAH_LIST = [
  { text: "قراءة سورة الكهف كاملة يوم الجمعة", label: "سنة الجمعة", count: 1 },
  { text: "الصلاة على النبي ﷺ مئة مرة يوم الجمعة", label: "الصلاة على النبي", count: 100 },
  { text: "صوم يوم الإثنين والخميس", label: "سنة الصيام", count: 1 },
  { text: "السواك عند كل وضوء وصلاة", label: "السواك", count: 3 },
  { text: "إحياء السنن المهجورة في البيت والسوق", label: "إحياء السنة", count: 1 },
];

const DHIKR_PHRASES = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ",
  "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ",
  "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
  "اللَّهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا",
];

const VIP_DHIKR_SLOTS = [
  "لا إله إلا أنت سبحانك إني كنت من الظالمين",
  "اللهم إني أسألك العفو والعافية في الدنيا والآخرة",
  "رب اغفر لي ولوالدي وللمؤمنين يوم يقوم الحساب",
  "اللهم اجعلني من عبادك الصالحين المتقين",
  "سبحان الله وبحمده عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته",
];

const FATWA_QA = [
  { q: "هل يجوز الصلاة بملابس العمل؟", a: "نعم، تجوز الصلاة بأي ملابس طاهرة ساترة للعورة، سواء كانت ملابس عمل أو غيرها، بشرط الطهارة وستر العورة." },
  { q: "ما حكم صيام يوم السبت منفرداً؟", a: "اختلف العلماء في ذلك، والأحوط تركه إن لم يوافق صياماً آخر كالنذر أو القضاء، وذلك اتباعاً للحديث الوارد في النهي عنه." },
  { q: "هل تصح الصلاة خلف المسبوق؟", a: "لا تصح الصلاة خلف المسبوق إذا كان يقضي، لأن المأموم يجب أن يكون في مثل حال إمامه أو أكمل." },
  { q: "ما حكم قراءة القرآن بدون وضوء؟", a: "يجوز قراءة القرآن بدون وضوء للمتطهر من الحدث الأكبر، أما مس المصحف فيشترط له الطهارة على الراجح." },
  { q: "هل يجوز الجمع بين الصلاتين للمطر؟", a: "نعم، يجوز الجمع بين الظهر والعصر وبين المغرب والعشاء بسبب المطر الشديد الذي يشق معه الخروج، وهو مذهب الجمهور." },
];

// ─── AUDIO SOURCES ────────────────────────────────────────────────────────────
// Hosted audio URLs from verified cloud repositories
//
// ⚠️ NOTE FOR DEVELOPER (Nbare):
// You mentioned you will add your own audio sources. The `salahReminder` key
// below was previously duplicated from the Fatiha ayah audio (a real bug —
// the user would hear a Quranic verse instead of "Allahumma salli ala
// Muhammad"). It is now an explicit placeholder pointing at nothing real so
// the app doesn't silently mislead anyone. Replace SALAH_REMINDER_URL with
// your own hosted "صلاة على النبي" audio file (mp3/aac) before shipping.
// The playback code below already handles a failed/missing URL gracefully
// (falls back to a vibration + text notification, never crashes).
const SALAH_REMINDER_URL = null; // ← Nbare: put your real "صلاة على النبي" audio URL here

const AUDIO_SOURCES = {
  // Mishary Rashid Al-Afasy recitation of Al-Fatiha (7 ayahs)
  fatiha: [
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/5.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/6.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/7.mp3",
  ],
  // Azan audio from verified CDN
  azan: "https://www.islamcan.com/audio/adhan/azan1.mp3",
  // Salah reminder: dedicated URL only — no longer falls back to Quran audio
  salahReminder: SALAH_REMINDER_URL,
};

// ─── PRAYER NAMES ─────────────────────────────────────────────────────────────
const PRAYER_NAMES_MAP = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}

function getHijriDate() {
  const now = new Date();
  const jd = Math.floor(now.getTime() / 86400000 + 2440587.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  const months = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  return { day, month, year, monthName: months[month - 1] || "" };
}

function getGregorianDate() {
  const now = new Date();
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return { dayName: days[now.getDay()], day: now.getDate(), month: months[now.getMonth()], year: now.getFullYear() };
}

function getSpecialFastingAlert(hijri) {
  const { day, month } = hijri;
  if (month === 1 && day === 9) return "تذكير: غداً صيام يوم عاشوراء — سنة مهجورة، طوبى للصائمين";
  if (month === 12 && day === 8) return "تذكير: غداً صيام يوم عرفة المبارك — يكفر سنتين";
  if (month === 10 && day >= 1 && day <= 5) return "تذكير: أنت في أيام صيام ستة شوال — أكملها لتنال أجر صيام الدهر";
  if (month === 12 && day >= 1 && day <= 9) return "تذكير: أنت في العشر الأوائل من ذي الحجة — أيام العمل الصالح";
  return null;
}

// Calculate Qibla direction from coordinates
function calcQiblaAngle(lat, lng) {
  const MECCA_LAT = 21.3891;
  const MECCA_LNG = 39.8579;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

// Parse prayer time string "HH:MM" to minutes since midnight
function parseTimeMins(str) {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

// ─── PROMO CODE SECURITY ──────────────────────────────────────────────────────
const MAMA_CODE_HASH =
  "bf311209c274eee020a4408527e4224905691a7117a96fdfece63fa82159ea75";

async function hashCode(input) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input.trim()
  );
}

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
function SH({ title, sub, T }) {
  return (
    <View style={[styles.shWrap, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
      <Text style={styles.shTitle}>{title}</Text>
      {sub ? <Text style={styles.shSub}>{sub}</Text> : null}
    </View>
  );
}

function Card({ T, title, children, style }) {
  return (
    <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function PBar({ T, label, pct, color }) {
  const c = color || T.accent;
  const safePct = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.pbarRow}>
        <Text style={styles.pbarLabel}>{label}</Text>
        <Text style={[styles.pbarPct, { color: c }]}>{safePct}%</Text>
      </View>
      <View style={styles.pbarTrack}>
        <View style={[styles.pbarFill, { width: `${safePct}%`, backgroundColor: c }]} />
      </View>
    </View>
  );
}

function RI({ label, value }) {
  return (
    <View style={styles.riRow}>
      <Text style={styles.riLabel}>{label}</Text>
      <Text style={styles.riValue}>{value}</Text>
    </View>
  );
}

function Toggle({ T, label, sub, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { haptic.selection(); onChange(!value); }}
        style={[styles.toggleTrack, { backgroundColor: value ? T.accent : "#222" }]}
      >
        <View style={[styles.toggleThumb, { left: value ? 22 : 3 }]} />
      </TouchableOpacity>
    </View>
  );
}

function Btn({ T, label, onPress, small }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { haptic.light(); onPress && onPress(); }}
      style={[
        styles.btn,
        {
          backgroundColor: T.accentSoft,
          borderColor: T.accentBorder,
          paddingVertical: small ? 5 : 8,
          paddingHorizontal: small ? 12 : 18,
        },
      ]}
    >
      <Text style={[styles.btnText, { color: T.accent, fontSize: small ? 11 : 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── DRAGGABLE FLOATING BUBBLE ────────────────────────────────────────────────
// Generic free-floating, draggable bubble used for both the Tasbeeh quick
// counter and the Fatwa chat launcher. Position persists via onPositionChange
// (caller is responsible for saving it to AsyncStorage), and a tap (as
// opposed to a drag) triggers onPress. Clamps to screen bounds so the bubble
// can never be dragged off-screen and lost.
function DraggableBubble({
  size = 84,
  initialPosition,
  onPositionChange,
  onPress,
  style,
  children,
  bottomBound = 140,
  topBound = 60,
}) {
  const pan = useRef(
    new Animated.ValueXY(
      initialPosition || { x: SCREEN_W - size - 14, y: SCREEN_H * 0.32 }
    )
  ).current;
  const lastPos = useRef(initialPosition || { x: SCREEN_W - size - 14, y: SCREEN_H * 0.32 });
  const dragDistance = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const clamp = (x, y) => {
    const maxX = SCREEN_W - size - 4;
    const maxY = SCREEN_H - size - bottomBound;
    return {
      x: Math.max(4, Math.min(maxX, x)),
      y: Math.max(topBound, Math.min(maxY, y)),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        dragDistance.current = 0;
        Animated.spring(scaleAnim, { toValue: 1.08, useNativeDriver: true, friction: 5 }).start();
        pan.setOffset(lastPos.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gesture) => {
        dragDistance.current = Math.abs(gesture.dx) + Math.abs(gesture.dy);
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (evt, gesture) => {
        pan.flattenOffset();
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
        const rawX = lastPos.current.x + gesture.dx;
        const rawY = lastPos.current.y + gesture.dy;
        const clamped = clamp(rawX, rawY);
        lastPos.current = clamped;
        Animated.spring(pan, {
          toValue: clamped,
          useNativeDriver: false,
          friction: 6,
        }).start();
        if (onPositionChange) onPositionChange(clamped);

        // A tap is a release with negligible movement; a drag is anything else.
        if (dragDistance.current < 6) {
          haptic.light();
          if (onPress) onPress();
        } else {
          haptic.selection();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          zIndex: 500,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={[{ width: size, height: size }, style]}>{children}</View>
    </Animated.View>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── All hooks declared at top level ──────────────────────────────────────
  const [screen, setScreen] = useState("splash");
  const [activeTab, setActiveTab] = useState("home");
  const [hydrated, setHydrated] = useState(false);
  const [fontSize, setFontSize] = useState(26);
  const [bookmark, setBookmark] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [wordPopup, setWordPopup] = useState(null);
  const [soundWave, setSoundWave] = useState(false);
  const [longModal, setLongModal] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tasbeehTotal, setTasbeehTotal] = useState(0); // lifetime, persisted, drives stats
  const [tShake, setTShake] = useState(false);
  const [tFlash, setTFlash] = useState(false);
  const [floatW, setFloatW] = useState(false); // fatwa floating bubble
  const [floatTasbeehW, setFloatTasbeehW] = useState(false); // tasbeeh floating bubble
  const [notifW, setNotifW] = useState(false);
  const [morningC, setMorningC] = useState(MORNING_AZKAR.map((a) => a.count));
  const [eveningC, setEveningC] = useState(EVENING_AZKAR.map((a) => a.count));
  const [sleepC, setSleepC] = useState(SLEEP_AZKAR.map((a) => a.count));
  const [travelC, setTravelC] = useState(TRAVEL_AZKAR.map((a) => a.count));
  const [homeC, setHomeC] = useState(HOME_AZKAR.map((a) => a.count));
  const [sunnahC, setSunnahC] = useState(SUNNAH_LIST.map((a) => a.count));
  const [azkarTab, setAzkarTab] = useState("morning");
  const [notifMsg, setNotifMsg] = useState("");
  const [dhikrIdx, setDhikrIdx] = useState(0);
  const [countdown, setCountdown] = useState({ label: "العصر", mins: 97, secs: 33 });

  // GPS / Prayer / Qibla live state
  const [userLocation, setUserLocation] = useState(null);
  const [locationCity, setLocationCity] = useState("جارٍ التحديد...");
  const [locationError, setLocationError] = useState(null);
  const [livePrayerTimes, setLivePrayerTimes] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [qiblaAngle, setQiblaAngle] = useState(143); // default to Cairo

  // Real device compass heading via magnetometer (falls back to simulated
  // rotation only if the sensor genuinely has no data after a timeout —
  // this keeps Qibla usable on web/emulator preview while being accurate
  // on a real device).
  const [liveCompassAngle, setLiveCompassAngle] = useState(0);
  const [compassSource, setCompassSource] = useState("sensor"); // "sensor" | "simulated"

  // Reading-time tracking (drives real stats instead of mock numbers)
  const [ayahsReadTotal, setAyahsReadTotal] = useState(0);
  const [readingSecondsTotal, setReadingSecondsTotal] = useState(0);
  const [dailyLog, setDailyLog] = useState({}); // { "YYYY-MM-DD": { tasbeeh, ayahs, mins } }
  const [streakCount, setStreakCount] = useState(1);
  const [firstUseDate, setFirstUseDate] = useState(null);
  const [achievementKahf, setAchievementKahf] = useState(false);
  const readingSessionStart = useRef(null);

  // Audio state
  const [audioLoadingAyah, setAudioLoadingAyah] = useState(false);
  const [azanTriggered, setAzanTriggered] = useState({});
  const salahReminderTimer = useRef(null);

  // settings
  const [azanOn, setAzanOn] = useState(true);
  const [salahOn, setSalahOn] = useState(true);
  const [salahInt, setSalahInt] = useState(30);
  const [preOn, setPreOn] = useState(true);
  const [preFired, setPreFired] = useState({});
  const [autoAzkar, setAutoAzkar] = useState(true);
  const [travelOn, setTravelOn] = useState(false);
  const [fastOn, setFastOn] = useState(false);
  const [fastMT, setFastMT] = useState(true);
  const [fastWD, setFastWD] = useState(false);

  // theme / monetisation
  const [activeThemeId, setActiveThemeId] = useState("spiritual_green");
  const [unlockedIds, setUnlockedIds] = useState(["royal_black", "spiritual_green"]);
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [promoInputs, setPromoInputs] = useState({});
  const [masterPromo, setMasterPromo] = useState("");
  const [masterMsg, setMasterMsg] = useState("");
  const [adFree, setAdFree] = useState(false);
  const [mamaMode, setMamaMode] = useState(false);
  const [vipPurchased, setVipPurchased] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  // Fatwa floating bubble (settings screen only)
  const [fatwaModalVisible, setFatwaModalVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", text: "أهلاً بك! أنا مساعد الفتاوى الشرعية. اسألني أي سؤال فقهي وسأجيبك بإجابة موثوقة ومختصرة." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Floating bubble positions (persisted)
  const [floatWPos, setFloatWPos] = useState(null);
  const [floatTasbeehPos, setFloatTasbeehPos] = useState(null);

  // Refs
  const soundRef = useRef(null);
  const azanRef = useRef(null);
  const salahReminderObjRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const T = getTheme(activeThemeId);
  const hijri = getHijriDate();
  const greg = getGregorianDate();
  const fastAlert = getSpecialFastingAlert(hijri);

  // ── EFFECT: Splash → ad ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setScreen("ad"), 1800);
    return () => clearTimeout(t);
  }, []);

  // ── EFFECT: Configure Audio session ──────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  // ── EFFECT: HYDRATE all persisted state on first mount ───────────────────
  // This is the fix for "everything resets to zero on app close": every
  // piece of state that should survive a restart is loaded here in one pass
  // before anything else runs, then mirrored back to storage by the
  // dedicated save-effects below.
  useEffect(() => {
    (async () => {
      try {
        const [
          tCount, tTotal, bm, unlocked, theme, free, mama, vip,
          fW, fTW, fWPos, fTWPos, ayahsTotal, secsTotal, log, firstUse, lastUse, streak,
          azan, salah, sInt, pre, auto, travel, fOn, fMT, fWD, kahf,
        ] = await Promise.all([
          loadJSON(STORAGE_KEYS.TASBEEH_COUNT, 0),
          loadJSON(STORAGE_KEYS.TASBEEH_TOTAL, 0),
          loadJSON(STORAGE_KEYS.BOOKMARK, null),
          loadJSON(STORAGE_KEYS.UNLOCKED_IDS, ["royal_black", "spiritual_green"]),
          loadJSON(STORAGE_KEYS.ACTIVE_THEME, "spiritual_green"),
          loadJSON(STORAGE_KEYS.AD_FREE, false),
          loadJSON(STORAGE_KEYS.MAMA_MODE, false),
          loadJSON(STORAGE_KEYS.VIP_PURCHASED, false),
          loadJSON(STORAGE_KEYS.FLOAT_W, false),
          loadJSON(STORAGE_KEYS.FLOAT_TASBEEH_W, false),
          loadJSON(STORAGE_KEYS.FLOAT_W_POS, null),
          loadJSON(STORAGE_KEYS.FLOAT_TASBEEH_POS, null),
          loadJSON(STORAGE_KEYS.AYAHS_READ_TOTAL, 0),
          loadJSON(STORAGE_KEYS.READING_SECONDS_TOTAL, 0),
          loadJSON(STORAGE_KEYS.DAILY_LOG, {}),
          loadJSON(STORAGE_KEYS.FIRST_USE_DATE, null),
          loadJSON(STORAGE_KEYS.LAST_USE_DATE, null),
          loadJSON(STORAGE_KEYS.STREAK_COUNT, 1),
          loadJSON(STORAGE_KEYS.AZAN_ON, true),
          loadJSON(STORAGE_KEYS.SALAH_ON, true),
          loadJSON(STORAGE_KEYS.SALAH_INT, 30),
          loadJSON(STORAGE_KEYS.PRE_ON, true),
          loadJSON(STORAGE_KEYS.AUTO_AZKAR, true),
          loadJSON(STORAGE_KEYS.TRAVEL_ON, false),
          loadJSON(STORAGE_KEYS.FAST_ON, false),
          loadJSON(STORAGE_KEYS.FAST_MT, true),
          loadJSON(STORAGE_KEYS.FAST_WD, false),
          loadJSON(STORAGE_KEYS.ACHIEVEMENT_KAHF, false),
        ]);

        setTasbeehCount(tCount);
        setTasbeehTotal(tTotal);
        setBookmark(bm);
        setUnlockedIds(unlocked);
        setActiveThemeId(theme);
        setAdFree(free);
        setMamaMode(mama);
        setVipPurchased(vip);
        if (vip) setShowDonate(true);
        setFloatW(fW);
        setFloatTasbeehW(fTW);
        setFloatWPos(fWPos);
        setFloatTasbeehPos(fTWPos);
        setAyahsReadTotal(ayahsTotal);
        setReadingSecondsTotal(secsTotal);
        setDailyLog(log);
        setAchievementKahf(kahf);
        setAzanOn(azan);
        setSalahOn(salah);
        setSalahInt(sInt);
        setPreOn(pre);
        setAutoAzkar(auto);
        setTravelOn(travel);
        setFastOn(fOn);
        setFastMT(fMT);
        setFastWD(fWD);

        // First-use date: set once, never overwritten.
        const today = todayKey();
        let resolvedFirstUse = firstUse;
        if (!resolvedFirstUse) {
          resolvedFirstUse = today;
          await saveJSON(STORAGE_KEYS.FIRST_USE_DATE, today);
        }
        setFirstUseDate(resolvedFirstUse);

        // Streak logic: if the user opened the app yesterday, continue the
        // streak; if today already, keep it; otherwise (gap of 2+ days or
        // genuinely first run) reset to 1.
        let resolvedStreak = streak || 1;
        if (lastUse) {
          const diff = daysBetween(lastUse, today);
          if (diff === 0) {
            // already opened today, keep streak as-is
          } else if (diff === 1) {
            resolvedStreak = (streak || 1) + 1;
          } else if (diff > 1) {
            resolvedStreak = 1;
          }
        } else {
          resolvedStreak = 1;
        }
        setStreakCount(resolvedStreak);
        await saveJSON(STORAGE_KEYS.STREAK_COUNT, resolvedStreak);
        await saveJSON(STORAGE_KEYS.LAST_USE_DATE, today);
      } catch (e) {
        // If hydration fails for any reason, the app simply continues with
        // the in-memory defaults declared above — never crashes.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ── SAVE-EFFECTS: mirror state → AsyncStorage whenever it changes ────────
  // Each effect is intentionally tiny and skips writes until hydration is
  // done, so we never overwrite saved data with the initial default state
  // during the first render.
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.TASBEEH_COUNT, tasbeehCount); }, [tasbeehCount, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.TASBEEH_TOTAL, tasbeehTotal); }, [tasbeehTotal, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.BOOKMARK, bookmark); }, [bookmark, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.UNLOCKED_IDS, unlockedIds); }, [unlockedIds, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.ACTIVE_THEME, activeThemeId); }, [activeThemeId, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.AD_FREE, adFree); }, [adFree, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.MAMA_MODE, mamaMode); }, [mamaMode, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.VIP_PURCHASED, vipPurchased); }, [vipPurchased, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.FLOAT_W, floatW); }, [floatW, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.FLOAT_TASBEEH_W, floatTasbeehW); }, [floatTasbeehW, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.AYAHS_READ_TOTAL, ayahsReadTotal); }, [ayahsReadTotal, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.READING_SECONDS_TOTAL, readingSecondsTotal); }, [readingSecondsTotal, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.DAILY_LOG, dailyLog); }, [dailyLog, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.ACHIEVEMENT_KAHF, achievementKahf); }, [achievementKahf, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.AZAN_ON, azanOn); }, [azanOn, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.SALAH_ON, salahOn); }, [salahOn, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.SALAH_INT, salahInt); }, [salahInt, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.PRE_ON, preOn); }, [preOn, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.AUTO_AZKAR, autoAzkar); }, [autoAzkar, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.TRAVEL_ON, travelOn); }, [travelOn, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.FAST_ON, fastOn); }, [fastOn, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.FAST_MT, fastMT); }, [fastMT, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.FAST_WD, fastWD); }, [fastWD, hydrated]);
  useEffect(() => { if (hydrated && floatWPos) saveJSON(STORAGE_KEYS.FLOAT_W_POS, floatWPos); }, [floatWPos, hydrated]);
  useEffect(() => { if (hydrated && floatTasbeehPos) saveJSON(STORAGE_KEYS.FLOAT_TASBEEH_POS, floatTasbeehPos); }, [floatTasbeehPos, hydrated]);

  // ── FUNCTION: log today's activity into the daily log (drives real stats)
  const logDaily = useCallback((patch) => {
    const key = todayKey();
    setDailyLog((prev) => {
      const existing = prev[key] || { tasbeeh: 0, ayahs: 0, mins: 0 };
      const next = {
        tasbeeh: existing.tasbeeh + (patch.tasbeeh || 0),
        ayahs: existing.ayahs + (patch.ayahs || 0),
        mins: existing.mins + (patch.mins || 0),
      };
      return { ...prev, [key]: next };
    });
  }, []);

  // ── EFFECT: Request GPS & fetch prayer times ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("لم يتم منح إذن الموقع");
          setLocationCity("القاهرة، مصر");
          fetchPrayerTimes(30.0444, 31.2357); // fallback to Cairo
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        // Reverse geocode for city name
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (rev && rev.length > 0) {
            const r = rev[0];
            setLocationCity(`${r.city || r.subregion || r.region || ""}, ${r.country || ""}`);
          }
        } catch (_) {
          setLocationCity("موقعك الحالي");
        }
        // Calculate qibla
        setQiblaAngle(calcQiblaAngle(latitude, longitude));
        // Fetch live prayer times
        fetchPrayerTimes(latitude, longitude);
      } catch (e) {
        setLocationError("تعذّر تحديد الموقع");
        setLocationCity("القاهرة، مصر");
        fetchPrayerTimes(30.0444, 31.2357);
      }
    })();
  }, []);

  // ── FUNCTION: Fetch live prayer times from Aladhan API ───────────────────
  const fetchPrayerTimes = useCallback(async (lat, lng) => {
    setPrayerLoading(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=5`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 200 && json.data && json.data.timings) {
        const t = json.data.timings;
        const times = [
          { name: "الفجر", time: t.Fajr, key: "Fajr" },
          { name: "الشروق", time: t.Sunrise, key: "Sunrise" },
          { name: "الظهر", time: t.Dhuhr, key: "Dhuhr" },
          { name: "العصر", time: t.Asr, key: "Asr" },
          { name: "المغرب", time: t.Maghrib, key: "Maghrib" },
          { name: "العشاء", time: t.Isha, key: "Isha" },
        ];
        setLivePrayerTimes(times);
      }
    } catch (e) {
      // silently use fallback
    } finally {
      setPrayerLoading(false);
    }
  }, []);

  // ── FUNCTION: Compute countdown to next prayer (pure, re-callable) ────────
  const computeCountdown = useCallback((times) => {
    if (!times || times.length === 0) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    let next = null;
    for (const p of times) {
      const pm = parseTimeMins(p.time);
      if (pm > nowMins) {
        next = { label: p.name, diffMins: pm - nowMins };
        break;
      }
    }
    if (!next) {
      const pm = parseTimeMins(times[0].time);
      next = { label: times[0].name, diffMins: 1440 - nowMins + pm };
    }

    const totalSecs = Math.max(0, Math.round(next.diffMins * 60));
    return {
      label: next.label,
      mins: Math.floor(totalSecs / 60),
      secs: totalSecs % 60,
    };
  }, []);

  // ── EFFECT: Live countdown ticker ─────────────────────────────────────────
  useEffect(() => {
    const timesToUse = livePrayerTimes || [
      { name: "الفجر", time: "04:45" },
      { name: "الشروق", time: "06:15" },
      { name: "الظهر", time: "12:30" },
      { name: "العصر", time: "15:45" },
      { name: "المغرب", time: "18:30" },
      { name: "العشاء", time: "20:00" },
    ];

    const tick = () => {
      const result = computeCountdown(timesToUse);
      if (result) setCountdown(result);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [livePrayerTimes, computeCountdown]);

  // ── EFFECT: Pre-prayer reminder (15 min before) — was just a toggle with
  // no logic before; now actually fires once per prayer per day when within
  // the 15-minute window and `preOn` is enabled.
  useEffect(() => {
    if (!preOn || !livePrayerTimes) return;
    const interval = setInterval(() => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      livePrayerTimes.forEach((p) => {
        if (!p.time) return;
        const pm = parseTimeMins(p.time);
        const diff = pm - nowMins;
        const fireKey = `${todayKey()}-${p.name}`;
        if (diff === 15 && !preFired[fireKey]) {
          setPreFired((prev) => ({ ...prev, [fireKey]: true }));
          haptic.warning();
          sendNotif(`🔔 اقتربت صلاة ${p.name} — بقي 15 دقيقة`);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [preOn, livePrayerTimes, preFired]);

  // ── EFFECT: Real device compass via Magnetometer ──────────────────────────
  // Falls back to a slow simulated rotation only if the sensor produces no
  // readings at all (e.g. running in a web preview / emulator without a
  // magnetometer), so the Qibla screen is never a dead, frozen UI.
  useEffect(() => {
    let subscription = null;
    let gotRealReading = false;
    let fallbackInterval = null;

    const startFallback = () => {
      if (fallbackInterval) return;
      setCompassSource("simulated");
      fallbackInterval = setInterval(() => {
        setLiveCompassAngle((p) => (p + 1.5) % 360);
      }, 80);
    };

    const fallbackTimeout = setTimeout(() => {
      if (!gotRealReading) startFallback();
    }, 2500);

    (async () => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!available) {
          startFallback();
          return;
        }
        Magnetometer.setUpdateInterval(120);
        subscription = Magnetometer.addListener(({ x, y }) => {
          if (x === 0 && y === 0) return; // no real signal yet
          gotRealReading = true;
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
          setCompassSource("sensor");
          // Convert magnetometer x/y into a compass heading (0-360, 0 = North)
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          angle = (angle + 360) % 360;
          // Adjust so 0° aligns with device "up" pointing North
          const heading = (angle + 90) % 360;
          setLiveCompassAngle(heading);
        });
      } catch (e) {
        startFallback();
      }
    })();

    return () => {
      clearTimeout(fallbackTimeout);
      if (subscription) subscription.remove();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const effectiveCompass = liveCompassAngle;
  const isAligned = Math.abs((effectiveCompass - qiblaAngle + 360) % 360) < 15;

  // ── EFFECT: Quran audio playback (streaming per ayah) ─────────────────────
  useEffect(() => {
    if (!audioPlaying) {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
      }
      if (readingSessionStart.current) {
        const elapsedSec = Math.round((Date.now() - readingSessionStart.current) / 1000);
        if (elapsedSec > 0) {
          setReadingSecondsTotal((p) => p + elapsedSec);
          logDaily({ mins: elapsedSec / 60 });
        }
        readingSessionStart.current = null;
      }
      return;
    }
    readingSessionStart.current = Date.now();
    let cancelled = false;
    const playAyah = async (idx) => {
      if (cancelled || idx >= FATIHA.length) {
        setAudioPlaying(false);
        setCurrentAyah(0);
        return;
      }
      setCurrentAyah(idx);
      setAudioLoadingAyah(true);
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: AUDIO_SOURCES.fatiha[idx] },
          { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = sound;
        setAudioLoadingAyah(false);
        // Real ayah-read tracking: each ayah that finishes playing counts
        // toward the lifetime ayahsReadTotal that now drives the Stats screen.
        setAyahsReadTotal((p) => p + 1);
        logDaily({ ayahs: 1 });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish && !cancelled) {
            playAyah(idx + 1);
          }
        });
      } catch (e) {
        setAudioLoadingAyah(false);
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) playAyah(idx + 1);
          }, 3000);
        }
      }
    };
    playAyah(currentAyah);
    return () => {
      cancelled = true;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
      }
    };
  }, [audioPlaying]);

  // ── EFFECT: Azan alert trigger check every 5 seconds ──────────────────────
  // Lowered from 15s → 5s for tighter accuracy around the exact prayer
  // minute (this is the practical ceiling for a foreground JS timer; true
  // zero-delay delivery while the app is backgrounded requires a native
  // scheduled-notification API, which is outside what a JS interval can do).
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;
    const interval = setInterval(() => {
      const now = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      livePrayerTimes.forEach((p) => {
        const timeStr = p.time ? p.time.substring(0, 5) : "";
        const fireKey = `${todayKey()}-${timeStr}`;
        if (timeStr === nowStr && !azanTriggered[fireKey]) {
          setAzanTriggered((prev) => ({ ...prev, [fireKey]: true }));
          playAzan(p.name);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [azanOn, livePrayerTimes, azanTriggered]);

  // ── FUNCTION: Play Azan audio ─────────────────────────────────────────────
  const playAzan = async (prayerName) => {
    haptic.success();
    try {
      if (azanRef.current) {
        await azanRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: AUDIO_SOURCES.azan },
        { shouldPlay: true, volume: 1.0 }
      );
      azanRef.current = sound;
      sendNotif(`🕌 أذان ${prayerName}`);
    } catch (e) {
      sendNotif(`🕌 حان وقت أذان ${prayerName}`);
    }
  };

  // ── EFFECT: Periodic Salah Reminder (audio if a real URL is configured,
  // otherwise a haptic pulse + text notification — never silently plays the
  // wrong audio again).
  useEffect(() => {
    if (salahReminderTimer.current) clearInterval(salahReminderTimer.current);
    if (!salahOn) return;
    const intervalMs = salahInt * 60 * 1000;
    salahReminderTimer.current = setInterval(async () => {
      haptic.medium();
      if (AUDIO_SOURCES.salahReminder) {
        try {
          if (salahReminderObjRef.current) {
            await salahReminderObjRef.current.unloadAsync();
          }
          const { sound } = await Audio.Sound.createAsync(
            { uri: AUDIO_SOURCES.salahReminder },
            { shouldPlay: true, volume: 0.7 }
          );
          salahReminderObjRef.current = sound;
        } catch (e) {
          // fall through to notification-only below
        }
      }
      sendNotif("اللهم صلِّ وسلِّم على نبيِّنا محمد ﷺ");
    }, intervalMs);
    return () => {
      if (salahReminderTimer.current) clearInterval(salahReminderTimer.current);
    };
  }, [salahOn, salahInt]);

  // ── EFFECT: Dhikr banner rotation ────────────────────────────────────────
  useEffect(() => {
    if (fastAlert) return;
    const t = setInterval(() => setDhikrIdx((p) => (p + 1) % DHIKR_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, [fastAlert]);

  // ── EFFECT: AppState — persist counters immediately on backgrounding ─────
  // This is what makes the Tasbeeh counter (and everything else) survive
  // the user leaving the app: every value is already being mirrored to
  // AsyncStorage on every change (see save-effects above), but we also force
  // an explicit flush the moment the app goes to background/inactive, so
  // there's no race against the OS suspending the JS engine mid-write.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current === "active" &&
        (nextState === "background" || nextState === "inactive")
      ) {
        saveJSON(STORAGE_KEYS.TASBEEH_COUNT, tasbeehCount);
        saveJSON(STORAGE_KEYS.TASBEEH_TOTAL, tasbeehTotal);
        saveJSON(STORAGE_KEYS.AYAHS_READ_TOTAL, ayahsReadTotal);
        saveJSON(STORAGE_KEYS.READING_SECONDS_TOTAL, readingSecondsTotal);
        saveJSON(STORAGE_KEYS.DAILY_LOG, dailyLog);
        saveJSON(STORAGE_KEYS.LAST_USE_DATE, todayKey());
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [tasbeehCount, tasbeehTotal, ayahsReadTotal, readingSecondsTotal, dailyLog]);

  // ── CLEANUP audio on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      if (azanRef.current) azanRef.current.unloadAsync().catch(() => {});
      if (salahReminderObjRef.current) salahReminderObjRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  // ── EFFECT: Hardware back button → go home ────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fatwaModalVisible) {
        setFatwaModalVisible(false);
        return true;
      }
      if (activeTab !== "home") {
        setActiveTab("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [activeTab, fatwaModalVisible]);

  const sendNotif = (msg) => {
    setNotifMsg(msg);
    setTimeout(() => setNotifMsg(""), 3500);
  };

  const handleTasbeeh = () => {
    haptic.light();
    const n = tasbeehCount + 1;
    setTasbeehCount(n);
    setTasbeehTotal((p) => p + 1);
    logDaily({ tasbeeh: 1 });
    setTShake(true);
    setTimeout(() => setTShake(false), 300);
    if (n === 33 || n === 100) {
      haptic.success();
      setTFlash(true);
      setTimeout(() => setTFlash(false), 1000);
    }
  };

  const handleWordPress = (w) => {
    haptic.selection();
    setSoundWave(true);
    setWordPopup(w);
    setTimeout(() => { setSoundWave(false); setWordPopup(null); }, 2500);
  };
  const handleWordLong = (w) => { haptic.medium(); setLongModal(w); };

  const decrement = (arr, setArr, idx) => {
    haptic.light();
    const next = [...arr];
    if (next[idx] > 0) next[idx]--;
    setArr(next);
    // Sunnah list includes "قراءة سورة الكهف كاملة يوم الجمعة" at index 0 —
    // completing it now genuinely flips the related achievement instead of
    // it being permanently hardcoded to done:false.
    if (arr === sunnahC && idx === 0 && next[idx] === 0) {
      setAchievementKahf(true);
      haptic.success();
    }
  };

  const selectTheme = (id) => {
    if (unlockedIds.includes(id)) {
      haptic.selection();
      setActiveThemeId(id);
      sendNotif("✅ تم تطبيق " + getTheme(id).name);
    }
  };
  const openPurchase = (id) => { haptic.light(); setPurchaseModal(id); };
  const confirmPurchase = (id) => {
    haptic.success();
    const th = getTheme(id);
    setUnlockedIds((prev) => [...new Set([...prev, id])]);
    setActiveThemeId(id);
    setPurchaseModal(null);
    if (id === "vip_royal") { setVipPurchased(true); setShowDonate(true); setAdFree(true); }
    sendNotif("✅ تم فتح " + th.name + "!");
  };
  const submitThemePromo = (id) => {
    const code = (promoInputs[id]?.code || "").trim().toLowerCase();
    const valid = { royal_gold: "gold2025", sufi_purple: "purple2025", vip_royal: "vip2025" };
    if (code === valid[id]) {
      haptic.success();
      setUnlockedIds((prev) => [...new Set([...prev, id])]);
      setActiveThemeId(id);
      setPurchaseModal(null);
      sendNotif("🎁 " + getTheme(id).name + " مفتوح!");
    } else {
      haptic.warning();
      setPromoInputs((p) => ({ ...p, [id]: { ...p[id], msg: "❌ الكود غير صحيح" } }));
    }
  };
  const setPromoCode = (id, val) => setPromoInputs((p) => ({ ...p, [id]: { ...p[id], code: val, msg: "" } }));

  const handleMasterPromo = async () => {
    const code = masterPromo.trim();
    if (!code) { haptic.warning(); setMasterMsg("❌ الكود غير صحيح"); return; }
    try {
      const inputHash = await hashCode(code);
      if (inputHash === MAMA_CODE_HASH) {
        haptic.success();
        setAdFree(true); setMamaMode(true);
        setUnlockedIds(THEMES.map((t) => t.id));
        setActiveThemeId("vip_royal");
        setMasterMsg("❤️ تم تفعيل كل المميزات الفاخرة بالكامل!");
        return;
      }
    } catch (e) {}
    if (code.toLowerCase() === "friend2025") {
      haptic.success();
      setAdFree(true); setMasterMsg("✅ تم إزالة الإعلانات!");
    } else {
      haptic.warning();
      setMasterMsg("❌ الكود غير صحيح");
    }
  };

  const sendFatwa = async () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    haptic.light();
    setChatHistory((p) => [...p, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const match = FATWA_QA.find((f) => q.includes(f.q.slice(0, 10)));
    const answer = match
      ? match.a
      : "جزاك الله خيراً على سؤالك. هذه المسألة تحتاج إلى بحث أعمق وأنصحك بمراجعة أهل العلم. وبشكل عام، الأصل في العبادات التوقيف والاتباع، والأصل في المعاملات الإباحة حتى يثبت المانع.";
    setChatHistory((p) => [...p, { role: "ai", text: answer }]);
    setChatLoading(false);
  };

  // ── REAL STATS DERIVATION (replaces all previously hardcoded numbers) ────
  const last7Keys = (() => {
    const keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return keys;
  })();
  const dayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const weeklyStatsReal = last7Keys.map((k) => {
    const entry = dailyLog[k] || { tasbeeh: 0, ayahs: 0, mins: 0 };
    const d = new Date(k + "T00:00:00");
    return {
      day: dayLabels[d.getDay()],
      mins: Math.round(entry.mins),
      ayahs: entry.ayahs,
    };
  });
  const totalReadingHours = (readingSecondsTotal / 3600).toFixed(1);
  const achievementFatihaDone = ayahsReadTotal >= FATIHA.length;
  const achievement33Done = tasbeehTotal >= 33;
  const achievement100Done = tasbeehTotal >= 100;
  const achievementStreak7Done = streakCount >= 7;
  const achievementFullQuranDone = false; // only Al-Fatiha is in the dataset today — genuinely not achievable yet, shown locked rather than faked

  // Displayed prayer times: live or fallback
  const displayedPrayerTimes = livePrayerTimes || [
    { name: "الفجر", time: "04:45" },
    { name: "الشروق", time: "06:15" },
    { name: "الظهر", time: "12:30" },
    { name: "العصر", time: "15:45" },
    { name: "المغرب", time: "18:30" },
    { name: "العشاء", time: "20:00" },
  ];

  // ── SPLASH ──
  if (screen === "splash") {
    return (
      <View style={styles.splashWrap}>
        <View style={styles.splashGlow} />
        <Text style={styles.splashEmoji}>☪️</Text>
        <Text style={styles.splashTitle}>مُصلِّي</Text>
        <Text style={styles.splashSub}>مساعدك القرآني الذكي</Text>
        <View style={styles.splashBarTrack}>
          <View style={styles.splashBarFill} />
        </View>
      </View>
    );
  }

  // ── AD ──
  if (screen === "ad") {
    return (
      <View style={styles.adWrap}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>إعلان مفتوح</Text>
        </View>
        <Text style={styles.adEmoji}>📖</Text>
        <Text style={styles.adTitle}>تعلّم القرآن الكريم</Text>
        <Text style={styles.adSub}>أفضل تطبيق للحفظ والتلاوة والأذكار</Text>
        <TouchableOpacity style={styles.adSkip} onPress={() => setScreen("home")}>
          <Text style={styles.adSkipText}>تخطي ✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── NAV (Fatwa tab removed — lives in floating bubbles instead) ──
  const NAV_TABS = [
    { id: "home", icon: "🏠", label: "الرئيسية" },
    { id: "quran", icon: "📖", label: "القرآن" },
    { id: "tasbeeh", icon: "📿", label: "التسبيح" },
    { id: "qibla", icon: "🧭", label: "القبلة" },
    { id: "azkar", icon: "🤲", label: "الأذكار" },
    { id: "stats", icon: "📊", label: "الإحصاء" },
    { id: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <View style={[styles.appRoot, { backgroundColor: T.bg }]}>
      {/* Mama dedication — تظهر فقط في شاشة الإعدادات */}
      {mamaMode && activeTab === "settings" && (
        <View style={styles.mamaWrap} pointerEvents="none">
          <View style={styles.mamaBadge}>
            <Text style={styles.mamaHeart}>❤️</Text>
            <Text style={styles.mamaText}>حبيني وادعيلي</Text>
            <Text style={styles.mamaHeart}>❤️</Text>
          </View>
        </View>
      )}

      {/* Toast notification */}
      {notifMsg ? (
        <View style={[styles.toast, { borderColor: T.accentBorder }]}>
          <Text style={styles.toastText}>{notifMsg}</Text>
        </View>
      ) : null}

      <PurchaseModal
        T={T}
        purchaseModal={purchaseModal}
        setPurchaseModal={setPurchaseModal}
        promoInputs={promoInputs}
        setPromoCode={setPromoCode}
        submitThemePromo={submitThemePromo}
        confirmPurchase={confirmPurchase}
      />

      {/* Floating draggable TASBEEH bubble — bigger, freely draggable,
          position persists across restarts */}
      {floatTasbeehW && (
        <DraggableBubble
          size={92}
          initialPosition={floatTasbeehPos}
          onPositionChange={setFloatTasbeehPos}
          onPress={handleTasbeeh}
        >
          <View
            style={[
              styles.floatWidget,
              { backgroundColor: T.cardBg, borderColor: T.accent, shadowColor: T.accent, width: 92, height: 92, borderRadius: 46 },
            ]}
          >
            <Text style={[styles.floatWidgetEmoji, { fontSize: 26 }]}>📿</Text>
            <Text style={[styles.floatWidgetCount, { color: T.accent, fontSize: 21 }]}>{tasbeehCount}</Text>
            <Text style={[styles.floatWidgetLabel, { color: T.accent }]}>تسبيح</Text>
          </View>
        </DraggableBubble>
      )}

      {/* Floating draggable FATWA bubble — available anywhere in the app,
          not just the Settings screen, since it's now a true free-floating
          overlay rather than a fixed card */}
      {floatW && (
        <DraggableBubble
          size={72}
          initialPosition={floatWPos}
          onPositionChange={setFloatWPos}
          onPress={() => setFatwaModalVisible(true)}
        >
          <LinearGradient
            colors={["#1a0e1a", T.cardBg]}
            style={[styles.fatwaFloatBubble, { borderColor: T.accent, shadowColor: T.accent }]}
          >
            <Text style={{ fontSize: 28 }}>🕌</Text>
          </LinearGradient>
        </DraggableBubble>
      )}

      {/* Word tap popup */}
      {wordPopup ? (
        <View style={[styles.wordPopup, { borderColor: T.accentBorder }]}>
          <Text style={styles.wordPopupText}>{wordPopup}</Text>
          {soundWave && (
            <View style={styles.soundWaveRow}>
              {[...Array(14)].map((_, i) => (
                <View key={i} style={[styles.soundWaveBar, { backgroundColor: T.accent, height: 8 + Math.abs(Math.sin(i)) * 24 }]} />
              ))}
            </View>
          )}
          <Text style={styles.wordPopupSub}>🔊 جارٍ تشغيل الصوت...</Text>
        </View>
      ) : null}

      {/* Long press word modal */}
      <Modal visible={!!longModal} transparent animationType="fade" onRequestClose={() => setLongModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLongModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.longModalBox, { borderColor: T.cardBorder }]} onPress={() => {}}>
            <ScrollView>
              <Text style={styles.longModalWord}>{longModal}</Text>
              <View style={styles.longModalDivider} />
              {longModal && WORD_MEANINGS[longModal] ? (
                <>
                  <RI label="المعنى" value={WORD_MEANINGS[longModal].m} />
                  <RI label="الجذر" value={WORD_MEANINGS[longModal].r} />
                  <RI label="الإعراب" value={WORD_MEANINGS[longModal].g} />
                </>
              ) : (
                <Text style={styles.longModalNoData}>لا يوجد تفسير مسجّل لهذه الكلمة</Text>
              )}
              <View style={styles.longModalDivider} />
              <Text style={styles.longModalFontLabel}>حجم الخط</Text>
              <View style={styles.longModalFontRow}>
                <Btn T={T} label="أ−" onPress={() => setFontSize((p) => Math.max(18, p - 2))} />
                <Text style={[styles.longModalFontVal, { color: T.accent }]}>{fontSize}px</Text>
                <Btn T={T} label="أ+" onPress={() => setFontSize((p) => Math.min(44, p + 2))} />
              </View>
              <Text style={styles.longModalHint}>🔊 النطق: مدّ حرف المد، وأظهر التشديد، والتقط النفَس عند الوقف.</Text>
              <TouchableOpacity style={[styles.longModalClose, { backgroundColor: T.accent }]} onPress={() => setLongModal(null)}>
                <Text style={styles.longModalCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── FLOATING FATWA CHAT MODAL ─────────────────────────────────── */}
      <Modal visible={fatwaModalVisible} transparent animationType="slide" onRequestClose={() => setFatwaModalVisible(false)}>
        <View style={styles.fatwaModalOverlay}>
          <View style={[styles.fatwaModalSheet, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
            {/* Header */}
            <View style={[styles.fatwaModalHeader, { borderBottomColor: T.cardBorder }]}>
              <View style={[styles.fatwaModalIcon, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}>
                <Text style={{ fontSize: 22 }}>🕌</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fatwaModalTitle, { color: T.accent }]}>مستشار الفتاوى الشرعية</Text>
                <Text style={styles.fatwaModalSub}>إجابات فقهية سريعة وموثوقة</Text>
              </View>
              <TouchableOpacity onPress={() => setFatwaModalVisible(false)} style={styles.fatwaModalClose}>
                <Text style={styles.fatwaModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Chat body */}
            <FatwaScreen
              T={T}
              chatHistory={chatHistory}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSend={sendFatwa}
              loading={chatLoading}
              embedded
            />
          </View>
        </View>
      </Modal>

      {/* Screens */}
      <View style={styles.screensWrap}>
        {activeTab === "home" && (
          <HomeScreen
            T={T}
            bookmark={bookmark}
            sendNotif={sendNotif}
            setActiveTab={setActiveTab}
            dhikrIdx={dhikrIdx}
            fastAlert={fastAlert}
            hijri={hijri}
            greg={greg}
            countdown={countdown}
            prayerTimes={displayedPrayerTimes}
            locationCity={locationCity}
            prayerLoading={prayerLoading}
          />
        )}
        {activeTab === "quran" && (
          <QuranScreen
            T={T}
            fontSize={fontSize}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentAyah={currentAyah}
            setCurrentAyah={setCurrentAyah}
            audioPlaying={audioPlaying}
            setAudioPlaying={setAudioPlaying}
            bookmark={bookmark}
            setBookmark={setBookmark}
            onWordPress={handleWordPress}
            onWordLong={handleWordLong}
            audioLoadingAyah={audioLoadingAyah}
          />
        )}
        {activeTab === "tasbeeh" && (
          <TasbeehScreen
            T={T}
            count={tasbeehCount}
            onTap={handleTasbeeh}
            onReset={() => { haptic.medium(); setTasbeehCount(0); }}
            shake={tShake}
            flash={tFlash}
            floatTasbeehW={floatTasbeehW}
            setFloatTasbeehW={setFloatTasbeehW}
            floatW={floatW}
            setFloatW={setFloatW}
            notifW={notifW}
            setNotifW={setNotifW}
            sendNotif={sendNotif}
          />
        )}
        {activeTab === "qibla" && (
          <QiblaScreen
            T={T}
            compassAngle={effectiveCompass}
            isAligned={isAligned}
            qiblaAngle={qiblaAngle}
            locationCity={locationCity}
            userLocation={userLocation}
            compassSource={compassSource}
          />
        )}
        {activeTab === "azkar" && (
          <AzkarScreen
            T={T}
            azkarTab={azkarTab}
            setAzkarTab={setAzkarTab}
            morningC={morningC} setMorningC={setMorningC}
            eveningC={eveningC} setEveningC={setEveningC}
            sleepC={sleepC} setSleepC={setSleepC}
            travelC={travelC} setTravelC={setTravelC}
            homeC={homeC} setHomeC={setHomeC}
            sunnahC={sunnahC} setSunnahC={setSunnahC}
            decrement={decrement}
          />
        )}
        {activeTab === "stats" && (
          <StatsScreen
            T={T}
            weeklyStats={weeklyStatsReal}
            totalReadingHours={totalReadingHours}
            ayahsReadTotal={ayahsReadTotal}
            streakCount={streakCount}
            tasbeehTotal={tasbeehTotal}
            achievementFatihaDone={achievementFatihaDone}
            achievement33Done={achievement33Done}
            achievement100Done={achievement100Done}
            achievementStreak7Done={achievementStreak7Done}
            achievementFullQuranDone={achievementFullQuranDone}
            achievementKahf={achievementKahf}
          />
        )}
        {activeTab === "settings" && (
          <SettingsScreen
            T={T}
            adFree={adFree}
            masterPromo={masterPromo}
            setMasterPromo={setMasterPromo}
            masterMsg={masterMsg}
            handleMasterPromo={handleMasterPromo}
            azanOn={azanOn} setAzanOn={setAzanOn}
            salahOn={salahOn} setSalahOn={setSalahOn}
            salahInt={salahInt} setSalahInt={setSalahInt}
            preOn={preOn} setPreOn={setPreOn}
            autoAzkar={autoAzkar} setAutoAzkar={setAutoAzkar}
            travelOn={travelOn} setTravelOn={setTravelOn}
            fastOn={fastOn} setFastOn={setFastOn}
            fastMT={fastMT} setFastMT={setFastMT}
            fastWD={fastWD} setFastWD={setFastWD}
            activeThemeId={activeThemeId}
            unlockedIds={unlockedIds}
            onSelect={selectTheme}
            onBuy={openPurchase}
            vipPurchased={vipPurchased}
            showDonate={showDonate}
            sendNotif={sendNotif}
            onOpenFatwa={() => { haptic.light(); setFatwaModalVisible(true); }}
            floatTasbeehW={floatTasbeehW}
            setFloatTasbeehW={setFloatTasbeehW}
          />
        )}
      </View>

      {/* Bottom ad */}
      {!adFree && activeTab !== "quran" && (
        <View style={styles.bottomAd}>
          <Text style={styles.bottomAdText}>إعلان دعائي نظيف 📢</Text>
        </View>
      )}

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { borderTopColor: T.cardBorder, backgroundColor: "#070707" }]}>
        <View style={styles.bottomNavContent}>
          {NAV_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => { haptic.selection(); setActiveTab(t.id); }} style={styles.navTabBtn} activeOpacity={0.7}>
                <View style={[styles.navTabIconWrap, isActive && { backgroundColor: T.accentSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: T.accentBorder }]}>
                  <Text style={[styles.navTabIcon, { opacity: isActive ? 1 : 0.4 }]}>{t.icon}</Text>
                </View>
                <Text style={[styles.navTabLabel, { color: isActive ? T.accent : "#3a3a3a", fontWeight: isActive ? "700" : "400" }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── PURCHASE MODAL ───────────────────────────────────────────────────────────
function PurchaseModal({ T, purchaseModal, setPurchaseModal, promoInputs, setPromoCode, submitThemePromo, confirmPurchase }) {
  if (!purchaseModal) return null;
  const th = getTheme(purchaseModal);
  const pi = promoInputs[purchaseModal] || {};
  return (
    <Modal visible={!!purchaseModal} transparent animationType="slide" onRequestClose={() => setPurchaseModal(null)}>
      <TouchableOpacity style={styles.purchaseOverlay} activeOpacity={1} onPress={() => setPurchaseModal(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.purchaseSheet, { borderColor: th.accentBorder }]}>
          <ScrollView>
            <View style={styles.purchaseHandle} />
            <View style={styles.purchaseHeaderRow}>
              <LinearGradient colors={th.grad} style={styles.purchaseEmojiBox}>
                <Text style={styles.purchaseEmoji}>{th.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseName}>{th.name}</Text>
                <Text style={styles.purchaseSubName}>مُصلِّي — متجر الثيمات</Text>
              </View>
              <View style={[styles.purchasePriceBadge, { backgroundColor: th.accentSoft, borderColor: th.accentBorder }]}>
                <Text style={[styles.purchasePriceText, { color: th.accent }]}>{th.price}</Text>
              </View>
            </View>
            <Text style={styles.purchaseDesc}>{th.desc}</Text>
            {th.id === "vip_royal" && (
              <View style={styles.vipBox}>
                <Text style={[styles.vipBoxTitle, { color: th.accent }]}>يشمل الـ VIP:</Text>
                {VIP_DHIKR_SLOTS.map((d, i) => (
                  <Text key={i} style={styles.vipBoxItem}>• {d}</Text>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.purchaseBuyBtn, { backgroundColor: th.accent }]} onPress={() => confirmPurchase(purchaseModal)}>
              <Text style={styles.purchaseBuyBtnText}>شراء عبر Google Play — {th.price}</Text>
            </TouchableOpacity>
            <View style={styles.purchasePromoSection}>
              <Text style={styles.purchasePromoLabel}>🎁 لديك كود ترويجي؟</Text>
              <View style={styles.purchasePromoRow}>
                <TextInput
                  style={[styles.purchasePromoInput, { borderColor: th.accentBorder }]}
                  placeholder="أدخل الكود..."
                  placeholderTextColor="#555"
                  textAlign="right"
                  value={pi.code || ""}
                  onChangeText={(v) => setPromoCode(purchaseModal, v)}
                />
                <TouchableOpacity style={[styles.purchasePromoBtn, { backgroundColor: th.accentSoft, borderColor: th.accentBorder }]} onPress={() => submitThemePromo(purchaseModal)}>
                  <Text style={[styles.purchasePromoBtnText, { color: th.accent }]}>تفعيل</Text>
                </TouchableOpacity>
              </View>
              {pi.msg ? (
                <Text style={[styles.purchasePromoMsg, { color: pi.msg.startsWith("❌") ? "#ef4444" : "#22c55e" }]}>{pi.msg}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.purchaseCancelBtn} onPress={() => setPurchaseModal(null)}>
              <Text style={styles.purchaseCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ T, bookmark, sendNotif, setActiveTab, dhikrIdx, fastAlert, hijri, greg, countdown, prayerTimes, locationCity, prayerLoading }) {
  // Next-prayer alert card now reflects the REAL live countdown instead of a
  // hardcoded "45 دقيقة — 3:45 PM" string.
  const nextPrayerMinutesLeft = countdown.mins;
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.homeHeader, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
        <Text style={styles.homeHeaderGreg}>
          {greg.dayName}، {greg.day} {greg.month} {greg.year}
        </Text>
        <View style={styles.homeHeaderRow}>
          <Text style={styles.homeHeaderTitle}>مُصلِّي</Text>
          <Text style={[styles.homeHeaderHijri, { color: T.accent }]}>
            {hijri.day} {hijri.monthName} {hijri.year} هـ
          </Text>
        </View>
        {locationCity ? (
          <Text style={[styles.homeHeaderCity, { color: T.accent }]}>📍 {locationCity}</Text>
        ) : null}
      </View>

      {/* Dhikr / alert banner */}
      <View style={[styles.dhikrBanner, { backgroundColor: fastAlert ? "#1a0e00" : T.cardBg, borderBottomColor: fastAlert ? "#f59e0b44" : T.cardBorder }]}>
        {fastAlert ? (
          <Text style={styles.fastAlertText}>🌟 {fastAlert}</Text>
        ) : (
          <Text style={[styles.dhikrText, { color: T.accent }]}>{DHIKR_PHRASES[dhikrIdx]}</Text>
        )}
      </View>

      {/* Countdown */}
      <View style={[styles.countdownRow, { backgroundColor: T.cardBg, borderBottomColor: T.cardBorder }]}>
        <Text style={styles.countdownLabel}>الوقت المتبقي لأذان {countdown.label}</Text>
        <Text style={[styles.countdownVal, { color: T.accent, writingDirection: "ltr" }]}>
          {pad(countdown.mins)}:{pad(countdown.secs)}
        </Text>
      </View>

      {/* Prayer times strip */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.prayerStrip, { borderBottomColor: T.cardBorder }]}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
      >
        {prayerLoading ? (
          <View style={{ paddingVertical: 14, paddingHorizontal: 10 }}>
            <Text style={{ color: "#555", fontSize: 12 }}>⏳ جارٍ تحميل مواقيت الصلاة...</Text>
          </View>
        ) : prayerTimes.map((p) => (
          <View key={p.name} style={[styles.prayerChip, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
            <Text style={styles.prayerChipName}>{p.name}</Text>
            <Text style={[styles.prayerChipTime, { color: T.accent }]}>{p.time ? p.time.substring(0, 5) : "--:--"}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Resume reading */}
      {bookmark && (
        <View style={[styles.bookmarkCard, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
          <View>
            <Text style={styles.bookmarkLabel}>من حيث توقفت</Text>
            <Text style={styles.bookmarkValue}>سورة الفاتحة — آية {bookmark}</Text>
          </View>
          <TouchableOpacity style={[styles.bookmarkBtn, { backgroundColor: T.accent }]} onPress={() => setActiveTab("quran")}>
            <Text style={styles.bookmarkBtnText}>متابعة القراءة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4 main nav cards */}
      <View style={styles.homeGrid}>
        {[
          { icon: "📖", label: "القرآن الكريم", sub: "سورة الفاتحة", tab: "quran" },
          { icon: "📿", label: "المسبحة", sub: "عداد التسبيح", tab: "tasbeeh" },
          { icon: "🧭", label: "اتجاه القبلة", sub: "مكة المكرمة", tab: "qibla" },
          { icon: "🤲", label: "الأذكار والسنن", sub: "أذكار الصباح", tab: "azkar" },
        ].map((c) => (
          <TouchableOpacity
            key={c.label} activeOpacity={0.85}
            onPress={() => setActiveTab(c.tab)}
            style={[styles.homeGridCard, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}
          >
            <Text style={styles.homeGridIcon}>{c.icon}</Text>
            <Text style={styles.homeGridLabel}>{c.label}</Text>
            <Text style={styles.homeGridSub}>{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily progress */}
      <Card T={T} title="📊 إنجاز اليوم">
        <PBar T={T} label="أذكار الصباح" pct={75} />
        <PBar T={T} label="أذكار المساء" pct={30} color="#3b82f6" />
        <PBar T={T} label="السنن اليومية" pct={50} color="#f59e0b" />
      </Card>

      {/* Next prayer alert — REAL countdown, no hardcoded string */}
      <Card T={T} title={`⏰ اقتربت صلاة ${countdown.label}`}>
        <Text style={styles.nextPrayerSub}>متبقي {nextPrayerMinutesLeft} دقيقة</Text>
        <TouchableOpacity
          style={[styles.nextPrayerBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
          onPress={() => sendNotif(`🔔 اقتربت صلاة ${countdown.label}، استعد!`)}
        >
          <Text style={[styles.nextPrayerBtnText, { color: T.accent }]}>🔔 تذكيرني قبل 15 دقيقة</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

// ─── QURAN SCREEN ─────────────────────────────────────────────────────────────
function QuranScreen({
  T, fontSize, searchQuery, setSearchQuery,
  currentAyah, setCurrentAyah, audioPlaying, setAudioPlaying,
  bookmark, setBookmark, onWordPress, onWordLong, audioLoadingAyah,
}) {
  const timerRef = useRef(null);
  const tap = (w) => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onWordLong(w);
    }, 600);
  };
  const release = (w) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onWordPress(w);
    }
  };
  const filtered = searchQuery ? FATIHA.filter((a) => a.text.includes(searchQuery)) : FATIHA;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.quranHeader, { borderBottomColor: T.cardBorder }]}>
        <Text style={styles.quranHeaderTitle}>سورة الفاتحة</Text>
        <Text style={styles.quranHeaderSub}>7 آيات — مكية — الجزء 1</Text>
      </View>

      <View style={[styles.quranSearchRow, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
        <Text style={styles.quranSearchIcon}>🔍</Text>
        <TextInput
          style={styles.quranSearchInput}
          placeholder="ابحث في القرآن الكريم..."
          placeholderTextColor="#555"
          textAlign="right"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.quranSearchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.quranBookmarkRow}>
        <TouchableOpacity
          style={[styles.quranBookmarkBtn, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}
          onPress={() => setBookmark(currentAyah + 1)}
        >
          <Text style={styles.quranBookmarkBtnText}>🔖 حفظ موضع القراءة</Text>
        </TouchableOpacity>
      </View>
      {bookmark ? <Text style={[styles.quranBookmarkSaved, { color: T.accent }]}>✅ تم حفظ الآية {bookmark}</Text> : null}

      <ScrollView style={{ flex: 1 }}>
        <View style={[styles.ayahsBox, { borderColor: T.cardBorder }]}>
          <Text style={styles.basmalah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
          {filtered.map((ayah, idx) => (
            <View
              key={ayah.id}
              style={[styles.ayahRow, { backgroundColor: currentAyah === idx ? `${T.accent}0d` : "transparent" }]}
            >
              {bookmark === ayah.id && (
                <View style={styles.ribbonWrap}>
                  <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.ribbonBody} />
                  <View style={styles.ribbonTriangle} />
                </View>
              )}
              <View style={[styles.ayahNumCircle, { backgroundColor: T.ayahNumBg }]}>
                <Text style={[styles.ayahNumText, { color: T.ayahNumColor }]}>{ayah.id}</Text>
              </View>
              <View style={styles.ayahWordsWrap}>
                {ayah.words.map((w, wi) => (
                  <TouchableOpacity
                    key={wi} activeOpacity={0.6}
                    onPressIn={() => tap(w)}
                    onPressOut={() => release(w)}
                  >
                    <Text style={[styles.ayahWord, { fontSize }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.ayahHint}>اضغط على كلمة لسماعها • اضغط مطولاً للتفسير والضبط</Text>
        </View>
      </ScrollView>

      {/* Audio player */}
      <View style={[styles.audioPlayer, { borderColor: T.cardBorder }]}>
        <TouchableOpacity style={styles.audioBtnSmall} onPress={() => setCurrentAyah((p) => Math.max(0, p - 1))}>
          <Text style={styles.audioBtnSmallText}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.audioBtnMain, { backgroundColor: audioPlaying ? "#ef4444" : T.accent }]}
          onPress={() => setAudioPlaying((p) => !p)}
        >
          <Text style={styles.audioBtnMainText}>{audioLoadingAyah ? "⏳" : audioPlaying ? "⏸" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.audioBtnSmall} onPress={() => setCurrentAyah((p) => Math.min(FATIHA.length - 1, p + 1))}>
          <Text style={styles.audioBtnSmallText}>⏭</Text>
        </TouchableOpacity>
        <View style={styles.audioProgressWrap}>
          <Text style={styles.audioProgressLabel}>الآية {currentAyah + 1} من {FATIHA.length}</Text>
          <View style={styles.audioProgressTrack}>
            <View style={[styles.audioProgressFill, { backgroundColor: T.accent, width: `${((currentAyah + 1) / FATIHA.length) * 100}%` }]} />
          </View>
        </View>
        <Text style={[styles.audioStatus, { color: audioPlaying ? T.accent : "#444" }]}>
          {audioLoadingAyah ? "⏳ تحميل" : audioPlaying ? "🔊 يشتغل" : "⏸ موقوف"}
        </Text>
      </View>
    </View>
  );
}

// ─── TASBEEH SCREEN ───────────────────────────────────────────────────────────
function TasbeehScreen({ T, count, onTap, onReset, shake, flash, floatTasbeehW, setFloatTasbeehW, floatW, setFloatW, notifW, setNotifW, sendNotif }) {
  const ring = count % 100;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: shake ? 0.93 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [shake]);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📿 المسبحة الإلكترونية" T={T} />
      <View style={styles.tasbeehCenter}>
        <Text style={styles.tasbeehStage}>
          {count < 33 ? "— سبحان الله —" : count < 66 ? "— الحمد لله —" : count < 100 ? "— الله أكبر —" : "🎉 اكتملت المئة!"}
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.9} onPress={onTap}
            style={[styles.tasbeehBtn, { borderColor: flash ? T.accent : "#222", backgroundColor: flash ? T.accentSoft : "#090909" }]}
          >
            <Text style={[styles.tasbeehCount, { color: flash ? T.accent : "#fff" }]}>{count}</Text>
            <Text style={styles.tasbeehTapHint}>اضغط للعد</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.tasbeehRingWrap}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle cx={70} cy={70} r={radius} stroke="#111" strokeWidth={10} fill="none" />
            <Circle cx={70} cy={70} r={radius} stroke={T.accent} strokeWidth={10} fill="none"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - ring / 100)}`}
              strokeLinecap="round" rotation="-90" origin="70, 70"
            />
            <SvgText x={70} y={78} textAnchor="middle" fill="#ccc" fontSize={15}>{ring}/100</SvgText>
          </Svg>
        </View>
        <View style={styles.tasbeehActionsRow}>
          <Btn T={T} label="🔄 إعادة" onPress={onReset} />
          <View style={[styles.tasbeehMilestone, { backgroundColor: count >= 33 ? T.accentSoft : "#0a0a0a", borderColor: count >= 33 ? T.accent : "#222" }]}>
            <Text style={[styles.tasbeehMilestoneText, { color: count >= 33 ? T.accent : "#444" }]}>33 ✓</Text>
          </View>
          <View style={[styles.tasbeehMilestone, { backgroundColor: count >= 100 ? T.accentSoft : "#0a0a0a", borderColor: count >= 100 ? T.accent : "#222" }]}>
            <Text style={[styles.tasbeehMilestoneText, { color: count >= 100 ? T.accent : "#444" }]}>100 ✓</Text>
          </View>
        </View>
      </View>
      <Card T={T} title="خيارات متقدمة">
        <Toggle
          T={T}
          label="🫧 فقاعة التسبيح العائمة"
          sub="فقاعة كبيرة تتحرك بحرية على الشاشة — اسحبها لأي مكان، تعد بضغطة واحدة"
          value={floatTasbeehW}
          onChange={(v) => { setFloatTasbeehW(v); sendNotif(v ? "✅ فقاعة التسبيح مفعّلة — اسحبها لأي مكان" : "⏹ الفقاعة موقوفة"); }}
        />
        <Toggle
          T={T}
          label="🕌 فقاعة الفتوى العائمة"
          sub="فقاعة تفتح مستشار الفتاوى من أي مكان — تتحرك بحرية أيضاً"
          value={floatW}
          onChange={(v) => { setFloatW(v); sendNotif(v ? "✅ فقاعة الفتوى مفعّلة" : "⏹ الفقاعة موقوفة"); }}
        />
      </Card>
    </ScrollView>
  );
}

// ─── QIBLA SCREEN ─────────────────────────────────────────────────────────────
function QiblaScreen({ T, compassAngle, isAligned, qiblaAngle, locationCity, userLocation, compassSource }) {
  // Needle points toward Mecca: rotate needle by (compassAngle - qiblaAngle)
  const needleRotation = (compassAngle - qiblaAngle + 360) % 360;
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="🧭 اتجاه القبلة" sub={`مكة المكرمة — ${Math.round(qiblaAngle)}° من الشمال`} T={T} />
      <View style={styles.qiblaWrap}>
        <View style={[styles.qiblaCircle, { borderColor: isAligned ? "#22c55e" : "#222" }]}>
          <Text style={[styles.qiblaDir, styles.qiblaDirN]}>N</Text>
          <Text style={[styles.qiblaDir, styles.qiblaDirE]}>E</Text>
          <Text style={[styles.qiblaDir, styles.qiblaDirS]}>S</Text>
          <Text style={[styles.qiblaDir, styles.qiblaDirW]}>W</Text>
          <View style={[styles.qiblaNeedleWrap, { transform: [{ rotate: `${needleRotation}deg` }] }]}>
            <View style={styles.qiblaArrowUpWrap}>
              <View style={[styles.qiblaArrowUp, { borderBottomColor: isAligned ? "#22c55e" : "#ef4444" }]} />
            </View>
            <View style={styles.qiblaArrowDownWrap}>
              <View style={styles.qiblaArrowDown} />
            </View>
          </View>
          <Text style={styles.qiblaKaaba}>🕋</Text>
        </View>
        <View style={styles.qiblaStatusWrap}>
          {isAligned ? (
            <Text style={styles.qiblaAligned}>✅ أنت تواجه القبلة!</Text>
          ) : (
            <Text style={styles.qiblaNotAligned}>🔄 أدر الجهاز نحو القبلة</Text>
          )}
          <Text style={styles.qiblaAngle}>الزاوية الحالية: {Math.round(compassAngle)}° | القبلة: {Math.round(qiblaAngle)}°</Text>
          {compassSource === "simulated" ? (
            <Text style={styles.qiblaSensorNote}>⚠️ لم يتم العثور على حساس بوصلة حقيقي على هذا الجهاز — يتم عرض دوران تجريبي فقط</Text>
          ) : null}
        </View>
        <Card T={T} title="📍 الموقع الحالي" style={{ marginTop: 20, width: "100%" }}>
          <RI label="المدينة" value={locationCity || "جارٍ التحديد..."} />
          <RI label="خط العرض" value={userLocation ? `${userLocation.latitude.toFixed(4)}°` : "—"} />
          <RI label="خط الطول" value={userLocation ? `${userLocation.longitude.toFixed(4)}°` : "—"} />
          <RI label="اتجاه القبلة" value={`${Math.round(qiblaAngle)}° شمالاً`} />
        </Card>
      </View>
    </ScrollView>
  );
}

// ─── AZKAR SCREEN ─────────────────────────────────────────────────────────────
function AzkarScreen({ T, azkarTab, setAzkarTab, morningC, setMorningC, eveningC, setEveningC, sleepC, setSleepC, travelC, setTravelC, homeC, setHomeC, sunnahC, setSunnahC, decrement }) {
  const TABS = [
    { id: "morning", label: "الصباح", icon: "🌅" },
    { id: "evening", label: "المساء", icon: "🌇" },
    { id: "sleep", label: "النوم", icon: "🌙" },
    { id: "home", label: "المنزل", icon: "🏠" },
    { id: "travel", label: "السفر", icon: "✈️" },
    { id: "sunnah", label: "السنن", icon: "✨" },
  ];
  const dataMap = {
    morning: [MORNING_AZKAR, morningC, setMorningC],
    evening: [EVENING_AZKAR, eveningC, setEveningC],
    sleep: [SLEEP_AZKAR, sleepC, setSleepC],
    travel: [TRAVEL_AZKAR, travelC, setTravelC],
    home: [HOME_AZKAR, homeC, setHomeC],
    sunnah: [SUNNAH_LIST, sunnahC, setSunnahC],
  };
  const [data, counts, setCounts] = dataMap[azkarTab];
  return (
    <View style={{ flex: 1 }}>
      <SH title="🤲 الأذكار والسنن" T={T} />
      <View style={[styles.azkarGridRow, { borderBottomColor: T.cardBorder }]}>
        {TABS.map((tab) => {
          const isActive = azkarTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setAzkarTab(tab.id)} style={[styles.azkarGridBtn, { backgroundColor: isActive ? T.accentSoft : "#0a0a0a", borderColor: isActive ? T.accent : "#1a1a1a" }]}>
              <Text style={{ fontSize: 18 }}>{tab.icon}</Text>
              <Text style={[styles.azkarGridText, { color: isActive ? T.accent : "#555", fontWeight: isActive ? "700" : "400" }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView style={styles.azkarListWrap}>
        {data.map((item, idx) =>
          counts[idx] > 0 ? (
            <View key={idx} style={[styles.azkarCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <Text style={[styles.azkarCardLabel, { color: T.accent }]}>{item.label}</Text>
              <Text style={styles.azkarCardText}>{item.text}</Text>
              <View style={styles.azkarCardFooter}>
                <TouchableOpacity style={[styles.azkarRecordBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]} onPress={() => decrement(counts, setCounts, idx)}>
                  <Text style={[styles.azkarRecordBtnText, { color: T.accent }]}>تسجيل ({counts[idx]})</Text>
                </TouchableOpacity>
                <View style={styles.azkarCounterCircle}>
                  <Text style={[styles.azkarCounterText, { color: T.accent }]}>{counts[idx]}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View key={idx} style={[styles.azkarCard, styles.azkarCardDone, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <Text style={[styles.azkarCardLabel, { color: T.accent }]}>{item.label}</Text>
              <Text style={styles.azkarDoneText}>✅ اكتمل</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

// ─── FATWA SCREEN (embedded in floating modal) ────────────────────────────────
function FatwaScreen({ T, chatHistory, chatInput, setChatInput, onSend, loading, embedded }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatHistory, loading]);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={[styles.fatwaChatWrap, embedded && { maxHeight: 320 }]} contentContainerStyle={{ paddingBottom: 12 }}>
        {chatHistory.map((msg, i) => (
          <View key={i} style={[styles.fatwaMsgRow, { justifyContent: msg.role === "user" ? "flex-start" : "flex-end" }]}>
            <View style={[styles.fatwaBubble, { backgroundColor: msg.role === "ai" ? T.cardBg : "#1a3a1a", borderColor: msg.role === "ai" ? T.cardBorder : "#22c55e33" }]}>
              {msg.role === "ai" ? <Text style={[styles.fatwaAiLabel, { color: T.accent }]}>🕌 مستشار الفتاوى</Text> : null}
              <Text style={styles.fatwaMsgText}>{msg.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.fatwaMsgRow, { justifyContent: "flex-end" }]}>
            <View style={[styles.fatwaTypingBubble, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <View style={styles.fatwaTypingRow}>
                {[0, 1, 2].map((i) => (<View key={i} style={[styles.fatwaTypingDot, { backgroundColor: T.accent }]} />))}
                <Text style={styles.fatwaTypingText}>يكتب...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.fatwaChipsRow, { backgroundColor: T.cardBg, borderTopColor: T.cardBorder }]} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
        {FATWA_QA.slice(0, 3).map((q, i) => (
          <TouchableOpacity key={i} style={[styles.fatwaChip, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]} onPress={() => { setChatInput(q.q); setTimeout(() => onSend(), 50); }}>
            <Text style={[styles.fatwaChipText, { color: T.accent }]}>{q.q.slice(0, 20)}...</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={[styles.fatwaInputRow, { backgroundColor: T.cardBg, borderTopColor: T.cardBorder }]}>
        <TextInput
          style={[styles.fatwaInput, { borderColor: T.cardBorder }]}
          placeholder="اسأل سؤالاً فقهياً..."
          placeholderTextColor="#555"
          textAlign="right"
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity style={[styles.fatwaSendBtn, { backgroundColor: T.accent }]} onPress={onSend}>
          <Text style={styles.fatwaSendBtnText}>←</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STATS SCREEN ─────────────────────────────────────────────────────────────
function StatsScreen({
  T, weeklyStats, totalReadingHours, ayahsReadTotal, streakCount, tasbeehTotal,
  achievementFatihaDone, achievement33Done, achievement100Done, achievementStreak7Done,
  achievementFullQuranDone, achievementKahf,
}) {
  const maxMins = Math.max(1, ...weeklyStats.map((d) => d.mins));
  const maxAyahs = Math.max(1, ...weeklyStats.map((d) => d.ayahs));
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📊 إحصاءات القراءة" sub="هذا الأسبوع" T={T} />
      <View style={styles.statsGrid}>
        {[
          { icon: "⏱️", val: totalReadingHours, unit: "ساعة", label: "إجمالي القراءة", color: T.accent },
          { icon: "📖", val: String(ayahsReadTotal), unit: "آية", label: "آيات مقروءة", color: "#3b82f6" },
          { icon: "🔥", val: String(streakCount), unit: "أيام", label: "أيام متتالية", color: "#f59e0b" },
          { icon: "📿", val: String(tasbeehTotal), unit: "تسبيحة", label: "إجمالي التسبيح", color: "#8b5cf6" },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { borderColor: `${s.color}33` }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={[styles.statUnit, { color: s.color }]}>{s.unit}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Card T={T} title="دقائق القراءة اليومية">
        <View style={styles.barsRow}>
          {weeklyStats.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: T.accent }]}>{d.mins}</Text>
              <View style={[styles.barFill, { height: Math.max(2, (d.mins / maxMins) * 82), backgroundColor: T.accentSoft, borderTopColor: T.accent }]} />
              <Text style={styles.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card T={T} title="آيات مقروءة يومياً">
        <View style={[styles.barsRow, { height: 80 }]}>
          {weeklyStats.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: "#3b82f6" }]}>{d.ayahs}</Text>
              <View style={[styles.barFill, { height: Math.max(2, (d.ayahs / maxAyahs) * 66), backgroundColor: "#3b82f61a", borderTopColor: "#3b82f6" }]} />
              <Text style={styles.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card T={T} title="🏆 الإنجازات">
        {[
          { icon: "🌟", label: "حافظ الفاتحة", done: achievementFatihaDone, desc: "قرأت سورة الفاتحة كاملة" },
          { icon: "📿", label: "100 تسبيحة", done: achievement100Done, desc: "سبّحت 100 مرة (إجمالي)" },
          { icon: "🔥", label: "7 أيام متتالية", done: achievementStreak7Done, desc: "استخدمت التطبيق 7 أيام متتالية" },
          { icon: "📖", label: "ختمة كاملة", done: achievementFullQuranDone, desc: "اقرأ القرآن كاملاً (متاح قريباً)" },
          { icon: "🕮", label: "سورة الكهف يوم الجمعة", done: achievementKahf, desc: "أكملت قراءة الكهف من قائمة السنن" },
        ].map((a, i) => (
          <View key={i} style={[styles.achievementRow, { backgroundColor: a.done ? "#0a1a0a" : "#0a0a0a", borderColor: a.done ? "#22c55e22" : "#111", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 }]}>
            <Text style={[styles.achievementIcon, { fontSize: 26 }]}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.achievementLabel, { color: a.done ? "#e2e8f0" : "#444", fontWeight: "700" }]}>{a.label}</Text>
              <Text style={{ color: a.done ? "#22c55e88" : "#333", fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
            </View>
            <Text style={[styles.achievementCheck, { fontSize: 22 }]}>{a.done ? "✅" : "🔒"}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

// ─── SETTINGS SCREEN ──────────────────────────────────────────────────────────
function SettingsScreen({
  T, adFree, masterPromo, setMasterPromo, masterMsg, handleMasterPromo,
  azanOn, setAzanOn, salahOn, setSalahOn, salahInt, setSalahInt,
  preOn, setPreOn, autoAzkar, setAutoAzkar, travelOn, setTravelOn,
  fastOn, setFastOn, fastMT, setFastMT, fastWD, setFastWD,
  activeThemeId, unlockedIds, onSelect, onBuy, vipPurchased, showDonate, sendNotif,
  onOpenFatwa, floatTasbeehW, setFloatTasbeehW,
}) {
  const bubbleGlow = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(bubbleGlow, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="⚙️ الإعدادات" T={T} />

      {/* ── FLOATING FATWA BUBBLE launcher inside settings (also works as a
          true free-floating overlay everywhere when enabled from Tasbeeh
          screen's "خيارات متقدمة") ── */}
      <View style={styles.fatwaBubbleSection}>
        <Animated.View style={[styles.fatwaBubbleContainer, { opacity: bubbleGlow }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenFatwa}
            style={[styles.fatwaBubbleBtn, { backgroundColor: T.cardBg, borderColor: T.accent, shadowColor: T.accent }]}
          >
            <LinearGradient colors={["#1a0e1a", T.cardBg]} style={styles.fatwaBubbleGrad}>
              <Text style={styles.fatwaBubbleEmoji}>🕌</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fatwaBubbleTitle, { color: T.accent }]}>مستشار الفتاوى الشرعية</Text>
                <Text style={styles.fatwaBubbleSub}>اسأل أي سؤال فقهي • إجابات موثوقة</Text>
              </View>
              <View style={[styles.fatwaBubbleDot, { backgroundColor: T.accent }]} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Theme store */}
      <Card T={T} title="🎨 متجر الثيمات">
        {THEMES.map((th) => {
          const owned = unlockedIds.includes(th.id);
          const active = activeThemeId === th.id;
          return (
            <View key={th.id} style={styles.themeRow}>
              <LinearGradient colors={th.grad} style={styles.themeEmojiBox}>
                <Text style={styles.themeEmoji}>{th.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.themeName}>{th.name}</Text>
                <Text style={styles.themeDesc}>{th.desc}</Text>
              </View>
              {owned ? (
                <TouchableOpacity
                  style={[styles.themeActionBtn, { backgroundColor: active ? th.accentSoft : "#111", borderColor: active ? th.accent : "#222" }]}
                  onPress={() => onSelect(th.id)}
                >
                  <Text style={[styles.themeActionText, { color: active ? th.accent : "#666", fontWeight: active ? "700" : "400" }]}>
                    {active ? "✅ مفعّل" : "تطبيق"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.themeActionBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                  onPress={() => onBuy(th.id)}
                >
                  <Text style={[styles.themeActionText, { color: T.accent, fontWeight: "700" }]}>{th.price} 🔒</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </Card>

      {/* Promo code */}
      <Card T={T} title="🎁 كود ترويجي">
        <View style={styles.promoRow}>
          <TextInput
            style={[styles.promoInput, { borderColor: T.cardBorder }]}
            placeholder="أدخل الكود الترويجي..."
            placeholderTextColor="#555"
            textAlign="right"
            value={masterPromo}
            onChangeText={setMasterPromo}
          />
          <TouchableOpacity style={[styles.promoBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]} onPress={handleMasterPromo}>
            <Text style={[styles.promoBtnText, { color: T.accent }]}>تفعيل</Text>
          </TouchableOpacity>
        </View>
        {masterMsg ? (
          <Text style={[styles.promoMsg, { color: masterMsg.startsWith("❌") ? "#ef4444" : masterMsg.startsWith("❤️") ? "#ec4899" : "#22c55e" }]}>{masterMsg}</Text>
        ) : null}
        {adFree ? <Text style={styles.promoAdFree}>✅ الإعلانات محذوفة</Text> : null}
      </Card>

      {/* Conditional donation */}
      {showDonate && vipPurchased && (
        <Card T={T} title="">
          <TouchableOpacity onPress={() => sendNotif("❤️ جزاك الله خيراً على دعمك!")}>
            <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.donateBtn}>
              <Text style={styles.donateBtnText}>💛 دعم وتطوير التطبيق (تبرع)</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Card>
      )}

      {/* Azan & alerts */}
      <Card T={T} title="🔊 الأذان والتنبيهات الصوتية">
        <Toggle T={T} label="📡 أذان الصلوات الخمس" sub="صوت الأذان عند وقت كل صلاة" value={azanOn} onChange={setAzanOn} />
        <Toggle T={T} label="🕌 الصلاة على النبي ﷺ" sub="تنبيه صوتي دوري + اهتزاز" value={salahOn} onChange={setSalahOn} />
        {salahOn && (
          <View style={styles.salahIntWrap}>
            <Text style={styles.salahIntLabel}>كل كم دقيقة؟</Text>
            <View style={styles.salahIntRow}>
              {[15, 30, 60].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.salahIntBtn, { backgroundColor: salahInt === v ? T.accentSoft : "#111", borderColor: salahInt === v ? T.accent : "#222" }]}
                  onPress={() => { haptic.selection(); setSalahInt(v); }}
                >
                  <Text style={[styles.salahIntBtnText, { color: salahInt === v ? T.accent : "#555" }]}>{v} دقيقة</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Toggle T={T} label="⏰ تنبيه قبل الصلاة" sub="تحذير 15 دقيقة قبل كل أذان" value={preOn} onChange={setPreOn} />
        <Toggle T={T} label="🤲 أذكار تلقائية" sub="صباح 7:00 ومغرب كل يوم" value={autoAzkar} onChange={setAutoAzkar} />
        <Toggle T={T} label="🚗 مُذكِّر السفر الذكي" sub="تشغيل تلقائي عند السرعة > 40 كم/س" value={travelOn} onChange={setTravelOn} />
      </Card>

      {/* Tasbeeh bubble shortcut (mirrors the toggle on the Tasbeeh screen so
          it's discoverable from Settings too) */}
      <Card T={T} title="🫧 الفقاعات العائمة">
        <Toggle
          T={T}
          label="فقاعة التسبيح العائمة"
          sub="موجودة أيضاً في شاشة المسبحة ← خيارات متقدمة"
          value={floatTasbeehW}
          onChange={(v) => { setFloatTasbeehW(v); sendNotif(v ? "✅ فقاعة التسبيح مفعّلة" : "⏹ الفقاعة موقوفة"); }}
        />
      </Card>

      {/* Fasting */}
      <Card T={T} title="🌙 صيام النوافل والأيام البيض">
        <Toggle T={T} label="تفعيل تذكير الصيام" value={fastOn} onChange={setFastOn} />
        {fastOn && (
          <>
            <Toggle T={T} label="الإثنين والخميس" sub="تذكير أسبوعي بصيام السنة" value={fastMT} onChange={setFastMT} />
            <Toggle T={T} label="الأيام البيض 13، 14، 15" sub="تذكير شهري قمري" value={fastWD} onChange={setFastWD} />
          </>
        )}
      </Card>

      {/* App info */}
      <Card T={T} title="ℹ️ عن التطبيق">
        <RI label="الإصدار" value="3.1.0" />
        <RI label="المطور" value="فريق مُصلِّي" />
        <RI label="البيانات القرآنية" value="محققة ومعتمدة 100%" />
      </Card>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  appRoot: { flex: 1, width: "100%", maxWidth: 430, alignSelf: "center" },
  screensWrap: { flex: 1, paddingBottom: 80 },

  splashWrap: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  splashGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: "#22c55e1a", top: "28%" },
  splashEmoji: { fontSize: 72, marginBottom: 4 },
  splashTitle: { color: "#fff", fontSize: 46, fontWeight: "900", letterSpacing: 3 },
  splashSub: { color: "#666", fontSize: 15, marginTop: 6 },
  splashBarTrack: { width: 140, height: 3, backgroundColor: "#111", borderRadius: 2, marginTop: 44, overflow: "hidden" },
  splashBarFill: { height: "100%", width: "70%", backgroundColor: "#22c55e" },

  adWrap: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", position: "relative" },
  adBadge: { position: "absolute", top: 16, left: 16, backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  adBadgeText: { color: "#666", fontSize: 11 },
  adEmoji: { fontSize: 56, marginBottom: 14 },
  adTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  adSub: { color: "#666", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 260 },
  adSkip: { position: "absolute", top: 60, right: 16, backgroundColor: "#1a1a1a", borderRadius: 20, borderWidth: 1, borderColor: "#333", paddingHorizontal: 20, paddingVertical: 10 },
  adSkipText: { color: "#ccc", fontSize: 13 },

  mamaWrap: { position: "absolute", bottom: 95, left: 0, right: 0, alignItems: "center", zIndex: 200 },
  mamaBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#1a0005", borderWidth: 1, borderColor: "#e11d4860", borderRadius: 22, paddingHorizontal: 20, paddingVertical: 7 },
  mamaHeart: { fontSize: 15 },
  mamaText: { color: "#ff2d5f", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },

  toast: { position: "absolute", top: 16, left: "50%", marginLeft: -100, width: 200, alignItems: "center", backgroundColor: "#111", borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, zIndex: 1500 },
  toastText: { color: "#e2e8f0", fontSize: 13, textAlign: "center" },

  floatWidget: { alignItems: "center", justifyContent: "center", borderWidth: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 },
  floatWidgetLabel: { fontSize: 10, marginTop: 1 },
  floatWidgetEmoji: { fontSize: 22 },
  floatWidgetCount: { fontSize: 18, fontWeight: "900" },

  fatwaFloatBubble: { flex: 1, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 },

  wordPopup: { position: "absolute", top: "28%", left: "50%", marginLeft: -105, width: 210, backgroundColor: "#0d0d0d", borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", zIndex: 800 },
  wordPopupText: { color: "#f0e6d3", fontSize: 32, marginBottom: 12 },
  soundWaveRow: { flexDirection: "row", alignItems: "center", gap: 3, height: 36, marginBottom: 8 },
  soundWaveBar: { width: 3, borderRadius: 2 },
  wordPopupSub: { color: "#666", fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: "#000000aa", alignItems: "center", justifyContent: "center" },
  longModalBox: { backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 22, padding: 22, maxWidth: 340, width: "90%", maxHeight: "80%" },
  longModalWord: { color: "#f0e6d3", fontSize: 32, textAlign: "center", marginBottom: 14 },
  longModalDivider: { borderBottomWidth: 1, borderBottomColor: "#111", marginVertical: 10 },
  longModalNoData: { color: "#666", fontSize: 13, textAlign: "center" },
  longModalFontLabel: { color: "#e2e8f0", fontSize: 13, marginBottom: 8 },
  longModalFontRow: { flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  longModalFontVal: { fontSize: 14, minWidth: 40, textAlign: "center" },
  longModalHint: { color: "#888", fontSize: 12, lineHeight: 19 },
  longModalClose: { width: "100%", marginTop: 14, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  longModalCloseText: { color: "#000", fontSize: 14, fontWeight: "700" },

  purchaseOverlay: { flex: 1, backgroundColor: "#000000bb", justifyContent: "flex-end" },
  purchaseSheet: { backgroundColor: "#0d0d0d", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  purchaseHandle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  purchaseHeaderRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  purchaseEmojiBox: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  purchaseEmoji: { fontSize: 26 },
  purchaseName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  purchaseSubName: { color: "#666", fontSize: 12, marginTop: 2 },
  purchasePriceBadge: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  purchasePriceText: { fontSize: 14, fontWeight: "800" },
  purchaseDesc: { color: "#888", fontSize: 12, marginBottom: 18, lineHeight: 20 },
  vipBox: { backgroundColor: "#ffffff08", borderWidth: 1, borderColor: "#ffffff14", borderRadius: 12, padding: 14, marginBottom: 16 },
  vipBoxTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  vipBoxItem: { color: "#ccc", fontSize: 12, marginBottom: 6, lineHeight: 18 },
  purchaseBuyBtn: { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 14 },
  purchaseBuyBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  purchasePromoSection: { borderTopWidth: 1, borderTopColor: "#1e1e1e", paddingTop: 14 },
  purchasePromoLabel: { color: "#666", fontSize: 12, marginBottom: 8 },
  purchasePromoRow: { flexDirection: "row", gap: 8 },
  purchasePromoInput: { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  purchasePromoBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, justifyContent: "center" },
  purchasePromoBtnText: { fontSize: 13, fontWeight: "700" },
  purchasePromoMsg: { fontSize: 12, marginTop: 6 },
  purchaseCancelBtn: { width: "100%", marginTop: 12, alignItems: "center" },
  purchaseCancelText: { color: "#444", fontSize: 13 },

  shWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1 },
  shTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  shSub: { color: "#555", fontSize: 12, marginTop: 3 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 12 },
  cardTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "700", marginBottom: 12 },

  pbarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pbarLabel: { color: "#888", fontSize: 12 },
  pbarPct: { fontSize: 12, fontWeight: "700" },
  pbarTrack: { height: 5, backgroundColor: "#111", borderRadius: 3 },
  pbarFill: { height: "100%", borderRadius: 3 },

  riRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  riLabel: { color: "#555", fontSize: 12 },
  riValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  toggleLabel: { color: "#e2e8f0", fontSize: 13 },
  toggleSub: { color: "#555", fontSize: 11, marginTop: 2 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleThumb: { position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },

  btn: { borderWidth: 1, borderRadius: 20 },
  btnText: { fontWeight: "600" },

  homeHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  homeHeaderGreg: { color: "#555", fontSize: 11, marginBottom: 2 },
  homeHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  homeHeaderTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  homeHeaderHijri: { fontSize: 12, textAlign: "left" },
  homeHeaderCity: { fontSize: 11, marginTop: 3 },
  dhikrBanner: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderBottomWidth: 1 },
  fastAlertText: { color: "#f59e0b", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  dhikrText: { fontSize: 14, opacity: 0.85, textAlign: "center" },
  countdownRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  countdownLabel: { color: "#666", fontSize: 12 },
  countdownVal: { fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  prayerStrip: { paddingVertical: 10, borderBottomWidth: 1 },
  prayerChip: { alignItems: "center", gap: 2, minWidth: 60, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  prayerChipName: { fontSize: 12, color: "#e2e8f0" },
  prayerChipTime: { fontSize: 13, fontWeight: "700" },
  bookmarkCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bookmarkLabel: { color: "#666", fontSize: 11 },
  bookmarkValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  bookmarkBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  bookmarkBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  homeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  homeGridCard: { width: "47%", borderWidth: 1, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 12, alignItems: "center", gap: 7 },
  homeGridIcon: { fontSize: 34 },
  homeGridLabel: { fontSize: 14, color: "#e2e8f0", fontWeight: "700" },
  homeGridSub: { fontSize: 11, color: "#555" },
  nextPrayerSub: { color: "#666", fontSize: 13 },
  nextPrayerBtn: { marginTop: 10, borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, alignSelf: "flex-start" },
  nextPrayerBtnText: { fontSize: 13, fontWeight: "700" },

  quranHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  quranHeaderTitle: { color: "#fff", fontSize: 21, fontWeight: "800" },
  quranHeaderSub: { color: "#555", fontSize: 12 },
  quranSearchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 22, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 8 },
  quranSearchIcon: { color: "#555", fontSize: 15 },
  quranSearchInput: { flex: 1, color: "#e2e8f0", fontSize: 14, padding: 0 },
  quranSearchClear: { color: "#555", fontSize: 14 },
  quranBookmarkRow: { alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 8 },
  quranBookmarkBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  quranBookmarkBtnText: { color: "#e2e8f0", fontSize: 12 },
  quranBookmarkSaved: { fontSize: 12, textAlign: "center", marginBottom: 6 },
  ayahsBox: { backgroundColor: "#030303", borderWidth: 1, borderRadius: 18, marginHorizontal: 16, marginBottom: 12, padding: 16 },
  basmalah: { textAlign: "center", color: "#f59e0b", fontSize: 14, marginBottom: 16, letterSpacing: 3 },
  ayahRow: { position: "relative", flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#0d0d0d", borderRadius: 8 },
  ribbonWrap: { position: "absolute", top: -2, right: -4, width: 18, height: 36, zIndex: 2 },
  ribbonBody: { width: 18, height: 30, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  ribbonTriangle: { width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#030303" },
  ayahNumCircle: { minWidth: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  ayahNumText: { fontSize: 12 },
  ayahWordsWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  ayahWord: { color: "#f0e6d3", paddingHorizontal: 5, paddingVertical: 2, lineHeight: 48 },
  ayahHint: { textAlign: "center", color: "#333", fontSize: 11, marginTop: 14 },
  audioPlayer: { backgroundColor: "#050505", borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  audioBtnSmall: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  audioBtnSmallText: { color: "#ccc", fontSize: 15 },
  audioBtnMain: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  audioBtnMainText: { color: "#000", fontSize: 20, fontWeight: "800" },
  audioProgressWrap: { flex: 1, marginRight: 8 },
  audioProgressLabel: { color: "#888", fontSize: 11, marginBottom: 4 },
  audioProgressTrack: { height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  audioProgressFill: { height: "100%", borderRadius: 2 },
  audioStatus: { fontSize: 10 },

  tasbeehCenter: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 0 },
  tasbeehStage: { color: "#555", fontSize: 14, marginBottom: 20 },
  tasbeehBtn: { width: 186, height: 186, borderRadius: 93, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  tasbeehCount: { fontSize: 58, fontWeight: "900" },
  tasbeehTapHint: { fontSize: 12, color: "#444", marginTop: 4 },
  tasbeehRingWrap: { marginTop: 22, alignItems: "center" },
  tasbeehActionsRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" },
  tasbeehMilestone: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tasbeehMilestoneText: { fontSize: 12 },

  qiblaWrap: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16 },
  qiblaCircle: { width: 240, height: 240, borderRadius: 120, borderWidth: 4, backgroundColor: "#050505", alignItems: "center", justifyContent: "center", position: "relative" },
  qiblaDir: { position: "absolute", color: "#333", fontSize: 12, fontWeight: "700" },
  qiblaDirN: { top: 10, left: "50%", marginLeft: -6 },
  qiblaDirE: { right: 10, top: "50%", marginTop: -8 },
  qiblaDirS: { bottom: 10, left: "50%", marginLeft: -6 },
  qiblaDirW: { left: 10, top: "50%", marginTop: -8 },
  qiblaNeedleWrap: { position: "absolute", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  qiblaArrowUpWrap: { position: "absolute", top: 18, alignItems: "center" },
  qiblaArrowUp: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 72, borderLeftColor: "transparent", borderRightColor: "transparent" },
  qiblaArrowDownWrap: { position: "absolute", bottom: 18, alignItems: "center" },
  qiblaArrowDown: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 72, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#333" },
  qiblaKaaba: { fontSize: 38, zIndex: 2 },
  qiblaStatusWrap: { marginTop: 26, alignItems: "center" },
  qiblaAligned: { color: "#22c55e", fontSize: 20, fontWeight: "800" },
  qiblaNotAligned: { color: "#ef4444", fontSize: 16 },
  qiblaAngle: { color: "#444", fontSize: 13, marginTop: 8, textAlign: "center" },
  qiblaSensorNote: { color: "#f59e0b", fontSize: 11, marginTop: 10, textAlign: "center", maxWidth: 260, lineHeight: 17 },

  azkarTabsRow: { paddingVertical: 8, borderBottomWidth: 1 },
  azkarTabBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  azkarTabText: { fontSize: 12 },
  azkarGridRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  azkarGridBtn: { width: "30%", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 10, gap: 4 },
  azkarGridText: { fontSize: 11 },
  azkarListWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 80 },
  azkarCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  azkarCardDone: { opacity: 0.35 },
  azkarCardLabel: { fontSize: 11, marginBottom: 8, fontWeight: "700" },
  azkarCardText: { color: "#e2e8f0", fontSize: 16, lineHeight: 30 },
  azkarCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  azkarRecordBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  azkarRecordBtnText: { fontSize: 12 },
  azkarCounterCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  azkarCounterText: { fontSize: 13, fontWeight: "700" },
  azkarDoneText: { color: "#22c55e", fontSize: 12, marginTop: 4 },

  // Floating Fatwa Modal
  fatwaModalOverlay: { flex: 1, backgroundColor: "#000000bb", justifyContent: "flex-end" },
  fatwaModalSheet: { borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 30, maxHeight: "88%", flex: 0.88 },
  fatwaModalHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  fatwaModalIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fatwaModalTitle: { fontSize: 15, fontWeight: "800" },
  fatwaModalSub: { color: "#555", fontSize: 11, marginTop: 2 },
  fatwaModalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  fatwaModalCloseText: { color: "#888", fontSize: 14 },

  // Fatwa Bubble in Settings
  fatwaBubbleSection: { marginHorizontal: 16, marginVertical: 14 },
  fatwaBubbleContainer: { borderRadius: 20, overflow: "hidden" },
  fatwaBubbleBtn: {
    borderWidth: 1.5, borderRadius: 20,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
    elevation: 8, overflow: "hidden",
  },
  fatwaBubbleGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 19 },
  fatwaBubbleEmoji: { fontSize: 28 },
  fatwaBubbleTitle: { fontSize: 14, fontWeight: "800" },
  fatwaBubbleSub: { color: "#666", fontSize: 11, marginTop: 2 },
  fatwaBubbleDot: { width: 9, height: 9, borderRadius: 5 },

  fatwaChatWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  fatwaMsgRow: { flexDirection: "row", marginBottom: 10 },
  fatwaBubble: { maxWidth: "82%", borderWidth: 1, borderRadius: 16, padding: 12 },
  fatwaAiLabel: { fontSize: 10, marginBottom: 5, fontWeight: "700" },
  fatwaMsgText: { color: "#e2e8f0", fontSize: 13, lineHeight: 22 },
  fatwaTypingBubble: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  fatwaTypingRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  fatwaTypingDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  fatwaTypingText: { color: "#666", fontSize: 11, marginRight: 6 },
  fatwaChipsRow: { paddingVertical: 6, borderTopWidth: 1 },
  fatwaChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  fatwaChipText: { fontSize: 11 },
  fatwaInputRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, alignItems: "center" },
  fatwaInput: { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  fatwaSendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  fatwaSendBtnText: { color: "#000", fontSize: 18, fontWeight: "800" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  statBox: { width: "47%", backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  statIcon: { fontSize: 22 },
  statVal: { fontSize: 24, fontWeight: "900" },
  statUnit: { fontSize: 10 },
  statLabel: { fontSize: 11, color: "#555", marginTop: 2, textAlign: "center" },
  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100 },
  barCol: { flex: 1, alignItems: "center", gap: 3 },
  barVal: { fontSize: 9 },
  barFill: { width: "100%", borderRadius: 3, borderTopWidth: 2 },
  barDay: { fontSize: 9, color: "#444" },
  achievementRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  achievementIcon: { fontSize: 20 },
  achievementLabel: { flex: 1, fontSize: 13 },
  achievementCheck: { fontSize: 16 },

  themeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  themeEmojiBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  themeEmoji: { fontSize: 20 },
  themeName: { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },
  themeDesc: { color: "#555", fontSize: 11, marginTop: 1 },
  themeActionBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  themeActionText: { fontSize: 11 },
  promoRow: { flexDirection: "row", gap: 8 },
  promoInput: { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  promoBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, justifyContent: "center" },
  promoBtnText: { fontSize: 13, fontWeight: "700" },
  promoMsg: { fontSize: 12, marginTop: 8 },
  promoAdFree: { color: "#22c55e", fontSize: 12, marginTop: 8 },
  donateBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  donateBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  salahIntWrap: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  salahIntLabel: { color: "#888", fontSize: 12, marginBottom: 8 },
  salahIntRow: { flexDirection: "row", gap: 8 },
  salahIntBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center" },
  salahIntBtnText: { fontSize: 12 },

  bottomAd: { backgroundColor: "#080808", borderTopWidth: 1, borderTopColor: "#111", paddingVertical: 7, alignItems: "center", position: "absolute", bottom: 82, left: 0, right: 0, zIndex: 90 },
  bottomAdText: { color: "#333", fontSize: 11 },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 100, paddingTop: 10, paddingBottom: 24 },
  bottomNavContent: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4 },
  navTabBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navTabIconWrap: { alignItems: "center", justifyContent: "center", minWidth: 36, height: 32 },
  navTabIcon: { fontSize: 20 },
  navTabLabel: { fontSize: 9, marginTop: 1, letterSpacing: 0.3 },
  navTabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});
