// 추천 규칙과 자세 인식 판정 로직 테스트: node tests/run.js
import assert from 'node:assert/strict';
import { EXERCISES, EXERCISE_BY_ID } from '../js/data/exercises.js';
import {
  buildRoutine, candidates, startLevel, maxLevel, evaluateProgress, validateAiRoutine, LEVELS,
} from '../js/recommend.js';
import { SitToStand, KneeExtension, ArmRaise } from '../js/pose-logic.js';
import { hasEmergency } from '../js/data/content.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  통과  ${name}`);
  } catch (e) {
    console.error(`  실패  ${name}\n        ${e.message}`);
    process.exitCode = 1;
  }
};

const base = (over = {}) => ({
  user: { name: '테스트', ageGroup: '70', createdAt: '2026-11-01' },
  safety: { flagged: false },
  profile: { experience: 'some', activity: 'mid', goal: 'legs', pain: [], space: 'stand' },
  level: 2,
  levelSince: '2026-11-01',
  routines: [],
  logs: [],
  excluded: [],
  ...over,
});

console.log('운동 콘텐츠');
test('운동 30~40개, id 중복 없음', () => {
  assert.ok(EXERCISES.length >= 30 && EXERCISES.length <= 40, `${EXERCISES.length}개`);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});
test('모든 운동에 설명 3줄·주의사항·횟수 또는 시간', () => {
  for (const e of EXERCISES) {
    assert.equal(e.steps.length, 3, e.id);
    assert.ok(e.caution, e.id);
    assert.ok(!!e.reps !== !!e.seconds, `${e.id}: reps와 seconds 중 하나만`);
  }
});
test('자세 인식 동작은 3개', () => {
  assert.equal(EXERCISES.filter((e) => e.pose).length, 3);
});

console.log('추천 규칙');
test('안전 점검 예 → 1단계 고정', () => {
  const st = base({ safety: { flagged: true }, profile: { ...base().profile, experience: 'regular' } });
  assert.equal(maxLevel(st), 1);
  assert.equal(startLevel(st), 1);
});
test('80대 이상 → 1단계 고정', () => {
  assert.equal(maxLevel(base({ user: { ageGroup: '80' } })), 1);
});
test('1단계는 의자 동작만', () => {
  const r = buildRoutine(base({ level: 1 }), { date: '2026-11-20' });
  r.items.forEach((it) => assert.equal(EXERCISE_BY_ID[it.id].posture, 'seated', it.id));
  assert.equal(r.level, 1);
  assert.ok(r.estMinutes >= 7 && r.estMinutes <= 14, `${r.estMinutes}분`);
});
test('앉아서만 → 서는 동작 없음 (2단계라도)', () => {
  const st = base({ profile: { ...base().profile, space: 'seat' } });
  buildRoutine(st, { date: '2026-11-20' }).items
    .forEach((it) => assert.equal(EXERCISE_BY_ID[it.id].posture, 'seated'));
});
test('불편 부위 동작 제외', () => {
  const st = base({ profile: { ...base().profile, pain: ['knee', 'shoulder'] } });
  candidates(st, 'ok').forEach((e) => {
    assert.ok(!e.avoid.includes('knee') && !e.avoid.includes('shoulder'), e.id);
  });
});
test('구성 순서: 준비 → 본운동 → 마무리, 다리 목표면 근력이 절반 이상', () => {
  const r = buildRoutine(base(), { date: '2026-11-20' });
  const cats = r.items.map((it) => EXERCISE_BY_ID[it.id].category);
  assert.equal(cats[0], 'warmup');
  assert.equal(cats.at(-1), 'cooldown');
  const main = cats.filter((c) => !['warmup', 'cooldown'].includes(c));
  assert.ok(main.filter((c) => c === 'strength').length >= main.length / 2, main.join(','));
});
test('컨디션 나쁨 → 한 단계 낮춤', () => {
  const r = buildRoutine(base(), { condition: 'bad', date: '2026-11-20' });
  assert.equal(r.level, 1);
});
test('단계별 시간 목표 근처 (10/15/20분)', () => {
  for (const lv of [1, 2, 3]) {
    const st = base({ level: lv, profile: { ...base().profile, experience: 'regular' } });
    const r = buildRoutine(st, { date: '2026-11-20' });
    const target = LEVELS[lv].minutes;
    assert.ok(Math.abs(r.estMinutes - target) <= 6, `${lv}단계 ${r.estMinutes}분`);
  }
});
test('최근 3회 루틴과 본운동이 절반 이상 같지 않음', () => {
  let st = base();
  const days = ['2026-11-17', '2026-11-18', '2026-11-19'];
  for (const d of days) {
    const r = buildRoutine(st, { date: d });
    st = { ...st, routines: [...st.routines, r] };
  }
  const today = buildRoutine(st, { date: '2026-11-20' });
  const main = (r) => r.items.filter((i) => !['warmup', 'cooldown'].includes(EXERCISE_BY_ID[i.id].category)).map((i) => i.id);
  const prev = main(st.routines.at(-1));
  const same = main(today).filter((id) => prev.includes(id)).length;
  assert.ok(same <= main(today).length / 2, `겹침 ${same}/${main(today).length}`);
});
test('같은 날 같은 조건이면 같은 루틴', () => {
  const a = buildRoutine(base(), { date: '2026-11-20' });
  const b = buildRoutine(base(), { date: '2026-11-20' });
  assert.deepEqual(a.items, b.items);
});

console.log('AI 결과 검증');
test('후보 밖 운동이면 거부', () => {
  const st = base({ level: 1 });
  const c = candidates(st, 'ok');
  const bad = { items: [{ id: 'w1', reps: 5, sets: 1 }, { id: 's11', reps: 8, sets: 2 }, { id: 'f1', seconds: 15, sets: 1 }, { id: 'c1', reps: 5, sets: 1 }] };
  assert.equal(validateAiRoutine(bad, c, 1), null);
});
test('횟수 초과면 거부, 정상이면 통과', () => {
  const st = base({ level: 1 });
  const c = candidates(st, 'ok');
  const over = { items: [{ id: 'w1', reps: 5, sets: 1 }, { id: 's1', reps: 20, sets: 2 }, { id: 'f1', seconds: 15, sets: 1 }, { id: 'c1', reps: 5, sets: 1 }] };
  assert.equal(validateAiRoutine(over, c, 1), null);
  const good = { items: [{ id: 'c1', reps: 5, sets: 1 }, { id: 's1', reps: 8, sets: 2 }, { id: 'w1', reps: 5, sets: 1 }, { id: 'f1', seconds: 15, sets: 2 }], reason: '다리 힘을 기르는 동작이에요.' };
  const v = validateAiRoutine(good, c, 1);
  assert.ok(v);
  assert.equal(EXERCISE_BY_ID[v.items[0].id].category, 'warmup');
  assert.equal(EXERCISE_BY_ID[v.items.at(-1).id].category, 'cooldown');
});

console.log('단계 조정');
const log = (difficulty, date, level = 2, extra = {}) => ({ completed: true, difficulty, date, level, ...extra });
test('연속 3회 쉬움 → 상향 제안', () => {
  const st = base({ level: 1, levelSince: '2026-11-01', logs: [log('easy', '2026-11-18', 1), log('easy', '2026-11-19', 1), log('easy', '2026-11-20', 1)] });
  assert.equal(evaluateProgress(st, '2026-11-20').change, 1);
});
test('2단계는 2주 전에는 3단계로 안 올림', () => {
  const st = base({ level: 2, levelSince: '2026-11-15', logs: [log('easy', '2026-11-18'), log('easy', '2026-11-19'), log('easy', '2026-11-20')] });
  assert.equal(evaluateProgress(st, '2026-11-20').change, 0);
});
test('1단계 고정이면 상향 없음', () => {
  const st = base({ level: 1, safety: { flagged: true }, logs: [log('easy', '2026-11-18', 1), log('easy', '2026-11-19', 1), log('easy', '2026-11-20', 1)] });
  assert.equal(evaluateProgress(st, '2026-11-20').change, 0);
});
test('연속 2회 힘듦 → 하향', () => {
  const st = base({ logs: [log('hard', '2026-11-19'), log('hard', '2026-11-20')] });
  assert.equal(evaluateProgress(st, '2026-11-20').change, -1);
});
test('불편해요 1회 → 하향', () => {
  const st = base({ logs: [{ completed: false, date: '2026-11-20', level: 2, discomfort: { symptom: 'joint' } }] });
  assert.equal(evaluateProgress(st, '2026-11-20').change, -1);
});

console.log('응급 키워드');
test('응급 문장 감지, 일반 문장은 통과', () => {
  assert.ok(hasEmergency('운동하다가 가슴이 아파요'));
  assert.ok(hasEmergency('숨이 막혀요'));
  assert.ok(!hasEmergency('숨쉬기 운동은 어떻게 해요?'));
  assert.ok(!hasEmergency('무릎이 시큰해요'));
});

console.log('자세 인식 판정');
const P = (over) => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.99 }));
  Object.entries(over).forEach(([i, v]) => { lm[i] = { ...lm[i], ...v }; });
  return lm;
};
// 앉은 자세: 어깨 0.35, 엉덩이 0.6, 무릎 0.62 / 선 자세: 어깨 0.2, 엉덩이 0.45, 무릎 0.65
const sit = P({ 11: { y: 0.35, x: 0.4 }, 12: { y: 0.35, x: 0.6 }, 23: { y: 0.6, x: 0.44 }, 24: { y: 0.6, x: 0.56 }, 25: { y: 0.62 }, 26: { y: 0.62 } });
const stand = P({ 11: { y: 0.2, x: 0.4 }, 12: { y: 0.2, x: 0.6 }, 23: { y: 0.45, x: 0.44 }, 24: { y: 0.45, x: 0.56 }, 25: { y: 0.65 }, 26: { y: 0.65 } });
const half = P({ 11: { y: 0.3, x: 0.4 }, 12: { y: 0.3, x: 0.6 }, 23: { y: 0.55, x: 0.44 }, 24: { y: 0.55, x: 0.56 }, 25: { y: 0.66 }, 26: { y: 0.66 } });
test('일어서기: 앉음→섬→앉음 = 1회, 2번 반복 = 2회', () => {
  const d = new SitToStand();
  let t = 0;
  for (const f of [sit, sit, stand, stand, sit, sit, stand, sit]) d.update(f, (t += 1000));
  assert.equal(d.c.count, 2);
});
test('일어서기: 덜 일어서면 횟수 안 세고 안내', () => {
  const d = new SitToStand();
  let t = 0;
  let r;
  for (const f of [sit, half, sit]) r = d.update(f, (t += 1000));
  assert.equal(d.c.count, 0);
  assert.match(r.feedback, /끝까지/);
});
test('일어서기: 너무 빠르면 천천히 안내', () => {
  const d = new SitToStand();
  let r;
  let t = 0;
  for (const f of [sit, stand, sit, stand, sit]) r = d.update(f, (t += 300));
  assert.match(r.feedback, /천천히/);
});
// 다리 펴기: 엉덩이 0.55, 무릎 0.65, 발목 굽힘 0.85 / 폄 0.68
const bent = P({ 23: { y: 0.55 }, 24: { y: 0.55 }, 25: { y: 0.65 }, 26: { y: 0.65 }, 27: { y: 0.85 }, 28: { y: 0.85 } });
const extL = P({ 23: { y: 0.55 }, 24: { y: 0.55 }, 25: { y: 0.65 }, 26: { y: 0.65 }, 27: { y: 0.68 }, 28: { y: 0.85 } });
const extR = P({ 23: { y: 0.55 }, 24: { y: 0.55 }, 25: { y: 0.65 }, 26: { y: 0.65 }, 27: { y: 0.85 }, 28: { y: 0.68 } });
test('다리 펴기: 왼쪽·오른쪽 번갈아 2회', () => {
  const d = new KneeExtension();
  let t = 0;
  for (const f of [bent, bent, extL, extL, bent, extR, bent]) d.update(f, (t += 1500));
  assert.equal(d.c.count, 2);
});
// 팔 들기: 어깨 0.4, 엉덩이 0.7, 손목 내림 0.72 / 올림 0.15
const armsDown = P({ 11: { y: 0.4, x: 0.4 }, 12: { y: 0.4, x: 0.6 }, 13: { y: 0.55, x: 0.38 }, 14: { y: 0.55, x: 0.62 }, 15: { y: 0.72, x: 0.38 }, 16: { y: 0.72, x: 0.62 }, 23: { y: 0.7 }, 24: { y: 0.7 } });
const armsUp = P({ 11: { y: 0.4, x: 0.4 }, 12: { y: 0.4, x: 0.6 }, 13: { y: 0.27, x: 0.4 }, 14: { y: 0.27, x: 0.6 }, 15: { y: 0.13, x: 0.4 }, 16: { y: 0.13, x: 0.6 }, 23: { y: 0.7 }, 24: { y: 0.7 } });
test('팔 들기: 내림→올림→내림 = 1회', () => {
  const d = new ArmRaise();
  let t = 0;
  for (const f of [armsDown, armsUp, armsUp, armsDown]) d.update(f, (t += 1500));
  assert.equal(d.c.count, 1);
});

console.log(`\n${passed}개 통과${process.exitCode ? ', 실패 있음' : ''}`);
