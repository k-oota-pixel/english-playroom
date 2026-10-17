import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {OPTIONS,normalizeAppearance,validAppearance} from './pet-model.js';
import {renderPetSVG} from './pet-art.js?v=1.5.1-touch';

const ADMIN_API='https://task-quest.onrender.com/api/admin/users';
const OFFICIAL_SPECIES=['cat','dog','bird','hamster','panda','penguin'];
const EYES=[{id:'round',label:'まんまる'},{id:'gentle',label:'たれ目'},{id:'watery',label:'うるうる'},{id:'smile',label:'にっこり'},{id:'sleepy',label:'ねむねむ'},{id:'sparkle',label:'きらきら'}];
const BACKGROUNDS=[{id:'ivory',label:'おうち'},{id:'sky',label:'青空'},{id:'leaf',label:'お庭'},{id:'rose',label:'花畑'}];
const GROUPS=[['species','動物の種類'],['bodyColor','からだの色'],['eyeStyle','目'],['baseBackground','背景テーマ']];

let auth=null,db=null,currentUser=null,adminVerified=false,button=null,dialog=null,currentData=null,draft=null,previewStage='baby';

function choices(key){
  if(key==='species')return (OPTIONS.species||[]).filter(item=>OFFICIAL_SPECIES.includes(item.id)).map(item=>item.id==='panda'?{...item,label:'ライオン'}:item);
  if(key==='eyeStyle')return EYES;
  if(key==='baseBackground')return BACKGROUNDS;
  return OPTIONS[key]||[];
}
function legacyEye(style){return style==='sleepy'?'sleepy':style==='sparkle'?'sparkle':'round';}
function normalizeDraft(value={}){
  const base=normalizeAppearance(value),legacy=base.eyes==='sleepy'?'sleepy':base.eyes==='sparkle'?'sparkle':base.eyes==='cool'?'gentle':'round';
  return {...base,species:OFFICIAL_SPECIES.includes(base.species)?base.species:'cat',eyeStyle:EYES.some(x=>x.id===value.eyeStyle)?value.eyeStyle:legacy,feature:'classic',pattern:'none'};
}
function petRef(user){return doc(db,'users',user.uid,'apps','english-playroom');}
function ensureStyle(){
  if(document.getElementById('petAdminPanelStyle'))return;
  const style=document.createElement('style');style.id='petAdminPanelStyle';style.textContent=`
.pet-admin-toolbar{display:flex;justify-content:center;width:100%}
.pet-admin-open{appearance:none;border:1px solid #9b8ac3;background:#f7f1ff;color:#5d4a88;border-radius:999px;padding:6px 11px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.pet-admin-open:hover{background:#efe6ff}
.pet-admin-dialog{width:min(760px,calc(100vw - 20px));max-height:92vh;border:0;border-radius:22px;padding:0;background:#fffdf9;color:#193d38;box-shadow:0 24px 80px #10251f66}.pet-admin-dialog::backdrop{background:#17342f88;backdrop-filter:blur(2px)}
.pet-admin-shell{padding:18px;display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px}.pet-admin-preview-card{background:#fff8e8;border:1px solid #eadfc7;border-radius:18px;padding:12px}.pet-admin-kicker{font-size:9px;letter-spacing:.14em;font-weight:900;color:#7f6a9d}.pet-admin-title{font-size:22px;font-weight:900;margin:2px 0 10px}.pet-admin-preview{width:100%;max-width:230px;margin:0 auto}.pet-admin-preview svg{display:block;width:100%;height:auto}.pet-admin-stage{display:flex;gap:6px;margin-top:9px}.pet-admin-stage button{flex:1;border:1px solid #d9d1e9;background:#fff;border-radius:999px;padding:7px 8px;font:inherit;font-size:10px;font-weight:900;color:#6b5a8a;cursor:pointer}.pet-admin-stage button.active{background:#6e5a9c;color:#fff;border-color:#6e5a9c}
.pet-admin-controls{min-width:0}.pet-admin-note{font-size:11px;line-height:1.6;color:#6d756f;background:#f4f1fa;border-radius:12px;padding:9px 10px;margin-bottom:10px}.pet-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.pet-admin-field{display:grid;gap:5px}.pet-admin-field label{font-size:10px;font-weight:900;color:#66736d}.pet-admin-field select{width:100%;border:1px solid #d7ddd7;border-radius:10px;padding:9px 10px;background:#fff;color:#193d38;font:inherit;font-size:12px}.pet-admin-status{min-height:1.4em;margin-top:9px;font-size:10px;color:#7b6a23}.pet-admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pet-admin-actions button{appearance:none;border:1px solid #d7ded8;background:#fff;color:#53645d;border-radius:10px;padding:9px 12px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.pet-admin-actions .primary{margin-left:auto;background:#5e4a8f;color:#fff;border-color:#5e4a8f}.pet-admin-actions button:disabled{opacity:.5;cursor:default}
@media(max-width:650px){.pet-admin-dialog{width:calc(100vw - 10px)}.pet-admin-shell{grid-template-columns:1fr;padding:12px;gap:10px}.pet-admin-preview-card{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center}.pet-admin-preview{width:118px;margin:0}.pet-admin-stage{margin:0;display:grid}.pet-admin-title{font-size:18px}.pet-admin-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(style);
}

async function verifyAdmin(user){if(!user)return false;try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);const token=await user.getIdToken();const res=await fetch(ADMIN_API,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});clearTimeout(timeout);try{await res.body?.cancel();}catch{}return res.ok;}catch{return false;}}

function ensureDialog(){
  if(dialog)return dialog;ensureStyle();dialog=document.createElement('dialog');dialog.className='pet-admin-dialog';dialog.id='petAdminDialog';
  dialog.innerHTML=`<div class="pet-admin-shell"><section class="pet-admin-preview-card"><div><div class="pet-admin-kicker">ADMIN ONLY</div><div class="pet-admin-title">ペット管理</div></div><div id="petAdminPreview" class="pet-admin-preview"></div><div class="pet-admin-stage"><button type="button" data-stage="baby">幼体プレビュー</button><button type="button" data-stage="adult">成体プレビュー</button></div></section><section class="pet-admin-controls"><div class="pet-admin-note">変更できるのは「動物・体色・目・背景テーマ」の4項目です。特徴と模様は廃止しました。変更は0コインで、名前・コイン・装備・学習記録・成長日数には触れません。幼体/成体ボタンはプレビュー専用です。</div><div id="petAdminGrid" class="pet-admin-grid"></div><div id="petAdminStatus" class="pet-admin-status" role="status" aria-live="polite"></div><div class="pet-admin-actions"><button type="button" data-reset>現在に戻す</button><button type="button" data-random>ランダム</button><button type="button" data-close>閉じる</button><button type="button" class="primary" data-save>この見た目に変更</button></div></section></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
  for(const b of dialog.querySelectorAll('[data-stage]'))b.addEventListener('click',()=>{previewStage=b.dataset.stage;renderPreview();});
  dialog.querySelector('[data-reset]').addEventListener('click',()=>{if(!currentData)return;draft=normalizeDraft(currentData.petAppearance||{});renderControls();renderPreview();});
  dialog.querySelector('[data-random]').addEventListener('click',()=>{const base=normalizeDraft(currentData?.petAppearance||{});for(const [key] of GROUPS){const items=choices(key);base[key]=items[Math.floor(Math.random()*items.length)]?.id||base[key];}base.eyes=legacyEye(base.eyeStyle);base.feature='classic';base.pattern='none';draft=base;renderControls();renderPreview();});
  dialog.querySelector('[data-save]').addEventListener('click',saveAppearance);return dialog;
}

function renderControls(){if(!dialog||!draft)return;const grid=dialog.querySelector('#petAdminGrid');grid.replaceChildren();for(const [key,label] of GROUPS){const wrap=document.createElement('div');wrap.className='pet-admin-field';const l=document.createElement('label');l.textContent=label;const select=document.createElement('select');select.dataset.key=key;for(const item of choices(key)){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;option.selected=draft[key]===item.id;select.appendChild(option);}select.addEventListener('change',()=>{draft={...draft,[key]:select.value};if(key==='eyeStyle')draft.eyes=legacyEye(select.value);draft.feature='classic';draft.pattern='none';renderPreview();});wrap.append(l,select);grid.appendChild(wrap);}}
function renderPreview(){if(!dialog||!draft)return;for(const b of dialog.querySelectorAll('[data-stage]'))b.classList.toggle('active',b.dataset.stage===previewStage);const preview=dialog.querySelector('#petAdminPreview');try{preview.innerHTML=renderPetSVG(previewStage==='baby'?null:draft,currentData?.petShop||{},previewStage);}catch(error){preview.textContent='プレビューを表示できませんでした。';console.error(error);}}

async function openPanel(){if(!adminVerified||!currentUser)return;const d=ensureDialog(),status=d.querySelector('#petAdminStatus');status.textContent='読み込んでいます…';try{const snap=await getDoc(petRef(currentUser));currentData=snap.exists()?(snap.data()||{}):{};if(!currentData.petHatched||!currentData.petAppearance)throw Error('まだペットがいません。');draft=normalizeDraft(currentData.petAppearance);const stage=document.documentElement.dataset.petStage;previewStage=stage==='baby'?'baby':'adult';renderControls();renderPreview();status.textContent='';d.showModal();}catch(error){status.textContent=error?.message||'ペット情報を読み込めませんでした。';if(!d.open)d.showModal();}}

async function saveAppearance(){if(!adminVerified||!currentUser||!draft)return;draft={...draft,eyes:legacyEye(draft.eyeStyle),feature:'classic',pattern:'none'};if(!validAppearance(draft))return;const status=dialog.querySelector('#petAdminStatus'),save=dialog.querySelector('[data-save]');save.disabled=true;status.textContent='保存しています…';try{const ref=petRef(currentUser);await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('ペット情報が見つかりません。');const data=snap.data()||{};if(!data.petHatched||data.petAdult===false)throw Error('成体になってから見た目を変更できます。');tx.set(ref,{petAppearance:{...draft},petUpdatedAt:serverTimestamp(),petAdminEditedAt:serverTimestamp()},{merge:true});});currentData={...(currentData||{}),petAppearance:{...draft}};status.textContent='見た目を変更しました！';const toast=document.getElementById('petShopToast');if(toast){toast.textContent='🛠 ペットの見た目を管理者変更しました';toast.dataset.kind='ok';}setTimeout(()=>{if(dialog?.open)dialog.close();},450);}catch(error){status.textContent=error?.message||'保存できませんでした。';}finally{save.disabled=false;}}

function ensureButton(){
  if(!adminVerified||!currentUser)return;
  if(button?.isConnected)return;
  const card=document.querySelector('.pet-card'),visual=card?.querySelector('.pet-visual-wrap');
  if(!card||!visual){setTimeout(ensureButton,250);return;}
  button=document.createElement('button');button.type='button';button.className='pet-admin-open';button.textContent='🛠 ペット管理';button.setAttribute('aria-label','管理者用ペット見た目変更');button.addEventListener('click',openPanel);
  const toolbar=document.createElement('div');toolbar.className='pet-admin-toolbar';toolbar.appendChild(button);card.insertBefore(toolbar,visual);
}
function removeButton(){button?.closest('.pet-admin-toolbar')?.remove();button?.remove();button=null;if(dialog?.open)dialog.close();}
function start(){if(!getApps().length){setTimeout(start,120);return;}ensureStyle();const app=getApp();auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,async user=>{currentUser=user;adminVerified=false;removeButton();if(!user)return;adminVerified=await verifyAdmin(user);if(auth.currentUser?.uid!==user.uid||!adminVerified)return;ensureButton();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
