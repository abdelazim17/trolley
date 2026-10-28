/* يخزن الصور على جهاز الزائر عشان الزيارات التانية تبقى أسرع وتستهلك إنترنت أقل */
const CACHE = 'tm-img-v2', MAX = 500;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !/\/images\//.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(async res => {
      if (res.ok) { await c.put(r, res.clone()); const ks = await c.keys(); if (ks.length > MAX) await c.delete(ks[0]); }
      return res;
    }).catch(() => hit);
    return hit || net;   // الصورة من الكاش فوراً، وبتتحدث في الخلفية
  }));
});
