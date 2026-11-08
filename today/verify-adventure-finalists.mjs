// One-time verification of the saved clear flags for every currently ranked
// 100-floor/100-layer entrant. Uses the existing TODAY workflow's bound OIDC.
const ENDPOINT='https://task-quest.onrender.com/api/adventure/verify-finalists';
const AUDIENCE='monstudy-today-daily';
async function token(){
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,secret=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!secret)throw Error('GitHub OIDC environment is unavailable.');
 const url=new URL(endpoint);url.searchParams.set('audience',AUDIENCE);
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('GitHub OIDC HTTP '+response.status);
 const body=await response.json();if(!body.value)throw Error('Empty identity token');
 return body.value;
}
const identity=await token();
const response=await fetch(ENDPOINT,{
 method:'POST',headers:{Authorization:'Bearer '+identity,'Content-Type':'application/json'},
 body:'{}',signal:AbortSignal.timeout(90000)
});
const data=await response.json().catch(()=>({}));
if(!response.ok||data.ok!==true)throw Error('Finalist audit HTTP '+response.status+': '+String(data.error||'unknown').slice(0,200));
for(const mode of ['tower','dungeon']){
 const row=data[mode]||{};
 console.log(mode+': reached100='+row.reached100+', fullClear='+row.cleared+', stillChallenging='+row.unfinished);
}
