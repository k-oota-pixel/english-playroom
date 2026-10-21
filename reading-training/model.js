export const GRADES=['4級','3級','準2級','2級','準1級'];
export function validatePassages(data){
 if(!Array.isArray(data?.passages)||!data.passages.length)throw new Error('教材データを読み取れませんでした。');
 const ids=new Set();for(const p of data.passages){
  if(!p.id||ids.has(p.id)||!GRADES.includes(p.grade)||typeof p.text!=='string'||!p.text.trim()||typeof p.title!=='string'||!Array.isArray(p.questions)||!p.questions.length)throw new Error('長文データに不備があります。');ids.add(p.id);
  for(const q of p.questions)if(!q.question||q.choices?.length!==4||q.choices.some(x=>typeof x!=='string'||!x.trim())||!Number.isInteger(q.answer)||q.answer<1||q.answer>4)throw new Error('問題データに不備があります。');
 }return data.passages;
}
export function judge(question,selected){if(!Number.isInteger(selected)||selected<1||selected>4)throw new Error('選択肢を選んでください。');return selected===question.answer;}
export function nextRandom(pool,previousId,random=Math.random){const candidates=pool.filter(p=>p.id!==previousId);const list=candidates.length?candidates:pool;return list.length?list[Math.min(list.length-1,Math.floor(random()*list.length))]:null;}
export function validFeedback(r){return r&&['excellent','good','partial','needs_work'].includes(r.verdict)&&['main_idea','key_points','accuracy','concision'].every(k=>Number.isInteger(r.scores?.[k])&&r.scores[k]>=0&&r.scores[k]<=3)&&r.total===Object.values(r.scores).reduce((a,b)=>a+b,0)&&['feedback','example'].every(k=>typeof r[k]==='string'&&r[k].trim())&&['good_points','improvements','language_notes'].every(k=>Array.isArray(r[k])&&r[k].every(x=>typeof x==='string'));}
