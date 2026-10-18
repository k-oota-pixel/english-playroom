const key=uid=>`english-playroom:dashboard:v1:${uid}`;
function valid(value,uid){
  return value?.version===1&&value.uid===uid&&/^\d{4}-\d{2}-\d{2}$/.test(value.day)
    &&Number.isFinite(value.savedAt)&&value.savedAt>0
    &&Array.isArray(value.entries)&&value.entries.length===8
    &&value.entries.every(entry=>typeof entry?.main==='string'&&entry.main.length<=300
      &&typeof entry.sub==='string'&&entry.sub.length<=300&&typeof entry.done==='boolean');
}
export function readDashboardCache(uid,storage){
  try{
    const raw=(storage??globalThis.localStorage)?.getItem(key(uid));
    if(!raw||raw.length>10000)return null;
    const value=JSON.parse(raw);
    return valid(value,uid)?value:null;
  }catch{return null;}
}
export function writeDashboardCache(uid,day,entries,storage){
  try{
    const value={version:1,uid,day,savedAt:Date.now(),entries};
    if(valid(value,uid))(storage??globalThis.localStorage)?.setItem(key(uid),JSON.stringify(value));
  }catch{/* Storage can be disabled or full; the dashboard still works. */}
}
