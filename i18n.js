// 語言切換：中文寫在頁面裡當原文，英文放 en.js，用中文原文當鍵去查，查不到就顯示原文
import { EN } from './en.js?v=133';

const param = new URLSearchParams(location.search).get('lang');
let saved = null;
try {
  if (param) localStorage.setItem('lang', param === 'en' ? 'en' : 'zh');
  saved = localStorage.getItem('lang');
} catch (e) {}
export const lang = (param || saved) === 'en' ? 'en' : 'zh';

export const t = s => lang === 'en' ? EN[s] ?? s : s;

// 把一段畫面換成英文：有 data-i18n 的整段連標籤一起換，其他只換文字和說明屬性
export function localize(root = document.body) {
  if (lang !== 'en') return;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.innerHTML.trim()); });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('script, style')) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const s = n.nodeValue.trim();
    if (s && EN[s] !== undefined) n.nodeValue = n.nodeValue.replace(s, EN[s]);
  });
  root.querySelectorAll('[aria-label], [alt]').forEach(el => {
    for (const a of ['aria-label', 'alt']) if (el.hasAttribute(a)) el.setAttribute(a, t(el.getAttribute(a)));
  });
}

const root = document.documentElement;
if (lang === 'en') {
  root.lang = 'en';
  document.title = t(document.title);
  document.querySelectorAll('meta[name="description"], meta[property^="og:title"], meta[property^="og:description"]').forEach(m => { m.content = t(m.content); });
  localize();
}

// 導覽列右上角的切換鈕，布幕字是要切過去的語言
// 手機的導覽列放不下全名，顯示簡寫（樣式在 style.css）
const next = lang === 'en' ? 'zh' : 'en', label = next === 'en' ? 'English' : '繁體中文', short = next === 'en' ? 'EN' : '中文';
const btn = document.createElement('button');
btn.className = 'pill lang';
btn.type = 'button';
btn.lang = next === 'en' ? 'en' : 'zh-Hant';
btn.setAttribute('aria-label', label);
btn.innerHTML = `<span class="lang-full">${label}</span><span class="lang-short">${short}</span>`;
btn.addEventListener('click', () => {
  try { localStorage.setItem('lang', next); } catch (e) {}
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  history.replaceState(null, '', url);
  const go = () => location.reload();
  window.wipeTo ? window.wipeTo(label.toUpperCase(), go) : go();
});
document.querySelector('.nav .group.right')?.append(btn);
root.classList.remove('en-wait');
