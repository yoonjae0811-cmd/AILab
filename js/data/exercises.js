// 실버핏 AI 운동 콘텐츠 DB (설계서 6장)
// 팀 검수 후 수정하세요. 추천은 이 목록 안에서만 이루어집니다.
//
// category : warmup(준비) | strength(근력) | flex(유연성) | balance(균형) | cooldown(마무리)
// posture  : seated(의자에 앉아서) | support(의자·벽 잡고 서서) | standing(잡지 않고 서서)
// level    : 이 동작을 쓸 수 있는 최소 단계(1~3)
// reps     : 횟수 기준 동작의 1세트 횟수(단계별 횟수는 recommend.js에서 조정)
// seconds  : 시간 기준 동작의 1세트 시간(초)
// perSide  : 좌우 각각 하는 동작이면 true
// avoid    : 이 부위가 불편한 사람에게는 추천하지 않음
// pose     : 실시간 자세 인식을 지원하는 동작의 인식 방식(pose-logic.js)
// media    : 사진·영상 파일 경로(팀이 촬영 후 media/ 폴더에 넣고 경로 입력)

export const BODY_PARTS = {
  neck: '목',
  shoulder: '어깨',
  wrist: '손목',
  back: '허리',
  hip: '엉덩이·고관절',
  knee: '무릎',
  ankle: '발목',
};

export const CATEGORY_LABEL = {
  warmup: '준비운동',
  strength: '근력',
  flex: '유연성',
  balance: '균형',
  cooldown: '마무리',
};

export const POSTURE_LABEL = {
  seated: '의자에 앉아서',
  support: '의자 잡고 서서',
  standing: '서서',
};

export const EXERCISES = [
  // ── 준비운동 ──────────────────────────────
  {
    id: 'w1', name: '목 천천히 돌리기', category: 'warmup', posture: 'seated', level: 1,
    reps: 5, perSide: true, avoid: ['neck'],
    steps: ['의자에 허리를 펴고 앉아요.', '고개를 오른쪽으로 천천히 돌렸다가 가운데로 와요.', '왼쪽도 똑같이 해요.'],
    caution: '어지러우면 바로 멈추세요. 고개를 뒤로 젖히지 마세요.',
  },
  {
    id: 'w2', name: '어깨 으쓱 돌리기', category: 'warmup', posture: 'seated', level: 1,
    reps: 8, avoid: [],
    steps: ['의자에 앉아 팔을 편하게 내려요.', '어깨를 귀 쪽으로 올렸다가 뒤로 돌리며 내려요.', '천천히 숨을 쉬면서 반복해요.'],
    caution: '어깨가 아프면 작게 움직이세요.',
  },
  {
    id: 'w3', name: '앉아서 제자리 걷기', category: 'warmup', posture: 'seated', level: 1,
    seconds: 30, avoid: [],
    steps: ['의자 앞쪽에 앉아 두 손으로 의자를 잡아요.', '걷듯이 무릎을 번갈아 조금씩 들어요.', '팔도 함께 흔들어 봐요.'],
    caution: '숨이 차지 않을 정도의 빠르기로 하세요.',
  },
  {
    id: 'w4', name: '발목 돌리기', category: 'warmup', posture: 'seated', level: 1,
    reps: 8, perSide: true, avoid: ['ankle'],
    steps: ['의자에 앉아 한 발을 살짝 들어요.', '발목으로 원을 그리듯 천천히 돌려요.', '반대쪽 발도 똑같이 해요.'],
    caution: '발이 저리면 발을 바닥에 내려놓고 쉬세요.',
  },
  {
    id: 'w5', name: '손목·손가락 풀기', category: 'warmup', posture: 'seated', level: 1,
    reps: 10, avoid: ['wrist'],
    steps: ['두 팔을 앞으로 가볍게 뻗어요.', '주먹을 꽉 쥐었다가 손가락을 활짝 펴요.', '손목을 안팎으로 천천히 돌려요.'],
    caution: '손목이 아프면 주먹 쥐기만 하세요.',
  },
  {
    id: 'w6', name: '의자 잡고 제자리 걷기', category: 'warmup', posture: 'support', level: 2,
    seconds: 40, avoid: ['ankle'],
    steps: ['의자 등받이 뒤에 서서 두 손으로 잡아요.', '제자리에서 천천히 걸어요.', '무릎은 편한 만큼만 들어요.'],
    caution: '의자가 밀리지 않도록 벽에 붙여 두세요.',
  },

  // ── 근력 ──────────────────────────────────
  {
    id: 's1', name: '의자에서 일어서기', category: 'strength', posture: 'seated', level: 1,
    reps: 8, avoid: ['knee', 'hip'], pose: 'sit_to_stand',
    steps: ['의자 앞쪽에 앉아 발을 어깨너비로 벌려요.', '몸을 살짝 앞으로 숙이며 천천히 일어서요.', '천천히 다시 앉아요. 손으로 무릎을 짚어도 돼요.'],
    caution: '의자는 벽에 붙여 밀리지 않게 하세요. 무릎이 아프면 멈추세요.',
  },
  {
    id: 's2', name: '앉아서 다리 펴기', category: 'strength', posture: 'seated', level: 1,
    reps: 8, perSide: true, avoid: [], pose: 'knee_ext',
    steps: ['의자에 허리를 펴고 앉아요.', '한쪽 다리를 앞으로 쭉 펴고 2초 버텨요.', '천천히 내리고 반대쪽 다리도 해요.'],
    caution: '무릎이 아프면 조금만 펴세요.',
  },
  {
    id: 's3', name: '앉아서 팔 들어올리기', category: 'strength', posture: 'seated', level: 1,
    reps: 8, avoid: ['shoulder'], pose: 'arm_raise',
    steps: ['의자에 앉아 두 팔을 내려요.', '두 팔을 앞으로 해서 머리 위까지 천천히 올려요.', '천천히 내려요.'],
    caution: '어깨가 아프면 아프지 않은 높이까지만 올리세요.',
  },
  {
    id: 's4', name: '앉아서 무릎 들어올리기', category: 'strength', posture: 'seated', level: 1,
    reps: 8, perSide: true, avoid: ['hip'],
    steps: ['의자에 앉아 두 손으로 의자 옆을 잡아요.', '한쪽 무릎을 가슴 쪽으로 천천히 들어요.', '천천히 내리고 반대쪽도 해요.'],
    caution: '허리를 뒤로 기대지 말고 바르게 앉으세요.',
  },
  {
    id: 's5', name: '앉아서 발뒤꿈치·발끝 들기', category: 'strength', posture: 'seated', level: 1,
    reps: 10, avoid: ['ankle'],
    steps: ['의자에 앉아 발을 바닥에 붙여요.', '발뒤꿈치를 들었다 내려요.', '이번엔 발끝을 들었다 내려요.'],
    caution: '종아리에 쥐가 나면 멈추고 주물러 주세요.',
  },
  {
    id: 's6', name: '앉아서 수건 당기기', category: 'strength', posture: 'seated', level: 1,
    reps: 8, avoid: ['shoulder'],
    steps: ['수건 양 끝을 두 손으로 잡고 앞으로 뻗어요.', '수건을 양쪽으로 당기며 가슴 쪽으로 가져와요.', '등이 모아지는 느낌으로 천천히 반복해요.'],
    caution: '숨을 참지 말고 편하게 쉬세요.',
  },
  {
    id: 's7', name: '벽 팔굽혀펴기', category: 'strength', posture: 'support', level: 2,
    reps: 8, avoid: ['shoulder', 'wrist'],
    steps: ['벽 앞에 한 걸음 떨어져 서서 손바닥을 벽에 대요.', '팔꿈치를 굽혀 몸을 벽 쪽으로 천천히 기울여요.', '팔을 펴서 처음 자세로 돌아와요.'],
    caution: '미끄럽지 않은 바닥에서 하세요.',
  },
  {
    id: 's8', name: '의자 잡고 발뒤꿈치 들기', category: 'strength', posture: 'support', level: 2,
    reps: 10, avoid: ['ankle'],
    steps: ['의자 등받이를 두 손으로 잡고 서요.', '발뒤꿈치를 천천히 들어 발끝으로 서요.', '천천히 내려요.'],
    caution: '중심이 흔들리면 의자를 꼭 잡으세요.',
  },
  {
    id: 's9', name: '의자 잡고 다리 옆으로 들기', category: 'strength', posture: 'support', level: 2,
    reps: 8, perSide: true, avoid: ['hip'],
    steps: ['의자 등받이를 잡고 바르게 서요.', '한쪽 다리를 옆으로 천천히 들어요.', '천천히 내리고 반대쪽도 해요.'],
    caution: '몸이 옆으로 기울지 않게 하세요.',
  },
  {
    id: 's10', name: '의자 잡고 다리 뒤로 들기', category: 'strength', posture: 'support', level: 2,
    reps: 8, perSide: true, avoid: ['hip', 'back'],
    steps: ['의자 등받이를 잡고 바르게 서요.', '무릎을 편 채 한쪽 다리를 뒤로 조금 들어요.', '천천히 내리고 반대쪽도 해요.'],
    caution: '허리를 젖히지 말고 작게 움직이세요.',
  },
  {
    id: 's11', name: '의자 잡고 작은 앉았다 일어서기', category: 'strength', posture: 'support', level: 3,
    reps: 8, avoid: ['knee', 'hip', 'back'],
    steps: ['의자 등받이를 잡고 발을 어깨너비로 벌려요.', '엉덩이를 뒤로 빼며 무릎을 조금만 굽혀요.', '천천히 일어서요.'],
    caution: '무릎이 발끝보다 앞으로 나가지 않게 하세요.',
  },

  // ── 유연성 ────────────────────────────────
  {
    id: 'f1', name: '앉아서 허벅지 뒤 늘리기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['back'],
    steps: ['의자 앞쪽에 앉아 한쪽 다리를 앞으로 뻗어요.', '허리를 편 채 몸을 살짝 앞으로 숙여요.', '허벅지 뒤가 당기면 그대로 버텨요.'],
    caution: '반동을 주지 말고 아프기 전까지만 숙이세요.',
  },
  {
    id: 'f2', name: '앉아서 옆구리 늘리기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['back'],
    steps: ['의자에 앉아 한쪽 팔을 머리 위로 올려요.', '반대쪽으로 몸을 천천히 기울여요.', '옆구리가 당기면 그대로 버텨요.'],
    caution: '엉덩이가 의자에서 뜨지 않게 하세요.',
  },
  {
    id: 'f3', name: '가슴 펴기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, avoid: ['shoulder'],
    steps: ['의자에 앉아 두 손을 등 뒤 의자에 대요.', '가슴을 앞으로 내밀며 어깨를 뒤로 모아요.', '편하게 숨 쉬며 버텨요.'],
    caution: '고개를 뒤로 젖히지 마세요.',
  },
  {
    id: 'f4', name: '앉아서 몸통 비틀기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['back'],
    steps: ['의자에 허리를 펴고 앉아요.', '몸통을 한쪽으로 천천히 돌려 의자 등받이를 잡아요.', '그대로 버텼다가 반대쪽도 해요.'],
    caution: '허리가 아프면 작게 돌리세요.',
  },
  {
    id: 'f5', name: '앉아서 발끝 당기기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['ankle'],
    steps: ['의자에 앉아 한쪽 다리를 앞으로 뻗어요.', '발끝을 몸 쪽으로 당겨요.', '종아리가 당기면 그대로 버텨요.'],
    caution: '쥐가 나면 바로 멈추세요.',
  },
  {
    id: 'f6', name: '손목 늘리기', category: 'flex', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['wrist'],
    steps: ['한쪽 팔을 앞으로 뻗고 손바닥을 앞으로 해요.', '반대 손으로 손가락을 몸 쪽으로 살짝 당겨요.', '그대로 버텼다가 반대쪽도 해요.'],
    caution: '살살 당기세요.',
  },
  {
    id: 'f7', name: '의자 잡고 종아리 늘리기', category: 'flex', posture: 'support', level: 2,
    seconds: 15, perSide: true, avoid: ['ankle', 'knee'],
    steps: ['의자 등받이를 잡고 서요.', '한쪽 다리를 뒤로 빼고 발뒤꿈치를 바닥에 붙여요.', '앞 무릎을 살짝 굽혀 종아리를 늘려요.'],
    caution: '뒤쪽 발뒤꿈치가 뜨지 않게 하세요.',
  },
  {
    id: 'f8', name: '앉아서 엉덩이 늘리기', category: 'flex', posture: 'seated', level: 2,
    seconds: 15, perSide: true, avoid: ['hip', 'knee'],
    steps: ['의자에 앉아 한쪽 발목을 반대쪽 무릎 위에 올려요.', '허리를 편 채 몸을 살짝 앞으로 숙여요.', '엉덩이가 당기면 그대로 버텨요.'],
    caution: '다리를 올리기 어려우면 하지 마세요.',
  },

  // ── 균형 ──────────────────────────────────
  {
    id: 'b1', name: '앉아서 한 발 들고 버티기', category: 'balance', posture: 'seated', level: 1,
    seconds: 10, perSide: true, avoid: ['hip'],
    steps: ['의자에 바르게 앉아 손은 무릎 위에 둬요.', '한쪽 발을 바닥에서 살짝 들어요.', '몸이 흔들리지 않게 버텨요.'],
    caution: '중심이 흔들리면 의자를 잡으세요.',
  },
  {
    id: 'b2', name: '앉아서 몸 기울였다 돌아오기', category: 'balance', posture: 'seated', level: 1,
    reps: 8, avoid: ['back'],
    steps: ['의자에 앉아 팔짱을 껴요.', '몸을 앞, 오른쪽, 왼쪽으로 조금씩 기울여요.', '천천히 가운데로 돌아와요.'],
    caution: '넘어질 만큼 기울이지 마세요.',
  },
  {
    id: 'b3', name: '의자 잡고 한 발 서기', category: 'balance', posture: 'support', level: 2,
    seconds: 10, perSide: true, avoid: ['ankle', 'knee'],
    steps: ['의자 등받이를 두 손으로 잡고 서요.', '한쪽 발을 바닥에서 살짝 들어요.', '그대로 버텼다가 반대쪽도 해요.'],
    caution: '자신 있으면 한 손만 잡아도 돼요.',
  },
  {
    id: 'b4', name: '의자 잡고 체중 옆으로 옮기기', category: 'balance', posture: 'support', level: 2,
    reps: 8, avoid: ['hip'],
    steps: ['의자 등받이를 잡고 발을 어깨너비로 벌려요.', '몸무게를 오른발 쪽으로 천천히 옮겨요.', '왼발 쪽으로도 옮겨요.'],
    caution: '발은 바닥에서 떼지 마세요.',
  },
  {
    id: 'b5', name: '의자 잡고 일자로 서기', category: 'balance', posture: 'support', level: 2,
    seconds: 15, avoid: ['ankle'],
    steps: ['의자 등받이를 잡고 서요.', '한 발을 다른 발 바로 앞에 일자로 놓아요.', '그대로 버텼다가 발을 바꿔요.'],
    caution: '흔들리면 바로 발을 벌리세요.',
  },
  {
    id: 'b6', name: '벽 따라 일자로 걷기', category: 'balance', posture: 'standing', level: 3,
    reps: 10, avoid: ['ankle', 'knee'],
    steps: ['벽 옆에 서서 한 손을 벽에 가까이 둬요.', '앞발 뒤꿈치가 뒷발 끝에 닿게 한 걸음씩 걸어요.', '열 걸음 걷고 돌아와요.'],
    caution: '주변에 걸려 넘어질 물건을 치우고 하세요.',
  },

  // ── 마무리 ────────────────────────────────
  {
    id: 'c1', name: '깊은 호흡', category: 'cooldown', posture: 'seated', level: 1,
    reps: 5, avoid: [],
    steps: ['의자에 편하게 앉아 눈을 감아도 좋아요.', '코로 천천히 숨을 들이마셔요.', '입으로 길게 내쉬어요.'],
    caution: '어지러우면 보통 호흡으로 돌아오세요.',
  },
  {
    id: 'c2', name: '팔·다리 털기', category: 'cooldown', posture: 'seated', level: 1,
    seconds: 20, avoid: [],
    steps: ['의자에 앉아요.', '두 팔을 가볍게 털어요.', '다리도 가볍게 털어요.'],
    caution: '힘을 빼고 가볍게 하세요.',
  },
  {
    id: 'c3', name: '목·어깨 천천히 늘리기', category: 'cooldown', posture: 'seated', level: 1,
    seconds: 15, perSide: true, avoid: ['neck'],
    steps: ['의자에 앉아 어깨 힘을 빼요.', '고개를 한쪽 어깨 쪽으로 천천히 기울여요.', '그대로 버텼다가 반대쪽도 해요.'],
    caution: '손으로 머리를 누르지 마세요.',
  },
  {
    id: 'c4', name: '깍지 끼고 기지개', category: 'cooldown', posture: 'seated', level: 1,
    seconds: 15, avoid: ['shoulder'],
    steps: ['두 손을 깍지 껴요.', '손바닥이 위로 가게 팔을 머리 위로 뻗어요.', '숨을 쉬며 몸을 길게 늘려요.'],
    caution: '팔이 아프면 가슴 앞으로만 뻗으세요.',
  },
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
