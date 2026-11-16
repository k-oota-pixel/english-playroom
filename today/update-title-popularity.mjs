// Export once each morning via the existing TODAY GitHub Actions schedule.
// GitHub Pages serves the aggregate; opening a title collection costs zero Firestore reads.
import fs from 'node:fs/promises';
const ENDPOINT='https://task-quest.onrender.com/api/learning/title-popularity/export';
const AUDIENCE='monstudy-today-daily';
const OUTPUT=new URL('../title-popularity.json',import.meta.url);
const japanHour=date=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date));
const japanDate=date=>date.toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});

export function validPopularityExport(data){
 return data?.schemaVersion===1&&/^\d{4}-\d{2}-\d{2}$/.test(data.asOfDate||'')&&
  Number.isFinite(Date.parse(data.updatedAt))&&Number.isSafeInteger(data.totalRegistered)&&data.totalRegistered>0&&
  Number.isSafeInteger(data.pendingInitializations)&&data.pendingInitializations>=0&&data.pendingInitializations<=data.totalRegistered&&
  data.titles&&typeof data.titles==='object'&&!Array.isArray(data.titles)&&Object.keys(data.titles).length>=100&&
  Object.values(data.titles).every(value=>Number.isSafeInteger(value)&&value>=0&&value<=data.totalRegistered);
}
async function githubOidc(){
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,secret=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!secret)throw Error('GitHub Actions OIDC credentials are missing.');
 const url=new URL(endpoint);url.searchParams.set('audience',AUDIENCE);
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('GitHub OIDC HTTP '+response.status);
 const body=await response.json();if(!body.value)throw Error('GitHub OIDC token is empty.');
 return body.value;
}
export async function run(){
 const current=new Date(),date=japanDate(current);
 if(process.env.GITHUB_EVENT_NAME==='schedule'&&japanHour(current)>=12){
  console.log('Title popularity: afternoon TODAY retry skipped.');
  return {skipped:true,reason:'afternoon'};
 }
 if(process.env.TITLE_POPULARITY_FORCE!=='1'){
  try{
   const previous=JSON.parse(await fs.readFile(OUTPUT,'utf8'));
   if(validPopularityExport(previous)&&previous.asOfDate===date){
    console.log('Title popularity is already current for '+date);
    return {skipped:true,reason:'already-current'};
   }
  }catch(error){if(error.code!=='ENOENT')console.warn('Previous title popularity export unavailable:',error.message);}
 }
 const token=await githubOidc();
 const response=await fetch(ENDPOINT,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(180000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error('Title popularity HTTP '+response.status+': '+String(data.error||'').slice(0,250));
 if(!validPopularityExport(data)||data.asOfDate!==date)throw Error('Incomplete or unexpected daily title popularity snapshot');
 await fs.writeFile(OUTPUT,JSON.stringify(data)+'\n','utf8');
 console.log('Title popularity: '+data.totalRegistered+' registered, '+data.pendingInitializations+' awaiting title initialization.');
 return data;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
}
