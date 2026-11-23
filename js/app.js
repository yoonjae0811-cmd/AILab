// 실버핏 AI 앱 본체: 화면 13개(S-01~S-12, S-06a)와 운동 진행 엔진
import * as store from './store.js';
import {
  EXERCISE_BY_ID, BODY_PARTS, CATEGORY_LABEL,
} from './data/exercises.js';
import * as C from './data/content.js';
import {
  buildRoutine, startLevel, maxLevel, evaluateProgress,
  SECONDS_PER_REP, REST_BETWEEN_SETS, REST_BETWEEN_EXERCISES,
} from './recommend.js';
import * as ai from './ai.js';
import * as speech from './speech.js';
import * as pose from './pose.js';
import { PLACEMENT_TIPS } from './pose-logic.js';
import {
  icon, logo, pictogram, face, bodyFigure,
} from './ui.js';
import { CONFIG } from './config.js';

const app = document.getElementById('app');

// ── 도우미 ─────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function hasBatchim(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
const eyo = (w) => `${w}${hasBatchim(w) ? '이에요' : '예요'}`;

const EX = (id) => EXERCISE_BY_ID[id];

function doseText(it) {
  const e = EX(it.id);
  const side = e.perSide ? '좌우 각 ' : '';
  const amount = it.seconds ? `${it.seconds}초` : `${it.reps}회`;
  return it.sets > 1 ? `${side}${amount} × ${it.sets}세트` : `${side}${amount}`;
}

function fmtDate(str) {
  const [, m, d] = str.split('-').map(Number);
  return `${m}월 ${d}일`;
}

// ── 화면 상태 ──────────────────────────────────
const session = {
  info: { name: '', ageGroup: null, consent: false },
  safetyIdx: 0,
  safetyAnswers: [],
  profileIdx: 0,
  profileDraft: null,
  condition: null,
  routine: null,
  loading: false,
  useCamera: false,
  cam: { status: 'idle' },
  symptom: null,
  excludeAfter: true,
  result: null,
  chat: [],
  asking: false,
  recMonth: null,
  homeMsg: null,
  settingsMsg: null,
  resetArmed: false,
};

let actions = {};
let W = null; // 진행 중인 운동
let ticker = null;
let installPrompt = null;

const route = () => (location.hash.replace(/^#\/?/, '') || 'home');
const go = (r) => {
  if (route() === r) render();
  else location.hash = `#${r}`;
};

function guard(r) {
  const s = store.get();
  if (!s.user) return ['welcome', 'info'].includes(r) ? r : 'welcome';
  if (!s.safety) return ['safety', 'safety-result'].includes(r) ? r : 'safety';
  if (!s.profile) return ['profile', 'safety', 'safety-result'].includes(r) ? r : 'profile';
  if (['workout', 'discomfort'].includes(r) && !W) return 'home';
  if (r === 'done' && !session.result) return 'home';
  if (r === 'camera' && !session.routine) return 'home';
  return r;
}

function render() {
  actions = {};
  const raw = route();
  const r = guard(raw);
  if (r !== raw) {
    location.replace(`#${r}`);
    return;
  }
  const scr = SCREENS[r] || SCREENS.home;
  const out = scr();
  app.innerHTML = out.html;
  app.dataset.screen = r;
  out.mount?.(app);
  const h = app.querySelector('h1');
  if (h) {
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  if (!out.keepScroll) window.scrollTo(0, 0);
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !app.contains(el) || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

function page({
  title = '', back = false, body = '', nav = null, cls = '',
}) {
  return `
    ${title || back ? `<header class="topbar">
      ${back ? `<button class="back" data-act="back">${icon.back}<span>이전</span></button>` : '<span class="spacer"></span>'}
      ${title ? `<h1 class="top-title">${esc(title)}</h1>` : ''}
      <span class="spacer"></span>
    </header>` : ''}
    <main class="content ${cls}">${body}</main>
    ${nav ? navBar(nav) : ''}`;
}

function navBar(active) {
  const tabs = [['home', '운동', icon.home], ['records', '기록', icon.records], ['ask', '물어보기', icon.ask], ['settings', '설정', icon.settings]];
  return `<nav class="tabbar" aria-label="메뉴">${tabs.map(([r, l, i]) =>
    `<a href="#${r}" class="tab${r === active ? ' on' : ''}"${r === active ? ' aria-current="page"' : ''}>${i}<span>${l}</span></a>`).join('')}</nav>`;
}

function applySettings() {
  const s = store.get();
  document.documentElement.dataset.font = s.settings.fontSize;
  speech.setEnabled(s.settings.tts);
}

// ── S-01 시작 ─────────────────────────────────
function welcome() {
  actions.start = () => go('info');
  return {
    html: `<main class="content welcome">
      <div class="logo-wrap">${logo}</div>
      <h1 class="hero">실버핏 AI</h1>
      <p class="lead">집에서 의자 하나로 하는<br>나만의 운동 안내</p>
      <p class="muted">처음 한 번만 몇 가지 여쭤볼게요.<br>3분이면 끝나요.</p>
      <p class="notice">${esc(C.DISCLAIMER)}</p>
      <div class="actions"><button class="btn primary" data-act="start">시작하기</button></div>
    </main>`,
  };
}

// ── S-02 기본 정보 ────────────────────────────
function info() {
  const d = session.info;
  const valid = () => d.name.trim().length > 0 && d.ageGroup && d.consent;
  actions.back = () => go('welcome');
  actions.age = (el) => { d.ageGroup = el.dataset.v; render(); };
  actions.consent = () => { d.consent = !d.consent; render(); };
  actions.next = () => {
    if (!valid()) return;
    const now = new Date().toISOString();
    store.update((s) => {
      s.user = {
        name: d.name.trim(), ageGroup: d.ageGroup, consentAt: now, createdAt: now,
      };
    });
    session.safetyIdx = 0;
    session.safetyAnswers = [];
    go('safety');
  };
  return {
    html: page({
      title: '기본 정보',
      back: true,
      body: `
        <label class="field">
          <span class="label">어떻게 불러 드릴까요?</span>
          <input id="name" class="input" type="text" maxlength="10" autocomplete="off"
            placeholder="예: 김순자" value="${esc(d.name)}">
        </label>
        <p class="label">나이대를 골라 주세요</p>
        <div class="choices row3">
          ${C.AGE_GROUPS.map((a) => `<button class="btn choice${d.ageGroup === a.value ? ' on' : ''}" aria-pressed="${d.ageGroup === a.value}" data-act="age" data-v="${a.value}">${a.label}</button>`).join('')}
        </div>
        <button class="consent${d.consent ? ' on' : ''}" role="checkbox" aria-checked="${d.consent}" data-act="consent">
          <span class="box">${d.consent ? icon.check : ''}</span>
          <span>이름, 나이대, 불편한 곳은 <b>이 휴대폰에만</b> 저장해요. AI에 물어볼 때도 이름은 보내지 않아요. 동의합니다.</span>
        </button>
        <div class="actions"><button class="btn primary" data-act="next" id="next" ${valid() ? '' : 'disabled'}>다음</button></div>`,
    }),
    mount(root) {
      const input = root.querySelector('#name');
      const btn = root.querySelector('#next');
      input.addEventListener('input', () => {
        d.name = input.value;
        btn.disabled = !valid();
      });
    },
  };
}

// ── S-03 안전 점검 ────────────────────────────
function safety() {
  const i = session.safetyIdx;
  const total = C.SAFETY_QUESTIONS.length;
  actions.answer = (el) => {
    session.safetyAnswers[i] = el.dataset.v === 'yes';
    if (i < total - 1) {
      session.safetyIdx += 1;
      render();
      return;
    }
    const flagged = session.safetyAnswers.some(Boolean);
    store.update((s) => {
      s.safety = { answers: [...session.safetyAnswers], flagged, at: store.dateStr() };
      if (flagged && s.level > 1) {
        s.level = 1;
        s.levelSince = store.dateStr();
      }
    });
    go('safety-result');
  };
  actions.back = () => {
    if (i > 0) {
      session.safetyIdx -= 1;
      render();
    } else {
      go(store.get().profile ? 'settings' : 'info');
    }
  };
  return {
    html: page({
      title: '운동 전 안전 점검',
      back: true,
      body: `
        <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${i + 1}">
          <div style="width:${((i + 1) / total) * 100}%"></div></div>
        <p class="step">${i + 1} / ${total}</p>
        <h2 class="question">${esc(C.SAFETY_QUESTIONS[i])}</h2>
        <div class="choices row2">
          <button class="btn choice big" data-act="answer" data-v="yes">예</button>
          <button class="btn choice big" data-act="answer" data-v="no">아니오</button>
        </div>`,
    }),
  };
}

function safetyResult() {
  const s = store.get();
  const flagged = s.safety?.flagged;
  actions.next = () => {
    session.profileIdx = 0;
    go(s.profile ? 'home' : 'profile');
  };
  return {
    html: page({
      title: '안전 점검 결과',
      body: flagged
        ? `<div class="card warn">${icon.alert}<p class="big-text">${esc(C.SAFETY_FLAG_TEXT)}</p></div>
           <p class="muted">상담을 받은 뒤에는 설정에서 ‘안전 점검 다시 하기’를 눌러 주세요.</p>`
        : `<div class="card ok">${icon.check}<p class="big-text">확인했어요. 이제 몸 상태에 맞는 운동을 골라 드릴게요.</p></div>`,
    }) + `<div class="actions fixed"><button class="btn primary" data-act="next">알겠어요</button></div>`,
  };
}

// ── S-04 내 상태 선택 ─────────────────────────
function profile() {
  const s = store.get();
  if (!session.profileDraft) session.profileDraft = s.profile ? { ...s.profile, pain: [...(s.profile.pain || [])] } : { pain: [] };
  const d = session.profileDraft;
  const idx = session.profileIdx;
  const step = C.PROFILE_STEPS[idx];
  const last = idx === C.PROFILE_STEPS.length - 1;

  const finish = () => {
    const first = !s.profile;
    store.update((x) => {
      x.profile = { ...d, pain: [...d.pain] };
      if (first) {
        x.level = startLevel(x);
        x.levelSince = store.dateStr();
      } else {
        x.level = Math.min(x.level, maxLevel(x));
      }
    });
    session.profileDraft = null;
    session.profileIdx = 0;
    go('home');
  };
  const next = () => {
    if (last) finish();
    else {
      session.profileIdx += 1;
      render();
    }
  };
  actions.opt = (el) => {
    d[step.key] = el.dataset.v;
    next();
  };
  actions.pain = (el) => {
    const p = el.dataset.part;
    d.pain = d.pain.includes(p) ? d.pain.filter((x) => x !== p) : [...d.pain, p];
    render();
  };
  actions.nopain = () => {
    d.pain = [];
    next();
  };
  actions.next = next;
  actions.back = () => {
    if (idx > 0) {
      session.profileIdx -= 1;
      render();
    } else if (s.profile) {
      session.profileDraft = null;
      go('settings');
    } else {
      go('safety-result');
    }
  };

  let body;
  if (step.multi) {
    body = `
      <p class="muted">${esc(step.hint)}</p>
      <div class="body-wrap">${bodyFigure(d.pain)}</div>
      <div class="chips">
        ${Object.entries(BODY_PARTS).map(([k, v]) => `<button class="chip${d.pain.includes(k) ? ' on' : ''}" aria-pressed="${d.pain.includes(k)}" data-act="pain" data-part="${k}">${v}</button>`).join('')}
      </div>
      <div class="actions">
        <button class="btn primary" data-act="next">${d.pain.length ? `${d.pain.length}곳 골랐어요, 다음` : '다음'}</button>
        ${d.pain.length ? '' : '<button class="btn secondary" data-act="nopain">불편한 곳 없어요</button>'}
      </div>`;
  } else {
    body = `<div class="choices col">
      ${step.options.map((o) => `<button class="btn choice${d[step.key] === o.value ? ' on' : ''}" aria-pressed="${d[step.key] === o.value}" data-act="opt" data-v="${o.value}">
        ${step.key === 'space' ? pictogram(o.value === 'seat' ? 'seated' : 'support') : ''}<span>${esc(o.label)}</span></button>`).join('')}
    </div>`;
  }
  return {
    html: page({
      title: '내 상태 선택',
      back: true,
      body: `
        <div class="progress"><div style="width:${((idx + 1) / C.PROFILE_STEPS.length) * 100}%"></div></div>
        <p class="step">${idx + 1} / ${C.PROFILE_STEPS.length}</p>
        <h2 class="question">${esc(step.title)}</h2>
        ${body}`,
    }),
  };
}

// ── S-05 홈 ──────────────────────────────────
function home() {
  const s = store.get();
  const today = store.dateStr();
  const done = store.todayLog(today);
  const last = store.lastLog();
  const followUp = last && last.discomfort && last.id !== s.discomfortAckFor && last.date < today;
  const streak = store.streak(today);
  const preview = buildRoutine(s, { condition: 'ok', date: today, poseEnabled: s.settings.poseEnabled });
  const locked = maxLevel(s) === 1 && s.safety?.flagged;

  actions.start = () => {
    session.condition = null;
    session.routine = null;
    go('condition');
  };
  actions.ack = (el) => {
    store.update((x) => { x.discomfortAckFor = last.id; });
    session.homeMsg = el.dataset.v === 'still'
      ? '오늘은 쉬어 가셔도 괜찮아요. 운동하신다면 ‘좀 안 좋아요’를 골라 가볍게 하세요. 불편함이 계속되면 의료진과 상담하세요.'
      : '다행이에요. 오늘도 무리하지 말고 천천히 해요.';
    render();
  };
  actions.resume = () => go('workout');
  actions.quit = () => {
    finishWorkout(false, { silent: true });
    W = null;
    session.result = null;
    render();
  };

  const resumeCard = W && !W.finished ? `
    <section class="card accent">
      <h2>운동을 이어서 할까요?</h2>
      <p>${esc(EX(W.routine.items[W.i].id).name)}에서 멈췄어요.</p>
      <div class="actions"><button class="btn primary" data-act="resume">이어서 하기</button>
      <button class="btn secondary" data-act="quit">그만하기</button></div>
    </section>` : '';

  const follow = followUp ? `
    <section class="card warn-soft">
      <h2>지난번 운동 중에 불편하셨죠.<br>오늘은 괜찮으세요?</h2>
      <div class="choices row2">
        <button class="btn choice" data-act="ack" data-v="ok">괜찮아요</button>
        <button class="btn choice" data-act="ack" data-v="still">아직 불편해요</button>
      </div>
    </section>` : '';

  const routineCard = done ? `
    <section class="card ok">
      ${icon.check}
      <h2>오늘 운동을 마쳤어요!</h2>
      <p>잘하셨어요. 내일도 만나요.</p>
      <div class="actions"><button class="btn secondary" data-act="start">한 번 더 하기</button></div>
    </section>` : `
    <section class="card routine">
      <div class="badges"><span class="badge">${preview.level}단계</span><span class="badge soft">약 ${preview.estMinutes}분</span><span class="badge soft">${preview.items.length}동작</span></div>
      <h2>오늘의 운동</h2>
      <p class="reason">${esc(preview.reason)}</p>
      <ol class="ex-list">${preview.items.map((it) => `<li><span>${esc(EX(it.id).name)}</span>${EX(it.id).pose && s.settings.poseEnabled ? `<span class="cam-tag" title="카메라로 자세 확인">${icon.camera}</span>` : ''}</li>`).join('')}</ol>
      <p class="muted small">시작할 때 오늘 컨디션에 맞춰 한 번 더 맞춰 드려요.</p>
    </section>
    <div class="actions"><button class="btn primary big" data-act="start">${icon.play} 오늘의 운동 시작</button></div>`;

  return {
    html: page({
      nav: 'home',
      cls: 'home',
      body: `
        <h1 class="greet">${esc(s.user.name)}님, 안녕하세요</h1>
        <p class="streak">${streak > 0 ? `${icon.heart} <b>${streak}일</b> 연속 운동 중이에요` : '오늘 첫 운동을 시작해 봐요'}</p>
        ${resumeCard}
        ${follow}
        ${session.homeMsg ? `<p class="notice">${esc(session.homeMsg)}</p>` : ''}
        ${W && !W.finished ? '' : routineCard}
        ${locked ? `<p class="muted small">${icon.alert} 의사와 상담하기 전까지는 1단계 의자 운동만 안내해요.</p>` : ''}`,
    }),
  };
}

// ── S-06 오늘 컨디션 ──────────────────────────
function needsCamera(r) {
  const s = store.get();
  return s.settings.poseEnabled && pose.supported() && r.items.some((it) => EX(it.id).pose);
}

function condition() {
  const s = store.get();
  actions.back = () => {
    if (session.condition && !session.loading) {
      session.condition = null;
      session.routine = null;
      render();
    } else go('home');
  };
  actions.cond = async (el) => {
    const v = el.dataset.v;
    session.condition = v;
    session.loading = true;
    render();
    const today = store.dateStr();
    const base = buildRoutine(store.get(), { condition: v, date: today, poseEnabled: s.settings.poseEnabled });
    let r = null;
    try {
      r = await ai.aiRoutine(store.get(), v);
    } catch {
      r = null;
    }
    session.routine = r
      ? {
        ...base, items: r.items, reason: r.reason || base.reason, source: 'ai', estMinutes: r.estMinutes,
      }
      : base;
    session.loading = false;
    if (route() === 'condition') render();
  };
  actions.go = () => {
    if (needsCamera(session.routine)) {
      session.cam = { status: pose.cameraOn() ? 'ready' : 'idle' };
      go('camera');
    } else {
      session.useCamera = false;
      startWorkout();
    }
  };

  let body;
  if (!session.condition) {
    body = `
      <h2 class="question">오늘 몸 상태는 어떠세요?</h2>
      <div class="choices col faces">
        ${C.CONDITIONS.map((c) => `<button class="btn choice face-${c.value}" data-act="cond" data-v="${c.value}">${face(c.value)}<span>${c.label}</span></button>`).join('')}
      </div>`;
  } else if (session.loading) {
    body = `<div class="loading" role="status"><div class="spinner"></div><p class="big-text">오늘 운동을 준비하고 있어요…</p></div>`;
  } else {
    const r = session.routine;
    body = `
      <section class="card routine">
        <div class="badges"><span class="badge">${r.level}단계</span><span class="badge soft">약 ${r.estMinutes}분</span>${r.source === 'ai' ? `<span class="badge ai">${icon.sparkle} AI 추천</span>` : ''}</div>
        <h2>오늘의 운동</h2>
        <p class="reason">${esc(r.reason)}</p>
        <ol class="ex-list detail">${r.items.map((it) => `<li><span>${esc(EX(it.id).name)}</span><span class="dose">${doseText(it)}</span></li>`).join('')}</ol>
      </section>
      <p class="notice">${esc(C.PRE_WORKOUT)}</p>`;
  }
  return {
    html: page({ title: '오늘 컨디션', back: true, body })
      + (session.routine && !session.loading ? '<div class="actions fixed"><button class="btn primary big" data-act="go">시작하기</button></div>' : ''),
  };
}

// ── S-06a 카메라 준비 ─────────────────────────
function camera() {
  const s = store.get();
  const poseItems = session.routine.items.map((it) => EX(it.id)).filter((e) => e.pose);
  const cam = session.cam;
  actions.back = () => {
    pose.stopCamera();
    session.cam = { status: 'idle' };
    go('condition');
  };
  actions.camOn = async () => {
    store.update((x) => { x.settings.cameraConsent = true; });
    session.cam = { status: 'starting' };
    render();
    try {
      await pose.startCamera();
      session.cam = { status: 'loading' };
      if (route() === 'camera') render();
      await pose.loadModel();
      session.cam = { status: 'ready' };
    } catch (e) {
      pose.stopCamera();
      session.cam = {
        status: 'error',
        msg: e && e.name === 'NotAllowedError'
          ? '카메라 사용이 허용되지 않았어요. 이번에는 타이머로 진행할게요.'
          : '자세 인식을 준비하지 못했어요. 인터넷 연결을 확인해 주세요. 이번에는 타이머로 진행할게요.',
      };
    }
    if (route() === 'camera') render();
  };
  actions.noCam = () => {
    pose.stopCamera();
    session.useCamera = false;
    startWorkout();
  };
  actions.go = () => {
    session.useCamera = true;
    startWorkout();
  };

  const showVideo = ['loading', 'ready'].includes(cam.status);
  let buttons;
  if (cam.status === 'idle') {
    buttons = `<button class="btn primary" data-act="camOn">${icon.camera} 카메라 켜기</button>
      <button class="btn secondary" data-act="noCam">카메라 없이 하기</button>`;
  } else if (cam.status === 'starting' || cam.status === 'loading') {
    buttons = `<button class="btn primary" disabled>준비하고 있어요…</button>
      <button class="btn secondary" data-act="noCam">카메라 없이 하기</button>`;
  } else if (cam.status === 'ready') {
    buttons = `<button class="btn primary" data-act="go">이대로 시작하기</button>
      <button class="btn secondary" data-act="noCam">카메라 없이 하기</button>`;
  } else {
    buttons = '<button class="btn primary" data-act="noCam">타이머로 시작하기</button>';
  }

  return {
    html: page({
      title: '카메라 준비',
      back: true,
      body: `
        <h2 class="question">카메라로 자세를 봐 드릴게요</h2>
        <p>오늘 운동 중 <b>${poseItems.map((e) => esc(e.name)).join(', ')}</b> 동작은 카메라로 횟수를 세고 자세를 알려 드려요.</p>
        ${s.settings.cameraConsent ? '' : `<div class="card info">${icon.camera}<p>카메라 영상은 <b>이 휴대폰 안에서만</b> 자세를 확인하는 데 쓰고, 저장하거나 다른 곳으로 보내지 않아요.</p></div>`}
        ${showVideo ? '<div class="cam-box" id="cam-preview"></div>' : `<div class="placement">${pictogram('seated')}<span class="phone-ico">${icon.camera}</span></div>`}
        <ul class="tips">
          <li>${esc(PLACEMENT_TIPS[poseItems[0]?.pose] || PLACEMENT_TIPS.sit_to_stand)}</li>
          <li>휴대폰이 넘어지지 않게 벽이나 물건에 기대어 세워 주세요.</li>
          <li>밝은 곳에서 하면 더 잘 보여요.</li>
        </ul>
        ${cam.status === 'error' ? `<p class="notice">${esc(cam.msg)}</p>` : ''}
        ${cam.status === 'loading' ? '<p class="muted">처음 한 번은 자세 인식 프로그램을 내려받느라 조금 걸려요.</p>' : ''}`,
    }) + `<div class="actions fixed">${buttons}</div>`,
    mount(root) {
      const box = root.querySelector('#cam-preview');
      if (box && pose.cameraOn()) box.appendChild(pose.getVideo());
    },
  };
}

// ── 운동 진행 엔진 (S-07) ─────────────────────
function startWorkout() {
  const r = { ...session.routine, id: store.uid() };
  store.update((x) => {
    x.routines.push({
      id: r.id, date: r.date, condition: r.condition, level: r.level, items: r.items, source: r.source,
    });
    if (x.routines.length > 30) x.routines = x.routines.slice(-30);
  });
  W = {
    routine: r,
    i: 0,
    set: 1,
    side: 0,
    phase: 'next',
    t: 8,
    elapsed: 0,
    paused: false,
    activeSec: 0,
    mode: 'timer',
    count: 0,
    countBase: 0,
    target: 0,
    unitSides: 1,
    feedback: '',
    notice: '',
    skipped: 0,
    poseReps: 0,
    poseFailed: {},
    discomfort: null,
    finished: false,
  };
  applySettings();
  speech.speak(`운동을 시작할게요. 첫 동작은 ${eyo(EX(r.items[0].id).name)}`);
  ensureTicker();
  go('workout');
}

function ensureTicker() {
  if (!ticker) ticker = setInterval(tick, 1000);
}

const curItem = () => W.routine.items[W.i];
const curEx = () => EX(curItem().id);

function beginUnit() {
  const e = curEx();
  const it = curItem();
  W.phase = 'work';
  W.elapsed = 0;
  W.count = 0;
  W.countBase = 0;
  W.feedback = '';
  W.notice = '';
  const canPose = session.useCamera && e.pose && pose.cameraOn() && pose.modelReady() && !W.poseFailed[e.id];
  W.mode = canPose ? 'pose' : 'timer';
  if (W.mode === 'pose') {
    W.unitSides = 1;
    W.target = it.reps * (e.perSide ? 2 : 1);
  } else {
    W.unitSides = e.perSide ? 2 : 1;
    W.target = it.seconds || it.reps;
  }
  W.t = it.seconds || 0;
  const side = W.unitSides === 2 ? (W.side === 0 ? '왼쪽부터 ' : '오른쪽 ') : '';
  const amount = W.mode === 'pose' && e.perSide ? `양쪽 번갈아 ${W.target}회` : (it.seconds ? `${it.seconds}초` : `${it.reps}회`);
  speech.speak(W.side === 1 ? '반대쪽도 해요.' : `${side}${amount} 시작해요.`);
}

function finishUnit() {
  const it = curItem();
  pose.stopTracking();
  if (W.mode === 'pose') W.poseReps += W.count;
  if (W.side < W.unitSides - 1) {
    W.side += 1;
    beginUnit();
    renderWorkout();
    return;
  }
  W.side = 0;
  if (W.set < it.sets) {
    W.set += 1;
    W.phase = 'rest';
    W.t = REST_BETWEEN_SETS;
    speech.speak(`잘하셨어요. ${REST_BETWEEN_SETS}초 쉬어요.`);
    renderWorkout();
    return;
  }
  nextExercise();
}

function nextExercise() {
  pose.stopTracking();
  W.set = 1;
  W.side = 0;
  if (W.i >= W.routine.items.length - 1) {
    finishWorkout(true);
    return;
  }
  W.i += 1;
  W.phase = 'next';
  W.t = REST_BETWEEN_EXERCISES;
  speech.speak(`다음은 ${eyo(curEx().name)}`);
  renderWorkout();
}

function tick() {
  if (!W || W.finished || W.paused || route() !== 'workout') return;
  W.activeSec += 1;
  if (W.phase === 'next' || W.phase === 'rest') {
    W.t -= 1;
    if (W.t <= 0) {
      beginUnit();
      renderWorkout();
      return;
    }
  } else if (W.phase === 'work' && W.mode === 'timer') {
    const it = curItem();
    W.elapsed += 1;
    if (it.seconds) {
      W.t -= 1;
      if (W.t === Math.floor(it.seconds / 2) && it.seconds >= 20) speech.speak('절반 지났어요.');
      if (W.t <= 0) {
        speech.speak('그만.');
        finishUnit();
        return;
      }
    } else {
      const n = Math.floor(W.elapsed / SECONDS_PER_REP);
      if (n > W.count) {
        W.count = n;
        speech.speak(speech.countWord(n));
        if (W.count >= W.target) {
          setTimeout(() => { if (W && W.phase === 'work' && W.count >= W.target) finishUnit(); }, 600);
        }
      }
    }
  }
  updateWorkout();
}

function startPoseTracking(canvas) {
  const e = curEx();
  W.countBase = W.count;
  pose.startTracking({
    poseKey: e.pose,
    canvas,
    onUpdate: (r) => {
      if (!W || W.phase !== 'work' || W.mode !== 'pose' || W.paused) return;
      const total = W.countBase + r.count;
      if (total > W.count) {
        W.count = total;
        speech.speak(speech.countWord(Math.min(total, 15)));
      }
      if (r.feedback && r.feedback !== W.feedback) {
        W.feedback = r.feedback;
        if (r.event === 'partial' || /천천히|펴 보세요/.test(r.feedback)) speech.speak(r.feedback, { interrupt: false });
      }
      updateWorkout();
      if (W.count >= W.target) finishUnit();
    },
    onLost: () => {
      if (!W || W.mode !== 'pose') return;
      // N-11: 3초 넘게 인식이 안 되면 남은 횟수를 타이머로 진행
      W.poseFailed[e.id] = true;
      W.poseReps += W.count;
      const remaining = Math.max(1, W.target - W.count);
      W.mode = 'timer';
      W.target = remaining;
      W.count = 0;
      W.elapsed = 0;
      W.notice = '카메라로 인식이 어려워 타이머로 진행할게요.';
      speech.speak(W.notice);
      renderWorkout();
    },
  });
}

function finishWorkout(completed, { silent = false } = {}) {
  if (!W) return;
  pose.stopTracking();
  pose.stopCamera();
  W.finished = true;
  if (!silent) speech.speak(completed ? '오늘 운동을 모두 마쳤어요. 정말 잘하셨어요!' : '오늘은 여기까지 해요.');
  session.result = {
    completed, logged: false, progress: null, symptom: W.discomfort?.symptom || null,
  };
  if (!completed) {
    session.result.progress = saveLog({ completed: false });
    session.result.logged = true;
  }
  if (!silent) go('done');
}

function saveLog({ completed, difficulty = null }) {
  const s = store.get();
  const log = {
    id: store.uid(),
    date: store.dateStr(),
    routineId: W.routine.id,
    level: s.level,
    routineLevel: W.routine.level,
    condition: W.routine.condition,
    source: W.routine.source,
    completed,
    durationSec: W.activeSec,
    difficulty,
    skipped: W.skipped,
    usedPose: W.poseReps > 0,
    poseReps: W.poseReps,
    discomfort: W.discomfort,
  };
  store.update((x) => { x.logs.push(log); });
  const p = evaluateProgress(store.get(), store.dateStr());
  if (p.change < 0) {
    store.update((x) => {
      x.level = Math.max(1, x.level - 1);
      x.levelSince = store.dateStr();
    });
  }
  return p;
}

function renderWorkout() {
  if (route() === 'workout') render();
}

function counterText() {
  const it = curItem();
  if (W.phase !== 'work') return `${W.t}`;
  if (W.mode === 'timer' && it.seconds) return `${W.t}<small>초</small>`;
  return `${W.count}<small> / ${W.target}회</small>`;
}

function updateWorkout() {
  if (route() !== 'workout') return;
  const c = document.getElementById('wk-count');
  if (c) c.innerHTML = counterText();
  const f = document.getElementById('wk-feedback');
  if (f) f.textContent = W.notice || W.feedback || '';
  const bar = document.getElementById('wk-bar');
  if (bar && W.phase === 'work') {
    const it = curItem();
    const ratio = W.mode === 'timer' && it.seconds ? 1 - W.t / it.seconds : W.count / Math.max(1, W.target);
    bar.style.width = `${Math.min(100, ratio * 100)}%`;
  }
}

function workout() {
  const e = curEx();
  const it = curItem();
  const n = W.routine.items.length;
  actions.pause = () => {
    W.paused = !W.paused;
    if (W.paused) speech.stop();
    render();
  };
  actions.skip = () => {
    if (W.phase === 'work') {
      W.skipped += 1;
      if (W.mode === 'pose') W.poseReps += W.count;
      nextExercise();
    } else {
      beginUnit();
      renderWorkout();
    }
  };
  actions.discomfort = () => {
    W.paused = true;
    pose.stopTracking();
    speech.stop();
    session.symptom = null;
    session.excludeAfter = true;
    go('discomfort');
  };

  const head = `
    <header class="topbar workout-top">
      <span class="wk-progress">${W.i + 1} / ${n} 동작</span>
      <button class="btn-text" data-act="pause">${W.paused ? `${icon.play} 계속` : `${icon.pause} 일시정지`}</button>
    </header>
    <div class="route-bar"><div style="width:${(W.i / n) * 100}%"></div></div>`;

  const steps = `<ol class="steps">${e.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    <p class="caution">${icon.alert}<span>${esc(e.caution)}</span></p>`;

  let body;
  if (W.phase === 'next') {
    body = `
      <p class="phase-label">${W.i === 0 ? '곧 시작해요' : '다음 동작'}</p>
      <h1 class="ex-name">${esc(e.name)}</h1>
      <p class="dose-line">${doseText(it)}${e.pose && session.useCamera && pose.cameraOn() && !W.poseFailed[e.id] ? ` · ${icon.camera} 카메라로 세요` : ''}</p>
      <div class="picto-box">${pictogram(e.posture)}</div>
      ${steps}
      <div class="countdown"><span class="big-timer" id="wk-count">${W.t}</span><span>초 뒤에 시작해요</span></div>
      <div class="actions"><button class="btn primary" data-act="skip">바로 시작</button></div>`;
  } else if (W.phase === 'rest') {
    body = `
      <p class="phase-label">쉬는 시간</p>
      <h1 class="ex-name">숨을 고르세요</h1>
      <div class="countdown"><span class="big-timer" id="wk-count">${W.t}</span><span>초</span></div>
      <p class="big-text center">다음: ${esc(e.name)} ${W.set}세트 / ${it.sets}세트</p>
      <div class="actions"><button class="btn primary" data-act="skip">바로 시작</button></div>`;
  } else {
    const sideLabel = W.unitSides === 2 ? (W.side === 0 ? ' · 왼쪽' : ' · 오른쪽') : (W.mode === 'pose' && e.perSide ? ' · 양쪽 번갈아' : '');
    body = `
      <p class="phase-label">${CATEGORY_LABEL[e.category]} · ${W.set}세트 / ${it.sets}세트${sideLabel}</p>
      <h1 class="ex-name">${esc(e.name)}</h1>
      ${W.mode === 'pose'
    ? '<div class="cam-box live" id="wk-cam"><canvas id="wk-canvas"></canvas></div>'
    : `<div class="picto-box">${pictogram(e.posture)}</div>`}
      <div class="counter" id="wk-count" aria-live="off">${counterText()}</div>
      <div class="unit-bar"><div id="wk-bar"></div></div>
      <p class="feedback" id="wk-feedback" aria-live="polite">${esc(W.notice || W.feedback || '')}</p>
      ${steps}
      <div class="actions"><button class="btn secondary" data-act="skip">${icon.next} 이 동작 건너뛰기</button></div>`;
  }

  return {
    html: `${head}<main class="content workout${W.paused ? ' paused' : ''}">
      ${W.paused ? '<p class="paused-note">잠시 멈췄어요. ‘계속’을 누르면 이어서 해요.</p>' : ''}
      ${body}
    </main>
    <div class="discomfort-bar"><button class="btn danger" data-act="discomfort">${icon.alert} 불편해요</button></div>`,
    mount(root) {
      if (W.phase === 'work' && W.mode === 'pose') {
        const box = root.querySelector('#wk-cam');
        const canvas = root.querySelector('#wk-canvas');
        box.insertBefore(pose.getVideo(), canvas);
        if (!W.paused) startPoseTracking(canvas);
      }
      updateWorkout();
    },
  };
}

// ── S-08 불편 대응 ────────────────────────────
function discomfort() {
  const sym = C.SYMPTOMS.find((x) => x.value === session.symptom);
  const backToWorkout = () => {
    if (W && !W.finished) {
      W.paused = false;
      go('workout');
    }
  };
  actions.sym = (el) => {
    session.symptom = el.dataset.v;
    W.discomfort = { symptom: session.symptom, exerciseId: curItem().id };
    const picked = C.SYMPTOMS.find((x) => x.value === session.symptom);
    speech.speak(picked.text);
    render();
  };
  actions.resume = () => {
    W.discomfort = null;
    backToWorkout();
  };
  actions.end = () => finishWorkout(false);
  actions.toggleExclude = () => {
    session.excludeAfter = !session.excludeAfter;
    render();
  };
  actions.skipEx = () => {
    if (session.excludeAfter) {
      const id = curItem().id;
      store.update((x) => { if (!x.excluded.includes(id)) x.excluded.push(id); });
    }
    W.skipped += 1;
    nextExercise();
    backToWorkout();
  };
  actions.cooldown = () => {
    const items = W.routine.items;
    const idx = items.findIndex((x, k) => k > W.i && EX(x.id).category === 'cooldown');
    if (idx < 0) {
      finishWorkout(true);
      return;
    }
    W.i = idx - 1;
    nextExercise();
    backToWorkout();
  };

  let body;
  if (!sym) {
    body = `
      <h2 class="question">어디가 불편하세요?</h2>
      <div class="choices col">
        ${C.SYMPTOMS.map((x) => `<button class="btn choice${x.action === 'emergency' ? ' danger-outline' : ''}" data-act="sym" data-v="${x.value}">${esc(x.label)}</button>`).join('')}
      </div>
      <div class="actions"><button class="btn-text" data-act="resume">잘못 눌렀어요. 계속할게요</button></div>`;
  } else {
    let acts = '';
    if (sym.action === 'emergency') {
      acts = `<a class="btn danger big" href="tel:119">${icon.phone} 119에 전화하기</a>
        <button class="btn secondary" data-act="end">운동 끝내기</button>`;
    } else if (sym.action === 'stop') {
      acts = '<button class="btn primary" data-act="end">운동 끝내기</button>';
    } else if (sym.action === 'skip') {
      acts = `
        <button class="consent${session.excludeAfter ? ' on' : ''}" role="checkbox" aria-checked="${session.excludeAfter}" data-act="toggleExclude">
          <span class="box">${session.excludeAfter ? icon.check : ''}</span><span>다음부터 ‘${esc(curEx().name)}’ 동작은 빼 주세요</span></button>
        <button class="btn primary" data-act="skipEx">이 동작 건너뛰고 계속하기</button>
        <button class="btn secondary" data-act="end">운동 끝내기</button>`;
    } else {
      acts = `<button class="btn primary" data-act="cooldown">마무리 운동으로 가기</button>
        <button class="btn secondary" data-act="end">운동 끝내기</button>`;
    }
    body = `
      <div class="card ${sym.action === 'emergency' ? 'danger' : 'warn'}">${icon.alert}<p class="big-text">${esc(sym.text)}</p></div>
      <div class="actions">${acts}</div>`;
  }
  return {
    html: page({ title: '불편해요', body, cls: 'discomfort' }),
  };
}

// ── S-09 운동 완료 ────────────────────────────
function done() {
  const r = session.result;
  const s = store.get();
  actions.diff = (el) => {
    r.progress = saveLog({ completed: true, difficulty: el.dataset.v });
    r.logged = true;
    render();
  };
  actions.levelUp = () => {
    store.update((x) => {
      x.level = Math.min(maxLevel(x), x.level + 1);
      x.levelSince = store.dateStr();
    });
    r.progress = { change: 0, accepted: true };
    render();
  };
  actions.keep = () => {
    r.progress = { change: 0, kept: true };
    render();
  };
  actions.home = () => {
    session.result = null;
    W = null;
    go('home');
  };

  const minutes = Math.max(1, Math.round((W?.activeSec || 0) / 60));
  let body;
  if (!r.completed) {
    const sym = C.SYMPTOMS.find((x) => x.value === r.symptom);
    body = `
      <div class="card warn">${icon.heart}<h2>오늘은 여기까지 해요</h2>
        <p class="big-text">${esc(sym ? sym.text : '푹 쉬세요.')}</p></div>
      ${sym?.action === 'emergency' ? `<a class="btn danger big" href="tel:119">${icon.phone} 119에 전화하기</a>` : ''}
      <p>불편함이 계속되면 의료진과 상담하세요.</p>
      ${r.progress?.change < 0 ? `<p class="notice">다음부터 한 단계 쉬운 운동으로 안내할게요. (지금 ${s.level}단계)</p>` : ''}`;
  } else if (!r.logged) {
    body = `
      <div class="celebrate">${icon.check}<h2>오늘 운동을 마쳤어요!</h2><p class="big-text">약 ${minutes}분 동안 운동하셨어요.</p></div>
      <h2 class="question">운동이 어떠셨어요?</h2>
      <div class="choices col">
        ${C.DIFFICULTIES.map((d) => `<button class="btn choice" data-act="diff" data-v="${d.value}">${esc(d.label)}</button>`).join('')}
      </div>`;
  } else {
    const p = r.progress || { change: 0 };
    let msg = '';
    if (p.change < 0) msg = `<p class="notice">다음부터 한 단계 쉬운 운동으로 안내할게요. (지금 ${s.level}단계)</p>`;
    if (p.change > 0) {
      msg = `<section class="card accent"><h2>요즘 운동이 쉬우셨네요.<br>한 단계 올려 볼까요?</h2>
        <div class="choices row2"><button class="btn choice" data-act="levelUp">올려 볼게요</button><button class="btn choice" data-act="keep">지금이 좋아요</button></div></section>`;
    }
    if (p.accepted) msg = `<p class="notice">다음부터 ${s.level}단계로 안내할게요.</p>`;
    const streak = store.streak();
    body = `
      <div class="celebrate">${icon.heart}<h2>정말 잘하셨어요!</h2>
        <p class="big-text">${streak > 1 ? `<b>${streak}일</b> 연속으로 운동했어요.` : '내일도 같이 해요.'}</p></div>
      ${msg}`;
  }
  const showHome = !r.completed || (r.logged && !(r.progress?.change > 0));
  return {
    html: page({ title: '운동 끝', body, cls: 'done' })
      + (showHome ? '<div class="actions fixed"><button class="btn primary" data-act="home">홈으로</button></div>' : ''),
  };
}

// ── S-10 기록 ─────────────────────────────────
function records() {
  const s = store.get();
  const today = store.dateStr();
  if (!session.recMonth) session.recMonth = today.slice(0, 7);
  const [y, m] = session.recMonth.split('-').map(Number);
  const doneSet = store.completedDates();
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let k = 0; k < lead; k += 1) cells.push('<span class="cal-cell empty"></span>');
  let monthCount = 0;
  for (let d = 1; d <= daysIn; d += 1) {
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const did = doneSet.has(ds);
    if (did) monthCount += 1;
    cells.push(`<span class="cal-cell${did ? ' done' : ''}${ds === today ? ' today' : ''}" aria-label="${m}월 ${d}일${did ? ' 운동함' : ''}">
      <span class="num">${d}</span>${did ? `<span class="stamp">${icon.check}</span>` : ''}</span>`);
  }
  const wk = store.weekSummary(today);
  const streak = store.streak(today);
  const recent = s.logs.slice(-5).reverse();
  const diffLabel = Object.fromEntries(C.DIFFICULTIES.map((d) => [d.value, d.label]));

  actions.prev = () => {
    const dt = new Date(y, m - 2, 1);
    session.recMonth = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    render();
  };
  actions.next = () => {
    const dt = new Date(y, m, 1);
    session.recMonth = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    render();
  };

  return {
    html: page({
      title: '내 운동 기록',
      nav: 'records',
      body: `
        <div class="stats">
          <div class="stat"><span class="stat-num">${streak}<small>일</small></span><span>연속 운동</span></div>
          <div class="stat"><span class="stat-num">${wk.days}<small>일</small></span><span>이번 주</span></div>
          <div class="stat"><span class="stat-num">${wk.minutes}<small>분</small></span><span>이번 주 시간</span></div>
        </div>
        <p class="notice">다음 주 목표: <b>일주일에 ${wk.goal}번</b> 운동하기</p>
        <section class="card cal">
          <div class="cal-head">
            <button class="btn-text" data-act="prev" aria-label="이전 달">${icon.back}</button>
            <h2>${y}년 ${m}월 · ${monthCount}일 운동</h2>
            <button class="btn-text flip" data-act="next" aria-label="다음 달" ${session.recMonth >= today.slice(0, 7) ? 'disabled' : ''}>${icon.back}</button>
          </div>
          <div class="cal-grid">${['월', '화', '수', '목', '금', '토', '일'].map((d) => `<span class="cal-dow">${d}</span>`).join('')}${cells.join('')}</div>
        </section>
        <h2 class="section-title">최근 운동</h2>
        ${recent.length ? `<ul class="log-list">${recent.map((l) => `
          <li><b>${fmtDate(l.date)}</b>
            <span>${l.completed ? `${Math.max(1, Math.round(l.durationSec / 60))}분 · ${esc(diffLabel[l.difficulty] || '완료')}` : '중간에 멈춤'}</span>
            ${l.discomfort ? '<span class="tag warn">불편 신고</span>' : ''}${l.usedPose ? `<span class="tag">${icon.camera} 자세 인식</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="muted">아직 기록이 없어요. 오늘 첫 운동을 해 봐요!</p>'}`,
    }),
  };
}

// ── S-11 물어보기 ─────────────────────────────
function ask() {
  const send = async (text) => {
    const q = String(text || '').trim();
    if (!q || session.asking) return;
    session.chat.push({ role: 'user', text: q });
    session.asking = true;
    render();
    const r = await ai.ask(store.get(), q);
    session.chat.push({ role: 'bot', ...r });
    session.asking = false;
    if (route() === 'ask') render();
  };
  actions.faq = (el) => send(C.FAQ[Number(el.dataset.i)].q);
  actions.send = () => send(document.getElementById('q')?.value);
  return {
    keepScroll: true,
    html: page({
      title: '물어보기',
      nav: 'ask',
      cls: 'ask',
      body: `
        <p class="muted">운동 방법이나 주의할 점을 물어보세요.</p>
        <div class="faq">${C.FAQ.map((f, i) => `<button class="chip" data-act="faq" data-i="${i}">${esc(f.q)}</button>`).join('')}</div>
        <div class="chat" aria-live="polite">
          ${session.chat.map((c) => (c.role === 'user'
    ? `<div class="bubble user">${esc(c.text)}</div>`
    : `<div class="bubble bot${c.emergency ? ' danger' : ''}">
                <p>${esc(c.text)}</p>
                ${c.emergency ? `<a class="btn danger" href="tel:119">${icon.phone} 119에 전화하기</a>` : ''}
                <p class="foot">${esc(C.AI_FOOTER)}</p>
              </div>`)).join('')}
          ${session.asking ? '<div class="bubble bot"><p>답을 찾고 있어요…</p></div>' : ''}
        </div>
        <form class="ask-form" id="ask-form">
          <label class="sr-only" for="q">질문</label>
          <input id="q" class="input" type="text" maxlength="300" placeholder="여기에 질문을 쓰세요" autocomplete="off">
          <button class="btn primary" type="submit" ${session.asking ? 'disabled' : ''}>보내기</button>
        </form>`,
    }),
    mount(root) {
      root.querySelector('#ask-form').addEventListener('submit', (e) => {
        e.preventDefault();
        send(root.querySelector('#q').value);
      });
      const chat = root.querySelector('.chat');
      if (session.chat.length) chat.lastElementChild?.scrollIntoView({ block: 'end' });
    },
  };
}

// ── S-12 설정 ─────────────────────────────────
function settings() {
  const s = store.get();
  const set = (fn) => {
    store.update((x) => fn(x.settings));
    applySettings();
    render();
  };
  actions.font = (el) => set((st) => { st.fontSize = el.dataset.v; });
  actions.tts = () => {
    set((st) => { st.tts = !st.tts; });
    if (store.get().settings.tts) speech.speak('음성 안내를 켰어요.');
  };
  actions.pose = () => set((st) => { st.poseEnabled = !st.poseEnabled; });
  actions.reminder = async () => {
    if (!s.settings.reminderOn && 'Notification' in window) {
      let perm = 'denied';
      try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
      if (perm !== 'granted') {
        session.settingsMsg = '알림이 허용되지 않았어요. 휴대폰 설정에서 알림을 허용해 주세요.';
        render();
        return;
      }
    }
    set((st) => { st.reminderOn = !st.reminderOn; });
    scheduleReminder();
  };
  actions.profile = () => {
    session.profileDraft = null;
    session.profileIdx = 0;
    go('profile');
  };
  actions.safety = () => {
    session.safetyIdx = 0;
    session.safetyAnswers = [];
    go('safety');
  };
  actions.levelDown = () => {
    store.update((x) => {
      x.level = Math.max(1, x.level - 1);
      x.levelSince = store.dateStr();
    });
    session.settingsMsg = `이제 ${store.get().level}단계로 안내할게요.`;
    render();
  };
  actions.install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    render();
  };
  actions.reset = () => {
    if (!session.resetArmed) {
      session.resetArmed = true;
      render();
      return;
    }
    pose.stopCamera();
    store.reset();
    W = null;
    Object.assign(session, {
      info: { name: '', ageGroup: null, consent: false }, chat: [], resetArmed: false, result: null, homeMsg: null,
    });
    applySettings();
    go('welcome');
  };

  const toggle = (on, act, label, desc = '') => `
    <button class="setting-row" role="switch" aria-checked="${on}" data-act="${act}">
      <span class="setting-text"><span class="setting-label">${label}</span>${desc ? `<span class="muted small">${desc}</span>` : ''}</span>
      <span class="switch${on ? ' on' : ''}"><span></span></span>
    </button>`;

  return {
    html: page({
      title: '설정',
      nav: 'settings',
      cls: 'settings',
      body: `
        ${session.settingsMsg ? `<p class="notice">${esc(session.settingsMsg)}</p>` : ''}
        <section class="group">
          <h2 class="section-title">글자 크기</h2>
          <div class="choices row3">
            ${[['normal', '보통'], ['large', '크게'], ['xlarge', '아주 크게']].map(([v, l]) => `<button class="btn choice${s.settings.fontSize === v ? ' on' : ''}" aria-pressed="${s.settings.fontSize === v}" data-act="font" data-v="${v}">${l}</button>`).join('')}
          </div>
        </section>
        <section class="group">
          ${toggle(s.settings.tts, 'tts', '음성 안내', '동작 설명과 횟수를 소리로 알려 드려요')}
          ${toggle(s.settings.poseEnabled, 'pose', '카메라로 자세 확인', '영상은 저장하거나 보내지 않아요')}
          ${toggle(s.settings.reminderOn, 'reminder', '운동 시간 알림', '시제품에서는 앱이 열려 있을 때만 알려 드려요')}
          ${s.settings.reminderOn ? `<label class="setting-row"><span class="setting-label">알림 시각</span><input id="rtime" class="input time" type="time" value="${esc(s.settings.reminderTime)}"></label>` : ''}
        </section>
        <section class="group">
          <div class="setting-row static"><span class="setting-label">지금 운동 단계</span><b>${s.level}단계</b></div>
          ${s.level > 1 ? '<button class="btn secondary" data-act="levelDown">한 단계 낮추기</button>' : ''}
          <button class="btn secondary" data-act="profile">내 상태 다시 선택하기</button>
          <button class="btn secondary" data-act="safety">안전 점검 다시 하기</button>
          ${installPrompt ? '<button class="btn secondary" data-act="install">홈 화면에 앱 추가하기</button>' : ''}
        </section>
        <section class="group">
          <h2 class="section-title">앱 정보</h2>
          <p class="muted small">실버핏 AI ${CONFIG.APP_VERSION} · AI ${ai.isAvailable() ? '연결됨' : '연결 안 됨(기본 안내로 동작)'}</p>
          <p class="muted small">${esc(C.DISCLAIMER)}</p>
          <button class="btn danger-outline" data-act="reset">${session.resetArmed ? '정말 지울까요? 한 번 더 누르세요' : '모든 기록 지우기'}</button>
        </section>`,
    }),
    mount(root) {
      session.settingsMsg = null;
      const t = root.querySelector('#rtime');
      if (t) {
        t.addEventListener('change', () => {
          store.update((x) => { x.settings.reminderTime = t.value || '09:00'; });
          scheduleReminder();
        });
      }
    },
  };
}

// ── 운동 시간 알림 (F-16, 시제품: 앱이 열려 있는 동안) ─────
let reminderTimer = null;
function scheduleReminder() {
  clearTimeout(reminderTimer);
  const s = store.get();
  if (!s.settings.reminderOn || !('Notification' in window) || Notification.permission !== 'granted') return;
  const [hh, mm] = s.settings.reminderTime.split(':').map(Number);
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
  const ms = at - now;
  if (ms <= 0 || store.todayLog()) return;
  reminderTimer = setTimeout(async () => {
    if (store.todayLog()) return;
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body: '오늘의 운동을 시작해 볼까요? 10분이면 충분해요.', icon: 'icons/icon-192.png', tag: 'silverfit-reminder' };
    try {
      if (reg) reg.showNotification('실버핏 AI', opts);
      else new Notification('실버핏 AI', opts); // eslint-disable-line no-new
    } catch { /* 알림을 쓸 수 없는 환경 */ }
  }, ms);
}

const SCREENS = {
  welcome, info, safety, 'safety-result': safetyResult, profile, home, condition, camera, workout, discomfort, done, records, ask, settings,
};

// ── 시작 ──────────────────────────────────────
window.addEventListener('hashchange', render);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});
document.addEventListener('visibilitychange', () => {
  // 화면을 벗어나면 운동을 잠시 멈춥니다.
  if (document.hidden && W && !W.finished && W.phase !== 'next') {
    W.paused = true;
    speech.stop();
    if (route() === 'workout') render();
  }
});

applySettings();
render();
ai.checkAvailable();
scheduleReminder();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// 개발 확인용 (브라우저 콘솔에서 __silverfit 으로 상태 확인)
window.__silverfit = { get W() { return W; }, session, store };
