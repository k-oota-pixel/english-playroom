import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const write=(path,text)=>fs.writeFileSync(path,text,'utf8');
const replaceOnce=(text,oldText,newText,label)=>{
  if(!text.includes(oldText))throw new Error(`${label} not found`);
  return text.replace(oldText,newText);
};

const jsPath='pet-adventure/online-battle.js';
let js=read(jsPath);
js=replaceOnce(
  js,
  "function gradeLevel(grade){return ({'4級':'junior1','3級':'junior2','準2級':'junior3','2級':'high1'})[grade]||'junior1';}",
  "function gradeLevel(grade){return ({'4級':'4','3級':'3','準2級':'pre2','2級':'2'})[grade]||'4';}",
  'grade mapping'
);
const loader=`async function loadQuestionPool(){
 try{
  const response=await fetch('https://k-oota-pixel.github.io/word-breaker/eiken_vocab_master.json?v=1.0.0',{cache:'force-cache'}),payload=await response.json(),source=payload?.grades||{},rows=[];
  for(const grade of ['4','3','pre2','2']){
   const items=source?.[grade]?.words||[];
   for(const [i,item] of items.entries()){
    const word=String(item?.word||'').trim(),meaning=(Array.isArray(item?.answers)?item.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||String(item?.meaning||'').trim();
    if(word&&meaning)rows.push({id:grade+'-'+(item.id||i),level:grade,word,meaning});
   }
  }
  if(!['4','3','pre2','2'].every(grade=>rows.filter(q=>q.level===grade).length>=4))throw new Error('級別語彙データが不足しています。');
  questionPool=rows;
 }catch(e){
  console.warn('online battle question load failed',e);
  questionPool=[
   {id:'f4-1',level:'4',word:'apple',meaning:'りんご'},{id:'f4-2',level:'4',word:'book',meaning:'本'},{id:'f4-3',level:'4',word:'water',meaning:'水'},{id:'f4-4',level:'4',word:'school',meaning:'学校'},
   {id:'f3-1',level:'3',word:'outside',meaning:'外で'},{id:'f3-2',level:'3',word:'realize',meaning:'気づく'},{id:'f3-3',level:'3',word:'exercise',meaning:'運動'},{id:'f3-4',level:'3',word:'visitor',meaning:'訪問者'},
   {id:'fp2-1',level:'pre2',word:'include',meaning:'含む'},{id:'fp2-2',level:'pre2',word:'achieve',meaning:'達成する'},{id:'fp2-3',level:'pre2',word:'maintain',meaning:'維持する'},{id:'fp2-4',level:'pre2',word:'audience',meaning:'観客'},
   {id:'f2-1',level:'2',word:'potential',meaning:'可能性'},{id:'f2-2',level:'2',word:'threaten',meaning:'脅かす'},{id:'f2-3',level:'2',word:'quantity',meaning:'量'},{id:'f2-4',level:'2',word:'accomplish',meaning:'成し遂げる'}
  ];
 }
}`;
const start=js.indexOf('async function loadQuestionPool(){');
const endMarker="\n\n$('refreshBtn')";
const end=js.indexOf(endMarker,start);
if(start<0||end<0)throw new Error('loadQuestionPool block not found');
js=js.slice(0,start)+loader+js.slice(end);
write(jsPath,js);

const htmlPath='pet-adventure/online-battle.html';
let html=read(htmlPath);
html=replaceOnce(html,'./online-battle.js?v=2.3.46','./online-battle.js?v=2.3.46-eiken1','online battle cache query');
write(htmlPath,html);

const vbPath='version-badge-v176.js';
let vb=read(vbPath);
vb=replaceOnce(vb,"const APP_VERSION='2.3.45';","const APP_VERSION='2.3.46';",'APP_VERSION');
write(vbPath,vb);

const indexPath='index.html';
let index=read(indexPath);
index=replaceOnce(index,'version-badge-v176.js?v=2.3.45','version-badge-v176.js?v=2.3.46','version badge cache query');
index=replaceOnce(index,"const version = '2.3.45';","const version = '2.3.46';",'visible version');
write(indexPath,index);
