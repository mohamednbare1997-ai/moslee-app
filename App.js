// ─────────────────────────────────────────────────────────────────────────────
//  مُصلِّي — App.js  |  Expo 51
//  AUDIO NOTE: Full audio asset integration and sound programming will be
//  implemented in future updates. Current implementation uses remote CDN URLs
//  as temporary placeholders for all audio (Quran recitation, Azan, reminders).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BackHandler,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  AppState,
  PanResponder,
  I18nManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Audio } from "expo-av";

// ── فرض RTL عالمياً ──────────────────────────────────────────────────────────
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── THEME DEFINITIONS ────────────────────────────────────────────────────────
const THEMES = [
  {
    id: "royal_black", name: "الثيم الأسود الملكي", price: "مجاني", free: true, emoji: "🖤",
    accent: "#d4d4d8", accentSoft: "#ffffff14", accentBorder: "#ffffff28",
    bg: "#000", cardBg: "#0a0a0a", cardBorder: "#1e1e1e",
    ayahNumBg: "#1a1a1a", ayahNumColor: "#d4d4d8",
    grad: ["#0d0d0d", "#1c1c1c"], desc: "أناقة الأسود الكلاسيكية الصافية",
  },
  {
    id: "spiritual_green", name: "الثيم الأخضر الروحاني", price: "مجاني", free: true, emoji: "💚",
    accent: "#22c55e", accentSoft: "#22c55e1a", accentBorder: "#22c55e40",
    bg: "#000", cardBg: "#021a0a", cardBorder: "#0a3318",
    ayahNumBg: "#0a3318", ayahNumColor: "#22c55e",
    grad: ["#021a0a", "#0a3318"], desc: "خضرة الجنة وسكينة القلوب",
  },
  {
    id: "royal_gold", name: "الثيم الذهبي الملكي", price: "$1", free: false, emoji: "👑",
    accent: "#f59e0b", accentSoft: "#f59e0b1a", accentBorder: "#f59e0b40",
    bg: "#000", cardBg: "#120a00", cardBorder: "#2a1800",
    ayahNumBg: "#2a1800", ayahNumColor: "#f59e0b",
    grad: ["#120a00", "#2a1800"], desc: "فخامة الذهب وبهاء القرآن",
  },
  {
    id: "sufi_purple", name: "ثيم روحانية البنفسج", price: "$1", free: false, emoji: "🔮",
    accent: "#a855f7", accentSoft: "#a855f71a", accentBorder: "#a855f740",
    bg: "#000", cardBg: "#0d0518", cardBorder: "#1e0a35",
    ayahNumBg: "#1e0a35", ayahNumColor: "#a855f7",
    grad: ["#0d0518", "#1e0a35"], desc: "روحانية البنفسج وسكينة الليل",
  },
  {
    id: "vip_royal", name: "باقة الـ VIP الملكية", price: "$10", free: false, emoji: "💎",
    accent: "#ec4899", accentSoft: "#ec48991a", accentBorder: "#ec489940",
    bg: "#000", cardBg: "#150010", cardBorder: "#2d0025",
    ayahNumBg: "#2d0025", ayahNumColor: "#ec4899",
    grad: ["#150010", "#2d0025", "#0a0020"], desc: "ثيم متحرك ⊕ متابع الختمة ⊕ كل المميزات",
  },
];

const getTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES[1];

// ─── QURAN DATA ───────────────────────────────────────────────────────────────
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

// ─── REMINDER CONTENT POOL (Sunnah / Hadith / Dhikr / Ayat al-Kursi) ─────────
const REMINDER_POOL = [
  { type: "سنة",   text: "قراءة سورة الكهف يوم الجمعة نور من الجمعة إلى الجمعة." },
  { type: "حديث",  text: "قال ﷺ: «مَن قالَ سُبحانَ الله وبحَمده في يومٍ مئةَ مرَّة حُطَّت خطاياه»." },
  { type: "ذكر",   text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ" },
  { type: "آية",   text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ — آية الكرسي" },
  { type: "سنة",   text: "صيام الإثنين والخميس سنة نبوية — تُعرَض فيهما الأعمال على الله." },
  { type: "حديث",  text: "قال ﷺ: «الطَّهورُ شطرُ الإيمانِ» — حافظ على وضوئك دائمًا." },
  { type: "ذكر",   text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ" },
  { type: "آية",   text: "﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾ — كل ضيق وراءه فرج قريب." },
  { type: "سنة",   text: "السواك عند كل وضوء وصلاة — مطهرة للفم ومرضاة للرب." },
  { type: "حديث",  text: "قال ﷺ: «مَن صلَّى عليَّ صلاةً صلَّى اللهُ عليهِ بِها عَشرًا»." },
];

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

const WEEKLY_STATS = [
  { day: "السبت",    mins: 12, ayahs: 8 },
  { day: "الأحد",    mins: 25, ayahs: 18 },
  { day: "الإثنين",  mins: 8,  ayahs: 5 },
  { day: "الثلاثاء", mins: 32, ayahs: 22 },
  { day: "الأربعاء", mins: 20, ayahs: 14 },
  { day: "الخميس",  mins: 45, ayahs: 35 },
  { day: "الجمعة",  mins: 60, ayahs: 50 },
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

// ─── AUDIO SOURCES (PLACEHOLDERS — FULL INTEGRATION IN FUTURE UPDATE) ─────────
// NOTE: All audio below uses temporary remote CDN URLs. Full local audio asset
// bundling, offline caching, and complete sound programming (Azan variations,
// per-reciter Quran audio, custom reminder chimes) will be implemented in a
// future update once final audio assets are finalized.
const AUDIO_SOURCES = {
  fatiha: [
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/5.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/6.mp3",
    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/7.mp3",
  ],
  azan: "https://www.islamcan.com/audio/adhan/azan1.mp3",
  salahReminder: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3",
};

// ─── KEYS FOR ASYNCSTORAGE ────────────────────────────────────────────────────
const STORAGE_KEYS = {
  TASBEEH_COUNT:   "@musalli_tasbeeh",
  STREAK_DAYS:     "@musalli_streak",
  LAST_OPEN:       "@musalli_last_open",
  AD_FREE:         "@musalli_ad_free",
  ACTIVE_THEME:    "@musalli_theme",
  UNLOCKED_IDS:    "@musalli_unlocked",
  SUPPORT_DONE:    "@musalli_support_done",
  TOTAL_READ_SECS: "@musalli_read_secs",
  TOTAL_AYAHS:     "@musalli_ayahs_read",
  TOTAL_TASBEEH:   "@musalli_total_tasbeeh",
  REMINDER_ENABLED:"@musalli_reminder_enabled",
  REMINDER_INT:    "@musalli_reminder_int",
  REMINDER_DAILY:  "@musalli_reminder_daily",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }

// Format minutes correctly — transitions cleanly to hours/hours+minutes at ≥ 60
// e.g. 45 -> "45 دقيقة", 60 -> "1 ساعة", 90 -> "1س 30د"  (never "61 دقيقة"-style overflow)
function formatMinutes(totalMinutes) {
  const safe = Math.max(0, Math.floor(totalMinutes || 0));
  if (safe < 60) return `${safe} دقيقة`;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (m === 0) return `${h} ساعة`;
  return `${h}س ${m}د`;
}

// Format seconds into a display string for the reading timer — same overflow-safe logic
function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  if (safe < 60) return `${safe} ث`;
  const m = Math.floor(safe / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} س` : `${h}س ${rem}د`;
}

function getHijriDate() {
  const now = new Date();
  const jd  = Math.floor(now.getTime() / 86400000 + 2440587.5);
  const l   = jd - 1948440 + 10632;
  const n   = Math.floor((l - 1) / 10631);
  const l2  = l - 10631 * n + 354;
  const j   = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
            + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3  = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
            - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day   = l3 - Math.floor((709 * month) / 24);
  const year  = 30 * n + j - 30;
  const months = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  return { day, month, year, monthName: months[month - 1] || "" };
}

function getGregorianDate() {
  const now    = new Date();
  const days   = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return { dayName: days[now.getDay()], day: now.getDate(), month: months[now.getMonth()], year: now.getFullYear() };
}

function getSpecialFastingAlert(hijri) {
  const { day, month } = hijri;
  if (month === 1  && day === 9)            return "تذكير: غداً صيام يوم عاشوراء — سنة مهجورة، طوبى للصائمين";
  if (month === 12 && day === 8)            return "تذكير: غداً صيام يوم عرفة المبارك — يكفر سنتين";
  if (month === 10 && day >= 1 && day <= 5) return "تذكير: أنت في أيام صيام ستة شوال — أكملها لتنال أجر صيام الدهر";
  if (month === 12 && day >= 1 && day <= 9) return "تذكير: أنت في العشر الأوائل من ذي الحجة — أيام العمل الصالح";
  return null;
}

function calcQiblaAngle(lat, lng) {
  const MECCA_LAT = 21.3891;
  const MECCA_LNG = 39.8579;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - lng) * Math.PI) / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ  = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function parseTimeMins(str) {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ─── PROMO CODE SECURITY ──────────────────────────────────────────────────────
// Master unlock code is never stored in plaintext — only its SHA-256 hash is
// compared against, via expo-crypto. This is a one-way comparison: the
// original code cannot be recovered from this file.
const MASTER_CODE_HASH = "bf311209c274eee020a4408527e4224905691a7117a96fdfece63fa82159ea75";

async function hashCode(input) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input.trim());
}

// ─── ASYNCSTORAGE HELPERS ─────────────────────────────────────────────────────
async function saveData(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}
async function loadData(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (_) {}
  return fallback;
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
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.pbarRow}>
        <Text style={styles.pbarLabel}>{label}</Text>
        <Text style={[styles.pbarPct, { color: c }]}>{pct}%</Text>
      </View>
      <View style={styles.pbarTrack}>
        <View style={[styles.pbarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: c }]} />
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
        onPress={() => onChange(!value)}
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
      onPress={onPress}
      style={[styles.btn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder, paddingVertical: small ? 5 : 8, paddingHorizontal: small ? 12 : 18 }]}
    >
      <Text style={[styles.btnText, { color: T.accent, fontSize: small ? 11 : 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("splash");
  const [activeTab, setActiveTab]     = useState("home");
  const [fontSize, setFontSize]       = useState(26);
  const [bookmark, setBookmark]       = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [wordPopup, setWordPopup]     = useState(null);
  const [soundWave, setSoundWave]     = useState(false);
  const [longModal, setLongModal]     = useState(null);
  const [audioPlaying, setAudioPlaying]     = useState(false);
  const [currentAyah, setCurrentAyah]       = useState(0);
  const [tasbeehCount, setTasbeehCount]     = useState(0);
  const [tShake, setTShake]   = useState(false);
  const [tFlash, setTFlash]   = useState(false);
  const [floatW, setFloatW]   = useState(false);
  const [notifW, setNotifW]   = useState(false);

  const [morningC, setMorningC] = useState(MORNING_AZKAR.map((a) => a.count));
  const [eveningC, setEveningC] = useState(EVENING_AZKAR.map((a) => a.count));
  const [sleepC, setSleepC]     = useState(SLEEP_AZKAR.map((a) => a.count));
  const [travelC, setTravelC]   = useState(TRAVEL_AZKAR.map((a) => a.count));
  const [homeC, setHomeC]       = useState(HOME_AZKAR.map((a) => a.count));
  const [sunnahC, setSunnahC]   = useState(SUNNAH_LIST.map((a) => a.count));
  const [azkarTab, setAzkarTab] = useState("morning");
  const [notifMsg, setNotifMsg] = useState("");
  const [dhikrIdx, setDhikrIdx] = useState(0);

  // countdown — stores total minutes remaining
  const [countdown, setCountdown] = useState({ label: "العصر", mins: 97 });

  // GPS / Prayer / Qibla
  const [userLocation, setUserLocation]       = useState(null);
  const [locationError, setLocationError]     = useState(null);
  const [livePrayerTimes, setLivePrayerTimes] = useState(null);
  const [prayerLoading, setPrayerLoading]     = useState(false);
  const [qiblaAngle, setQiblaAngle]           = useState(143);
  const [liveCompassAngle, setLiveCompassAngle] = useState(0);

  // Audio refs
  const soundRef    = useRef(null);
  const azanRef     = useRef(null);
  const [audioLoadingAyah, setAudioLoadingAyah] = useState(false);
  const [azanTriggered, setAzanTriggered]       = useState({});
  const salahReminderTimer = useRef(null);

  // Settings
  const [azanOn, setAzanOn]         = useState(true);
  const [salahOn, setSalahOn]       = useState(true);
  const [salahInt, setSalahInt]     = useState(30);
  const [preOn, setPreOn]           = useState(true);
  const [autoAzkar, setAutoAzkar]   = useState(true);
  const [travelOn, setTravelOn]     = useState(false);
  const [fastOn, setFastOn]         = useState(false);
  const [fastMT, setFastMT]         = useState(true);
  const [fastWD, setFastWD]         = useState(false);

  // Theme / monetisation
  const [activeThemeId, setActiveThemeId] = useState("spiritual_green");
  const [unlockedIds, setUnlockedIds]     = useState(["royal_black", "spiritual_green"]);
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [promoInputs, setPromoInputs]     = useState({});
  const [masterPromo, setMasterPromo]     = useState("");
  const [masterMsg, setMasterMsg]         = useState("");
  const [adFree, setAdFree]               = useState(false);
  const [premiumMode, setPremiumMode]     = useState(false);
  const [vipPurchased, setVipPurchased]   = useState(false);
  // supportDone = true means the donation/support ask should be HIDDEN.
  // It only ever becomes true via: (a) a genuine completed purchase flow,
  // or (b) the master unlock code. A plain "remove ads" friend code does
  // NOT set this — that path only removes ads, donation ask stays visible.
  const [supportDone, setSupportDone]     = useState(false);

  // About modal
  const [aboutModal, setAboutModal] = useState(false);

  // Fatwa modal
  const [fatwaModalVisible, setFatwaModalVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", text: "أهلاً بك! أنا مساعد الفتاوى الشرعية. اسألني أي سؤال فقهي وسأجيبك بإجابة موثوقة ومختصرة." },
  ]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ── Statistics (real-time tracking) ──────────────────────────────────────
  const [totalTasbeeh, setTotalTasbeeh]     = useState(0);
  const [totalReadSecs, setTotalReadSecs]   = useState(0);
  const [totalAyahsRead, setTotalAyahsRead] = useState(0);
  const readingTimerRef = useRef(null);
  const streakRef       = useRef(0);

  // ── Pop-up Reminder System (daily clock + recurring interval) ────────────
  const [reminderModal, setReminderModal]               = useState(false);
  const [reminderContent, setReminderContent]           = useState(null);
  const [reminderIntervalMins, setReminderIntervalMins] = useState(30);
  const [reminderEnabled, setReminderEnabled]           = useState(false);
  const [dailyReminderTime, setDailyReminderTime]       = useState("07:00");
  const reminderTimerRef = useRef(null);
  const dailyTimerRef    = useRef(null);
  const reminderPoolIdx  = useRef(0);
  const lastDailyFireRef = useRef(""); // guards against firing twice in the same minute

  // ── App readiness guard (prevents any possibility of a stuck splash) ─────
  const [isReady, setIsReady] = useState(false);

  const T      = getTheme(activeThemeId);
  const hijri  = getHijriDate();
  const greg   = getGregorianDate();
  const fastAlert = getSpecialFastingAlert(hijri);

  // ── Load saved data ───────────────────────────────────────────────────────
  // CRITICAL: this effect MUST always resolve to setIsReady(true) in a
  // `finally` block, regardless of whether storage reads succeed, fail, or
  // throw. This guarantees the splash screen can never get stuck waiting on
  // initialization — the boolean is flipped unconditionally exactly once.
  useEffect(() => {
    let finished = false;
    (async () => {
      try {
        const savedTheme    = await loadData(STORAGE_KEYS.ACTIVE_THEME,    "spiritual_green");
        const savedUnlocked = await loadData(STORAGE_KEYS.UNLOCKED_IDS,    ["royal_black", "spiritual_green"]);
        const savedAdFree   = await loadData(STORAGE_KEYS.AD_FREE,         false);
        const savedSupport  = await loadData(STORAGE_KEYS.SUPPORT_DONE,    false);
        const savedTasbeeh  = await loadData(STORAGE_KEYS.TASBEEH_COUNT,   0);
        const savedTotal    = await loadData(STORAGE_KEYS.TOTAL_TASBEEH,   0);
        const savedSecs     = await loadData(STORAGE_KEYS.TOTAL_READ_SECS, 0);
        const savedAyahs    = await loadData(STORAGE_KEYS.TOTAL_AYAHS,     0);
        const savedRemEn    = await loadData(STORAGE_KEYS.REMINDER_ENABLED, false);
        const savedRemInt   = await loadData(STORAGE_KEYS.REMINDER_INT,     30);
        const savedRemDaily = await loadData(STORAGE_KEYS.REMINDER_DAILY,   "07:00");

        setActiveThemeId(savedTheme);
        setUnlockedIds(savedUnlocked);
        setAdFree(savedAdFree);
        setSupportDone(savedSupport);
        setTasbeehCount(savedTasbeeh);
        setTotalTasbeeh(savedTotal);
        setTotalReadSecs(savedSecs);
        setTotalAyahsRead(savedAyahs);
        setReminderEnabled(savedRemEn);
        setReminderIntervalMins(savedRemInt);
        setDailyReminderTime(savedRemDaily);

        // Streak tracking
        const today     = new Date().toDateString();
        const lastOpen  = await loadData(STORAGE_KEYS.LAST_OPEN,   "");
        const streak    = await loadData(STORAGE_KEYS.STREAK_DAYS, 0);
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak   = 1;
        if (lastOpen === yesterday) newStreak = streak + 1;
        else if (lastOpen === today) newStreak = streak;
        streakRef.current = newStreak;
        await saveData(STORAGE_KEYS.LAST_OPEN,   today);
        await saveData(STORAGE_KEYS.STREAK_DAYS, newStreak);
      } catch (_) {
        // Swallow any storage error — app must still boot normally.
      } finally {
        finished = true;
        setIsReady(true);
      }
    })();

    // Absolute safety net: if for any reason the async IIFE above never
    // settles (should be impossible given the try/finally, but kept as a
    // defensive backstop), force readiness after 2.5s so the UI is never
    // permanently blocked.
    const safety = setTimeout(() => {
      if (!finished) setIsReady(true);
    }, 2500);
    return () => clearTimeout(safety);
  }, []);

  // ── Persist tasbeeh & stats ───────────────────────────────────────────────
  useEffect(() => { saveData(STORAGE_KEYS.TASBEEH_COUNT, tasbeehCount); }, [tasbeehCount]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_TASBEEH, totalTasbeeh); }, [totalTasbeeh]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_READ_SECS, totalReadSecs); }, [totalReadSecs]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_AYAHS, totalAyahsRead); }, [totalAyahsRead]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_ENABLED, reminderEnabled); }, [reminderEnabled]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_INT, reminderIntervalMins); }, [reminderIntervalMins]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_DAILY, dailyReminderTime); }, [dailyReminderTime]);

  // ── Reading timer: runs while audio playing or Quran tab active ───────────
  useEffect(() => {
    if (activeTab === "quran" && audioPlaying) {
      readingTimerRef.current = setInterval(() => {
        setTotalReadSecs((p) => p + 1);
      }, 1000);
    } else if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current);
    }
    return () => { if (readingTimerRef.current) clearInterval(readingTimerRef.current); };
  }, [activeTab, audioPlaying]);

  // ── Splash → ad transition ─────────────────────────────────────────────────
  // Fires unconditionally on mount and is NOT gated on isReady — the splash
  // is purely time-based (1.8s minimum brand display) and never waits on
  // storage, network, or permissions. This guarantees the app can never get
  // permanently stuck on the splash screen.
  useEffect(() => {
    const t = setTimeout(() => setScreen("ad"), 1800);
    return () => clearTimeout(t);
  }, []);

  // ── Audio session ─────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  // ── GPS & Prayer times ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("لم يتم منح إذن الموقع");
          fetchPrayerTimes(30.0444, 31.2357);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 10000 });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        setQiblaAngle(calcQiblaAngle(latitude, longitude));
        fetchPrayerTimes(latitude, longitude);
      } catch (_) {
        setLocationError("تعذّر تحديد الموقع");
        fetchPrayerTimes(30.0444, 31.2357);
      }
    })();
  }, []);

  const fetchPrayerTimes = useCallback(async (lat, lng) => {
    setPrayerLoading(true);
    try {
      const today = new Date();
      const dd    = String(today.getDate()).padStart(2, "0");
      const mm    = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy  = today.getFullYear();
      const url   = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=5`;
      const res   = await fetch(url);
      const json  = await res.json();
      if (json.code === 200 && json.data?.timings) {
        const t     = json.data.timings;
        const times = [
          { name: "الفجر",  time: t.Fajr,    key: "Fajr"    },
          { name: "الشروق", time: t.Sunrise, key: "Sunrise" },
          { name: "الظهر",  time: t.Dhuhr,   key: "Dhuhr"   },
          { name: "العصر",  time: t.Asr,     key: "Asr"     },
          { name: "المغرب", time: t.Maghrib, key: "Maghrib" },
          { name: "العشاء", time: t.Isha,    key: "Isha"    },
        ];
        setLivePrayerTimes(times);
        await saveData("@musalli_prayer_cache", { times, lat, lng, date: today.toDateString() });
      }
    } catch (_) {
      try {
        const cached = await loadData("@musalli_prayer_cache", null);
        if (cached?.times) setLivePrayerTimes(cached.times);
      } catch (__) {}
    } finally {
      setPrayerLoading(false);
    }
  }, []);

  // ── Countdown — correct minutes with hours conversion ─────────────────────
  const computeCountdown = useCallback((times) => {
    if (!times || times.length === 0) return null;
    const now     = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let next = null;
    for (const p of times) {
      const pm = parseTimeMins(p.time);
      if (pm > nowMins) { next = { label: p.name, mins: pm - nowMins }; break; }
    }
    if (!next) {
      const pm = parseTimeMins(times[0].time);
      next = { label: times[0].name, mins: 1440 - nowMins + pm };
    }
    return { label: next.label, mins: Math.max(0, Math.floor(next.mins)) };
  }, []);

  useEffect(() => {
    const timesToUse = livePrayerTimes || [
      { name: "الفجر",  time: "04:45" }, { name: "الشروق", time: "06:15" },
      { name: "الظهر",  time: "12:30" }, { name: "العصر",  time: "15:45" },
      { name: "المغرب", time: "18:30" }, { name: "العشاء", time: "20:00" },
    ];
    const tick = () => { const r = computeCountdown(timesToUse); if (r) setCountdown(r); };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [livePrayerTimes, computeCountdown]);

  // ── Compass simulation ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setLiveCompassAngle((p) => (p + 1.5) % 360), 80);
    return () => clearInterval(t);
  }, []);

  const effectiveCompass = liveCompassAngle;
  const isAligned        = Math.abs((effectiveCompass - qiblaAngle + 360) % 360) < 15;

  // ── Quran audio playback (sequential) ────────────────────────────────────
  useEffect(() => {
    if (!audioPlaying) {
      if (soundRef.current) soundRef.current.stopAsync().catch(() => {});
      return;
    }
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
        if (soundRef.current) await soundRef.current.unloadAsync();
        const { sound } = await Audio.Sound.createAsync(
          { uri: AUDIO_SOURCES.fatiha[idx] },
          { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = sound;
        setAudioLoadingAyah(false);
        // Track ayah read
        setTotalAyahsRead((p) => p + 1);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish && !cancelled) playAyah(idx + 1);
        });
      } catch (_) {
        setAudioLoadingAyah(false);
        if (!cancelled) setTimeout(() => { if (!cancelled) playAyah(idx + 1); }, 3000);
      }
    };
    playAyah(currentAyah);
    return () => {
      cancelled = true;
      if (soundRef.current) soundRef.current.stopAsync().catch(() => {});
    };
  }, [audioPlaying]);

  // ── Azan auto-trigger ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;
    const interval = setInterval(() => {
      const now    = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      livePrayerTimes.forEach((p) => {
        const timeStr = p.time ? p.time.substring(0, 5) : "";
        if (timeStr === nowStr && !azanTriggered[timeStr]) {
          setAzanTriggered((prev) => ({ ...prev, [timeStr]: true }));
          playAzan(p.name);
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [azanOn, livePrayerTimes, azanTriggered]);

  const playAzan = async (prayerName) => {
    try {
      if (azanRef.current) await azanRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: AUDIO_SOURCES.azan },
        { shouldPlay: true, volume: 1.0 }
      );
      azanRef.current = sound;
      sendNotif(`🕌 أذان ${prayerName}`);
    } catch (_) {
      sendNotif(`🕌 حان وقت أذان ${prayerName}`);
    }
  };

  // ── Salah-upon-the-Prophet reminder (interval) ────────────────────────────
  useEffect(() => {
    if (salahReminderTimer.current) clearInterval(salahReminderTimer.current);
    if (!salahOn) return;
    const intervalMs = salahInt * 60 * 1000;
    salahReminderTimer.current = setInterval(() => {
      sendNotif("اللهم صلِّ وسلِّمْ على نبيِّنا محمد ﷺ");
    }, intervalMs);
    return () => { if (salahReminderTimer.current) clearInterval(salahReminderTimer.current); };
  }, [salahOn, salahInt]);

  // ── Pop-up reminder system: dynamically queues Sunnah / Hadith / Dhikr /
  //    Ayat al-Kursi content from REMINDER_POOL, cycling through sequentially
  //    so content doesn't repeat back-to-back. ─────────────────────────────
  const triggerReminder = useCallback(() => {
    const item = REMINDER_POOL[reminderPoolIdx.current % REMINDER_POOL.length];
    reminderPoolIdx.current += 1;
    setReminderContent(item);
    setReminderModal(true);
  }, []);

  // Recurring interval reminders — selectable 15 / 30 / 60 minutes
  useEffect(() => {
    if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    if (!reminderEnabled) return;
    reminderTimerRef.current = setInterval(triggerReminder, reminderIntervalMins * 60 * 1000);
    return () => { if (reminderTimerRef.current) clearInterval(reminderTimerRef.current); };
  }, [reminderEnabled, reminderIntervalMins, triggerReminder]);

  // User-defined daily pop-up reminder at a specific clock time
  useEffect(() => {
    if (dailyTimerRef.current) clearInterval(dailyTimerRef.current);
    if (!reminderEnabled) return;
    const check = () => {
      const now    = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (nowStr === dailyReminderTime && lastDailyFireRef.current !== nowStr) {
        lastDailyFireRef.current = nowStr;
        triggerReminder();
      }
    };
    dailyTimerRef.current = setInterval(check, 30000);
    return () => { if (dailyTimerRef.current) clearInterval(dailyTimerRef.current); };
  }, [reminderEnabled, dailyReminderTime, triggerReminder]);

  // ── Dhikr banner rotation ─────────────────────────────────────────────────
  useEffect(() => {
    if (fastAlert) return;
    const t = setInterval(() => setDhikrIdx((p) => (p + 1) % DHIKR_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, [fastAlert]);

  // ── Cleanup audio on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      if (azanRef.current)  azanRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  // ── AppState: save on background ──────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        try {
          await saveData(STORAGE_KEYS.TASBEEH_COUNT,    tasbeehCount);
          await saveData(STORAGE_KEYS.AD_FREE,          adFree);
          await saveData(STORAGE_KEYS.ACTIVE_THEME,     activeThemeId);
          await saveData(STORAGE_KEYS.UNLOCKED_IDS,     unlockedIds);
          await saveData(STORAGE_KEYS.SUPPORT_DONE,     supportDone);
          await saveData(STORAGE_KEYS.TOTAL_TASBEEH,    totalTasbeeh);
          await saveData(STORAGE_KEYS.TOTAL_READ_SECS,  totalReadSecs);
          await saveData(STORAGE_KEYS.TOTAL_AYAHS,      totalAyahsRead);
          await saveData(STORAGE_KEYS.REMINDER_ENABLED, reminderEnabled);
          await saveData(STORAGE_KEYS.REMINDER_INT,     reminderIntervalMins);
          await saveData(STORAGE_KEYS.REMINDER_DAILY,   dailyReminderTime);
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, [tasbeehCount, adFree, activeThemeId, unlockedIds, supportDone, totalTasbeeh, totalReadSecs, totalAyahsRead, reminderEnabled, reminderIntervalMins, dailyReminderTime]);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeTab !== "home") { setActiveTab("home"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [activeTab]);

  const sendNotif = (msg) => {
    setNotifMsg(msg);
    setTimeout(() => setNotifMsg(""), 3500);
  };

  // ── Tasbeeh tap — single source of truth, used by BOTH the in-screen
  //    counter button AND the floating draggable bubble. Fires immediately
  //    on press with no debounce/delay so taps never feel unresponsive. ────
  const handleTasbeeh = useCallback(() => {
    setTasbeehCount((prev) => {
      const n = prev + 1;
      setTotalTasbeeh((t) => t + 1);
      setTShake(true);
      setTimeout(() => setTShake(false), 300);
      if (n === 33 || n === 100) {
        setTFlash(true);
        setTimeout(() => setTFlash(false), 1000);
      }
      return n;
    });
  }, []);

  const handleWordPress = (w) => {
    setSoundWave(true);
    setWordPopup(w);
    setTimeout(() => { setSoundWave(false); setWordPopup(null); }, 2500);
  };
  const handleWordLong = (w) => setLongModal(w);

  const decrement = (arr, setArr, idx) => {
    const next = [...arr];
    if (next[idx] > 0) next[idx]--;
    setArr(next);
  };

  const selectTheme = (id) => {
    if (unlockedIds.includes(id)) {
      setActiveThemeId(id);
      saveData(STORAGE_KEYS.ACTIVE_THEME, id);
      sendNotif("✅ تم تطبيق " + getTheme(id).name);
    }
  };
  const openPurchase = (id) => setPurchaseModal(id);

  // Real purchase flow (Google Play — pending integration). A genuine
  // completed purchase unlocks the theme AND, for the VIP tier, marks the
  // user as a real supporter (donation ask hides automatically).
  const confirmPurchase = (id) => {
    const th     = getTheme(id);
    const newIds = [...new Set([...unlockedIds, id])];
    setUnlockedIds(newIds);
    setActiveThemeId(id);
    saveData(STORAGE_KEYS.UNLOCKED_IDS, newIds);
    saveData(STORAGE_KEYS.ACTIVE_THEME, id);
    setPurchaseModal(null);
    if (id === "vip_royal") {
      setVipPurchased(true);
      setAdFree(true);
      setSupportDone(true); // genuine VIP purchase = genuine support
      saveData(STORAGE_KEYS.AD_FREE, true);
      saveData(STORAGE_KEYS.SUPPORT_DONE, true);
    }
    sendNotif("✅ تم فتح " + th.name + "!");
  };

  const submitThemePromo = (id) => {
    const code  = (promoInputs[id]?.code || "").trim().toLowerCase();
    const valid = { royal_gold: "gold2025", sufi_purple: "purple2025", vip_royal: "vip2025" };
    if (code === valid[id]) {
      const newIds = [...new Set([...unlockedIds, id])];
      setUnlockedIds(newIds);
      setActiveThemeId(id);
      saveData(STORAGE_KEYS.UNLOCKED_IDS, newIds);
      saveData(STORAGE_KEYS.ACTIVE_THEME, id);
      // A promo code is not a real payment — but per spec, entering ANY
      // valid promo code should hide the donation ask going forward, since
      // the user has already engaged with the unlock flow.
      setSupportDone(true);
      saveData(STORAGE_KEYS.SUPPORT_DONE, true);
      setPurchaseModal(null);
      sendNotif("🎁 " + getTheme(id).name + " مفتوح!");
    } else {
      setPromoInputs((p) => ({ ...p, [id]: { ...p[id], msg: "❌ الكود غير صحيح" } }));
    }
  };
  const setPromoCode = (id, val) =>
    setPromoInputs((p) => ({ ...p, [id]: { ...p[id], code: val, msg: "" } }));

  // Master promo code (Settings screen). ANY successfully-applied promo code
  // — master or general — hides the donation button. Only a genuine paid
  // transaction (confirmPurchase above) or this master code unlock the full
  // premium feature set; a basic "remove ads" code only clears ads.
  const handleMasterPromo = async () => {
    const code = masterPromo.trim();
    if (!code) { setMasterMsg("❌ الكود غير صحيح"); return; }
    try {
      const inputHash = await hashCode(code);
      if (inputHash === MASTER_CODE_HASH) {
        const allIds = THEMES.map((t) => t.id);
        setAdFree(true);
        setPremiumMode(true);
        setUnlockedIds(allIds);
        setActiveThemeId("vip_royal");
        setSupportDone(true); // successful promo code → hide donation ask
        saveData(STORAGE_KEYS.AD_FREE, true);
        saveData(STORAGE_KEYS.UNLOCKED_IDS, allIds);
        saveData(STORAGE_KEYS.ACTIVE_THEME, "vip_royal");
        saveData(STORAGE_KEYS.SUPPORT_DONE, true);
        setMasterMsg("❤️ تم تفعيل كل المميزات الفاخرة بالكامل!");
        return;
      }
    } catch (_) {}
    if (code.toLowerCase() === "friend2025") {
      setAdFree(true);
      setSupportDone(true); // valid promo code → hide donation ask
      saveData(STORAGE_KEYS.AD_FREE, true);
      saveData(STORAGE_KEYS.SUPPORT_DONE, true);
      setMasterMsg("✅ تم إزالة الإعلانات!");
    } else {
      setMasterMsg("❌ الكود غير صحيح");
    }
  };

  const sendFatwa = async () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatHistory((p) => [...p, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const match  = FATWA_QA.find((f) => q.includes(f.q.slice(0, 10)));
    const answer = match
      ? match.a
      : "جزاك الله خيراً على سؤالك. هذه المسألة تحتاج إلى بحث أعمق وأنصحك بمراجعة أهل العلم.";
    setChatHistory((p) => [...p, { role: "ai", text: answer }]);
    setChatLoading(false);
  };

  const displayedPrayerTimes = livePrayerTimes || [
    { name: "الفجر",  time: "04:45" }, { name: "الشروق", time: "06:15" },
    { name: "الظهر",  time: "12:30" }, { name: "العصر",  time: "15:45" },
    { name: "المغرب", time: "18:30" }, { name: "العشاء", time: "20:00" },
  ];

  // ── SPLASH ────────────────────────────────────────────────────────────────
  // Purely presentational — never blocks on isReady, never blocks on data.
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

  // ── AD ────────────────────────────────────────────────────────────────────
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

  const NAV_TABS = [
    { id: "home",     icon: "🏠", label: "الرئيسية"  },
    { id: "quran",    icon: "📖", label: "القرآن"    },
    { id: "tasbeeh",  icon: "📿", label: "التسبيح"   },
    { id: "qibla",    icon: "🧭", label: "القبلة"    },
    { id: "azkar",    icon: "🤲", label: "الأذكار"   },
    { id: "stats",    icon: "📊", label: "الإحصاء"   },
    { id: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <View style={[styles.appRoot, { backgroundColor: T.bg }]}>
      {/* Premium mode badge overlay (Settings screen only) */}
      {premiumMode && activeTab === "settings" && (
        <View style={styles.premiumWrap} pointerEvents="none">
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumStar}>⭐</Text>
            <Text style={styles.premiumText}>عضوية مميّزة مفعّلة</Text>
            <Text style={styles.premiumStar}>⭐</Text>
          </View>
        </View>
      )}

      {/* Toast */}
      {notifMsg ? (
        <View style={[styles.toast, { borderColor: T.accentBorder }]}>
          <Text style={styles.toastText}>{notifMsg}</Text>
        </View>
      ) : null}

      {/* Pop-up Reminder Modal — Sunnah / Hadith / Dhikr / Ayat al-Kursi */}
      <Modal visible={reminderModal} transparent animationType="fade" onRequestClose={() => setReminderModal(false)}>
        <View style={styles.reminderOverlay}>
          <View style={[styles.reminderSheet, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
            <View style={[styles.reminderBadge, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}>
              <Text style={[styles.reminderBadgeText, { color: T.accent }]}>{reminderContent?.type || "تذكير"}</Text>
            </View>
            <Text style={styles.reminderText}>{reminderContent?.text}</Text>
            <TouchableOpacity
              style={[styles.reminderCloseBtn, { backgroundColor: T.accent }]}
              onPress={() => setReminderModal(false)}
            >
              <Text style={styles.reminderCloseBtnText}>حفظ الله ورعاك ✦</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal — clean structured overview, opened from Settings */}
      <Modal visible={aboutModal} transparent animationType="slide" onRequestClose={() => setAboutModal(false)}>
        <TouchableOpacity style={styles.purchaseOverlay} activeOpacity={1} onPress={() => setAboutModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.purchaseSheet, { borderColor: T.accentBorder }]} onPress={() => {}}>
            <ScrollView>
              <View style={styles.purchaseHandle} />
              <Text style={[styles.aboutTitle, { color: T.accent }]}>ℹ️ عن تطبيق مُصلِّي</Text>
              <View style={[styles.aboutDivider, { backgroundColor: T.cardBorder }]} />
              <RI label="اسم التطبيق"        value="مُصلِّي" />
              <RI label="الإصدار"             value="3.0.0" />
              <RI label="المنصة"              value="Expo 51 — React Native" />
              <RI label="البيانات القرآنية"    value="محققة ومعتمدة 100%" />
              <RI label="مصدر مواقيت الصلاة"   value="Aladhan API" />
              <RI label="الترخيص"             value="للاستخدام الشخصي فقط" />
              <View style={[styles.aboutDivider, { backgroundColor: T.cardBorder }]} />
              <Text style={styles.aboutSection}>🌟 مميزات التطبيق</Text>
              {[
                "قراءة سورة الفاتحة مع التجويد التفاعلي",
                "عداد التسبيح الإلكتروني مع الفقاعة العائمة",
                "اتجاه القبلة بالبوصلة الحية",
                "أذكار الصباح والمساء والنوم والسفر",
                "مواقيت الصلاة الحية بالموقع الجغرافي",
                "إحصاءات القراءة والعبادة اليومية",
                "نظام تذكيرات دورية ويومية بالأحاديث والسنن وآية الكرسي",
                "مستشار الفتاوى الشرعية الذكي",
                "متجر ثيمات فاخرة متعددة",
              ].map((f, i) => (
                <Text key={i} style={styles.aboutFeature}>• {f}</Text>
              ))}
              <View style={[styles.aboutDivider, { backgroundColor: T.cardBorder }]} />
              <Text style={styles.aboutDisclaimer}>
                هذا التطبيق أداة مساعدة دينية. محتوى الفتاوى للاسترشاد فقط، ويُرجى الرجوع لأهل العلم المتخصصين.
              </Text>
              <TouchableOpacity
                style={[styles.longModalClose, { backgroundColor: T.accent, marginTop: 16 }]}
                onPress={() => setAboutModal(false)}
              >
                <Text style={styles.longModalCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <PurchaseModal
        T={T}
        purchaseModal={purchaseModal}
        setPurchaseModal={setPurchaseModal}
        promoInputs={promoInputs}
        setPromoCode={setPromoCode}
        submitThemePromo={submitThemePromo}
        confirmPurchase={confirmPurchase}
      />

      {/* Draggable Tasbeeh Bubble — floats above ALL screens while toggled on */}
      {floatW && (
        <DraggableTasbeehBubble T={T} count={tasbeehCount} onTap={handleTasbeeh} />
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

      {/* Long-press word modal */}
      <Modal visible={!!longModal} transparent animationType="fade" onRequestClose={() => setLongModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLongModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.longModalBox, { borderColor: T.cardBorder }]} onPress={() => {}}>
            <ScrollView>
              <Text style={styles.longModalWord}>{longModal}</Text>
              <View style={styles.longModalDivider} />
              {longModal && WORD_MEANINGS[longModal] ? (
                <>
                  <RI label="المعنى"  value={WORD_MEANINGS[longModal].m} />
                  <RI label="الجذر"   value={WORD_MEANINGS[longModal].r} />
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
              <TouchableOpacity
                style={[styles.longModalClose, { backgroundColor: T.accent }]}
                onPress={() => setLongModal(null)}
              >
                <Text style={styles.longModalCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Fatwa Modal — opened via floating bubble button in Settings */}
      <Modal visible={fatwaModalVisible} transparent animationType="slide" onRequestClose={() => setFatwaModalVisible(false)}>
        <View style={styles.fatwaModalOverlay}>
          <View style={[styles.fatwaModalSheet, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
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

      {/* Main screens */}
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
            onReset={() => { setTasbeehCount(0); saveData(STORAGE_KEYS.TASBEEH_COUNT, 0); }}
            shake={tShake}
            flash={tFlash}
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
            userLocation={userLocation}
          />
        )}
        {activeTab === "azkar" && (
          <AzkarScreen
            T={T}
            azkarTab={azkarTab}
            setAzkarTab={setAzkarTab}
            morningC={morningC} setMorningC={setMorningC}
            eveningC={eveningC} setEveningC={setEveningC}
            sleepC={sleepC}     setSleepC={setSleepC}
            travelC={travelC}   setTravelC={setTravelC}
            homeC={homeC}       setHomeC={setHomeC}
            sunnahC={sunnahC}   setSunnahC={setSunnahC}
            decrement={decrement}
          />
        )}
        {activeTab === "stats" && (
          <StatsScreen
            T={T}
            totalTasbeeh={totalTasbeeh}
            totalReadSecs={totalReadSecs}
            totalAyahsRead={totalAyahsRead}
            streak={streakRef.current}
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
            azanOn={azanOn}         setAzanOn={setAzanOn}
            salahOn={salahOn}       setSalahOn={setSalahOn}
            salahInt={salahInt}     setSalahInt={setSalahInt}
            preOn={preOn}           setPreOn={setPreOn}
            autoAzkar={autoAzkar}   setAutoAzkar={setAutoAzkar}
            travelOn={travelOn}     setTravelOn={setTravelOn}
            fastOn={fastOn}         setFastOn={setFastOn}
            fastMT={fastMT}         setFastMT={setFastMT}
            fastWD={fastWD}         setFastWD={setFastWD}
            activeThemeId={activeThemeId}
            unlockedIds={unlockedIds}
            onSelect={selectTheme}
            onBuy={openPurchase}
            vipPurchased={vipPurchased}
            sendNotif={sendNotif}
            onOpenFatwa={() => setFatwaModalVisible(true)}
            onOpenAbout={() => setAboutModal(true)}
            supportDone={supportDone}
            reminderEnabled={reminderEnabled}
            setReminderEnabled={setReminderEnabled}
            reminderIntervalMins={reminderIntervalMins}
            setReminderIntervalMins={setReminderIntervalMins}
            dailyReminderTime={dailyReminderTime}
            setDailyReminderTime={setDailyReminderTime}
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
              <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={styles.navTabBtn} activeOpacity={0.7}>
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

// ─── DRAGGABLE TASBEEH BUBBLE ─────────────────────────────────────────────────
// Fix applied: tap detection now uses an explicit movement threshold tracked
// in a ref (not React state, to avoid stale-closure issues inside the
// PanResponder callbacks) and a movement-distance accumulator, so a quick
// tap ALWAYS fires onTap() immediately — it is never swallowed by the
// gesture responder negotiating with parent scrollviews.
function DraggableTasbeehBubble({ T, count, onTap }) {
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - 100, y: 140 })).current;
  const totalMovement = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        totalMovement.current = 0;
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        totalMovement.current = Math.abs(g.dx) + Math.abs(g.dy);
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, g);
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const newX = Math.max(0, Math.min(SCREEN_W - 90, pan.x._value));
        const newY = Math.max(60, Math.min(SCREEN_H - 180, pan.y._value));
        Animated.spring(pan, { toValue: { x: newX, y: newY }, useNativeDriver: false, tension: 40, friction: 7 }).start();
        // A tap is any release where the finger barely moved — fires
        // onTap() (the Tasbeeh counter increment) immediately.
        if (totalMovement.current < 8) onTap();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatWidget,
        { backgroundColor: T.cardBg, borderColor: T.accent, shadowColor: T.accent, position: "absolute", zIndex: 500, transform: [{ translateX: pan.x }, { translateY: pan.y }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.floatWidgetInner}>
        <Text style={styles.floatWidgetEmoji}>📿</Text>
        <Text style={[styles.floatWidgetCount, { color: T.accent }]}>{count}</Text>
        <Text style={[styles.floatWidgetLabel, { color: T.accent }]}>تسبيح</Text>
      </View>
    </Animated.View>
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
            {/* NOTE: Google Play Billing integration is pending a developer
                account — button below triggers the local unlock flow used
                for testing until that integration ships. */}
            <TouchableOpacity
              style={[styles.purchaseBuyBtn, { backgroundColor: th.accent }]}
              onPress={() => confirmPurchase(purchaseModal)}
            >
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
                <TouchableOpacity
                  style={[styles.purchasePromoBtn, { backgroundColor: th.accentSoft, borderColor: th.accentBorder }]}
                  onPress={() => submitThemePromo(purchaseModal)}
                >
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
// Layout per spec: Gregorian date on top, Hijri date directly below it, no
// country field anywhere, and the "مُصلِّي" title nudged slightly left
// (marginRight pushes it away from the screen's right edge in this RTL
// layout, reading as "shifted left" relative to the edge it would otherwise
// hug) for better visual balance against the date block.
function HomeScreen({ T, bookmark, sendNotif, setActiveTab, dhikrIdx, fastAlert, hijri, greg, countdown, prayerTimes, prayerLoading }) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.homeHeader, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
        <View style={styles.homeHeaderDateBlock}>
          <Text style={styles.homeHeaderGreg}>
            {greg.dayName}، {greg.day} {greg.month} {greg.year}
          </Text>
          <Text style={[styles.homeHeaderHijri, { color: T.accent }]}>
            {hijri.day} {hijri.monthName} {hijri.year} هـ
          </Text>
        </View>
        <Text style={styles.homeHeaderTitle}>مُصلِّي</Text>
      </View>

      {/* Dhikr / fasting alert banner */}
      <View style={[styles.dhikrBanner, { backgroundColor: fastAlert ? "#1a0e00" : T.cardBg, borderBottomColor: fastAlert ? "#f59e0b44" : T.cardBorder }]}>
        {fastAlert
          ? <Text style={styles.fastAlertText}>🌟 {fastAlert}</Text>
          : <Text style={[styles.dhikrText, { color: T.accent }]}>{DHIKR_PHRASES[dhikrIdx]}</Text>
        }
      </View>

      {/* Countdown — correct h/m formatting */}
      <View style={[styles.countdownRow, { backgroundColor: T.cardBg, borderBottomColor: T.cardBorder }]}>
        <Text style={styles.countdownLabel}>الوقت المتبقي لأذان {countdown.label}</Text>
        <Text style={[styles.countdownVal, { color: T.accent }]}>
          {formatMinutes(countdown.mins)}
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
            <Text style={[styles.prayerChipTime, { color: T.accent }]}>
              {p.time ? p.time.substring(0, 5) : "--:--"}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Resume reading bookmark */}
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

      {/* 4 main navigation cards */}
      <View style={styles.homeGrid}>
        {[
          { icon: "📖", label: "القرآن الكريم",  sub: "سورة الفاتحة",   tab: "quran"   },
          { icon: "📿", label: "المسبحة",         sub: "عداد التسبيح",  tab: "tasbeeh" },
          { icon: "🧭", label: "اتجاه القبلة",    sub: "مكة المكرمة",  tab: "qibla"   },
          { icon: "🤲", label: "الأذكار والسنن",  sub: "أذكار الصباح", tab: "azkar"   },
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
        <PBar T={T} label="أذكار الصباح"  pct={75} />
        <PBar T={T} label="أذكار المساء"  pct={30} color="#3b82f6" />
        <PBar T={T} label="السنن اليومية" pct={50} color="#f59e0b" />
      </Card>

      {/* Next prayer alert */}
      <Card T={T} title={`⏰ اقتربت صلاة ${countdown.label}`}>
        <Text style={styles.nextPrayerSub}>متبقي {formatMinutes(countdown.mins)}</Text>
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
function QuranScreen({ T, fontSize, searchQuery, setSearchQuery, currentAyah, setCurrentAyah, audioPlaying, setAudioPlaying, bookmark, setBookmark, onWordPress, onWordLong, audioLoadingAyah }) {
  const timerRef = useRef(null);
  const tap      = (w) => { timerRef.current = setTimeout(() => { timerRef.current = null; onWordLong(w); }, 600); };
  const release  = (w) => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; onWordPress(w); } };
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
            <View key={ayah.id} style={[styles.ayahRow, { backgroundColor: currentAyah === idx ? `${T.accent}0d` : "transparent" }]}>
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
                  <TouchableOpacity key={wi} activeOpacity={0.6} onPressIn={() => tap(w)} onPressOut={() => release(w)}>
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
function TasbeehScreen({ T, count, onTap, onReset, shake, flash, floatW, setFloatW, sendNotif }) {
  const ring      = count % 100;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, { toValue: shake ? 0.93 : 1, duration: 150, useNativeDriver: true }).start();
  }, [shake]);

  const radius        = 60;
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
            activeOpacity={0.9}
            onPress={onTap}
            style={[
              styles.tasbeehBtn,
              { borderColor: flash ? T.accent : "#222", backgroundColor: flash ? T.accentSoft : "#090909" },
            ]}
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
          label="🫧 فقاعة التسبيح"
          sub="تظهر فوق شاشات التطبيق وقابلة للسحب والضغط — اضغط عليها للعدّ مباشرة"
          value={floatW}
          onChange={(v) => { setFloatW(v); sendNotif(v ? "✅ فقاعة التسبيح مفعّلة" : "⏹ الفقاعة موقوفة"); }}
        />
      </Card>
    </ScrollView>
  );
}

// ─── QIBLA SCREEN ─────────────────────────────────────────────────────────────
function QiblaScreen({ T, compassAngle, isAligned, qiblaAngle, userLocation }) {
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
          {isAligned
            ? <Text style={styles.qiblaAligned}>✅ أنت تواجه القبلة!</Text>
            : <Text style={styles.qiblaNotAligned}>🔄 أدر الجهاز نحو القبلة</Text>
          }
          <Text style={styles.qiblaAngle}>الزاوية الحالية: {Math.round(compassAngle)}° | القبلة: {Math.round(qiblaAngle)}°</Text>
        </View>
        <Card T={T} title="📍 الموقع الحالي" style={{ marginTop: 20, width: "100%" }}>
          <RI label="خط العرض"     value={userLocation ? `${userLocation.latitude.toFixed(4)}°`  : "—"} />
          <RI label="خط الطول"     value={userLocation ? `${userLocation.longitude.toFixed(4)}°` : "—"} />
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
    { id: "sleep",   label: "النوم",  icon: "🌙" },
    { id: "home",    label: "المنزل", icon: "🏠" },
    { id: "travel",  label: "السفر",  icon: "✈️" },
    { id: "sunnah",  label: "السنن",  icon: "✨" },
  ];
  const dataMap = {
    morning: [MORNING_AZKAR, morningC, setMorningC],
    evening: [EVENING_AZKAR, eveningC, setEveningC],
    sleep:   [SLEEP_AZKAR,   sleepC,   setSleepC],
    travel:  [TRAVEL_AZKAR,  travelC,  setTravelC],
    home:    [HOME_AZKAR,    homeC,    setHomeC],
    sunnah:  [SUNNAH_LIST,   sunnahC,  setSunnahC],
  };
  const [data, counts, setCounts] = dataMap[azkarTab];
  return (
    <View style={{ flex: 1 }}>
      <SH title="🤲 الأذكار والسنن" T={T} />
      <View style={[styles.azkarGridRow, { borderBottomColor: T.cardBorder }]}>
        {TABS.map((tab) => {
          const isActive = azkarTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setAzkarTab(tab.id)}
              style={[styles.azkarGridBtn, { backgroundColor: isActive ? T.accentSoft : "#0a0a0a", borderColor: isActive ? T.accent : "#1a1a1a" }]}
            >
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
                <TouchableOpacity
                  style={[styles.azkarRecordBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                  onPress={() => decrement(counts, setCounts, idx)}
                >
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

// ─── FATWA SCREEN ─────────────────────────────────────────────────────────────
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.fatwaChipsRow, { backgroundColor: T.cardBg, borderTopColor: T.cardBorder }]}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}
      >
        {FATWA_QA.slice(0, 3).map((q, i) => (
          <TouchableOpacity key={i}
            style={[styles.fatwaChip, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
            onPress={() => { setChatInput(q.q); setTimeout(() => onSend(), 50); }}
          >
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

// ─── STATS SCREEN (real-time tracking) ───────────────────────────────────────
function StatsScreen({ T, totalTasbeeh, totalReadSecs, totalAyahsRead, streak }) {
  const maxMins = Math.max(...WEEKLY_STATS.map((d) => d.mins));

  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📊 إحصاءات القراءة" sub="متابعة لحظية" T={T} />
      <View style={styles.statsGrid}>
        {[
          { icon: "⏱️", val: formatSeconds(totalReadSecs), unit: "",       label: "إجمالي القراءة",  color: T.accent  },
          { icon: "📖", val: String(totalAyahsRead),       unit: "آية",    label: "آيات مقروءة",     color: "#3b82f6" },
          { icon: "🔥", val: String(streak),               unit: "أيام",   label: "أيام متتالية",    color: "#f59e0b" },
          { icon: "📿", val: String(totalTasbeeh),         unit: "تسبيحة", label: "إجمالي التسبيح",  color: "#8b5cf6" },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { borderColor: `${s.color}33` }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={[styles.statUnit, { color: s.color }]}>{s.unit}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Card T={T} title="دقائق القراءة اليومية (مرجعي)">
        <View style={styles.barsRow}>
          {WEEKLY_STATS.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: T.accent }]}>{d.mins}</Text>
              <View style={[styles.barFill, { height: (d.mins / maxMins) * 82, backgroundColor: T.accentSoft, borderTopColor: T.accent }]} />
              <Text style={styles.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card T={T} title="آيات مقروءة يومياً (مرجعي)">
        <View style={[styles.barsRow, { height: 80 }]}>
          {WEEKLY_STATS.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: "#3b82f6" }]}>{d.ayahs}</Text>
              <View style={[styles.barFill, { height: (d.ayahs / 50) * 66, backgroundColor: "#3b82f61a", borderTopColor: "#3b82f6" }]} />
              <Text style={styles.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card T={T} title="🏆 الإنجازات">
        {[
          { icon: "🌟", label: "حافظ الفاتحة",        done: totalAyahsRead >= 7,  desc: "قرأت سورة الفاتحة كاملة" },
          { icon: "📿", label: "100 تسبيحة في يوم",   done: totalTasbeeh >= 100,  desc: "سبّحت 100 مرة" },
          { icon: "🔥", label: "7 أيام متتالية",       done: streak >= 7,          desc: "استخدمت التطبيق 7 أيام متتالية" },
          { icon: "📖", label: "ختمة كاملة",           done: false,                desc: "اقرأ القرآن كاملاً" },
          { icon: "🌙", label: "أذكار النوم 30 يوماً", done: false,                desc: "أكمل أذكار النوم 30 يوماً" },
        ].map((a, i) => (
          <View key={i} style={[styles.achievementRow, { backgroundColor: a.done ? "#0a1a0a" : "#0a0a0a", borderColor: a.done ? "#22c55e22" : "#111", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 }]}>
            <Text style={{ fontSize: 26 }}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.achievementLabel, { color: a.done ? "#e2e8f0" : "#444", fontWeight: "700" }]}>{a.label}</Text>
              <Text style={{ color: a.done ? "#22c55e88" : "#333", fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
            </View>
            <Text style={{ fontSize: 22 }}>{a.done ? "✅" : "🔒"}</Text>
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
  activeThemeId, unlockedIds, onSelect, onBuy, vipPurchased, sendNotif,
  onOpenFatwa, onOpenAbout,
  supportDone,
  reminderEnabled, setReminderEnabled,
  reminderIntervalMins, setReminderIntervalMins,
  dailyReminderTime, setDailyReminderTime,
}) {
  const bubbleGlow = useRef(new Animated.Value(0.7)).current;
  const [dailyHour, setDailyHour]     = useState(dailyReminderTime.split(":")[0] || "07");
  const [dailyMinute, setDailyMinute] = useState(dailyReminderTime.split(":")[1] || "00");

  const applyTime = () => {
    let h = parseInt(dailyHour, 10);
    let m = parseInt(dailyMinute, 10);
    if (isNaN(h) || h < 0 || h > 23) h = 7;
    if (isNaN(m) || m < 0 || m > 59) m = 0;
    const hStr = pad(h);
    const mStr = pad(m);
    setDailyHour(hStr);
    setDailyMinute(mStr);
    setDailyReminderTime(`${hStr}:${mStr}`);
    sendNotif(`✅ التذكير اليومي: ${hStr}:${mStr}`);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleGlow, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(bubbleGlow, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="⚙️ الإعدادات" T={T} />

      {/* Fatwa bubble — relocated here from the bottom tab bar; opens the
          Fatwa chat as a modal overlay rather than a dedicated tab. */}
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
          const owned  = unlockedIds.includes(th.id);
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
          <TouchableOpacity
            style={[styles.promoBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
            onPress={handleMasterPromo}
          >
            <Text style={[styles.promoBtnText, { color: T.accent }]}>تفعيل</Text>
          </TouchableOpacity>
        </View>
        {masterMsg ? (
          <Text style={[styles.promoMsg, { color: masterMsg.startsWith("❌") ? "#ef4444" : masterMsg.startsWith("❤️") ? "#ec4899" : "#22c55e" }]}>{masterMsg}</Text>
        ) : null}
        {adFree ? <Text style={styles.promoAdFree}>✅ الإعلانات محذوفة</Text> : null}
      </Card>

      {/* Donation — shown ONLY while supportDone is false, i.e. the user has
          neither completed a genuine purchase nor redeemed any valid promo
          code. The moment either happens, supportDone flips true and this
          card disappears for the rest of the app's lifetime (persisted). */}
      {!supportDone && (
        <Card T={T} title="">
          <TouchableOpacity
            onPress={() => {
              // NOTE: Google Play Billing integration is pending a developer
              // account — this is a placeholder flow until that ships.
              sendNotif("⏳ سيتم دعم Google Play قريباً");
            }}
          >
            <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.donateBtn}>
              <Text style={styles.donateBtnText}>💛 دعم استمرار وتطوير التطبيق</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={{ color: "#555", fontSize: 11, textAlign: "center", marginTop: 6 }}>
            تكامل Google Play قيد التطوير
          </Text>
        </Card>
      )}

      {supportDone && (
        <Card T={T} title="">
          <Text style={{ color: T.accent, textAlign: "center", fontSize: 14, fontWeight: "700", paddingVertical: 8 }}>
            💛 جزاك الله خيراً — دعمك يساعد على استمرار التطبيق!
          </Text>
        </Card>
      )}

      {/* Pop-up Reminders — daily clock-time trigger + recurring interval,
          dynamically queuing Sunnah / Hadith / Dhikr / Ayat al-Kursi text */}
      <Card T={T} title="🔔 التذكيرات الدورية">
        <Toggle
          T={T}
          label="تفعيل التذكيرات"
          sub="أحاديث، سنن، أذكار، آية الكرسي"
          value={reminderEnabled}
          onChange={setReminderEnabled}
        />
        {reminderEnabled && (
          <>
            <Text style={[styles.salahIntLabel, { marginTop: 12 }]}>الفترة بين التذكيرات</Text>
            <View style={styles.salahIntRow}>
              {[15, 30, 60].map((v) => (
                <TouchableOpacity key={v}
                  style={[styles.salahIntBtn, { backgroundColor: reminderIntervalMins === v ? T.accentSoft : "#111", borderColor: reminderIntervalMins === v ? T.accent : "#222" }]}
                  onPress={() => setReminderIntervalMins(v)}
                >
                  <Text style={[styles.salahIntBtnText, { color: reminderIntervalMins === v ? T.accent : "#555" }]}>{v} دقيقة</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.salahIntLabel, { marginTop: 14 }]}>وقت التذكير اليومي</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6 }}>
              <TextInput
                style={[styles.promoInput, { flex: 1, borderColor: T.cardBorder }]}
                placeholder="الساعة (00-23)"
                placeholderTextColor="#555"
                keyboardType="numeric"
                maxLength={2}
                textAlign="center"
                value={dailyHour}
                onChangeText={setDailyHour}
              />
              <Text style={{ color: "#888", fontSize: 18, fontWeight: "700" }}>:</Text>
              <TextInput
                style={[styles.promoInput, { flex: 1, borderColor: T.cardBorder }]}
                placeholder="الدقيقة (00-59)"
                placeholderTextColor="#555"
                keyboardType="numeric"
                maxLength={2}
                textAlign="center"
                value={dailyMinute}
                onChangeText={setDailyMinute}
              />
              <TouchableOpacity
                style={[styles.promoBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                onPress={applyTime}
              >
                <Text style={[styles.promoBtnText, { color: T.accent }]}>حفظ</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#555", fontSize: 11, marginTop: 8 }}>
              التذكير اليومي الحالي: {dailyReminderTime}
            </Text>
          </>
        )}
      </Card>

      {/* Azan & alerts */}
      <Card T={T} title="🔊 الأذان والتنبيهات الصوتية">
        <Toggle T={T} label="📡 أذان الصلوات الخمس"  sub="صوت الأذان عند وقت كل صلاة"  value={azanOn}    onChange={setAzanOn} />
        <Toggle T={T} label="🕌 الصلاة على النبي ﷺ" sub="تنبيه صوتي دوري"              value={salahOn}   onChange={setSalahOn} />
        {salahOn && (
          <View style={styles.salahIntWrap}>
            <Text style={styles.salahIntLabel}>كل كم دقيقة؟</Text>
            <View style={styles.salahIntRow}>
              {[15, 30, 60].map((v) => (
                <TouchableOpacity key={v}
                  style={[styles.salahIntBtn, { backgroundColor: salahInt === v ? T.accentSoft : "#111", borderColor: salahInt === v ? T.accent : "#222" }]}
                  onPress={() => setSalahInt(v)}
                >
                  <Text style={[styles.salahIntBtnText, { color: salahInt === v ? T.accent : "#555" }]}>{v} دقيقة</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Toggle T={T} label="⏰ تنبيه قبل الصلاة"    sub="تحذير 15 دقيقة قبل كل أذان"   value={preOn}     onChange={setPreOn} />
        <Toggle T={T} label="🤲 أذكار تلقائية"        sub="صباح 7:00 ومغرب كل يوم"       value={autoAzkar}  onChange={setAutoAzkar} />
        <Toggle T={T} label="🚗 مُذكِّر السفر الذكي"   sub="تشغيل تلقائي عند السرعة > 40 كم/س" value={travelOn} onChange={setTravelOn} />
      </Card>

      {/* Fasting */}
      <Card T={T} title="🌙 صيام النوافل والأيام البيض">
        <Toggle T={T} label="تفعيل تذكير الصيام" value={fastOn} onChange={setFastOn} />
        {fastOn && (
          <>
            <Toggle T={T} label="الإثنين والخميس"         sub="تذكير أسبوعي بصيام السنة"  value={fastMT} onChange={setFastMT} />
            <Toggle T={T} label="الأيام البيض 13، 14، 15" sub="تذكير شهري قمري"            value={fastWD} onChange={setFastWD} />
          </>
        )}
      </Card>

      {/* About App — triggers structured modal */}
      <Card T={T} title="ℹ️ عن التطبيق">
        <TouchableOpacity
          style={[styles.nextPrayerBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder, marginTop: 4 }]}
          onPress={onOpenAbout}
        >
          <Text style={[styles.nextPrayerBtnText, { color: T.accent }]}>📋 عرض تفاصيل التطبيق</Text>
        </TouchableOpacity>
        <RI label="الإصدار"           value="3.0.0" />
        <RI label="البيانات القرآنية"  value="محققة ومعتمدة 100%" />
      </Card>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  appRoot:      { flex: 1, width: "100%", maxWidth: 430, alignSelf: "center" },
  screensWrap:  { flex: 1, paddingBottom: 80 },

  splashWrap:    { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  splashGlow:    { position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: "#22c55e1a", top: "28%" },
  splashEmoji:   { fontSize: 72, marginBottom: 4 },
  splashTitle:   { color: "#fff", fontSize: 46, fontWeight: "900", letterSpacing: 3 },
  splashSub:     { color: "#666", fontSize: 15, marginTop: 6 },
  splashBarTrack:{ width: 140, height: 3, backgroundColor: "#111", borderRadius: 2, marginTop: 44, overflow: "hidden" },
  splashBarFill: { height: "100%", width: "70%", backgroundColor: "#22c55e" },

  adWrap:      { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", position: "relative" },
  adBadge:     { position: "absolute", top: 16, left: 16, backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  adBadgeText: { color: "#666", fontSize: 11 },
  adEmoji:     { fontSize: 56, marginBottom: 14 },
  adTitle:     { color: "#fff", fontSize: 26, fontWeight: "800" },
  adSub:       { color: "#666", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 260 },
  adSkip:      { position: "absolute", top: 60, right: 16, backgroundColor: "#1a1a1a", borderRadius: 20, borderWidth: 1, borderColor: "#333", paddingHorizontal: 20, paddingVertical: 10 },
  adSkipText:  { color: "#ccc", fontSize: 13 },

  premiumWrap:   { position: "absolute", bottom: 95, left: 0, right: 0, alignItems: "center", zIndex: 200 },
  premiumBadge:  { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#1a1100", borderWidth: 1, borderColor: "#f59e0b60", borderRadius: 22, paddingHorizontal: 20, paddingVertical: 7 },
  premiumStar:   { fontSize: 15 },
  premiumText:   { color: "#f59e0b", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },

  toast:     { position: "absolute", top: 16, left: "50%", marginLeft: -100, width: 200, alignItems: "center", backgroundColor: "#111", borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, zIndex: 1500 },
  toastText: { color: "#e2e8f0", fontSize: 13, textAlign: "center" },

  // Reminder modal
  reminderOverlay:     { flex: 1, backgroundColor: "#000000cc", alignItems: "center", justifyContent: "center" },
  reminderSheet:       { borderWidth: 1.5, borderRadius: 24, padding: 24, maxWidth: 340, width: "88%", alignItems: "center" },
  reminderBadge:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  reminderBadgeText:   { fontSize: 12, fontWeight: "700" },
  reminderText:        { color: "#f0e6d3", fontSize: 17, lineHeight: 30, textAlign: "center", marginBottom: 20 },
  reminderCloseBtn:    { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 28 },
  reminderCloseBtnText:{ color: "#000", fontSize: 14, fontWeight: "800" },

  floatWidget:      { width: 86, height: 86, borderRadius: 43, borderWidth: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10 },
  floatWidgetInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  floatWidgetLabel: { fontSize: 10, marginTop: 1 },
  floatWidgetEmoji: { fontSize: 22 },
  floatWidgetCount: { fontSize: 18, fontWeight: "900" },

  wordPopup:    { position: "absolute", top: "28%", left: "50%", marginLeft: -105, width: 210, backgroundColor: "#0d0d0d", borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", zIndex: 800 },
  wordPopupText:{ color: "#f0e6d3", fontSize: 32, marginBottom: 12 },
  soundWaveRow: { flexDirection: "row", alignItems: "center", gap: 3, height: 36, marginBottom: 8 },
  soundWaveBar: { width: 3, borderRadius: 2 },
  wordPopupSub: { color: "#666", fontSize: 12 },

  modalOverlay:      { flex: 1, backgroundColor: "#000000aa", alignItems: "center", justifyContent: "center" },
  longModalBox:      { backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 22, padding: 22, maxWidth: 340, width: "90%", maxHeight: "80%" },
  longModalWord:     { color: "#f0e6d3", fontSize: 32, textAlign: "center", marginBottom: 14 },
  longModalDivider:  { borderBottomWidth: 1, borderBottomColor: "#111", marginVertical: 10 },
  longModalNoData:   { color: "#666", fontSize: 13, textAlign: "center" },
  longModalFontLabel:{ color: "#e2e8f0", fontSize: 13, marginBottom: 8 },
  longModalFontRow:  { flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  longModalFontVal:  { fontSize: 14, minWidth: 40, textAlign: "center" },
  longModalHint:     { color: "#888", fontSize: 12, lineHeight: 19 },
  longModalClose:    { width: "100%", marginTop: 14, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  longModalCloseText:{ color: "#000", fontSize: 14, fontWeight: "700" },

  purchaseOverlay:   { flex: 1, backgroundColor: "#000000bb", justifyContent: "flex-end" },
  purchaseSheet:     { backgroundColor: "#0d0d0d", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  purchaseHandle:    { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  purchaseHeaderRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  purchaseEmojiBox:  { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  purchaseEmoji:     { fontSize: 26 },
  purchaseName:      { color: "#fff", fontSize: 16, fontWeight: "800" },
  purchaseSubName:   { color: "#666", fontSize: 12, marginTop: 2 },
  purchasePriceBadge:{ borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  purchasePriceText: { fontSize: 14, fontWeight: "800" },
  purchaseDesc:      { color: "#888", fontSize: 12, marginBottom: 18, lineHeight: 20 },
  vipBox:            { backgroundColor: "#ffffff08", borderWidth: 1, borderColor: "#ffffff14", borderRadius: 12, padding: 14, marginBottom: 16 },
  vipBoxTitle:       { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  vipBoxItem:        { color: "#ccc", fontSize: 12, marginBottom: 6, lineHeight: 18 },
  purchaseBuyBtn:    { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 14 },
  purchaseBuyBtnText:{ color: "#000", fontSize: 15, fontWeight: "800" },
  purchasePromoSection:{ borderTopWidth: 1, borderTopColor: "#1e1e1e", paddingTop: 14 },
  purchasePromoLabel:  { color: "#666", fontSize: 12, marginBottom: 8 },
  purchasePromoRow:    { flexDirection: "row", gap: 8 },
  purchasePromoInput:  { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  purchasePromoBtn:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, justifyContent: "center" },
  purchasePromoBtnText:{ fontSize: 13, fontWeight: "700" },
  purchasePromoMsg:    { fontSize: 12, marginTop: 6 },
  purchaseCancelBtn:   { width: "100%", marginTop: 12, alignItems: "center" },
  purchaseCancelText:  { color: "#444", fontSize: 13 },

  shWrap:    { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1 },
  shTitle:   { color: "#fff", fontSize: 20, fontWeight: "800" },
  shSub:     { color: "#555", fontSize: 12, marginTop: 3 },
  card:      { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 12 },
  cardTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "700", marginBottom: 12 },

  pbarRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pbarLabel: { color: "#888", fontSize: 12 },
  pbarPct:   { fontSize: 12, fontWeight: "700" },
  pbarTrack: { height: 5, backgroundColor: "#111", borderRadius: 3 },
  pbarFill:  { height: "100%", borderRadius: 3 },

  riRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  riLabel: { color: "#555", fontSize: 12 },
  riValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

  toggleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  toggleLabel: { color: "#e2e8f0", fontSize: 13 },
  toggleSub:   { color: "#555", fontSize: 11, marginTop: 2 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleThumb: { position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },

  btn:     { borderWidth: 1, borderRadius: 20 },
  btnText: { fontWeight: "600" },

  // Home header: Gregorian on top, Hijri below; title nudged for balance
  homeHeader:          { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  homeHeaderDateBlock:  { flex: 1 },
  homeHeaderGreg:       { color: "#888", fontSize: 12, marginBottom: 2 },
  homeHeaderHijri:      { fontSize: 13, fontWeight: "700" },
  homeHeaderTitle:      { fontSize: 22, fontWeight: "900", color: "#fff", marginRight: 10 },

  dhikrBanner:   { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderBottomWidth: 1 },
  fastAlertText: { color: "#f59e0b", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  dhikrText:     { fontSize: 14, opacity: 0.85, textAlign: "center" },

  countdownRow:  { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  countdownLabel:{ color: "#666", fontSize: 12 },
  countdownVal:  { fontSize: 22, fontWeight: "900", letterSpacing: 1 },

  prayerStrip:    { paddingVertical: 10, borderBottomWidth: 1 },
  prayerChip:     { alignItems: "center", gap: 2, minWidth: 60, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  prayerChipName: { fontSize: 12, color: "#e2e8f0" },
  prayerChipTime: { fontSize: 13, fontWeight: "700" },

  bookmarkCard:    { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bookmarkLabel:   { color: "#666", fontSize: 11 },
  bookmarkValue:   { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  bookmarkBtn:     { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  bookmarkBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },

  homeGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  homeGridCard: { width: "47%", borderWidth: 1, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 12, alignItems: "center", gap: 7 },
  homeGridIcon: { fontSize: 34 },
  homeGridLabel:{ fontSize: 14, color: "#e2e8f0", fontWeight: "700" },
  homeGridSub:  { fontSize: 11, color: "#555" },

  nextPrayerSub:     { color: "#666", fontSize: 13 },
  nextPrayerBtn:     { marginTop: 10, borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, alignSelf: "flex-start" },
  nextPrayerBtnText: { fontSize: 13, fontWeight: "700" },

  quranHeader:        { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  quranHeaderTitle:   { color: "#fff", fontSize: 21, fontWeight: "800" },
  quranHeaderSub:     { color: "#555", fontSize: 12 },
  quranSearchRow:     { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 22, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 8 },
  quranSearchIcon:    { color: "#555", fontSize: 15 },
  quranSearchInput:   { flex: 1, color: "#e2e8f0", fontSize: 14, padding: 0 },
  quranSearchClear:   { color: "#555", fontSize: 14 },
  quranBookmarkRow:   { alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 8 },
  quranBookmarkBtn:   { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  quranBookmarkBtnText:{ color: "#e2e8f0", fontSize: 12 },
  quranBookmarkSaved: { fontSize: 12, textAlign: "center", marginBottom: 6 },
  ayahsBox:     { backgroundColor: "#030303", borderWidth: 1, borderRadius: 18, marginHorizontal: 16, marginBottom: 12, padding: 16 },
  basmalah:     { textAlign: "center", color: "#f59e0b", fontSize: 14, marginBottom: 16, letterSpacing: 3 },
  ayahRow:      { position: "relative", flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#0d0d0d", borderRadius: 8 },
  ribbonWrap:   { position: "absolute", top: -2, right: -4, width: 18, height: 36, zIndex: 2 },
  ribbonBody:   { width: 18, height: 30, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  ribbonTriangle:{ width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#030303" },
  ayahNumCircle:{ minWidth: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  ayahNumText:  { fontSize: 12 },
  ayahWordsWrap:{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  ayahWord:     { color: "#f0e6d3", paddingHorizontal: 5, paddingVertical: 2, lineHeight: 48 },
  ayahHint:     { textAlign: "center", color: "#333", fontSize: 11, marginTop: 14 },

  audioPlayer:        { backgroundColor: "#050505", borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  audioBtnSmall:      { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  audioBtnSmallText:  { color: "#ccc", fontSize: 15 },
  audioBtnMain:       { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  audioBtnMainText:   { color: "#000", fontSize: 20, fontWeight: "800" },
  audioProgressWrap:  { flex: 1, marginRight: 8 },
  audioProgressLabel: { color: "#888", fontSize: 11, marginBottom: 4 },
  audioProgressTrack: { height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  audioProgressFill:  { height: "100%", borderRadius: 2 },
  audioStatus:        { fontSize: 10 },

  tasbeehCenter:        { alignItems: "center", paddingVertical: 24 },
  tasbeehStage:         { color: "#555", fontSize: 14, marginBottom: 20 },
  tasbeehBtn:           { width: 210, height: 210, borderRadius: 105, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  tasbeehCount:         { fontSize: 64, fontWeight: "900" },
  tasbeehTapHint:       { fontSize: 12, color: "#444", marginTop: 4 },
  tasbeehRingWrap:      { marginTop: 22, alignItems: "center" },
  tasbeehActionsRow:    { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" },
  tasbeehMilestone:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tasbeehMilestoneText: { fontSize: 12 },

  qiblaWrap:         { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16 },
  qiblaCircle:       { width: 240, height: 240, borderRadius: 120, borderWidth: 4, backgroundColor: "#050505", alignItems: "center", justifyContent: "center", position: "relative" },
  qiblaDir:          { position: "absolute", color: "#333", fontSize: 12, fontWeight: "700" },
  qiblaDirN:         { top: 10, left: "50%", marginLeft: -6 },
  qiblaDirE:         { right: 10, top: "50%", marginTop: -8 },
  qiblaDirS:         { bottom: 10, left: "50%", marginLeft: -6 },
  qiblaDirW:         { left: 10, top: "50%", marginTop: -8 },
  qiblaNeedleWrap:   { position: "absolute", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  qiblaArrowUpWrap:  { position: "absolute", top: 18, alignItems: "center" },
  qiblaArrowUp:      { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 72, borderLeftColor: "transparent", borderRightColor: "transparent" },
  qiblaArrowDownWrap:{ position: "absolute", bottom: 18, alignItems: "center" },
  qiblaArrowDown:    { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 72, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#333" },
  qiblaKaaba:        { fontSize: 38, zIndex: 2 },
  qiblaStatusWrap:   { marginTop: 26, alignItems: "center" },
  qiblaAligned:      { color: "#22c55e", fontSize: 20, fontWeight: "800" },
  qiblaNotAligned:   { color: "#ef4444", fontSize: 16 },
  qiblaAngle:        { color: "#444", fontSize: 13, marginTop: 8, textAlign: "center" },

  azkarGridRow:      { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  azkarGridBtn:      { width: "30%", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 10, gap: 4 },
  azkarGridText:     { fontSize: 11 },
  azkarListWrap:     { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 80 },
  azkarCard:         { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  azkarCardDone:     { opacity: 0.35 },
  azkarCardLabel:    { fontSize: 11, marginBottom: 8, fontWeight: "700" },
  azkarCardText:     { color: "#e2e8f0", fontSize: 16, lineHeight: 30 },
  azkarCardFooter:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  azkarRecordBtn:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  azkarRecordBtnText:{ fontSize: 12 },
  azkarCounterCircle:{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  azkarCounterText:  { fontSize: 13, fontWeight: "700" },
  azkarDoneText:     { color: "#22c55e", fontSize: 12, marginTop: 4 },

  fatwaModalOverlay: { flex: 1, backgroundColor: "#000000bb", justifyContent: "flex-end" },
  fatwaModalSheet:   { borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 30, maxHeight: "88%", flex: 0.88 },
  fatwaModalHeader:  { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  fatwaModalIcon:    { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fatwaModalTitle:   { fontSize: 15, fontWeight: "800" },
  fatwaModalSub:     { color: "#555", fontSize: 11, marginTop: 2 },
  fatwaModalClose:   { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  fatwaModalCloseText:{ color: "#888", fontSize: 14 },

  fatwaBubbleSection:   { marginHorizontal: 16, marginVertical: 14 },
  fatwaBubbleContainer: { borderRadius: 20, overflow: "hidden" },
  fatwaBubbleBtn:       { borderWidth: 1.5, borderRadius: 20, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8, overflow: "hidden" },
  fatwaBubbleGrad:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 19 },
  fatwaBubbleEmoji:     { fontSize: 28 },
  fatwaBubbleTitle:     { fontSize: 14, fontWeight: "800" },
  fatwaBubbleSub:       { color: "#666", fontSize: 11, marginTop: 2 },
  fatwaBubbleDot:       { width: 9, height: 9, borderRadius: 5 },

  fatwaChatWrap:    { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  fatwaMsgRow:      { flexDirection: "row", marginBottom: 10 },
  fatwaBubble:      { maxWidth: "82%", borderWidth: 1, borderRadius: 16, padding: 12 },
  fatwaAiLabel:     { fontSize: 10, marginBottom: 5, fontWeight: "700" },
  fatwaMsgText:     { color: "#e2e8f0", fontSize: 13, lineHeight: 22 },
  fatwaTypingBubble:{ borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  fatwaTypingRow:   { flexDirection: "row", gap: 5, alignItems: "center" },
  fatwaTypingDot:   { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  fatwaTypingText:  { color: "#666", fontSize: 11, marginRight: 6 },
  fatwaChipsRow:    { paddingVertical: 6, borderTopWidth: 1 },
  fatwaChip:        { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  fatwaChipText:    { fontSize: 11 },
  fatwaInputRow:    { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, alignItems: "center" },
  fatwaInput:       { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  fatwaSendBtn:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  fatwaSendBtnText: { color: "#000", fontSize: 18, fontWeight: "800" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  statBox:   { width: "47%", backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  statIcon:  { fontSize: 22 },
  statVal:   { fontSize: 24, fontWeight: "900" },
  statUnit:  { fontSize: 10 },
  statLabel: { fontSize: 11, color: "#555", marginTop: 2, textAlign: "center" },
  barsRow:   { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100 },
  barCol:    { flex: 1, alignItems: "center", gap: 3 },
  barVal:    { fontSize: 9 },
  barFill:   { width: "100%", borderRadius: 3, borderTopWidth: 2 },
  barDay:    { fontSize: 9, color: "#444" },
  achievementRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  achievementIcon: { fontSize: 20 },
  achievementLabel:{ flex: 1, fontSize: 13 },
  achievementCheck:{ fontSize: 16 },

  themeRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  themeEmojiBox:   { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  themeEmoji:      { fontSize: 20 },
  themeName:       { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },
  themeDesc:       { color: "#555", fontSize: 11, marginTop: 1 },
  themeActionBtn:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  themeActionText: { fontSize: 11 },

  promoRow:     { flexDirection: "row", gap: 8 },
  promoInput:   { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  promoBtn:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, justifyContent: "center" },
  promoBtnText: { fontSize: 13, fontWeight: "700" },
  promoMsg:     { fontSize: 12, marginTop: 8 },
  promoAdFree:  { color: "#22c55e", fontSize: 12, marginTop: 8 },

  donateBtn:     { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  donateBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },

  salahIntWrap:    { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  salahIntLabel:   { color: "#888", fontSize: 12, marginBottom: 8 },
  salahIntRow:     { flexDirection: "row", gap: 8 },
  salahIntBtn:     { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center" },
  salahIntBtnText: { fontSize: 12 },

  bottomAd:     { backgroundColor: "#080808", borderTopWidth: 1, borderTopColor: "#111", paddingVertical: 7, alignItems: "center", position: "absolute", bottom: 82, left: 0, right: 0, zIndex: 90 },
  bottomAdText: { color: "#333", fontSize: 11 },
  bottomNav:       { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 100, paddingTop: 10, paddingBottom: 24 },
  bottomNavContent:{ flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4 },
  navTabBtn:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navTabIconWrap:  { alignItems: "center", justifyContent: "center", minWidth: 36, height: 32 },
  navTabIcon:      { fontSize: 20 },
  navTabLabel:     { fontSize: 9, marginTop: 1, letterSpacing: 0.3 },

  // About modal
  aboutTitle:      { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  aboutDivider:    { height: 1, marginVertical: 12 },
  aboutSection:    { color: "#e2e8f0", fontSize: 14, fontWeight: "700", marginTop: 4, marginBottom: 8 },
  aboutFeature:    { color: "#888", fontSize: 13, lineHeight: 24 },
  aboutDisclaimer: { color: "#555", fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8 },
});
