// 기기 안 저장소 (localStorage).
// 시제품에서는 모든 데이터를 휴대폰 안에만 저장합니다.
// 서버 DB(Supabase 등)로 옮길 때는 이 파일만 바꾸면 되도록 저장·조회를 모아 두었습니다.

const KEY = 'silverfit.v1';

const DEFAULT_SETTINGS = {
  fontSize: 'normal', // normal | large | xlarge
  tts: true,
  poseEnabled: true,
  cameraConsent: false,
  reminderOn: false,
  reminderTime: '09:00',
};

function fresh() {
  return {
    user: null,        // { name, ageGroup, consentAt, createdAt }
    safety: null,      // { answers: [bool], flagged, at }
    profile: null,     // { experience, activity, goal, pain: [], space }
    level: 1,
    levelSince: null,
    settings: { ...DEFAULT_SETTINGS },
    routines: [],      // 생성된 루틴 (최근 30개)
    logs: [],          // 운동 기록
    excluded: [],      // 불편해서 빼기로 한 운동 id
    pendingLevelUp: false,
    discomfortAckFor: null, // 확인한 불편 기록 id
  };
}

let state = load();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  } catch {
    return fresh();
  }
}

export function get() {
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 공간이 없거나 막힌 경우: 이번 실행 동안만 유지
  }
}

export function update(fn) {
  fn(state);
  save();
  return state;
}

export function reset() {
  state = fresh();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ── 날짜 도우미 (기기 현지 시간 기준) ──────────────
export function dateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dateStr(dt);
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── 기록 조회 ──────────────────────────────────
export function completedDates() {
  return new Set(state.logs.filter((l) => l.completed).map((l) => l.date));
}

export function streak(today = dateStr()) {
  const done = completedDates();
  let cur = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(cur)) {
    n += 1;
    cur = addDays(cur, -1);
  }
  return n;
}

export function weekRange(today = dateStr()) {
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 월요일 = 0
  const start = addDays(today, -dow);
  return { start, end: addDays(start, 6) };
}

export function weekSummary(today = dateStr()) {
  const { start, end } = weekRange(today);
  const logs = state.logs.filter((l) => l.completed && l.date >= start && l.date <= end);
  const days = new Set(logs.map((l) => l.date)).size;
  const minutes = Math.round(logs.reduce((s, l) => s + (l.durationSec || 0), 0) / 60);
  const goal = days < 3 ? Math.max(2, days + 1) : Math.min(5, days + 1);
  return { days, minutes, goal };
}

export function lastLog() {
  return state.logs.length ? state.logs[state.logs.length - 1] : null;
}

export function todayLog(today = dateStr()) {
  return state.logs.filter((l) => l.date === today && l.completed).pop() || null;
}
