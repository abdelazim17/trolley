/* ترولي ماركت — النسخة المدمجة. كل البيانات تتحكم فيها من data.xlsx */
(() => {
'use strict';

/* ---------- الحالة ---------- */
let allOffers = [], allProducts = [], CATEGORIES = [];
let sliderData = [], quickLinksData = [], bannersData = {}, catalogData = [], bundlesData = [], S = {};
let sortMode = 'default';
let catMeta = {};
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="rgba(16,20,26,.14)"/><path d="M60 130l25-30 20 22 15-17 20 25z" fill="rgba(16,20,26,.14)"/><circle cx="75" cy="75" r="12" fill="rgba(16,20,26,.14)"/></svg>');
const EXCLUDED = ['السلايدر', 'البنرات', 'عروض اليوم', 'مجلة العروض', 'الإعدادات', 'أقسام سريعة', 'دليل الاستخدام', 'إدارة الأقسام', 'باقات العروض'];
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- أدوات ---------- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (v) => (v === undefined || v === null) ? '' : String(v).trim();
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const fmt = (n) => String(+Number(n).toFixed(2));
const cur = () => S['رمز العملة'] || 'ج';
const norm = (s) => str(s).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const isNo = (v) => str(v) === 'لا';
const isYes = (v) => str(v) === 'نعم';
const ltr = (t) => '<bdi dir="ltr">' + esc(t) + '</bdi>';
function safeUrl(v) {
    const r = str(v); if (!r) return '';
    if (r[0] === '#') return r;
    try { const u = new URL(r, location.href); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (e) { return ''; }
}
/* مصدر صورة آمن: ملف نسبي أو http(s) أو data:image — غير كده يتشال */
function safeSrc(v) {
    const r = str(v); if (!r) return '';
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);/i.test(r)) return r;
    if (/^\s*(javascript|vbscript|data|file|blob):/i.test(r) || r.slice(0, 2) === '//') return '';
    try { const u = new URL(r, location.href); return /^https?:$/.test(u.protocol) ? r : ''; } catch (e) { return ''; }
}
/* رابط آمن: # أو نسبي أو http(s) أو tel: أو mailto: */
function safeLink(v) {
    const r = str(v); if (!r) return '';
    if (r[0] === '#') return r;
    try { const u = new URL(r, location.href); return /^(https?:|tel:|mailto:)$/.test(u.protocol) ? r : ''; } catch (e) { return ''; }
}
/* تنضيف بيانات الإكسل قبل ما تدخل الصفحة */
function sanitizeData(data) {
    Object.keys(data.sheets).forEach(n => data.sheets[n].forEach(r => {
        if ('صورة' in r) r['صورة'] = safeSrc(r['صورة']);
        if ('الإعداد' in r && 'القيمة' in r) {
            const k = str(r['الإعداد']);
            if (/^(صورة|أيقونة الموقع)/.test(k)) r['القيمة'] = safeSrc(r['القيمة']);
            else if (k.indexOf('رابط') > -1) r['القيمة'] = safeLink(r['القيمة']);
        }
    }));
}
const ORDER_API =/^https:\/\/script\.google\.com\//;
function getOrderApiUrl() { const u = str(S['رابط تسجيل الطلبات']); return ORDER_API.test(u) ? u : ''; }
function getCleanPhone(raw) {
    let c = str(raw).replace(/[+\-\s()]/g, '');
    if (!c) return '';
    if (c.startsWith('01')) c = '2' + c;
    return c;
}
function shade(hex, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(str(hex)); if (!m) return null;
    const n = parseInt(m[1], 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
let toastTimer;
function toast(msg) {
    const t = $('toast-msg'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}
// صفوف ظاهرة فقط ومرتبة حسب عمود الترتيب (الصفوف اللي من غير ترتيب بتفضل بترتيبها في الشيت)
const visibleRows = (rows) => rows.map((r, i) => ({ r, i })).filter(x => !isNo(x.r['ظاهر']))
    .sort((a, b) => ((num(a.r['الترتيب']) || 1e6) - (num(b.r['الترتيب']) || 1e6)) || (a.i - b.i)).map(x => x.r);
const catHref = (cat) => '#categories/' + encodeURIComponent(cat);

/* ---------- المظهر ---------- */
/* الوضع الليلي اتلغى: الموقع دايمًا بالهوية الفاتحة */
function initTheme() { document.body.classList.remove('dark-mode'); }
function syncThemeIcon() { }
function toggleTheme() { }
/* أيقونات مرسومة (SVG): سلة بشكل سلة اللوجو + سكوتر */
const ICON_CART = '<svg class="tmc" viewBox="0 12 144.4 120" aria-hidden="true" fill="currentColor"><path d="M142.432,33.872c-0.674-0.769-1.657-1.252-2.675-1.17l-98.523,2.661c-0.225,0.006-0.443,0.037-0.654,0.084l-4.146-13.86 c-0.389-1.304-1.516-2.254-2.869-2.418L3.836,15.57c-1.869-0.209-3.583,1.11-3.811,2.988c-0.227,1.878,1.11,3.583,2.988,3.811 l27.502,3.328l22.062,73.753c0.443,1.48,1.801,2.444,3.278,2.443c0.284,0,0.574-0.035,0.863-0.111l77.022-20 c1.311-0.34,2.297-1.421,2.518-2.757l6.974-42.345C143.397,35.672,143.104,34.642,142.432,33.872z M129.595,55.633l-34.706,2.033 v9.666l32.164-5.218c1.607-0.275,3.166,0.85,3.426,2.482c0.261,1.632-0.85,3.166-2.482,3.426l-33.108,5.369v10.084 c0,1.652-1.34,2.992-2.992,2.992s-2.992-1.34-2.992-2.992v-9.129l-30.903,4.828c-0.159,0.026-0.318,0.038-0.476,0.038 c-1.443,0-2.716-1.049-2.95-2.52c-0.261-1.632,0.851-3.166,2.482-3.426l31.847-4.979V58.037L52.572,60.29 c-0.063,0.004-0.126,0.006-0.189,0.006c-1.567,0-2.885-1.221-2.983-2.807c-0.102-1.649,1.152-3.069,2.801-3.172l36.704-2.276 l0.07-9.33c0-1.653,1.339-2.992,2.992-2.992c1.652,0,2.992,1.34,2.992,2.992l-0.07,8.959l34.335-2.01 c1.639-0.112,3.071,1.151,3.172,2.801C132.499,54.111,131.245,55.531,129.595,55.633z"/><circle cx="63.369" cy="117.514" r="11.378"/><circle cx="133.063" cy="109.848" r="11.378"/></svg>';
const ICON_SCOOTER = '<svg class="tms" viewBox="0 0 48 36" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="28" r="5.2" stroke-width="2.6"/><circle cx="38" cy="28" r="5.2" stroke-width="2.6"/><path d="M10 28c4.4 0 6.4-4 8.6-6.2H30l3.6 6.2" stroke-width="2.8"/><path d="M8.6 18.4h12c1.6 0 2.2 1.2 2.2 2.6" stroke-width="3.6"/><path d="M33.6 28L30.4 9.4h-5.2" stroke-width="3"/><circle cx="34.6" cy="13" r="1.7" fill="currentColor" stroke="none"/></g></svg>';

/* ---------- تحميل الإكسيل ---------- */
/* ---------- تحميل البيانات: عرض فوري من الكاش + تحديث في الخلفية ---------- */
const CACHE_KEY = 'tm_data_v6', FRESH_MS = 10 * 60 * 1000;
function readCache() { try { return JSON.parse(ls.get(CACHE_KEY)); } catch (e) { return null; } }
function writeCache(obj) { try { ls.set(CACHE_KEY, JSON.stringify(obj)); } catch (e) {} }
const XLSX_SRCS = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'xlsx.full.min.js'];
function loadXLSXLib() {
    if (window.XLSX) return Promise.resolve();
    const tryLoad = (i) => new Promise((res, rej) => {
        if (i >= XLSX_SRCS.length) return rej(new Error('xlsx lib failed'));
        const sc = document.createElement('script');
        sc.src = XLSX_SRCS[i]; sc.onload = res;
        sc.onerror = () => { sc.remove(); tryLoad(i + 1).then(res, rej); };
        document.head.appendChild(sc);
    });
    return tryLoad(0);
}
async function fetchFresh() {
    await loadXLSXLib();
    const v = Math.floor(Date.now() / 300000);
    const read = async (file, required) => {
        const r = await fetch(file + '?v=' + v);
        if (!r.ok) { if (required) throw new Error(file + ' not found'); return null; }
        const wb = XLSX.read(await r.arrayBuffer(), { type: 'array' });
        const sheets = {}; wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n]); });
        return { names: wb.SheetNames, sheets };
    };
    // data.xlsx = المنتجات والأسعار | settings.xlsx = الإعدادات والسلايدر والبنرات (لو مش موجود الموقع يكمل بـ data.xlsx بس)
    const [d, st] = await Promise.all([read('data.xlsx', true), read('settings.xlsx', false).catch(() => null)]);
    const sheets = Object.assign({}, d.sheets, st ? st.sheets : {});
    return { t: Date.now(), names: d.names, sheets };   // names = شيتات data.xlsx بس (هي الأقسام)
}
/* تحديث صامت: من غير أي رسالة للزبون. بيتطبق فوراً لو الزبون في أول الصفحة والسلة فاضية، وإلا في الزيارة الجاية */
function silentRefresh() {
    try {
        const busy = cart.length || window.scrollY > 80 || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') || document.body.classList.contains('modal-open');
        if (!busy) location.reload();
    } catch (e) { }
}
function showUpdateBar() {
    if ($('update-bar')) return;
    const b = document.createElement('div'); b.id = 'update-bar'; b.className = 'update-bar';
    b.textContent = 'تم تحديث الأسعار والعروض — اضغط هنا للتحديث'; b.onclick = () => location.reload();
    document.body.appendChild(b);
}
async function loadExcelData() {
    const cached = readCache();
    if (cached && cached.sheets) {
        let ok = true;
        try { initFromData(cached); } catch (e) { console.error(e); ok = false; ls.del(CACHE_KEY); }
        if (ok && Date.now() - (cached.t || 0) < FRESH_MS) return;       // الكاش لسه جديد
        if (!ok) { try { const f = await fetchFresh(); writeCache(f); location.reload(); } catch (e) {} return; }
        try {
            const fresh = await fetchFresh();
            if (JSON.stringify(fresh.sheets) !== JSON.stringify(cached.sheets)) { writeCache(fresh); silentRefresh(); }
            else { cached.t = Date.now(); writeCache(cached); }
        } catch (e) { /* مفيش نت: نكمل بالكاش */ }
        return;
    }
    try { const fresh = await fetchFresh(); writeCache(fresh); initFromData(fresh); }
    catch (err) {
        console.error('Error loading Excel:', err);
        $('global-loading').innerHTML = '<div style="color:#FF6200;font-size:1.2rem;padding:20px;">خطأ: تأكد من رفع ملف data.xlsx بشكل صحيح بجانب index.html!</div>';
    }
}
function initFromData(data) {
    sanitizeData(data);
    const rowsOf = (name) => data.sheets[name] || [];
    // الإعدادات: أي شيت فيه عمودي «الإعداد» و«القيمة» (الإعدادات متقسمة على أكتر من شيت)
    Object.keys(data.sheets).forEach(n => { const rs = data.sheets[n]; if (rs.some(r => 'الإعداد' in r) && rs.some(r => 'القيمة' in r)) rs.forEach(r => { if (str(r['الإعداد']) && r['القيمة'] !== undefined) S[str(r['الإعداد'])] = r['القيمة']; }); });
    sliderData = visibleRows(rowsOf('السلايدر')).filter(r => str(r['صورة']));
    quickLinksData = visibleRows(rowsOf('أقسام سريعة')).filter(r => str(r['الاسم']));
    rowsOf('البنرات').filter(r => !isNo(r['ظاهر'])).forEach(r => { bannersData[str(r['مكان_البانر'])] = { img: str(r['صورة']), type: str(r['نوع الاستهداف']), value: str(r['القسم أو المنتج المستهدف']), title: str(r['العنوان']), sub: str(r['العنوان الفرعي']), btn: str(r['نص الزر']) }; });
    catalogData = rowsOf('مجلة العروض').filter(r => str(r['صورة']) && !isNo(r['ظاهر']));
    bundlesData = rowsOf('باقات العروض').filter(r => str(r['الباقة']) && !isNo(r['ظاهر']) && num(r['سعر الباقة']) > 0);

    let n = 0;
    const showSold = isYes(S['إظهار المنتجات غير المتوفرة']);
    const clean = (rows, prefix, off) => rows.filter(r => str(r['الاسم']) && (off || showSold || !isNo(r['متوفر']))).map(r => ({ ...r, soldOut: !!off || isNo(r['متوفر']), id: prefix + (n++) }));
    // التحكم في الأقسام من شيت "إدارة الأقسام": إخفاء وترتيب (الأقسام الجديدة اللي مش مكتوبة هناك بتظهر في الآخر)
    const hideCats = new Set(), offCats = new Set(), blockedNames = new Set(), catOrder = {}; catMeta = {};
    rowsOf('إدارة الأقسام').forEach(r => { const k = str(r['القسم']); if (!k) return; { const vis = str(r['ظاهر']); if (/غير متوفر|نفد|موقوف|متوقف/.test(vis)) offCats.add(k); else if (isNo(vis)) hideCats.add(k); } if (num(r['الترتيب'])) catOrder[k] = num(r['الترتيب']); catMeta[k] = { color: str(r['اللون']), img: str(r['صورة']), icon: str(r['أيقونة']), label: str(r['الاسم المعروض']) }; });
    allOffers = clean(rowsOf('عروض اليوم'), 'off_');
    data.names.filter(s => !EXCLUDED.includes(s.trim())).forEach(cat => {
        const rows = rowsOf(cat);
        if (rows.length && isNo(rows[0]['عرض القسم'])) return;
        if (hideCats.has(cat.trim()) || offCats.has(cat.trim())) rows.forEach(r => blockedNames.add(str(r['الاسم'])));
        if (hideCats.has(cat.trim())) return;
        const off = offCats.has(cat.trim()), prods = clean(rows, 'prod_', off);
        prods.forEach(p => {
            p['القسم'] = cat;
            const flag = p['عروض اليوم'] !== undefined ? p['عروض اليوم'] : p['الصفحة الرئيسية'];
            if (!off && isYes(flag) && !allOffers.some(o => str(o['الاسم']) === str(p['الاسم']))) allOffers.push({ ...p, id: 'off_' + (n++) });
        });
        if (prods.length) { allProducts = allProducts.concat(prods); CATEGORIES.push(cat); }
    });

    const liveNames = new Set(allProducts.map(p => str(p['الاسم'])));
    allOffers = allOffers.filter(o => !blockedNames.has(str(o['الاسم'])) || liveNames.has(str(o['الاسم'])));
    window.TM_DISABLED = Array.from(offCats);
    CATEGORIES = CATEGORIES.map((c, i) => ({ c, i })).sort((a, b) => ((catOrder[a.c] || 1e6) - (catOrder[b.c] || 1e6)) || (a.i - b.i)).map(x => x.c);
    allOffers = allOffers.map((o, i) => ({ o, i, k: CATEGORIES.indexOf(o['القسم']) })).sort((a, b) => (a.k - b.k) || (a.i - b.i)).map(x => x.o);
    // أي رابط (سلايدر / أقسام سريعة / بنر / باقة) بيشاور على قسم مخفي أو ملغي أو منتج مش موجود = يختفي هو كمان
    const alive = (type, value) => {
        value = str(value); type = str(type) || 'قسم';
        if (!value) return true;
        if (type === 'قسم') return value === 'عروض اليوم' ? allOffers.length > 0 : CATEGORIES.includes(value);
        if (type === 'منتج') { const q = norm(value); return allProducts.some(p => norm(p['الاسم']).includes(q)); }
        return true;
    };
    window.__tmAlive = alive;
    sliderData = sliderData.filter(r => alive(r['نوع الاستهداف'], r['القسم_المستهدف']));
    quickLinksData = quickLinksData.filter(r => alive(r['نوع الاستهداف'], r['القسم_المستهدف']));
    const hiddenOnly = new Set(Array.from(blockedNames).filter(x => !liveNames.has(x)));
    bundlesData = bundlesData.filter(r => !parseBundleNames(r).some(x => hiddenOnly.has(x)));
    applySettings(); applyUI();
    $('global-loading').style.display = 'none';
    $('app-content').style.display = 'block';
    renderTodayOffers(); buildSlider(); renderQuickLinks(); applyBanners();
    initCategoryFilterBar(); applyAboutSettings(); renderCatalog(); loadCustomerFields(); updateCartUI();
    route();
    if (/[?&]check\b/.test(location.search)) runCheck(data);
}

/* ---------- فحص البيانات: افتح الموقع بـ  ?check  وهيظهر لك أي غلطة في الإكسل ---------- */
async function runCheck(data) {
    const bad = [], warn = [], rowsOf = (n) => data.sheets[n] || [];
    const mgmt = rowsOf('إدارة الأقسام').map(r => str(r['القسم'])).filter(Boolean);
    const catSheets = data.names.filter(s => !EXCLUDED.includes(s.trim()));
    catSheets.forEach(c => { if (!mgmt.includes(c.trim())) warn.push(`شيت «${c}» في data.xlsx مش مكتوب في «إدارة الأقسام» (هيظهر في آخر الأقسام)`); });
    mgmt.forEach(c => { if (!catSheets.map(x => x.trim()).includes(c)) bad.push(`القسم «${c}» مكتوب في «إدارة الأقسام» ومفيش له شيت بنفس الاسم في data.xlsx`); });
    const seen = {}, imgs = new Set();
    catSheets.forEach(c => rowsOf(c).forEach((r, i) => {
        const nm = str(r['الاسم']); if (!nm) return;
        const w = `${c} — ${nm}`, a = num(r['السعر الأساسي']), d = num(r['السعر بعد الخصم']);
        if (a <= 0 && d <= 0) bad.push(`${w}: مفيش سعر`);
        else if (d > 0 && a > 0 && d >= a) warn.push(`${w}: «السعر بعد الخصم» (${d}) مش أقل من الأساسي (${a}) فالخصم مش هيظهر`);
        if (!str(r['الوحدة'])) warn.push(`${w}: الوحدة فاضية`);
        if (seen[nm]) bad.push(`الاسم «${nm}» مكرر (في ${seen[nm]} و${c}) — لازم يكون الاسم فريد`); else seen[nm] = c;
        if (str(r['صورة'])) imgs.add(str(r['صورة']));
    }));
    bundlesData.concat(rowsOf('باقات العروض').filter(r => str(r['الباقة']))).forEach(r => parseBundleNames(r).forEach(x => { if (!seen[x]) warn.push(`باقة «${str(r['الباقة'])}»: المنتج «${x}» مش موجود في أي قسم ظاهر`); }));
    if (!allOffers.length) warn.push('مفيش أي منتج في «عروض اليوم» (اكتب نعم في عمود عروض اليوم)');
    if (!getCleanPhone(S['رقم الواتساب'])) bad.push('رقم الواتساب فاضي في الإعدادات — الطلبات مش هتتبعت');
    ['السلايدر', 'أقسام سريعة', 'البنرات', 'مجلة العروض'].forEach(n => rowsOf(n).forEach(r => { if (str(r['صورة']) && !/^https?:/.test(str(r['صورة']))) imgs.add(str(r['صورة'])); }));
    ['أيقونة الموقع', 'صورة الهيرو', 'صورة صفحة حول', 'صورة المنتج الافتراضية'].forEach(k => { if (str(S[k])) imgs.add(str(S[k])); });
    await Promise.all(Array.from(imgs).filter(u => /^[\w][\w.\-\/%]*$/.test(u)).map(u => fetch(u, { method: 'HEAD' }).then(r => { if (!r.ok) bad.push(`الصورة مش موجودة: ${u}`); }).catch(() => bad.push(`الصورة مش موجودة: ${u}`))));
    const li = (a, c) => a.length ? a.map(x => `<li style="color:${c};margin:4px 0">${esc(x)}</li>`).join('') : '<li style="color:#FF6200">✔ مفيش مشاكل</li>';
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl;font-family:Cairo,sans-serif';
    m.innerHTML = `<div style="background:#fff;color:#10141A;max-width:720px;width:100%;max-height:90vh;overflow:auto;border-radius:16px;padding:20px"><h2 style="margin:0 0 6px">🔎 فحص البيانات</h2><p style="margin:0 0 10px;opacity:.7">${allProducts.length} منتج • ${CATEGORIES.length} قسم • ${allOffers.length} في عروض اليوم</p><h3>❌ لازم تتصلح (${bad.length})</h3><ul>${li(bad, '#FF6200')}</ul><h3>⚠️ تنبيهات (${warn.length})</h3><ul>${li(warn, '#FF6200')}</ul><button style="padding:10px 22px;border:0;border-radius:10px;background:#FF6200;color:#fff;font:inherit;font-weight:800;cursor:pointer" data-x="close">إغلاق</button></div>`;
    m.querySelector('[data-x=close]').addEventListener('click', () => m.remove());
    document.body.appendChild(m);
    window.__tmCheck = { bad, warn };
}

function applySettings() {
    const name = str(S['اسم المتجر']) || 'ترولي ماركت';
    document.title = name;
    $('logo-name').textContent = name;
    $('logo-en').textContent = str(S['الاسم الإنجليزي']) || 'TROLLEY MARKET';
    document.documentElement.style.setProperty('--swap', (Math.max(2, num(S['مدة تبديل اسم المتجر بالثواني']) || 4) * 2) + 's');
    // الألوان من الإكسيل (أي لون ناقص أو غلط بيتجاهل ويفضل الافتراضي)
    const hex = (v) => { const m = /^#?([0-9a-f]{6})$/i.exec(str(v)); return m ? '#' + m[1] : null; };
    const root = document.documentElement.style;
    const primary = hex(S['اللون الرئيسي']), secondary = hex(S['اللون الثانوي']);
    const bg = hex(S['لون الخلفية']), card = hex(S['لون البطاقات']), txt = hex(S['لون النص']);
    if (primary) {
        root.setProperty('--primary', primary); root.setProperty('--primary-dark', shade(primary, -0.2));
        root.setProperty('--primary-dm', shade(primary, 0.2)); root.setProperty('--primary-dark-dm', primary);
        const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = primary;
    }
    if (secondary) {
        root.setProperty('--secondary', secondary); root.setProperty('--secondary-dark', shade(secondary, -0.25));
        root.setProperty('--secondary-dm', shade(secondary, 0.15)); root.setProperty('--secondary-dark-dm', secondary);
    }
    [['لون السطر الملوّن في الهيرو', '--hero-accent'], ['لون زر الهيرو 1', '--hero-btn1'], ['لون زر الهيرو 2', '--hero-btn2'], ['لون شارة الهيرو', '--hero-badge'],
     ['لون الشريط المتحرك', '--ticker-bg'], ['لون خصم المنتجات', '--disc'], ['لون زر السلة العائمة', '--fab'], ['لون أيقونات نقاط الثقة', '--trust-ic']]
        .forEach(([k, v]) => { const c = hex(S[k]); if (c) root.setProperty(v, c); });
    if (bg) root.setProperty('--bg-color', bg);
    if (card) root.setProperty('--card-bg', card);
    if (txt) root.setProperty('--text-color', txt);
    const ann = str(S['شريط إعلان']);
    if (ann) { const b = $('announce-bar'); b.textContent = ann; b.style.display = 'block'; }
    if (str(S['أيقونة الموقع'])) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = S['أيقونة الموقع'];
    }
}

function applyUI() {
    const labels = { home: 'اسم صفحة الرئيسية', categories: 'اسم صفحة الأقسام', catalog: 'اسم صفحة المجلة', about: 'اسم صفحة حول' };
    const show = { catalog: 'إظهار صفحة المجلة', about: 'إظهار صفحة حول', categories: 'إظهار صفحة الأقسام' };
    Object.keys(labels).forEach(pg => {
        const name = str(S[labels[pg]]);
        const hide = show[pg] && isNo(S[show[pg]]);
        if (hide) HIDDEN_PAGES.add(pg);
        $$(`[data-target="${pg}"]`).forEach(a => {
            if (hide) { a.style.display = 'none'; return; }
            if (!name) return;
            const tn = Array.from(a.childNodes).reverse().find(n => n.nodeType === 3);
            if (tn) tn.textContent = name; else a.textContent = name;
        });
    });
    if (str(S['اسم صفحة المجلة'])) $('catalog-title').textContent = ' ' + str(S['اسم صفحة المجلة']);
    if (ls.get('themeIdx') === null) {
        const t = str(S['المظهر الافتراضي']);

    }
    if (str(S['وصف الموقع'])) {
        let m = document.querySelector('meta[name="description"]');
        if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
        m.content = str(S['وصف الموقع']);
    }
    const ft = str(S['نص أسفل الموقع']);
    if (ft) { const f = $('site-footer'); f.innerHTML = esc(ft).replace(/\n/g, '<br>'); f.style.display = 'block'; }
    if (isYes(S['إظهار زر واتساب العائم']) && getCleanPhone(S['رقم واتساب التواصل'] || S['رقم الواتساب'])) {
        const w = $('wa-float'); w.href = 'https://wa.me/' + getCleanPhone(S['رقم واتساب التواصل'] || S['رقم الواتساب']) + '?text=' + encodeURIComponent(str(S['رسالة زر واتساب العائم']) || 'مرحباً، عندي استفسار');
        w.style.display = 'flex';
    }
}

/* ---------- التنقل (روابط # تدعم زر الرجوع) ---------- */
const PAGES = ['home', 'categories', 'catalog', 'about', 'orders'];
let currentRoute = 'home'; try { currentRoute = decodeURIComponent(location.hash.replace(/^#/, '')) || sessionStorage.getItem('tm_route') || 'home'; } catch (e) { } const HIDDEN_PAGES = new Set();
// التنقل بدون تغيير الرابط: الرابط يفضل نظيف (الدومين فقط) وزر الرجوع شغال
function goHref(href) {
    const h = decodeURIComponent(href.replace(/^#/, ''));
    if (h.startsWith('search=')) { toggleSearch(true); $('search-input').value = h.slice(7); performSearch(); }
    else navigate(h);
}
function navigate(r) {
    r = r.replace(/^#/, '');
    history.pushState({ r }, '', location.pathname + location.search);
    route(r);
}
function route(r) {
    if (r !== undefined) currentRoute = r;
    try { sessionStorage.setItem('tm_route', currentRoute); } catch (e) { }
    const parts = decodeURIComponent(currentRoute).split('/');
    const page = PAGES.includes(parts[0]) && !HIDDEN_PAGES.has(parts[0]) ? parts[0] : 'home';
    const sub = parts.slice(1).join('/');
    $$('.page-view').forEach(el => el.style.display = 'none');
    $('page-' + page).style.display = 'block';
    $$('.nav-links a, .mobile-top-nav a').forEach(a => a.classList.toggle('active', a.dataset.target === page));
    if (page === 'categories') renderCategories(sub || 'الكل');
    if (page === 'orders') renderOrdersPage();
    closeOverlays();
    if (page === 'home' && sub === 'offers' && $('today-offers')) $('today-offers').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------- أدوات الحركة ---------- */
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function animateScroll(el, dx, dur, done) {
    const id = el._anim = (el._anim || 0) + 1; const start = el.scrollLeft; let t0;
    el.classList.add('anim');
    const tick = (ts) => {
        if (el._anim !== id) return;               // اتلغت (المستخدم لمس السلايدر)
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        el.scrollLeft = start + dx * easeIO(p);
        if (p < 1) requestAnimationFrame(tick); else { el.classList.remove('anim'); if (done) done(); }
    };
    requestAnimationFrame(tick);
}
const cancelAnim = (el) => { el._anim = (el._anim || 0) + 1; el.classList.remove('anim'); };

/* ---------- السلايدر: scroll-snap طبيعي + تشغيل تلقائي بسيط (من غير نسخ ولا قفزات) ---------- */
function buildSlider() {
    const wrap = $('slider-wrap'), el = $('main-swipe-slider');
    const N = sliderData.length;
    if (!N) { wrap.style.display = 'none'; return; }
    el.innerHTML = sliderData.map((s, i) => {
        const type = str(s['نوع الاستهداف']) || 'قسم', cat = str(s['القسم_المستهدف']), href = targetHref(type, cat);
        const ov = ovHTML(str(s['العنوان']), str(s['العنوان الفرعي']), str(s['نص الزر']));
        const badge = ov || ((cat && type === 'قسم' && !isNo(S['إظهار اسم القسم على السلايدر'])) ? `<div class="glass-badge">${esc(cat)}</div>` : '');
        return `<div class="slide-item" data-i="${i}"${href ? ` data-href="${esc(href)}"` : ''}><img src="${esc(s['صورة'])}" alt="${esc(s['الاسم'] || '')}" draggable="false" decoding="async">${badge}</div>`;
    }).join('');
    $('slider-dots').innerHTML = N > 1 ? sliderData.map((_, i) => `<button data-dot="${i}" aria-label="شريحة ${i + 1}"></button>`).join('') : '';
    $$('.slider-arrow').forEach(b => b.style.display = N > 1 ? '' : 'none');
    if (N < 2) return;

    const gen = window.__slGen = (window.__slGen || 0) + 1;
    const kids = () => Array.from(el.children);
    const delta = (c) => { const r = c.getBoundingClientRect(), b = el.getBoundingClientRect(); return (r.left + r.width / 2) - (b.left + b.width / 2); };
    const nearest = () => kids().reduce((best, c) => Math.abs(delta(c)) < Math.abs(delta(best)) ? c : best, el.children[0]);
    const goTo = (c, smooth = true) => { if (!c) return; if (smooth) animateScroll(el, delta(c), 650); else el.scrollBy({ left: delta(c), behavior: 'auto' }); };
    const setDots = () => { const i = +nearest().dataset.i; $$('#slider-dots button').forEach((d, k) => d.classList.toggle('active', k === i)); };
    let pauseUntil = 0, rafT = 0, dragging = false, startX = 0, startScroll = 0, moved = 0;

    el.addEventListener('scroll', () => { if (!rafT) rafT = requestAnimationFrame(() => { rafT = 0; setDots(); }); }, { passive: true });
    el.addEventListener('touchstart', () => { cancelAnim(el); pauseUntil = Date.now() + 2500; }, { passive: true });
    el.addEventListener('touchend', () => { pauseUntil = Date.now() + 2500; }, { passive: true });

    /* سحب بالماوس (الكمبيوتر) */
    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        dragging = true; moved = 0; startX = e.clientX; startScroll = el.scrollLeft; pauseUntil = Date.now() + 2500;
        el.classList.add('dragging');
    });
    window.addEventListener('mousemove', (e) => {
        if (window.__slGen !== gen || !dragging) return;
        const dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx)); el.scrollLeft = startScroll - dx;
    });
    window.addEventListener('mouseup', () => {
        if (window.__slGen !== gen || !dragging) return;
        dragging = false; el.classList.remove('dragging'); goTo(nearest());
    });
    el.addEventListener('click', (e) => { if (moved > 5) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);

    /* الأسهم والنقاط */
    const step = (dir) => {
        const c = nearest(), n = dir > 0 ? (c.nextElementSibling || el.children[0]) : (c.previousElementSibling || el.lastElementChild);
        goTo(n);
    };
    $$('.slider-arrow').forEach(b => b.addEventListener('click', () => { pauseUntil = Date.now() + 2500; step(b.dataset.slider === 'next' ? 1 : -1); }));
    $('slider-dots').addEventListener('click', (e) => {
        const d = e.target.closest('[data-dot]'); if (!d) return;
        pauseUntil = Date.now() + 2500; goTo(el.children[+d.dataset.dot]);
    });

    /* تشغيل تلقائي */
    const inView = () => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    const every = Math.max(2, num(S['مدة الانتقال بالثواني']) || 3) * 1000;
    if (window.__sliderTimer) clearInterval(window.__sliderTimer);
    if (!isNo(S['تشغيل السلايدر تلقائياً'])) window.__sliderTimer = setInterval(() => {
        if (document.hidden || !inView() || dragging || Date.now() < pauseUntil || wrap.offsetParent === null) return;
        step(1);
    }, every);

    let lastW = el.clientWidth, rt;
    window.addEventListener('resize', () => { if (window.__slGen !== gen) return; clearTimeout(rt); rt = setTimeout(() => { if (el.clientWidth !== lastW) { lastW = el.clientWidth; goTo(nearest(), false); } }, 150); });
    setDots();
}

/* ---------- أقسام سريعة: تلف بلا نهاية وتتحكم فيها من الإكسيل ---------- */
function renderQuickLinks() {
    const c = $('quick-links-container');
    if (!quickLinksData.length) { $('quick-wrap').style.display = 'none'; return; }
    const one = quickLinksData.map(item => {
        const href = targetHref(item['نوع الاستهداف'], item['القسم_المستهدف']);
        const off = (window.TM_DISABLED || []).includes(str(item['القسم_المستهدف']));
        return `<a class="quick-link-item${off ? ' off' : ''}" ${href ? `href="${esc(href)}"` : ''}><div class="quick-link-square"><img src="${esc(item['صورة'])}" alt="" draggable="false"></div><div class="quick-link-text">${esc(item['الاسم'])}</div>${off ? '<em class="ql-off">غير متوفر حاليًا</em>' : ''}</a>`;
    }).join('');
    c.classList.remove('ql-marquee');
    if (isNo(S['تحريك الأقسام السريعة'])) { c.innerHTML = one; return; }   // من الإعدادات: بدون لف تلقائي (سحب عادي)
    /* لف بلا نهاية بـ CSS فقط (من غير JS كل فريم) */
    c.innerHTML = `<div class="ql-track">${one}</div>`;
    const track = c.firstChild;
    requestAnimationFrame(() => {
        const set = track.scrollWidth; if (!set) return;
        const k = Math.max(1, Math.ceil((c.clientWidth || 360) / set));
        track.innerHTML = one.repeat(k * 2);
        const half = track.scrollWidth / 2;
        c.classList.add('ql-marquee');
        if (c.__qlStop) c.__qlStop();
        const ac = new AbortController(); const sg = { signal: ac.signal };
        /* لف تلقائي بسيط، تقدر تسحبه بإيدك، ويكمّل لوحده بعد ما تسيبه */
        let pos = 0, last = 0, hold = false, timer = 0, raf = 0, dead = false;
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pause = () => { hold = true; clearTimeout(timer); };
        const resume = (ms) => { clearTimeout(timer); timer = setTimeout(() => { pos = c.scrollLeft; hold = false; }, ms); };
        const onUser = () => { pos = c.scrollLeft; if (pos >= half) { pos -= half; c.scrollLeft = pos; } };
        c.addEventListener('touchstart', pause, { passive: true, signal: ac.signal });
        c.addEventListener('touchend', () => resume(2500), { passive: true, signal: ac.signal });
        c.addEventListener('touchcancel', () => resume(2500), { passive: true, signal: ac.signal });
        c.addEventListener('pointerdown', pause, sg);
        c.addEventListener('pointerup', () => resume(2500), sg);
        c.addEventListener('wheel', () => { pause(); resume(2500); }, { passive: true, signal: ac.signal });
        c.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) pause(); }, sg);
        c.addEventListener('mouseleave', () => resume(800), sg);
        c.addEventListener('scroll', () => { if (hold) onUser(); }, { passive: true, signal: ac.signal });
        const tick = (t) => {
            if (dead || !c.isConnected) return;
            const dt = Math.min(64, t - (last || t)); last = t;
            if (!hold && !reduce && (() => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })() && !document.hidden) {
                pos += dt * 0.04;                 // ~40px في الثانية
                if (pos >= half) pos -= half;
                c.scrollLeft = pos;
            }
            raf = requestAnimationFrame(tick);
        };
        c.__qlStop = () => { dead = true; cancelAnimationFrame(raf); ac.abort(); };
        raf = requestAnimationFrame(tick);
    });
}

/* ---------- البنرات ---------- */
function targetHref(type, value) {
    value = str(value); type = str(type) || 'قسم';
    if (!value) return null;
    if (type === 'قسم') return value === 'عروض اليوم' ? '#home/offers' : catHref(value);
    if (type === 'منتج') return '#search=' + encodeURIComponent(value);
    return null;
}
const ovHTML = (t, s2, b) => (t || s2 || b) ? `<div class="ban-ov">${t ? `<b>${esc(t)}</b>` : ''}${s2 ? `<span>${esc(s2)}</span>` : ''}${b ? `<em>${esc(b)}</em>` : ''}</div>` : '';
function applyBanners() {
    [['رئيسي_علوي', 'banner-top', 'sec-banner-top'], ['مقسم_يمين', 'banner-split1'], ['مقسم_يسار', 'banner-split2'], ['مقسم_يمين_2', 'banner-split3'], ['مقسم_يسار_2', 'banner-split4'], ['رئيسي_ثابت', 'banner-main', 'sec-banner-main']].forEach(([key, id, sec]) => {
        const a = $(id), b = bannersData[key], holder = sec ? $(sec) : a.parentElement;
        if (key === 'رئيسي_ثابت' && isNo(S['إظهار البنر السفلي'])) { holder.style.display = 'none'; return; }
        if (!b || (!b.img && !b.title) || (window.__tmAlive && !window.__tmAlive(b.type, b.value))) { holder.style.display = 'none'; return; }
        if (b.img) { a.querySelector('img').src = b.img; a.insertAdjacentHTML('beforeend', ovHTML(b.title, b.sub, b.btn)); }
        else { a.innerHTML = `<div class="ban-text">${ovHTML(b.title, b.sub, b.btn)}</div>`; a.classList.add('ban-plain'); }
        let href = targetHref(b.type, b.value);
        if (!href && !b.img && getCleanPhone(S['رقم الواتساب'])) href = 'https://wa.me/' + getCleanPhone(S['رقم الواتساب']);
        if (href) { a.setAttribute('href', href); a.style.cursor = 'pointer'; if (/^https?:/.test(href)) a.setAttribute('target', '_blank'); }
    });
    const okB = (k) => bannersData[k] && (!window.__tmAlive || window.__tmAlive(bannersData[k].type, bannersData[k].value));
    if (!['مقسم_يمين', 'مقسم_يسار', 'مقسم_يمين_2', 'مقسم_يسار_2'].some(okB)) $('sec-banner-split').style.display = 'none';
}

/* ---------- المجلة ---------- */
const parseBundleNames = (r) => str(r['المنتجات']).split(/[,،\n]+/).map(x => x.trim()).filter(Boolean).map(x => { const m2 = x.match(/^(.*?)\s*[x×*:]\s*(\d+)$/i); return m2 ? m2[1].trim() : x; });
function parseBundle(r) {
    const items = str(r['المنتجات']).split(/[,،\n]+/).map(x => x.trim()).filter(Boolean).map(x => { const m2 = x.match(/^(.*?)\s*[x×*:]\s*(\d+)$/i); return m2 ? { name: m2[1].trim(), qty: +m2[2] } : { name: x, qty: 1 }; });
    let old = 0, ok = items.length > 0;
    items.forEach(it => { const p = allProducts.find(z => str(z['الاسم']) === it.name); if (!p || p.soldOut) ok = false; else { it.price = priceInfo(p).price; old += it.price * it.qty; } });
    return { name: str(r['الباقة']), desc: str(r['وصف']), items, old, price: num(r['سعر الباقة']), ok };
}
function bundlesHTML() {
    if (isNo(S['إظهار باقات العروض']) || !bundlesData.length) return '';
    const c = esc(cur());
    return `<section class="bundles"><div class="section-header sh-offer" data-pt="1"><i class="fas fa-gift fx-cico-i"></i><h3>باقات العروض</h3></div><div class="bundles-grid">${bundlesData.map((r, i) => { const b = parseBundle(r), save = Math.round(b.old - b.price);
        return `<article class="bundle"><div class="bundle-top"><h3>${esc(b.name)}</h3>${save > 0 ? `<span class="bundle-save">وفّر ${fmt(save)} ${c}</span>` : ''}</div>${b.desc ? `<p class="bundle-desc">${esc(b.desc)}</p>` : ''}<ul>${b.items.map(it => `<li><span>${esc(it.name)}</span><b>× ${it.qty}</b></li>`).join('')}</ul><div class="bundle-foot"><div>${save > 0 ? `<s>${fmt(b.old)} ${c}</s>` : ''}<strong>${fmt(b.price)} ${c}</strong></div><button class="bundle-add" data-bundle="${i}" ${b.ok ? '' : 'disabled'}>${b.ok ? 'أضف الباقة للسلة' : 'غير متاحة حالياً'}</button></div></article>`; }).join('')}</div></section>`;
}
document.addEventListener('click', (e) => {
    const bt = e.target.closest('.bundle-add'); if (!bt) return;
    const b = parseBundle(bundlesData[+bt.dataset.bundle]); if (!b.ok) return;
    const inc = b.items.map(it => it.name + '×' + it.qty).join('، '), base = /^باقة/.test(b.name) ? b.name : 'باقة ' + b.name, key = cartKey(base, inc), ex = cart.find(x => x.key === key);
    if (ex) ex.qty = Math.min(99, ex.qty + 1); else cart.push({ key, base, variant: inc, name: `${base} (${inc})`, price: b.price, qty: 1 });
    saveCart(); updateCartUI(); toast('✓ تمت إضافة الباقة للسلة');
});
function renderCatalog() {
    const c = $('catalog-pages-container'), bh = bundlesHTML();
    if (!catalogData.length) { c.innerHTML = bh || '<p>لا توجد صور في مجلة العروض حالياً.</p>'; return; }
    const rows = catalogData.slice().sort((a, b) => num(a['رقم_الصفحة']) - num(b['رقم_الصفحة']));
    c.innerHTML = `<div class="mag2">
        <div class="section-header sh-offer" data-pt="1"><i class="fas fa-tags fx-cico-i"></i><h3>${esc(str(S['اسم صفحة المجلة']) || 'العروض')}</h3></div>
        <div class="mag-stack">${rows.map((p, i) => `<figure class="mag2-page"><img src="${esc(p['صورة'])}" alt="صفحة ${i + 1}" data-action="lightbox" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"></figure>`).join('')}</div>
    </div>` + bh;
}

/* ---------- صفحة حول ---------- */
function applyAboutSettings() {
    const name = str(S['اسم المتجر']) || 'ترولي ماركت';
    $('about-title').textContent = name;
    $('about-main-img').src = str(S['صورة صفحة حول']) || PLACEHOLDER;
    $('about-desc-1').textContent = str(S['وصف صفحة حول 1']) || 'كل طلبات البيت لحد البيت.';
    $('about-desc-2').innerHTML = esc(str(S['مساحة حرة للوصف'])).replace(/\n/g, '<br>');

    const info = [];
    if (str(S['ساعات العمل'])) info.push(`<div><i class="fas fa-clock"></i> ${esc(S['ساعات العمل'])}</div>`);
    if (str(S['العنوان'])) info.push(`<div><i class="fas fa-location-dot"></i> ${esc(S['العنوان'])}</div>`);
    if (num(S['رسوم التوصيل'])) info.push(`<div>${ICON_SCOOTER} رسوم التوصيل ${fmt(num(S['رسوم التوصيل']))} ${esc(cur())}${num(S['حد التوصيل المجاني']) ? ` — مجاناً للطلبات فوق ${fmt(num(S['حد التوصيل المجاني']))} ${esc(cur())}` : ''}</div>`);
    if (info.length) { $('info-glass').innerHTML = info.join(''); $('info-glass').style.display = 'flex'; }

    const phone = getCleanPhone(S['رقم واتساب التواصل'] || S['رقم الواتساب']);
    const card = (cardId, titleId, icon, title, imgId, img) => {
        $(titleId).innerHTML = `<i class="${icon}"></i> ${esc(title)}`;
        $(imgId).src = str(img) || PLACEHOLDER;
        if (!str(img)) $(imgId).style.display = 'none';
    };
    card('card-channel', 'qr-channel-title', 'fab fa-whatsapp', str(S['عنوان كيو آر قناة العروض']) || 'قناة العروض', 'qr-channel-img', S['صورة كيو آر قناة العروض']);
    const ch = safeUrl(S['رابط قناة العروض']);
    $('channel-link').href = ch || '#'; $('channel-link').textContent = str(S['نص زر قناة العروض']) || 'الانتقال إلى القناة';
    if (!ch) $('card-channel').style.display = 'none';

    card('card-web', 'qr-web-title', 'fas fa-globe', str(S['عنوان كيو آر الموقع']) || 'موقعنا الإلكتروني', 'qr-website-img', S['صورة كيو آر الموقع']);
    $('website-btn').innerHTML = `<i class="fas fa-share-alt"></i> ${esc(str(S['نص زر الموقع']) || 'مشاركة الموقع')}`;

    card('card-contact', 'qr-contact-title', 'fab fa-whatsapp', str(S['عنوان كيو آر التواصل']) || 'تواصل معنا', 'qr-whatsapp-img', S['صورة كيو آر التواصل']);
    if (phone) $('wa-link').href = 'https://wa.me/' + phone; else $('card-contact').style.display = 'none'; $('wa-link').textContent = str(S['نص زر التواصل']) || 'تواصل معنا';

    const social = (id, v) => { const a = $(id), u = safeUrl(v); if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; } else a.style.display = 'none'; };
    social('fb-link', S['رابط فيسبوك']); social('ig-link', S['رابط إنستجرام']); social('tt-link', S['رابط تيك توك']);
    social('yt-link', S['رابط يوتيوب']); social('tg-link', S['رابط تيليجرام']); social('x-link', S['رابط تويتر']); social('map-link', S['رابط الخريطة']);
    if (phone) $('wa-social-link').href = 'https://wa.me/' + phone; else $('wa-social-link').style.display = 'none';
}
async function shareWebsite() {
    const url = str(S['رابط الموقع']) || location.href.split('#')[0];
    if (navigator.share) { try { await navigator.share({ title: str(S['اسم المتجر']) || 'ترولي ماركت', url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } catch (e) { prompt('انسخ الرابط:', url); }
}

/* ---------- المنتجات ---------- */
function priceInfo(p) {
    const oldP = num(p['السعر الأساسي']); const newP = num(p['السعر بعد الخصم']);
    const hasOffer = newP > 0 && oldP > newP;
    return { oldP, newP, hasOffer, price: hasOffer ? newP : (oldP || newP), pct: hasOffer ? Math.round((oldP - newP) / oldP * 100) : 0 };
}
const CAT_PALETTE = ['#FF6200', '#FF6200', '#FF6200', '#FF6200'];
function catColorOf(p) {
    const cat = str(p['القسم']) || str((allProducts.find(x => str(x['الاسم']) === str(p['الاسم'])) || {})['القسم']);
    const m = catMeta[cat] || {};
    if (/^#[0-9a-f]{3,8}$/i.test(m.color || '')) return m.color;
    const i = CATEGORIES.indexOf(cat);
    return i < 0 ? '' : CAT_PALETTE[i % CAT_PALETTE.length];
}
function productHTML(p) {
    const { oldP, hasOffer, price, pct } = priceInfo(p);
    const c = esc(cur());
    const priceHTML = hasOffer ? `<span class="new-price">${fmt(price)} ${c}</span> <span class="old-price">${fmt(oldP)} ${c}</span>` : `<span class="new-price">${fmt(price)} ${c}</span>`;
    const variants = str(p['الأنواع']).split(/[,،]/).map(v => v.trim()).filter(Boolean);
    const variantHTML = variants.length ? `<div class="custom-select-wrapper"><div class="custom-select-display"><span>${esc(variants[0])}</span></div><div class="custom-select-options">${variants.map(v => `<div class="custom-option" data-v="${esc(v)}">${esc(v)}</div>`).join('')}</div></div>` : '';
    const sold = !!p.soldOut;
    const badge = (hasOffer ? `<div class="discount-badge">خصم ${pct}%</div>` : '') + (str(p['شارة']) ? `<div class="discount-badge tag-badge${hasOffer ? '' : ' tag-solo'}">${esc(p['شارة'])}</div>` : '');
    const cc = catColorOf(p);
    const inCart = cart.some(i => i.base === str(p['الاسم']));
    return `<div class="product-card${sold ? ' sold-out' : ''}${inCart ? ' in-cart' : ''}"${cc ? ` style="--cc:${esc(cc)}"` : ''} data-name="${esc(p['الاسم'])}" data-price="${price}" data-variant="${esc(variants[0] || '')}"><div class="pimg">${badge}<div class="in-cart-badge"><i class="fas fa-check"></i> مضاف</div><img src="${esc(str(p['صورة']) || str(S['صورة المنتج الافتراضية']) || (window.tmFallbackSrc && window.tmFallbackSrc(p['الاسم'], p['القسم'])) || PLACEHOLDER)}" class="product-img" alt="${esc(p['الاسم'])}" loading="lazy" decoding="async"></div><div class="product-title">${esc(p['الاسم'])}</div>${variantHTML}<div class="price-container">${priceHTML} / ${esc(p['الوحدة'] || 'وحدة')}</div><div class="card-actions"><div class="qty-controls"><button class="qty-btn" data-q="1" aria-label="زيادة">+</button><input type="number" class="qty-input" value="1" readonly><button class="qty-btn" data-q="-1" aria-label="نقص">-</button></div><button class="add-to-cart-btn"${sold ? ' disabled' : ''}>${sold ? 'غير متوفر' : esc(str(S['نص زر إضافة للسلة']) || 'إضافة للسلة')}</button></div></div>`;
}
const gridHTML = (list) => `<div class="products-grid">${list.map(productHTML).join('')}</div>`;
function sorted(list) {
    const l = list.slice();
    if (sortMode === 'asc') l.sort((a, b) => priceInfo(a).price - priceInfo(b).price);
    else if (sortMode === 'desc') l.sort((a, b) => priceInfo(b).price - priceInfo(a).price);
    else if (sortMode === 'disc') l.sort((a, b) => priceInfo(b).pct - priceInfo(a).pct);
    return l;
}
function renderTodayOffers() {
    $('home-sections').innerHTML = allOffers.length ? `<div class="section-header" id="today-offers"><h3>${esc(str(S['عنوان قسم العروض']) || 'عروض اليوم')}</h3></div>${gridHTML(allOffers)}` : '';
}
const catLabel = (c) => str((catMeta[c] || {}).label) || c;
function initCategoryFilterBar() {
    $('category-filter-bar').innerHTML = ['الكل', ...CATEGORIES].map(c => `<a class="cat-filter-btn" href="${catHref(c)}" data-cat="${esc(c)}">${esc(catLabel(c))}</a>`).join('');
}
let fillObs = null;
function renderCategories(selected) {
    if (selected !== 'الكل' && !CATEGORIES.includes(selected)) selected = 'الكل';
    $$('.cat-filter-btn').forEach(b => {
        const on = b.dataset.cat === selected; b.classList.toggle('active', on);
        if (on) b.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
    const box = $('categories-sections'); box.innerHTML = '';
    if (selected === 'الكل') box.innerHTML = '<div class="section-header sh-offer sh-all" data-pt="1"><i class="fas fa-border-all fx-cico-i"></i><h3>الكل</h3></div>';
    if (fillObs) fillObs.disconnect();
    const queues = [];
    (selected === 'الكل' ? CATEGORIES : [selected]).forEach(cat => {
        const items = sorted(allProducts.filter(p => p['القسم'] === cat)); if (!items.length) return;
        const sec = document.createElement('div'); sec.className = 'category-section';
        sec.innerHTML = `<div class="section-header" data-cat="${esc(cat)}"><h3>${esc(catLabel(cat))}</h3></div><div class="products-grid"></div>`;
        queues.push({ sec, grid: sec.lastElementChild, items, i: 0 });
    });
    const sentinel = document.createElement('div'); sentinel.className = 'sentinel'; box.appendChild(sentinel);
    // عرض المنتجات على دفعات عشان الموقع يفضل خفيف مهما كان عدد المنتجات
    const fill = (n) => {
        for (const q of queues) {
            if (n <= 0) break;
            if (q.i >= q.items.length) continue;
            if (q.i === 0) box.insertBefore(q.sec, sentinel);
            const chunk = q.items.slice(q.i, q.i + n);
            q.grid.insertAdjacentHTML('beforeend', chunk.map(productHTML).join(''));
            q.i += chunk.length; n -= chunk.length;
        }
        return queues.some(q => q.i < q.items.length);
    };
    if (!fill(24)) return;
    if (!('IntersectionObserver' in window)) { fill(1e6); return; }
    fillObs = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        if (fill(24)) { fillObs.unobserve(sentinel); fillObs.observe(sentinel); } else fillObs.disconnect();
    }, { rootMargin: '900px' });
    fillObs.observe(sentinel);
}

/* ---------- البحث ---------- */
let searchT;
function toggleSearch(force) {
    const m = $('search-modal');
    const open = force === undefined ? !m.classList.contains('open') : force;
    m.classList.toggle('open', open);
    if (open) { $('search-input').focus(); }
    else { $('search-input').value = ''; $('search-results').innerHTML = ''; }
}
function performSearch() {
    const q = norm($('search-input').value); const box = $('search-results');
    if (!q) { box.innerHTML = ''; return; }
    const words = q.split(/\s+/).filter(Boolean);
    if (!window.__sIdx || window.__sIdxN !== allProducts.length) { window.__sIdx = allProducts.map(p => ({ p, hay: norm(`${p['الاسم']} ${p['القسم']} ${p['الأنواع'] || ''}`) })); window.__sIdxN = allProducts.length; }
    const results = window.__sIdx.filter(e => words.every(w => e.hay.includes(w))).map(e => e.p);
    if (results.length) {
        box.innerHTML = `<div class="search-count">${results.length} نتيجة${results.length > 60 ? ' — اكتب كلمة أدق لتضييق النتائج' : ''}</div>` + gridHTML(results.slice(0, 60));
    } else {
        const raw = $('search-input').value.trim();
        const msg = encodeURIComponent(`طلب خاص: أحتاج إلى شراء (${raw})`);
        box.innerHTML = `<div style="text-align:center;padding:40px 20px;"><h3 style="color:var(--primary);">المنتج غير متوفر</h3><a href="https://wa.me/${getCleanPhone(S['رقم واتساب التواصل'] || S['رقم الواتساب'])}?text=${msg}" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;width:auto;margin-top:15px;">طلب خاص عبر الواتساب</a></div>`;
    }
}

/* ---------- السلة ---------- */
let cart = [];
try {
    const raw = JSON.parse(ls.get('cart_v2'));
    cart = (Array.isArray(raw) ? raw : []).filter(i => i && typeof i.name === 'string' && typeof i.key === 'string' && Number.isFinite(+i.price) && +i.price >= 0 && Number.isInteger(+i.qty) && +i.qty >= 1)
        .slice(0, 100).map(i => ({ key: String(i.key).slice(0, 200), base: String(i.base || i.name).slice(0, 200), variant: String(i.variant || '').slice(0, 100), name: i.name.slice(0, 250), price: +i.price, qty: Math.min(99, +i.qty) }));
} catch (e) { cart = []; }
const saveCart = () => ls.set('cart_v2', JSON.stringify(cart));
const cartKey = (name, variant) => name + '||' + variant;
function markInCart() {
    const names = new Set(cart.map(i => i.base));
    $$('.product-card').forEach(c => c.classList.toggle('in-cart', names.has(c.dataset.name)));
}
function addedPop(card) {
    markInCart();
    card.classList.add('just-added'); setTimeout(() => card.classList.remove('just-added'), 700);
}
function addToCart(card) {
    const name = card.dataset.name, variant = card.dataset.variant || '';
    const input = card.querySelector('.qty-input'); const qty = Math.max(1, Math.min(99, parseInt(input.value) || 1));
    const key = cartKey(name, variant); const ex = cart.find(i => i.key === key);
    if (ex) ex.qty = Math.min(99, ex.qty + qty); else cart.push({ key, base: name, variant, name: variant ? `${name} (${variant})` : name, price: num(card.dataset.price), qty });
    input.value = 1; saveCart(); updateCartUI(); addedPop(card);
}
function totals() {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const fee = num(S['رسوم التوصيل']), free = num(S['حد التوصيل المجاني']), min = num(S['الحد الأدنى للطلب']);
    const delivery = (!cart.length || !fee || (free && sub >= free)) ? 0 : fee;
    return { sub, delivery, total: sub + delivery, min, fee, free };
}
function updateCartUI() {
    try { markInCart(); } catch (e) {}
    $('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);
    const c = esc(cur()); const box = $('cart-items');
    box.innerHTML = cart.length ? cart.map((i, idx) => `<div class="cart-item"><div class="ci-info"><strong>${esc(i.name)}</strong><small>${fmt(i.price)} ${c}</small></div><div class="ci-side"><div class="ci-qty"><button data-ci="inc" data-idx="${idx}" aria-label="زيادة">+</button><span>${i.qty}</span><button data-ci="dec" data-idx="${idx}" aria-label="نقص">-</button></div><strong>${fmt(i.price * i.qty)} ${c}</strong><button class="ci-rm" data-ci="rm" data-idx="${idx}" aria-label="حذف"><i class="fas fa-xmark"></i></button></div></div>`).join('') : '<p class="cart-empty">السلة فارغة</p>';
    const t = totals();
    let sum = '';
    if (t.fee && cart.length) sum += `<div><span>التوصيل</span><b>${t.delivery ? fmt(t.delivery) + ' ' + c : 'مجاني '}</b></div>`;
    sum += `<div class="grand"><span>الإجمالي</span><b>${fmt(t.total)} ${c}</b></div>`;
    $('cart-summary').innerHTML = sum;
    const w = $('cart-warn'); w.textContent = ''; w.classList.remove('block');
    const prog = $('cart-progress');
    if (prog) {
        const money = (v) => `${fmt(v)} ${cur()}`, msg = (k, d, v) => str(S[k] || d).replace(/\{(\w+)\}/g, (m, x) => v[x] !== undefined ? v[x] : m);
        let h = '';
        if (cart.length && t.min && t.sub < t.min) h += `<div class="cp cp-min"><span><i class="fas fa-triangle-exclamation"></i> ${esc(msg('رسالة الحد الأدنى', 'الحد الأدنى للطلب {MIN} — فاضل {X}', { MIN: money(t.min), X: money(t.min - t.sub) }))}</span><div class="cp-bar"><i style="width:${Math.min(100, t.sub / t.min * 100)}%"></i></div></div>`;
        if (cart.length && t.fee && t.free) h += t.sub >= t.free
            ? `<div class="cp cp-ok"><span><i class="fas fa-circle-check"></i> ${esc(msg('رسالة تم التوصيل المجاني', 'توصيلك مجاني!', {}))}</span><div class="cp-bar"><i style="width:100%"></i></div></div>`
            : `<div class="cp cp-free"><span>${ICON_SCOOTER} ${esc(msg('رسالة التوصيل المجاني', 'فاضل {X} وتوصل لحد التوصيل المجاني', { X: money(t.free - t.sub) }))}</span><div class="cp-bar"><i style="width:${Math.min(100, t.sub / t.free * 100)}%"></i></div></div>`;
        prog.innerHTML = h;
    }
}

/* ---------- حساب الزائر (اسم + رقم موبايل بس، محفوظ على جهازه) ---------- */
const ACC_KEY = 'tm_user', HIST_KEY = 'tm_orders';
const accountsOn = () => !isNo(S['تفعيل حساب الزائر']);
const getUser = () => { try { const u = JSON.parse(ls.get(ACC_KEY)); return u && u.phone ? u : null; } catch (e) { return null; } };
const getHist = () => { try { const h = JSON.parse(ls.get(HIST_KEY)); return Array.isArray(h) ? h : []; } catch (e) { return []; } };
const digits = (v) => str(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
const validPhone = (p) => /^\d{10,15}$/.test(p) && (!p.startsWith('01') || p.length === 11);
function postToSheet(payload) {
    const url = getOrderApiUrl(); if (!url) return;
    try { fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {}); } catch (e) { }
}
function syncAccountUI() {
    const b = $('acct-btn'); if (!b) return;
    if (!accountsOn()) { b.style.display = 'none'; return; }
    const u = getUser();
    $('acct-label').textContent = u ? (u.name.split(' ')[0] || 'حسابي') : 'حسابي';
    b.classList.toggle('logged', !!u);
}
function setCustomerFields(u) {
    if (!u) return;
    const set = (id, k, v) => { if (v && !$(id).value) { $(id).value = v; ls.set(k, v); } };
    set('cust-name', 'cust_name', u.name); set('cust-phone', 'cust_phone', u.phone);
}
function saveUser(name, phone, silent) {
    const old = getUser();
    const u = { name, phone, since: (old && old.phone === phone && old.since) || new Date().toISOString() };
    ls.set(ACC_KEY, JSON.stringify(u));
    $('cust-name').value = name; $('cust-phone').value = phone; ls.set('cust_name', name); ls.set('cust_phone', phone);
    syncAccountUI();
    if (!old || old.phone !== phone || old.name !== name) postToSheet({ type: 'account', name, phone, address: ls.get('cust_address') || '', ts: new Date().toISOString() });
    if (!silent) toast('تم حفظ حسابك');
}
function renderAccount(mode) {
    const u = getUser(), box = $('acct-body');
    if (!u || mode === 'edit') {
        box.innerHTML = `<h3>${u ? 'تعديل بياناتك' : 'إنشاء حساب'}</h3><p class="acct-note">اسمك ورقم موبايلك بس — من غير كلمة سر. بنستخدمهم عشان نملّى بيانات طلبك لوحدها ونجمع طلباتك مع بعض.</p>
        <input type="text" id="acct-name" placeholder="الاسم" value="${esc(u ? u.name : '')}" autocomplete="name">
        <input type="tel" id="acct-phone" placeholder="رقم الموبايل" value="${esc(u ? u.phone : '')}" autocomplete="tel" inputmode="tel">
        <input type="text" id="acct-address" placeholder="العنوان (اختياري)" value="${esc(ls.get('cust_address') || '')}" autocomplete="street-address">
        <div class="acct-err" id="acct-err"></div>
        <p style="margin:8px 0 0;font-size:.78rem;opacity:.7;text-align:center">بنحفظ اسمك وموبايلك وعنوانك علشان نجهّز طلباتك بس.</p>
        <button class="btn-primary acct-main" data-action="acct-save">${u ? 'حفظ' : 'إنشاء الحساب'}</button>${u ? '<button class="acct-link" data-action="acct-back">رجوع</button>' : ''}`;
        return;
    }
    const hist = getHist().filter(h => h.phone === u.phone), c = esc(cur());
    box.innerHTML = `<div class="acct-hello"><i class="fas fa-circle-user"></i><div><h3>أهلاً ${esc(u.name)}</h3></div></div>
        <div class="acct-info"><div><span>الاسم</span><b>${esc(u.name)}</b></div><div><span>رقم الموبايل</span><b dir="ltr">${esc(u.phone)}</b></div><div><span>العنوان</span><b>${ls.get('cust_address') ? esc(ls.get('cust_address')) : '<em class="acct-none">لم يُضف بعد — اضغط «تعديل بياناتي»</em>'}</b></div></div>
        <div class="acct-actions col"><a class="acct-orders-btn" href="#orders" data-action="acct-orders"><i class="fas fa-clock-rotate-left"></i> طلباتي السابقة على هذا الجهاز (${hist.length})</a><button class="acct-link" data-action="acct-edit">تعديل بياناتي</button><button class="acct-link danger" data-action="acct-logout">تسجيل خروج</button><button class="acct-link danger" data-action="acct-wipe">مسح بياناتي من الجهاز</button></div>`;
}
function toggleAccount(force) {
    const m = $('acct-modal'); if (!m) return;
    const open = force === undefined ? !m.classList.contains('open') : force;
    if (open) { toggleCart(false); renderAccount(); }
    m.classList.toggle('open', open); $('overlay').classList.toggle('show', open || $('cart-sidebar').classList.contains('open'));
}
function submitAccount() {
    const name = str($('acct-name').value), phone = digits($('acct-phone').value), err = $('acct-err');
    if (!name) { err.textContent = 'اكتب اسمك'; return; }
    if (!validPhone(phone)) { err.textContent = 'رقم الموبايل مش مظبوط (مثال: 01012345678)'; return; }
    const adEl = $('acct-address'); if (adEl) { const ad = str(adEl.value); ls.set('cust_address', ad); $('cust-address').value = ad; }
    saveUser(name, phone); renderAccount();
}
function reorderItem(h) {
    if (!h) return; let added = 0;
    h.items.forEach(it => {
        const p = allProducts.find(x => str(x['الاسم']) === it.name); if (!p || p.soldOut) return;
        const price = priceInfo(p).price, key = cartKey(it.name, it.variant || ''), ex = cart.find(c => c.key === key);
        if (ex) ex.qty = Math.min(99, ex.qty + it.qty); else cart.push({ key, base: it.name, variant: it.variant || '', name: it.variant ? `${it.name} (${it.variant})` : it.name, price, qty: it.qty });
        added++;
    });
    saveCart(); updateCartUI(); toggleAccount(false);
    toast(added ? 'تمت إضافة المنتجات للسلة بالأسعار الحالية' : 'المنتجات دي مش متاحة حالياً');
    if (added) toggleCart(true);
}
function reorder(i) { const u = getUser(); if (!u) return; reorderItem(getHist().filter(x => x.phone === u.phone)[i]); }

/* ---------- صفحة طلباتي السابقة (كل طلب باسم تحبه) ---------- */
function renderOrdersPage() {
    const box = $('orders-box'); if (!box) return;
    const u = getUser(), c = esc(cur());
    const list = getHist().map((h, i) => ({ h, i })).filter(x => !u || x.h.phone === u.phone);
    const head = `<div class="ord-head"><h1><i class="fas fa-clock-rotate-left"></i> طلباتي السابقة</h1><p>الطلبات اللي عملتها من الجهاز ده${u ? ' — ' + esc(u.name) : ''}. اضغط على القلم عشان تسمّي الطلب (مثلاً: «طلب الخضار الأسبوعي»).</p></div>`;
    if (!list.length) { box.innerHTML = head + `<div class="ord-empty"><i class="fas fa-bag-shopping"></i><p>مفيش طلبات سابقة لسه.</p><a href="#categories" class="btn-primary">ابدأ التسوق</a></div>`; return; }
    box.innerHTML = head + list.map(({ h, i }) => {
        const d = new Date(h.ts), qty = h.items.reduce((s2, x) => s2 + x.qty, 0);
        return `<article class="ord-card" data-i="${i}">
            <div class="ord-top"><div class="ord-title"><b class="ord-name">${esc(h.title || 'طلب بدون اسم')}</b><button class="ord-edit" data-ord="rename" aria-label="تسمية الطلب"><i class="fas fa-pen"></i></button></div><small>${ltr(h.no)}</small></div>
            <div class="ord-meta">${esc(d.toLocaleDateString('ar-EG'))} — ${esc(d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))} • ${qty} قطعة</div>${h.address ? `<div class="ord-addr"><i class="fas fa-location-dot"></i> ${esc(h.address)}</div>` : ''}
            <ul class="ord-items">${h.items.map(x => `<li><span>${esc(x.name)}${x.variant ? ' (' + esc(x.variant) + ')' : ''}</span><b>× ${x.qty}</b></li>`).join('')}</ul>
            <div class="ord-foot"><strong>الإجمالي: ${fmt(h.total)} ${c}</strong><div class="ord-btns"><button class="ord-inv" data-ord="invoice"><i class="fas fa-file-invoice"></i> استخراج الفاتورة</button><button class="ord-again" data-ord="again">اطلب تاني</button></div></div>
        </article>`;
    }).join('');
}
/* ---------- صورة الفاتورة (بترسم على Canvas من غير أي مكتبة، وبتشتغل بس لما تدوس الزرار) ---------- */
async function buildInvoiceBlobs(h, mime) {
    try { await document.fonts.load('700 24px Cairo'); await document.fonts.load('400 20px Cairo'); } catch (e) { }
    const W = 760, P = 36, NAMEW = 270, F = 'Cairo, Tahoma, Arial, sans-serif', c = cur(), store = str(S['اسم المتجر']) || 'ترولي ماركت', d = new Date(h.ts);
    const rows = h.items.map(x => { let u = x.price; if (u == null) { const p = allProducts.find(z => str(z['الاسم']) === x.name); u = p ? priceInfo(p).price : null; } return { name: x.name + (x.variant ? ' (' + x.variant + ')' : ''), qty: x.qty, u }; });
    const sub = h.sub != null ? h.sub : rows.reduce((s2, r) => s2 + (r.u || 0) * r.qty, 0), delivery = h.delivery != null ? h.delivery : Math.max(0, h.total - sub);
    const meta = [['التاريخ', d.toLocaleDateString('ar-EG') + ' — ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })], ['اسم الطلب', h.title], ['العميل', h.name], ['الموبايل', h.phone], ['العنوان', h.address], ['طريقة الدفع', h.payment]].filter(m => m[1]);
    const chunks = []; for (let i = 0; i < rows.length; i += 40) chunks.push(rows.slice(i, i + 40)); if (!chunks.length) chunks.push([]);
    const wrap = (g, text, maxW) => { const out = []; let line = ''; String(text).split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); return out; };
    const draw = (g, items, pi, last) => {
        g.direction = 'rtl'; g.textBaseline = 'middle'; const R = W - P;
        g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, 4000);
        g.fillStyle = '#FF6200'; g.fillRect(0, 0, W, 120); g.fillStyle = '#FF6200'; g.fillRect(0, 120, W, 6);
        g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 40px ${F}`; g.fillText(store, R, 52);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 20px ${F}`; g.direction = 'ltr'; g.fillText(str(S['رقم التليفون المعروض']) || '', R, 92); g.direction = 'rtl';
        g.textAlign = 'left'; g.fillStyle = '#FF6200'; g.font = `800 38px ${F}`; g.fillText('فاتورة', P, 48);
        g.direction = 'ltr'; g.fillStyle = '#fff'; g.font = `600 17px ${F}`; g.fillText(h.no, P, 94); g.direction = 'rtl';
        let y = 160;
        if (pi === 0) meta.forEach(m => {
            g.textAlign = 'right'; g.font = `600 20px ${F}`; g.fillStyle = '#8A8F88'; g.fillText(m[0], R, y);
            g.font = `800 21px ${F}`; g.fillStyle = '#10141A'; const ls = wrap(g, m[1], W - 2 * P - 150);
            if (m[0] === 'الموبايل') g.direction = 'ltr';
            ls.forEach((l, i) => g.fillText(l, R - 150, y + i * 30)); g.direction = 'rtl'; y += Math.max(38, ls.length * 30 + 8);
        });
        y += 14; g.fillStyle = '#FF6200'; g.fillRect(P, y, W - 2 * P, 46); g.fillStyle = '#fff'; g.font = `800 20px ${F}`;
        g.textAlign = 'right'; g.fillText('الصنف', R - 12, y + 24); g.textAlign = 'center'; g.fillText('الكمية', 390, y + 24); g.fillText('السعر', 280, y + 24); g.fillText('الإجمالي', 140, y + 24);
        y += 46;
        items.forEach((r, i) => {
            g.font = `700 21px ${F}`; const ls = wrap(g, r.name, NAMEW), h2 = Math.max(48, ls.length * 30 + 16);
            if (i % 2 === 0) { g.fillStyle = '#fff'; g.fillRect(P, y, W - 2 * P, h2); }
            g.fillStyle = '#10141A'; g.textAlign = 'right'; ls.forEach((l, k) => g.fillText(l, R - 12, y + 24 + k * 30));
            g.textAlign = 'center'; g.fillText(String(r.qty), 390, y + h2 / 2); g.fillText(r.u !== null ? fmt(r.u) : '—', 280, y + h2 / 2);
            g.font = `800 21px ${F}`; g.fillText(r.u !== null ? fmt(r.u * r.qty) : '—', 140, y + h2 / 2);
            g.fillStyle = '#E6E1D6'; g.fillRect(P, y + h2 - 1, W - 2 * P, 1); y += h2;
        });
        y += 20;
        if (last) {
            const bx = P, bw = 330;
            [['المجموع', fmt(sub) + ' ' + c], ['التوصيل', delivery ? fmt(delivery) + ' ' + c : 'مجاني']].forEach(t => {
                g.textAlign = 'right'; g.font = `600 21px ${F}`; g.fillStyle = '#6B706A'; g.fillText(t[0], bx + bw, y + 18);
                g.textAlign = 'left'; g.font = `800 21px ${F}`; g.fillStyle = '#10141A'; g.fillText(t[1], bx, y + 18); y += 38;
            });
            g.fillStyle = '#FF6200'; g.fillRect(bx, y + 4, bw, 56);
            g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 24px ${F}`; g.fillText('الإجمالي', bx + bw - 14, y + 33);
            g.textAlign = 'left'; g.fillText(fmt(h.total) + ' ' + c, bx + 14, y + 33); y += 80;
        }
        g.textAlign = 'center'; g.fillStyle = '#7A7F78'; g.font = `600 19px ${F}`;
        g.fillText('شكراً لتعاملك مع ' + store + (chunks.length > 1 ? `  •  صفحة ${pi + 1} من ${chunks.length}` : ''), W / 2, y + 22);
        return y + 56;
    };
    const blobs = [];
    for (let pi = 0; pi < chunks.length; pi++) {
        const probe = document.createElement('canvas').getContext('2d'), H = Math.ceil(draw(probe, chunks[pi], pi, pi === chunks.length - 1));
        const cv = document.createElement('canvas'), sc = H > 4200 ? 1 : 2; cv.width = W * sc; cv.height = H * sc;
        const g = cv.getContext('2d'); g.scale(sc, sc); draw(g, chunks[pi], pi, pi === chunks.length - 1);
        blobs.push(await new Promise(r => cv.toBlob(r, mime || 'image/png', 0.86)));
    }
    return blobs;
}
async function invoiceFiles(h) { const bl = await buildInvoiceBlobs(h); return bl.map((b, i) => new File([b], `فاتورة-${h.no}${bl.length > 1 ? '-' + (i + 1) : ''}.png`, { type: 'image/png' })); }
function downloadFiles(files) { files.forEach((f, i) => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); setTimeout(() => { a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, i * 500); }); }
async function shareInvoice(h, saveOnly) {
    toast('بجهّز صورة الفاتورة...');
    try {
        const files = await invoiceFiles(h);
        if (!saveOnly && navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: 'فاتورة ' + h.no }); return; }
        downloadFiles(files); toast(saveOnly ? 'اتحفظت صورة الفاتورة' : 'اتحفظت صورة الفاتورة — ابعتها على واتساب');
    } catch (e) { if (e && e.name === 'AbortError') return; toast('معرفتش أجهز الصورة، جرّب تاني'); }
}
async function offerInvoice(h, opts) {
    const send = !!opts; if (!h || (!send && isNo(S['إرسال صورة الفاتورة بعد الطلب']))) return;
    let m = $('invoice-modal'); if (!m) { m = document.createElement('div'); m.id = 'invoice-modal'; m.className = 'inv-overlay'; document.body.appendChild(m); }
    window.__inv = h; window.__invText = send ? opts.text : ''; window.__invFiles = null;
    if (!send) {
        m.innerHTML = `<div class="inv-wrap inv-send"><div class="inv-sheet"><div class="inv-ok"><i class="fas fa-circle-check"></i></div><h3>اتجهّز طلبك وفاتورتك</h3><p>بعد ما رسالة الطلب توصل على واتساب، ابعت صورة الفاتورة كمان عشان نجهّز طلبك أسرع.</p>
        <div class="inv-actions col"><button data-inv="share"><i class="fab fa-whatsapp"></i> إرسال صورة الفاتورة</button><button data-inv="save"><i class="fas fa-download"></i> حفظ الصورة</button><button data-inv="close">مش دلوقتي</button></div></div></div>`;
        m.classList.add('open'); return;
    }
    m.innerHTML = '<div class="inv-wrap inv-send"><div class="inv-sheet"><div class="inv-ok"><i class="fas fa-spinner fa-spin"></i></div><h3>بجهّز فاتورتك...</h3></div></div>'; m.classList.add('open');
    try {
        const files = await invoiceFiles(h); window.__invFiles = files;
        m.innerHTML = `<div class="inv-wrap inv-send"><div class="inv-sheet"><h3>راجع فاتورتك وابعتها</h3><p>طلبك اتسجّل ✅ — دوس «إرسال» واختار محادثة المتجر على واتساب، وهتتبعت الفاتورة مع الطلب.</p>
        <div class="inv-prev">${files.map(f => `<img src="${URL.createObjectURL(f)}" alt="الفاتورة">`).join('')}</div>
        <div class="inv-actions col"><button data-inv="send"><i class="fab fa-whatsapp"></i> إرسال الطلب والفاتورة على واتساب</button><button data-inv="save"><i class="fas fa-download"></i> حفظ الصورة</button><button data-inv="close">إغلاق</button></div></div></div>`;
    } catch (e) { m.innerHTML = '<div class="inv-wrap inv-send"><div class="inv-sheet"><h3>طلبك اتسجّل ✅</h3><p>معرفتش أجهّز الصورة. هنفتح لك الواتساب بالنص.</p><div class="inv-actions col"><button data-inv="textwa">فتح واتساب</button></div></div></div>'; }
}
function sendOrderShare() {
    const h = window.__inv, text = window.__invText || '', files = window.__invFiles; if (!files) return;
    const wa = `https://wa.me/${getCleanPhone(S['رقم الواتساب'])}?text=${encodeURIComponent(text)}`;
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) { }
    const done = () => { const m = $('invoice-modal'); if (m) m.classList.remove('open'); };
    if (navigator.canShare && navigator.canShare({ files, text })) navigator.share({ files, text, title: 'طلب ' + h.no }).then(done).catch(er => { if (!er || er.name !== 'AbortError') toast('معرفتش أشارك الصورة، جرّب «حفظ الصورة»'); });
    else if (navigator.canShare && navigator.canShare({ files })) navigator.share({ files, title: 'طلب ' + h.no }).then(done).catch(er => { if (!er || er.name !== 'AbortError') toast('معرفتش أشارك الصورة، جرّب «حفظ الصورة»'); });
    else { downloadFiles(files); window.open(wa, '_blank'); toast('اتحفظت الفاتورة — ضيفها في محادثة واتساب'); done(); }
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-extract]')) return;
    if (!cart.length) { toast('السلة فاضية'); return; }
    const t = totals(), g = (id) => { const el = $(id); return el ? str(el.value) : ''; };
    showInvoice({ no: 'فاتورة مبدئية', ts: new Date().toISOString(), phone: g('cust-phone'), name: g('cust-name'), address: g('cust-address'), payment: g('cust-pay'), title: g('cust-title'), sub: t.sub, delivery: t.delivery, total: t.total, items: cart.map(i => ({ name: i.base, variant: i.variant, qty: i.qty, price: i.price })) });
});
window.tmInvoice = { build: buildInvoiceBlobs, share: shareInvoice };

/* ---------- الفاتورة ---------- */
function showInvoice(h) {
    const c = esc(cur()), d = new Date(h.ts), unit = (x) => { if (x.price != null) return x.price; const p = allProducts.find(z => str(z['الاسم']) === x.name); return p ? priceInfo(p).price : null; };
    const rows = h.items.map(x => ({ x, u: unit(x) })), known = rows.every(r => r.u !== null);
    const sub = h.sub != null ? h.sub : (known ? rows.reduce((s2, r) => s2 + r.u * r.x.qty, 0) : h.total);
    const delivery = h.delivery != null ? h.delivery : Math.max(0, h.total - sub);
    let m = $('invoice-modal'); if (!m) { m = document.createElement('div'); m.id = 'invoice-modal'; m.className = 'inv-overlay'; document.body.appendChild(m); }
    const line = (k, v, l) => v ? `<div><span>${k}</span><b>${l ? ltr(v) : esc(v)}</b></div>` : '';
    m.innerHTML = `<div class="inv-wrap"><div class="inv-sheet">
        <div class="inv-head"><div><h2>${esc(str(S['اسم المتجر']) || 'ترولي ماركت')}</h2><p>${ltr(str(S['رقم التليفون المعروض']) || '')}</p></div><div class="inv-tag"><b>فاتورة</b><span>${esc(h.no)}</span></div></div>
        <div class="inv-meta">${line('التاريخ', d.toLocaleDateString('ar-EG') + ' — ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))}${line('اسم الطلب', h.title)}${line('العميل', h.name)}${line('الموبايل', h.phone, 1)}${line('العنوان', h.address)}${line('طريقة الدفع', h.payment)}</div>
        <table class="inv-table"><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.x.name)}${r.x.variant ? ' (' + esc(r.x.variant) + ')' : ''}</td><td>${r.x.qty}</td><td>${r.u !== null ? fmt(r.u) : '—'}</td><td>${r.u !== null ? fmt(r.u * r.x.qty) : '—'}</td></tr>`).join('')}</tbody></table>
        <div class="inv-totals"><div><span>المجموع</span><b>${fmt(sub)} ${c}</b></div><div><span>التوصيل</span><b>${delivery ? fmt(delivery) + ' ' + c : 'مجاني'}</b></div><div class="g"><span>الإجمالي</span><b>${fmt(h.total)} ${c}</b></div></div>
        <p class="inv-foot">شكراً لتعاملك مع ${esc(str(S['اسم المتجر']) || 'ترولي ماركت')}</p></div>
        <div class="inv-actions"><button data-inv="share"><i class="fas fa-image"></i> إرسال كصورة</button><button data-inv="print"><i class="fas fa-print"></i> طباعة / PDF</button><button data-inv="close">إغلاق</button></div></div>`;
    window.__inv = h; m.classList.add('open');
}
document.addEventListener('click', (e) => {
    const ib = e.target.closest('[data-inv]'); if (!ib) { if (e.target.id === 'invoice-modal') e.target.classList.remove('open'); return; }
    const k = ib.dataset.inv; if (k === 'close') $('invoice-modal').classList.remove('open'); else if (k === 'share') shareInvoice(window.__inv); else if (k === 'send') sendOrderShare(); else if (k === 'textwa') { window.open(`https://wa.me/${getCleanPhone(S['رقم الواتساب'])}?text=${encodeURIComponent(window.__invText || '')}`, '_blank'); $('invoice-modal').classList.remove('open'); } else if (k === 'save') { if (window.__invFiles) { downloadFiles(window.__invFiles); toast('اتحفظت صورة الفاتورة'); } else shareInvoice(window.__inv, true); } else window.print();
});
document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ord]'); if (!b) return;
    const card = b.closest('.ord-card'), gi = +card.dataset.i, hist = getHist(), h = hist[gi]; if (!h) return;
    if (b.dataset.ord === 'again') { reorderItem(h); return; }
    if (b.dataset.ord === 'invoice') { showInvoice(h); return; }
    if (b.dataset.ord === 'rename') {
        const t = card.querySelector('.ord-title');
        t.innerHTML = `<input class="ord-in" type="text" maxlength="40" value="${esc(h.title || '')}" placeholder="اسم الطلب"><button class="ord-save" data-ord="save">حفظ</button>`;
        t.querySelector('input').focus(); return;
    }
    if (b.dataset.ord === 'save') {
        h.title = str(card.querySelector('.ord-in').value); ls.set(HIST_KEY, JSON.stringify(hist)); renderOrdersPage(); toast('اتحفظ اسم الطلب');
    }
});

function toggleCart(force) {
    const open = force === undefined ? !$('cart-sidebar').classList.contains('open') : force;
    $('cart-sidebar').classList.toggle('open', open); $('overlay').classList.toggle('show', open);
}
function closeOverlays() { toggleCart(false); toggleSearch(false); const am = $('acct-modal'); if (am) am.classList.remove('open'); $('lightbox').classList.remove('show'); }
const FIELDS = { 'cust-name': 'cust_name', 'cust-address': 'cust_address', 'cust-notes': 'cust_notes', 'cust-landmark': 'cust_landmark', 'cust-phone': 'cust_phone' };
function loadCustomerFields() { Object.entries(FIELDS).forEach(([id, k]) => { $(id).value = ls.get(k) || ''; $(id).addEventListener('input', () => ls.set(k, $(id).value)); }); if (accountsOn()) setCustomerFields(getUser()); syncAccountUI(); }
async function checkout() {
    if (!cart.length) return alert('السلة فارغة!');
    const t = totals(); const c = cur();
    if (t.min && t.sub < t.min) return alert(`الحد الأدنى للطلب ${fmt(t.min)} ${c}`);
    const payEl = $('cust-pay'), pay = payEl && payEl.value ? payEl.value : '', titleEl = $('cust-title'), otitle = titleEl ? str(titleEl.value) : '';
    if (!getCleanPhone(S['رقم الواتساب'])) { toast('رقم واتساب المتجر غير مُعدّ في الإعدادات'); return; }
    const name = str($('cust-name').value), addr = str($('cust-address').value), notes = str($('cust-notes').value), land = str($('cust-landmark').value), phone = str($('cust-phone').value);
    const needPhone = !isNo(S['رقم الموبايل إجباري']);
    if ((needPhone || phone) && !validPhone(digits(phone))) { $('cust-phone').focus(); toast('اكتب رقم موبايل صحيح (مثال: 01012345678)'); return; }
    const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
    const no = 'TM-' + String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
    const line = '━━━━━━━━━━━━━━━━━━', store = str(S['اسم المتجر']) || 'ترولي ماركت';
    let m = `🧾 *فاتورة — ${str(S['نص بداية رسالة الطلب']) || 'طلب جديد من'} ${store}*\n${line}\n`;
    m += `*رقم الفاتورة:* \u2066${no}\u2069\n*التاريخ:* ${d.toLocaleDateString('ar-EG')} — ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`;
    if (otitle) m += `*اسم الطلب:* ${otitle}\n`;
    if (name || phone || addr || land) { m += `${line}\n👤 *بيانات العميل*\n`; if (name) m += `الاسم: ${name}\n`; if (phone) m += `الموبايل: \u2066${digits(phone)}\u2069\n`; if (addr) m += `العنوان: ${addr}\n`; if (land) m += `علامة مميزة: ${land}\n`; }
    m += `${line}\n🛒 *الأصناف*\n`;
    cart.forEach((i, k) => { m += `${k + 1}) ${i.name}\n      ${i.qty} × ${fmt(i.price)} = *${fmt(i.price * i.qty)} ${c}*\n`; });
    m += `${line}\nالمجموع: ${fmt(t.sub)} ${c}\n`;
    if (t.fee) m += `التوصيل: ${t.delivery ? fmt(t.delivery) + ' ' + c : 'مجاني'}\n`;
    m += `💰 *الإجمالي: ${fmt(t.total)} ${c}*\n`;
    if (pay) m += `💳 طريقة الدفع: ${pay}\n`;
    if (notes) m += `📝 ملاحظات: ${notes}\n`;
    m += line;
    if (str(S['رسالة نهاية الطلب'])) m += `\n${str(S['رسالة نهاية الطلب'])}`;
    const mv = str(S['طريقة إرسال الطلب']), mode = /نص فقط/.test(mv) ? 'text' : /مشاركة/.test(mv) ? 'share' : /رابط/.test(mv) ? 'link' : 'text';
    let waWin = null, invUrls = [];
    if (mode === 'link') { try { waWin = window.open('', '_blank'); } catch (e) { } toast('بجهّز فاتورتك وبفتح الواتساب...'); }
    try {
        const url = getOrderApiUrl();
        const hist = getHist(); hist.unshift({ no, ts: d.toISOString(), phone: digits(phone), name, address: addr, payment: pay, sub: t.sub, delivery: t.delivery, title: otitle, total: t.total, items: cart.map(i => ({ name: i.base || String(i.name).replace(/ \([^()]*\)$/, ''), variant: i.variant || '', qty: i.qty, price: i.price })) });
        ls.set(HIST_KEY, JSON.stringify(hist.slice(0, 10)));
        if (accountsOn() && name && validPhone(digits(phone))) { saveUser(name, digits(phone), true); }
        if (url) {
            const baseOf = (i) => i.base || String(i.name).replace(/ \([^()]*\)$/, '');
            const prodCat = (n) => { const p = allProducts.find(x => str(x['الاسم']) === n); return p ? str(p['القسم']) : ''; };
            const order = { orderNo: no, ts: d.toISOString(), name, phone, address: addr, landmark: land, notes, payment: pay, sub: t.sub, delivery: t.delivery, total: t.total, items: cart.map(i => ({ name: baseOf(i), variant: i.variant || '', qty: i.qty, price: i.price, category: prodCat(baseOf(i)) })) };
            let sent = false;
            if (mode === 'link') {
                try {
                    const blobs = await buildInvoiceBlobs(getHist()[0], 'image/jpeg');
                    const imgs = await Promise.all(blobs.map(b => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(b); })));
                    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
                    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...order, invoiceImages: imgs }), signal: ctl.signal });
                    clearTimeout(tm); const j = await r.json(); invUrls = (j && j.invoiceUrls) || []; sent = true;
                } catch (e) { }
            }
            if (!sent) fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(order), keepalive: true }).catch(() => {});
        }
    } catch (e) { }
    const waUrl = (txt) => `https://wa.me/${getCleanPhone(S['رقم الواتساب'])}?text=${encodeURIComponent(txt)}`;
    if (mode === 'text') window.open(waUrl(m), '_blank');
    if (titleEl) titleEl.value = '';
    cart = []; saveCart(); updateCartUI(); toggleCart(false); navigate('home'); window.scrollTo(0, 0);
    if (mode === 'link') {
        const full = invUrls.length ? m + '\n\n🧾 صورة الفاتورة:\n' + invUrls.join('\n') : m;
        if (waWin && !waWin.closed) waWin.location.href = waUrl(full); else window.location.href = waUrl(full);
    } else if (mode === 'share') offerInvoice(getHist()[0], { text: m });
}

window.TM={get route(){return currentRoute},get user(){return getUser()},get S(){return S},get products(){return allProducts},get offers(){return allOffers},get cats(){return CATEGORIES},get catMeta(){return catMeta},navigate:(r)=>navigate(r),catLabel:(c)=>catLabel(c),get cart(){return cart},totals:()=>totals(),cur:()=>cur(),fmt:(n)=>fmt(n),priceInfo:(p)=>priceInfo(p),phone:()=>getCleanPhone(S['رقم الواتساب']),clear(){cart=[];saveCart();updateCartUI()}};

/* ---------- الأحداث (تفويض واحد لكل الصفحة) ---------- */
document.addEventListener('click', (e) => {
    const t = e.target;
    // قائمة الأنواع
    const disp = t.closest('.custom-select-display');
    if (disp) {
        const opts = disp.parentElement.querySelector('.custom-select-options');
        $$('.custom-select-options.show').forEach(o => { if (o !== opts) o.classList.remove('show'); });
        opts.classList.toggle('show'); return;
    }
    const opt = t.closest('.custom-option');
    if (opt) {
        const card = opt.closest('.product-card'); card.dataset.variant = opt.dataset.v;
        card.querySelector('.custom-select-display span').textContent = opt.dataset.v;
        opt.parentElement.classList.remove('show'); return;
    }
    $$('.custom-select-options.show').forEach(o => o.classList.remove('show'));
    // الكمية والإضافة
    const q = t.closest('.qty-btn');
    if (q) { const i = q.closest('.product-card').querySelector('.qty-input'); i.value = Math.max(1, Math.min(num(S['الحد الأقصى للكمية']) || 50, (parseInt(i.value) || 1) + (+q.dataset.q))); return; }
    const add = t.closest('.add-to-cart-btn'); if (add && add.disabled) return; if (add) { addToCart(add.closest('.product-card')); return; }
    // عناصر السلة
    const ci = t.closest('[data-ci]');
    if (ci) {
        const it = cart[+ci.dataset.idx]; if (!it) return;
        if (ci.dataset.ci === 'inc') it.qty = Math.min(99, it.qty + 1);
        else if (ci.dataset.ci === 'dec') it.qty = Math.max(1, it.qty - 1);
        else cart.splice(+ci.dataset.idx, 1);
        saveCart(); updateCartUI(); return;
    }
    // السلايدر: الانتقال للقسم
    const slide = t.closest('.slide-item[data-href]'); if (slide) { goHref(slide.dataset.href); return; }
    // روابط التنقل الداخلية (#home / #categories/... / #search=...)
    const nav = t.closest('a[href^="#"]');
    if (nav && nav.getAttribute('href').length > 1) {
        e.preventDefault(); goHref(nav.getAttribute('href')); return;
    }
    // الأزرار العامة
    const act = t.closest('[data-action]');
    if (!act) return;
    switch (act.dataset.action) {
        case 'toggle-search': toggleSearch(); break;
        case 'toggle-theme': toggleTheme(); break;
        case 'toggle-cart': toggleCart(); break;
        case 'close-overlays': closeOverlays(); break;
        case 'share': shareWebsite(); break;
        case 'checkout': checkout(); break;
        case 'account': toggleAccount(); break;
        case 'acct-save': submitAccount(); break;
        case 'acct-edit': renderAccount('edit'); break;
        case 'acct-orders': toggleAccount(false); navigate('orders'); break;
        case 'acct-back': renderAccount(); break;
        case 'acct-wipe': if (confirm('هنمسح بياناتك وطلباتك السابقة من الجهاز ده؟')) { [ACC_KEY, HIST_KEY, 'cust_name', 'cust_phone', 'cust_address', 'cust_notes', 'cust_landmark'].forEach(k => ls.del(k)); ['cust-name', 'cust-phone', 'cust-address', 'cust-notes', 'cust-landmark'].forEach(id => { const el = $(id); if (el) el.value = ''; }); syncAccountUI(); renderAccount(); toast('اتمسحت بياناتك من الجهاز'); } break;
        case 'acct-logout': if (confirm('تسجيل الخروج من الحساب؟')) { ls.del(ACC_KEY); syncAccountUI(); renderAccount(); } break;
        case 'acct-reorder': reorder(+act.dataset.i); break;
        case 'clear-cart': if (cart.length && confirm('تفريغ السلة؟')) { cart = []; saveCart(); updateCartUI(); } break;
        case 'lightbox': { const lb = $('lightbox'); lb.querySelector('img').src = act.src; lb.classList.add('show'); break; }
        case 'close-lightbox': $('lightbox').classList.remove('show'); break;
    }
});
window.addEventListener('popstate', (e) => route((e.state && e.state.r) || 'home'));
$('search-input').addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(performSearch, 120); });
$('sort-select').addEventListener('change', (e) => { sortMode = e.target.value; const p = decodeURIComponent(currentRoute).split('/'); renderCategories(p[1] || 'الكل'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays(); });
// صورة بديلة لأي صورة لا تعمل
document.addEventListener('error', (e) => { const i = e.target; if (i && i.tagName === 'IMG' && i.src !== PLACEHOLDER && !i.dataset.fb) { i.dataset.fb = 1; i.src = (window.tmFallback && window.tmFallback(i)) || PLACEHOLDER; } }, true);

document.addEventListener('DOMContentLoaded', () => { initTheme(); loadExcelData(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
