/**
 * Static vocabulary access for もんすたでぃ.
 * No Firebase read/write. One HTTP fetch per deck per page session.
 */
const SOURCES = Object.freeze({
  target1900: "./target1900.json",
  pre1Advanced: "./pre1-advanced.json",
  target1400: "./target1400.json",
  target1000: "./target1000.json",
  sokutan: "./sokutan.json",
});
const cache = new Map();

/**
 * @param {"target1900"|"target1400"|"target1000"|"sokutan"|"pre1Advanced"} deck
 * @returns {Promise<{schemaVersion:number,deck:string,count:number,entries:Array<{id:string,no:number,en:string,ja:string|null,pos:string|null}>}>}
 */
export function loadVocabulary(deck) {
  const path = SOURCES[deck];
  if (!path) return Promise.reject(new Error(`Unknown vocabulary deck: ${deck}`));
  if (!cache.has(deck)) {
    const request = fetch(new URL(path, import.meta.url))
      .then((res) => {
        if (!res.ok) throw new Error(`Vocabulary load failed: ${deck} (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data.entries) || data.count !== data.entries.length) {
          throw new Error(`Invalid vocabulary data: ${deck}`);
        }
        return data;
      })
      .catch((err) => {
        cache.delete(deck); // Retry is possible next time.
        throw err;
      });
    cache.set(deck, request);
  }
  return cache.get(deck);
}

/**
 * Pick non-repeating random vocabulary entries by book number.
 * Only the supplied deck is fetched, then sampling happens in memory.
 */
export async function pickVocabulary(deck, {
  from = 1,
  to = Infinity,
  count = 10,
  requireJapanese = false,
} = {}) {
  const data = await loadVocabulary(deck);
  const eligible = data.entries.filter((word) =>
    word.no >= from && word.no <= to && (!requireJapanese || word.ja)
  );
  const n = Math.min(eligible.length, Math.max(0, Math.floor(count)));
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (eligible.length - i));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, n);
}

export function clearVocabularyCache(deck) {
  if (deck === undefined) cache.clear();
  else cache.delete(deck);
}
