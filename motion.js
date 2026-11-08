// 兩頁共用的動畫：平滑捲動、字母浮上、進場、按鈕文字翻轉、游標、卡片傾斜
import { t } from './i18n.js?v=134';
export { t, lang, localize } from './i18n.js?v=134';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

// 簡化預覽：網址加 ?lite 打開、?lite=0 關掉，換頁會記住。作品圖用壓縮過的小圖，專心看整體版面和動畫
const q = new URLSearchParams(location.search);
let liteOn = false;
try {
  if (q.has('lite')) localStorage.setItem('lite', q.get('lite') === '0' ? '' : '1');
  liteOn = localStorage.getItem('lite') === '1';
} catch (e) { liteOn = q.has('lite') && q.get('lite') !== '0'; }
export const lite = liteOn;
if (lite) {
  document.documentElement.classList.add('lite');
  addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('a');
    b.className = 'litebadge pill';
    b.href = '?lite=0';
    b.textContent = t('簡化預覽中・顯示原圖');
    document.body.append(b);
  });
}
// 簡化預覽用壓縮過的小圖（works/s/），省流量也比較不卡
export const pic = src => lite ? src.replace('/t/', '/s/') : src;

// 平滑捲動（Lenis），手機和要求減少動態的人不套
if (!reduce && fine && window.Lenis) {
  const lenis = new Lenis({ lerp: 0.1 });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]:not([data-wipe-top])');
    if (a && a.getAttribute('href').length > 1) { e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { offset: -66 }); }
  });
  window.lenis = lenis;
}

// 從別頁點到某一區：瀏覽器自己的跳轉不會落到定位，內容建好和全部載入後各對齊一次
const jumpTo = document.getElementById(location.hash.slice(1));
if (jumpTo) {
  const jump = () => {
    const root = document.documentElement, y = jumpTo.getBoundingClientRect().top + scrollY - document.querySelector('.nav').offsetHeight;
    root.style.scrollBehavior = 'auto';
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo(0, y);
    requestAnimationFrame(() => { root.style.scrollBehavior = ''; });
  };
  jump();
  addEventListener('load', jump);
}

// 平滑捲到某個位置（有 Lenis 交給它，手機用瀏覽器內建的）
export function smoothTo(y) {
  if (window.lenis) window.lenis.scrollTo(y);
  else scrollTo({ top: y, behavior: 'smooth' });
}

// 手機：點畫面空白處或文字就跳到下一項；點連結、按鈕和選取文字時不跳
export function tapNext(next) {
  const phone = matchMedia('(max-width: 860px)');
  document.addEventListener('click', e => {
    if (phone.matches && !e.target.closest('a, button, summary, input, textarea, select, label') && !String(getSelection())) next(e);
  });
}

// 底部目錄：底線停在目前的段落（current 回傳第幾項，-1 表示都不是）；滑過別項時先移過去，離開再回來
export function pageIndex(nav, current) {
  const links = [...nav.querySelectorAll('a, button')], line = nav.appendChild(document.createElement('i'));
  let hover = null, queued = false;
  function place() {
    queued = false;
    const el = hover || links[current()];
    if (!el) { line.style.opacity = 0; return; }
    // 量文字本身，不含項目前面的分隔點和字尾的字距
    const r = document.createRange();
    r.selectNodeContents(el);
    const box = r.getBoundingClientRect(), ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    const set = () => { line.style.transform = `translateX(${box.left - nav.getBoundingClientRect().left}px)`; line.style.width = box.width - ls + 'px'; };
    // 從沒有底線到有底線：直接出現在那一項，不從別的地方滑過來
    if (line.style.opacity !== '1') { line.style.transition = 'opacity .3s'; set(); line.offsetWidth; line.style.transition = ''; line.style.opacity = 1; }
    else set();
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(place); } };
  if (fine) links.forEach(el => {
    el.addEventListener('mouseenter', () => { hover = el; queue(); });
    el.addEventListener('mouseleave', () => { hover = null; queue(); });
  });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  document.fonts?.ready.then(queue);
  queue();
}

// 大標拆成一個個字，進畫面時一個字接一個字從上面掉進來
export function splitChars(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  let i = 0;
  el.innerHTML = [...text].map(c =>
    /\s/.test(c) ? '<span class="sp"> </span>' : `<span class="ch" aria-hidden="true"><span style="--i:${i++}">${c}</span></span>`).join('');
  el.classList.add('split');
}
document.querySelectorAll('[data-split]').forEach(splitChars);

// 膠囊按鈕：滑過時文字往上翻出一模一樣的一行
document.querySelectorAll('.pill').forEach(p => {
  if (p.querySelector('.roll')) return;
  const t = p.innerHTML;
  p.innerHTML = `<span class="roll"><span>${t}</span><span aria-hidden="true">${t}</span></span>`;
});

// 手機導覽選單：點選項、點選單外面或按 Esc 就收起來
const navMenu = document.querySelector('.nav-menu');
if (navMenu) {
  document.addEventListener('click', e => {
    if (!navMenu.open) return;
    if (!navMenu.contains(e.target)) { navMenu.open = false; e.stopImmediatePropagation(); }   // 這一下只用來收選單，不算點畫面
    else if (e.target.closest('a')) navMenu.open = false;
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') navMenu.open = false; });
}

// 進場：有 data-rv 的東西捲進畫面才出現；同一批一起出現的依序錯開
const io = new IntersectionObserver(entries => {
  let n = 0;
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.style.setProperty('--d', `${(n++) * 70}ms`);
    e.target.classList.add('in');
    io.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
export const reveal = el => reduce ? el.classList.add('in') : io.observe(el);
document.querySelectorAll('[data-rv], .split').forEach(reveal);

// 游標：芥末黃小圓點，跟得慢一點；指到能點的東西會變大
if (fine && !reduce) {
  const dot = document.createElement('div');
  dot.className = 'cursor';
  document.body.append(dot);
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  let running = false;
  const loop = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    dot.style.transform = `translate(${cx}px, ${cy}px)`;
    running = Math.abs(x - cx) + Math.abs(y - cy) > 0.3;
    if (running) requestAnimationFrame(loop);
  };
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY; dot.classList.add('on');
    if (!running) { running = true; requestAnimationFrame(loop); }
  });
  document.addEventListener('pointerleave', () => dot.classList.remove('on'));
  document.addEventListener('pointerover', e => dot.classList.toggle('big', !!e.target.closest('a, button, .item')));
}

// 卡片跟著滑鼠微微傾斜
export function tilt(el, max = 6) {
  if (!fine || reduce) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateY(-4px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

// 換頁轉場（兩個方向相同）：點站內連結時霧沙玻璃布幕由下往上蓋住，換到新頁後再往上收走
if (!reduce) {
  const wipe = document.createElement('div');
  wipe.className = 'wipe';
  wipe.innerHTML = '<b></b>';
  // 布幕上的字：點哪裡就顯示哪裡，一個字母一格才能分別動
  const setLabel = t => { wipe.firstChild.innerHTML = [...t].map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i>`).join(''); };
  const LABELS = { about: 'ABOUT', career: 'CAREER', works: 'DESIGNS', contact: 'CONTACT' };
  const labelFor = u => u.pathname.endsWith('/works.html') ? 'MY DESIGNS' : u.pathname.endsWith('/marketing.html') ? 'MARKETING' : LABELS[u.hash.slice(1)] || 'LEE YUNYUN';
  document.body.append(wipe);
  const root = document.documentElement;
  let came = '';
  try { came = sessionStorage.getItem('wipe') || ''; sessionStorage.removeItem('wipe'); } catch (e) {}
  if (came) {
    // 字是這一頁的名稱。等內容建好才收布幕，建內容的工作才不會卡在動畫途中；背景也先停，資源讓給轉場
    setLabel(came);
    wipe.classList.add('cover');
    root.classList.remove('wipesheet');   // 布幕元素接手，先前的那層玻璃馬上拿掉
    root.classList.add('busy');
    const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('wipefadein'); root.classList.remove('wipecover');
      wipe.classList.replace('cover', 'out');
      setTimeout(() => { root.classList.remove('wipefadein', 'busy'); }, 1300);
    }));
    let done = false;
    const once = () => { if (!done) { done = true; reveal(); } };
    addEventListener('contentready', once, { once: true });
    setTimeout(once, 450);   // 內容太慢也不要讓字一直停著
  }
  // 蓋上布幕再換頁（切換語言也用這個）
  const wipeTo = window.wipeTo = (label, go) => {
    try { sessionStorage.setItem('wipe', label); } catch (err) {}
    setLabel(label);
    wipe.classList.remove('out'); wipe.classList.add('in');
    root.classList.add('wipefade', 'busy');
    setTimeout(go, 780);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    // 布幕上的字是點到的那一區
    wipeTo(labelFor(url), () => { location.href = url.href; });
  });
  // 回到置頂：布幕蓋住時直接跳回最上面，再把布幕收走
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-wipe-top]');
    if (!a) return;
    e.preventDefault();
    wipeTo(a.dataset.wipeTop, () => {
      try { sessionStorage.removeItem('wipe'); } catch (err) {}
      root.style.scrollBehavior = 'auto';   // 網站預設是平滑捲動，這裡要一次跳到位，布幕收起時才不會看到畫面在捲
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true, force: true });
      else scrollTo(0, 0);
      requestAnimationFrame(() => { root.style.scrollBehavior = ''; });
      root.classList.remove('wipefade');
      root.classList.add('wipefadein');
      wipe.classList.replace('in', 'out');
      setTimeout(() => root.classList.remove('wipefadein', 'busy'), 1300);
    });
  });
  // 按上一頁回來時，瀏覽器可能直接拿快取的畫面，布幕要收掉
  addEventListener('pageshow', e => { if (e.persisted) { wipe.classList.remove('in', 'cover'); root.classList.remove('wipecover', 'wipesheet', 'wipefade', 'busy'); } });
}

// 背景：鏽紅色帶像液體慢慢流動。滑鼠划過時用小網格的流體模擬推動水流，顏色被水流帶著走、捲成漩渦，再慢慢平靜。
// 畫面只算六分之一解析度；滑鼠在動時每秒 30 張，沒動時 15 張且不跑模擬，轉場中暫停
(() => {
  const cv = document.createElement('canvas');
  cv.id = 'fluid'; cv.setAttribute('aria-hidden', 'true');
  const opt = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' };
  const gl2 = cv.getContext('webgl2', opt);
  const gl = gl2 || cv.getContext('webgl', opt);
  if (!gl) return;   // 不支援時留 body 的純鏽紅底
  const canSim = !!(gl2 && gl2.getExtension('EXT_color_buffer_float'));   // 不支援就只有慢慢流動，滑鼠不帶動
  document.body.prepend(cv);

  const VS = 'attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  const HEAD = 'precision highp float;varying vec2 uv;';
  const prog = fs => {
    const pr = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, HEAD + fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(pr, s);
    }
    gl.bindAttribLocation(pr, 0, 'a');
    gl.linkProgram(pr);
    const U = {};
    for (let i = 0, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i < n; i++) {
      const name = gl.getActiveUniform(pr, i).name; U[name] = gl.getUniformLocation(pr, name);
    }
    return { pr, U };
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // 最後畫到畫面的色帶。off 是水流累積的位移，色帶照著它取色，就像被水帶走
  const show = prog(`uniform vec2 res;uniform float t;uniform sampler2D off,vel;
vec3 ramp(float v){ // 色票：Rust、Spice、Terracotta、Pumpkin、Amber
  vec3 c = mix(vec3(.50,.20,.11), vec3(.60,.26,.15), smoothstep(.0,.4,v));
  c = mix(c, vec3(.68,.31,.20), smoothstep(.42,.72,v));
  c = mix(c, vec3(.75,.37,.17), smoothstep(.72,.92,v));
  return mix(c, vec3(.82,.47,.21), smoothstep(.92,1.,v));
}
void main(){
  vec2 p = uv * vec2(res.x / res.y, 1.) + texture2D(off, uv).xy;
  p = p * 1.75 + vec2(1.7,.4);
  for (int i = 0; i < 4; i++) { float k = float(i);
    p += .62 * vec2(sin(p.y * 1.25 + t * .9 + k * 1.3), cos(p.x * 1.1 - t * .7 + k * 2.1)); }
  float a = .5 + .5 * sin((p.x + p.y * .8) * 2.4 + t * .5);
  float b = .5 + .5 * sin(p.x * 3.1 - p.y * 1.7 - t * .35);
  float v = smoothstep(.08,.95, a * .68 + b * .32);
  float wake = min(1., length(texture2D(vel, uv).xy) * 1.1);   // 水流快的地方亮一點，像水面反光
  gl_FragColor = vec4(ramp(min(1., v + wake * .16)), 1.);
}`);

  const blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const bindTex = (unit, tex, loc) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); };

  let P, W, H, vel, prs, off, div, crl, asp = 1;
  if (canSim) P = {
    advect: prog(`uniform sampler2D v,s;uniform float dt,keep,asp;void main(){
      gl_FragColor = keep * texture2D(s, uv - dt * texture2D(v, uv).xy * vec2(1. / asp, 1.));}`),
    // 帶著走的位移：這一格的內容來自水流上游，再多記一段位移
    carry: prog(`uniform sampler2D v,s;uniform vec2 px;uniform float dt,keep,asp;void main(){
      vec2 f = texture2D(v, uv).xy, q = uv - dt * f * vec2(1. / asp, 1.);
      // 和周圍平均一點（擴散），再限制總位移，攪再久也是大片滑順的水流，不會碎成斑點
      vec2 o = mix(texture2D(s, q).xy, .25 * (texture2D(s, q + vec2(px.x, 0.)).xy + texture2D(s, q - vec2(px.x, 0.)).xy
        + texture2D(s, q + vec2(0., px.y)).xy + texture2D(s, q - vec2(0., px.y)).xy), .35);
      o = keep * (o - dt * f);
      float l = length(o);
      gl_FragColor = vec4(o * min(1., .32 / max(l, .0001)), 0., 1.);}`),
    splat: prog(`uniform sampler2D s;uniform vec2 pt,f;uniform float r,asp;void main(){
      vec2 d = (uv - pt) * vec2(asp, 1.);
      gl_FragColor = texture2D(s, uv) + vec4(f * exp(-dot(d, d) / r), 0., 0.);}`),
    curl: prog(`uniform sampler2D v;uniform vec2 px;void main(){
      gl_FragColor = vec4(.5 * (texture2D(v, uv + vec2(px.x, 0.)).y - texture2D(v, uv - vec2(px.x, 0.)).y
        - texture2D(v, uv + vec2(0., px.y)).x + texture2D(v, uv - vec2(0., px.y)).x));}`),
    // 把快消失的小漩渦補回來，水才會一直捲
    swirl: prog(`uniform sampler2D v,c;uniform vec2 px;uniform float dt,amt;void main(){
      float L = texture2D(c, uv - vec2(px.x, 0.)).x, R = texture2D(c, uv + vec2(px.x, 0.)).x;
      float B = texture2D(c, uv - vec2(0., px.y)).x, T = texture2D(c, uv + vec2(0., px.y)).x, C = texture2D(c, uv).x;
      vec2 n = vec2(abs(T) - abs(B), abs(R) - abs(L));
      n = n / (length(n) + .0001) * vec2(1., -1.) * C * amt;
      gl_FragColor = vec4(texture2D(v, uv).xy + n * dt, 0., 1.);}`),
    div: prog(`uniform sampler2D v;uniform vec2 px;void main(){
      gl_FragColor = vec4(.5 * (texture2D(v, uv + vec2(px.x, 0.)).x - texture2D(v, uv - vec2(px.x, 0.)).x
        + texture2D(v, uv + vec2(0., px.y)).y - texture2D(v, uv - vec2(0., px.y)).y));}`),
    jacobi: prog(`uniform sampler2D p,d;uniform vec2 px;void main(){
      gl_FragColor = vec4(.25 * (texture2D(p, uv + vec2(px.x, 0.)).x + texture2D(p, uv - vec2(px.x, 0.)).x
        + texture2D(p, uv + vec2(0., px.y)).x + texture2D(p, uv - vec2(0., px.y)).x - texture2D(d, uv).x));}`),
    grad: prog(`uniform sampler2D v,p;uniform vec2 px;void main(){
      vec2 g = .5 * vec2(texture2D(p, uv + vec2(px.x, 0.)).x - texture2D(p, uv - vec2(px.x, 0.)).x,
        texture2D(p, uv + vec2(0., px.y)).x - texture2D(p, uv - vec2(0., px.y)).x);
      gl_FragColor = vec4(texture2D(v, uv).xy - g, 0., 1.);}`)
  };
  const target = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl2.RGBA16F, W, H, 0, gl.RGBA, gl2.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb };
  };
  const pair = () => { let a = target(), b = target(); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; } }; };

  const size = () => {
    cv.width = Math.max(2, Math.ceil(innerWidth / 6)); cv.height = Math.max(2, Math.ceil(innerHeight / 6));
    asp = innerWidth / innerHeight;
    if (!canSim) return;
    H = 64; W = Math.max(8, Math.round(H * asp));
    vel = pair(); prs = pair(); off = pair(); div = target(); crl = target();
  };
  const pass = (p, fb, set) => {
    gl.useProgram(p.pr);
    set(p.U);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // 滑鼠：每一張累積走了多少，換算成推水的力
  const DT = 1 / 30, REACH = 0.007;   // 影響範圍約一根手指寬
  let mx = null, my = 0, px0 = null, py0 = 0, active = -1e9;
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight;
    active = performance.now();
  }, { passive: true });

  function simulate() {
    gl.viewport(0, 0, W, H);
    const tx = [1 / W, 1 / H];
    // 推水：一段路分幾點推，水流才是連續的
    if (mx !== null && px0 !== null && (mx !== px0 || my !== py0)) {
      const dx = (mx - px0) * asp, dy = my - py0, n = Math.min(4, 1 + Math.floor(Math.hypot(dx, dy) / 0.07));
      for (let i = 1; i <= n; i++) {
        const fx = Math.max(-1.1, Math.min(1.1, dx / DT / n * .42)), fy = Math.max(-1.1, Math.min(1.1, dy / DT / n * .42));
        pass(P.splat, vel.w.fb, U => {
          bindTex(0, vel.r.tex, U.s);
          gl.uniform2f(U.pt, px0 + (mx - px0) * i / n, py0 + (my - py0) * i / n);
          gl.uniform2f(U.f, fx, fy); gl.uniform1f(U.r, REACH); gl.uniform1f(U.asp, asp);
        });
        vel.swap();
      }
    }
    px0 = mx; py0 = my;
    pass(P.curl, crl.fb, U => { bindTex(0, vel.r.tex, U.v); gl.uniform2f(U.px, tx[0], tx[1]); });
    pass(P.swirl, vel.w.fb, U => { bindTex(0, vel.r.tex, U.v); bindTex(1, crl.tex, U.c); gl.uniform2f(U.px, tx[0], tx[1]); gl.uniform1f(U.dt, DT); gl.uniform1f(U.amt, 3); });
    vel.swap();
    // 水不能憑空多出來或消失，這一步才會自然形成繞流和漩渦
    pass(P.div, div.fb, U => { bindTex(0, vel.r.tex, U.v); gl.uniform2f(U.px, tx[0], tx[1]); });
    for (let i = 0; i < 12; i++) {
      pass(P.jacobi, prs.w.fb, U => { bindTex(0, prs.r.tex, U.p); bindTex(1, div.tex, U.d); gl.uniform2f(U.px, tx[0], tx[1]); });
      prs.swap();
    }
    pass(P.grad, vel.w.fb, U => { bindTex(0, vel.r.tex, U.v); bindTex(1, prs.r.tex, U.p); gl.uniform2f(U.px, tx[0], tx[1]); });
    vel.swap();
    pass(P.advect, vel.w.fb, U => { bindTex(0, vel.r.tex, U.v); bindTex(1, vel.r.tex, U.s); gl.uniform1f(U.dt, DT); gl.uniform1f(U.keep, 0.972); gl.uniform1f(U.asp, asp); });
    vel.swap();
    pass(P.carry, off.w.fb, U => { bindTex(0, vel.r.tex, U.v); bindTex(1, off.r.tex, U.s); gl.uniform2f(U.px, tx[0], tx[1]); gl.uniform1f(U.dt, DT); gl.uniform1f(U.keep, 0.972); gl.uniform1f(U.asp, asp); });
    off.swap();
  }

  const draw = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.useProgram(show.pr);
    gl.uniform2f(show.U.res, cv.width, cv.height);
    gl.uniform1f(show.U.t, reduce ? 12 : Date.now() / 9000 % 10000);   // 用實際時間，換頁後色帶才接得上
    bindTex(0, canSim ? off.r.tex : blank, show.U.off);
    bindTex(1, canSim ? vel.r.tex : blank, show.U.vel);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  size();
  addEventListener('resize', () => { size(); draw(); });
  if (reduce) return draw();
  let prev = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || (prev && document.documentElement.classList.contains('busy'))) return;   // 第一張一定要畫
    // 水要好幾秒才會平靜，這段時間模擬繼續跑；之後只剩緩慢流動
    const stirring = canSim && now - active < 9000;
    if (now - prev < (stirring ? 32 : 66)) return;
    prev = now;
    if (stirring) simulate();
    draw();
  })(0);
})();
