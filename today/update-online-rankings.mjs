// Shares TODAY's existing GitHub Actions schedule and verified OIDC credentials.
// The backend uses yesterday's JST cutoff and skips already-published days.
const ENDPOINT='https://task-quest.onrender.com/api/online-battle/rankings/daily';
const AUDIENCE='monstudy-today-daily';

function japanHour(date=new Date()){
 return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date));
}
async function githubOidc(){
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,secret=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!secret)throw new Error('GitHub Actions OIDC credentials are missing.');
 const url=new URL(endpoint);url.searchParams.set('audience',AUDIENCE);
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('GitHub OIDC HTTP '+response.status);
 const payload=await response.json();if(!payload.value)throw new Error('GitHub OIDC token is empty.');
 return payload.value;
}

export async function run(){
 // TODAY runs again at 16:10 JST for news retries; rankings need only the morning run.
 if(process.env.GITHUB_EVENT_NAME==='schedule'&&japanHour()>=12){
  console.log('Daily online battle standings: afternoon news retry, skip.');
  return {skipped:true};
 }
 const token=await githubOidc();
 const response=await fetch(ENDPOINT,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(180000)
 });
 let result={};try{result=await response.json();}catch{}
 if(!response.ok)throw new Error('Daily online battle standings HTTP '+response.status+': '+String(result.error||'').slice(0,300));
 console.log('Online battle standings published for '+result.asOfDate);
 for(const grade of result.summary||[])console.log(grade.gradeKey+': '+(grade.unchanged?'already current':grade.entries+' players'));
 return result;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
}
