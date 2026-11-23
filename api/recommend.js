// AI 루틴 선택: POST /api/recommend (설계서 11장 2단계)
// 앱이 규칙으로 걸러 보낸 후보 중에서만 고르게 하고, 결과는 앱이 다시 검증합니다.

import { callClaude, extractJson, hasKey, readJson } from './_shared.js';

const SYSTEM = `너는 노인을 위한 운동 안내 앱의 루틴 구성 담당이다.
반드시 지킬 것:
- 주어진 candidates 목록 안의 id만 사용한다. 새 운동을 만들지 않는다.
- 준비운동(warmup) → 본운동(strength/balance/flex) → 마무리(cooldown) 순서로 구성한다.
- counts에 적힌 개수(warmup, main, cooldown)를 지킨다.
- unit이 reps인 운동은 reps, seconds인 운동은 seconds를 쓴다. reps는 maxReps 이하, sets는 maxSets 이하. 준비·마무리는 sets 1.
- 목표(goal)에 맞는 본운동이 절반 이상이 되게 한다. legs=근력, balance=균형, flex=유연성, general=고르게.
- 최근 루틴(recentExercises)과 본운동이 절반 이상 겹치지 않게 한다.
- condition이 bad면 유연성·호흡 위주로 가볍게 한다.
- 최근 기록에 힘들었다(hard)나 불편 신고가 있으면 더 쉬운 동작을 고른다.
- reason은 사용자에게 보여 줄 존댓말 한 문장(40자 안팎)이다. 진단이나 치료 효과를 말하지 않는다. 외래어를 쓰지 않는다.
출력은 JSON 하나만: {"items":[{"id":"w1","reps":5,"sets":1},{"id":"f1","seconds":15,"sets":2}],"reason":"..."}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!hasKey()) return res.status(503).json({ error: 'AI not configured' });
  const body = readJson(req);
  if (!Array.isArray(body.candidates) || !body.candidates.length) {
    return res.status(400).json({ error: 'candidates required' });
  }
  // 이름 등 식별 정보는 받지도 보내지도 않습니다.
  const input = {
    ageGroup: body.ageGroup, level: body.level, limits: body.limits, goal: body.goal,
    pain: body.pain, condition: body.condition, recent: body.recent,
    recentExercises: body.recentExercises, candidates: body.candidates,
  };
  try {
    const text = await callClaude({ system: SYSTEM, user: JSON.stringify(input), maxTokens: 700, timeoutMs: 4500 });
    const json = extractJson(text);
    if (!json || !Array.isArray(json.items)) return res.status(502).json({ error: 'bad AI output' });
    return res.status(200).json({ items: json.items, reason: json.reason });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
