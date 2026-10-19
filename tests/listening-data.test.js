import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { loadListeningQuestions, validateQuestions } from '../listening-training/loader.js';
import { Q_3_2020_2 } from '../listening-training/q-3-2020-2.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const meta = { total: 20, counts: { '3': 20 } };
test('preserved 2020-2 data passes schema and compression round trip', async () => {
  const packed = gzipSync(JSON.stringify(Q_3_2020_2)).toString('base64');
  assert.deepEqual(await loadListeningQuestions(packed, meta), Q_3_2020_2);
});
test('ellipsized data is rejected with a useful error', async () => {
  await assert.rejects(loadListeningQuestions('AAAA[... ELLIPSIZATION ...]AAAA'), /欠落/);
});
test('truncated gzip never becomes an accepted dataset', async () => {
  const packed = gzipSync(JSON.stringify(Q_3_2020_2)).subarray(0, 100).toString('base64');
  await assert.rejects(loadListeningQuestions(packed, meta));
});
test('duplicate IDs, incorrect answers and invalid audio bounds are rejected', () => {
  for (const change of [q => q[1].id = q[0].id, q => q[0].answer = 4,
    q => q[0].end = q[0].start, q => q[0].image.index = 10]) {
    const questions = structuredClone(Q_3_2020_2);
    change(questions);
    assert.throws(() => validateQuestions(questions, meta), /不正/);
  }
});
test('a total of 335 alone cannot hide an incorrect level distribution', () => {
  assert.throws(() => validateQuestions(Q_3_2020_2, { total: 20, counts: { '3': 19, pre2: 1 } }), /級ごと/);
});

test('the actual page leaves the loading screen when data is broken', async () => {
  const html = readFileSync(new URL('../listening-training/index.html', import.meta.url), 'utf8');
  assert.match(html, /import \{validateQuestions\} from '.\/loader.js'/);
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*;\r?\n/gm, '');
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { hidden: true,
      addEventListener() {}, classList: { remove() {} } });
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => [] },
    console: { error() {} }, validateQuestions,
    PACK_1: '', PACK_2: '', atob() { throw new Error('broken gzip'); },
    IMG_2020_2: '', IMG_2020_3: '', IMG_2021_1: '', IMG_2021_2: '', IMG_2021_3: ''
  });
  await vm.runInContext(`(async () => {${script}})()`, context);
  assert.equal(element('#loading').hidden, true);
  assert.equal(element('#errorScreen').hidden, false);
  assert.match(element('#errorText').textContent, /教材データが不完全/);
});
