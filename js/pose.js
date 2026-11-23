// 카메라 + MediaPipe Pose Landmarker 실행부 (F-20, N-10, N-11)
// 영상은 휴대폰 브라우저 안에서만 처리하며 저장하거나 서버로 보내지 않습니다.

import { CONFIG } from './config.js';
import { DETECTORS, visibleEnough, LOST_MS } from './pose-logic.js';

let stream = null;
let video = null;
let landmarker = null;
let loading = null;
let loop = null;

export function supported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
}

export function getVideo() {
  if (!video) {
    video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.className = 'cam-video';
  }
  return video;
}

export async function startCamera() {
  if (stream) return getVideo();
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  const v = getVideo();
  v.srcObject = stream;
  await v.play().catch(() => {});
  return v;
}

export function stopCamera() {
  stopTracking();
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video) video.srcObject = null;
}

export function cameraOn() {
  return !!stream;
}

export async function loadModel() {
  if (landmarker) return landmarker;
  if (!loading) {
    loading = (async () => {
      const vision = await import(/* @vite-ignore */ CONFIG.POSE.bundle);
      const files = await vision.FilesetResolver.forVisionTasks(CONFIG.POSE.wasm);
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: CONFIG.POSE.model, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      try {
        landmarker = await vision.PoseLandmarker.createFromOptions(files, opts('GPU'));
      } catch {
        landmarker = await vision.PoseLandmarker.createFromOptions(files, opts('CPU'));
      }
      return landmarker;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export function modelReady() {
  return !!landmarker;
}

const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

function draw(canvas, lm, good) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  ctx.lineWidth = Math.max(3, w / 120);
  ctx.strokeStyle = good ? 'rgba(46, 204, 113, 0.9)' : 'rgba(255, 255, 255, 0.8)';
  ctx.fillStyle = ctx.strokeStyle;
  for (const [a, b] of CONNECTIONS) {
    const p = lm[a];
    const q = lm[b];
    if (!p || !q || (p.visibility ?? 1) < 0.5 || (q.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * w, p.y * h);
    ctx.lineTo(q.x * w, q.y * h);
    ctx.stroke();
  }
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, ctx.lineWidth * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 운동 하나에 대한 추적 시작
// onUpdate({count, feedback, event, visible}) / onLost() : 3초 넘게 안 보이면 호출
export function startTracking({ poseKey, canvas, onUpdate, onLost }) {
  stopTracking();
  const Det = DETECTORS[poseKey];
  if (!Det || !landmarker || !stream) {
    onLost?.('unavailable');
    return;
  }
  const det = new Det();
  const req = det.required();
  const v = getVideo();
  let lastSeen = performance.now();
  let lastTs = -1;
  let active = true;

  const step = () => {
    if (!active) return;
    const now = performance.now();
    if (v.readyState >= 2 && v.videoWidth) {
      if (canvas.width !== v.videoWidth) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
      }
      const ts = Math.max(lastTs + 1, Math.round(now));
      lastTs = ts;
      let lm = null;
      try {
        const res = landmarker.detectForVideo(v, ts);
        lm = res?.landmarks?.[0] || null;
      } catch {
        lm = null;
      }
      const vis = visibleEnough(lm, req);
      draw(canvas, lm, vis);
      if (vis) {
        lastSeen = now;
        const r = det.update(lm, now);
        onUpdate?.({ ...r, visible: true });
      } else {
        onUpdate?.({ count: det.c.count, feedback: '몸 전체가 화면에 보이게 해 주세요.', event: null, visible: false });
        if (now - lastSeen > LOST_MS) {
          active = false;
          onLost?.('lost');
          return;
        }
      }
    }
    loop = requestAnimationFrame(step);
  };
  loop = requestAnimationFrame(step);
  stopTracking.current = () => {
    active = false;
  };
}

export function stopTracking() {
  if (loop) cancelAnimationFrame(loop);
  loop = null;
  if (stopTracking.current) stopTracking.current();
  stopTracking.current = null;
}
