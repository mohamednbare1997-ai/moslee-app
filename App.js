import QiblaScreen from "./screens/QiblaScreen";
import TasbeehScreen from "./screens/TasbeehScreen";
import AzkarScreen from "./screens/AzkarScreen";
import StatsScreen from "./screens/StatsScreen";
import QuranScreen from "./screens/QuranScreen";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { AppIcon } from "./components/Icons";
import { Magnetometer } from 'expo-sensors';

import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Audio } from "expo-av";

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── THEMES (المصدر الوحيد — يُمرَّر كـ prop لكل الشاشات) ──────────────────
export const THEMES = [
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

const STORAGE_KEYS = {
  TASBEEH_COUNT:    "@musalli_tasbeeh",
  STREAK_DAYS:      "@musalli_streak",
  LAST_OPEN:        "@musalli_last_open",
  AD_FREE:          "@musalli_ad_free",
  ACTIVE_THEME:     "@musalli_theme",
  UNLOCKED_IDS:     "@musalli_unlocked",
  SUPPORT_DONE:     "@musalli_support_done",
  TOTAL_READ_SECS:  "@musalli_read_secs",
  TOTAL_AYAHS:      "@musalli_ayahs_read",
  TOTAL_TASBEEH:    "@musalli_total_tasbeeh",
  REMINDER_ENABLED: "@musalli_reminder_enabled",
  REMINDER_INT:     "@musalli_reminder_int",
  REMINDER_DAILY:   "@musalli_reminder_daily",
  PURCHASED_IDS:    "@musalli_purchased_ids",
  VIP_PURCHASED:    "@musalli_vip_purchased",
  AZAN_FIRED_DATE:  "@musalli_azan_fired_date",
};

function pad(n) { return String(n).padStart(2, "0"); }

function formatMinutes(totalMinutes) {
  const safe = Math.max(0, Math.floor(totalMinutes || 0));
  if (safe < 60) return `${safe} دقيقة`;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (m === 0) return `${h} ساعة`;
  return `${h}س ${m}د`;
}

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

function smoothAngle(prevAngle, newAngle, alpha = 0.15) {
  let diff = newAngle - prevAngle;
  diff = ((diff + 180) % 360 + 360) % 360 - 180;
  let result = prevAngle + alpha * diff;
  result = ((result % 360) + 360) % 360;
  return result;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const MASTER_CODE_HASH = "bf311209c274eee020a4408527e4224905691a7117a96fdfece63fa82159ea75";

async function hashCode(input) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input.trim());
}

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

const PRODUCT_IDS = {
  royal_gold:  "musalli_theme_royal_gold",
  sufi_purple: "musalli_theme_sufi_purple",
  vip_royal:   "musalli_vip_royal_bundle",
};

const purchaseService = {
  isDemoMode: true,
  async buy(themeId) {
    if (this.isDemoMode) {
      await new Promise((res) => setTimeout(res, 350));
      return { success: true, demo: true, productId: PRODUCT_IDS[themeId] || themeId };
    }
    return { success: false, demo: false, error: "IAP غير مفعّل بعد" };
  },
};

function Card({ T, title, children, style }) {
  return (
    <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
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

// ─── ERROR BOUNDARY (يمنع كراش الشاشة الكاملة عند أي خطأ غير متوقع) ─────────
class ErrorBoundary extends require("react").Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.log("Musalli crash caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.crashWrap}>
          <Text style={styles.crashEmoji}>⚠️</Text>
          <Text style={styles.crashTitle}>حدث خطأ غير متوقع</Text>
          <Text style={styles.crashSub}>نعتذر عن الإزعاج، الرجاء إعادة تشغيل التطبيق</Text>
          <TouchableOpacity
            style={styles.crashBtn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.crashBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
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

  const [countdown, setCountdown] = useState({ label: "العصر", mins: 97 });

  const [userLocation, setUserLocation]       = useState(null);
  const [locationError, setLocationError]     = useState(null);
  const [livePrayerTimes, setLivePrayerTimes] = useState(null);
  const [prayerLoading, setPrayerLoading]     = useState(false);
  const [qiblaAngle, setQiblaAngle]           = useState(143);
  const [realCompassDegree, setRealCompassDegree] = useState(0);
  const smoothedAngleRef = useRef(0);

  const soundRef    = useRef(null);
  const azanRef     = useRef(null);
  const [audioLoadingAyah, setAudioLoadingAyah] = useState(false);
  const azanTriggeredRef = useRef({});
  const salahReminderTimer = useRef(null);

  const [azanOn, setAzanOn]         = useState(true);
  const [salahOn, setSalahOn]       = useState(true);
  const [salahInt, setSalahInt]     = useState(30);
  const [preOn, setPreOn]           = useState(true);
  const [autoAzkar, setAutoAzkar]   = useState(true);
  const [travelOn, setTravelOn]     = useState(false);
  const [fastOn, setFastOn]         = useState(false);
  const [fastMT, setFastMT]         = useState(true);
  const [fastWD, setFastWD]         = useState(false);

  const [activeThemeId, setActiveThemeId] = useState("spiritual_green");
  const [unlockedIds, setUnlockedIds]     = useState(["royal_black", "spiritual_green"]);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [masterPromo, setMasterPromo]     = useState("");
  const [masterMsg, setMasterMsg]         = useState("");
  const [adFree, setAdFree]               = useState(false);
  const [premiumMode, setPremiumMode]     = useState(false);

  const [vipPurchased, setVipPurchased]   = useState(false);
  const [purchasedIds, setPurchasedIds]   = useState([]);

  const [supportDone, setSupportDone]     = useState(false);
  const [supportCodeUsed, setSupportCodeUsed] = useState(false);

  const [totalTasbeeh, setTotalTasbeeh]     = useState(0);
  const [totalReadSecs, setTotalReadSecs]   = useState(0);
  const [totalAyahsRead, setTotalAyahsRead] = useState(0);
  const readingTimerRef = useRef(null);
  const streakRef       = useRef(0);

  const [reminderModal, setReminderModal]               = useState(false);
  const [reminderContent, setReminderContent]           = useState(null);
  const [reminderIntervalMins, setReminderIntervalMins] = useState(30);
  const [reminderEnabled, setReminderEnabled]           = useState(false);
  const [dailyReminderTime, setDailyReminderTime]       = useState("07:00");
  const reminderTimerRef = useRef(null);
  const dailyTimerRef    = useRef(null);
  const reminderPoolIdx  = useRef(0);
  const lastDailyFireRef = useRef("");

  const [isReady, setIsReady] = useState(false);

  const T      = getTheme(activeThemeId);
  const hijri  = getHijriDate();
  const greg   = getGregorianDate();
  const fastAlert = getSpecialFastingAlert(hijri);

  const sendNotif = useCallback(async (title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || "تنبيه الأذان",
          body: body || "حان الآن موعد الصلاة",
          sound: true,
        },
        trigger: null,
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    let finished = false;
    (async () => {
      try {
        const savedTheme      = await loadData(STORAGE_KEYS.ACTIVE_THEME,    "spiritual_green");
        const savedUnlocked   = await loadData(STORAGE_KEYS.UNLOCKED_IDS,    ["royal_black", "spiritual_green"]);
        const savedAdFree     = await loadData(STORAGE_KEYS.AD_FREE,         false);
        const savedSupport    = await loadData(STORAGE_KEYS.SUPPORT_DONE,    false);
        const savedTasbeeh    = await loadData(STORAGE_KEYS.TASBEEH_COUNT,   0);
        const savedTotal      = await loadData(STORAGE_KEYS.TOTAL_TASBEEH,   0);
        const savedSecs       = await loadData(STORAGE_KEYS.TOTAL_READ_SECS, 0);
        const savedAyahs      = await loadData(STORAGE_KEYS.TOTAL_AYAHS,     0);
        const savedRemEn      = await loadData(STORAGE_KEYS.REMINDER_ENABLED, false);
        const savedRemInt     = await loadData(STORAGE_KEYS.REMINDER_INT,     30);
        const savedRemDaily   = await loadData(STORAGE_KEYS.REMINDER_DAILY,   "07:00");
        const savedVip        = await loadData(STORAGE_KEYS.VIP_PURCHASED,    false);
        const savedPurchased  = await loadData(STORAGE_KEYS.PURCHASED_IDS,    []);
        const savedAzanDate   = await loadData(STORAGE_KEYS.AZAN_FIRED_DATE,  {});

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
        setVipPurchased(savedVip);
        setPurchasedIds(savedPurchased);

        const tKey = todayKey();
        const filtered = {};
        Object.keys(savedAzanDate || {}).forEach((timeStr) => {
          if (savedAzanDate[timeStr] === tKey) filtered[timeStr] = tKey;
        });
        azanTriggeredRef.current = filtered;

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
      } catch (_) {}
      finally {
        finished = true;
        setIsReady(true);
      }
    })();
    const safety = setTimeout(() => { if (!finished) setIsReady(true); }, 2500);
    return () => clearTimeout(safety);
  }, []);

  useEffect(() => { saveData(STORAGE_KEYS.TASBEEH_COUNT, tasbeehCount); }, [tasbeehCount]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_TASBEEH, totalTasbeeh); }, [totalTasbeeh]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_READ_SECS, totalReadSecs); }, [totalReadSecs]);
  useEffect(() => { saveData(STORAGE_KEYS.TOTAL_AYAHS, totalAyahsRead); }, [totalAyahsRead]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_ENABLED, reminderEnabled); }, [reminderEnabled]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_INT, reminderIntervalMins); }, [reminderIntervalMins]);
  useEffect(() => { saveData(STORAGE_KEYS.REMINDER_DAILY, dailyReminderTime); }, [dailyReminderTime]);
  useEffect(() => { saveData(STORAGE_KEYS.AD_FREE, adFree); }, [adFree]);
  useEffect(() => { saveData(STORAGE_KEYS.ACTIVE_THEME, activeThemeId); }, [activeThemeId]);
  useEffect(() => { saveData(STORAGE_KEYS.UNLOCKED_IDS, unlockedIds); }, [unlockedIds]);
  useEffect(() => { saveData(STORAGE_KEYS.SUPPORT_DONE, supportDone); }, [supportDone]);
  useEffect(() => { saveData(STORAGE_KEYS.VIP_PURCHASED, vipPurchased); }, [vipPurchased]);
  useEffect(() => { saveData(STORAGE_KEYS.PURCHASED_IDS, purchasedIds); }, [purchasedIds]);

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

  useEffect(() => {
    const t = setTimeout(() => setScreen("ad"), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("لم يتم منح إذن الموقع — تُعرض مواقيت تقريبية لمكة المكرمة حتى تمنح الإذن");
          fetchPrayerTimes(21.3891, 39.8579);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 10000 });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        setQiblaAngle(calcQiblaAngle(latitude, longitude));
        fetchPrayerTimes(latitude, longitude);
      } catch (_) {
        setLocationError("تعذّر تحديد الموقع — تُعرض مواقيت تقريبية لمكة المكرمة حتى تُحل المشكلة");
        fetchPrayerTimes(21.3891, 39.8579);
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

  const tomorrowTimesRef = useRef(null);
  const fetchTomorrowPrayerTimes = useCallback(async (lat, lng) => {
    try {
      const tmr  = new Date(Date.now() + 86400000);
      const dd   = String(tmr.getDate()).padStart(2, "0");
      const mm   = String(tmr.getMonth() + 1).padStart(2, "0");
      const yyyy = tmr.getFullYear();
      const url  = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=5`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.code === 200 && json.data?.timings) {
        tomorrowTimesRef.current = json.data.timings.Fajr || null;
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchTomorrowPrayerTimes(userLocation.latitude, userLocation.longitude);
    } else {
      fetchTomorrowPrayerTimes(21.3891, 39.8579);
    }
    const t = setInterval(() => {
      if (userLocation) fetchTomorrowPrayerTimes(userLocation.latitude, userLocation.longitude);
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [userLocation, fetchTomorrowPrayerTimes]);

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
      const fajrTomorrow = tomorrowTimesRef.current
        ? parseTimeMins(tomorrowTimesRef.current)
        : parseTimeMins(times[0].time);
      next = { label: times[0].name, mins: 1440 - nowMins + fajrTomorrow };
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

  useEffect(() => {
    const subscription = Magnetometer.addListener((data) => {
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      const smoothed = smoothAngle(smoothedAngleRef.current, angle, 0.15);
      smoothedAngleRef.current = smoothed;
      setRealCompassDegree(Math.round(smoothed));
    });
    Magnetometer.setUpdateInterval(120);
    return () => {
      subscription && subscription.remove();
    };
  }, []);

  const effectiveCompass = realCompassDegree;
  const isAligned = Math.abs((effectiveCompass - qiblaAngle + 360) % 360) < 15;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlaying]);

  const playAzan = useCallback(async (prayerName) => {
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
  }, [sendNotif]);

  // يشغّل صوت الأذان فعليًا فقط إذا كان التطبيق مفتوحًا الآن (لأن تشغيل صوت طويل
  // بالخلفية يحتاج إعداد background audio منفصل خارج نطاق هذا التعديل).
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;

    const checkPrayer = () => {
      const now = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const tKey = todayKey();

      Object.keys(azanTriggeredRef.current).forEach((timeStr) => {
        if (azanTriggeredRef.current[timeStr] !== tKey) {
          delete azanTriggeredRef.current[timeStr];
        }
      });

      livePrayerTimes.forEach((p) => {
        const timeStr = p.time ? p.time.substring(0, 5) : "";
        if (timeStr === nowStr && azanTriggeredRef.current[timeStr] !== tKey) {
          azanTriggeredRef.current[timeStr] = tKey;
          saveData(STORAGE_KEYS.AZAN_FIRED_DATE, azanTriggeredRef.current);
          playAzan(p.name);
        }
      });
    };

    checkPrayer();
    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000;

    let timerId;
    const timeoutId = setTimeout(() => {
      checkPrayer();
      timerId = setInterval(checkPrayer, 60000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (timerId) clearInterval(timerId);
    };
  }, [azanOn, livePrayerTimes, playAzan]);

  // ─── إشعارات أذان حقيقية مجدولة (تعمل حتى لو التطبيق مغلق/بالخلفية) ───────
  // يلغي كل الإشعارات المجدولة سابقًا لأذان الصلاة، ثم يعيد جدولتها لكل صلاة
  // متبقية اليوم، بحيث يصل إشعار النظام في وقته الفعلي بدون الحاجة لفتح التطبيق.
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;
    let cancelled = false;

    (async () => {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const azanIds = scheduled
          .filter((n) => n.content?.data?.type === "azan")
          .map((n) => n.identifier);
        await Promise.all(azanIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
        if (cancelled) return;

        const now = new Date();
        for (const p of livePrayerTimes) {
          if (!p.time) continue;
          const mins = parseTimeMins(p.time);
          const fireDate = new Date();
          fireDate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
          if (fireDate <= now) continue;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🕌 أذان ${p.name}`,
              body: "حان الآن موعد الصلاة",
              sound: true,
              data: { type: "azan", prayer: p.name },
            },
            trigger: fireDate,
          });
        }
      } catch (_) {}
    })();

    return () => { cancelled = true; };
  }, [azanOn, livePrayerTimes]);

  useEffect(() => {
    if (salahReminderTimer.current) clearInterval(salahReminderTimer.current);
    if (!salahOn) return;
    const intervalMs = salahInt * 60 * 1000;
    salahReminderTimer.current = setInterval(() => {
      sendNotif("اللهم صلِّ وسلِّمْ على نبيِّنا محمد ﷺ");
    }, intervalMs);
    return () => { if (salahReminderTimer.current) clearInterval(salahReminderTimer.current); };
  }, [salahOn, salahInt, sendNotif]);

  const triggerReminder = useCallback(() => {
    const item = REMINDER_POOL[reminderPoolIdx.current % REMINDER_POOL.length];
    reminderPoolIdx.current += 1;
    setReminderContent(item);
    setReminderModal(true);
  }, []);

  useEffect(() => {
    if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    if (!reminderEnabled) return;
    reminderTimerRef.current = setInterval(triggerReminder, reminderIntervalMins * 60 * 1000);
    return () => { if (reminderTimerRef.current) clearInterval(reminderTimerRef.current); };
  }, [reminderEnabled, reminderIntervalMins, triggerReminder]);

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

  useEffect(() => {
    if (fastAlert) return;
    const t = setInterval(() => setDhikrIdx((p) => (p + 1) % DHIKR_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, [fastAlert]);

  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      if (azanRef.current)  azanRef.current.unloadAsync().catch(() => {});
    };
  }, []);

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
          await saveData(STORAGE_KEYS.VIP_PURCHASED,    vipPurchased);
          await saveData(STORAGE_KEYS.PURCHASED_IDS,    purchasedIds);
          await saveData(STORAGE_KEYS.AZAN_FIRED_DATE,  azanTriggeredRef.current);
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, [tasbeehCount, adFree, activeThemeId, unlockedIds, supportDone, totalTasbeeh, totalReadSecs, totalAyahsRead, reminderEnabled, reminderIntervalMins, dailyReminderTime, vipPurchased, purchasedIds]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeTab !== "home") { setActiveTab("home"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [activeTab]);

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
      sendNotif("✅ تم تطبيق " + getTheme(id).name);
    }
  };

  const confirmPurchase = async (id) => {
    if (purchaseInProgress) return false;
    setPurchaseInProgress(true);
    try {
      const result = await purchaseService.buy(id);
      if (!result.success) {
        sendNotif("❌ تعذّر إتمام الشراء، حاول مرة أخرى");
        return false;
      }
      const th     = getTheme(id);
      const newIds = [...new Set([...unlockedIds, id])];
      const newPurchased = [...new Set([...purchasedIds, id])];
      setUnlockedIds(newIds);
      setPurchasedIds(newPurchased);
      setActiveThemeId(id);
      if (id === "vip_royal") {
        setVipPurchased(true);
        setAdFree(true);
        setSupportDone(true);
      } else {
        setSupportDone(true);
      }
      sendNotif((result.demo ? "✅ (تجربة) تم فتح " : "✅ تم فتح ") + th.name + "!");
      return true;
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const submitThemePromo = (id, code) => {
    const normalized = (code || "").trim().toLowerCase();
    const valid = { royal_gold: "gold2025", sufi_purple: "purple2025", vip_royal: "vip2025" };
    if (normalized === valid[id]) {
      const newIds = [...new Set([...unlockedIds, id])];
      setUnlockedIds(newIds);
      setActiveThemeId(id);
      sendNotif("🎁 " + getTheme(id).name + " مفتوح!");
      return true;
    }
    return false;
  };

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
        setVipPurchased(true);
        setSupportDone(true);
        setSupportCodeUsed(true);
        setMasterMsg("❤️ حبيني وادعيلي");
        return;
      }
    } catch (_) {}
    setMasterMsg("❌ الكود غير صحيح");
  };

  const displayedPrayerTimes = livePrayerTimes || [
    { name: "الفجر",  time: "04:45" }, { name: "الشروق", time: "06:15" },
    { name: "الظهر",  time: "12:30" }, { name: "العصر",  time: "15:45" },
    { name: "المغرب", time: "18:30" }, { name: "العشاء", time: "20:00" },
  ];

  if (screen === "splash") {
    return (
      <SafeAreaProvider>
        <View style={styles.splashWrap}>
          <View style={styles.splashGlow} />
          <Text style={styles.splashEmoji}>☪️</Text>
          <Text style={styles.splashTitle}>مُصلِّي</Text>
          <Text style={styles.splashSub}>مساعدك القرآني الذكي</Text>
          <View style={styles.splashBarTrack}>
            <View style={styles.splashBarFill} />
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  if (screen === "ad") {
    return (
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    );
  }

  const NAV_TABS = [
    { id: "home",     icon: "home",     label: "الرئيسية"  },
    { id: "quran",    icon: "quran",    label: "القرآن"    },
    { id: "tasbeeh",  icon: "tasbeeh",  label: "التسبيح"   },
    { id: "qibla",    icon: "qibla",    label: "القبلة"    },
    { id: "azkar",    icon: "azkar",    label: "الأذكار"   },
    { id: "stats",    icon: "stats",    label: "الإحصاء"   },
    { id: "settings", icon: "settings", label: "الإعدادات" },
  ];

  return (
    <SafeAreaProvider>
      <View style={[styles.appRoot, { backgroundColor: T.bg }]}>

        {notifMsg ? (
          <View style={[styles.toast, { borderColor: T.accentBorder }]}>
            <Text style={styles.toastText}>{notifMsg}</Text>
          </View>
        ) : null}

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

        {floatW && (
          <DraggableTasbeehBubble T={T} count={tasbeehCount} onTap={handleTasbeeh} onClose={() => setFloatW(false)} />
        )}

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
              locationError={locationError}
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
              onReset={() => { setTasbeehCount(0); }}
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
              THEMES={THEMES}
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
              confirmPurchase={confirmPurchase}
              purchaseInProgress={purchaseInProgress}
              submitThemePromo={submitThemePromo}
              vipPurchased={vipPurchased}
              purchasedIds={purchasedIds}
              sendNotif={sendNotif}
              supportDone={supportDone}
              supportCodeUsed={supportCodeUsed}
              premiumMode={premiumMode}
              reminderEnabled={reminderEnabled}
              setReminderEnabled={setReminderEnabled}
              reminderIntervalMins={reminderIntervalMins}
              setReminderIntervalMins={setReminderIntervalMins}
              dailyReminderTime={dailyReminderTime}
              setDailyReminderTime={setDailyReminderTime}
            />
          )}
        </View>

        {!adFree && activeTab !== "quran" && (
          <View style={styles.bottomAd}>
            <Text style={styles.bottomAdText}>إعلان دعائي نظيف 📢</Text>
          </View>
        )}

        <View style={[styles.bottomNav, { borderTopColor: T.cardBorder, backgroundColor: "#070707" }]}>
          <View style={styles.bottomNavContent}>
            {NAV_TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={styles.navTabBtn} activeOpacity={0.7}>
                  <View style={[styles.navTabIconWrap, isActive && { backgroundColor: T.accentSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: T.accentBorder }]}>
                    <AppIcon name={t.icon} size={20} color={isActive ? T.accent : "#3a3a3a"} />
                  </View>
                  <Text style={[styles.navTabLabel, { color: isActive ? T.accent : "#3a3a3a", fontWeight: isActive ? "700" : "400" }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function DraggableTasbeehBubble({ T, count, onTap, onClose }) {
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
        if (totalMovement.current < 8) onTap();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatWidget,
        {
          backgroundColor: T.cardBg,
          borderColor: T.accent,
          shadowColor: T.accent,
          position: "absolute",
          zIndex: 500,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.floatWidgetInner}>
        <TouchableOpacity onPress={onClose} style={styles.floatCloseBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Text style={styles.floatCloseBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.floatWidgetEmoji}>📿</Text>
        <Text style={[styles.floatWidgetCount, { color: T.accent }]}>{count}</Text>
        <Text style={[styles.floatWidgetLabel, { color: T.accent }]}>تسبيح</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  appRoot:      { flex: 1, width: "100%", maxWidth: 430, alignSelf: "center" },
  screensWrap:  { flex: 1, paddingBottom: 80 },

  crashWrap:  { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 24 },
  crashEmoji: { fontSize: 48, marginBottom: 14 },
  crashTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  crashSub:   { color: "#888", fontSize: 13, textAlign: "center", marginBottom: 20 },
  crashBtn:   { backgroundColor: "#22c55e", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  crashBtnText: { color: "#000", fontSize: 14, fontWeight: "800" },

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

  toast:     { position: "absolute", top: 16, left: "50%", marginLeft: -100, width: 200, alignItems: "center", backgroundColor: "#111", borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, zIndex: 1500 },
  toastText: { color: "#e2e8f0", fontSize: 13, textAlign: "center" },

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
  floatCloseBtn:     { position: "absolute", top: -8, right: -8, backgroundColor: "#333", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  floatCloseBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  wordPopup:    { position: "absolute", top: "28%", left: "50%", marginLeft: -105, width: 210, backgroundColor: "#0d0d0d", borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", zIndex: 800 },
  wordPopupText:{ color: "#f0e6d3", fontSize: 32, marginBottom: 12 },
  soundWaveRow: { flexDirection: "row", alignItems: "center", gap: 3, height: 36, marginBottom: 8 },
  soundWaveBar: { width: 3, borderRadius: 2 },
  wordPopupSub: { color: "#666", fontSize: 12 },

  riRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  riLabel: { color: "#555", fontSize: 12 },
  riValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

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

  card:      { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 12 },
  cardTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "700", marginBottom: 12 },

  btn:     { borderWidth: 1, borderRadius: 20 },
  btnText: { fontWeight: "600" },

  bottomAd:     { backgroundColor: "#080808", borderTopWidth: 1, borderTopColor: "#111", paddingVertical: 7, alignItems: "center", position: "absolute", bottom: 82, left: 0, right: 0, zIndex: 90 },
  bottomAdText: { color: "#333", fontSize: 11 },
  bottomNav:        { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 100, paddingTop: 10, paddingBottom: 24 },
  bottomNavContent: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4 },
  navTabBtn:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navTabIconWrap:   { alignItems: "center", justifyContent: "center", minWidth: 36, height: 32 },
  navTabIcon:       { fontSize: 20 },
  navTabLabel:      { fontSize: 9, marginTop: 1, letterSpacing: 0.3 },
});
