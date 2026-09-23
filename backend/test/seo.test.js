// Public SEO guides (/learn). Content integrity + rendering. The guides read no
// data, but seoController imports config/db.js, so it's mocked like everywhere else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, fakeRes } from './helpers.js';

mockDb(createFakeDb());

const { GUIDES, getGuide } = await import('../content/guides.js');
const { guideHtml, guideIndexHtml } = await import('../controllers/seoController.js');

// Phrases the product must never use (spec §32).
const BANNED = ['guaranteed winner', 'guaranteed profit', 'guaranteed return', 'risk-free', 'definitely buy', 'certain to rise'];
const allText = (g) => [g.title, g.description, g.intro, ...g.sections.flatMap((s) => [s.h2, s.html]), ...g.faqs.flat()].join(' ');

test('guides: the ten topics from the spec are all present', () => {
  const expected = [
    'how-to-analyze-a-stock', 'how-to-screen-stocks-for-swing-trading', 'how-to-analyze-ngx-stocks',
    'how-to-analyze-us-stocks', 'fundamental-vs-technical-analysis', 'how-to-find-undervalued-stocks',
    'best-indicators-for-swing-trading', 'how-to-evaluate-pe-ratio', 'how-to-evaluate-roe',
    'how-to-build-a-stock-watchlist',
  ];
  assert.deepEqual(GUIDES.map((g) => g.slug).sort(), expected.sort());
});

test('guides: unique slugs, and every related link points at a real guide', () => {
  const slugs = GUIDES.map((g) => g.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const g of GUIDES) {
    assert.match(g.slug, /^[a-z0-9-]+$/, g.slug);
    for (const r of g.related) assert.ok(getGuide(r), `${g.slug} → missing related guide "${r}"`);
    assert.ok(!g.related.includes(g.slug), `${g.slug} links to itself`);
  }
});

test('guides: internal /learn links inside the content all resolve', () => {
  for (const g of GUIDES) {
    for (const [, slug] of allText(g).matchAll(/href="\/learn\/([a-z0-9-]+)"/g)) {
      assert.ok(getGuide(slug), `${g.slug} links to unknown guide "${slug}"`);
    }
  }
});

test('guides: search snippets are a sensible length', () => {
  for (const g of GUIDES) {
    assert.ok(g.title.length <= 65, `${g.slug}: title is ${g.title.length} chars`);
    assert.ok(g.description.length >= 110 && g.description.length <= 170, `${g.slug}: description is ${g.description.length} chars`);
  }
});

test('guides: substantial, with FAQs and a valid review date', () => {
  for (const g of GUIDES) {
    assert.ok(g.sections.length >= 4, `${g.slug}: only ${g.sections.length} sections`);
    assert.ok(g.faqs.length >= 2, `${g.slug}: needs at least 2 FAQs`);
    assert.match(g.updated, /^\d{4}-\d{2}-\d{2}$/);
    const words = allText(g).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 500, `${g.slug}: only ${words} words (thin page)`);
  }
});

test('guides: no banned promissory language', () => {
  for (const g of GUIDES) {
    const text = allText(g).toLowerCase();
    for (const phrase of BANNED) assert.ok(!text.includes(phrase), `${g.slug} contains "${phrase}"`);
  }
});

test('guideHtml: renders a guide with metadata and structured data', () => {
  const res = fakeRes();
  guideHtml({ params: { slug: 'how-to-evaluate-roe' } }, res);
  assert.equal(res.statusCode, 200);
  const html = res.body;
  assert.match(html, /<h1>How to Evaluate Return on Equity \(ROE\)<\/h1>/);
  assert.match(html, /<link rel="canonical" href="[^"]*\/learn\/how-to-evaluate-roe" \/>/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /<nav class="toc"/);
  assert.ok(!html.includes('{{APP}}'), 'app link token was replaced');
  assert.equal((html.match(/<h1>/g) || []).length, 1, 'exactly one h1');
});

test('guideHtml: unknown guide → 404', () => {
  const res = fakeRes();
  guideHtml({ params: { slug: 'no-such-guide' } }, res);
  assert.equal(res.statusCode, 404);
});

test('guideIndexHtml: lists every guide', () => {
  const res = fakeRes();
  guideIndexHtml({}, res);
  assert.equal(res.statusCode, 200);
  for (const g of GUIDES) assert.ok(res.body.includes(`/learn/${g.slug}`), `index missing ${g.slug}`);
});
