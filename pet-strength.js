import {auth,db,walletRef} from './coin-reward.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {hasPet} from './pet-model.js';
import {titleCount,strengthState,allocatePoint} from './pet-strength-model.js?v=1.10.8';
export async function loadStrengthTitles(user){
 const token=await user.getIdToken();const r=await fetch('https://task-quest.onrender.com/api/learning/titles',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('称号を読み込めませんでした。もう一度お試しください。');
 const data=await r.json();if(!Array.isArray(data.titles))throw Error('称号を確認できませんでした。');return titleCount(data.titles);
}
const button=document.getElementById('petStrengthOpen');
if(button){
 const dialog=document.createElement('dialog');dialog.className='strength-dialog';dialog.setAttribute('aria-labelledby','strengthHeading');
 dialog.innerHTML='<header><h2 id="strengthHeading">ペット強化</h2><button type="button" data-close>閉じる</button></header><p>獲得した称号3個につき1ポイント。HPは＋2、攻撃力・防御力は＋1ずつ強化できます。</p><div data-body></div><p data-message role="status"></p>';
 document.body.append(dialog);const body=dialog.querySelector('[data-body]'),message=dialog.querySelector('[data-message]');let busy=false,generation=0;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 function render(count,data){const state=strengthState(count,data.petStrength);body.replaceChildren();
 const summary=document.createElement('p');summary.className='strength-summary';summary.textContent=`獲得称号 ${count}個　／　残り ${state.available}ポイント`;body.append(summary);
 const next=document.createElement('p');next.textContent=`次のポイントまで称号あと${3-count%3}個`;body.append(next);
 for(const [key,label,gain] of [['hp','HP',2],['attack','攻撃力',1],['defense','防御力',1]]){const row=document.createElement('div');row.className='strength-row';const text=document.createElement('strong');text.textContent=`${label}　${state.stats[key]}`;const add=document.createElement('button');add.type='button';add.textContent=`＋${gain}（1pt）`;add.disabled=busy||!hasPet(data)||state.available<1;add.onclick=()=>save(key);row.append(text,add);body.append(row);}
 const note=document.createElement('p');note.textContent=hasPet(data)?'強化は塔・洞窟の次の冒険から反映されます。ポイントの振り直しはできません。':'ペットが生まれると強化できます。';body.append(note);
 }
 async function load(){const user=auth.currentUser;if(!user||busy)return;const id=++generation;busy=true;body.textContent='読み込み中…';message.textContent='';dialog.showModal();try{const [count,snap]=await Promise.all([loadStrengthTitles(user),getDoc(walletRef(user))]);if(id!==generation||auth.currentUser?.uid!==user.uid)return;busy=false;render(count,snap.data()||{});}catch(e){if(id===generation){body.textContent='';message.textContent=e.message;}}finally{if(id===generation)busy=false;}}
 async function save(key){const user=auth.currentUser;if(!user||busy)return;const id=generation;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);message.textContent='保存中…';try{const count=await loadStrengthTitles(user);const data=await runTransaction(db,async tx=>{if(auth.currentUser?.uid!==user.uid)throw Error('ログインし直してください。');const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{};if(!hasPet(data))throw Error('ペットが生まれると強化できます。');const petStrength=allocatePoint(count,data.petStrength,key);tx.set(ref,{petStrength},{merge:true});return {...data,petStrength};});if(id!==generation||auth.currentUser?.uid!==user.uid)return;busy=false;render(count,data);message.textContent='強化を保存しました！';}catch(e){if(id===generation){message.textContent=e.message||'保存できませんでした。閉じてもう一度お試しください。';}}finally{if(id===generation)busy=false;}}
 button.onclick=load;onAuthStateChanged(auth,user=>{generation++;busy=false;button.disabled=!user;dialog.close();body.replaceChildren();});
}
