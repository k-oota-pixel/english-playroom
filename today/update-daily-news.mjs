import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateArticle,countWords} from './model.js';

const BACKEND_URL='https://task-quest.onrender.com';
const OIDC_AUDIENCE='monstudy-today-daily';
const LEVELS=['4級','3級','準2級','2級','準1級'];
const LEVEL_LIMITS={
  '4級':[30,130],
  '3級':[55,190],
  '準2級':[85,250],
  '2級':[125,350],
  '準1級':[170,500]
};
const MAX_ARCHIVE_ARTICLES=540; // About 90 days at six stories per day.

function cleanDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';}
function safeHttps(value){try{const url=new URL(String(value||''));return url.protocol==='https:';}catch{return false;}}
function sizeOf(value){return Buffer.byteLength(JSON.stringify(value),'utf8');}
export function japanDateKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function alreadyGeneratedToday(existing,dateKey=japanDateKey()){
  return existing?.automation?.lastSuccessfulEdition===dateKey;
}

export function validateDailyPayload(payload){
  if(!payload||typeof payload!=='object')throw new Error('TODAY生成結果がありません。');
  const editionDate=cleanDate(payload.editionDate);if(!editionDate)throw new Error('TODAYの日付が不正です。');
  if(!Array.isArray(payload.articles)||payload.articles.length!==6)throw new Error('TODAYは6記事である必要があります。');
  const ids=new Set();const categories=new Set();
  for(const article of payload.articles){
    if(!validateArticle(article))throw new Error('TODAYの記事形式が不正です。');
    if(article.date!==editionDate)throw new Error('TODAYの記事の日付が一致しません。');
    if(ids.has(article.id))throw new Error('TODAYの記事IDが重複しています。');ids.add(article.id);categories.add(article.category);
    if(sizeOf(article)>40_000)throw new Error(`TODAYの記事が大きすぎます: ${article.id}`);
    if(article.sources.length>4||article.sources.some(source=>!source?.name||!safeHttps(source?.url)))throw new Error(`TODAYの出典が不正です: ${article.id}`);
    for(const level of LEVELS){
      const words=Number(article.levels[level]?.wordCount)||countWords(article.levels[level]?.text||'');
      const [min,max]=LEVEL_LIMITS[level];
      if(words<min||words>max)throw new Error(`TODAY ${article.id} ${level} の語数が想定範囲外です: ${words}`);
    }
  }
  if(categories.size<5)throw new Error('TODAYの6記事は5分野以上に分散させてください。');
  return payload;
}

export function mergeDailyNews(existing,payload,maxArticles=MAX_ARCHIVE_ARTICLES){
  validateDailyPayload(payload);
  const old=Array.isArray(existing?.articles)?existing.articles.filter(validateArticle):[];
  const editionDate=payload.editionDate;
  const incomingIds=new Set(payload.articles.map(article=>article.id));
  const preserved=old.filter(article=>article.date!==editionDate&&!incomingIds.has(article.id));
  const articles=[...payload.articles,...preserved]
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.id).localeCompare(String(b.id)))
    .slice(0,maxArticles);
  return {
    generatedAt:String(payload.generatedAt||new Date().toISOString()),
    editionDate,
    automation:{version:1,dailyCount:6,maxArchiveArticles:maxArticles,lastSuccessfulEdition:editionDate},
    articles
  };
}

async function getGithubOidcToken(){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('GitHub Actions OIDCが利用できません。');
  const url=new URL(requestUrl);url.searchParams.set('audience',OIDC_AUDIENCE);
  const response=await fetch(url,{headers:{Authorization:`Bearer ${requestToken}`},signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error(`GitHub Actions OIDCを取得できません: HTTP ${response.status}`);
  const data=await response.json();if(!data?.value)throw new Error('GitHub Actions OIDCトークンが空です。');return data.value;
}

async function warmBackend(){
  try{
    const response=await fetch(`${BACKEND_URL}/api/status`,{signal:AbortSignal.timeout(120_000),cache:'no-store'});
    console.log(`TODAY backend warm-up: HTTP ${response.status}`);
    try{await response.text();}catch{}
  }catch(error){console.warn('TODAY backend warm-up did not complete:',error?.message||error);}
}

async function generateDailyNews(token){
  const response=await fetch(`${BACKEND_URL}/api/today/generate`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','User-Agent':'monstudy-today-daily'},
    body:JSON.stringify({force:process.env.TODAY_FORCE==='1'}),
    signal:AbortSignal.timeout(360_000)
  });
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(`TODAY生成API: HTTP ${response.status} ${String(data?.error||'').slice(0,300)}`);
  return validateDailyPayload(data);
}

export async function run({newsPath=fileURLToPath(new URL('./news.json',import.meta.url))}={}){
  let existing={articles:[]};try{existing=JSON.parse(await readFile(newsPath,'utf8'));}catch(error){if(error?.code!=='ENOENT')throw error;}
  const today=japanDateKey();
  if(process.env.TODAY_FORCE!=='1'&&alreadyGeneratedToday(existing,today)){
    console.log(`TODAY ${today}: already generated successfully; skipping this retry window.`);
    return existing;
  }
  await warmBackend();
  const token=await getGithubOidcToken();
  const payload=await generateDailyNews(token);
  const merged=mergeDailyNews(existing,payload);
  await writeFile(newsPath,JSON.stringify(merged,null,2)+'\n','utf8');
  console.log(`TODAY ${payload.editionDate}: ${payload.articles.length} new stories; archive ${merged.articles.length} stories.`);
  for(const article of payload.articles)console.log(`- [${article.category}] ${article.title}`);
  return merged;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  run().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
}
