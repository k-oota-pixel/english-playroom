// Shared TARGET1000 phrase-completion questions.
// Meanings in target1000.json are not populated. Do not invent Japanese meanings.
// Create four-choice questions from the exact original phrase, entirely in memory.
const LINK_WORDS=new Set([
  'of','to','in','on','at','by','for','from','with','about','as','upon','into','onto',
  'over','under','after','before','through','against','without','up','down','out','off'
]);
const LINK_OPTIONS=[
  'of','to','in','on','at','by','for','from','with','about','as','upon','into','onto',
  'over','under','after','before','through','against','without','up','down','out','off'
];
const WORD_RE=/[A-Za-z]+(?:'[A-Za-z]+)?/g;
const normalize=text=>String(text).toLowerCase().replace(/\s+/g,' ').trim();
function wordHash(text){
  let hash=2166136261;
  for(const char of String(text)){hash=Math.imul(hash^char.charCodeAt(0),16777619);}
  return hash>>>0;
}
function shuffle(items,random){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

/**
 * Build repeatable, unique question IDs (t1000_0001 etc) from static JSON.
 * Answer choices are original English words, not guessed translations.
 * @param {Array<{id:string,no:number,en:string}>} entries
 * @param {{random?:()=>number}} options
 */
export function buildTarget1000Questions(entries,{random=Math.random}={}){
  if(!Array.isArray(entries))return [];
  const known=new Set(entries.map(row=>normalize(row.en)));
  const contentWords=[...new Set(entries.flatMap(row=>
    [...String(row.en||'').matchAll(WORD_RE)].map(match=>match[0].toLowerCase())
  ))].filter(word=>word.length>=3&&!LINK_WORDS.has(word)).sort();
  const questions=[];
  for(const row of entries){
    const phrase=String(row?.en||'').trim();
    const id=String(row?.id||'');
    if(!/^t1000_\d{4}$/.test(id)||!phrase)continue;
    const tokens=[...phrase.matchAll(WORD_RE)].map(match=>({
      text:match[0],index:match.index,lower:match[0].toLowerCase()
    }));
    // Prefer a preposition/particle, as these test a genuine word partnership.
    // Otherwise conceal the final meaningful word in the idiom.
    const links=tokens.filter(token=>LINK_WORDS.has(token.lower));
    const fallback=tokens.filter(token=>token.lower.length>=3&&
      !['the','and','one','ones','not','have','has','are','you'].includes(token.lower));
    const maskedToken=links.at(-1)||fallback.at(-1);
    if(!maskedToken)continue;
    const correct=maskedToken.text;
    const masked=phrase.slice(0,maskedToken.index)+'(____)'+
      phrase.slice(maskedToken.index+correct.length);
    const pool=LINK_WORDS.has(maskedToken.lower)?LINK_OPTIONS:contentWords;
    const distractors=[];
    // Deterministically walk the candidate pool to minimize recurring trivial options.
    // Exclude variants that are themselves present in the supplied original list.
    const offset=wordHash(id+'|'+phrase)%pool.length;
    for(let step=0;step<pool.length&&distractors.length<3;step++){
      const alternative=pool[(offset+step*37)%pool.length];
      if(alternative===maskedToken.lower||distractors.includes(alternative))continue;
      const altPhrase=phrase.slice(0,maskedToken.index)+alternative+
        phrase.slice(maskedToken.index+correct.length);
      if(known.has(normalize(altPhrase)))continue;
      distractors.push(alternative);
    }
    if(distractors.length<3)continue;
    const options=shuffle([correct,...distractors],random);
    questions.push({
      id,source:'target1000',type:'idiom',no:row.no,
      phrase,question:'ターゲット1000の熟語を完成させよう：'+masked,
      prompt:'ターゲット1000の熟語を完成させよう：'+masked,
      answer:correct,options,correctIndex:options.indexOf(correct),
      choices:options.map((text,i)=>({number:i+1,text})),
      answer_number:options.indexOf(correct)+1,
      tip:'元の表現：'+phrase
    });
  }
  return questions;
}
