/* Trolley Market — effects layer. Safe: if anything fails, the site works as before. */
(function(){
'use strict';
var root=document.documentElement,PAGES={'page-home':'HOME','page-categories':'CATEGORIES','page-catalog':'OFFERS','page-about':'ABOUT'};
var SEL='.product-card,.section-header,.static-banner,.split-banners,.swipe-slider-container,.catalog-page,.category-filter-bar';
function yes(k){try{return TM.S[k]!=='لا'}catch(e){return true}}
function S_(k,d){try{return TM.S[k]||d}catch(e){return d}}
root.classList.add('fx');

/* 1) scroll reveal */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.08,rootMargin:'0px 0px -6% 0px'});
function arm(scope){(scope||document).querySelectorAll(SEL).forEach(function(el){
  if(el.__fx)return;el.__fx=1;
  var i=Array.prototype.indexOf.call(el.parentNode.children,el);
  el.style.setProperty('--d',(i%6)*0.06+'s');el.classList.add('fx-reveal');io.observe(el)})}

/* 2) mp4/webm in Excel image cells -> muted looping video */
function vids(scope){(scope||document).querySelectorAll('img[src$=".mp4"],img[src$=".webm"]').forEach(function(im){
  var v=document.createElement('video');v.src=im.getAttribute('src');v.preload='metadata';v.muted=true;v.loop=true;v.autoplay=true;v.playsInline=true;v.setAttribute('playsinline','');
  v.className=(im.className+' fx-vid').trim();v.style.cssText=im.style.cssText;im.replaceWith(v);v.play&&v.play().catch(function(){})})}

/* 3) hero — supermarket style */
var COL=['#FF6200','#FF6200','#FF6200','#FF6200','#FF6200','#9C3B12'];
var ICON=[['فواك','apple-whole'],['خضر','carrot'],['ألبان','cheese'],['لحوم','drumstick-bite'],['منظف','spray-can-sparkles'],['مكسر','cookie-bite'],['تسالي','cookie-bite'],['سناكس','cookie'],['بقال','cart-shopping'],['مشروب','bottle-water']];
function icon(n){for(var i=0;i<ICON.length;i++)if(n.indexOf(ICON[i][0])>-1)return ICON[i][1];return 'tag'}
function hero(){
  var home=document.getElementById('page-home');if(!home||home.querySelector('.fx-hero')||!yes('إظهار الهيرو'))return;
  if(!window.TM||!TM.cats.length)return;
  var h=document.createElement('section');h.className='fx-hero fx-hero-img';
  var dsk=S_('صورة الهيرو','images/hero.svg'),mob=S_('صورة الهيرو (موبايل)','images/hero-mobile.svg'),lnk=S_('رابط الهيرو','#categories')||'#categories';
  h.innerHTML='<a class="fx-hero-link" href="'+lnk.replace(/"/g,'')+'"><picture><source media="(max-width:700px)"><img alt="ترولي ماركت" decoding="async" fetchpriority="high"></picture></a>';
  var pic=h.querySelector('picture'),im=pic.querySelector('img'),so=pic.querySelector('source');
  if(mob)so.setAttribute('srcset',mob);else so.remove();
  if(dsk)im.src=dsk;else if(mob)im.src=mob;else h.style.display='none';
  im.onerror=function(){if(!im.dataset.fb){im.dataset.fb=1;so&&so.remove();im.src='images/hero.svg'}else h.classList.add('fx-noart')};
  if(yes('إظهار أقسام الصفحة الرئيسية')){var cn=TM.cats.length,tt=tiles(cn,false);tt.style.setProperty('--cols-d',Math.min(4,cn)>=cn?cn:Math.ceil(cn/2));tt.style.setProperty('--cols-m',Math.min(4,cn));var cs=document.createElement('section');cs.className='fx-cats';cs.appendChild(tt);window.__fxCats=cs}else window.__fxCats=null;
  home.insertBefore(h,home.firstChild);
  if(false&&yes('إظهار الشريط المتحرك')){var t=document.createElement('div');t.className='fx-ticker';
    var o=TM.offers.slice(0,12).map(function(p){try{return String(p['الاسم']||'').trim()+' '+TM.fmt(TM.priceInfo(p).price)+' '+TM.cur()}catch(e){return ''}}).filter(Boolean);
    var words=(o.length?'عروض اليوم:  '+o.join('  •  '):S_('نص الشريط المتحرك',''))+'   •   ';
    t.innerHTML='<span></span>';t.firstChild.textContent=words+words+words;home.insertBefore(t,h.nextSibling)}
  if(window.__fxCats)h.after(window.__fxCats);
  arm(home);
}

/* 3b) عروض اليوم = البرتقالي الثابت | وإعدادات الألوان من settings.xlsx */
function offers(){var h=document.getElementById('today-offers');if(!h||h.dataset.of)return;h.dataset.of=1;h.classList.add('fx-offers-head');var g=h.nextElementSibling;if(g)g.classList.add('fx-offers-grid')}
function themeSet(){if(!window.TM||!TM.S)return;var ok=function(c){return /^#[0-9a-f]{3,8}$/i.test(String(c||'').trim())};
  var o=S_('لون عروض اليوم',''),c=S_('لون زر السلة',''),t1=S_('لون نقاط الثقة (فوق الزر الأول)',''),t2=S_('لون نقاط الثقة (فوق الزر الثاني)','');if(ok(t1))root.style.setProperty('--tc1',String(t1).trim());if(ok(t2))root.style.setProperty('--tc2',String(t2).trim());
  if(ok(o))root.style.setProperty('--offer',String(o).trim());if(ok(c))root.style.setProperty('--cartbtn',String(c).trim());
  var hs=S_('قوة الهالات','متوسطة');root.style.setProperty('--ha',hs==='خفيفة'?'16%':hs==='قوية'?'42%':'26%');document.body.classList.toggle('fx-nohalo',S_('هالات الألوان','نعم')==='لا');document.body.classList.toggle('fx-mono',S_('تلوين الأقسام بألوانها','نعم')==='لا');document.body.classList.toggle('fx-nav-flat',S_('شكل شريط التنقل السفلي','ملتصق')==='ملتصق')}

/* 3c) البنرات فوق/تحت الهيرو */
function placeBanners(){return;var hero=document.querySelector('.fx-hero');if(!hero||hero.dataset.bp)return;hero.dataset.bp=1;
  if(S_('مكان البنرات','فوق الهيرو')!=='فوق الهيرو')return;var home=hero.parentNode;
  ['sec-banner-top','slider-wrap','sec-banner-split'].forEach(function(id){var el=document.getElementById(id);if(el)home.insertBefore(el,hero)})}

/* 3d) طريقة الدفع في السلة */
function payInit(){var sel=document.getElementById('cust-pay'),box=document.getElementById('pay-box');if(!sel||sel.dataset.ok||!window.TM||!TM.S)return;sel.dataset.ok=1;
  if(S_('إظهار طريقة الدفع','نعم')==='لا'){box.style.display='none';sel.innerHTML='';return}
  var list=String(S_('طرق الدفع','الدفع عند الاستلام')).split(/[,،]/).map(function(x){return x.trim()}).filter(Boolean);
  sel.innerHTML='';list.forEach(function(x){var o=document.createElement('option');o.textContent=x;sel.appendChild(o)});
  var note=document.getElementById('pay-note'),txt=S_('ملاحظة الدفع الإلكتروني','');
  function sync(){var cod=/عند الاستلام|كاش عند|نقد/.test(sel.value);note.textContent=(!cod&&txt)?txt:'';note.style.display=note.textContent?'block':'none'}
  sel.addEventListener('change',sync);sync()}

/* 3e) الفوتر الثابت (في كل الصفحات) */
function footer(){if(document.getElementById('fx-footer')||!window.TM||!TM.S||!TM.cats.length)return;if(S_('إظهار الفوتر','نعم')==='لا')return;
  var nm=S_('اسم المتجر','ترولي ماركت'),ph=S_('رقم التليفون المعروض',''),wa=String(S_('رقم الواتساب','')).replace(/\D/g,''),hrs=S_('ساعات العمل',''),ad=S_('العنوان','');
  var soc=[['رابط فيسبوك','fab fa-facebook-f'],['رابط إنستجرام','fab fa-instagram'],['رابط تيك توك','fab fa-tiktok'],['رابط يوتيوب','fab fa-youtube'],['رابط تيليجرام','fab fa-telegram'],['رابط تويتر','fab fa-twitter'],['رابط الخريطة','fas fa-location-dot']].filter(function(x){return /^https?:\/\//i.test(String(S_(x[0],'')).trim())});
  var f=document.createElement('footer');f.id='fx-footer';f.className='fx-footer';
  f.innerHTML='<div class="ft-in"><div class="ft-brand"><h3></h3><p></p><div class="ft-soc"></div></div><div class="ft-col"><h4>روابط سريعة</h4><nav></nav></div><div class="ft-col ft-contact"><h4>تواصل</h4><div></div></div></div><div class="ft-copy"></div>';
  f.querySelector('.ft-brand h3').textContent=nm;f.querySelector('.ft-brand p').textContent=S_('وصف الفوتر','');
  var sc=f.querySelector('.ft-soc');soc.forEach(function(x){var a=document.createElement('a');a.href=S_(x[0],'')||'#';a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',x[0]);a.innerHTML='<i class="'+x[1]+'"></i>';sc.appendChild(a)});
  var nav=f.querySelector('nav');[['#home','اسم صفحة الرئيسية','الرئيسية'],['#categories','اسم صفحة الأقسام','الأقسام'],['#catalog','عروض اليوم','عروض اليوم'],['#catalog','اسم صفحة المجلة','المجلة'],['#about','اسم صفحة حول','حول']].forEach(function(l,i){
    if(i===2){var a2=document.createElement('a');a2.href='#home';a2.textContent=S_('عنوان قسم العروض','عروض اليوم');a2.dataset.off=1;nav.appendChild(a2);return}
    var a=document.createElement('a');a.href=l[0];a.textContent=S_(l[1],l[2]);nav.appendChild(a)});
  var c=f.querySelector('.ft-contact div');
  function line(txt,href,ic,ltr){var el=document.createElement(href?'a':'span');if(href)el.href=href;el.innerHTML='<i class="'+ic+'"></i> ';var t=document.createElement('bdi');t.dir=ltr?'ltr':'auto';t.textContent=txt;el.appendChild(t);c.appendChild(el)}
  if(ph)line(ph,'tel:'+ph.replace(/[^\d+]/g,''),'fas fa-phone',1);if(wa)line('واتساب','https://wa.me/'+wa,'fab fa-whatsapp');if(hrs)line(hrs,'','fas fa-clock');if(ad)line(ad,'','fas fa-location-dot');
  f.querySelector('.ft-copy').textContent='© '+new Date().getFullYear()+' '+nm+' — '+S_('حقوق الفوتر','جميع الحقوق محفوظة');
  var old=document.getElementById('site-footer');(old&&old.parentNode?old.parentNode:document.body).insertBefore(f,old?old.nextSibling:null);
  f.querySelectorAll('.ft-col nav a').forEach(function(a){a.addEventListener('click',function(){setTimeout(function(){window.scrollTo(0,0)},60)})});
  var offA=f.querySelector('a[data-off]');if(offA)offA.addEventListener('click',function(){setTimeout(function(){var t=document.getElementById('today-offers');if(t)t.scrollIntoView({behavior:'smooth'})},120)})}

/* 3f) اقتراحات البحث = الأقسام (مع زر إخفاء) */
function searchChips(){var m=document.getElementById('search-modal');if(!m||m.querySelector('.fx-chips')||!window.TM||!TM.cats.length)return;if(S_('إظهار اقتراحات البحث','نعم')==='لا')return;
  var box=document.createElement('div');box.className='fx-chips';box.innerHTML='<div class="fx-chips-h"><span>اقتراحات</span><button type="button" class="fx-chips-x">إخفاء الأقسام ✕</button></div><div class="fx-chips-l"></div>';
  var l=box.querySelector('.fx-chips-l');TM.cats.forEach(function(c){var a=document.createElement('a');a.href='#categories/'+encodeURIComponent(c);a.textContent=c;a.style.setProperty('--fc',catColor(c));a.addEventListener('click',function(){var x=document.querySelector('.close-search');if(x)setTimeout(function(){x.click()},30)});l.appendChild(a)});
  var x=box.querySelector('.fx-chips-x');x.onclick=function(){var h=l.classList.toggle('off');x.textContent=h?'إظهار الأقسام':'إخفاء الأقسام ✕'};
  var hd=m.querySelector('.search-header');hd.parentNode.insertBefore(box,hd.nextSibling)}

/* 3g) ألوان الهوية من الإعدادات */
function palette(){if(!window.TM||!TM.S)return;var ok=function(c){return /^#[0-9a-f]{3,8}$/i.test(String(c||'').trim())};
  [['درجة الأخضر الداكن','--p-dark'],['درجة الأخضر','--p-green'],['درجة الأخضر الفاتح','--p-lgreen'],['درجة الأخضر الأفتح','--p-llgreen'],['درجة البرتقالي','--p-orange'],['درجة الأصفر','--p-yellow'],['درجة الأحمر','--p-red'],['درجة الكريمي الفاتح','--p-cream1'],['درجة الكريمي','--p-cream2']].forEach(function(p){var v=S_(p[0],'');if(ok(v))root.style.setProperty(p[1],String(v).trim())})}

/* 3h) صورة بديلة لو ملف الصورة مش موجود: رمز المنتج على دايرة بلون القسم */
var EMO={"موز":["🍌","#FF6200"],"تفاح أحمر":["🍎","#FF6200"],"برتقال":["🍊","#FF6200"],"فراولة":["🍓","#FF6200"],"عنب أخضر":["🍇","#FF6200"],"ليمون":["🍋","#FF6200"],"بطيخ":["🍉","#FF6200"],"طماطم":["🍅","#FF6200"],"خيار":["🥒","#FF6200"],"بطاطس":["🥔","#FF6200"],"بصل أحمر":["🧅","#FF6200"],"جزر":["🥕","#FF6200"],"أرز مصري":["🍚","#FF6200"],"مكرونة":["🍝","#FF6200"],"سكر":["🥄","#FF6200"],"زيت عباد الشمس":["🌻","#FF6200"],"دقيق أبيض":["🌾","#FF6200"],"عدس أصفر":["🥣","#FF6200"],"فول مدمس":["🥣","#FF6200"],"تونة":["🐟","#FF6200"],"شاي":["🍵","#FF6200"],"قهوة":["☕","#FF6200"],"صلصة طماطم":["🥫","#FF6200"],"مربى فراولة":["🍯","#FF6200"],"لبن كامل الدسم":["🥛","#FF6200"],"لبن خالي الدسم":["🥛","#FF6200"],"زبادي طبيعي":["🥣","#FF6200"],"جبنة رومي":["🧀","#FF6200"],"جبنة بيضاء":["🧀","#FF6200"],"جبنة مثلثات":["🧀","#FF6200"],"قشطة":["🍶","#FF6200"],"زبدة":["🧈","#FF6200"],"بيض بلدي":["🥚","#FF6200"],"كريمة طبخ":["🍶","#FF6200"],"لبنة":["🥣","#FF6200"],"موزاريلا":["🧀","#FF6200"],"عيش بلدي":["🥙","#FF6200"],"عيش فينو":["🥖","#FF6200"],"توست":["🍞","#FF6200"],"كرواسون":["🥐","#FF6200"],"باجيت":["🥖","#FF6200"],"بقسماط":["🥨","#FF6200"],"عيش شامي":["🥙","#FF6200"],"رولز صغير":["🥯","#FF6200"],"لب سوبر":["🌻","#FF6200"],"لب أسمر":["🌻","#FF6200"],"فول سوداني":["🥜","#FF6200"],"لوز":["🌰","#FF6200"],"كاجو":["🥜","#FF6200"],"فستق":["🥜","#FF6200"],"بندق":["🌰","#FF6200"],"عين جمل":["🌰","#FF6200"],"زبيب":["🍇","#FF6200"],"تمر":["🌴","#FF6200"],"حمص الشام":["🥣","#FF6200"],"مكس مكسرات":["🥜","#FF6200"],"شيبسي ملح":["🍟","#FF6200"],"بطاطس بالجبنة":["🍟","#FF6200"],"بوشار":["🍿","#FF6200"],"لبان":["🍬","#FF6200"],"نودلز":["🍜","#FF6200"],"ذرة مشوية":["🌽","#FF6200"],"بسكويت بالتمر":["🍪","#FF6200"],"مياه معدنية":["💧","#FF6200"],"عصير برتقال":["🍊","#FF6200"],"عصير مانجو":["🥭","#FF6200"],"كولا":["🥤","#FF6200"],"ليمون غازي":["🍋","#FF6200"],"مشروب طاقة":["⚡","#FF6200"],"شاي مثلج":["🧋","#FF6200"],"لبن بالشوكولاتة":["🍫","#FF6200"],"مياه غازية كبيرة":["🥤","#FF6200"],"قهوة باردة":["☕","#FF6200"],"كركديه":["🌺","#FF6200"],"سوبيا":["🍶","#FF6200"],"كمون":["🌿","#FF6200"],"كزبرة ناشفة":["🌿","#FF6200"],"فلفل أسود":["🌶️","#FF6200"],"ملح طعام":["🧂","#FF6200"],"شطة":["🌶️","#FF6200"],"كركم":["🌿","#FF6200"],"قرفة":["🍂","#FF6200"],"بهارات مشكلة":["🥫","#FF6200"],"ورق لورا":["🍃","#FF6200"],"هيل":["🌱","#FF6200"],"زنجبيل بودر":["🌿","#FF6200"],"ثوم بودر":["🧄","#FF6200"],"شوكولاتة بالحليب":["🍫","#FF6200"],"ويفر":["🧇","#FF6200"],"أصابع شوكولاتة":["🍫","#FF6200"],"جيلي":["🍬","#FF6200"],"كاندي ملون":["🍭","#FF6200"],"كيكة فانيلا":["🍰","#FF6200"],"دونات":["🍩","#FF6200"],"كوكيز شوكولاتة":["🍪","#FF6200"],"مافن":["🧁","#FF6200"],"مانجو عويس":["🥭","#FF6200"],"جوافة":["🍐","#FF6200"],"رمان":["🍎","#FF6200"],"كمثرى":["🍐","#FF6200"],"كوسة":["🥒","#FF6200"],"باذنجان":["🍆","#FF6200"],"فلفل رومي":["🫑","#FF6200"],"خس":["🥬","#FF6200"],"مكرونة ريجينا 400 جم":["🍝","#FF6200"],"أرز العلمين 1 كجم":["🍚","#FF6200"],"زيت كريستال عباد الشمس":["🌻","#FF6200"],"زيت عافية ذرة":["🌽","#FF6200"],"شاي العروسة 40 جم":["🍵","#FF6200"],"شاي ليبتون 40 جم":["🍵","#FF6200"],"نسكافيه كلاسيك 50 جم":["☕","#FF6200"],"فول معبأ":["🥣","#FF6200"],"دقيق معبأ":["🌾","#FF6200"],"لبن جهينة كامل الدسم":["🥛","#FF6200"],"لبن جهينة خالي الدسم":["🥛","#FF6200"],"زبادي جهينة":["🥣","#FF6200"],"جبنة دومتي فيتا":["🧀","#FF6200"],"جبنة كيري مثلثات":["🧀","#FF6200"],"بيض أبيض":["🥚","#FF6200"],"زبدة لورباك":["🧈","#FF6200"],"توست بيمبو أبيض":["🍞","#FF6200"],"كرواسون بالجبنة":["🥐","#FF6200"],"بيتي فور":["🍪","#FF6200"],"بيجل بالسمسم":["🥯","#FF6200"],"جوز هند مبشور":["🥥","#FF6200"],"سمسم أبيض":["🌰","#FF6200"],"عباد شمس مقشر":["🌻","#FF6200"],"شيبسي بطاطس كبير":["🍟","#FF6200"],"دوريتوس جبنة":["🧀","#FF6200"],"شيتوس":["🍟","#FF6200"],"بسكويت أولكر":["🍪","#FF6200"],"بيبسي":["🥤","#FF6200"],"كوكاكولا":["🥤","#FF6200"],"سفن أب":["🥤","#FF6200"],"مياه نستله بيور لايف":["💧","#FF6200"],"عصير جهينة بيور مانجو":["🥭","#FF6200"],"ريد بول":["⚡","#FF6200"],"عصير فريش برتقال":["🍊","#FF6200"],"كاري":["🌿","#FF6200"],"خلطة شاورما":["🌶️","#FF6200"],"نعناع مجفف":["🍃","#FF6200"],"شوكولاتة جلاكسي":["🍫","#FF6200"],"كيت كات":["🍫","#FF6200"],"بسكويت أوريو":["🍪","#FF6200"],"مولتو":["🥐","#FF6200"],"نوتيلا":["🍫","#FF6200"],"حلاوة طحينية":["🍯","#FF6200"]};
var CATEMO={'الفاكهة':['🍎','#FF6200'],'الخضار':['🥬','#FF6200'],'البقالة':['🛒','#FF6200'],'الألبان':['🥛','#FF6200'],'المخبوزات':['🍞','#FF6200'],'اللب والمكسرات':['🥜','#FF6200'],'التسالي':['🍟','#FF6200'],'المشروبات':['🥤','#FF6200'],'التوابل والبهارات':['🌶️','#FF6200'],'حلويات':['🍫','#FF6200']};
window.tmFallbackSrc=function(name,cat){var e=EMO[(name||'').trim()]||CATEMO[cat]||['🛒','#FF6200'];var c='3F7D2B';function mix(a){var r=[0,2,4].map(function(i){var v=parseInt(c.substr(i,2),16);return Math.round(255-(255-v)*a)});return 'rgb('+r.join(',')+')'}
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="'+mix(.1)+'"/><circle cx="200" cy="200" r="150" fill="'+mix(.22)+'"/><circle cx="200" cy="200" r="118" fill="#fff"/><text x="200" y="248" font-size="136" text-anchor="middle" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">'+e[0]+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)};
window.tmFallback=function(img){return window.tmFallbackSrc(img.alt,'')};

/* 4) progress bar */
var bar=document.createElement('div');bar.id='fx-bar';document.body.appendChild(bar);
function tick(){var m=document.documentElement.scrollHeight-innerHeight;bar.style.width=(m>0?scrollY/m*100:0)+'%'}
addEventListener('scroll',function(){requestAnimationFrame(tick)},{passive:true});

/* 4a) share catalog pages */
function shares_old(){document.querySelectorAll('.catalog-page:not([data-sh])').forEach(function(p){p.dataset.sh=1;
  var b=document.createElement('button');b.className='fx-share';b.innerHTML='<i class="fas fa-share-nodes"></i> مشاركة';
  b.onclick=function(e){e.stopPropagation();var im=p.querySelector('img'),u=new URL(im.getAttribute('src'),location.href).href,
   txt='شوف عروض '+S_('اسم المتجر','ترولي ماركت')+':\n'+u+'\n'+location.origin;
   if(navigator.share)navigator.share({title:S_('اسم المتجر','ترولي ماركت'),text:txt}).catch(function(){});else window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank')};
  p.appendChild(b)})}

function shares(){}
function shareCatalog(){var u=location.origin+location.pathname+'#catalog',n=S_('اسم المتجر','ترولي ماركت'),tx='شوف مجلة عروض '+n+':\n'+u;
  if(navigator.share)navigator.share({title:'مجلة عروض '+n,text:tx,url:u}).catch(function(){});else window.open('https://wa.me/?text='+encodeURIComponent(tx),'_blank')}
/* 4c) cart: drawer -> full page, floating button */
function cartExtras(){
  var sb=document.getElementById('cart-sidebar');if(!sb||document.getElementById('fx-full'))return;
  var cb=document.getElementById('checkout-btn');
  if(cb)cb.insertAdjacentHTML('beforebegin','<button id="fx-full" type="button" class="fx-fullbtn"><i class="fas fa-clipboard-check"></i> إتمام الطلب</button>');
  document.getElementById('fx-full').onclick=function(){sb.classList.add('fx-full')};
  var mq=window.matchMedia('(max-width:768px)'),ttl=sb.querySelector('.cart-header h3');
  function sync(){var full=sb.classList.contains('fx-full'),open=sb.classList.contains('open');if(ttl)ttl.textContent=sb.classList.contains('fx-full')?'فاتورة الطلب':'سلة المشتريات'}
  new MutationObserver(sync).observe(sb,{attributes:true,attributeFilter:['class']});
  new MutationObserver(function(){if(sb.classList.contains('fx-full')&&!sb.classList.contains('open'))sb.classList.remove('fx-full')}).observe(sb,{attributes:true,attributeFilter:['class']});

}

/* 4d) category colours / icons + page heads */
function catColor(n){var m=(window.TM&&TM.catMeta||{})[n]||{};if(/^#[0-9a-f]{3,8}$/i.test(m.color||''))return m.color;var i=TM.cats.indexOf(n);return COL[(i<0?0:i)%COL.length]}
function catIco(n){var m=(TM.catMeta||{})[n]||{};if(false&&m.img&&/^(data:image\/|https?:|[\w.\-\/%]+$)/i.test(m.img)){var im=document.createElement('img');im.src=m.img;im.alt='';im.className='fx-cico';return im}
  var i=document.createElement('i');i.className='fas fa-'+(m.icon||icon(n))+' fx-cico-i';return i}
function paint(){if(!window.TM||!TM.cats.length)return;
  document.body.classList.toggle('fx-hide-olddesc',S_('إظهار وصف صفحة حول القديم','لا')!=='نعم');
  document.querySelectorAll('.section-header[data-cat]:not([data-pt])').forEach(function(h){h.dataset.pt=1;var n=h.dataset.cat,col=catColor(n);
    var sec=h.closest('.products-section')||h.parentNode;sec.style.setProperty('--acc',col);h.style.setProperty('--hc',col);h.insertBefore(catIco(n),h.firstChild)});
  document.querySelectorAll('.cat-filter-btn:not([data-pt])').forEach(function(b){b.dataset.pt=1;var n=b.dataset.cat||b.textContent.trim();if(TM.cats.indexOf(n)>-1)b.style.setProperty('--fc',catColor(n))})}
function lum(h){h=String(h||'').replace('#','');if(h.length===3)h=h.replace(/(.)/g,'$1$1');var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);if(isNaN(r+g+b))return 0;return(0.299*r+0.587*g+0.114*b)/255}
function ink(c){return lum(c)>0.62?'#FF6200':'#fff'}
function tiles(n,all){var tl=document.createElement('div');tl.className='fx-tiles';
  if(all){var a0=document.createElement('a');a0.className='fx-tile';a0.href='#categories';a0.dataset.cat='';a0.style.setProperty('--tc','#3B3F45');a0.innerHTML='<i class="fas fa-border-all fx-cico-i"></i><span>الكل</span>';tl.appendChild(a0)}
  TM.cats.slice(0,n).forEach(function(c){var a=document.createElement('a');a.className='fx-tile';a.href='#categories/'+encodeURIComponent(c);a.dataset.cat=c;a.style.setProperty('--tc',catColor(c));a.style.setProperty('--ti',ink(catColor(c)));
    a.appendChild(catIco(c));var s=document.createElement('span');s.textContent=(TM.catLabel?TM.catLabel(c):c);a.appendChild(s);if((window.TM_DISABLED||[]).indexOf(c)>-1){a.classList.add('off');var o=document.createElement('em');o.textContent='غير متوفر حاليًا';a.appendChild(o)}tl.appendChild(a)});return tl}
var allFlag=false;
function syncTiles(){var h='';try{h='#'+decodeURIComponent((window.TM&&TM.route)||'')}catch(e){}var cat=h.indexOf('#categories/')===0?h.slice(12):'';
  document.querySelectorAll('.fx-pagehead .fx-tile:not([data-view])').forEach(function(t){var d=t.dataset.cat||'';t.classList.toggle('on',cat?d===cat:d==='')});
  var pc=document.getElementById('page-categories');if(pc)pc.style.setProperty('--pc',cat?catColor(cat):'#FF6200');
  var hint=document.getElementById('fx-cat-hint');if(hint)hint.textContent=cat?'اضغط على القسم تاني عشان ترجع لكل الأقسام':'اختار القسم اللي عايزه وابدأ التسوق';
  var sl=document.querySelector('.sort-bar label');if(sl&&!sl.dataset.fx){sl.dataset.fx=1;sl.innerHTML='<i class="fas fa-arrow-down-wide-short"></i> رتّب حسب'}}
addEventListener('popstate',function(){setTimeout(syncTiles,30)});
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.fx-tile');if(t&&!t.dataset.view&&t.closest('.fx-pagehead')&&t.classList.contains('on')&&t.dataset.cat){e.preventDefault();TM.navigate('categories');return}
  if(t&&!t.dataset.view){allFlag=(t.dataset.cat===''&&!!t.closest('.fx-pagehead'));setTimeout(syncTiles,60)}});
function heads(){if(!window.TM||!TM.cats.length)return;
  [['page-categories','اسم صفحة الأقسام','الأقسام','اختار القسم اللي عايزه وابدأ التسوق',1],['page-catalog','','','',0]].forEach(function(d){
    var p=document.getElementById(d[0]);if(!p||p.querySelector('.fx-pagehead'))return;
    var h=document.createElement('section');h.className='fx-pagehead'+(d[4]?'':' fx-offhead');
    if(d[4]){h.innerHTML='<div><h2></h2><p></p></div>';h.querySelector('h2').textContent=S_(d[1],d[2]);h.querySelector('p').textContent=d[3];h.querySelector('p').id='fx-cat-hint'}
    else h.appendChild(offerTiles());
    if(d[4])h.appendChild(tiles(99,false));p.insertBefore(h,p.firstChild)})}

function offerTiles(){var w=document.createElement('div');w.className='fx-tiles fx-otiles';
  [['mag','العروض','fa-tags'],['bundles','باقات العروض','fa-gift']].forEach(function(x,i){var a=document.createElement('a');a.className='fx-tile'+(i?'':' on');a.setAttribute('role','button');a.tabIndex=0;a.dataset.view=x[0];a.innerHTML='<i class="fas '+x[2]+' fx-cico-i"></i><span>'+x[1]+'</span>';w.appendChild(a)});return w}
function setView(v){var p=document.getElementById('page-catalog');if(!p)return;p.dataset.view=v;p.querySelectorAll('.fx-tile[data-view]').forEach(function(x){x.classList.toggle('on',x.dataset.view===v)})}
function viewFix(){var p=document.getElementById('page-catalog');if(!p)return;var m=!!p.querySelector('.mag2'),b=!!p.querySelector('.bundles'),v=p.dataset.view;
  p.querySelectorAll('.fx-tile[data-view]').forEach(function(x){x.style.display=(x.dataset.view==='mag'?m:b)?'':'none'});
  var row=p.querySelector('.fx-otiles');if(row)row.style.display=(m&&b)?'':'none';
  if(!v||(v==='mag'&&!m&&b)||(v==='bundles'&&!b))setView(m||!b?'mag':'bundles')}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.fx-tile[data-view]');if(t)setView(t.dataset.view)});
document.addEventListener('keydown',function(e){if(e.key!=='Enter')return;var t=e.target.closest&&e.target.closest('.fx-tile[data-view]');if(t)setView(t.dataset.view)});

/* 4b) about page */
function about(){
  var p=document.getElementById('page-about');if(!p||p.querySelector('.ab-wrap')||!window.TM||!TM.products.length)return;
  var n=TM.products.length,c=TM.cats.length,fr=parseFloat(S_('حد التوصيل المجاني',0))||0,cur=S_('رمز العملة','ج');
  var feats=[1,2,3,4].map(function(i){return (S_('ميزة '+i,'')||'').split('|')}).filter(function(f){return f[0]});
  var abs=[['من نحن','قصتنا'],['هدفنا','هدفنا'],['رؤيتنا','رؤيتنا']].map(function(k){return [S_(k[1]+' (عنوان)',k[0]),S_(k[1]+' (نص)','')]}).filter(function(a){return a[1]});
  var w=document.createElement('div');w.className='ab-wrap';
  var h='<div class="ab-stats"><div><b>'+n+'+</b><span>منتج</span></div><div><b>'+c+'</b><span>قسم</span></div><div><b>'+(fr?fr+' '+cur:'24/7')+'</b><span>'+(fr?'توصيل مجاني فوق':'اطلب في أي وقت')+'</span></div></div>';
  h+=(abs.length?'<div class="ab-about">'+abs.map(function(){return '<div class="ab-card"><h3></h3><p></p></div>'}).join('')+'</div>':'')+'<div class="ab-grid">'+feats.map(function(){return '<div class="ab-card"><h3></h3><p></p></div>'}).join('')+'</div>';
  h+=(function(){var st=[1,2,3].map(function(k){return String(S_('خطوة '+k,['اختار منتجاتك','راجع السلة','ابعت الطلب واتساب'][k-1])).trim()}).filter(Boolean);return /^(لا|no)$/i.test(String(S_('إظهار خطوات الطلب','نعم')).trim())||!st.length?'':'<div class="ab-steps">'+st.map(function(t,i){return '<div><i>'+(i+1)+'</i>'+t.replace(/[<>&]/g,'')+'</div>'}).join('')+'</div>'})();
  w.innerHTML=h;
  w.querySelectorAll('.ab-about .ab-card').forEach(function(el,i){el.querySelector('h3').textContent=abs[i][0];el.querySelector('p').textContent=abs[i][1]});
  w.querySelectorAll('.ab-grid .ab-card').forEach(function(el,i){el.querySelector('h3').textContent=feats[i][0];el.querySelector('p').textContent=feats[i][1]||''});
  var ct=p.querySelector('.about-container'),gd=ct&&ct.querySelector('.about-grid');if(ct&&gd)ct.insertBefore(w,gd);else p.insertBefore(w,p.firstChild);arm(p);
}
/* 5) watch dynamic content */
function debounced(f){var t=0;return function(){if(t)return;t=setTimeout(function(){t=0;f()},90)}}
/* كبسولة البحث (من settings: شكل البحث) */
function capsule(){if(!window.TM||!TM.S)return;var mode=S_('شكل البحث','كبسولة');document.body.classList.toggle('fx-sc',mode!=='أيقونة');
  var ac=document.getElementById('app-content');if(!ac)return;var r=ac.querySelector('.search-capsule-row');
  if(!r){r=document.createElement('div');r.className='search-capsule-row';r.innerHTML='<button class="search-capsule" data-action="toggle-search" aria-label="بحث"><i class="fas fa-search"></i><span></span></button>';ac.insertBefore(r,ac.firstChild)}
  var t=r.querySelector('span'),v=S_('نص خانة البحث','ابحث عن منتج...');if(t.textContent!==v)t.textContent=v}
var mo=new MutationObserver(debounced(function(){arm();vids();hero();capsule();heads();about();shares();cartExtras();paint();offers();themeSet();palette();placeBanners();payInit();footer();searchChips();syncTiles();viewFix()}));
function boot(){arm();vids();hero();capsule();tick();mo.observe(document.getElementById('app-content')||document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
var n=0,iv=setInterval(function(){hero();capsule();heads();about();shares();cartExtras();paint();offers();themeSet();palette();placeBanners();payInit();footer();searchChips();viewFix();arm();vids();tick();if(++n>40)clearInterval(iv)},500);
})();
/* ترولي ماركت فيرجن 1 */
