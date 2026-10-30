import test from 'node:test';
import assert from 'node:assert/strict';
import {alreadyGeneratedToday,mergeDailyNews,validateDailyPayload} from '../today/update-daily-news.mjs';

const text=(n)=>Array.from({length:n},(_,i)=>`word${i+1}`).join(' ');
const article=(id,category,date='2026-10-31')=>({
  id,date,category,categories:[],careerTags:['undecided'],tags:['news'],title:`Story ${id}`,summaryJa:'ニュースの要約です。',
  levels:{
    '4級':{title:'Easy',text:text(60),wordCount:60},
    '3級':{title:'Junior',text:text(90),wordCount:90},
    '準2級':{title:'Pre2',text:text(130),wordCount:130},
    '2級':{title:'Grade2',text:text(190),wordCount:190},
    '準1級':{title:'Pre1',text:text(260),wordCount:260}
  },
  sources:[{name:'Official source',url:`https://example.com/${id}`}]
});
const categories=['world','science','technology','health','sports','culture'];
const payload={generatedAt:'2026-10-31T00:00:00Z',editionDate:'2026-10-31',articles:categories.map((category,i)=>article(`new-${i}`,category))};

test('daily payload requires exactly six stories across at least five categories',()=>{
  assert.equal(validateDailyPayload(payload),payload);
  assert.throws(()=>validateDailyPayload({...payload,articles:payload.articles.slice(0,5)}));
  assert.throws(()=>validateDailyPayload({...payload,articles:payload.articles.map((item)=>({...item,category:'science'}))}));
});

test('daily merge replaces the same edition but keeps older archive stories',()=>{
  const existing={articles:[article('old-same-day','education'),article('older','business','2026-10-30')]};
  const merged=mergeDailyNews(existing,payload,100);
  assert.equal(merged.articles.length,7);
  assert.equal(merged.articles.filter(item=>item.date==='2026-10-31').length,6);
  assert.ok(merged.articles.some(item=>item.id==='older'));
  assert.ok(!merged.articles.some(item=>item.id==='old-same-day'));
  assert.equal(merged.automation.lastSuccessfulEdition,'2026-10-31');
  assert.equal(alreadyGeneratedToday(merged,'2026-10-31'),true);
  assert.equal(alreadyGeneratedToday(merged,'2026-11-01'),false);
});

test('Grade 4 may be concise but still rejects genuinely tiny text',()=>{
  const concise=structuredClone(payload);concise.articles[0].levels['4級']={title:'Concise',text:text(33),wordCount:33};
  assert.equal(validateDailyPayload(concise),concise);
  const tooShort=structuredClone(payload);tooShort.articles[0].levels['4級']={title:'Too short',text:'Tiny story.',wordCount:2};
  assert.throws(()=>validateDailyPayload(tooShort));
});

test('daily payload rejects non-HTTPS sources',()=>{
  const badSource=structuredClone(payload);badSource.articles[0].sources=[{name:'bad',url:'http://example.com/news'}];
  assert.throws(()=>validateDailyPayload(badSource));
});
