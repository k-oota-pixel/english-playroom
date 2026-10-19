import { LISTENING_META } from './data.js';

export function validateQuestions(questions, meta = LISTENING_META) {
  if (!Array.isArray(questions) || questions.length !== meta.total) {
    throw new Error('教材の問題数が一致しません。');
  }
  const ids = new Set();
  const counts = {};
  for (const q of questions) {
    const spoken = q.choiceMode === 'spoken';
    if (!q.id || ids.has(q.id) || !(q.level in meta.counts) ||
        !Array.isArray(q.dialogue) || !q.dialogue.length ||
        q.dialogue.some(line => typeof line !== 'string' || !line.trim()) ||
        !['spoken', 'visual'].includes(q.choiceMode) ||
        !Array.isArray(q.choices) || q.choices.length !== (spoken ? 3 : 4) ||
        q.choices.some(choice => typeof choice !== 'string' || !choice.trim()) ||
        !Number.isInteger(q.answer) || q.answer < 1 || q.answer > q.choices.length ||
        !Number.isFinite(q.start) || !Number.isFinite(q.end) || q.start < 0 || q.end <= q.start ||
        typeof q.audio !== 'string' || !/^(https:\/\/|audio\/)[^\s]+$/.test(q.audio) ||
        (!spoken && (typeof q.question !== 'string' || !q.question.trim())) ||
        (q.level === '3' && q.part === 1 &&
          (!q.image || (!q.image.src && (!q.image.key || !Number.isInteger(q.image.index) || q.image.index < 0 || q.image.index > 9))))) {
      throw new Error(`教材の項目が不正です: ${q.id || 'IDなし'}`);
    }
    ids.add(q.id);
    counts[q.level] = (counts[q.level] || 0) + 1;
  }
  for (const [level, count] of Object.entries(meta.counts)) {
    if (counts[level] !== count) throw new Error(`級ごとの教材数が一致しません: ${level}`);
  }
  return questions;
}

export async function loadListeningQuestions(packed, meta = LISTENING_META) {
  if (typeof packed !== 'string' || packed.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(packed)) {
    throw new Error('圧縮教材に欠落または省略された箇所があります。完全な元データが必要です。');
  }
  const binary = atob(packed);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return validateQuestions(JSON.parse(await new Response(stream).text()), meta);
}
