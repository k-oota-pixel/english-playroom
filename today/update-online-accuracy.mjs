// One daily export: Firestore 1 document read + RTDB 4 grade-standings reads.
// The resulting JSON is committed to GitHub Pages. No per-player Firebase reads.
import fs from 'node:fs/promises';
const ENDPOINT='https://task-quest.onrender.com/api/online-battle/accuracy/export';
const AUDIENCE='monstudy-today-daily';
const OUTPUT=new URL('../online-question-accuracy.json',import.meta.url);
function japanHour(date=new Date()){
 return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date));
}
async function getOidc(){
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,secret=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!secret)throw new Error('GitHub Actions OIDC credentials are missing.');
 const url=new URL(endpoint);url.searchParams.set('audience',AUDIENCE);
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('GitHub OIDC HTTP '+response.status);
 const data=await response.json();
 if(!data.value)throw new Error('GitHub OIDC token is empty.');
 return data.value;
}
export function validExport(data){
 return data?.schemaVersion===1&&Number.isFinite(Date.parse(data.updatedAt))&&
  ['4','3','pre2','2'].every(grade=>data.grades?.[grade]&&
   Object.keys(data.grades[grade]).length>=4&&
   Object.values(data.grades[grade]).every(rate=>rate===null||(typeof rate==='number'&&rate>=0&&rate<=100)));
}
export async function run(){
 // TODAY has an afternoon retry; data is deliberately a once-daily snapshot.
 if(process.env.GITHUB_EVENT_NAME==='schedule'&&japanHour()>=12){
  console.log('Online question accuracy: afternoon TODAY retry skipped.');
  return {skipped:true};
 }
 const token=await getOidc();
 let lastError;
 for(let i=0;i<3;i++){
  try{
   const response=await fetch(ENDPOINT,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:'{}',signal:AbortSignal.timeout(120000)
   });
   const value=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error('Difficulty snapshot HTTP '+response.status+': '+String(value.error||'').slice(0,300));
   if(!validExport(value))throw new Error('Incomplete online question difficulty snapshot');
   await fs.writeFile(OUTPUT,JSON.stringify(value)+'\n','utf8');
   console.log('Question accuracy snapshot: '+value.updatedAt+'; 4 grades, '+Object.values(value.grades).reduce((sum,g)=>sum+Object.keys(g).length,0)+' question IDs');
   return value;
  }catch(e){
   lastError=e;console.warn('Difficulty snapshot attempt '+(i+1)+' failed: '+String(e.message||e));
   if(i<2)await new Promise(resolve=>setTimeout(resolve,10_000));
  }
 }
 throw lastError;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
}
