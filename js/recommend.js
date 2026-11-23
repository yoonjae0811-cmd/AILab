// 규칙 기반 루틴 추천과 단계 조정 (설계서 6장 추천 규칙, 11장 처리 순서)
// 화면·저장소와 분리된 순수 함수라 Node에서도 테스트할 수 있습니다.

import { EXERCISES, EXERCISE_BY_ID, BODY_PARTS } from './data/exercises.js';
import { GOAL_LABEL } from './data/content.js';

// 단계별 기준 (설계서 6장 난이도 단계 표)
export const LEVELS = {
  1: { minutes: 10, reps: 8, sets: 2, postures: ['seated'], counts: { warmup: 2, main: 4, cooldown: 2 } },
  2: { minutes: 15, reps: 10, sets: 2, postures: ['seated', 'support'], counts: { warmup: 2, main: 6, cooldown: 2 } },
  3: { minutes: 20, reps: 12, sets: 2, postures: ['seated', 'support', 'standing'], counts: { warmup: 3, main: 7, cooldown: 2 } },
};

export const SECONDS_PER_REP = 4;
export const REST_BETWEEN_SETS = 20;
export const REST_BETWEEN_EXERCISES = 15;

// 본운동 분류 계획: 목표에 맞는 분류가 절반 이상이 되게 (설계서 6장 규칙 4)
const MAIN_PLAN = {
  legs: ['strength', 'strength', 'balance', 'strength', 'flex', 'strength', 'balance'],
  balance: ['balance', 'balance', 'strength', 'balance', 'flex', 'balance', 'strength'],
  flex: ['flex', 'flex', 'strength', 'flex', 'balance', 'flex', 'strength'],
  general: ['strength', 'balance', 'flex', 'strength', 'balance', 'flex', 'strength'],
  rest: ['flex', 'flex', 'balance', 'flex'], // 컨디션 '나쁨'
};

// 단계 상한: 안전 점검 '예' 또는 80세 이상은 1단계 고정 (규칙 1)
export function maxLevel(st) {
  if (st.safety?.flagged) return 1;
  if (st.user?.ageGroup === '80') return 1;
  return 3;
}

export function startLevel(st) {
  if (maxLevel(st) === 1) return 1;
  const { experience, activity } = st.profile || {};
  if (experience === 'regular') return 2;
  if (experience === 'some' && activity !== 'low') return 2;
  return 1;
}

// 하루 단위로 같은 결과가 나오는 난수 (같은 날 다시 열어도 같은 루틴)
function seeded(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function effectiveLevel(st, condition) {
  const lv = Math.min(st.level || 1, maxLevel(st));
  return condition === 'bad' ? Math.max(1, lv - 1) : lv;
}

// 규칙 필터: 단계·불편 부위·공간·제외 목록 (설계서 11장 1단계)
export function candidates(st, condition) {
  const lv = effectiveLevel(st, condition);
  let postures = LEVELS[lv].postures;
  if (st.profile?.space === 'seat') postures = ['seated'];
  const pain = new Set(st.profile?.pain || []);
  const excluded = new Set(st.excluded || []);
  return EXERCISES.filter((e) =>
    e.level <= lv &&
    postures.includes(e.posture) &&
    !e.avoid.some((p) => pain.has(p)) &&
    !excluded.has(e.id));
}

export function doseFor(ex, lv) {
  const base = LEVELS[lv];
  const isMain = ex.category !== 'warmup' && ex.category !== 'cooldown';
  const sets = isMain ? base.sets : 1;
  if (ex.seconds) {
    const mult = { 1: 1, 2: 1.25, 3: 1.5 }[lv];
    return { seconds: Math.round((ex.seconds * mult) / 5) * 5, sets };
  }
  const reps = isMain ? base.reps : ex.reps;
  return { reps, sets };
}

export function itemSeconds(item) {
  const ex = EXERCISE_BY_ID[item.id];
  const sides = ex?.perSide ? 2 : 1;
  const work = item.seconds ? item.seconds * sides : item.reps * SECONDS_PER_REP * sides;
  return work * item.sets + REST_BETWEEN_SETS * (item.sets - 1);
}

export function estimateMinutes(items) {
  const total = items.reduce((s, it) => s + itemSeconds(it), 0)
    + REST_BETWEEN_EXERCISES * Math.max(0, items.length - 1);
  return Math.max(1, Math.round(total / 60));
}

function recentUse(st) {
  const counts = {};
  (st.routines || []).slice(-3).forEach((r) => r.items.forEach((it) => {
    counts[it.id] = (counts[it.id] || 0) + 1;
  }));
  return counts;
}

function pick(pool, n, used, rand, chosen, preferPose) {
  const out = [];
  const scored = pool
    .filter((e) => !chosen.has(e.id))
    .map((e) => ({ e, s: (used[e.id] || 0) + rand() * 0.9 - (preferPose && e.pose ? 0.6 : 0) }))
    .sort((a, b) => a.s - b.s);
  for (const { e } of scored) {
    if (out.length >= n) break;
    out.push(e);
    chosen.add(e.id);
  }
  return out;
}

export function buildReason(st, condition, lv) {
  const parts = [];
  if (condition === 'bad') {
    parts.push('컨디션이 좋지 않아 가벼운 늘리기 위주로 골랐어요.');
  } else {
    parts.push(`${GOAL_LABEL[st.profile?.goal] || '전체 건강'} 목표에 맞춰 ${lv}단계 운동으로 골랐어요.`);
  }
  const pain = (st.profile?.pain || []).map((p) => BODY_PARTS[p]).filter(Boolean);
  if (pain.length) parts.push(`${pain.join('·')}에 부담이 큰 동작은 뺐어요.`);
  return parts.join(' ');
}

// 규칙만으로 루틴 만들기 (AI가 없거나 실패했을 때의 기본 루틴이기도 함)
export function buildRoutine(st, { condition = 'ok', date, poseEnabled = true } = {}) {
  const lv = effectiveLevel(st, condition);
  const pool = candidates(st, condition);
  const rand = seeded(`${date}|${st.user?.createdAt || ''}|${condition}|${st.excluded?.length || 0}`);
  const used = recentUse(st);
  const chosen = new Set();
  const counts = LEVELS[lv].counts;

  const byCat = (c) => pool.filter((e) => e.category === c);
  const warm = pick(byCat('warmup'), counts.warmup, used, rand, chosen, false);

  const plan = (condition === 'bad' ? MAIN_PLAN.rest : MAIN_PLAN[st.profile?.goal] || MAIN_PLAN.general)
    .slice(0, condition === 'bad' ? 4 : counts.main);
  const main = [];
  let poseUsed = false;
  for (const cat of plan) {
    let got = pick(byCat(cat), 1, used, rand, chosen, poseEnabled && !poseUsed);
    if (!got.length) {
      const any = pool.filter((e) => ['strength', 'balance', 'flex'].includes(e.category));
      got = pick(any, 1, used, rand, chosen, false);
    }
    if (got.length) {
      if (got[0].pose) poseUsed = true;
      main.push(got[0]);
    }
  }

  const cool = pick(byCat('cooldown'), counts.cooldown, used, rand, chosen, false);

  const items = [...warm, ...main, ...cool].map((e) => ({ id: e.id, ...doseFor(e, lv) }));
  return {
    date,
    condition,
    level: lv,
    items,
    reason: buildReason(st, condition, lv),
    source: 'rule',
    estMinutes: estimateMinutes(items),
  };
}

// AI가 고른 루틴 검증 (설계서 11장 3단계)
// 후보 밖의 운동, 단계 기준을 넘는 횟수·세트가 하나라도 있으면 버리고 규칙 루틴을 씁니다.
export function validateAiRoutine(ai, cands, lv) {
  if (!ai || !Array.isArray(ai.items) || ai.items.length < 4 || ai.items.length > 14) return null;
  const ok = new Set(cands.map((c) => c.id));
  const base = LEVELS[lv];
  const items = [];
  for (const it of ai.items) {
    if (!it || !ok.has(it.id)) return null;
    const ex = EXERCISE_BY_ID[it.id];
    const sets = Number(it.sets) || 1;
    if (sets < 1 || sets > base.sets) return null;
    if (ex.seconds) {
      const sec = Number(it.seconds) || ex.seconds;
      if (sec < 5 || sec > 60) return null;
      items.push({ id: ex.id, seconds: sec, sets });
    } else {
      const reps = Number(it.reps) || ex.reps;
      if (reps < 3 || reps > base.reps) return null;
      items.push({ id: ex.id, reps, sets });
    }
  }
  if (new Set(items.map((i) => i.id)).size !== items.length) return null;
  const order = { warmup: 0, strength: 1, balance: 1, flex: 1, cooldown: 2 };
  items.sort((a, b) => order[EXERCISE_BY_ID[a.id].category] - order[EXERCISE_BY_ID[b.id].category]);
  const mins = estimateMinutes(items);
  if (mins > base.minutes + 8) return null;
  const reason = typeof ai.reason === 'string' && ai.reason.length <= 80 ? ai.reason : null;
  return { items, reason, estMinutes: mins };
}

// 운동 후 단계 조정 (설계서 6장 규칙 6)
// 연속 3회 '쉬움' → 상향 제안(사용자 동의 시에만), 연속 2회 '힘듦' 또는 '불편해요' 1회 → 하향
export function evaluateProgress(st, today) {
  const logs = (st.logs || []).filter((l) => l.completed || l.discomfort);
  const last = logs[logs.length - 1];
  const lv = st.level || 1;
  if (last?.discomfort && lv > 1) return { change: -1, why: 'discomfort' };
  const done = logs.filter((l) => l.difficulty);
  const last2 = done.slice(-2);
  if (last2.length === 2 && last2.every((l) => l.difficulty === 'hard' && l.level === lv) && lv > 1) {
    return { change: -1, why: 'hard' };
  }
  const last3 = done.slice(-3);
  const cap = maxLevel(st);
  if (last3.length === 3 && last3.every((l) => l.difficulty === 'easy') && lv < cap) {
    // 2단계 → 3단계는 2단계를 2주 이상 한 뒤에만
    if (lv === 2 && st.levelSince && today) {
      const [y1, m1, d1] = st.levelSince.split('-').map(Number);
      const [y2, m2, d2] = today.split('-').map(Number);
      const days = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
      if (days < 14) return { change: 0 };
    }
    // 단계를 올린 뒤의 기록만 따지기
    const recent = last3.filter((l) => l.level === lv && (!st.levelSince || l.date >= st.levelSince));
    if (recent.length === 3) return { change: +1, why: 'easy' };
  }
  return { change: 0 };
}
