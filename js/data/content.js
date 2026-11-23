// 고정 안내 문구 (설계서 7장). AI가 만들지 않고 앱에 고정된 문장입니다.
// 전문가 검토 후 확정하세요.

export const DISCLAIMER = '실버핏 AI는 운동 안내 도구이며, 의료 진단이나 치료를 대신하지 않습니다.';
export const PRE_WORKOUT = '물을 준비하고, 미끄럽지 않은 곳에서 하세요. 불편하면 언제든 ‘불편해요’를 누르세요.';
export const AI_FOOTER = '통증이나 지병이 있으면 의료진과 먼저 상담하세요.';

export const SAFETY_QUESTIONS = [
  '의사에게 운동을 조심하라는 말을 들은 적이 있나요?',
  '최근에 가슴이 아프거나 답답한 적이 있나요?',
  '어지러워서 넘어지거나 정신을 잃은 적이 있나요?',
  '최근 3개월 안에 수술을 받거나 크게 다친 적이 있나요?',
  '혈압이나 심장 때문에 약을 드시고 계신가요?',
];

export const SAFETY_FLAG_TEXT = '운동을 시작하기 전에 담당 의사와 상담해 주세요. 그동안에는 가장 가벼운 의자 운동만 안내해 드릴게요.';

export const AGE_GROUPS = [
  { value: '60', label: '60대' },
  { value: '70', label: '70대' },
  { value: '80', label: '80대 이상' },
];

export const PROFILE_STEPS = [
  {
    key: 'experience',
    title: '운동을 해 보셨나요?',
    options: [
      { value: 'none', label: '거의 해 본 적 없어요' },
      { value: 'some', label: '가끔 해요' },
      { value: 'regular', label: '규칙적으로 해요' },
    ],
  },
  {
    key: 'activity',
    title: '평소에 얼마나 움직이세요?',
    options: [
      { value: 'low', label: '주로 앉아서 지내요' },
      { value: 'mid', label: '가볍게 산책해요' },
      { value: 'high', label: '매일 30분 넘게 걸어요' },
    ],
  },
  {
    key: 'goal',
    title: '가장 바라는 것은 무엇인가요?',
    options: [
      { value: 'legs', label: '다리 힘 기르기' },
      { value: 'balance', label: '균형 잡기·넘어짐 예방' },
      { value: 'flex', label: '뻣뻣한 몸 풀기' },
      { value: 'general', label: '전체적으로 건강하게' },
    ],
  },
  {
    key: 'pain',
    title: '불편한 곳이 있나요?',
    hint: '그림이나 아래 버튼을 눌러 모두 골라 주세요.',
    multi: true,
  },
  {
    key: 'space',
    title: '어디에서 운동하세요?',
    options: [
      { value: 'seat', label: '앉아서만 할래요' },
      { value: 'stand', label: '의자 옆에서 설 수 있어요' },
    ],
  },
];

export const GOAL_LABEL = {
  legs: '다리 힘',
  balance: '균형',
  flex: '유연성',
  general: '전체 건강',
};

export const CONDITIONS = [
  { value: 'good', label: '좋아요' },
  { value: 'ok', label: '보통이에요' },
  { value: 'bad', label: '좀 안 좋아요' },
];

export const DIFFICULTIES = [
  { value: 'easy', label: '쉬웠어요' },
  { value: 'right', label: '적당했어요' },
  { value: 'hard', label: '힘들었어요' },
];

// 운동 중 불편 증상과 대응 (설계서 7장 표)
export const SYMPTOMS = [
  {
    value: 'chest',
    label: '가슴이 아프거나 숨이 막혀요',
    action: 'emergency',
    text: '지금 바로 운동을 멈추고 119에 전화하세요.',
  },
  {
    value: 'dizzy',
    label: '어지러워요',
    action: 'stop',
    text: '운동을 멈추고 자리에 앉아 쉬세요. 나아지지 않으면 주변에 도움을 요청하세요.',
  },
  {
    value: 'joint',
    label: '관절이나 근육이 아파요',
    action: 'skip',
    text: '아픈 동작은 하지 마세요. 통증이 계속되면 의료진과 상담하세요.',
  },
  {
    value: 'tired',
    label: '너무 힘들어요',
    action: 'cooldown',
    text: '오늘은 여기까지 충분해요. 천천히 숨을 고르며 마무리해요.',
  },
];

// 응급 증상 키워드: AI 호출 전에 앱이 먼저 감지합니다 (설계서 11장).
export const EMERGENCY_KEYWORDS = [
  '가슴이 아', '가슴 통증', '가슴이 답답', '가슴이 조여', '흉통',
  '숨이 차', '숨이 막', '숨쉬기 힘', '숨쉬기가 힘', '호흡곤란', '호흡이 힘',
  '쓰러', '정신을 잃', '의식', '마비', '식은땀', '말이 어눌',
];

export const EMERGENCY_TEXT = '위험할 수 있는 증상이에요. 운동을 바로 멈추고 119에 전화하세요.';

export function hasEmergency(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  return EMERGENCY_KEYWORDS.some((k) => t.includes(k));
}

// 자주 묻는 질문 (F-13). AI가 연결되지 않았을 때도 이 답변을 보여 줍니다.
export const FAQ = [
  {
    q: '무릎이 아플 때는 어떻게 해요?',
    a: '무릎이 아픈 날에는 무릎을 깊이 굽히는 동작을 빼고, 앉아서 하는 가벼운 동작을 하세요. 움직이는 범위를 작게 하면 부담이 줄어요. 통증이 며칠 계속되면 의료진과 상담하세요.',
  },
  {
    q: '하루에 얼마나 해야 해요?',
    a: '처음에는 하루 10분이면 충분해요. 몸이 익숙해지면 15분, 20분으로 조금씩 늘려 보세요. 매일 조금씩 하는 것이 한 번에 많이 하는 것보다 좋아요.',
  },
  {
    q: '언제 운동하는 게 좋아요?',
    a: '몸이 가장 편한 시간에 하세요. 식사 직후보다는 1시간쯤 지나서 하는 것이 편해요. 매일 같은 시간에 하면 습관이 되기 쉬워요.',
  },
  {
    q: '운동하다 숨이 차면요?',
    a: '말을 하기 어려울 만큼 숨이 차면 너무 센 거예요. 잠시 멈추고 숨을 고른 뒤 더 천천히 하세요. 가슴이 아프거나 숨이 막히면 바로 멈추고 119에 전화하세요.',
  },
  {
    q: '허리가 아플 때는요?',
    a: '허리가 아픈 날에는 몸을 숙이거나 비트는 동작을 빼고, 바르게 앉아서 하는 동작 위주로 하세요. 통증이 계속되면 의료진과 상담하세요.',
  },
];

// AI가 연결되지 않았을 때 쓰는 간단한 답변 규칙
export const LOCAL_ANSWERS = [
  { keys: ['약', '혈압', '당뇨', '진단', '수술', '병원', '질환', '처방'], a: '약이나 질병에 대한 판단은 제가 해 드릴 수 없어요. 담당 의사나 약사에게 물어봐 주세요.' },
  { keys: ['무릎'], a: FAQ[0].a },
  { keys: ['얼마나', '몇 분', '몇분', '시간'], a: FAQ[1].a },
  { keys: ['언제', '아침', '저녁', '밥', '식사'], a: FAQ[2].a },
  { keys: ['숨'], a: FAQ[3].a },
  { keys: ['허리'], a: FAQ[4].a },
  { keys: ['어깨'], a: '어깨가 아픈 날에는 팔을 머리 위로 올리는 동작을 빼거나, 아프지 않은 높이까지만 올리세요. 통증이 계속되면 의료진과 상담하세요.' },
  { keys: ['쉬', '빼먹', '못 했', '못했'], a: '하루 쉬어도 괜찮아요. 다음 날 다시 가볍게 시작하면 돼요.' },
  { keys: ['물'], a: '운동 전후로 물을 조금씩 드세요. 목이 마르기 전에 마시는 것이 좋아요.' },
];

export const LOCAL_DEFAULT = '운동 방법이나 운동할 때 주의할 점을 물어봐 주세요. 예를 들어 “의자에서 일어서기는 어떻게 해요?”처럼 물어보시면 돼요.';
export const OUT_OF_SCOPE = '운동에 대한 질문에만 답할 수 있어요.';
