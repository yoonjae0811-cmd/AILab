// 운동 질의응답: POST /api/ask (설계서 11장 가드레일)

import {
  callClaude, hasEmergency, EMERGENCY_TEXT, hasKey, readJson,
} from './_shared.js';

const PAIN = {
  neck: '목', shoulder: '어깨', wrist: '손목', back: '허리', hip: '엉덩이·고관절', knee: '무릎', ankle: '발목',
};

const SYSTEM = `너는 '실버핏 AI'의 운동 안내원이다. 사용자는 운동 경험이 적은 60대 이상 어르신이다.
말투: 친절한 존댓말, 쉬운 우리말, 한 답변은 3문장 이내. 외래어와 전문용어를 쓰지 않는다.
할 일: 의자 운동, 가벼운 근력·유연성·균형 운동의 방법과 주의할 점을 알려 준다.
하지 않을 일:
- 진단하지 않는다. 약, 치료, 질병에 대한 판단을 하지 않는다. 이런 질문에는 "담당 의사나 약사에게 물어봐 주세요"라고 안내한다.
- 무리한 운동, 무거운 기구 운동, 빠른 동작을 권하지 않는다.
- 운동과 관계없는 질문(돈, 정치 등)에는 "운동에 대한 질문에만 답할 수 있어요."라고만 답한다.
항상: 불편하거나 아프면 바로 멈추라고 안내한다. 모르면 "의료진에게 물어보세요"라고 한다.
가슴 통증, 숨 막힘, 쓰러짐 같은 응급 증상이 나오면 운동을 멈추고 119에 전화하라고만 답한다.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = readJson(req);
  const q = String(body.question || '').slice(0, 300).trim();
  if (!q) return res.status(400).json({ error: 'question required' });
  if (hasEmergency(q)) return res.status(200).json({ answer: EMERGENCY_TEXT, emergency: true });
  if (!hasKey()) return res.status(503).json({ error: 'AI not configured' });

  const pain = Array.isArray(body.pain) ? body.pain.map((p) => PAIN[p]).filter(Boolean) : [];
  const ctx = `사용자 정보: 나이대 ${body.ageGroup || '모름'}대, 운동 단계 ${body.level || 1}단계(1~3), 불편한 곳: ${pain.join(', ') || '없음'}.`;
  try {
    const answer = await callClaude({ system: SYSTEM, user: `${ctx}\n질문: ${q}`, maxTokens: 350 });
    return res.status(200).json({ answer, emergency: false });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
