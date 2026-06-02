#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { loadArticle, printValidationResult, validateArticle } from './article.js';
import { loadEnv } from './load-env.js';
import { renderMarkdown, wrapPreviewHtml } from './markdown.js';
import { maskSensitive } from './safety.js';
import { toFileUrl } from './paths.js';
import { addDraft, getAccessToken, uploadArticleImage, uploadCover } from './wechat.js';
import { generateGuizangCover } from './guizang-cover.js';

loadEnv();

function usage() {
  console.log(`Usage:
  npm run check -- articles/sample.md
  npm run preview -- articles/sample.md
  npm run draft -- articles/sample.md
  npm run guizang-cover -- articles/sample.md
  npm run guizang-draft -- articles/sample.md [--dry-run]
`);
}

function ensureOk(article, options = {}) {
  const result = validateArticle(article, options);
  const ok = printValidationResult(result);
  if (!ok) process.exit(1);
  return result;
}

async function commandCheck(filePath) {
  const article = loadArticle(filePath);
  ensureOk(article);
}

async function commandPreview(filePath) {
  const article = loadArticle(filePath);
  ensureOk(article);

  const content = await renderMarkdown(article.body, {
    articlePath: article.path,
    imageResolver: async (image) => toFileUrl(image.absolute),
  });

  const html = wrapPreviewHtml({
    title: article.meta.title,
    content,
  });

  const outDir = path.resolve(process.cwd(), '.preview');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${path.basename(article.path, '.md')}.html`);
  fs.writeFileSync(outPath, html, 'utf8');

  console.log(`Preview generated: ${outPath}`);
}

async function commandDraft(filePath) {
  const article = loadArticle(filePath);
  ensureOk(article);
  await createDraft(article, article.meta.coverPath);
}

async function createDraft(article, coverPath) {
  const accessToken = await getAccessToken();
  const thumbMediaId = await uploadCover(coverPath, accessToken);
  const content = await renderMarkdown(article.body, {
    articlePath: article.path,
    imageResolver: async (image) => uploadArticleImage(image.absolute, accessToken),
  });
  const mediaId = await addDraft(article, content, thumbMediaId, accessToken);

  console.log('Draft created.');
  console.log(`Title: ${article.meta.title}`);
  console.log(`Draft media_id: ${mediaId}`);
  console.log('请到微信公众号后台草稿箱检查内容后再手动发布。');
}

function printGuizangResult(result) {
  console.log(`Guizang cover generated: ${result.taskDir}`);
  console.log(`21:9 cover: ${result.coverPath}`);
  console.log(`1:1 cover: ${result.squarePath}`);
  console.log(`Pair preview: ${result.pairPreviewPath}`);
}

async function commandGuizangCover(filePath) {
  const article = loadArticle(filePath);
  ensureOk(article, { requireCover: false });
  const result = await generateGuizangCover(article);
  printGuizangResult(result);
  return result;
}

async function commandGuizangDraft(filePath, options = {}) {
  const article = loadArticle(filePath);
  ensureOk(article, { requireCover: false });
  const result = await generateGuizangCover(article);
  printGuizangResult(result);

  if (options.dryRun) {
    console.log('Dry run enabled. No WeChat API request was sent.');
    console.log(`Draft title: ${article.meta.title}`);
    console.log(`Cover to upload: ${result.coverPath}`);
    return;
  }

  await createDraft(article, result.coverPath);
}

async function main() {
  const [command, filePath, ...args] = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (!command || !filePath) {
    usage();
    process.exit(1);
  }

  if (command === 'check') return commandCheck(filePath);
  if (command === 'preview') return commandPreview(filePath);
  if (command === 'draft') return commandDraft(filePath);
  if (command === 'guizang-cover') return commandGuizangCover(filePath);
  if (command === 'guizang-draft') return commandGuizangDraft(filePath, { dryRun });

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(maskSensitive(error?.message || error));
  process.exit(1);
});
