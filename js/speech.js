// 음성 안내 (F-15): 휴대폰 브라우저에 내장된 음성 합성을 씁니다. 추가 비용이 없습니다.

let enabled = true;
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  voice = voices.find((v) => v.lang === 'ko-KR') || voices.find((v) => v.lang?.startsWith('ko')) || null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function setEnabled(on) {
  enabled = !!on;
  if (!enabled) stop();
}

export function speak(text, { interrupt = true } = {}) {
  if (!enabled || !('speechSynthesis' in window) || !text) return;
  try {
    if (interrupt) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (voice) u.voice = voice;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    // 음성을 쓸 수 없는 환경에서는 화면 안내만
  }
}

export function stop() {
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

const NUM = ['영', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
  '열하나', '열둘', '열셋', '열넷', '열다섯'];

export function countWord(n) {
  return NUM[n] || String(n);
}
