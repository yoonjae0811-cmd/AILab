// 그림 요소 (아이콘, 자세 그림, 얼굴, 몸 그림). 모두 인라인 SVG라 별도 파일이 필요 없습니다.

const S = (body, vb = '0 0 24 24', cls = 'ico') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const icon = {
  home: S(`<path ${stroke} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>`),
  records: S(`<rect ${stroke} x="3" y="5" width="18" height="16" rx="2"/><path ${stroke} d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13"/>`),
  ask: S(`<path ${stroke} d="M4 5h16v11H9l-5 4z"/><path ${stroke} d="M9.5 9.2a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1M12 14.6v.1"/>`),
  settings: S(`<circle ${stroke} cx="12" cy="12" r="3"/><path ${stroke} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`),
  back: S(`<path ${stroke} d="M15 5l-7 7 7 7"/>`),
  pause: S('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>'),
  play: S('<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>'),
  next: S(`<path ${stroke} d="M5 5l8 7-8 7M17 5v14"/>`),
  alert: S(`<path ${stroke} d="M12 3l10 18H2z"/><path ${stroke} d="M12 10v5M12 18v.1"/>`),
  phone: S(`<path ${stroke} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>`),
  check: S(`<path ${stroke} d="M5 12.5l4.5 4.5L19 7.5"/>`),
  camera: S(`<path ${stroke} d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle ${stroke} cx="12" cy="13.5" r="3.5"/>`),
  speaker: S(`<path ${stroke} d="M4 9h4l5-4v14l-5-4H4z"/><path ${stroke} d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>`),
  heart: S(`<path ${stroke} d="M12 20s-7-4.4-9.2-9A4.8 4.8 0 0 1 12 6.6 4.8 4.8 0 0 1 21.2 11C19 15.6 12 20 12 20z"/>`),
  sparkle: S('<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="currentColor"/>'),
};

// 앱 로고 (기호만, 글자 없음)
export const logo = S(`
  <circle cx="60" cy="60" r="56" fill="#1F6F5C"/>
  <circle cx="60" cy="34" r="10" fill="#FFF7E6"/>
  <path d="M60 46v26M60 72l-14 22M60 72l14 22M60 54l-20 10M60 54l20-12" stroke="#FFF7E6" stroke-width="8" stroke-linecap="round" fill="none"/>
`, '0 0 120 120', 'logo');

// 자세 그림 (사진·영상이 준비되기 전까지 쓰는 그림)
const fig = 'fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
const chair = 'fill="none" stroke="var(--chair)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';

export function pictogram(posture) {
  if (posture === 'seated') {
    return S(`
      <path ${chair} d="M38 52v50M38 78h40v24M78 78V60"/>
      <circle cx="56" cy="20" r="9" fill="currentColor"/>
      <path ${fig} d="M56 32v40h26v28M56 44l18 14"/>
    `, '0 0 120 110', 'picto');
  }
  if (posture === 'support') {
    return S(`
      <path ${chair} d="M86 40v62M86 66h-24v36M62 66v-8"/>
      <circle cx="46" cy="18" r="9" fill="currentColor"/>
      <path ${fig} d="M46 30v40M46 70l-6 32M46 70l6 32M46 40l22 12 14-6"/>
    `, '0 0 120 110', 'picto');
  }
  return S(`
    <circle cx="60" cy="18" r="9" fill="currentColor"/>
    <path ${fig} d="M60 30v40M60 70l-8 32M60 70l8 32M60 42l-18 16M60 42l18 16"/>
  `, '0 0 120 110', 'picto');
}

export function face(kind) {
  const mouth = {
    good: '<path d="M16 28c4 5 12 5 16 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    ok: '<path d="M17 30h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    bad: '<path d="M16 32c4-5 12-5 16 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  }[kind];
  return S(`<circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/>
    <circle cx="17" cy="19" r="2.6" fill="currentColor"/><circle cx="31" cy="19" r="2.6" fill="currentColor"/>${mouth}`,
  '0 0 48 48', 'face');
}

// 불편 부위 선택용 몸 그림 (S-04)
const ZONES = [
  ['neck', 100, 66], ['shoulder', 66, 84], ['shoulder', 134, 84],
  ['back', 100, 146], ['wrist', 40, 178], ['wrist', 160, 178],
  ['hip', 80, 182], ['hip', 120, 182], ['knee', 82, 238], ['knee', 118, 238],
  ['ankle', 84, 286], ['ankle', 116, 286],
];

export function bodyFigure(selected = []) {
  const sel = new Set(selected);
  const zones = ZONES.map(([part, x, y]) =>
    `<circle class="zone${sel.has(part) ? ' on' : ''}" data-act="pain" data-part="${part}" cx="${x}" cy="${y}" r="15"/>`).join('');
  return `<svg class="body" viewBox="0 0 200 310" role="img" aria-label="몸 그림: 불편한 곳을 누르세요">
    <g fill="none" stroke="var(--line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="100" cy="34" r="22"/>
      <path d="M100 56v14M70 80h60M70 80l-8 50-22 48M130 80l8 50 22 48M74 80l4 82h44l4-82M80 162l2 76 2 48M120 162l-2 76-2 48"/>
    </g>
    ${zones}
  </svg>`;
}
