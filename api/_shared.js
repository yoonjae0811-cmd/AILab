// 서버 함수 공통 코드 (Vercel). 파일 이름이 _ 로 시작해 주소로 열리지 않습니다.
// 환경변수: ANTHROPIC_API_KEY (필수), ANTHROPIC_MODEL (선택)

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export function hasKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude({ system, user, maxTokens = 600, timeoutMs = 9000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
    const j = await res.json();
    return (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  } finally {
    clearTimeout(t);
  }
}

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

// 앱(js/data/content.js)과 같은 응급 키워드. AI 호출 전에 먼저 거릅니다.
const EMERGENCY_KEYWORDS = [
  '가슴이 아', '가슴 통증', '가슴이 답답', '가슴이 조여', '흉통',
  '숨이 차', '숨이 막', '숨쉬기 힘', '숨쉬기가 힘', '호흡곤란', '호흡이 힘',
  '쓰러', '정신을 잃', '의식', '마비', '식은땀', '말이 어눌',
];

export function hasEmergency(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  return EMERGENCY_KEYWORDS.some((k) => t.includes(k));
}

export const EMERGENCY_TEXT = '위험할 수 있는 증상이에요. 운동을 바로 멈추고 119에 전화하세요.';
