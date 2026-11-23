// 서비스 워커: 앱 화면을 휴대폰에 저장해 인터넷이 약해도 열리게 합니다.
// 파일을 고치면 VERSION 숫자를 올려 주세요.
const VERSION = 'silverfit-v0.1.0';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/config.js',
  'js/store.js',
  'js/recommend.js',
  'js/ai.js',
  'js/speech.js',
  'js/pose.js',
  'js/pose-logic.js',
  'js/ui.js',
  'js/data/exercises.js',
  'js/data/content.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // AI 서버 함수는 항상 네트워크로
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return;

  // 자세 인식 프로그램(MediaPipe)은 한 번 받으면 저장해 두고 씁니다.
  const isPoseAsset = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'storage.googleapis.com';

  if (url.origin === location.origin || isPoseAsset) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./#home');
  }));
});
