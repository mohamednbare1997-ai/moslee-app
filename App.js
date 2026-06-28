/**
 * مُصلِّي — نسخة المتجر v1.0.0
 * Store-Ready: لا فوترة، لا مفتي، RTL مفروض، offline-safe، AppState flush
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Dimensions, Modal, Platform,
  AppState, I18nManager, BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── فرض RTL على جميع الأجهزة ────────────────────────────────────────────────
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── THEME DEFINITIONS (كل الثيمات مجانية في نسخة المتجر) ───────────────────
const THEMES = [
  {
    id: "royal_black", name: "الثيم الأسود الملكي", emoji: "🖤",
    accent: "#d4d4d8", accentSoft: "#ffffff14", accentBorder: "#ffffff28",
    bg: "#000", cardBg: "#0a0a0a", cardBorder: "#1e1e1e",
    ayahNumBg: "#1a1a1a", ayahNumColor: "#d4d4d8",
    grad: ["#0d0d0d", "#1c1c1c"], desc: "أناقة الأسود الكلاسيكية الصافية",
  },
  {
    id: "spiritual_green", name: "الثيم الأخضر الروحاني", emoji: "💚",
    accent: "#22c55e", accentSoft: "#22c55e1a", accentBorder: "#22c55e40",
    bg: "#000", cardBg: "#021a0a", cardBorder: "#0a3318",
    ayahNumBg: "#0a3318", ayahNumColor: "#22c55e",
    grad: ["#021a0a", "#0a3318"], desc: "خضرة الجنة وسكينة القلوب",
  },
  {
    id: "royal_gold", name: "الثيم الذهبي الملكي", emoji: "👑",
    accent: "#f59e0b", accentSoft: "#f59e0b1a", accentBorder: "#f59e0b40",
    bg: "#000", cardBg: "#120a00", cardBorder: "#2a1800",
    ayahNumBg: "#2a1800", ayahNumColor: "#f59e0b",
    grad: ["#120a00", "#2a1800"], desc: "فخامة الذهب وبهاء القرآن",
  },
  {
    id: "sufi_purple", name: "ثيم روحانية البنفسج", emoji: "🔮",
    accent: "#a855f7", accentSoft: "#a855f71a", accentBorder: "#a855f740",
    bg: "#000", cardBg: "#0d0518", cardBorder: "#1e0a35",
    ayahNumBg: "#1e0a35", ayahNumColor: "#a855f7",
    grad: ["#0d0518", "#1e0a35"], desc: "روحانية البنفسج وسكينة الليل",
  },
  {
    id: "vip_royal", name: "ثيم الملكي الفاخر", emoji: "💎",
    accent: "#ec4899", accentSoft: "#ec48991a", accentBorder: "#ec489940",
    bg: "#000", cardBg: "#150010", cardBorder: "#2d0025",
    ayahNumBg: "#2d0025", ayahNumColor: "#ec4899",
    grad: ["#150010", "#2d0025", "#0a0020"], desc: "ثيم فاخر بتصميم حصري",
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
  { day: "السبت", mins: 12, ayahs: 8 },
  { day: "الأحد", mins: 25, ayahs: 18 },
  { day: "الإثنين", mins: 8, ayahs: 5 },
  { day: "الثلاثاء", mins: 32, ayahs: 22 },
  { day: "الأربعاء", mins: 20, ayahs: 14 },
  { day: "الخميس", mins: 45, ayahs: 35 },
  { day: "الجمعة", mins: 60, ayahs: 50 },
];

const DHIKR_PHRASES = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ",
  "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ",
  "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
  "اللَّهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا",
];

// ─── AUDIO SOURCES ────────────────────────────────────────────────────────────
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

// ─── FALLBACK PRAYER TIMES (offline) ─────────────────────────────────────────
const FALLBACK_PRAYER_TIMES = [
  { name: "الفجر", time: "04:45" },
  { name: "الشروق", time: "06:15" },
  { name: "الظهر", time: "12:30" },
  { name: "العصر", time: "15:45" },
  { name: "المغرب", time: "18:30" },
  { name: "العشاء", time: "20:00" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }

function getHijriDate() {
  try {
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
    const months = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
    return { day, month, year, monthName: months[month - 1] || "" };
  } catch (_) {
    return { day: 1, month: 1, year: 1446, monthName: "محرم" };
  }
}

function getGregorianDate() {
  const now = new Date();
  const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return { dayName: days[now.getDay()], day: now.getDate(), month: months[now.getMonth()], year: now.getFullYear() };
}

function getSpecialFastingAlert(hijri) {
  const { day, month } = hijri;
  if (month === 1 && day === 9) return "تذكير: غداً صيام يوم عاشوراء — سنة مهجورة";
  if (month === 12 && day === 8) return "تذكير: غداً صيام يوم عرفة — يكفر سنتين";
  if (month === 10 && day >= 1 && day <= 5) return "تذكير: أنت في أيام صيام ستة شوال";
  if (month === 12 && day >= 1 && day <= 9) return "تذكير: العشر الأوائل من ذي الحجة — أيام العمل الصالح";
  return null;
}

function calcQiblaAngle(lat, lng) {
  const MECCA_LAT = 21.3891, MECCA_LNG = 39.8579;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function parseTimeMins(str) {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ─── ASYNC STORAGE KEYS ────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  THEME: "@musalli_theme",
  BOOKMARK: "@musalli_bookmark",
  TASBEEH: "@musalli_tasbeeh",
  STREAK: "@musalli_streak",
  LAST_OPEN_DATE: "@musalli_last_open",
  MORNING_C: "@musalli_morning_c",
  EVENING_C: "@musalli_evening_c",
  SLEEP_C: "@musalli_sleep_c",
  TRAVEL_C: "@musalli_travel_c",
  HOME_C: "@musalli_home_c",
  SUNNAH_C: "@musalli_sunnah_c",
  SETTINGS: "@musalli_settings",
};

// ─── SAFE STORAGE HELPERS ─────────────────────────────────────────────────────
async function safeGet(key, fallback) {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val === null) return fallback;
    return JSON.parse(val);
  } catch (_) { return fallback; }
}

async function safeSet(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
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
        <View style={[styles.pbarFill, { width: `${pct}%`, backgroundColor: c }]} />
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
        activeOpacity={0.8} onPress={() => onChange(!value)}
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
      activeOpacity={0.8} onPress={onPress}
      style={[styles.btn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder, paddingVertical: small ? 5 : 8, paddingHorizontal: small ? 12 : 18 }]}
    >
      <Text style={[styles.btnText, { color: T.accent, fontSize: small ? 11 : 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [activeTab, setActiveTab] = useState("home");
  const [fontSize, setFontSize] = useState(26);
  const [bookmark, setBookmark] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [wordPopup, setWordPopup] = useState(null);
  const [soundWave, setSoundWave] = useState(false);
  const [longModal, setLongModal] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tShake, setTShake] = useState(false);
  const [tFlash, setTFlash] = useState(false);
  const [floatW, setFloatW] = useState(false);
  const [countdown, setCountdown] = useState({ label: "الفجر", mins: 0, secs: 0 });
  const [streakDays, setStreakDays] = useState(0);

  // Azkar counters
  const [morningC, setMorningC] = useState(MORNING_AZKAR.map((a) => a.count));
  const [eveningC, setEveningC] = useState(EVENING_AZKAR.map((a) => a.count));
  const [sleepC, setSleepC] = useState(SLEEP_AZKAR.map((a) => a.count));
  const [travelC, setTravelC] = useState(TRAVEL_AZKAR.map((a) => a.count));
  const [homeC, setHomeC] = useState(HOME_AZKAR.map((a) => a.count));
  const [sunnahC, setSunnahC] = useState(SUNNAH_LIST.map((a) => a.count));
  const [azkarTab, setAzkarTab] = useState("morning");
  const [notifMsg, setNotifMsg] = useState("");
  const [dhikrIdx, setDhikrIdx] = useState(0);

  // GPS / Prayer / Qibla
  const [userLocation, setUserLocation] = useState(null);
  const [locationCity, setLocationCity] = useState("جارٍ التحديد...");
  const [livePrayerTimes, setLivePrayerTimes] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [qiblaAngle, setQiblaAngle] = useState(143);
  const [liveCompassAngle, setLiveCompassAngle] = useState(0);
  const [azanTriggered, setAzanTriggered] = useState({});

  // Settings
  const [azanOn, setAzanOn] = useState(true);
  const [salahOn, setSalahOn] = useState(true);
  const [salahInt, setSalahInt] = useState(30);
  const [preOn, setPreOn] = useState(true);
  const [autoAzkar, setAutoAzkar] = useState(true);
  const [travelOn, setTravelOn] = useState(false);
  const [fastOn, setFastOn] = useState(false);
  const [fastMT, setFastMT] = useState(true);
  const [fastWD, setFastWD] = useState(false);

  // Theme — كل الثيمات متاحة مجاناً
  const [activeThemeId, setActiveThemeId] = useState("spiritual_green");
  const [audioLoadingAyah, setAudioLoadingAyah] = useState(false);

  // Hydration flag
  const [hydrated, setHydrated] = useState(false);

  const soundRef = useRef(null);
  const azanRef = useRef(null);
  const salahReminderTimer = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const T = getTheme(activeThemeId);
  const hijri = getHijriDate();
  const greg = getGregorianDate();
  const fastAlert = getSpecialFastingAlert(hijri);

  // ── EFFECT: Hydrate from AsyncStorage ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [
          savedTheme, savedBookmark, savedTasbeeh, savedStreak,
          savedLastOpen, savedMorning, savedEvening, savedSleep,
          savedTravel, savedHome, savedSunnah, savedSettings,
        ] = await Promise.all([
          safeGet(STORAGE_KEYS.THEME, "spiritual_green"),
          safeGet(STORAGE_KEYS.BOOKMARK, null),
          safeGet(STORAGE_KEYS.TASBEEH, 0),
          safeGet(STORAGE_KEYS.STREAK, 0),
          safeGet(STORAGE_KEYS.LAST_OPEN_DATE, null),
          safeGet(STORAGE_KEYS.MORNING_C, MORNING_AZKAR.map((a) => a.count)),
          safeGet(STORAGE_KEYS.EVENING_C, EVENING_AZKAR.map((a) => a.count)),
          safeGet(STORAGE_KEYS.SLEEP_C, SLEEP_AZKAR.map((a) => a.count)),
          safeGet(STORAGE_KEYS.TRAVEL_C, TRAVEL_AZKAR.map((a) => a.count)),
          safeGet(STORAGE_KEYS.HOME_C, HOME_AZKAR.map((a) => a.count)),
          safeGet(STORAGE_KEYS.SUNNAH_C, SUNNAH_LIST.map((a) => a.count)),
          safeGet(STORAGE_KEYS.SETTINGS, null),
        ]);

        if (savedTheme) setActiveThemeId(savedTheme);
        if (savedBookmark !== null) setBookmark(savedBookmark);
        if (typeof savedTasbeeh === "number") setTasbeehCount(savedTasbeeh);

        // Streak calculation
        const todayStr = new Date().toDateString();
        let newStreak = savedStreak || 0;
        if (savedLastOpen) {
          const lastDate = new Date(savedLastOpen);
          const today = new Date();
          const diff = Math.floor((today - lastDate) / 86400000);
          if (diff === 0) { newStreak = savedStreak; }
          else if (diff === 1) { newStreak = savedStreak + 1; }
          else { newStreak = 1; }
        } else { newStreak = 1; }
        setStreakDays(newStreak);
        await safeSet(STORAGE_KEYS.STREAK, newStreak);
        await safeSet(STORAGE_KEYS.LAST_OPEN_DATE, todayStr);

        // Azkar counters — validate arrays
        const validateArr = (saved, defaultArr) =>
          Array.isArray(saved) && saved.length === defaultArr.length ? saved : defaultArr.map((a) => a.count);
        setMorningC(validateArr(savedMorning, MORNING_AZKAR));
        setEveningC(validateArr(savedEvening, EVENING_AZKAR));
        setSleepC(validateArr(savedSleep, SLEEP_AZKAR));
        setTravelC(validateArr(savedTravel, TRAVEL_AZKAR));
        setHomeC(validateArr(savedHome, HOME_AZKAR));
        setSunnahC(validateArr(savedSunnah, SUNNAH_LIST));

        if (savedSettings) {
          if (typeof savedSettings.azanOn === "boolean") setAzanOn(savedSettings.azanOn);
          if (typeof savedSettings.salahOn === "boolean") setSalahOn(savedSettings.salahOn);
          if (typeof savedSettings.salahInt === "number") setSalahInt(savedSettings.salahInt);
          if (typeof savedSettings.preOn === "boolean") setPreOn(savedSettings.preOn);
          if (typeof savedSettings.autoAzkar === "boolean") setAutoAzkar(savedSettings.autoAzkar);
          if (typeof savedSettings.fastOn === "boolean") setFastOn(savedSettings.fastOn);
          if (typeof savedSettings.fastMT === "boolean") setFastMT(savedSettings.fastMT);
          if (typeof savedSettings.fastWD === "boolean") setFastWD(savedSettings.fastWD);
        }
      } catch (_) {
        // Hydration failed — run with defaults, don't crash
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ── EFFECT: AppState — flush to AsyncStorage when going to background ─────
  useEffect(() => {
    if (!hydrated) return;
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (appStateRef.current === "active" && nextState.match(/inactive|background/)) {
        // Flush all persistent state
        try {
          await Promise.all([
            safeSet(STORAGE_KEYS.THEME, activeThemeId),
            safeSet(STORAGE_KEYS.BOOKMARK, bookmark),
            safeSet(STORAGE_KEYS.TASBEEH, tasbeehCount),
            safeSet(STORAGE_KEYS.STREAK, streakDays),
            safeSet(STORAGE_KEYS.MORNING_C, morningC),
            safeSet(STORAGE_KEYS.EVENING_C, eveningC),
            safeSet(STORAGE_KEYS.SLEEP_C, sleepC),
            safeSet(STORAGE_KEYS.TRAVEL_C, travelC),
            safeSet(STORAGE_KEYS.HOME_C, homeC),
            safeSet(STORAGE_KEYS.SUNNAH_C, sunnahC),
            safeSet(STORAGE_KEYS.SETTINGS, { azanOn, salahOn, salahInt, preOn, autoAzkar, fastOn, fastMT, fastWD }),
          ]);
        } catch (_) {}
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [
    hydrated, activeThemeId, bookmark, tasbeehCount, streakDays,
    morningC, eveningC, sleepC, travelC, homeC, sunnahC,
    azanOn, salahOn, salahInt, preOn, autoAzkar, fastOn, fastMT, fastWD,
  ]);

  // ── EFFECT: Persist theme on change ──────────────────────────────────────
  useEffect(() => {
    if (hydrated) safeSet(STORAGE_KEYS.THEME, activeThemeId);
  }, [activeThemeId, hydrated]);

  // ── EFFECT: Persist bookmark ──────────────────────────────────────────────
  useEffect(() => {
    if (hydrated) safeSet(STORAGE_KEYS.BOOKMARK, bookmark);
  }, [bookmark, hydrated]);

  // ── EFFECT: Splash → home ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setScreen("home"), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── EFFECT: Audio session ─────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  // ── EFFECT: GPS + Prayer Times ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationCity("القاهرة، مصر");
          await fetchPrayerTimes(30.0444, 31.2357);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (rev && rev.length > 0) {
            const r = rev[0];
            setLocationCity(`${r.city || r.subregion || r.region || ""}، ${r.country || ""}`);
          }
        } catch (_) { setLocationCity("موقعك الحالي"); }
        setQiblaAngle(calcQiblaAngle(latitude, longitude));
        await fetchPrayerTimes(latitude, longitude);
      } catch (_) {
        setLocationCity("القاهرة، مصر");
        await fetchPrayerTimes(30.0444, 31.2357);
      }
    })();
  }, []);

  // ── FUNCTION: Fetch prayer times — fully offline-safe ─────────────────────
  const fetchPrayerTimes = useCallback(async (lat, lng) => {
    setPrayerLoading(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=5`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const json = await res.json();
      if (json.code === 200 && json.data?.timings) {
        const t = json.data.timings;
        setLivePrayerTimes([
          { name: "الفجر", time: t.Fajr },
          { name: "الشروق", time: t.Sunrise },
          { name: "الظهر", time: t.Dhuhr },
          { name: "العصر", time: t.Asr },
          { name: "المغرب", time: t.Maghrib },
          { name: "العشاء", time: t.Isha },
        ]);
      } else {
        setLivePrayerTimes(FALLBACK_PRAYER_TIMES);
      }
    } catch (_) {
      // Network error / timeout / offline → use fallback silently
      setLivePrayerTimes(FALLBACK_PRAYER_TIMES);
    } finally {
      setPrayerLoading(false);
    }
  }, []);

  // ── FUNCTION: Compute countdown ───────────────────────────────────────────
  const computeCountdown = useCallback((times) => {
    if (!times || times.length === 0) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    let next = null;
    for (const p of times) {
      const pm = parseTimeMins(p.time);
      if (pm > nowMins) { next = { label: p.name, diffMins: pm - nowMins }; break; }
    }
    if (!next) {
      const pm = parseTimeMins(times[0].time);
      next = { label: times[0].name, diffMins: 1440 - nowMins + pm };
    }
    const totalSecs = Math.max(0, Math.round(next.diffMins * 60));
    return { label: next.label, mins: Math.floor(totalSecs / 60), secs: totalSecs % 60 };
  }, []);

  // ── EFFECT: Pre-prayer alert (15 minutes before) ──────────────────────────
  // Lightweight: checks every 30s, no heavy scheduling, battery-friendly
  useEffect(() => {
    if (!preOn) return;
    const timesToUse = livePrayerTimes || FALLBACK_PRAYER_TIMES;
    const interval = setInterval(() => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      for (const p of timesToUse) {
        const pm = parseTimeMins(p.time);
        const diff = pm - nowMins;
        if (diff === 15) {
          sendNotif(`⏰ تنبيه: صلاة ${p.name} بعد 15 دقيقة`);
          break;
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [preOn, livePrayerTimes]);

  // ── EFFECT: Live countdown ticker ─────────────────────────────────────────
  useEffect(() => {
    const timesToUse = livePrayerTimes || FALLBACK_PRAYER_TIMES;
    const tick = () => { const r = computeCountdown(timesToUse); if (r) setCountdown(r); };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [livePrayerTimes, computeCountdown]);

  // ── EFFECT: Simulated compass ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setLiveCompassAngle((p) => (p + 1.5) % 360), 80);
    return () => clearInterval(t);
  }, []);

  const effectiveCompass = liveCompassAngle;
  const isAligned = Math.abs((effectiveCompass - qiblaAngle + 360) % 360) < 15;

  // ── EFFECT: Quran audio ───────────────────────────────────────────────────
  useEffect(() => {
    if (!audioPlaying) {
      soundRef.current?.stopAsync().catch(() => {});
      return;
    }
    let cancelled = false;
    const playAyah = async (idx) => {
      if (cancelled || idx >= FATIHA.length) { setAudioPlaying(false); setCurrentAyah(0); return; }
      setCurrentAyah(idx);
      setAudioLoadingAyah(true);
      try {
        await soundRef.current?.unloadAsync();
        const { sound } = await Audio.Sound.createAsync(
          { uri: AUDIO_SOURCES.fatiha[idx] }, { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = sound;
        setAudioLoadingAyah(false);
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
      soundRef.current?.stopAsync().catch(() => {});
    };
  }, [audioPlaying]);

  // ── EFFECT: Azan trigger ──────────────────────────────────────────────────
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;
    const interval = setInterval(() => {
      const now = new Date();
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
      await azanRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: AUDIO_SOURCES.azan }, { shouldPlay: true, volume: 1.0 }
      );
      azanRef.current = sound;
      sendNotif(`🕌 أذان ${prayerName}`);
    } catch (_) { sendNotif(`🕌 حان وقت أذان ${prayerName}`); }
  };

  // ── EFFECT: Salah reminder — lightweight ─────────────────────────────────
  useEffect(() => {
    if (salahReminderTimer.current) clearInterval(salahReminderTimer.current);
    if (!salahOn) return;
    salahReminderTimer.current = setInterval(() => {
      sendNotif("اللهم صلِّ وسلِّمْ على نبيِّنا محمد ﷺ");
    }, salahInt * 60 * 1000);
    return () => { if (salahReminderTimer.current) clearInterval(salahReminderTimer.current); };
  }, [salahOn, salahInt]);

  // ── EFFECT: Dhikr rotation ────────────────────────────────────────────────
  useEffect(() => {
    if (fastAlert) return;
    const t = setInterval(() => setDhikrIdx((p) => (p + 1) % DHIKR_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, [fastAlert]);

  // ── EFFECT: Cleanup audio ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      azanRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── EFFECT: Hardware back ─────────────────────────────────────────────────
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

  const handleTasbeeh = () => {
    const n = tasbeehCount + 1;
    setTasbeehCount(n);
    // Persist immediately on each tap (debounced by OS write coalescing)
    safeSet(STORAGE_KEYS.TASBEEH, n);
    setTShake(true);
    setTimeout(() => setTShake(false), 300);
    if (n === 33 || n === 100) { setTFlash(true); setTimeout(() => setTFlash(false), 1000); }
  };

  const handleWordPress = (w) => { setSoundWave(true); setWordPopup(w); setTimeout(() => { setSoundWave(false); setWordPopup(null); }, 2500); };
  const handleWordLong = (w) => setLongModal(w);
  const decrement = (arr, setArr, idx) => { const next = [...arr]; if (next[idx] > 0) next[idx]--; setArr(next); };

  const displayedPrayerTimes = livePrayerTimes || FALLBACK_PRAYER_TIMES;

  // ── SPLASH ────────────────────────────────────────────────────────────────
  if (screen === "splash") {
    return (
      <View style={styles.splashWrap}>
        <View style={styles.splashGlow} />
        <Text style={styles.splashEmoji}>☪️</Text>
        <Text style={styles.splashTitle}>مُصلِّي</Text>
        <Text style={styles.splashSub}>مساعدك القرآني الذكي</Text>
        <View style={styles.splashBarTrack}><View style={styles.splashBarFill} /></View>
      </View>
    );
  }

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
      {/* Toast */}
      {notifMsg ? (
        <View style={[styles.toast, { borderColor: T.accentBorder }]}>
          <Text style={styles.toastText}>{notifMsg}</Text>
        </View>
      ) : null}

      {/* Floating tasbeeh widget */}
      {floatW && (
        <TouchableOpacity
          onPress={handleTasbeeh}
          style={[styles.floatWidget, { backgroundColor: T.cardBg, borderColor: T.accent, shadowColor: T.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.floatWidgetEmoji}>📿</Text>
          <Text style={[styles.floatWidgetCount, { color: T.accent }]}>{tasbeehCount}</Text>
          <Text style={[styles.floatWidgetLabel, { color: T.accent }]}>تسبيح</Text>
        </TouchableOpacity>
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

      {/* Screens */}
      <View style={styles.screensWrap}>
        {activeTab === "home" && (
          <HomeScreen
            T={T} bookmark={bookmark} sendNotif={sendNotif} setActiveTab={setActiveTab}
            dhikrIdx={dhikrIdx} fastAlert={fastAlert} hijri={hijri} greg={greg}
            countdown={countdown} prayerTimes={displayedPrayerTimes}
            locationCity={locationCity} prayerLoading={prayerLoading} streakDays={streakDays}
          />
        )}
        {activeTab === "quran" && (
          <QuranScreen
            T={T} fontSize={fontSize} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            currentAyah={currentAyah} setCurrentAyah={setCurrentAyah}
            audioPlaying={audioPlaying} setAudioPlaying={setAudioPlaying}
            bookmark={bookmark} setBookmark={setBookmark}
            onWordPress={handleWordPress} onWordLong={handleWordLong}
            audioLoadingAyah={audioLoadingAyah}
          />
        )}
        {activeTab === "tasbeeh" && (
          <TasbeehScreen
            T={T} count={tasbeehCount} onTap={handleTasbeeh}
            onReset={() => { setTasbeehCount(0); safeSet(STORAGE_KEYS.TASBEEH, 0); }}
            shake={tShake} flash={tFlash} floatW={floatW} setFloatW={setFloatW}
            sendNotif={sendNotif}
          />
        )}
        {activeTab === "qibla" && (
          <QiblaScreen
            T={T} compassAngle={effectiveCompass} isAligned={isAligned}
            qiblaAngle={qiblaAngle} locationCity={locationCity} userLocation={userLocation}
          />
        )}
        {activeTab === "azkar" && (
          <AzkarScreen
            T={T} azkarTab={azkarTab} setAzkarTab={setAzkarTab}
            morningC={morningC} setMorningC={setMorningC}
            eveningC={eveningC} setEveningC={setEveningC}
            sleepC={sleepC} setSleepC={setSleepC}
            travelC={travelC} setTravelC={setTravelC}
            homeC={homeC} setHomeC={setHomeC}
            sunnahC={sunnahC} setSunnahC={setSunnahC}
            decrement={decrement}
          />
        )}
        {activeTab === "stats" && <StatsScreen T={T} streakDays={streakDays} tasbeehCount={tasbeehCount} />}
        {activeTab === "settings" && (
          <SettingsScreen
            T={T}
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
            onSelectTheme={(id) => { setActiveThemeId(id); sendNotif("✅ تم تطبيق " + getTheme(id).name); }}
            sendNotif={sendNotif}
          />
        )}
      </View>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { borderTopColor: T.cardBorder, backgroundColor: "#070707" }]}>
        <View style={styles.bottomNavContent}>
          {NAV_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={styles.navTabBtn} activeOpacity={0.7}>
                <View style={[styles.navTabIconWrap, isActive && { backgroundColor: T.accentSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.accentBorder }]}>
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

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ T, bookmark, sendNotif, setActiveTab, dhikrIdx, fastAlert, hijri, greg, countdown, prayerTimes, locationCity, prayerLoading, streakDays }) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.homeHeader, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
        <Text style={styles.homeHeaderGreg}>{greg.dayName}، {greg.day} {greg.month} {greg.year}</Text>
        <View style={styles.homeHeaderRow}>
          <Text style={styles.homeHeaderTitle}>مُصلِّي</Text>
          <Text style={[styles.homeHeaderHijri, { color: T.accent }]}>{hijri.day} {hijri.monthName} {hijri.year} هـ</Text>
        </View>
        {locationCity ? <Text style={[styles.homeHeaderCity, { color: T.accent }]}>📍 {locationCity}</Text> : null}
        {streakDays > 0 && (
          <Text style={[styles.streakBadge, { color: T.accent }]}>🔥 {streakDays} أيام متتالية</Text>
        )}
      </View>

      <View style={[styles.dhikrBanner, { backgroundColor: fastAlert ? "#1a0e00" : T.cardBg, borderBottomColor: fastAlert ? "#f59e0b44" : T.cardBorder }]}>
        {fastAlert
          ? <Text style={styles.fastAlertText}>🌟 {fastAlert}</Text>
          : <Text style={[styles.dhikrText, { color: T.accent }]}>{DHIKR_PHRASES[dhikrIdx]}</Text>}
      </View>

      <View style={[styles.countdownRow, { backgroundColor: T.cardBg, borderBottomColor: T.cardBorder }]}>
        <Text style={styles.countdownLabel}>الوقت المتبقي لأذان {countdown.label}</Text>
        <Text style={[styles.countdownVal, { color: T.accent, writingDirection: "ltr" }]}>
          {pad(countdown.mins)}:{pad(countdown.secs)}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.prayerStrip, { borderBottomColor: T.cardBorder }]}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
      >
        {prayerLoading
          ? <View style={{ paddingVertical: 14, paddingHorizontal: 10 }}><Text style={{ color: "#555", fontSize: 12 }}>⏳ جارٍ تحميل مواقيت الصلاة...</Text></View>
          : prayerTimes.map((p) => (
            <View key={p.name} style={[styles.prayerChip, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <Text style={styles.prayerChipName}>{p.name}</Text>
              <Text style={[styles.prayerChipTime, { color: T.accent }]}>{p.time ? p.time.substring(0, 5) : "--:--"}</Text>
            </View>
          ))
        }
      </ScrollView>

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

      <View style={styles.homeGrid}>
        {[
          { icon: "📖", label: "القرآن الكريم", sub: "سورة الفاتحة", tab: "quran" },
          { icon: "📿", label: "المسبحة", sub: "عداد التسبيح", tab: "tasbeeh" },
          { icon: "🧭", label: "اتجاه القبلة", sub: "مكة المكرمة", tab: "qibla" },
          { icon: "🤲", label: "الأذكار والسنن", sub: "أذكار الصباح", tab: "azkar" },
        ].map((c) => (
          <TouchableOpacity key={c.label} activeOpacity={0.85} onPress={() => setActiveTab(c.tab)}
            style={[styles.homeGridCard, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
            <Text style={styles.homeGridIcon}>{c.icon}</Text>
            <Text style={styles.homeGridLabel}>{c.label}</Text>
            <Text style={styles.homeGridSub}>{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card T={T} title="📊 إنجاز اليوم">
        <PBar T={T} label="أذكار الصباح" pct={75} />
        <PBar T={T} label="أذكار المساء" pct={30} color="#3b82f6" />
        <PBar T={T} label="السنن اليومية" pct={50} color="#f59e0b" />
      </Card>

      <Card T={T} title="⏰ تنبيه الصلاة القادمة">
        <Text style={styles.nextPrayerSub}>صلاة {countdown.label} — متبقي {countdown.mins} دقيقة</Text>
        <TouchableOpacity
          style={[styles.nextPrayerBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
          onPress={() => sendNotif(`🔔 تذكير بصلاة ${countdown.label}!`)}
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
  const tap = (w) => { timerRef.current = setTimeout(() => { timerRef.current = null; onWordLong(w); }, 600); };
  const release = (w) => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; onWordPress(w); } };
  const filtered = searchQuery ? FATIHA.filter((a) => a.text.includes(searchQuery)) : FATIHA;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.quranHeader, { borderBottomColor: T.cardBorder }]}>
        <Text style={styles.quranHeaderTitle}>سورة الفاتحة</Text>
        <Text style={styles.quranHeaderSub}>7 آيات — مكية — الجزء 1</Text>
      </View>

      <View style={[styles.quranSearchRow, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
        <Text style={styles.quranSearchIcon}>🔍</Text>
        <TextInput style={styles.quranSearchInput} placeholder="ابحث في القرآن الكريم..." placeholderTextColor="#555"
          textAlign="right" value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")}><Text style={styles.quranSearchClear}>✕</Text></TouchableOpacity> : null}
      </View>

      <View style={styles.quranBookmarkRow}>
        <TouchableOpacity style={[styles.quranBookmarkBtn, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}
          onPress={() => setBookmark(currentAyah + 1)}>
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

      <View style={[styles.audioPlayer, { borderColor: T.cardBorder }]}>
        <TouchableOpacity style={styles.audioBtnSmall} onPress={() => setCurrentAyah((p) => Math.max(0, p - 1))}>
          <Text style={styles.audioBtnSmallText}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.audioBtnMain, { backgroundColor: audioPlaying ? "#ef4444" : T.accent }]} onPress={() => setAudioPlaying((p) => !p)}>
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
  const ring = count % 100;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(scaleAnim, { toValue: shake ? 0.93 : 1, duration: 150, useNativeDriver: true }).start();
  }, [shake]);
  const radius = 60, circumference = 2 * Math.PI * radius;
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📿 المسبحة الإلكترونية" T={T} />
      <View style={styles.tasbeehCenter}>
        <Text style={styles.tasbeehStage}>
          {count < 33 ? "— سبحان الله —" : count < 66 ? "— الحمد لله —" : count < 100 ? "— الله أكبر —" : "🎉 اكتملت المئة!"}
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity activeOpacity={0.9} onPress={onTap}
            style={[styles.tasbeehBtn, { borderColor: flash ? T.accent : "#222", backgroundColor: flash ? T.accentSoft : "#090909" }]}>
            <Text style={[styles.tasbeehCount, { color: flash ? T.accent : "#fff" }]}>{count}</Text>
            <Text style={styles.tasbeehTapHint}>اضغط للعد</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.tasbeehRingWrap}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle cx={70} cy={70} r={radius} stroke="#111" strokeWidth={10} fill="none" />
            <Circle cx={70} cy={70} r={radius} stroke={T.accent} strokeWidth={10} fill="none"
              strokeDasharray={`${circumference}`} strokeDashoffset={`${circumference * (1 - ring / 100)}`}
              strokeLinecap="round" rotation="-90" origin="70, 70" />
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
      <Card T={T} title="خيارات">
        <Toggle T={T} label="🫧 فقاعة التسبيح العائمة" sub="تظهر فوق جميع التطبيقات"
          value={floatW} onChange={(v) => { setFloatW(v); sendNotif(v ? "✅ فقاعة التسبيح مفعّلة" : "⏹ الفقاعة موقوفة"); }} />
      </Card>
    </ScrollView>
  );
}

// ─── QIBLA SCREEN ─────────────────────────────────────────────────────────────
function QiblaScreen({ T, compassAngle, isAligned, qiblaAngle, locationCity, userLocation }) {
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
            : <Text style={styles.qiblaNotAligned}>🔄 أدر الجهاز نحو القبلة</Text>}
          <Text style={styles.qiblaAngle}>الزاوية الحالية: {Math.round(compassAngle)}° | القبلة: {Math.round(qiblaAngle)}°</Text>
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
            <TouchableOpacity key={tab.id} onPress={() => setAzkarTab(tab.id)}
              style={[styles.azkarGridBtn, { backgroundColor: isActive ? T.accentSoft : "#0a0a0a", borderColor: isActive ? T.accent : "#1a1a1a" }]}>
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
                <TouchableOpacity style={[styles.azkarRecordBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                  onPress={() => decrement(counts, setCounts, idx)}>
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

// ─── STATS SCREEN ─────────────────────────────────────────────────────────────
function StatsScreen({ T, streakDays, tasbeehCount }) {
  const maxMins = Math.max(...WEEKLY_STATS.map((d) => d.mins));
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📊 إحصاءات القراءة" sub="هذا الأسبوع" T={T} />
      <View style={styles.statsGrid}>
        {[
          { icon: "⏱️", val: "3.2", unit: "ساعة", label: "إجمالي القراءة", color: T.accent },
          { icon: "📖", val: "152", unit: "آية", label: "آيات مقروءة", color: "#3b82f6" },
          { icon: "🔥", val: String(streakDays), unit: "أيام", label: "أيام متتالية", color: "#f59e0b" },
          { icon: "📿", val: String(tasbeehCount), unit: "تسبيحة", label: "إجمالي التسبيح", color: "#8b5cf6" },
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
          {WEEKLY_STATS.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: T.accent }]}>{d.mins}</Text>
              <View style={[styles.barFill, { height: (d.mins / maxMins) * 82, backgroundColor: T.accentSoft, borderTopColor: T.accent }]} />
              <Text style={styles.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card T={T} title="آيات مقروءة يومياً">
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
          { icon: "🌟", label: "حافظ الفاتحة", done: true, desc: "قرأت سورة الفاتحة كاملة" },
          { icon: "📿", label: "100 تسبيحة في يوم", done: tasbeehCount >= 100, desc: "سبّحت 100 مرة في يوم واحد" },
          { icon: "🔥", label: "7 أيام متتالية", done: streakDays >= 7, desc: "استخدمت التطبيق 7 أيام متتالية" },
          { icon: "📖", label: "ختمة كاملة", done: false, desc: "اقرأ القرآن كاملاً" },
          { icon: "🌙", label: "أذكار النوم 30 يوماً", done: false, desc: "أكمل أذكار النوم 30 يوماً" },
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
  T, azanOn, setAzanOn, salahOn, setSalahOn, salahInt, setSalahInt,
  preOn, setPreOn, autoAzkar, setAutoAzkar, travelOn, setTravelOn,
  fastOn, setFastOn, fastMT, setFastMT, fastWD, setFastWD,
  activeThemeId, onSelectTheme, sendNotif,
}) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="⚙️ الإعدادات" T={T} />

      {/* Theme selector — كل الثيمات مجانية */}
      <Card T={T} title="🎨 الثيمات">
        {THEMES.map((th) => {
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
              <TouchableOpacity
                style={[styles.themeActionBtn, { backgroundColor: active ? th.accentSoft : "#111", borderColor: active ? th.accent : "#222" }]}
                onPress={() => onSelectTheme(th.id)}
              >
                <Text style={[styles.themeActionText, { color: active ? th.accent : "#666", fontWeight: active ? "700" : "400" }]}>
                  {active ? "✅ مفعّل" : "تطبيق"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </Card>

      {/* Azan & alerts */}
      <Card T={T} title="🔊 الأذان والتنبيهات">
        <Toggle T={T} label="📡 أذان الصلوات الخمس" sub="صوت الأذان عند وقت كل صلاة" value={azanOn} onChange={setAzanOn} />
        <Toggle T={T} label="🕌 الصلاة على النبي ﷺ" sub="تنبيه صوتي دوري" value={salahOn} onChange={setSalahOn} />
        {salahOn && (
          <View style={styles.salahIntWrap}>
            <Text style={styles.salahIntLabel}>كل كم دقيقة؟</Text>
            <View style={styles.salahIntRow}>
              {[15, 30, 60].map((v) => (
                <TouchableOpacity key={v}
                  style={[styles.salahIntBtn, { backgroundColor: salahInt === v ? T.accentSoft : "#111", borderColor: salahInt === v ? T.accent : "#222" }]}
                  onPress={() => setSalahInt(v)}>
                  <Text style={[styles.salahIntBtnText, { color: salahInt === v ? T.accent : "#555" }]}>{v} دقيقة</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Toggle T={T} label="⏰ تنبيه قبل الصلاة" sub="تحذير 15 دقيقة قبل كل أذان" value={preOn} onChange={setPreOn} />
        <Toggle T={T} label="🤲 أذكار تلقائية" sub="صباح 7:00 ومغرب كل يوم" value={autoAzkar} onChange={setAutoAzkar} />
        <Toggle T={T} label="🚗 مُذكِّر السفر" sub="تشغيل تلقائي عند التنقل" value={travelOn} onChange={setTravelOn} />
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
        <RI label="الإصدار" value="1.0.0" />
        <RI label="المطور" value="فريق مُصلِّي" />
        <RI label="البيانات القرآنية" value="محققة ومعتمدة 100%" />
        <RI label="مواقيت الصلاة" value="Aladhan API — طريقة الهيئة المصرية" />
      </Card>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  appRoot: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  screensWrap: { flex: 1, paddingBottom: 80 },

  splashWrap: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  splashGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: "#22c55e1a", top: "28%" },
  splashEmoji: { fontSize: 72, marginBottom: 4 },
  splashTitle: { color: "#fff", fontSize: 46, fontWeight: "900", letterSpacing: 3 },
  splashSub: { color: "#666", fontSize: 15, marginTop: 6 },
  splashBarTrack: { width: 140, height: 3, backgroundColor: "#111", borderRadius: 2, marginTop: 44, overflow: "hidden" },
  splashBarFill: { height: "100%", width: "70%", backgroundColor: "#22c55e" },

  toast: { position: "absolute", top: 16, alignSelf: "center", minWidth: 200, alignItems: "center", backgroundColor: "#111", borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, zIndex: 1500 },
  toastText: { color: "#e2e8f0", fontSize: 13, textAlign: "center" },

  floatWidget: { position: "absolute", top: 120, right: 14, width: 76, height: 76, borderRadius: 38, borderWidth: 2, zIndex: 500, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10 },
  floatWidgetLabel: { fontSize: 10, marginTop: 1 },
  floatWidgetEmoji: { fontSize: 22 },
  floatWidgetCount: { fontSize: 18, fontWeight: "900" },

  wordPopup: { position: "absolute", top: "28%", alignSelf: "center", width: 210, backgroundColor: "#0d0d0d", borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", zIndex: 800 },
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
  homeHeaderHijri: { fontSize: 12 },
  homeHeaderCity: { fontSize: 11, marginTop: 3 },
  streakBadge: { fontSize: 12, marginTop: 4, fontWeight: "700" },

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

  tasbeehCenter: { alignItems: "center", paddingVertical: 24 },
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
  achievementLabel: { flex: 1, fontSize: 13 },

  themeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  themeEmojiBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  themeEmoji: { fontSize: 20 },
  themeName: { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },
  themeDesc: { color: "#555", fontSize: 11, marginTop: 1 },
  themeActionBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  themeActionText: { fontSize: 11 },

  salahIntWrap: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  salahIntLabel: { color: "#888", fontSize: 12, marginBottom: 8 },
  salahIntRow: { flexDirection: "row", gap: 8 },
  salahIntBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center" },
  salahIntBtnText: { fontSize: 12 },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 100, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 28 : 14 },
  bottomNavContent: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4 },
  navTabBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navTabIconWrap: { alignItems: "center", justifyContent: "center", minWidth: 36, height: 32 },
  navTabIcon: { fontSize: 18 },
  navTabLabel: { fontSize: 9, marginTop: 1, letterSpacing: 0.2 },

  achievementRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
