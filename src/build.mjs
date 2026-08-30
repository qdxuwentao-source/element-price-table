// build.mjs — 每日价格更新构建脚本
// 用法：node src/build.mjs
// 1) 读取上次快照 data.json（避免获取失败时价格回退）
// 2) 从公开接口获取当日价格（金/银/铂/钯/铜，gold-api.com；Yahoo 兜底）
// 3) 重新生成自包含的 index.html 与 data.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ELEMENTS, BASE_PRICES, BASE_DATE } from './base-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const CSS = readFileSync(path.join(here, 'style.css'), 'utf8');
const APP_JS = readFileSync(path.join(here, 'app.js'), 'utf8');
const DATA_JSON = path.join(ROOT, 'data.json');

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function fetchJSON(url, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; price-bot/1.0)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------- 合并价格：上次快照优先，保证失败不回退 ----------
let last = {};
if (existsSync(DATA_JSON)) {
  try { last = JSON.parse(readFileSync(DATA_JSON, 'utf8')); } catch (_) { last = {}; }
}
const prices = Object.assign({}, BASE_PRICES, (last.prices || {}));
const today = todayISO();
const live = [];
const notes = [];

// ---------- 1) 人民币汇率 ----------
let cny = 7.15;
try {
  const j = await fetchJSON('https://open.er-api.com/v6/latest/USD');
  if (j && j.rates && j.rates.CNY) { cny = j.rates.CNY; notes.push('USD/CNY=' + cny.toFixed(4)); }
} catch (e) { notes.push('USD/CNY 获取失败，使用默认 7.15'); }

const OZ2G = 31.1034768;
const oz2g = (p) => p * cny / OZ2G;              // 美元/盎司 -> 元/克
const lb2ton = (p) => p * cny * 2204.6226218;    // 美元/磅 -> 元/吨
const ton2ton = (p) => p * cny;                  // 美元/吨 -> 元/吨

// ---------- 2) 主数据源：gold-api.com（无密钥）----------
const goldApi = {
  XAU: { el: 'Au', to: oz2g, unit: '元/克', product: '国际现货价（每日自动更新）' },
  XAG: { el: 'Ag', to: oz2g, unit: '元/克', product: '国际现货价（每日自动更新）' },
  XPT: { el: 'Pt', to: oz2g, unit: '元/克', product: '国际现货价（每日自动更新）' },
  XPD: { el: 'Pd', to: oz2g, unit: '元/克', product: '国际现货价（每日自动更新）' },
  HG: { el: 'Cu', to: lb2ton, unit: '元/吨', product: 'COMEX 铜期货（每日自动更新）' },
};
for (const [sym, cfg] of Object.entries(goldApi)) {
  try {
    const j = await fetchJSON('https://api.gold-api.com/price/' + sym);
    if (j && typeof j.price === 'number' && j.price > 0) {
      const v = +cfg.to(j.price).toFixed(2);
      prices[cfg.el] = { v, unit: cfg.unit, product: cfg.product, date: today, src: 'gold-api.com', chg: null, note: '按实时汇率折算；国际行情与国内现货价可能存在价差', live: true };
      live.push(cfg.el);
    }
  } catch (e) { /* 忽略单个失败 */ }
}

// ---------- 3) 兜底：Yahoo Finance（失败自动跳过）----------
const yahoo = {
  'GC=F': { el: 'Au', to: oz2g, unit: '元/克', product: 'COMEX 黄金期货（每日自动更新）' },
  'SI=F': { el: 'Ag', to: oz2g, unit: '元/克', product: 'COMEX 白银期货（每日自动更新）' },
  'PL=F': { el: 'Pt', to: oz2g, unit: '元/克', product: 'NYMEX 铂金期货（每日自动更新）' },
  'PA=F': { el: 'Pd', to: oz2g, unit: '元/克', product: 'NYMEX 钯金期货（每日自动更新）' },
  'HG=F': { el: 'Cu', to: lb2ton, unit: '元/吨', product: 'COMEX 铜期货（每日自动更新）' },
  'ALI=F': { el: 'Al', to: ton2ton, unit: '元/吨', product: 'LME 铝期货（每日自动更新）' },
};
for (const [sym, cfg] of Object.entries(yahoo)) {
  try {
    const j = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1d&range=1d');
    const res = j && j.chart && j.chart.result && j.chart.result[0];
    const p = res && res.meta && res.meta.regularMarketPrice;
    if (typeof p === 'number' && p > 0) {
      const v = +cfg.to(p).toFixed(2);
      prices[cfg.el] = { v, unit: cfg.unit, product: cfg.product, date: today, src: 'Yahoo Finance', chg: null, note: '按实时汇率折算，可能含期货升贴水', live: true };
      if (!live.includes(cfg.el)) live.push(cfg.el);
    }
  } catch (e) { /* 忽略单个失败 */ }
}

// ---------- 4) 生成 index.html ----------
const summary = Object.keys(prices).length;
let appJs = APP_JS.replace('内置参考价（2026-08-28）', '内置参考价（' + today + '）');
const footer = `数据说明：页面内置价格为 <b>${today}</b> 自动构建的公开现货参考价（基础数据 ${BASE_DATE}），来源包括上海金属网、长江有色、SMM（上海有色）、生意社、Mysteel、新华·包头稀土指数、中国氢价指数体系等；金/银/铂/钯/铜 每日自动更新（页面打开时还会联网刷新实时价），其他元素价格以参考价显示。
  价格可能因规格、地区、纯度不同而有差异，且存在滞后，实际交易请以交易所或市场实时报价为准，本页数据不构成投资建议。`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>元素周期表 · 今日价格</title>
<style>
${CSS}
</style>
</head>
<body>
<header>
  <div class="hd-top">
    <h1>元素周期表 <span class="sub">悬停任意元素查看今日现货价格</span></h1>
    <div class="hd-controls">
      <div class="search"><input id="search" type="text" placeholder="搜索元素名称 / 符号，如 Au、金、79" autocomplete="off"><span id="matchCount" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--dim)"></span></div>
      <button class="btn" id="refresh">刷新价格</button>
      <span id="status">加载中…</span>
    </div>
  </div>
</header>
<main>
  <div class="legend"><span class="lg-hint">点击图例可高亮对应元素类别：</span>
    <span class="lg" data-cat="alkali"><span class="dot" style="background:#ff6b6b"></span>碱金属</span>
    <span class="lg" data-cat="alkaline"><span class="dot" style="background:#ffa94d"></span>碱土金属</span>
    <span class="lg" data-cat="transition"><span class="dot" style="background:#ffd43b"></span>过渡金属</span>
    <span class="lg" data-cat="post"><span class="dot" style="background:#8ce99a"></span>后过渡金属</span>
    <span class="lg" data-cat="metalloid"><span class="dot" style="background:#63e6be"></span>类金属</span>
    <span class="lg" data-cat="nonmetal"><span class="dot" style="background:#4dabf7"></span>非金属</span>
    <span class="lg" data-cat="halogen"><span class="dot" style="background:#748ffc"></span>卤素</span>
    <span class="lg" data-cat="noble"><span class="dot" style="background:#b197fc"></span>稀有气体</span>
    <span class="lg" data-cat="lanthanide"><span class="dot" style="background:#f783ac"></span>镧系金属</span>
    <span class="lg" data-cat="actinide"><span class="dot" style="background:#da77f2"></span>锕系金属</span>
  </div>
  <div class="table-wrap">
    <div id="table"></div>
  </div>
  <p style="margin-top:14px;font-size:12px;color:var(--dim)">价格单位：元/克、元/千克、元/吨、元/立方米、美元/磅 等，随元素而异；鼠标悬停单元格可查看规格、日期与来源。数据每日自动更新，本次构建日期：${today}（自动更新：${live.length ? live.join('、') : '无'}）。</p>
</main>
<footer>
  ${footer}
</footer>
<div id="tooltip"></div>
<script>
const ELEMENTS = ${JSON.stringify(ELEMENTS)};
const PRICES = ${JSON.stringify(prices)};
</script>
<script>
${appJs}
</script>
</body>
</html>
`;

writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
writeFileSync(DATA_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), date: today, baseDate: BASE_DATE, liveUpdated: live, notes, prices }, null, 2), 'utf8');
console.log('OK 已生成 index.html (' + Buffer.byteLength(html) + ' bytes)，价格元素数：' + summary);
console.log('本次实时更新：' + (live.length ? live.join('、') : '无') + ' ｜ 汇率 USD/CNY=' + cny.toFixed(4));
console.log('备注：' + notes.join('；'));
