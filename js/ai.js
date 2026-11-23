// AI 연동 (F-04, F-12). AI API 키는 서버 함수에만 있고, 앱은 서버 함수만 부릅니다.
// 이름 등 식별 정보는 보내지 않습니다 (N-06).

import { CONFIG } from './config.js';
import { EXERCISE_BY_ID } from './data/exercises.js';
import {
  hasEmergency, EMERGENCY_TEXT, LOCAL_ANSWERS, LOCAL_DEFAULT, FAQ,
} from './data/content.js';
import { candidates, effectiveLevel, LEVELS, validateAiRoutine } from './recommend.js';

let available = null; // null = 아직 모름

async function post(path, body, timeout = CONFIG.AI_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${CONFIG.AI_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function checkAvailable() {
  if (available !== null) return available;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${CONFIG.AI_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = res.ok ? await res.json() : null;
    available = !!(j && j.ok);
  } catch {
    available = false;
  }
  return available;
}

export function isAvailable() {
  return available === true;
}

function recentSummary(st) {
  return (st.logs || []).slice(-5).map((l) => ({
    date: l.date,
    completed: !!l.completed,
    difficulty: l.difficulty || null,
    discomfort: l.discomfort ? l.discomfort.symptom : null,
  }));
}

// 규칙으로 후보를 추린 뒤 AI가 고르고, 앱이 다시 검증합니다 (설계서 11장).
export async function aiRoutine(st, condition) {
  if (!(await checkAvailable())) return null;
  const lv = effectiveLevel(st, condition);
  const cands = candidates(st, condition);
  const payload = {
    ageGroup: st.user?.ageGroup,
    level: lv,
    limits: { maxReps: LEVELS[lv].reps, maxSets: LEVELS[lv].sets, minutes: LEVELS[lv].minutes, counts: LEVELS[lv].counts },
    goal: st.profile?.goal,
    pain: st.profile?.pain || [],
    condition,
    recent: recentSummary(st),
    recentExercises: (st.routines || []).slice(-3).map((r) => r.items.map((i) => i.id)),
    candidates: cands.map((c) => ({
      id: c.id, name: c.name, category: c.category, posture: c.posture,
      unit: c.seconds ? 'seconds' : 'reps', perSide: !!c.perSide,
    })),
  };
  try {
    const ai = await post('/recommend', payload);
    const v = validateAiRoutine(ai, cands, lv);
    return v ? { ...v, level: lv, source: 'ai' } : null;
  } catch {
    return null;
  }
}

function localAnswer(text) {
  const t = text.trim();
  const faq = FAQ.find((f) => f.q === t);
  if (faq) return faq.a;
  const exercise = Object.values(EXERCISE_BY_ID).find((e) => t.includes(e.name));
  if (exercise) {
    return `${exercise.name}: ${exercise.steps.join(' ')} 주의할 점: ${exercise.caution}`;
  }
  const hit = LOCAL_ANSWERS.find((r) => r.keys.some((k) => t.includes(k)));
  return hit ? hit.a : LOCAL_DEFAULT;
}

// 질문 → { text, emergency, source }
export async function ask(st, text) {
  if (hasEmergency(text)) return { text: EMERGENCY_TEXT, emergency: true, source: 'rule' };
  if (await checkAvailable()) {
    try {
      const r = await post('/ask', {
        question: text.slice(0, 300),
        ageGroup: st.user?.ageGroup,
        level: st.level,
        pain: st.profile?.pain || [],
      }, 12000);
      if (r && typeof r.answer === 'string' && r.answer.trim()) {
        return { text: r.answer.trim(), emergency: !!r.emergency, source: 'ai' };
      }
    } catch {
      // 아래 기본 답변으로
    }
  }
  return { text: localAnswer(text), emergency: false, source: 'rule' };
}
