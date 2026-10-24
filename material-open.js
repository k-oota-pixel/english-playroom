const IDS=['eigo-meter','word-wolf','word-breaker','ateru','basic-quest','eiken-retry','task-quest','eiken-cloze','eiken-title','reading-training','listening-training','pre2-interview-questions','eiken-pre2-interview-a','talk-quest'];
export function recordMaterialOpen({pathname,send,seen}){const id=pathname.split('/').find(part=>IDS.includes(part));if(!id||seen.has(id))return;seen.add(id);try{Promise.resolve(send(id)).catch(()=>{});}catch{}return id;}
if(typeof window!=='undefined'&&typeof fetch==='function'){
 const key=Symbol.for('monstudy.material-open');const seen=window[key]||(window[key]=new Set());
 recordMaterialOpen({pathname:window.location.pathname,seen,send:appId=>fetch('https://task-quest.onrender.com/api/material-open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appId}),credentials:'omit',keepalive:true})});
}
