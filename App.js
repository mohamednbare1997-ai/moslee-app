/**
 * مُصلِّي — تطبيق إسلامي متكامل
 * الإصدار 4.0.0
 * المصادر: القرآن الكريم — Tanzil.net | مواقيت الصلاة — Aladhan API | اتجاه القبلة — الهيئة العامة للمساحة
 *
 * ملاحظة: يتطلب هذا الملف التبعيات التالية في package.json:
 *   expo-location, expo-av, expo-crypto, react-native-iap,
 *   react-native-svg, expo-linear-gradient, @react-native-async-storage/async-storage
 *
 * لتفعيل الفقاعة خارج التطبيق (Android):
 *   أضف في AndroidManifest.xml:
 *     <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
 *     <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Dimensions, Modal, Platform,
  I18nManager, PanResponder, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackHandler } from "react-native";

// ── تفعيل RTL عالمياً ──────────────────────────────────────────────────────
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

const { width: SW, height: SH } = Dimensions.get("window");

// ── IAP: معرفات المنتجات (استبدل بمعرفاتك الحقيقية من Google Play / App Store) ──
const IAP_SKUS = {
  royal_gold:   "com.musalli.theme.royal_gold",
  sufi_purple:  "com.musalli.theme.sufi_purple",
  vip_royal:    "com.musalli.vip_royal",
};

// ── محاولة استيراد react-native-iap بشكل آمن (لا ينهار لو غير مثبّت) ───────
let RNIap = null;
try { RNIap = require("react-native-iap"); } catch (_) {}

// ─── الثيمات ─────────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: "royal_black", name: "الأسود الملكي", price: "مجاني", free: true, emoji: "🖤",
    accent: "#d4d4d8", accentSoft: "#ffffff14", accentBorder: "#ffffff28",
    bg: "#000", cardBg: "#0a0a0a", cardBorder: "#1e1e1e",
    ayahNumBg: "#1a1a1a", ayahNumColor: "#d4d4d8",
    grad: ["#0d0d0d", "#1c1c1c"], desc: "أناقة الأسود الكلاسيكية الصافية",
  },
  {
    id: "spiritual_green", name: "الأخضر الروحاني", price: "مجاني", free: true, emoji: "💚",
    accent: "#22c55e", accentSoft: "#22c55e1a", accentBorder: "#22c55e40",
    bg: "#000", cardBg: "#021a0a", cardBorder: "#0a3318",
    ayahNumBg: "#0a3318", ayahNumColor: "#22c55e",
    grad: ["#021a0a", "#0a3318"], desc: "خضرة الجنة وسكينة القلوب",
  },
  {
    id: "royal_gold", name: "الذهبي الملكي", price: "0.99$", free: false, emoji: "👑",
    accent: "#f59e0b", accentSoft: "#f59e0b1a", accentBorder: "#f59e0b40",
    bg: "#000", cardBg: "#120a00", cardBorder: "#2a1800",
    ayahNumBg: "#2a1800", ayahNumColor: "#f59e0b",
    grad: ["#120a00", "#2a1800"], desc: "فخامة الذهب وبهاء القرآن",
  },
  {
    id: "sufi_purple", name: "البنفسجي الصوفي", price: "0.99$", free: false, emoji: "🔮",
    accent: "#a855f7", accentSoft: "#a855f71a", accentBorder: "#a855f740",
    bg: "#000", cardBg: "#0d0518", cardBorder: "#1e0a35",
    ayahNumBg: "#1e0a35", ayahNumColor: "#a855f7",
    grad: ["#0d0518", "#1e0a35"], desc: "روحانية البنفسج وسكينة الليل",
  },
  {
    id: "vip_royal", name: "باقة VIP الملكية", price: "4.99$", free: false, emoji: "💎",
    accent: "#ec4899", accentSoft: "#ec48991a", accentBorder: "#ec489940",
    bg: "#000", cardBg: "#150010", cardBorder: "#2d0025",
    ayahNumBg: "#2d0025", ayahNumColor: "#ec4899",
    grad: ["#150010", "#2d0025", "#0a0020"],
    desc: "جميع الثيمات + إزالة الإعلانات + كل المميزات",
  },
];

const getTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES[1];

// ─── بيانات القرآن (الفاتحة — محققة ومعتمدة) ─────────────────────────────────
const FATIHA = [
  { id: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",      words: ["بِسْمِ","ٱللَّهِ","ٱلرَّحْمَـٰنِ","ٱلرَّحِيمِ"] },
  { id: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",         words: ["ٱلْحَمْدُ","لِلَّهِ","رَبِّ","ٱلْعَـٰلَمِينَ"] },
  { id: 3, text: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",                       words: ["ٱلرَّحْمَـٰنِ","ٱلرَّحِيمِ"] },
  { id: 4, text: "مَـٰلِكِ يَوْمِ ٱلدِّينِ",                       words: ["مَـٰلِكِ","يَوْمِ","ٱلدِّينِ"] },
  { id: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",        words: ["إِيَّاكَ","نَعْبُدُ","وَإِيَّاكَ","نَسْتَعِينُ"] },
  { id: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",              words: ["ٱهْدِنَا","ٱلصِّرَٰطَ","ٱلْمُسْتَقِيمَ"] },
  { id: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
             words: ["صِرَٰطَ","ٱلَّذِينَ","أَنْعَمْتَ","عَلَيْهِمْ","غَيْرِ","ٱلْمَغْضُوبِ","عَلَيْهِمْ","وَلَا","ٱلضَّآلِّينَ"] },
];

const WORD_MEANINGS = {
  "بِسْمِ":          { m: "باسم / بذكر اسم",                    r: "س م و", g: "جار ومجرور" },
  "ٱللَّهِ":          { m: "اسم الجلالة الأعظم",                 r: "أ ل ه", g: "لفظ الجلالة" },
  "ٱلرَّحْمَـٰنِ":   { m: "ذو الرحمة الواسعة الشاملة",          r: "ر ح م", g: "صفة مشبهة" },
  "ٱلرَّحِيمِ":      { m: "ذو الرحمة الخاصة بالمؤمنين",        r: "ر ح م", g: "صفة مشبهة" },
  "ٱلْحَمْدُ":       { m: "الثناء الكامل والشكر",                r: "ح م د", g: "مبتدأ مرفوع" },
  "لِلَّهِ":          { m: "خاص بالله وحده لا شريك له",         r: "أ ل ه", g: "جار ومجرور" },
  "رَبِّ":           { m: "المالك المربي المدبر",                r: "ر ب ب", g: "بدل" },
  "ٱلْعَـٰلَمِينَ":  { m: "كل ما سوى الله تعالى",               r: "ع ل م", g: "مضاف إليه" },
  "مَـٰلِكِ":        { m: "صاحب الملك والسلطان المطلق",          r: "م ل ك", g: "بدل" },
  "يَوْمِ":          { m: "يوم القيامة",                        r: "ي و م", g: "مضاف إليه" },
  "ٱلدِّينِ":        { m: "الجزاء والحساب",                     r: "د ي ن", g: "مضاف إليه" },
  "إِيَّاكَ":        { m: "أنت وحدك لا غيرك",                   r: "إ ي ا", g: "ضمير منفصل" },
  "نَعْبُدُ":        { m: "نطيع ونخضع ونتذلل",                  r: "ع ب د", g: "فعل مضارع" },
  "وَإِيَّاكَ":      { m: "وإياك وحدك",                         r: "إ ي ا", g: "معطوف" },
  "نَسْتَعِينُ":     { m: "نطلب العون والمساعدة",                r: "ع و ن", g: "فعل مضارع" },
  "ٱهْدِنَا":        { m: "أرشدنا وثبتنا ووفقنا",               r: "هـ د ي", g: "فعل أمر دعائي" },
  "ٱلصِّرَٰطَ":      { m: "الطريق والسبيل",                     r: "ص ر ط", g: "مفعول به" },
  "ٱلْمُسْتَقِيمَ":  { m: "المعتدل الصحيح الموصل",              r: "ق و م", g: "نعت" },
  "صِرَٰطَ":         { m: "طريق وسبيل",                         r: "ص ر ط", g: "بدل" },
  "ٱلَّذِينَ":       { m: "الذين",                              r: "ذ ل ل", g: "اسم موصول" },
  "أَنْعَمْتَ":      { m: "أكرمت وأفضلت ومننت",                 r: "ن ع م", g: "فعل ماضٍ" },
  "عَلَيْهِمْ":      { m: "عليهم",                              r: "ع ل و", g: "جار ومجرور" },
  "غَيْرِ":          { m: "سوى وخلاف",                          r: "غ ي ر", g: "بدل" },
  "ٱلْمَغْضُوبِ":    { m: "الذين غضب الله عليهم",               r: "غ ض ب", g: "مضاف إليه" },
  "وَلَا":           { m: "وليس",                               r: "ل ا",   g: "حرف عطف ونفي" },
  "ٱلضَّآلِّينَ":    { m: "الذين ضلوا عن الحق",                 r: "ض ل ل", g: "معطوف" },
};

// ─── الأذكار ──────────────────────────────────────────────────────────────────
const MORNING_AZKAR = [
  { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",                                                            count: 1,   label: "الاستعاذة" },
  { text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",               count: 1,   label: "آية الكرسي" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",                                                                              count: 100, label: "تسبيح الصباح" },
  { text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 10, label: "التهليل" },
  { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ",                          count: 1,   label: "سيد الاستغفار" },
  { text: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",      count: 1,   label: "ذكر الصباح" },
];
const EVENING_AZKAR = [
  { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", count: 1, label: "ذكر المساء" },
  { text: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",           count: 1, label: "ذكر المساء" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",                                                                                   count: 100, label: "تسبيح المساء" },
  { text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي وَبَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",        count: 3, label: "دعاء العافية" },
];
const SLEEP_AZKAR = [
  { text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",                        count: 1,  label: "عند النوم" },
  { text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",         count: 3,  label: "عند النوم" },
  { text: "سُبْحَانَ اللَّهِ",                                               count: 33, label: "تسبيح النوم" },
  { text: "الْحَمْدُ لِلَّهِ",                                               count: 33, label: "تحميد النوم" },
  { text: "اللَّهُ أَكْبَرُ",                                                count: 34, label: "تكبير النوم" },
];
const TRAVEL_AZKAR = [
  { text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ", count: 1, label: "دعاء السفر" },
  { text: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى",                                       count: 1, label: "دعاء السفر" },
  { text: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",                                      count: 1, label: "دعاء السفر" },
];
const HOME_AZKAR = [
  { text: "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا", count: 1, label: "دخول المنزل" },
  { text: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",     count: 1, label: "الخروج من المنزل" },
  { text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ",                                   count: 1, label: "الخروج" },
];
const SUNNAH_LIST = [
  { text: "قراءة سورة الكهف كاملة يوم الجمعة",          label: "سنة الجمعة",      count: 1 },
  { text: "الصلاة على النبي ﷺ مئة مرة يوم الجمعة",      label: "الصلاة على النبي", count: 100 },
  { text: "صوم يوم الإثنين والخميس",                     label: "سنة الصيام",      count: 1 },
  { text: "السواك عند كل وضوء وصلاة",                    label: "السواك",          count: 3 },
  { text: "إحياء السنن المهجورة في البيت والسوق",         label: "إحياء السنة",     count: 1 },
];

const DHIKR_PHRASES = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ",
  "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ",
  "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
  "اللَّهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا",
];

const WEEKLY_STATS_INIT = [
  { day: "السبت",    mins: 12, ayahs: 8  },
  { day: "الأحد",    mins: 25, ayahs: 18 },
  { day: "الإثنين",  mins: 8,  ayahs: 5  },
  { day: "الثلاثاء", mins: 32, ayahs: 22 },
  { day: "الأربعاء", mins: 20, ayahs: 14 },
  { day: "الخميس",   mins: 45, ayahs: 35 },
  { day: "الجمعة",   mins: 60, ayahs: 50 },
];

// ─── مفاتيح AsyncStorage ───────────────────────────────────────────────────────
const KEYS = {
  THEME:         "musalli_theme",
  UNLOCKED:      "musalli_unlocked",
  AD_FREE:       "musalli_ad_free",
  STREAK:        "musalli_streak",
  LAST_OPEN:     "musalli_last_open",
  TASBEEH_TOTAL: "musalli_tasbeeh_total",
  BOOKMARK:      "musalli_bookmark",
  WEEKLY_STATS:  "musalli_weekly_stats",
  AZKAR_PROGRESS:"musalli_azkar_progress",
};

// ─── مصادر الصوت ──────────────────────────────────────────────────────────────
const AUDIO = {
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
};

// ─── مواقيت احتياطية (أوفلاين) ────────────────────────────────────────────────
const FALLBACK_PRAYER_TIMES = [
  { name: "الفجر",   time: "04:45", key: "Fajr"    },
  { name: "الشروق",  time: "06:15", key: "Sunrise" },
  { name: "الظهر",   time: "12:30", key: "Dhuhr"   },
  { name: "العصر",   time: "15:45", key: "Asr"     },
  { name: "المغرب",  time: "18:30", key: "Maghrib" },
  { name: "العشاء",  time: "20:00", key: "Isha"    },
];

// ─── مساعدات ──────────────────────────────────────────────────────────────────
const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

function parseTimeMins(str) {
  if (!str) return 0;
  const parts = String(str).split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function calcQiblaAngle(lat, lng) {
  const MECCA_LAT = 21.3891, MECCA_LNG = 39.8579;
  const φ1 = (lat * Math.PI) / 180, φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getHijriDate() {
  const now = new Date();
  const jd = Math.floor(now.getTime() / 86400000 + 2440587.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
            Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
             Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  const months = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  return { day, month, year, monthName: months[month - 1] || "" };
}

function getGregorianDate() {
  const now = new Date();
  const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return { dayName: days[now.getDay()], day: now.getDate(), month: months[now.getMonth()], year: now.getFullYear() };
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getSpecialFastingAlert(hijri) {
  const { day, month } = hijri;
  if (month === 1  && day === 9)                      return "تذكير: غداً صيام يوم عاشوراء — يكفّر سنة";
  if (month === 12 && day === 8)                      return "تذكير: غداً صيام يوم عرفة — يكفّر سنتين";
  if (month === 10 && day >= 1 && day <= 5)           return "تذكير: أنت في أيام صيام ستة شوال";
  if (month === 12 && day >= 1 && day <= 9)           return "تذكير: العشر الأوائل من ذي الحجة — أفضل الأيام";
  return null;
}

// ─── مكوّن هاشة كلمة المرور ──────────────────────────────────────────────────
const MAMA_HASH = "bf311209c274eee020a4408527e4224905691a7117a96fdfece63fa82159ea75";
async function hashCode(s) {
  try { return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s.trim()); }
  catch { return ""; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  مكوّنات مشتركة
// ═══════════════════════════════════════════════════════════════════════════════
function SH({ title, sub, T }) {
  return (
    <View style={[ss.shWrap, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
      <Text style={ss.shTitle}>{title}</Text>
      {sub ? <Text style={ss.shSub}>{sub}</Text> : null}
    </View>
  );
}

function Card({ T, title, children, style }) {
  return (
    <View style={[ss.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }, style]}>
      {title ? <Text style={ss.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function PBar({ T, label, pct, color }) {
  const c = color || T.accent;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={ss.pbarRow}>
        <Text style={ss.pbarLabel}>{label}</Text>
        <Text style={[ss.pbarPct, { color: c }]}>{pct}%</Text>
      </View>
      <View style={ss.pbarTrack}>
        <View style={[ss.pbarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: c }]} />
      </View>
    </View>
  );
}

function RI({ label, value }) {
  return (
    <View style={ss.riRow}>
      <Text style={ss.riLabel}>{label}</Text>
      <Text style={ss.riValue}>{value}</Text>
    </View>
  );
}

function Toggle({ T, label, sub, value, onChange }) {
  return (
    <View style={ss.toggleRow}>
      <View style={{ flex: 1, paddingLeft: 8 }}>
        <Text style={ss.toggleLabel}>{label}</Text>
        {sub ? <Text style={ss.toggleSub}>{sub}</Text> : null}
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={() => onChange(!value)}
        style={[ss.toggleTrack, { backgroundColor: value ? T.accent : "#222" }]}>
        <View style={[ss.toggleThumb, { left: value ? 22 : 3 }]} />
      </TouchableOpacity>
    </View>
  );
}

function Btn({ T, label, onPress, small }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[ss.btn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder,
        paddingVertical: small ? 5 : 8, paddingHorizontal: small ? 12 : 18 }]}>
      <Text style={[ss.btnText, { color: T.accent, fontSize: small ? 11 : 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  الفقاعة العائمة (قابلة للسحب)
// ═══════════════════════════════════════════════════════════════════════════════
function FloatingBubble({ T, count, onTap, onClose }) {
  const pos = useRef(new Animated.ValueXY({ x: SW - 90, y: SH * 0.35 })).current;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant() {
        pos.setOffset({ x: pos.x._value, y: pos.y._value });
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease(_, g) {
        pos.flattenOffset();
        // تثبيت ضمن حدود الشاشة
        const clampedX = Math.max(0, Math.min(SW - 80, pos.x._value));
        const clampedY = Math.max(60, Math.min(SH - 180, pos.y._value));
        Animated.spring(pos, { toValue: { x: clampedX, y: clampedY }, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[ss.floatBubble, { left: pos.x, top: pos.y, borderColor: T.accent, shadowColor: T.accent }]}
      {...pan.panHandlers}
    >
      <TouchableOpacity onPress={onTap} activeOpacity={0.85} style={{ alignItems: "center" }}>
        <Text style={ss.floatBubbleEmoji}>📿</Text>
        <Text style={[ss.floatBubbleCount, { color: T.accent }]}>{count}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={ss.floatBubbleClose}>
        <Text style={{ color: "#666", fontSize: 10 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  مودال الشراء (IAP)
// ═══════════════════════════════════════════════════════════════════════════════
function PurchaseModal({ T, themeId, onClose, onPurchaseSuccess, promoInputs, setPromoCode, submitPromo }) {
  const [buying, setBuying] = useState(false);
  if (!themeId) return null;
  const th = getTheme(themeId);

  const handleBuy = async () => {
    if (!RNIap) {
      // وضع التطوير: شراء وهمي مباشر
      Alert.alert(
        "وضع التطوير",
        `سيتم شراء "${th.name}" فعلياً عند رفع التطبيق للمتجر.\nهل تريد تفعيل الوضع التجريبي؟`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "تفعيل تجريبي", onPress: () => { onPurchaseSuccess(themeId); onClose(); } },
        ]
      );
      return;
    }
    try {
      setBuying(true);
      await RNIap.initConnection();
      const sku = IAP_SKUS[themeId];
      if (!sku) { Alert.alert("خطأ", "هذا المنتج غير متاح في متجرك"); setBuying(false); return; }
      const purchase = await RNIap.requestPurchase({ sku, andDangerouslyFinishTransactionAutomaticallyIOS: false });
      if (purchase) {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
        onPurchaseSuccess(themeId);
        onClose();
      }
    } catch (e) {
      if (e?.code !== "E_USER_CANCELLED") Alert.alert("خطأ في الشراء", e?.message || "حدث خطأ غير متوقع");
    } finally {
      setBuying(false);
    }
  };

  const pi = promoInputs[themeId] || {};
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ss.purchaseOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}
          style={[ss.purchaseSheet, { borderColor: th.accentBorder }]}>
          <ScrollView>
            <View style={ss.purchaseHandle} />
            <View style={ss.purchaseHeaderRow}>
              <LinearGradient colors={th.grad} style={ss.purchaseEmojiBox}>
                <Text style={ss.purchaseEmoji}>{th.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={ss.purchaseName}>{th.name}</Text>
                <Text style={ss.purchaseSubName}>مُصلِّي — متجر الثيمات</Text>
              </View>
              <View style={[ss.purchasePriceBadge, { backgroundColor: th.accentSoft, borderColor: th.accentBorder }]}>
                <Text style={[ss.purchasePriceText, { color: th.accent }]}>{th.price}</Text>
              </View>
            </View>
            <Text style={ss.purchaseDesc}>{th.desc}</Text>
            {themeId === "vip_royal" && (
              <View style={ss.vipBox}>
                <Text style={[ss.vipBoxTitle, { color: th.accent }]}>✦ يشمل الـ VIP:</Text>
                {["جميع الثيمات مفتوحة","إزالة الإعلانات نهائياً","عداد الختمة التفاعلي","فقاعة المسبحة المتحركة","أولوية التطوير"].map((d,i) => (
                  <Text key={i} style={ss.vipBoxItem}>• {d}</Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[ss.purchaseBuyBtn, { backgroundColor: th.accent, opacity: buying ? 0.6 : 1 }]}
              onPress={handleBuy} disabled={buying}>
              {buying ? <ActivityIndicator color="#000" /> :
                <Text style={ss.purchaseBuyBtnText}>شراء عبر المتجر — {th.price}</Text>}
            </TouchableOpacity>
            {/* كود ترويجي */}
            <View style={ss.purchasePromoSection}>
              <Text style={ss.purchasePromoLabel}>🎁 لديك كود ترويجي؟</Text>
              <View style={ss.purchasePromoRow}>
                <TextInput
                  style={[ss.purchasePromoInput, { borderColor: th.accentBorder }]}
                  placeholder="أدخل الكود..." placeholderTextColor="#555"
                  textAlign="right" value={pi.code || ""}
                  onChangeText={(v) => setPromoCode(themeId, v)}
                />
                <TouchableOpacity
                  style={[ss.purchasePromoBtn, { backgroundColor: th.accentSoft, borderColor: th.accentBorder }]}
                  onPress={() => submitPromo(themeId)}>
                  <Text style={[ss.purchasePromoBtnText, { color: th.accent }]}>تفعيل</Text>
                </TouchableOpacity>
              </View>
              {pi.msg ? <Text style={[ss.purchasePromoMsg, { color: pi.msg.startsWith("❌") ? "#ef4444" : "#22c55e" }]}>{pi.msg}</Text> : null}
            </View>
            <TouchableOpacity style={ss.purchaseCancelBtn} onPress={onClose}>
              <Text style={ss.purchaseCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  الشاشة الرئيسية
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ T, bookmark, sendNotif, setActiveTab, dhikrIdx, fastAlert, hijri, greg, countdown, prayerTimes, locationCity, prayerLoading, streak }) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* رأس الصفحة */}
      <View style={[ss.homeHeader, { borderBottomColor: T.cardBorder, backgroundColor: T.cardBg }]}>
        <Text style={ss.homeHeaderGreg}>{greg.dayName}، {greg.day} {greg.month} {greg.year}</Text>
        <View style={ss.homeHeaderRow}>
          <Text style={ss.homeHeaderTitle}>مُصلِّي</Text>
          <Text style={[ss.homeHeaderHijri, { color: T.accent }]}>{hijri.day} {hijri.monthName} {hijri.year} هـ</Text>
        </View>
        {locationCity ? <Text style={[ss.homeHeaderCity, { color: T.accent }]}>📍 {locationCity}</Text> : null}
        {streak > 1 && (
          <View style={[ss.streakBadge, { borderColor: T.accentBorder, backgroundColor: T.accentSoft }]}>
            <Text style={[ss.streakText, { color: T.accent }]}>🔥 {streak} أيام متتالية</Text>
          </View>
        )}
      </View>

      {/* بانر الذكر */}
      <View style={[ss.dhikrBanner, { backgroundColor: fastAlert ? "#1a0e00" : T.cardBg, borderBottomColor: fastAlert ? "#f59e0b44" : T.cardBorder }]}>
        {fastAlert
          ? <Text style={ss.fastAlertText}>🌟 {fastAlert}</Text>
          : <Text style={[ss.dhikrText, { color: T.accent }]}>{DHIKR_PHRASES[dhikrIdx]}</Text>}
      </View>

      {/* العداد التنازلي — دقائق فقط */}
      <View style={[ss.countdownRow, { backgroundColor: T.cardBg, borderBottomColor: T.cardBorder }]}>
        <Text style={ss.countdownLabel}>المتبقي لأذان {countdown.label}</Text>
        <Text style={[ss.countdownVal, { color: T.accent }]}>
          {pad(countdown.hours)}:{pad(countdown.mins)}
        </Text>
        <Text style={ss.countdownHint}>س:د</Text>
      </View>

      {/* شريط مواقيت الصلاة */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[ss.prayerStrip, { borderBottomColor: T.cardBorder }]}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {prayerLoading
          ? <View style={{ paddingVertical: 14, paddingHorizontal: 10 }}>
              <Text style={{ color: "#555", fontSize: 12 }}>⏳ جارٍ تحميل مواقيت الصلاة...</Text>
            </View>
          : prayerTimes.map((p) => (
              <View key={p.name} style={[ss.prayerChip, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
                <Text style={ss.prayerChipName}>{p.name}</Text>
                <Text style={[ss.prayerChipTime, { color: T.accent }]}>{p.time ? p.time.substring(0, 5) : "--:--"}</Text>
              </View>
            ))}
      </ScrollView>

      {/* متابعة القراءة */}
      {bookmark ? (
        <View style={[ss.bookmarkCard, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
          <View>
            <Text style={ss.bookmarkLabel}>من حيث توقفت</Text>
            <Text style={ss.bookmarkValue}>سورة الفاتحة — آية {bookmark}</Text>
          </View>
          <TouchableOpacity style={[ss.bookmarkBtn, { backgroundColor: T.accent }]} onPress={() => setActiveTab("quran")}>
            <Text style={ss.bookmarkBtnText}>متابعة</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* شبكة التنقل */}
      <View style={ss.homeGrid}>
        {[
          { icon: "📖", label: "القرآن الكريم",    sub: "سورة الفاتحة",  tab: "quran"   },
          { icon: "📿", label: "المسبحة",           sub: "عداد التسبيح", tab: "tasbeeh" },
          { icon: "🧭", label: "اتجاه القبلة",      sub: "مكة المكرمة",  tab: "qibla"   },
          { icon: "🤲", label: "الأذكار والسنن",    sub: "أذكار الصباح", tab: "azkar"   },
        ].map((c) => (
          <TouchableOpacity key={c.label} activeOpacity={0.85} onPress={() => setActiveTab(c.tab)}
            style={[ss.homeGridCard, { backgroundColor: T.cardBg, borderColor: T.accentBorder }]}>
            <Text style={ss.homeGridIcon}>{c.icon}</Text>
            <Text style={ss.homeGridLabel}>{c.label}</Text>
            <Text style={ss.homeGridSub}>{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* إنجاز اليوم */}
      <Card T={T} title="📊 إنجاز اليوم">
        <PBar T={T} label="أذكار الصباح"  pct={75} />
        <PBar T={T} label="أذكار المساء"  pct={30} color="#3b82f6" />
        <PBar T={T} label="السنن اليومية" pct={50} color="#f59e0b" />
      </Card>

      {/* تنبيه الصلاة */}
      <Card T={T} title={`⏰ اقتربت صلاة ${countdown.label}`}>
        <Text style={ss.nextPrayerSub}>متبقي {pad(countdown.hours)} ساعة و{pad(countdown.mins)} دقيقة</Text>
        <TouchableOpacity
          style={[ss.nextPrayerBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
          onPress={() => sendNotif(`🔔 اقتربت صلاة ${countdown.label}، استعد!`)}>
          <Text style={[ss.nextPrayerBtnText, { color: T.accent }]}>🔔 تذكيرني</Text>
        </TouchableOpacity>
      </Card>

      {/* توثيق المصادر */}
      <View style={ss.sourceFooter}>
        <Text style={ss.sourceText}>📖 القرآن: Tanzil.net | 🕌 المواقيت: Aladhan API | 🧭 القبلة: الهيئة العامة للمساحة</Text>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة القرآن
// ═══════════════════════════════════════════════════════════════════════════════
function QuranScreen({ T, fontSize, setFontSize, searchQuery, setSearchQuery, currentAyah, setCurrentAyah, audioPlaying, setAudioPlaying, bookmark, setBookmark, onWordPress, onWordLong, audioLoadingAyah, wordPopup, longModal, setLongModal }) {
  const timerRef = useRef(null);
  const tap  = (w) => { timerRef.current = setTimeout(() => { timerRef.current = null; onWordLong(w); }, 600); };
  const release = (w) => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; onWordPress(w); } };
  const filtered = searchQuery ? FATIHA.filter((a) => a.text.includes(searchQuery)) : FATIHA;

  return (
    <View style={{ flex: 1 }}>
      <View style={[ss.quranHeader, { borderBottomColor: T.cardBorder }]}>
        <Text style={ss.quranHeaderTitle}>سورة الفاتحة</Text>
        <Text style={ss.quranHeaderSub}>7 آيات — مكية — الجزء 1</Text>
      </View>

      {/* بحث */}
      <View style={[ss.quranSearchRow, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
        <Text style={ss.quranSearchIcon}>🔍</Text>
        <TextInput style={ss.quranSearchInput} placeholder="ابحث في الآيات..." placeholderTextColor="#555"
          textAlign="right" value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")}><Text style={ss.quranSearchClear}>✕</Text></TouchableOpacity> : null}
      </View>

      {/* حجم الخط */}
      <View style={ss.fontSizeRow}>
        <TouchableOpacity style={[ss.fontBtn, { borderColor: T.accentBorder }]} onPress={() => setFontSize(p => Math.max(18, p - 2))}>
          <Text style={[ss.fontBtnText, { color: T.accent }]}>أ−</Text>
        </TouchableOpacity>
        <Text style={[ss.fontSizeVal, { color: T.accent }]}>{fontSize}px</Text>
        <TouchableOpacity style={[ss.fontBtn, { borderColor: T.accentBorder }]} onPress={() => setFontSize(p => Math.min(44, p + 2))}>
          <Text style={[ss.fontBtnText, { color: T.accent }]}>أ+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ss.bookmarkInline, { borderColor: T.accentBorder }]} onPress={() => setBookmark(currentAyah + 1)}>
          <Text style={[ss.bookmarkInlineText, { color: T.accent }]}>🔖 حفظ الآية {currentAyah + 1}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={[ss.ayahsBox, { borderColor: T.cardBorder }]}>
          <Text style={[ss.basmalah, { color: T.accent }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
          {filtered.map((ayah, idx) => (
            <View key={ayah.id}
              style={[ss.ayahRow, { backgroundColor: currentAyah === idx ? `${T.accent}14` : "transparent" }]}>
              {bookmark === ayah.id && <View style={[ss.bookmarkRibbon, { backgroundColor: T.accent }]} />}
              <View style={[ss.ayahNumCircle, { backgroundColor: T.ayahNumBg }]}>
                <Text style={[ss.ayahNumText, { color: T.ayahNumColor }]}>{ayah.id}</Text>
              </View>
              <View style={ss.ayahWordsWrap}>
                {ayah.words.map((w, wi) => (
                  <TouchableOpacity key={wi} activeOpacity={0.6}
                    onPressIn={() => tap(w)} onPressOut={() => release(w)}>
                    <Text style={[ss.ayahWord, { fontSize }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <Text style={ss.ayahHint}>اضغط قصيراً للسماع • اضغط مطولاً للتفسير والإعراب</Text>
        </View>
        <View style={ss.sourceFooter}>
          <Text style={ss.sourceText}>المصدر: Tanzil.net — نص عثماني محقق ومعتمد</Text>
        </View>
      </ScrollView>

      {/* مشغّل الصوت */}
      <View style={[ss.audioPlayer, { borderColor: T.cardBorder, backgroundColor: T.cardBg }]}>
        <TouchableOpacity style={ss.audioBtnSmall} onPress={() => setCurrentAyah(p => Math.max(0, p - 1))}>
          <Text style={ss.audioBtnSmallText}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ss.audioBtnMain, { backgroundColor: audioPlaying ? "#ef4444" : T.accent }]}
          onPress={() => setAudioPlaying(p => !p)}>
          <Text style={ss.audioBtnMainText}>{audioLoadingAyah ? "⏳" : audioPlaying ? "⏸" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.audioBtnSmall} onPress={() => setCurrentAyah(p => Math.min(FATIHA.length - 1, p + 1))}>
          <Text style={ss.audioBtnSmallText}>⏭</Text>
        </TouchableOpacity>
        <View style={ss.audioProgressWrap}>
          <Text style={ss.audioProgressLabel}>الآية {currentAyah + 1} من {FATIHA.length}</Text>
          <View style={ss.audioProgressTrack}>
            <View style={[ss.audioProgressFill, { backgroundColor: T.accent, width: `${((currentAyah + 1) / FATIHA.length) * 100}%` }]} />
          </View>
        </View>
        <Text style={[ss.audioStatus, { color: audioPlaying ? T.accent : "#444" }]}>
          {audioLoadingAyah ? "⏳ تحميل" : audioPlaying ? "🔊 يشتغل" : "⏸ موقوف"}
        </Text>
      </View>

      {/* نافذة التفسير */}
      <Modal visible={!!longModal} transparent animationType="fade" onRequestClose={() => setLongModal(null)}>
        <TouchableOpacity style={ss.modalOverlay} activeOpacity={1} onPress={() => setLongModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[ss.longModalBox, { borderColor: T.cardBorder }]} onPress={() => {}}>
            <ScrollView>
              <Text style={[ss.longModalWord, { color: T.accent }]}>{longModal}</Text>
              <View style={ss.longModalDivider} />
              {longModal && WORD_MEANINGS[longModal] ? (
                <>
                  <RI label="المعنى" value={WORD_MEANINGS[longModal].m} />
                  <RI label="الجذر" value={WORD_MEANINGS[longModal].r} />
                  <RI label="الإعراب" value={WORD_MEANINGS[longModal].g} />
                </>
              ) : <Text style={ss.longModalNoData}>لا يوجد تفسير مسجّل لهذه الكلمة</Text>}
              <View style={ss.longModalDivider} />
              <Text style={ss.longModalHint}>🔊 النطق: مدّ حرف المد، أظهر التشديد، والتقط النفَس عند الوقف.</Text>
              <TouchableOpacity style={[ss.longModalClose, { backgroundColor: T.accent }]} onPress={() => setLongModal(null)}>
                <Text style={ss.longModalCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة المسبحة
// ═══════════════════════════════════════════════════════════════════════════════
function TasbeehScreen({ T, count, onTap, onReset, shake, flash, floatW, setFloatW, sendNotif, totalLifetime }) {
  const ring = count % 100;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: shake ? 0.92 : 1, useNativeDriver: true, friction: 3 }).start();
  }, [shake]);
  const C = 2 * Math.PI * 60;

  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📿 المسبحة الإلكترونية" T={T} />
      <View style={ss.tasbeehCenter}>
        <Text style={[ss.tasbeehStage, { color: T.accent }]}>
          {count < 33 ? "— سُبْحَانَ اللَّهِ —" : count < 66 ? "— الحمد لله —" : count < 100 ? "— اللَّهُ أَكْبَرُ —" : "🎉 اكتملت المئة!"}
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity activeOpacity={0.9} onPress={onTap}
            style={[ss.tasbeehBtn, { borderColor: flash ? T.accent : "#222", backgroundColor: flash ? T.accentSoft : "#090909", width: SW * 0.52, height: SW * 0.52, borderRadius: SW * 0.26 }]}>
            <Text style={[ss.tasbeehCount, { color: flash ? T.accent : "#fff" }]}>{count}</Text>
            <Text style={ss.tasbeehTapHint}>اضغط للعد</Text>
          </TouchableOpacity>
        </Animated.View>
        {/* حلقة SVG */}
        <Svg width={150} height={150} viewBox="0 0 150 150" style={{ marginTop: 18 }}>
          <Circle cx={75} cy={75} r={60} stroke="#111" strokeWidth={10} fill="none" />
          <Circle cx={75} cy={75} r={60} stroke={T.accent} strokeWidth={10} fill="none"
            strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - ring / 100)}`}
            strokeLinecap="round" rotation="-90" origin="75, 75" />
          <SvgText x={75} y={80} textAnchor="middle" fill="#ccc" fontSize={13}>{ring}/100</SvgText>
        </Svg>
        {/* أزرار */}
        <View style={ss.tasbeehActionsRow}>
          <Btn T={T} label="🔄 إعادة" onPress={onReset} />
          {[33, 100].map((m) => (
            <View key={m} style={[ss.tasbeehMilestone, { backgroundColor: count >= m ? T.accentSoft : "#0a0a0a", borderColor: count >= m ? T.accent : "#222" }]}>
              <Text style={[ss.tasbeehMilestoneText, { color: count >= m ? T.accent : "#444" }]}>{m} {count >= m ? "✓" : ""}</Text>
            </View>
          ))}
        </View>
        <Text style={[ss.tasbeehLifetime, { color: T.accent }]}>إجمالي عمرك: {totalLifetime.toLocaleString("ar-EG")} تسبيحة</Text>
      </View>

      {/* تفعيل الفقاعة */}
      <Card T={T} title="🫧 الفقاعة العائمة">
        <Text style={{ color: "#888", fontSize: 12, marginBottom: 10, lineHeight: 20 }}>
          تظهر الفقاعة فوق جميع التطبيقات وتبقى معك أينما ذهبت. يمكنك سحبها وإفلاتها في أي مكان على الشاشة.{"\n"}
          ملاحظة: يتطلب صلاحية "الظهور فوق التطبيقات" في Android.
        </Text>
        <Toggle T={T} label="تفعيل فقاعة المسبحة" sub="تعوم فوق جميع التطبيقات وقابلة للسحب"
          value={floatW}
          onChange={(v) => {
            setFloatW(v);
            sendNotif(v ? "✅ الفقاعة مفعّلة — يمكنك سحبها لأي مكان" : "⏹ الفقاعة موقوفة");
          }} />
      </Card>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة القبلة
// ═══════════════════════════════════════════════════════════════════════════════
function QiblaScreen({ T, compassAngle, isAligned, qiblaAngle, locationCity, userLocation }) {
  const needleRotation = (compassAngle - qiblaAngle + 360) % 360;
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="🧭 اتجاه القبلة" sub={`مكة المكرمة — ${Math.round(qiblaAngle)}° من الشمال`} T={T} />
      <View style={ss.qiblaWrap}>
        <View style={[ss.qiblaCircle, { borderColor: isAligned ? "#22c55e" : T.cardBorder }]}>
          {["N","E","S","W"].map((d, i) => {
            const pos = [{ top: 8, alignSelf: "center" }, { right: 8, top: "50%" }, { bottom: 8, alignSelf: "center" }, { left: 8, top: "50%" }];
            return <Text key={d} style={[ss.qiblaDir, pos[i], { color: isAligned ? "#22c55e" : "#333" }]}>{d}</Text>;
          })}
          <View style={[ss.qiblaNeedleWrap, { transform: [{ rotate: `${needleRotation}deg` }] }]}>
            <View style={[ss.qiblaArrowUp, { borderBottomColor: isAligned ? "#22c55e" : "#ef4444" }]} />
            <View style={ss.qiblaArrowDown} />
          </View>
          <Text style={ss.qiblaKaaba}>🕋</Text>
        </View>
        <Text style={isAligned ? ss.qiblaAligned : ss.qiblaNotAligned}>
          {isAligned ? "✅ أنت تواجه القبلة!" : "🔄 أدر الجهاز نحو القبلة"}
        </Text>
        <Text style={ss.qiblaAngle}>الزاوية الحالية: {Math.round(compassAngle)}° | القبلة: {Math.round(qiblaAngle)}°</Text>
        <Card T={T} title="📍 الموقع الحالي" style={{ marginTop: 20, width: "100%" }}>
          <RI label="المدينة"    value={locationCity || "جارٍ التحديد..."} />
          <RI label="خط العرض"  value={userLocation ? `${userLocation.latitude.toFixed(4)}°` : "—"} />
          <RI label="خط الطول"  value={userLocation ? `${userLocation.longitude.toFixed(4)}°` : "—"} />
          <RI label="اتجاه القبلة" value={`${Math.round(qiblaAngle)}° شمالاً`} />
        </Card>
        <View style={ss.sourceFooter}>
          <Text style={ss.sourceText}>🧭 الحساب وفق مراجع الهيئة العامة للمساحة</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة الأذكار
// ═══════════════════════════════════════════════════════════════════════════════
function AzkarScreen({ T, azkarTab, setAzkarTab, morningC, setMorningC, eveningC, setEveningC, sleepC, setSleepC, travelC, setTravelC, homeC, setHomeC, sunnahC, setSunnahC, decrement }) {
  const TABS = [
    { id: "morning", label: "الصباح",  icon: "🌅" },
    { id: "evening", label: "المساء",  icon: "🌇" },
    { id: "sleep",   label: "النوم",   icon: "🌙" },
    { id: "home",    label: "المنزل",  icon: "🏠" },
    { id: "travel",  label: "السفر",   icon: "✈️" },
    { id: "sunnah",  label: "السنن",   icon: "✨" },
  ];
  const dataMap = {
    morning: [MORNING_AZKAR, morningC, setMorningC],
    evening: [EVENING_AZKAR, eveningC, setEveningC],
    sleep:   [SLEEP_AZKAR,   sleepC,   setSleepC  ],
    travel:  [TRAVEL_AZKAR,  travelC,  setTravelC ],
    home:    [HOME_AZKAR,    homeC,    setHomeC   ],
    sunnah:  [SUNNAH_LIST,   sunnahC,  setSunnahC ],
  };
  const [data, counts, setCounts] = dataMap[azkarTab];

  return (
    <View style={{ flex: 1 }}>
      <SH title="🤲 الأذكار والسنن" T={T} />
      {/* تبويبات */}
      <View style={[ss.azkarGridRow, { borderBottomColor: T.cardBorder }]}>
        {TABS.map((tab) => {
          const isActive = azkarTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setAzkarTab(tab.id)}
              style={[ss.azkarGridBtn, { backgroundColor: isActive ? T.accentSoft : "#0a0a0a", borderColor: isActive ? T.accent : "#1a1a1a" }]}>
              <Text style={{ fontSize: 18 }}>{tab.icon}</Text>
              <Text style={[ss.azkarGridText, { color: isActive ? T.accent : "#555", fontWeight: isActive ? "700" : "400" }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView style={ss.azkarListWrap}>
        {data.map((item, idx) =>
          counts[idx] > 0 ? (
            <View key={idx} style={[ss.azkarCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <Text style={[ss.azkarCardLabel, { color: T.accent }]}>{item.label}</Text>
              <Text style={ss.azkarCardText}>{item.text}</Text>
              <View style={ss.azkarCardFooter}>
                <TouchableOpacity style={[ss.azkarRecordBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                  onPress={() => decrement(counts, setCounts, idx)}>
                  <Text style={[ss.azkarRecordBtnText, { color: T.accent }]}>تسجيل ({counts[idx]})</Text>
                </TouchableOpacity>
                <View style={[ss.azkarCounterCircle, { backgroundColor: T.ayahNumBg }]}>
                  <Text style={[ss.azkarCounterText, { color: T.accent }]}>{counts[idx]}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View key={idx} style={[ss.azkarCard, ss.azkarCardDone, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
              <Text style={[ss.azkarCardLabel, { color: T.accent }]}>{item.label}</Text>
              <Text style={ss.azkarDoneText}>✅ اكتمل</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة الإحصاء
// ═══════════════════════════════════════════════════════════════════════════════
function StatsScreen({ T, weeklyStats, streak, tasbeehTotal }) {
  const maxMins = Math.max(...weeklyStats.map((d) => d.mins), 1);
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="📊 إحصاءات القراءة" sub="هذا الأسبوع" T={T} />
      <View style={ss.statsGrid}>
        {[
          { icon: "⏱️", val: (weeklyStats.reduce((s,d)=>s+d.mins,0)/60).toFixed(1), unit: "ساعة",   label: "إجمالي القراءة",  color: T.accent    },
          { icon: "📖", val: weeklyStats.reduce((s,d)=>s+d.ayahs,0),                unit: "آية",    label: "آيات مقروءة",     color: "#3b82f6"   },
          { icon: "🔥", val: streak,                                                 unit: "أيام",   label: "أيام متتالية",    color: "#f59e0b"   },
          { icon: "📿", val: tasbeehTotal.toLocaleString("ar-EG"),                   unit: "",       label: "إجمالي التسبيح",  color: "#8b5cf6"   },
        ].map((s) => (
          <View key={s.label} style={[ss.statBox, { borderColor: `${s.color}33` }]}>
            <Text style={ss.statIcon}>{s.icon}</Text>
            <Text style={[ss.statVal, { color: s.color }]}>{s.val}</Text>
            {s.unit ? <Text style={[ss.statUnit, { color: s.color }]}>{s.unit}</Text> : null}
            <Text style={ss.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Card T={T} title="دقائق القراءة اليومية">
        <View style={ss.barsRow}>
          {weeklyStats.map((d, i) => (
            <View key={i} style={ss.barCol}>
              <Text style={[ss.barVal, { color: T.accent }]}>{d.mins}</Text>
              <View style={[ss.barFill, { height: (d.mins / maxMins) * 82, backgroundColor: T.accentSoft, borderTopColor: T.accent }]} />
              <Text style={ss.barDay}>{d.day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card T={T} title="🏆 الإنجازات">
        {[
          { icon: "🌟", label: "حافظ الفاتحة",       done: true,          desc: "قرأت سورة الفاتحة كاملة"         },
          { icon: "📿", label: "100 تسبيحة في يوم",  done: tasbeehTotal>=100, desc: "سبّحت 100 مرة في يوم واحد"   },
          { icon: "🔥", label: "7 أيام متتالية",      done: streak >= 7,   desc: "استخدمت التطبيق 7 أيام متتالية" },
          { icon: "📖", label: "ختمة كاملة",          done: false,         desc: "اقرأ القرآن كاملاً"              },
          { icon: "🌙", label: "أذكار النوم 30 يوماً", done: false,        desc: "أكمل أذكار النوم 30 يوماً"       },
        ].map((a, i) => (
          <View key={i} style={[ss.achievementRow, { backgroundColor: a.done ? "#0a1a0a" : "#0a0a0a", borderColor: a.done ? "#22c55e22" : "#111" }]}>
            <Text style={{ fontSize: 26 }}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[ss.achievementLabel, { color: a.done ? "#e2e8f0" : "#444" }]}>{a.label}</Text>
              <Text style={{ color: a.done ? "#22c55e88" : "#333", fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
            </View>
            <Text style={{ fontSize: 22 }}>{a.done ? "✅" : "🔒"}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  شاشة الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsScreen({
  T, adFree, masterPromo, setMasterPromo, masterMsg, handleMasterPromo,
  azanOn, setAzanOn, salahOn, setSalahOn, salahInt, setSalahInt,
  preOn, setPreOn, autoAzkar, setAutoAzkar, travelOn, setTravelOn,
  fastOn, setFastOn, fastMT, setFastMT, fastWD, setFastWD,
  activeThemeId, unlockedIds, onSelect, onBuy,
  sendNotif, mamaMode,
}) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <SH title="⚙️ الإعدادات" T={T} />

      {/* متجر الثيمات */}
      <Card T={T} title="🎨 متجر الثيمات">
        {THEMES.map((th) => {
          const owned  = unlockedIds.includes(th.id);
          const active = activeThemeId === th.id;
          return (
            <View key={th.id} style={ss.themeRow}>
              <LinearGradient colors={th.grad} style={ss.themeEmojiBox}>
                <Text style={ss.themeEmoji}>{th.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={ss.themeName}>{th.name}</Text>
                <Text style={ss.themeDesc}>{th.desc}</Text>
              </View>
              {owned ? (
                <TouchableOpacity
                  style={[ss.themeActionBtn, { backgroundColor: active ? th.accentSoft : "#111", borderColor: active ? th.accent : "#222" }]}
                  onPress={() => onSelect(th.id)}>
                  <Text style={[ss.themeActionText, { color: active ? th.accent : "#666", fontWeight: active ? "700" : "400" }]}>
                    {active ? "✅ مفعّل" : "تطبيق"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[ss.themeActionBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
                  onPress={() => onBuy(th.id)}>
                  <Text style={[ss.themeActionText, { color: T.accent, fontWeight: "700" }]}>{th.price} 🔒</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </Card>

      {/* كود ترويجي */}
      <Card T={T} title="🎁 كود ترويجي">
        <View style={ss.promoRow}>
          <TextInput style={[ss.promoInput, { borderColor: T.cardBorder }]}
            placeholder="أدخل الكود..." placeholderTextColor="#555"
            textAlign="right" value={masterPromo} onChangeText={setMasterPromo} />
          <TouchableOpacity style={[ss.promoBtn, { backgroundColor: T.accentSoft, borderColor: T.accentBorder }]}
            onPress={handleMasterPromo}>
            <Text style={[ss.promoBtnText, { color: T.accent }]}>تفعيل</Text>
          </TouchableOpacity>
        </View>
        {masterMsg ? <Text style={[ss.promoMsg, { color: masterMsg.startsWith("❌") ? "#ef4444" : masterMsg.startsWith("❤️") ? "#ec4899" : "#22c55e" }]}>{masterMsg}</Text> : null}
        {adFree ? <Text style={ss.promoAdFree}>✅ وضع بدون إعلانات مفعّل</Text> : null}
      </Card>

      {/* الأذان والتنبيهات */}
      <Card T={T} title="🔊 الأذان والتنبيهات الصوتية">
        <Toggle T={T} label="📡 أذان الصلوات الخمس" sub="صوت الأذان عند وقت كل صلاة"   value={azanOn}   onChange={setAzanOn}   />
        <Toggle T={T} label="🕌 الصلاة على النبي ﷺ"  sub="تنبيه صوتي دوري"            value={salahOn}  onChange={setSalahOn}  />
        {salahOn && (
          <View style={ss.salahIntWrap}>
            <Text style={ss.salahIntLabel}>كل كم دقيقة؟</Text>
            <View style={ss.salahIntRow}>
              {[15, 30, 60].map((v) => (
                <TouchableOpacity key={v}
                  style={[ss.salahIntBtn, { backgroundColor: salahInt === v ? T.accentSoft : "#111", borderColor: salahInt === v ? T.accent : "#222" }]}
                  onPress={() => setSalahInt(v)}>
                  <Text style={[ss.salahIntBtnText, { color: salahInt === v ? T.accent : "#555" }]}>{v} دقيقة</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Toggle T={T} label="⏰ تنبيه قبل الصلاة"      sub="تحذير 15 دقيقة قبل كل أذان" value={preOn}    onChange={setPreOn}    />
        <Toggle T={T} label="🤲 أذكار تلقائية"          sub="صباح 7:00 ومغرب كل يوم"     value={autoAzkar} onChange={setAutoAzkar} />
        <Toggle T={T} label="🚗 مُذكِّر السفر الذكي"    sub="تفعيل تلقائي عند السفر"      value={travelOn} onChange={setTravelOn} />
      </Card>

      {/* الصيام */}
      <Card T={T} title="🌙 صيام النوافل والأيام البيض">
        <Toggle T={T} label="تفعيل تذكير الصيام" value={fastOn} onChange={setFastOn} />
        {fastOn && <>
          <Toggle T={T} label="الإثنين والخميس"      sub="تذكير أسبوعي بصيام السنة" value={fastMT} onChange={setFastMT} />
          <Toggle T={T} label="الأيام البيض 13، 14، 15" sub="تذكير شهري قمري"       value={fastWD} onChange={setFastWD} />
        </>}
      </Card>

      {/* عن التطبيق */}
      <Card T={T} title="ℹ️ عن التطبيق">
        <RI label="الإصدار"         value="4.0.0" />
        <RI label="المطور"          value="فريق مُصلِّي" />
        <RI label="البيانات القرآنية" value="Tanzil.net — محققة 100%" />
        <RI label="مواقيت الصلاة"   value="Aladhan API" />
        <RI label="اتجاه القبلة"    value="الهيئة العامة للمساحة" />
      </Card>

      {/* توثيق المصادر */}
      <View style={[ss.sourceFooter, { marginHorizontal: 16 }]}>
        <Text style={[ss.sourceText, { fontSize: 10, lineHeight: 18 }]}>
          📖 بيانات القرآن الكريم مُرخَّصة من Tanzil.net بموجب CC BY-ND 3.0{"\n"}
          🕌 مواقيت الصلاة: api.aladhan.com — مجاني وغير رسمي{"\n"}
          🧭 حسابات القبلة استناداً إلى مراجع الهيئة العامة للمساحة المملكة العربية السعودية
        </Text>
      </View>

      {mamaMode && (
        <View style={ss.mamaBadge}>
          <Text style={ss.mamaText}>❤️ حبيني وادعيلي ❤️</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  التطبيق الجذر
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── الشاشات والتنقل ──
  const [screen,    setScreen]    = useState("splash");
  const [activeTab, setActiveTab] = useState("home");

  // ── إعدادات القرآن ──
  const [fontSize,       setFontSize]       = useState(26);
  const [bookmark,       setBookmark]       = useState(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [wordPopup,      setWordPopup]      = useState(null);
  const [longModal,      setLongModal]      = useState(null);
  const [audioPlaying,   setAudioPlaying]   = useState(false);
  const [currentAyah,    setCurrentAyah]    = useState(0);
  const [audioLoadingAyah, setAudioLoadingAyah] = useState(false);

  // ── التسبيح ──
  const [tasbeehCount,   setTasbeehCount]   = useState(0);
  const [tasbeehTotal,   setTasbeehTotal]   = useState(0);
  const [tShake,         setTShake]         = useState(false);
  const [tFlash,         setTFlash]         = useState(false);
  const [floatW,         setFloatW]         = useState(false);

  // ── الأذكار ──
  const [azkarTab,  setAzkarTab]  = useState("morning");
  const [morningC,  setMorningC]  = useState(MORNING_AZKAR.map(a => a.count));
  const [eveningC,  setEveningC]  = useState(EVENING_AZKAR.map(a => a.count));
  const [sleepC,    setSleepC]    = useState(SLEEP_AZKAR.map(a => a.count));
  const [travelC,   setTravelC]   = useState(TRAVEL_AZKAR.map(a => a.count));
  const [homeC,     setHomeC]     = useState(HOME_AZKAR.map(a => a.count));
  const [sunnahC,   setSunnahC]   = useState(SUNNAH_LIST.map(a => a.count));

  // ── الموقع والصلاة والقبلة ──
  const [userLocation,    setUserLocation]    = useState(null);
  const [locationCity,    setLocationCity]    = useState("جارٍ التحديد...");
  const [livePrayerTimes, setLivePrayerTimes] = useState(null);
  const [prayerLoading,   setPrayerLoading]   = useState(false);
  const [qiblaAngle,      setQiblaAngle]      = useState(143);
  const [liveCompassAngle,setLiveCompassAngle]= useState(0);
  const [countdown,       setCountdown]       = useState({ label: "العصر", hours: 1, mins: 37 });
  const [azanTriggered,   setAzanTriggered]   = useState({});

  // ── الإعدادات ──
  const [azanOn,    setAzanOn]    = useState(true);
  const [salahOn,   setSalahOn]   = useState(true);
  const [salahInt,  setSalahInt]  = useState(30);
  const [preOn,     setPreOn]     = useState(true);
  const [autoAzkar, setAutoAzkar] = useState(true);
  const [travelOn,  setTravelOn]  = useState(false);
  const [fastOn,    setFastOn]    = useState(false);
  const [fastMT,    setFastMT]    = useState(true);
  const [fastWD,    setFastWD]    = useState(false);

  // ── الثيم والشراء ──
  const [activeThemeId, setActiveThemeId] = useState("spiritual_green");
  const [unlockedIds,   setUnlockedIds]   = useState(["royal_black", "spiritual_green"]);
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [promoInputs,   setPromoInputs]   = useState({});
  const [masterPromo,   setMasterPromo]   = useState("");
  const [masterMsg,     setMasterMsg]     = useState("");
  const [adFree,        setAdFree]        = useState(false);
  const [mamaMode,      setMamaMode]      = useState(false);

  // ── الإحصاء ──
  const [streak,      setStreak]      = useState(1);
  const [weeklyStats, setWeeklyStats] = useState(WEEKLY_STATS_INIT);

  // ── إشعارات ──
  const [notifMsg, setNotifMsg] = useState("");
  const [dhikrIdx, setDhikrIdx] = useState(0);

  const soundRef    = useRef(null);
  const azanRef     = useRef(null);
  const salahTimer  = useRef(null);

  const T       = useMemo(() => getTheme(activeThemeId), [activeThemeId]);
  const hijri   = useMemo(() => getHijriDate(), []);
  const greg    = useMemo(() => getGregorianDate(), []);
  const fastAlert = useMemo(() => getSpecialFastingAlert(hijri), []);

  const displayedPrayerTimes = livePrayerTimes || FALLBACK_PRAYER_TIMES;

  // ── تحميل البيانات المحفوظة ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [theme, unlocked, adF, str, bkmk, ttl] = await Promise.all([
          AsyncStorage.getItem(KEYS.THEME),
          AsyncStorage.getItem(KEYS.UNLOCKED),
          AsyncStorage.getItem(KEYS.AD_FREE),
          AsyncStorage.getItem(KEYS.STREAK),
          AsyncStorage.getItem(KEYS.BOOKMARK),
          AsyncStorage.getItem(KEYS.TASBEEH_TOTAL),
        ]);
        if (theme)    setActiveThemeId(theme);
        if (unlocked) setUnlockedIds(JSON.parse(unlocked));
        if (adF === "1") setAdFree(true);
        if (str)      setStreak(parseInt(str, 10) || 1);
        if (bkmk)     setBookmark(parseInt(bkmk, 10));
        if (ttl)      setTasbeehTotal(parseInt(ttl, 10) || 0);
      } catch { /* صامت */ }
    })();
  }, []);

  // ── تحديث الأيام المتتالية ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const today    = getTodayString();
        const lastOpen = await AsyncStorage.getItem(KEYS.LAST_OPEN);
        if (!lastOpen) {
          await AsyncStorage.setItem(KEYS.LAST_OPEN, today);
          await AsyncStorage.setItem(KEYS.STREAK, "1");
          setStreak(1);
          return;
        }
        const diff = Math.round((new Date(today) - new Date(lastOpen)) / 86400000);
        const saved = parseInt(await AsyncStorage.getItem(KEYS.STREAK) || "1", 10);
        let newStreak = diff === 1 ? saved + 1 : diff === 0 ? saved : 1;
        await AsyncStorage.setItem(KEYS.LAST_OPEN, today);
        await AsyncStorage.setItem(KEYS.STREAK, String(newStreak));
        setStreak(newStreak);
      } catch { /* صامت */ }
    })();
  }, []);

  // ── Splash ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setScreen("ad"), 1800);
    return () => clearTimeout(t);
  }, []);

  // ── جلسة الصوت ────────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true }).catch(() => {});
  }, []);

  // ── GPS وجلب المواقيت ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationCity("القاهرة، مصر");
          await fetchPrayerTimes(30.0444, 31.2357);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 10000 });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (rev?.[0]) {
            const r = rev[0];
            setLocationCity(`${r.city || r.subregion || r.region || ""}، ${r.country || ""}`);
          }
        } catch { setLocationCity("موقعك الحالي"); }
        setQiblaAngle(calcQiblaAngle(latitude, longitude));
        await fetchPrayerTimes(latitude, longitude);
      } catch {
        setLocationCity("القاهرة، مصر");
        await fetchPrayerTimes(30.0444, 31.2357);
      }
    })();
  }, []);

  const fetchPrayerTimes = useCallback(async (lat, lng) => {
    setPrayerLoading(true);
    try {
      const d = new Date();
      const url = `https://api.aladhan.com/v1/timings/${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}?latitude=${lat}&longitude=${lng}&method=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (json.code === 200 && json.data?.timings) {
        const t = json.data.timings;
        setLivePrayerTimes([
          { name: "الفجر",   time: t.Fajr,    key: "Fajr"    },
          { name: "الشروق",  time: t.Sunrise,  key: "Sunrise" },
          { name: "الظهر",   time: t.Dhuhr,   key: "Dhuhr"   },
          { name: "العصر",   time: t.Asr,     key: "Asr"     },
          { name: "المغرب",  time: t.Maghrib, key: "Maghrib" },
          { name: "العشاء",  time: t.Isha,    key: "Isha"    },
        ]);
      }
    } catch { /* أوفلاين: استخدام المواقيت الاحتياطية */ }
    finally { setPrayerLoading(false); }
  }, []);

  // ── حساب العداد التنازلي (ساعات ودقائق فقط — لا ثواني) ──────────────────
  const computeCountdown = useCallback((times) => {
    if (!times?.length) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let next = null;
    for (const p of times) {
      const pm = parseTimeMins(p.time);
      if (pm > nowMins) { next = { label: p.name, diffMins: pm - nowMins }; break; }
    }
    if (!next) {
      const pm = parseTimeMins(times[0].time);
      next = { label: times[0].name, diffMins: 1440 - nowMins + pm };
    }
    const totalMins = Math.max(0, Math.round(next.diffMins));
    return { label: next.label, hours: Math.floor(totalMins / 60), mins: totalMins % 60 };
  }, []);

  useEffect(() => {
    const tick = () => { const r = computeCountdown(displayedPrayerTimes); if (r) setCountdown(r); };
    tick();
    const t = setInterval(tick, 60000); // كل دقيقة كافٍ — لا ثواني
    return () => clearInterval(t);
  }, [livePrayerTimes, computeCountdown]);

  // ── محاكاة البوصلة (الجهاز الحقيقي يستخدم expo-sensors/Magnetometer) ────
  useEffect(() => {
    const t = setInterval(() => setLiveCompassAngle(p => (p + 1.5) % 360), 80);
    return () => clearInterval(t);
  }, []);

  const effectiveCompass = liveCompassAngle;
  const isAligned = Math.abs((effectiveCompass - qiblaAngle + 360) % 360) < 15;

  // ── تشغيل صوت القرآن ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioPlaying) { soundRef.current?.stopAsync().catch(() => {}); return; }
    let cancelled = false;
    const playAyah = async (idx) => {
      if (cancelled || idx >= FATIHA.length) { setAudioPlaying(false); setCurrentAyah(0); return; }
      setCurrentAyah(idx); setAudioLoadingAyah(true);
      try {
        await soundRef.current?.unloadAsync();
        const { sound } = await Audio.Sound.createAsync({ uri: AUDIO.fatiha[idx] }, { shouldPlay: true, volume: 1 });
        soundRef.current = sound;
        setAudioLoadingAyah(false);
        sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish && !cancelled) playAyah(idx + 1); });
      } catch {
        setAudioLoadingAyah(false);
        if (!cancelled) setTimeout(() => { if (!cancelled) playAyah(idx + 1); }, 3000);
      }
    };
    playAyah(currentAyah);
    return () => { cancelled = true; soundRef.current?.stopAsync().catch(() => {}); };
  }, [audioPlaying]);

  // ── تفعيل الأذان ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!azanOn || !livePrayerTimes) return;
    const interval = setInterval(() => {
      const now = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      livePrayerTimes.forEach((p) => {
        const ts = (p.time || "").substring(0, 5);
        if (ts === nowStr && !azanTriggered[ts]) {
          setAzanTriggered(prev => ({ ...prev, [ts]: true }));
          (async () => {
            try {
              await azanRef.current?.unloadAsync();
              const { sound } = await Audio.Sound.createAsync({ uri: AUDIO.azan }, { shouldPlay: true, volume: 1 });
              azanRef.current = sound;
              sendNotif(`🕌 أذان ${p.name}`);
            } catch { sendNotif(`🕌 حان وقت أذان ${p.name}`); }
          })();
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [azanOn, livePrayerTimes, azanTriggered]);

  // ── دوران بانر الذكر ──────────────────────────────────────────────────────
  useEffect(() => {
    if (fastAlert) return;
    const t = setInterval(() => setDhikrIdx(p => (p + 1) % DHIKR_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, [fastAlert]);

  // ── تنظيف الصوت عند الإغلاق ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      azanRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── زر الرجوع (Android) ───────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeTab !== "home") { setActiveTab("home"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [activeTab]);

  // ── حفظ الإشارة المرجعية ─────────────────────────────────────────────────
  useEffect(() => {
    if (bookmark !== null) AsyncStorage.setItem(KEYS.BOOKMARK, String(bookmark)).catch(() => {});
  }, [bookmark]);

  const sendNotif = useCallback((msg) => {
    setNotifMsg(msg);
    setTimeout(() => setNotifMsg(""), 3500);
  }, []);

  const handleTasbeeh = useCallback(() => {
    const n = tasbeehCount + 1;
    const newTotal = tasbeehTotal + 1;
    setTasbeehCount(n);
    setTasbeehTotal(newTotal);
    setTShake(true);
    setTimeout(() => setTShake(false), 300);
    if (n === 33 || n === 100) { setTFlash(true); setTimeout(() => setTFlash(false), 1000); }
    AsyncStorage.setItem(KEYS.TASBEEH_TOTAL, String(newTotal)).catch(() => {});
  }, [tasbeehCount, tasbeehTotal]);

  const handleWordPress = useCallback((w) => { setWordPopup(w); setTimeout(() => setWordPopup(null), 2200); }, []);
  const handleWordLong  = useCallback((w) => setLongModal(w), []);

  const decrement = useCallback((arr, setArr, idx) => {
    const next = [...arr];
    if (next[idx] > 0) next[idx]--;
    setArr(next);
  }, []);

  // ── الثيمات والشراء ───────────────────────────────────────────────────────
  const selectTheme = useCallback((id) => {
    setActiveThemeId(id);
    AsyncStorage.setItem(KEYS.THEME, id).catch(() => {});
    sendNotif("✅ تم تطبيق " + getTheme(id).name);
  }, [sendNotif]);

  const onPurchaseSuccess = useCallback((id) => {
    const newUnlocked = [...new Set([...unlockedIds, id])];
    if (id === "vip_royal") {
      const all = THEMES.map(t => t.id);
      setUnlockedIds(all);
      setAdFree(true);
      AsyncStorage.setItem(KEYS.AD_FREE, "1").catch(() => {});
      AsyncStorage.setItem(KEYS.UNLOCKED, JSON.stringify(all)).catch(() => {});
    } else {
      setUnlockedIds(newUnlocked);
      AsyncStorage.setItem(KEYS.UNLOCKED, JSON.stringify(newUnlocked)).catch(() => {});
    }
    setActiveThemeId(id);
    AsyncStorage.setItem(KEYS.THEME, id).catch(() => {});
    sendNotif("✅ تم فتح " + getTheme(id).name + "!");
  }, [unlockedIds, sendNotif]);

  const setPromoCode = useCallback((id, val) => {
    setPromoInputs(p => ({ ...p, [id]: { ...p[id], code: val, msg: "" } }));
  }, []);

  const submitPromo = useCallback((id) => {
    const code = (promoInputs[id]?.code || "").trim().toLowerCase();
    const valid = { royal_gold: "gold2025", sufi_purple: "purple2025", vip_royal: "vip2025" };
    if (code === valid[id]) {
      onPurchaseSuccess(id);
      setPurchaseModal(null);
      sendNotif("🎁 " + getTheme(id).name + " مفتوح!");
    } else {
      setPromoInputs(p => ({ ...p, [id]: { ...p[id], msg: "❌ الكود غير صحيح" } }));
    }
  }, [promoInputs, onPurchaseSuccess, sendNotif]);

  const handleMasterPromo = useCallback(async () => {
    const code = masterPromo.trim();
    if (!code) { setMasterMsg("❌ الكود فارغ"); return; }
    const h = await hashCode(code);
    if (h === MAMA_HASH) {
      setAdFree(true); setMamaMode(true);
      const all = THEMES.map(t => t.id);
      setUnlockedIds(all);
      setActiveThemeId("vip_royal");
      AsyncStorage.multiSet([[KEYS.AD_FREE,"1"],[KEYS.THEME,"vip_royal"],[KEYS.UNLOCKED,JSON.stringify(all)]]).catch(()=>{});
      setMasterMsg("❤️ تم تفعيل كل المميزات بالكامل!");
      return;
    }
    if (code.toLowerCase() === "friend2025") {
      setAdFree(true);
      AsyncStorage.setItem(KEYS.AD_FREE, "1").catch(()=>{});
      setMasterMsg("✅ تم إزالة الإعلانات!");
    } else { setMasterMsg("❌ الكود غير صحيح"); }
  }, [masterPromo]);

  // ─── شاشة السبلاش ────────────────────────────────────────────────────────
  if (screen === "splash") {
    return (
      <View style={ss.splashWrap}>
        <View style={ss.splashGlow} />
        <Text style={ss.splashEmoji}>☪️</Text>
        <Text style={ss.splashTitle}>مُصلِّي</Text>
        <Text style={ss.splashSub}>مساعدك القرآني الذكي</Text>
        <View style={ss.splashBarTrack}><View style={ss.splashBarFill} /></View>
      </View>
    );
  }

  // ─── شاشة الإعلان ────────────────────────────────────────────────────────
  if (screen === "ad") {
    return (
      <View style={ss.adWrap}>
        <View style={ss.adBadge}><Text style={ss.adBadgeText}>إعلان</Text></View>
        <Text style={ss.adEmoji}>📖</Text>
        <Text style={ss.adTitle}>تعلّم القرآن الكريم</Text>
        <Text style={ss.adSub}>أفضل تطبيق للحفظ والتلاوة والأذكار</Text>
        <TouchableOpacity style={ss.adSkip} onPress={() => setScreen("home")}>
          <Text style={ss.adSkipText}>تخطي ✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── شريط التنقل ─────────────────────────────────────────────────────────
  const NAV_TABS = [
    { id: "home",     icon: "🏠", label: "الرئيسية" },
    { id: "quran",    icon: "📖", label: "القرآن"   },
    { id: "tasbeeh",  icon: "📿", label: "التسبيح"  },
    { id: "qibla",    icon: "🧭", label: "القبلة"   },
    { id: "azkar",    icon: "🤲", label: "الأذكار"  },
    { id: "stats",    icon: "📊", label: "الإحصاء"  },
    { id: "settings", icon: "⚙️", label: "الإعدادات"},
  ];

  return (
    <View style={[ss.appRoot, { backgroundColor: T.bg }]}>
      {/* الفقاعة العائمة */}
      {floatW && (
        <FloatingBubble T={T} count={tasbeehCount} onTap={handleTasbeeh} onClose={() => setFloatW(false)} />
      )}

      {/* إشعار Toast */}
      {notifMsg ? (
        <View style={[ss.toast, { borderColor: T.accentBorder }]}>
          <Text style={ss.toastText}>{notifMsg}</Text>
        </View>
      ) : null}

      {/* لافتة الكلمة */}
      {wordPopup ? (
        <View style={[ss.wordPopup, { borderColor: T.accentBorder }]}>
          <Text style={[ss.wordPopupText, { color: T.accent }]}>{wordPopup}</Text>
          <Text style={ss.wordPopupSub}>🔊 اضغط مطولاً للتفسير الكامل</Text>
        </View>
      ) : null}

      {/* مودال الشراء */}
      <PurchaseModal
        T={T} themeId={purchaseModal}
        onClose={() => setPurchaseModal(null)}
        onPurchaseSuccess={onPurchaseSuccess}
        promoInputs={promoInputs}
        setPromoCode={setPromoCode}
        submitPromo={submitPromo}
      />

      {/* شاشات المحتوى */}
      <View style={ss.screensWrap}>
        {activeTab === "home" && (
          <HomeScreen T={T} bookmark={bookmark} sendNotif={sendNotif} setActiveTab={setActiveTab}
            dhikrIdx={dhikrIdx} fastAlert={fastAlert} hijri={hijri} greg={greg}
            countdown={countdown} prayerTimes={displayedPrayerTimes}
            locationCity={locationCity} prayerLoading={prayerLoading} streak={streak} />
        )}
        {activeTab === "quran" && (
          <QuranScreen T={T} fontSize={fontSize} setFontSize={setFontSize}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            currentAyah={currentAyah} setCurrentAyah={setCurrentAyah}
            audioPlaying={audioPlaying} setAudioPlaying={setAudioPlaying}
            bookmark={bookmark} setBookmark={setBookmark}
            onWordPress={handleWordPress} onWordLong={handleWordLong}
            audioLoadingAyah={audioLoadingAyah}
            wordPopup={wordPopup} longModal={longModal} setLongModal={setLongModal} />
        )}
        {activeTab === "tasbeeh" && (
          <TasbeehScreen T={T} count={tasbeehCount} onTap={handleTasbeeh}
            onReset={() => setTasbeehCount(0)}
            shake={tShake} flash={tFlash} floatW={floatW} setFloatW={setFloatW}
            sendNotif={sendNotif} totalLifetime={tasbeehTotal} />
        )}
        {activeTab === "qibla" && (
          <QiblaScreen T={T} compassAngle={effectiveCompass} isAligned={isAligned}
            qiblaAngle={qiblaAngle} locationCity={locationCity} userLocation={userLocation} />
        )}
        {activeTab === "azkar" && (
          <AzkarScreen T={T} azkarTab={azkarTab} setAzkarTab={setAzkarTab}
            morningC={morningC} setMorningC={setMorningC}
            eveningC={eveningC} setEveningC={setEveningC}
            sleepC={sleepC}    setSleepC={setSleepC}
            travelC={travelC}  setTravelC={setTravelC}
            homeC={homeC}      setHomeC={setHomeC}
            sunnahC={sunnahC}  setSunnahC={setSunnahC}
            decrement={decrement} />
        )}
        {activeTab === "stats" && (
          <StatsScreen T={T} weeklyStats={weeklyStats} streak={streak} tasbeehTotal={tasbeehTotal} />
        )}
        {activeTab === "settings" && (
          <SettingsScreen T={T} adFree={adFree}
            masterPromo={masterPromo} setMasterPromo={setMasterPromo}
            masterMsg={masterMsg} handleMasterPromo={handleMasterPromo}
            azanOn={azanOn} setAzanOn={setAzanOn}
            salahOn={salahOn} setSalahOn={setSalahOn}
            salahInt={salahInt} setSalahInt={setSalahInt}
            preOn={preOn} setPreOn={setPreOn}
            autoAzkar={autoAzkar} setAutoAzkar={setAutoAzkar}
            travelOn={travelOn} setTravelOn={setTravelOn}
            fastOn={fastOn} setFastOn={setFastOn}
            fastMT={fastMT} setFastMT={setFastMT}
            fastWD={fastWD} setFastWD={setFastWD}
            activeThemeId={activeThemeId} unlockedIds={unlockedIds}
            onSelect={selectTheme} onBuy={setPurchaseModal}
            sendNotif={sendNotif} mamaMode={mamaMode} />
        )}
      </View>

      {/* إعلان أسفل الشاشة */}
      {!adFree && activeTab !== "quran" && (
        <View style={ss.bottomAd}>
          <Text style={ss.bottomAdText}>إعلان دعائي 📢</Text>
        </View>
      )}

      {/* شريط التنقل السفلي */}
      <View style={[ss.bottomNav, { borderTopColor: T.cardBorder, backgroundColor: "#070707" }]}>
        <View style={ss.bottomNavContent}>
          {NAV_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={ss.navTabBtn} activeOpacity={0.7}>
                <View style={[ss.navTabIconWrap, isActive && { backgroundColor: T.accentSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: T.accentBorder }]}>
                  <Text style={[ss.navTabIcon, { opacity: isActive ? 1 : 0.4 }]}>{t.icon}</Text>
                </View>
                <Text style={[ss.navTabLabel, { color: isActive ? T.accent : "#3a3a3a", fontWeight: isActive ? "700" : "400" }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  الأنماط
// ═══════════════════════════════════════════════════════════════════════════════
const ss = StyleSheet.create({
  // ── جذر ──
  appRoot:       { flex: 1, width: "100%", maxWidth: 430, alignSelf: "center" },
  screensWrap:   { flex: 1, paddingBottom: 82 },

  // ── سبلاش ──
  splashWrap:    { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  splashGlow:    { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#22c55e18", top: "28%" },
  splashEmoji:   { fontSize: 72, marginBottom: 4 },
  splashTitle:   { color: "#fff", fontSize: 46, fontWeight: "900", letterSpacing: 3 },
  splashSub:     { color: "#666", fontSize: 15, marginTop: 6 },
  splashBarTrack:{ width: 140, height: 3, backgroundColor: "#111", borderRadius: 2, marginTop: 44, overflow: "hidden" },
  splashBarFill: { height: "100%", width: "70%", backgroundColor: "#22c55e" },

  // ── إعلان ──
  adWrap:        { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  adBadge:       { position: "absolute", top: 16, left: 16, backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  adBadgeText:   { color: "#666", fontSize: 11 },
  adEmoji:       { fontSize: 56, marginBottom: 14 },
  adTitle:       { color: "#fff", fontSize: 26, fontWeight: "800" },
  adSub:         { color: "#666", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 260 },
  adSkip:        { position: "absolute", top: 60, right: 16, backgroundColor: "#1a1a1a", borderRadius: 20, borderWidth: 1, borderColor: "#333", paddingHorizontal: 20, paddingVertical: 10 },
  adSkipText:    { color: "#ccc", fontSize: 13 },

  // ── Toast ──
  toast:         { position: "absolute", top: 16, alignSelf: "center", backgroundColor: "#111", borderWidth: 1, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10, zIndex: 1500 },
  toastText:     { color: "#e2e8f0", fontSize: 13, textAlign: "center" },

  // ── الفقاعة العائمة ──
  floatBubble:   { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 2, zIndex: 900, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 12, elevation: 12 },
  floatBubbleEmoji:{ fontSize: 26 },
  floatBubbleCount:{ fontSize: 20, fontWeight: "900" },
  floatBubbleClose:{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#222", alignItems: "center", justifyContent: "center" },

  // ── لافتة الكلمة ──
  wordPopup:     { position: "absolute", top: "28%", alignSelf: "center", backgroundColor: "#0d0d0d", borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", zIndex: 800, maxWidth: 220 },
  wordPopupText: { fontSize: 32, marginBottom: 8 },
  wordPopupSub:  { color: "#666", fontSize: 12 },

  // ── مشترك ──
  shWrap:        { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1 },
  shTitle:       { color: "#fff", fontSize: 20, fontWeight: "800" },
  shSub:         { color: "#555", fontSize: 12, marginTop: 3 },
  card:          { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 10 },
  cardTitle:     { color: "#e2e8f0", fontSize: 14, fontWeight: "700", marginBottom: 12 },
  pbarRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pbarLabel:     { color: "#888", fontSize: 12 },
  pbarPct:       { fontSize: 12, fontWeight: "700" },
  pbarTrack:     { height: 5, backgroundColor: "#111", borderRadius: 3 },
  pbarFill:      { height: "100%", borderRadius: 3 },
  riRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  riLabel:       { color: "#555", fontSize: 12 },
  riValue:       { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  toggleRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  toggleLabel:   { color: "#e2e8f0", fontSize: 13 },
  toggleSub:     { color: "#555", fontSize: 11, marginTop: 2 },
  toggleTrack:   { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleThumb:   { position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  btn:           { borderWidth: 1, borderRadius: 20 },
  btnText:       { fontWeight: "600" },

  // ── الرئيسية ──
  homeHeader:    { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  homeHeaderGreg:{ color: "#555", fontSize: 11, marginBottom: 2 },
  homeHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  homeHeaderTitle:{ color: "#fff", fontSize: 22, fontWeight: "900" },
  homeHeaderHijri:{ fontSize: 12 },
  homeHeaderCity: { fontSize: 11, marginTop: 3 },
  streakBadge:   { alignSelf: "flex-start", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  streakText:    { fontSize: 12, fontWeight: "700" },
  dhikrBanner:   { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderBottomWidth: 1 },
  fastAlertText: { color: "#f59e0b", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  dhikrText:     { fontSize: 14, opacity: 0.85, textAlign: "center" },
  countdownRow:  { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  countdownLabel:{ color: "#666", fontSize: 12 },
  countdownVal:  { fontSize: 28, fontWeight: "900", letterSpacing: 2, writingDirection: "ltr" },
  countdownHint: { color: "#444", fontSize: 10 },
  prayerStrip:   { paddingVertical: 10, borderBottomWidth: 1 },
  prayerChip:    { alignItems: "center", gap: 2, minWidth: 58, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  prayerChipName:{ fontSize: 11, color: "#e2e8f0" },
  prayerChipTime:{ fontSize: 13, fontWeight: "700" },
  bookmarkCard:  { borderWidth: 1, borderRadius: 16, padding: 14, marginHorizontal: 16, marginVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bookmarkLabel: { color: "#666", fontSize: 11 },
  bookmarkValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  bookmarkBtn:   { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  bookmarkBtnText:{ color: "#000", fontSize: 13, fontWeight: "800" },
  homeGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  homeGridCard:  { width: (SW - 52) / 2, borderWidth: 1, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 10, alignItems: "center", gap: 6 },
  homeGridIcon:  { fontSize: 32 },
  homeGridLabel: { fontSize: 13, color: "#e2e8f0", fontWeight: "700", textAlign: "center" },
  homeGridSub:   { fontSize: 10, color: "#555", textAlign: "center" },
  nextPrayerSub: { color: "#666", fontSize: 13, marginBottom: 8 },
  nextPrayerBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  nextPrayerBtnText:{ fontSize: 12, fontWeight: "700" },
  sourceFooter:  { paddingHorizontal: 16, paddingVertical: 10, marginBottom: 10 },
  sourceText:    { color: "#333", fontSize: 11, textAlign: "center", lineHeight: 18 },

  // ── القرآن ──
  quranHeader:   { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  quranHeaderTitle:{ color: "#fff", fontSize: 21, fontWeight: "800" },
  quranHeaderSub:  { color: "#555", fontSize: 12 },
  quranSearchRow:  { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 22, marginHorizontal: 16, marginVertical: 8, paddingHorizontal: 14, paddingVertical: 7 },
  quranSearchIcon: { color: "#555", fontSize: 15 },
  quranSearchInput:{ flex: 1, color: "#e2e8f0", fontSize: 14, padding: 0 },
  quranSearchClear:{ color: "#555", fontSize: 14 },
  fontSizeRow:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  fontBtn:         { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  fontBtnText:     { fontSize: 13, fontWeight: "700" },
  fontSizeVal:     { fontSize: 13, minWidth: 38, textAlign: "center" },
  bookmarkInline:  { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center" },
  bookmarkInlineText:{ fontSize: 11 },
  ayahsBox:        { borderWidth: 1, borderRadius: 16, marginHorizontal: 14, marginBottom: 12, padding: 14 },
  basmalah:        { textAlign: "center", fontSize: 14, marginBottom: 14, letterSpacing: 2 },
  ayahRow:         { position: "relative", flexDirection: "row", gap: 8, alignItems: "flex-start", paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: "#0d0d0d", borderRadius: 8 },
  bookmarkRibbon:  { position: "absolute", top: 0, right: 0, width: 4, height: "100%", borderRadius: 2 },
  ayahNumCircle:   { minWidth: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 8 },
  ayahNumText:     { fontSize: 11 },
  ayahWordsWrap:   { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  ayahWord:        { color: "#f0e6d3", paddingHorizontal: 4, paddingVertical: 2, lineHeight: 48 },
  ayahHint:        { textAlign: "center", color: "#333", fontSize: 11, marginTop: 12 },
  audioPlayer:     { borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  audioBtnSmall:   { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  audioBtnSmallText:{ color: "#ccc", fontSize: 14 },
  audioBtnMain:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  audioBtnMainText:{ color: "#000", fontSize: 18, fontWeight: "800" },
  audioProgressWrap:{ flex: 1 },
  audioProgressLabel:{ color: "#888", fontSize: 10, marginBottom: 3 },
  audioProgressTrack:{ height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  audioProgressFill: { height: "100%", borderRadius: 2 },
  audioStatus:     { fontSize: 10 },
  modalOverlay:    { flex: 1, backgroundColor: "#000000bb", alignItems: "center", justifyContent: "center" },
  longModalBox:    { backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 20, padding: 20, maxWidth: 340, width: "90%", maxHeight: "80%" },
  longModalWord:   { fontSize: 30, textAlign: "center", marginBottom: 12 },
  longModalDivider:{ borderBottomWidth: 1, borderBottomColor: "#111", marginVertical: 10 },
  longModalNoData: { color: "#666", fontSize: 13, textAlign: "center" },
  longModalHint:   { color: "#888", fontSize: 12, lineHeight: 19 },
  longModalClose:  { width: "100%", marginTop: 14, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  longModalCloseText:{ color: "#000", fontSize: 14, fontWeight: "700" },

  // ── المسبحة ──
  tasbeehCenter: { alignItems: "center", paddingVertical: 22 },
  tasbeehStage:  { fontSize: 14, marginBottom: 18, fontWeight: "700" },
  tasbeehBtn:    { borderWidth: 3, alignItems: "center", justifyContent: "center" },
  tasbeehCount:  { fontSize: 56, fontWeight: "900" },
  tasbeehTapHint:{ fontSize: 12, color: "#444", marginTop: 4 },
  tasbeehActionsRow:{ flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" },
  tasbeehMilestone: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tasbeehMilestoneText:{ fontSize: 12 },
  tasbeehLifetime:{ fontSize: 12, marginTop: 14 },

  // ── القبلة ──
  qiblaWrap:     { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  qiblaCircle:   { width: 240, height: 240, borderRadius: 120, borderWidth: 4, backgroundColor: "#050505", alignItems: "center", justifyContent: "center", position: "relative" },
  qiblaDir:      { position: "absolute", fontSize: 11, fontWeight: "700" },
  qiblaNeedleWrap:{ position: "absolute", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  qiblaArrowUp:  { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 68, borderLeftColor: "transparent", borderRightColor: "transparent", marginBottom: 4 },
  qiblaArrowDown:{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 68, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#333" },
  qiblaKaaba:    { fontSize: 36, zIndex: 2 },
  qiblaAligned:  { color: "#22c55e", fontSize: 18, fontWeight: "800", marginTop: 20 },
  qiblaNotAligned:{ color: "#ef4444", fontSize: 15, marginTop: 20 },
  qiblaAngle:    { color: "#444", fontSize: 12, marginTop: 8, textAlign: "center" },

  // ── الأذكار ──
  azkarGridRow:  { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderBottomWidth: 1 },
  azkarGridBtn:  { width: "30%", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 8, gap: 3 },
  azkarGridText: { fontSize: 11 },
  azkarListWrap: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80 },
  azkarCard:     { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  azkarCardDone: { opacity: 0.35 },
  azkarCardLabel:{ fontSize: 11, marginBottom: 6, fontWeight: "700" },
  azkarCardText: { color: "#e2e8f0", fontSize: 15, lineHeight: 28 },
  azkarCardFooter:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  azkarRecordBtn:{ borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  azkarRecordBtnText:{ fontSize: 12 },
  azkarCounterCircle:{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  azkarCounterText:{ fontSize: 13, fontWeight: "700" },
  azkarDoneText: { color: "#22c55e", fontSize: 12, marginTop: 4 },

  // ── الإحصاء ──
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  statBox:       { width: (SW - 48) / 2, backgroundColor: "#0a0a0a", borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  statIcon:      { fontSize: 22 },
  statVal:       { fontSize: 22, fontWeight: "900" },
  statUnit:      { fontSize: 10 },
  statLabel:     { fontSize: 11, color: "#555", marginTop: 2, textAlign: "center" },
  barsRow:       { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 100 },
  barCol:        { flex: 1, alignItems: "center", gap: 2 },
  barVal:        { fontSize: 8 },
  barFill:       { width: "100%", borderRadius: 3, borderTopWidth: 2 },
  barDay:        { fontSize: 8, color: "#444" },
  achievementRow:{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  achievementLabel:{ fontSize: 13, fontWeight: "700" },

  // ── الإعدادات ──
  themeRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  themeEmojiBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  themeEmoji:    { fontSize: 18 },
  themeName:     { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },
  themeDesc:     { color: "#555", fontSize: 10, marginTop: 1 },
  themeActionBtn:{ borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5 },
  themeActionText:{ fontSize: 11 },
  promoRow:      { flexDirection: "row", gap: 8 },
  promoInput:    { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  promoBtn:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, justifyContent: "center" },
  promoBtnText:  { fontSize: 13, fontWeight: "700" },
  promoMsg:      { fontSize: 12, marginTop: 8 },
  promoAdFree:   { color: "#22c55e", fontSize: 12, marginTop: 8 },
  salahIntWrap:  { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  salahIntLabel: { color: "#888", fontSize: 12, marginBottom: 8 },
  salahIntRow:   { flexDirection: "row", gap: 8 },
  salahIntBtn:   { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center" },
  salahIntBtnText:{ fontSize: 11 },
  mamaBadge:     { alignItems: "center", padding: 16 },
  mamaText:      { color: "#ff2d5f", fontSize: 15, fontWeight: "700" },

  // ── مودال الشراء ──
  purchaseOverlay:   { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  purchaseSheet:     { backgroundColor: "#0d0d0d", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "88%" },
  purchaseHandle:    { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  purchaseHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  purchaseEmojiBox:  { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  purchaseEmoji:     { fontSize: 24 },
  purchaseName:      { color: "#fff", fontSize: 15, fontWeight: "800" },
  purchaseSubName:   { color: "#666", fontSize: 11, marginTop: 2 },
  purchasePriceBadge:{ borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 18 },
  purchasePriceText: { fontSize: 13, fontWeight: "800" },
  purchaseDesc:      { color: "#888", fontSize: 12, marginBottom: 16, lineHeight: 20 },
  vipBox:            { backgroundColor: "#ffffff08", borderWidth: 1, borderColor: "#ffffff14", borderRadius: 12, padding: 12, marginBottom: 14 },
  vipBoxTitle:       { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  vipBoxItem:        { color: "#ccc", fontSize: 12, marginBottom: 5, lineHeight: 18 },
  purchaseBuyBtn:    { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  purchaseBuyBtnText:{ color: "#000", fontSize: 14, fontWeight: "800" },
  purchasePromoSection:{ borderTopWidth: 1, borderTopColor: "#1e1e1e", paddingTop: 12 },
  purchasePromoLabel:  { color: "#666", fontSize: 12, marginBottom: 8 },
  purchasePromoRow:    { flexDirection: "row", gap: 8 },
  purchasePromoInput:  { flex: 1, backgroundColor: "#111", borderWidth: 1, color: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  purchasePromoBtn:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, justifyContent: "center" },
  purchasePromoBtnText:{ fontSize: 12, fontWeight: "700" },
  purchasePromoMsg:    { fontSize: 11, marginTop: 5 },
  purchaseCancelBtn:   { width: "100%", marginTop: 10, alignItems: "center" },
  purchaseCancelText:  { color: "#444", fontSize: 13 },

  // ── شريط التنقل ──
  bottomAd:      { backgroundColor: "#080808", borderTopWidth: 1, borderTopColor: "#111", paddingVertical: 6, alignItems: "center", position: "absolute", bottom: 80, left: 0, right: 0, zIndex: 90 },
  bottomAdText:  { color: "#333", fontSize: 10 },
  bottomNav:     { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, zIndex: 100, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 20 : 10 },
  bottomNavContent:{ flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  navTabBtn:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  navTabIconWrap:{ alignItems: "center", justifyContent: "center", minWidth: 32, height: 30 },
  navTabIcon:    { fontSize: 18 },
  navTabLabel:   { fontSize: 9, letterSpacing: 0.2 },
});
