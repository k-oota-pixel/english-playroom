import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../data/vocab/', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(name, base), 'utf8'));

test('pre1 upper-level vocabulary has complete distinct bilingual entries', async () => {
  const [bank, source] = await Promise.all([load('pre1-advanced.json'), load('target1900.json')]);
  assert.equal(bank.schemaVersion, 1);
  assert.equal(bank.deck, 'pre1Advanced');
  assert.equal(bank.levelTag, 'pre1_approx');
  assert.equal(bank.count, 399);
  assert.equal(bank.entries.length, 399);
  assert.deepEqual(bank.source.range, [1501, 1900]);
  assert.deepEqual(bank.source.omittedDuplicates, [{no: 1636, en: 'drown'}]);
  const ids = new Set(), lemmas = new Set();
  for (const word of bank.entries) {
    assert.ok(word.no >= 1501 && word.no <= 1900);
    assert.equal(word.id, `pre1_t1900_${String(word.no).padStart(4, '0')}`);
    assert.equal(word.levelTag, 'pre1_approx');
    assert.ok(['v','n','adj'].includes(word.pos));
    assert.ok(typeof word.en === 'string' && word.en.trim());
    assert.ok(typeof word.ja === 'string' && word.ja.trim());
    assert.ok(!ids.has(word.id), 'duplicate id: ' + word.id);
    assert.ok(!lemmas.has(word.en.toLowerCase()), 'duplicate lemma: ' + word.en);
    ids.add(word.id); lemmas.add(word.en.toLowerCase());
    const original = source.entries.find(x => x.no === word.no);
    assert.ok(original);
    assert.equal(word.en, original.en);
    assert.equal(word.sourceId, original.id);
  }
  const byPos = ['v', 'n', 'adj'].map(pos => bank.entries.filter(x => x.pos === pos));
  for (const group of byPos) {
    assert.ok(new Set(group.map(x => x.ja)).size >= 4, 'not enough distinct glosses for four choices');
  }
});
