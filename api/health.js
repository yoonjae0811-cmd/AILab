import { hasKey } from './_shared.js';

// 앱이 AI 사용 가능 여부를 확인하는 주소: GET /api/health
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: hasKey() });
}
