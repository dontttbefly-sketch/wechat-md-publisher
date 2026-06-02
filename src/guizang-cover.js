import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_POINTS = ['Markdown 输入', 'Guizang 封面', '微信草稿'];
const VALID_ACCENTS = new Set(['ikb', 'lemon-yellow', 'lemon-green', 'safety-orange']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanText(value) {
  return String(value || '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHeading(value) {
  return cleanText(value)
    .replace(/^第?[一二三四五六七八九十\d]+[章节步部分阶段、.．:：-]\s*/u, '')
    .replace(/^[一二三四五六七八九十\d]+[、.．:：-]\s*/u, '')
    .trim();
}

function splitTitle(title) {
  return cleanText(title)
    .replace(/[「」《》“”"']/g, '')
    .split(/[：:，,｜|／/\\-]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function compactTitleCandidate(value) {
  return cleanText(value)
    .replace(/^一次\s*/u, '')
    .replace(/自动化项目/g, '')
    .replace(/自动化/g, '')
    .replace(/项目/g, '')
    .replace(/教程/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveShortTitle(title, override = '') {
  const manual = cleanText(override);
  if (manual) return manual;

  const normalized = cleanText(title);
  if (!normalized) return '微信草稿';

  if (/Vibe\s*Coding/i.test(normalized) && /复盘/.test(normalized)) {
    return 'Vibe Coding 复盘';
  }
  if (/AI/i.test(normalized) && /草稿/.test(normalized)) {
    return 'AI 草稿流';
  }

  const parts = splitTitle(normalized);
  const tail = compactTitleCandidate(parts.at(-1) || normalized);
  if (tail.length <= 14) return tail;

  const withoutPreamble = compactTitleCandidate(
    tail
      .replace(/^从.+?到/u, '')
      .replace(/^如何/u, '')
      .replace(/^为什么/u, ''),
  );
  if (withoutPreamble.length > 0 && withoutPreamble.length <= 14) return withoutPreamble;

  const chineseChunks = withoutPreamble.match(/[\u4e00-\u9fffA-Za-z0-9]+/gu) || [];
  const compact = chineseChunks.join(' ').replace(/\s+/g, ' ').trim();
  return compact.length <= 14 ? compact : compact.slice(0, 12);
}

export function extractCoverPoints(markdown, limit = 3) {
  const points = [];
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    const match = line.match(/^##\s+(?!#)(.+)$/);
    if (!match) continue;
    const point = cleanHeading(match[1]);
    if (!point) continue;
    points.push(point);
    if (points.length >= limit) break;
  }

  return points.length ? points : DEFAULT_POINTS;
}

function articleSlug(articlePath) {
  const base = path.basename(articlePath, path.extname(articlePath));
  const slug = base
    .normalize('NFKC')
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'article';
}

function accentFor(article) {
  const accent = cleanText(article.meta.guizangAccent);
  return VALID_ACCENTS.has(accent) ? accent : 'ikb';
}

function buildCoverModel(article) {
  const points = extractCoverPoints(article.body);
  return {
    title: cleanText(article.meta.title),
    digest: cleanText(article.meta.digest),
    shortTitle: deriveShortTitle(article.meta.title, article.meta.coverShortTitle),
    kicker: cleanText(article.meta.guizangKicker) || 'WeChat Draft · Guizang Cover',
    accent: accentFor(article),
    points,
    slug: articleSlug(article.path),
    author: cleanText(article.meta.author),
    dateLabel: new Date().toISOString().slice(0, 10),
  };
}

function renderPointTags(points) {
  return points
    .map((point, index) => `<span><b>0${index + 1}</b>${escapeHtml(point)}</span>`)
    .join('\n');
}

function coverHtml(model) {
  return `<!doctype html>
<html lang="zh-CN" data-accent="${escapeHtml(model.accent)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(model.title)} · Guizang WeChat Cover</title>
  <style>
    :root,
    [data-accent="ikb"] {
      --paper: #fafaf8;
      --ink: #0a0a0a;
      --grey-1: #f0f0ee;
      --grey-2: #d4d4d2;
      --grey-3: #737373;
      --accent: #002FA7;
      --accent-on: #ffffff;
    }
    [data-accent="lemon-yellow"] {
      --paper: #fafaf8;
      --ink: #0a0a0a;
      --grey-1: #f0f0ee;
      --grey-2: #d4d4d2;
      --grey-3: #737373;
      --accent: #FFD500;
      --accent-on: #0a0a0a;
    }
    [data-accent="lemon-green"] {
      --paper: #fafaf8;
      --ink: #0a0a0a;
      --grey-1: #f0f0ee;
      --grey-2: #d4d4d2;
      --grey-3: #737373;
      --accent: #C5E803;
      --accent-on: #0a0a0a;
    }
    [data-accent="safety-orange"] {
      --paper: #fafaf8;
      --ink: #0a0a0a;
      --grey-1: #f0f0ee;
      --grey-2: #d4d4d2;
      --grey-3: #737373;
      --accent: #FF6B35;
      --accent-on: #ffffff;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: #1a1a1a;
      color: var(--ink);
      font-family: Inter, "Helvetica Neue", Helvetica, "Noto Sans SC", -apple-system, "PingFang SC", "Microsoft YaHei UI", sans-serif;
      padding: 64px 32px;
      -webkit-font-smoothing: antialiased;
    }
    .sheet { display: flex; flex-direction: column; align-items: center; gap: 48px; }
    .poster { position: relative; overflow: hidden; background: var(--paper); color: var(--ink); isolation: isolate; }
    .poster.wide { width: 2100px; height: 900px; }
    .poster.square { width: 1080px; height: 1080px; }
    .content { position: relative; z-index: 1; height: 100%; padding: 88px 104px; }
    .chrome-min {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 18px;
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 24px;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .cover-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.04fr) minmax(0, .96fr);
      gap: 88px;
      height: calc(100% - 48px);
      padding-top: 46px;
    }
    .title-block { display: flex; flex-direction: column; min-width: 0; }
    .kicker {
      width: fit-content;
      max-width: 100%;
      padding: 12px 18px;
      background: var(--accent);
      color: var(--accent-on);
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 24px;
      line-height: 1.1;
      margin: 0 0 30px;
    }
    .wide-title {
      font-size: 76px;
      line-height: 1.08;
      font-weight: 300;
      letter-spacing: 0;
      margin: 0;
      max-width: 820px;
    }
    .digest {
      margin: 28px 0 0;
      font-size: 28px;
      line-height: 1.46;
      color: var(--grey-3);
      max-width: 820px;
    }
    .point-strip {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: auto;
      padding-top: 28px;
    }
    .point-strip span {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 54px;
      border: 1.5px solid var(--ink);
      padding: 10px 16px;
      font-size: 22px;
      line-height: 1.15;
      background: rgba(255,255,255,.34);
    }
    .point-strip b {
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 18px;
      font-weight: 500;
      color: var(--accent);
    }
    .system-card {
      align-self: stretch;
      border: 2px solid var(--ink);
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,.045) 1px, transparent 1px),
        linear-gradient(180deg, rgba(0,0,0,.045) 1px, transparent 1px),
        var(--grey-1);
      background-size: 42px 42px;
    }
    .system-head {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid var(--ink);
      padding: 22px 26px;
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 22px;
      line-height: 1.2;
    }
    .pipeline {
      display: grid;
      grid-template-columns: 1fr 72px 1fr 72px 1fr;
      align-items: center;
      gap: 0;
      padding: 54px 38px;
    }
    .node {
      min-height: 210px;
      border: 2px solid var(--ink);
      background: var(--paper);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px;
    }
    .node.is-accent { background: var(--accent); color: var(--accent-on); }
    .node .num {
      margin: 0;
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 24px;
      line-height: 1;
    }
    .node .label {
      margin: 0;
      font-size: 35px;
      line-height: 1.14;
      font-weight: 300;
    }
    .arrow {
      height: 2px;
      background: var(--ink);
      position: relative;
    }
    .arrow::after {
      content: "";
      position: absolute;
      right: -2px;
      top: 50%;
      width: 16px;
      height: 16px;
      border-top: 2px solid var(--ink);
      border-right: 2px solid var(--ink);
      transform: translateY(-50%) rotate(45deg);
      background: transparent;
    }
    .system-foot {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border-top: 2px solid var(--ink);
    }
    .metric {
      padding: 22px 26px;
      border-right: 2px solid var(--ink);
    }
    .metric:last-child { border-right: 0; }
    .metric .big { margin: 0; font-size: 42px; line-height: 1; font-weight: 300; }
    .metric .lbl {
      margin: 8px 0 0;
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 18px;
      color: var(--grey-3);
      line-height: 1.2;
    }
    .square .content {
      padding: 92px;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }
    .square-title {
      align-self: center;
      justify-self: center;
      margin: 0;
      max-width: 860px;
      text-align: center;
      font-size: 144px;
      line-height: 1.04;
      font-weight: 250;
      letter-spacing: 0;
    }
    .square-mark {
      position: absolute;
      right: 92px;
      bottom: 92px;
      width: 188px;
      height: 188px;
      background: var(--accent);
      color: var(--accent-on);
      display: grid;
      place-items: center;
      font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
      font-size: 28px;
      line-height: 1.1;
      text-align: center;
    }
    .square .chrome-min { font-size: 22px; }
    .pair-preview {
      width: 2400px;
      min-height: 1180px;
      background: #e7e7e4;
      padding: 78px;
      display: grid;
      grid-template-columns: 1fr 560px;
      gap: 54px;
      align-items: center;
    }
    .preview-wide,
    .preview-square {
      background: var(--paper);
      border: 2px solid #0a0a0a;
      overflow: hidden;
      box-shadow: 0 18px 60px rgba(0,0,0,.18);
    }
    .preview-wide { aspect-ratio: 21 / 9; }
    .preview-square { aspect-ratio: 1 / 1; }
    .preview-wide img,
    .preview-square img { width: 100%; height: 100%; object-fit: cover; display: block; }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="poster wide" id="wechat-21x9">
      <div class="content">
        <div class="chrome-min">
          <span>${escapeHtml(model.kicker)}</span>
          <span>${escapeHtml(model.dateLabel)}</span>
        </div>
        <div class="cover-grid">
          <div class="title-block">
            <p class="kicker">Markdown to WeChat</p>
            <h1 class="wide-title">${escapeHtml(model.title)}</h1>
            <p class="digest">${escapeHtml(model.digest)}</p>
            <div class="point-strip">
              ${renderPointTags(model.points)}
            </div>
          </div>
          <div class="system-card">
            <div class="system-head">
              <span>ONE-CLICK FLOW</span>
              <span>${escapeHtml(model.author || 'Author')}</span>
            </div>
            <div class="pipeline">
              <div class="node">
                <p class="num">01</p>
                <p class="label">Markdown<br>Article</p>
              </div>
              <div class="arrow"></div>
              <div class="node is-accent">
                <p class="num">02</p>
                <p class="label">Guizang<br>Cover</p>
              </div>
              <div class="arrow"></div>
              <div class="node">
                <p class="num">03</p>
                <p class="label">WeChat<br>Draft</p>
              </div>
            </div>
            <div class="system-foot">
              <div class="metric">
                <p class="big">21:9</p>
                <p class="lbl">MAIN COVER</p>
              </div>
              <div class="metric">
                <p class="big">1:1</p>
                <p class="lbl">SQUARE PREVIEW</p>
              </div>
              <div class="metric">
                <p class="big">0 API</p>
                <p class="lbl">DRY-RUN SAFE</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="poster square" id="wechat-1x1">
      <div class="content">
        <div class="chrome-min">
          <span>Guizang · Square</span>
          <span>${escapeHtml(model.dateLabel)}</span>
        </div>
        <h1 class="square-title">${escapeHtml(model.shortTitle)}</h1>
        <div></div>
      </div>
      <div class="square-mark">WECHAT<br>COVER</div>
    </section>

    <section class="pair-preview" id="wechat-cover-pair-preview">
      <div class="preview-wide"><img src="output/wechat-21x9-cover.png" alt="21:9 cover"></div>
      <div class="preview-square"><img src="output/wechat-1x1-cover.png" alt="1:1 cover"></div>
    </section>
  </main>
</body>
</html>`;
}

async function launchBrowser(chromium) {
  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const launchOptions = {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  };

  if (fs.existsSync(systemChrome)) {
    return chromium.launch({ ...launchOptions, executablePath: systemChrome });
  }
  return chromium.launch(launchOptions);
}

async function screenshotTargets(indexPath, outputDir) {
  const { chromium } = await import('playwright');
  const browser = await launchBrowser(chromium);
  try {
    const context = await browser.newContext({
      viewport: { width: 2500, height: 1500 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const posterTargets = [
      ['#wechat-21x9', 'wechat-21x9-cover.png'],
      ['#wechat-1x1', 'wechat-1x1-cover.png'],
    ];

    const images = {};
    for (const [selector, filename] of posterTargets) {
      const element = await page.locator(selector);
      const outPath = path.join(outputDir, filename);
      await element.screenshot({ path: outPath });
      images[filename] = outPath;
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const previewPath = path.join(outputDir, 'wechat-cover-pair-preview.png');
    await page.locator('#wechat-cover-pair-preview').screenshot({ path: previewPath });
    images['wechat-cover-pair-preview.png'] = previewPath;

    await context.close();
    return images;
  } finally {
    await browser.close();
  }
}

export async function generateGuizangCover(article, options = {}) {
  const model = buildCoverModel(article);
  const rootDir = options.rootDir || process.cwd();
  const taskDir = path.join(rootDir, '.guizang', model.slug);
  const outputDir = path.join(taskDir, 'output');
  const indexPath = path.join(taskDir, 'index.html');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(indexPath, coverHtml(model), 'utf8');
  const images = await screenshotTargets(indexPath, outputDir);

  return {
    taskDir,
    outputDir,
    indexPath,
    model,
    coverPath: images['wechat-21x9-cover.png'],
    squarePath: images['wechat-1x1-cover.png'],
    pairPreviewPath: images['wechat-cover-pair-preview.png'],
  };
}
