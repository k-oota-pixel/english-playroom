import {readFileSync,writeFileSync} from 'node:fs';

function patch(path,fn){const src=readFileSync(path,'utf8');const out=fn(src);if(out===src)throw new Error(`no changes: ${path}`);writeFileSync(path,out,'utf8');}

patch('today/model.js',s=>{
  s=s.replace("export const LEVELS=['4級','3級','準2級','2級','準1級'];","export const LEVELS=['5級','4級','3級','準2級','2級','準1級'];\nconst LEGACY_LEVELS=['4級','3級','準2級','2級','準1級'];");
  s=s.replace("  if(!article.levels||LEVELS.some(level=>typeof article.levels[level]?.text!=='string'||!article.levels[level].text.trim()))return false;","  if(!article.levels)return false;\n  const requiredLevels=article.levels['5級']?LEVELS:LEGACY_LEVELS;\n  if(requiredLevels.some(level=>typeof article.levels[level]?.text!=='string'||!article.levels[level].text.trim()))return false;");
  return s;
});

patch('today/app.js',s=>{
  s=s.replace("from './model.js?v=1.0.0';","from './model.js?v=1.1.0';");
  s=s.replace("fetch('./news.json?v=2026-10-31'","fetch('./news.json?v=2026-10-31-eiken5'");
  s=s.replace('<span class="badge">4級〜準1級</span>','<span class="badge">5級〜準1級</span>');
  s=s.replace("function openArticle(id){\n  const article=articles.find(a=>a.id===id);if(!article)return;current=article;currentLevel=recommendedLevel(profile,article,behavior);recordOpen(article);renderArticle();window.scrollTo({top:0,behavior:'smooth'});\n}","function openArticle(id){\n  const article=articles.find(a=>a.id===id);if(!article)return;\n  current=article;\n  const suggested=recommendedLevel(profile,article,behavior);\n  currentLevel=article.levels[suggested]?.text?suggested:(LEVELS.find(level=>article.levels[level]?.text)||'4級');\n  recordOpen(article);renderArticle();window.scrollTo({top:0,behavior:'smooth'});\n}");
  s=s.replace("  const cat=categoryInfo(current.category),content=current.levels[currentLevel]||current.levels[profile.level]||current.levels['準2級'];","  const availableLevels=LEVELS.filter(level=>current.levels[level]?.text);\n  if(!current.levels[currentLevel]?.text)currentLevel=availableLevels[0]||'4級';\n  const cat=categoryInfo(current.category),content=current.levels[currentLevel]||current.levels['4級']||current.levels['準2級'];");
  s=s.replace("${LEVELS.map(level=>{const item=current.levels[level],wc=Number(item?.wordCount)||countWords(item?.text||'');return `<button class=\"level ${level===currentLevel?'active':''}\" data-level=\"${level}\">${level}<small>${wc} words</small></button>`;}).join('')}","${availableLevels.map(level=>{const item=current.levels[level],wc=Number(item?.wordCount)||countWords(item?.text||'');return `<button class=\"level ${level===currentLevel?'active':''}\" data-level=\"${level}\">${level}<small>${wc} words</small></button>`;}).join('')}");
  return s;
});

patch('today/index.html',s=>s.replace('./app.js?v=1.0.0','./app.js?v=1.1.0'));

patch('today/update-daily-news.mjs',s=>{
  s=s.replace("const LEVELS=['4級','3級','準2級','2級','準1級'];","const LEVELS=['5級','4級','3級','準2級','2級','準1級'];");
  s=s.replace("const LEVEL_LIMITS={\n  '4級':[20,130],","const LEVEL_LIMITS={\n  '5級':[15,100],\n  '4級':[20,130],");
  return s;
});

patch('tests/today-daily-update.test.js',s=>{
  s=s.replace("  levels:{\n    '4級':{title:'Easy',text:text(60),wordCount:60},","  levels:{\n    '5級':{title:'Starter',text:text(45),wordCount:45},\n    '4級':{title:'Easy',text:text(60),wordCount:60},");
  s=s.replace("  concise.articles[0].levels={\n    '4級':{title:'Easy',text:text(33),wordCount:33},","  concise.articles[0].levels={\n    '5級':{title:'Starter',text:text(25),wordCount:25},\n    '4級':{title:'Easy',text:text(33),wordCount:33},");
  s=s.replace("  const tooShort=structuredClone(payload);tooShort.articles[0].levels['4級']={title:'Too short',text:'Tiny story.',wordCount:2};","  const tooShort=structuredClone(payload);tooShort.articles[0].levels['5級']={title:'Too short',text:'Tiny story.',wordCount:2};");
  s += `\ntest('new TODAY payloads require an Eiken Grade 5 version',()=>{\n  const missing=structuredClone(payload);\n  delete missing.articles[0].levels['5級'];\n  assert.throws(()=>validateDailyPayload(missing));\n});\n`;
  return s;
});
