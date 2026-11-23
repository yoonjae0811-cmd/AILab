// 앱 설정
export const CONFIG = {
  APP_VERSION: '0.1.0',

  // AI 서버 함수 주소. Vercel에 배포하면 같은 주소의 /api 가 자동으로 연결됩니다.
  // 서버 함수가 없거나 응답이 없으면 규칙 기반 추천과 기본 답변으로 동작합니다.
  AI_BASE: '/api',
  AI_TIMEOUT_MS: 5000, // N-07: AI 추천 5초 초과 시 기본 루틴

  // 실시간 자세 인식(MediaPipe). 휴대폰 브라우저가 처음 한 번 내려받습니다.
  POSE: {
    bundle: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
    wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    model: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  },
};
