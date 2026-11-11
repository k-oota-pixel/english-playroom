// Shared, cache-friendly navigation for every leaderboard's "ぺっとを見る" action.
// The leaderboard supplies the UID; only the destination pet dialog fetches pet details.
const UID=/^[A-Za-z0-9_-]{1,128}$/;
export const hasRankedPetUid=uid=>typeof uid==='string'&&UID.test(uid);
function showError(callback,message){
 if(typeof callback==='function')callback(message);
 else console.warn('Ranked pet view:',message);
}
function styles(){
 if(document.getElementById('msRankedPetButtonStyle'))return;
 const style=document.createElement('style');style.id='msRankedPetButtonStyle';
 style.textContent=`.ms-ranked-pet-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;justify-self:end;flex-shrink:0;width:max-content;min-width:100px;max-width:100%;min-height:32px;padding:7px 11px;border:1px solid #98bfa9;border-radius:9px;background:#e9f5ed;color:#255842;font:800 12px/1.3 system-ui,-apple-system,sans-serif;white-space:nowrap!important;writing-mode:horizontal-tb!important;word-break:keep-all!important;overflow-wrap:normal!important;cursor:pointer}
 .ms-ranked-pet-button:hover{background:#d9ede1}
 .ms-ranked-pet-button:focus-visible{outline:3px solid #d5a53d;outline-offset:2px}
 body[data-screen-theme=dark] .ms-ranked-pet-button,body[data-theme=dark] .ms-ranked-pet-button{background:#315442;color:#f2fff4;border-color:#77a98e}`;
 document.head.append(style);
}
export function openRankedPet(uid,onError){
 if(!hasRankedPetUid(uid)){showError(onError,'ペットの閲覧先がありません。ランキングを更新してください。');return false;}
 try{
  const host=window.parent!==window?window.parent:window;
  if(typeof host.monstudyPetView==='function'){host.monstudyPetView(uid);return true;}
  if(typeof window.monstudyPetView==='function'){window.monstudyPetView(uid);return true;}
 }catch(error){console.warn('Ranked pet parent viewer unavailable',error);}
 // Standalone pages and temporarily uninitialized shells can still open the pet.
 try{
  const url=new URL('./index.html',import.meta.url);url.searchParams.set('petView',uid);
  if(window.parent!==window){
   try{window.parent.location.assign(url.href);return true;}catch{}
  }
  window.location.assign(url.href);return true;
 }catch(error){showError(onError,'ペットを開けませんでした。ページを再読み込みしてください。');return false;}
}
export function rankedPetButton(entry,onError){
 styles();
 const button=document.createElement('button');button.type='button';
 button.className='ms-ranked-pet-button';button.textContent='ぺっとを見る';
 button.setAttribute('aria-label',String(entry?.petName||'ペット')+'のぺっとを見る');
 button.addEventListener('click',()=>openRankedPet(entry?.uid,onError));
 return button;
}
