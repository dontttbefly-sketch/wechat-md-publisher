import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadArticle, validateArticle } from '../src/article.js';
import { deriveShortTitle, extractCoverPoints } from '../src/guizang-cover.js';

test('deriveShortTitle prefers cover_short_title frontmatter', () => {
  assert.equal(
    deriveShortTitle('从调研到落地：一次 Vibe Coding 自动化项目复盘', 'AI 草稿流'),
    'AI 草稿流',
  );
});

test('deriveShortTitle compresses a long title into a readable square cover title', () => {
  const shortTitle = deriveShortTitle('从调研到落地：一次 Vibe Coding 自动化项目复盘');

  assert.equal(shortTitle, 'Vibe Coding 复盘');
  assert.ok(shortTitle.length <= 14);
});

test('extractCoverPoints uses up to three h2 headings', () => {
  const body = [
    '# 标题',
    '',
    '正文',
    '',
    '## 1. 初始问题',
    '内容',
    '',
    '## 2. 示例表格',
    '内容',
    '',
    '## 3. 示例代码',
    '内容',
    '',
    '## 4. 结论',
  ].join('\n');

  assert.deepEqual(extractCoverPoints(body), ['初始问题', '示例表格', '示例代码']);
});

test('extractCoverPoints falls back to workflow points when h2 headings are missing', () => {
  assert.deepEqual(extractCoverPoints('# 只有一级标题\n\n正文'), [
    'Markdown 输入',
    'Guizang 封面',
    '微信草稿',
  ]);
});

test('validateArticle can skip original cover validation while keeping other checks', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wechat-md-article-'));
  const articlePath = path.join(dir, 'missing-cover.md');
  writeFileSync(
    articlePath,
    [
      '---',
      'title: "测试文章"',
      'digest: "用于验证跳过原始封面检查"',
      'cover: "./missing.png"',
      '---',
      '',
      '# 测试文章',
    ].join('\n'),
    'utf8',
  );

  const article = loadArticle(articlePath);
  assert.deepEqual(validateArticle(article, { requireCover: false }).errors, []);
  assert.match(validateArticle(article).errors.join('\n'), /封面图不存在/);
});
