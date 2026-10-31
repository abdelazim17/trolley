/* يخزن الصور على جهاز الزائر عشان الزيارات التانية تبقى أسرع وتستهلك إنترنت أقل */
const CACHE = 'tm-img-v3', MAX = 150; let puts = 0;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !/\/images\//.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(async res => {
      if (res.ok) { await c.put(r, res.clone()); if (++puts % 25 === 0) { const ks = await c.keys(); for (let i = 0; i < ks.length - MAX; i++) await c.delete(ks[i]); } }
      return res;
    }).catch(() => hit);
    return hit || net;   // الصورة من الكاش فوراً، وبتتحدث في الخلفية
  }));
});
/* ترولي ماركت فيرجن 5 */
