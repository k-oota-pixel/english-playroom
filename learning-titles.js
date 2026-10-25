const API='https://task-quest.onrender.com/api/learning/titles';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function makeDialog(title){
 const dialog=el('dialog');dialog.className='titles-dialog';dialog.setAttribute('aria-label',title);
 const header=el('div');header.className='titles-heading';const close=el('button','閉じる');close.type='button';close.addEventListener('click',()=>dialog.close());header.append(el('h2',title),close);dialog.append(header);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});document.body.append(dialog);return dialog;
}
function styles(){if(document.getElementById('titleStyles'))return;const link=el('link');link.id='titleStyles';link.rel='stylesheet';link.href=new URL('./learning-titles.css?v=1.10.5',import.meta.url).href;document.head.append(link);}
export function announceTitles(titles){
 if(!Array.isArray(titles)||!titles.length)return;styles();
 const dialog=makeDialog('🏆 新しい称号を解放！');for(const t of titles){const row=el('article');row.className='title-award';row.append(el('small',t.label),el('h3',t.name),el('p',t.condition));dialog.append(row);}
 const link=el('a','メインページで称号を選ぶ →');link.href='https://k-oota-pixel.github.io/english-playroom/';link.target='_blank';link.rel='noopener';dialog.append(link);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
export function mountTitles({root,getUser,request,onSelection=()=>{}}){
 styles();const button=root.querySelector('[data-titles-open]'),note=root.querySelector('[data-titles-note]');let generation=0,state=null,dialog=null,busy=false;
 function reset(){generation++;state=null;onSelection('');busy=false;if(dialog){dialog.close();dialog.remove();dialog=null;}button.disabled=!getUser();note.textContent=getUser()?'教材ごとの実績と、表示する称号を確認できます。':'ログインすると称号を確認・選択できます。';}
 function render(){
  if(dialog){dialog.close();dialog.remove();}dialog=makeDialog('実績・称号コレクション');
  const status=el('p',state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を表示しない');status.setAttribute('role','status');dialog.append(status);
  dialog.append(el('p','新しい共通称号は導入後の取り組みを集計します。リトライノートの級別称号は過去の回答も引き継ぎます。塔・巣窟の到達称号も過去の最高記録を引き継ぎます。'));
  const clear=el('button','称号を表示しない');clear.disabled=busy||!state.selectedId;clear.addEventListener('click',()=>select(''));dialog.append(clear);
  const groups=new Map();for(const t of state.titles){if(!groups.has(t.appId))groups.set(t.appId,[]);groups.get(t.appId).push(t);}
  for(const list of groups.values()){
   const section=el('details');section.open=list.some(t=>t.id===state.selectedId);section.className='title-group';section.append(el('summary',`${list[0].label}　${list.filter(t=>t.unlocked).length} / ${list.length} 解放`));
   const grid=el('div');grid.className='title-grid';for(const t of list){const card=el('article');card.className='title-award'+(t.unlocked?' unlocked':' locked');card.append(el('small',t.id===state.selectedId?'表示中':t.unlocked?'解放済み':'未解放'),el('h4',t.name),Object.assign(el('p',t.condition),{className:'title-condition'}),Object.assign(el('p',`${Math.min(t.done,t.need)} / ${t.need}`),{className:'title-progress'}));const equip=el('button',t.id===state.selectedId?'選択中':'この称号を表示');equip.disabled=busy||!t.unlocked||t.id===state.selectedId;equip.addEventListener('click',()=>select(t.id));card.append(equip);grid.append(card);}section.append(grid);dialog.append(section);
  }dialog.showModal();
 }
 async function load(){const user=getUser();if(!user||busy)return;busy=true;button.disabled=true;const id=++generation;note.textContent='称号を読み込み中…';if(dialog){dialog.close();dialog.remove();}dialog=makeDialog('称号');dialog.append(el('p','称号を読み込み中…'));dialog.showModal();try{const data=await request(user);if(id!==generation||getUser()?.uid!==user.uid)return;state=data;onSelection(state.selectedTitle||'');busy=false;render();note.textContent=state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を選んでランキングに表示できます。';}catch(error){if(id===generation){note.textContent=error.message||'称号を取得できませんでした。もう一度お試しください。';dialog.append(el('p',note.textContent));}}finally{if(id===generation){busy=false;button.disabled=false;}}}
 async function select(selectedId){const user=getUser();if(!user||busy)return;busy=true;const id=++generation;for(const b of dialog.querySelectorAll('button'))b.disabled=true;try{const data=await request(user,{selectedId});if(id!==generation||getUser()?.uid!==user.uid)return;state=data;onSelection(state.selectedTitle||'');busy=false;render();note.textContent=state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を表示しません。';}catch(error){if(id===generation){busy=false;render();dialog.prepend(el('p',error.message||'保存できませんでした。再試行してください。'));}}finally{if(id===generation)busy=false;}}
 async function refreshSelection(){const user=getUser();if(!user)return;const id=generation;const data=await request(user);if(id!==generation||getUser()?.uid!==user.uid)return;state=data;onSelection(state.selectedTitle||'');}
 button.addEventListener('click',load);reset();return {reset,load,refreshSelection};
}
async function boot(){const root=document.getElementById('learningTitles');if(!root)return;styles();const [{getApps,getApp},{getAuth,onAuthStateChanged}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]);if(!getApps().length){setTimeout(boot,80);return;}let user=null;const board=mountTitles({root,getUser:()=>user,onSelection:name=>{const label=document.getElementById('petSelectedTitle');if(label)label.textContent=name||'称号なし';},request:async(u,body)=>{const token=await u.getIdToken(),r=await fetch(API,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok)throw Error(data.error||'称号を取得できませんでした。');return data;}});onAuthStateChanged(getAuth(getApp()),u=>{user=u;board.reset();if(u)void board.refreshSelection().catch(console.warn);});}
if(typeof document!=='undefined')boot().catch(console.error);

// Compare only after the notebook has persisted its records; first sync is migration.
if(typeof document!=='undefined'&&location.pathname.includes('/eiken-retry')){let previous=null,identity='',queue=Promise.resolve();document.addEventListener('retry-cloud-saved',event=>{const uid=event.detail?.uid;queue=queue.then(async()=>{const [{getApp},{getAuth}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]);const user=getAuth(getApp()).currentUser;if(!user||user.uid!==uid)return;if(identity!==uid){previous=null;identity=uid;}const token=await user.getIdToken(),response=await fetch(API,{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)return;const data=await response.json();if(getAuth(getApp()).currentUser?.uid!==uid)return;const unlocked=data.titles.filter(t=>t.id.startsWith('retry:')&&t.unlocked);if(previous)announceTitles(unlocked.filter(t=>!previous.has(t.id)));previous=new Set(unlocked.map(t=>t.id));}).catch(console.warn);});}

// The wallet and PLAY button are installed asynchronously by the pet controls.
if(typeof document!=='undefined'){const place=()=>{const actions=document.getElementById('petLearningActions'),play=document.getElementById('petPlayOpen');if(actions&&play&&!actions.contains(play)){play.before(actions);actions.prepend(play);}};place();new MutationObserver(place).observe(document.body,{childList:true,subtree:true});}
