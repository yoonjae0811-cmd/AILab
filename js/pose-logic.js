// 자세 인식 판정 로직 (F-20)
// MediaPipe Pose 랜드마크(33개, 0~1 정규화 좌표, y는 아래로 증가)를 받아
// 횟수를 세고 자세 안내 문구를 돌려줍니다. 카메라·화면과 분리되어 있어 Node에서 테스트할 수 있습니다.
//
// 휴대폰을 사용자 정면 1.5~2m 앞, 허리 높이에 세워 전신이 보이게 두는 것을 전제로 합니다.

const L = {
  nose: 0,
  lShoulder: 11, rShoulder: 12,
  lElbow: 13, rElbow: 14,
  lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24,
  lKnee: 25, rKnee: 26,
  lAnkle: 27, rAnkle: 28,
};

const VIS = 0.5;

function ok(p) {
  return p && (p.visibility === undefined || p.visibility >= VIS);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (!d) return 180;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / d));
  return (Math.acos(cos) * 180) / Math.PI;
}

function torso(lm) {
  const s = mid(lm[L.lShoulder], lm[L.rShoulder]);
  const h = mid(lm[L.lHip], lm[L.rHip]);
  return { s, h, len: Math.max(0.05, h.y - s.y) };
}

// 공통: 동작 상태 기계 (내려감 → 올라감 → 내려감 = 1회)
class RepCounter {
  constructor({ upAt, downAt, partialAt, higherIsUp = true, minRepMs = 1200 }) {
    Object.assign(this, { upAt, downAt, partialAt, higherIsUp, minRepMs });
    this.phase = 'down';
    this.count = 0;
    this.peak = null;
    this.lastRepAt = 0;
    this.feedback = '';
  }

  isAbove(v, t) { return this.higherIsUp ? v >= t : v <= t; }

  better(v, p) { return p === null || (this.higherIsUp ? v > p : v < p); }

  push(v, now, msgs) {
    let event = null;
    if (this.phase === 'down') {
      if (this.isAbove(v, this.upAt)) {
        this.phase = 'up';
        this.peak = null;
        this.feedback = msgs.good;
        return null;
      }
      if (this.better(v, this.peak)) this.peak = v;
      // 쉬는 자세로 돌아왔는데, 중간까지만 갔다 온 경우
      if (!this.isAbove(v, this.downAt)) {
        if (this.peak !== null && this.isAbove(this.peak, this.partialAt)) {
          this.feedback = msgs.partial;
          event = 'partial';
        }
        this.peak = null;
      }
    } else if (!this.isAbove(v, this.downAt)) {
      this.phase = 'down';
      this.peak = null;
      const fast = now - this.lastRepAt < this.minRepMs;
      this.count += 1;
      this.lastRepAt = now;
      this.feedback = fast ? msgs.fast : msgs.rep;
      event = 'rep';
    }
    return event;
  }
}

// ── 의자에서 일어서기 ─────────────────────────
// 서 있으면 엉덩이와 무릎의 세로 거리가 상체 길이만큼 벌어지고,
// 앉아 있으면 허벅지가 수평이라 거의 같은 높이가 됩니다.
export class SitToStand {
  constructor() {
    this.c = new RepCounter({ upAt: 0.55, downAt: 0.3, partialAt: 0.38 });
    this.msgs = {
      good: '좋아요, 이제 천천히 앉으세요.',
      partial: '조금 더 끝까지 일어서 보세요.',
      rep: '잘하셨어요!',
      fast: '조금 더 천천히 하세요.',
    };
  }

  required() { return [L.lShoulder, L.rShoulder, L.lHip, L.rHip, L.lKnee, L.rKnee]; }

  update(lm, now) {
    const t = torso(lm);
    const k = mid(lm[L.lKnee], lm[L.rKnee]);
    const r = (k.y - t.h.y) / t.len;
    const event = this.c.push(r, now, this.msgs);
    return { count: this.c.count, feedback: this.c.feedback, event, metric: r };
  }
}

// ── 앉아서 다리 펴기 ──────────────────────────
// 다리를 앞으로 펴면 정면에서 볼 때 발목이 무릎 높이 가까이 올라옵니다.
// 사람마다 다리 길이가 달라, 굽혔을 때의 정강이 길이를 기준으로 비율을 계산합니다.
export class KneeExtension {
  constructor() {
    this.base = { l: 0, r: 0 };
    this.c = new RepCounter({ upAt: 0.5, downAt: 0.78, partialAt: 0.68, higherIsUp: false });
    this.msgs = {
      good: '좋아요, 그대로 잠깐 버티세요.',
      partial: '다리를 조금 더 펴 보세요.',
      rep: '잘하셨어요! 반대쪽 다리도 해요.',
      fast: '조금 더 천천히 하세요.',
    };
  }

  required() { return [L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle]; }

  update(lm, now) {
    const dl = lm[L.lAnkle].y - lm[L.lKnee].y;
    const dr = lm[L.rAnkle].y - lm[L.rKnee].y;
    this.base.l = Math.max(this.base.l * 0.999, dl);
    this.base.r = Math.max(this.base.r * 0.999, dr);
    const rl = this.base.l > 0.02 ? dl / this.base.l : 1;
    const rr = this.base.r > 0.02 ? dr / this.base.r : 1;
    const r = Math.min(rl, rr); // 더 많이 편 다리 기준
    const event = this.c.push(r, now, this.msgs);
    return { count: this.c.count, feedback: this.c.feedback, event, metric: r };
  }
}

// ── 앉아서 팔 들어올리기 ───────────────────────
// 손목이 어깨보다 상체 길이의 0.5배 이상 올라가면 '올림'.
export class ArmRaise {
  constructor() {
    this.c = new RepCounter({ upAt: 0.5, downAt: -0.4, partialAt: -0.1 });
    this.msgs = {
      good: '좋아요, 천천히 내리세요.',
      partial: '팔을 머리 위까지 올려 보세요.',
      rep: '잘하셨어요!',
      fast: '조금 더 천천히 하세요.',
    };
    this.bentWarned = false;
  }

  required() { return [L.lShoulder, L.rShoulder, L.lHip, L.rHip, L.lWrist, L.rWrist, L.lElbow, L.rElbow]; }

  update(lm, now) {
    const t = torso(lm);
    const w = mid(lm[L.lWrist], lm[L.rWrist]);
    const r = (t.s.y - w.y) / t.len;
    const event = this.c.push(r, now, this.msgs);
    if (this.c.phase === 'up') {
      const el = angle(lm[L.lShoulder], lm[L.lElbow], lm[L.lWrist]);
      const er = angle(lm[L.rShoulder], lm[L.rElbow], lm[L.rWrist]);
      if (Math.min(el, er) < 130) this.c.feedback = '팔꿈치를 조금 더 펴 보세요.';
    }
    return { count: this.c.count, feedback: this.c.feedback, event, metric: r };
  }
}

export const DETECTORS = {
  sit_to_stand: SitToStand,
  knee_ext: KneeExtension,
  arm_raise: ArmRaise,
};

export const PLACEMENT_TIPS = {
  sit_to_stand: '휴대폰을 정면 2m 앞에 세워 머리부터 발까지 보이게 해 주세요.',
  knee_ext: '휴대폰을 정면 1.5m 앞, 무릎 높이쯤에 세워 다리까지 보이게 해 주세요.',
  arm_raise: '휴대폰을 정면 1.5m 앞에 세워 머리 위와 엉덩이까지 보이게 해 주세요.',
};

// 필요한 관절이 화면에 잘 보이는지
export function visibleEnough(lm, required) {
  if (!lm || !lm.length) return false;
  return required.every((i) => ok(lm[i]) && lm[i].x > -0.05 && lm[i].x < 1.05 && lm[i].y > -0.05 && lm[i].y < 1.05);
}

export const LOST_MS = 3000; // 3초 이상 인식이 안 되면 타이머 방식으로 전환 (N-11)
