export const LEVELS=['5級','4級','3級','準2級','2級','準1級'];
const LEGACY_LEVELS=['4級','3級','準2級','2級','準1級'];

export const CATEGORIES=[
  {id:'world',label:'世界・社会',icon:'🌏'},
  {id:'science',label:'科学',icon:'🔬'},
  {id:'technology',label:'AI・テクノロジー',icon:'🤖'},
  {id:'health',label:'医療・健康',icon:'🩺'},
  {id:'sports',label:'スポーツ',icon:'⚽'},
  {id:'culture',label:'文化・エンタメ',icon:'🎬'},
  {id:'business',label:'経済・ビジネス',icon:'📈'},
  {id:'environment',label:'環境・自然',icon:'🌿'},
  {id:'education',label:'教育・進路',icon:'🎓'},
  {id:'life',label:'暮らし・旅行',icon:'🧳'}
];

export const CAREERS=[
  {id:'medicine',label:'医療・看護・福祉'},
  {id:'education',label:'教育・保育'},
  {id:'science',label:'理学・研究'},
  {id:'engineering',label:'工学・ものづくり'},
  {id:'it',label:'IT・AI'},
  {id:'business',label:'経済・経営'},
  {id:'public',label:'公務員・社会'},
  {id:'global',label:'語学・国際'},
  {id:'sports',label:'スポーツ'},
  {id:'arts',label:'文化・芸術'},
  {id:'undecided',label:'まだ決めていない'}
];

const uniq=list=>[...new Set((Array.isArray(list)?list:[]).filter(Boolean))];
export const countWords=text=>(String(text||'').match(/\b[A-Za-z]+(?:['’-][A-Za-z]+)*\b/g)||[]).length;

export function normalizeProfile(raw={}){
  const level=LEVELS.includes(raw.level)?raw.level:'準2級';
  return {
    level,
    interests:uniq(raw.interests).filter(id=>CATEGORIES.some(c=>c.id===id)).slice(0,5),
    careers:uniq(raw.careers).filter(id=>CAREERS.some(c=>c.id===id)).slice(0,4),
    challenge:raw.challenge==='easy'?'easy':raw.challenge==='challenge'?'challenge':'balanced',
    updatedAt:Number(raw.updatedAt)||0
  };
}

export function recommendedLevel(profile,article,behavior={}){
  const p=normalizeProfile(profile);
  const feedback=behavior?.difficulty?.[article.id];
  let index=LEVELS.indexOf(p.level);
  if(feedback==='easy')index++;
  if(feedback==='hard')index--;
  if(p.challenge==='easy')index--;
  if(p.challenge==='challenge')index++;
  return LEVELS[Math.max(0,Math.min(LEVELS.length-1,index))];
}

function tagMatch(values,tags){
  const hay=new Set([...(tags||[])]);
  return (values||[]).filter(x=>hay.has(x)).length;
}

export function scoreArticle(article,profile,behavior={},now=Date.now()){
  const p=normalizeProfile(profile);
  const categories=[article.category,...(article.categories||[])];
  const interestMatches=tagMatch(p.interests,categories);
  const careerMatches=tagMatch(p.careers,article.careerTags||[]);
  const categoryReads=Number(behavior?.categoryReads?.[article.category])||0;
  const totalReads=Math.max(1,Object.values(behavior?.categoryReads||{}).reduce((a,b)=>a+(Number(b)||0),0));
  const behaviorAffinity=Math.min(1,categoryReads/Math.max(2,totalReads*.35));
  const published=Date.parse(article.date)||now;
  const ageDays=Math.max(0,(now-published)/86400000);
  const freshness=Math.max(0,1-ageDays/14);
  const explored=categoryReads===0?1:Math.max(0,1-categoryReads/4);
  const alreadyRead=behavior?.read?.[article.id]?1:0;
  return (
    Math.min(1,interestMatches/1)*35+
    behaviorAffinity*25+
    Math.min(1,careerMatches/1)*20+
    freshness*10+
    explored*10-
    alreadyRead*8
  );
}

export function recommendationReason(article,profile,behavior={}){
  const p=normalizeProfile(profile);
  const categories=[article.category,...(article.categories||[])];
  const category= CATEGORIES.find(c=>c.id===article.category)?.label||'この分野';
  if(tagMatch(p.careers,article.careerTags||[])>0)return `進路の関心とつながる「${category}」の記事です`;
  if(tagMatch(p.interests,categories)>0)return `興味に選んだ「${category}」の記事です`;
  if((Number(behavior?.categoryReads?.[article.category])||0)>0)return `最近よく読んでいる「${category}」から選びました`;
  return `新しい分野にも出会える「${category}」の記事です`;
}

export function rankArticles(articles,profile,behavior={},limit=6,now=Date.now()){
  const ranked=[...(articles||[])].map((article,index)=>({article,index,score:scoreArticle(article,profile,behavior,now)}))
    .sort((a,b)=>b.score-a.score||a.index-b.index);
  if(limit>=ranked.length)return ranked.map(x=>x.article);

  // Keep discovery alive: reserve one slot for a category the learner rarely reads.
  const chosen=ranked.slice(0,limit).map(x=>x.article);
  const rare=ranked.find(x=>(Number(behavior?.categoryReads?.[x.article.category])||0)===0&&!chosen.includes(x.article));
  if(rare)chosen[chosen.length-1]=rare.article;
  return [...new Map(chosen.map(a=>[a.id,a])).values()];
}

export function validateArticle(article){
  if(!article||typeof article.id!=='string'||typeof article.title!=='string'||typeof article.date!=='string')return false;
  if(!CATEGORIES.some(c=>c.id===article.category))return false;
  if(!article.levels)return false;
  const requiredLevels=article.levels['5級']?LEVELS:LEGACY_LEVELS;
  if(requiredLevels.some(level=>typeof article.levels[level]?.text!=='string'||!article.levels[level].text.trim()))return false;
  if(!Array.isArray(article.sources)||!article.sources.length)return false;
  return true;
}
