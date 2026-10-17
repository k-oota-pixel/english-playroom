import { getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {appearanceFromAnswers,hasPet,normalizePetName,validAppearance,validPetName} from './pet-model.js';

export const QUESTIONS=[
 {key:'personality',title:'一緒に過ごすなら、どんな相棒がいい？',answers:[['calm','のんびり落ち着いて過ごせる子'],['playful','元気いっぱい、一緒に遊べる子'],['curious','好奇心旺盛で、一緒に冒険できる子']]},
 {key:'bodyColor',title:'その子に似合いそうな色は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
 {key:'eyes',title:'目が合ったら、どんな表情がいい？',answers:[['round','ぱっちり、素直なまなざし'],['sleepy','のんびり、眠たそう'],['sparkle','わくわく、目がきらきら'],['cool','ちょっとクール、頼もしい']]},
 {key:'feature',title:'どんなチャームポイントが好き？',answers:[['classic','シンプルで自然なかわいさ'],['long','耳や羽がちょっと大きめ'],['horns','小さな角がある個性的な姿']]},
 {key:'pattern',title:'からだの模様はどんな感じが好き？',answers:[['none','すっきり、無地'],['spots','ころころ、水玉'],['stripes','すらっと、しましま'],['star','きらっと、星のワンポイント']]},
 {key:'baseBackground',title:'一緒に過ごしたい場所は？',answers:[['ivory','やさしい光の、おうち'],['sky','青空の見える、ひろば'],['leaf','緑いっぱいの、お庭'],['rose','桜色に包まれた、花畑']]}
];

export function createPetMaker(onSave){
 const dialog=document.createElement('dialog');dialog.className='pet-dialog pet-survey';dialog.setAttribute('aria-labelledby','petMakerTitle');
 dialog.innerHTML=`<div class="survey-eyebrow">MEET YOUR PET</div><h2 id="petMakerTitle">どんな子に出会いたい？</h2><p>6つの質問に答えて、6種類の中からあなたの相棒に出会おう。答えによって出会いやすい子が変わりますが、少しだけ偶然も入ります。最後に名前をつけて迎えよう。姿は、かえってからのお楽しみ。</p><div class="survey-progress" aria-live="polite"></div><div class="pet-options"></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button secondary" data-back>戻る</button><button type="button" class="pet-button" data-next>次へ</button></div>`;document.body.append(dialog);
 let answers={},step=0,busy=false,pendingAppearance=null,petName='';
 const status=dialog.querySelector('.pet-save-status'),next=dialog.querySelector('[data-next]'),back=dialog.querySelector('[data-back]'),options=dialog.querySelector('.pet-options');
 function update(focus=false){
  options.replaceChildren();
  if(step===QUESTIONS.length){
   dialog.querySelector('.survey-progress').textContent='最後に、相棒の名前をつけよう';
   options.innerHTML='<label for="newPetName">ペットの名前</label><input id="newPetName" class="pet-name-input" type="text" autocomplete="off" aria-describedby="newPetNameHint"><p id="newPetNameHint">1〜12文字。日本語でも英語でもOK！</p>';
   const input=options.querySelector('input');input.value=petName;input.addEventListener('input',()=>{petName=input.value;next.disabled=!validPetName(petName);});
   back.hidden=false;next.textContent='名前をつけて、たまごをかえす';next.disabled=!validPetName(petName);if(focus)input.focus();return;
  }
  const q=QUESTIONS[step];dialog.querySelector('.survey-progress').textContent=`質問 ${step+1} / ${QUESTIONS.length}`;
  const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');legend.textContent=q.title;choices.className='choices';field.append(legend,choices);
  for(const [id,label] of q.answers){const b=document.createElement('button');b.type='button';b.className='pet-choice';b.dataset.value=id;b.textContent=label;b.setAttribute('aria-pressed',String(answers[q.key]===id));b.addEventListener('click',()=>{answers[q.key]=id;if(pendingAppearance && q.key!=='personality')pendingAppearance[q.key]=id;for(const c of choices.children)c.setAttribute('aria-pressed',String(c.dataset.value===id));next.disabled=false;});choices.append(b);}
  options.append(field);back.hidden=step===0;next.textContent=step===QUESTIONS.length-1?'名前をつける':'次へ';next.disabled=!answers[q.key];if(focus)choices.querySelector('button').focus();
 }
 dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 back.addEventListener('click',()=>{if(!busy&&step>0){step--;status.textContent='';update(true);}});
 next.addEventListener('click',async()=>{
  if(busy)return;if(step<QUESTIONS.length){if(!answers[QUESTIONS[step].key])return;step++;update(true);return;}if(!validPetName(petName))return;
  busy=true;status.textContent='たまごがかえりそう…';for(const b of dialog.querySelectorAll('button'))b.disabled=true;
  try{pendingAppearance ||= appearanceFromAnswers(answers);await onSave({...pendingAppearance},normalizePetName(petName));dialog.close();}catch(e){status.textContent=e.message||'保存できませんでした。通信状態を確認して再度お試しください。';}
  finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}
 });
 return {open(){if(dialog.open||busy)return;answers={};petName='';pendingAppearance=null;step=0;status.textContent='';update();dialog.showModal();},close(){dialog.close();}};
}

export function createPetResurvey(onSave){
 const dialog=document.createElement('dialog');dialog.className='pet-dialog pet-survey';dialog.setAttribute('aria-labelledby','petResurveyTitle');
 dialog.innerHTML=`<div class="survey-eyebrow">MEET YOUR PET AGAIN</div><h2 id="petResurveyTitle">もう一度、相棒を診断しよう</h2><p>6つの質問に答えると、新しい姿のペットに出会えます。回答によって出会いやすい動物が変わりますが、どの子になるかには少しだけ偶然も入ります。今の名前や購入済みアイテムはそのまま引き継がれます。</p><div class="survey-progress" aria-live="polite"></div><div class="pet-options"></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button secondary" data-back>戻る</button><button type="button" class="pet-button" data-next>次へ</button></div>`;document.body.append(dialog);
 let answers={},step=0,busy=false;
 const status=dialog.querySelector('.pet-save-status'),next=dialog.querySelector('[data-next]'),back=dialog.querySelector('[data-back]'),options=dialog.querySelector('.pet-options');
 function update(focus=false){
  const q=QUESTIONS[step];options.replaceChildren();dialog.querySelector('.survey-progress').textContent=`質問 ${step+1} / ${QUESTIONS.length}`;
  const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');legend.textContent=q.title;choices.className='choices';field.append(legend,choices);
  for(const [id,label] of q.answers){const b=document.createElement('button');b.type='button';b.className='pet-choice';b.dataset.value=id;b.textContent=label;b.setAttribute('aria-pressed',String(answers[q.key]===id));b.addEventListener('click',()=>{answers[q.key]=id;for(const c of choices.children)c.setAttribute('aria-pressed',String(c.dataset.value===id));next.disabled=false;});choices.append(b);}
  options.append(field);back.hidden=step===0;next.textContent=step===QUESTIONS.length-1?'新しいペットに出会う':'次へ';next.disabled=!answers[q.key];if(focus)choices.querySelector('button')?.focus();
 }
 dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 back.addEventListener('click',()=>{if(!busy&&step>0){step--;status.textContent='';update(true);}});
 next.addEventListener('click',async()=>{
  if(busy)return;const q=QUESTIONS[step];if(!answers[q.key])return;
  if(step<QUESTIONS.length-1){step++;update(true);return;}
  busy=true;status.textContent='新しい相棒に出会っています…';for(const b of dialog.querySelectorAll('button'))b.disabled=true;
  try{const appearance=appearanceFromAnswers(answers);await onSave(appearance);dialog.close();}
  catch(e){status.textContent=e.message||'保存できませんでした。通信状態を確認して再度お試しください。';}
  finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;next.disabled=!answers[QUESTIONS[step].key];}
 });
 return {open(){if(dialog.open||busy)return;answers={};step=0;status.textContent='';update();dialog.showModal();},close(){if(dialog.open&&!busy)dialog.close();}};
}

export function createPetNameDialog(onSave){
 const dialog=document.createElement('dialog');dialog.className='pet-dialog pet-survey';dialog.setAttribute('aria-labelledby','petNameTitle');
 dialog.innerHTML='<h2 id="petNameTitle">相棒に名前をつけよう</h2><label for="existingPetName">ペットの名前</label><input id="existingPetName" class="pet-name-input" type="text" autocomplete="off" aria-describedby="existingPetNameHint"><p id="existingPetNameHint">1〜12文字。日本語でも英語でもOK！</p><div role="status" class="pet-save-status"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button" data-save disabled>この名前にする</button></div>';
 document.body.append(dialog);
 const input=dialog.querySelector('input'),save=dialog.querySelector('[data-save]'),status=dialog.querySelector('[role="status"]');let busy=false;
 input.addEventListener('input',()=>{save.disabled=!validPetName(input.value);});
 dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 save.addEventListener('click',async()=>{
  if(busy||!validPetName(input.value))return;busy=true;save.disabled=true;input.disabled=true;status.textContent='名前を保存しています…';
  try{await onSave(normalizePetName(input.value));dialog.close();}catch(error){status.textContent=error.message||'保存できませんでした。もう一度お試しください。';}
  finally{busy=false;input.disabled=false;save.disabled=!validPetName(input.value);}
 });
 return {open(){if(busy||dialog.open)return;input.value='';status.textContent='';save.disabled=true;dialog.showModal();input.focus();},close(){dialog.close();}};
}

const RESURVEY_PRICE=30;
let resurveyDialog=null;
let shopObserver=null;
let decorateQueued=false;

function firebaseContext(){
 if(!getApps().length)return null;
 const app=getApp();
 const auth=getAuth(app),user=auth.currentUser;
 if(!user)return null;
 return {user,db:getFirestore(app)};
}
function playroomRef(db,user){return doc(db,'users',user.uid,'apps','english-playroom');}
async function readResurveyState(){
 const ctx=firebaseContext();if(!ctx)return null;
 try{const snap=await getDoc(playroomRef(ctx.db,ctx.user));const data=snap.exists()?(snap.data()||{}):{};return {pending:data.petResurveyPending===true,coins:Math.max(0,Math.floor(Number(data.coins)||0))};}
 catch{return null;}
}
function ensureResurveyDialog(){
 if(resurveyDialog)return resurveyDialog;
 resurveyDialog=createPetResurvey(async appearance=>{
  const ctx=firebaseContext();if(!ctx)throw Error('もう一度ログインしてください。');
  if(!validAppearance(appearance))throw Error('見た目を選び直してください。');
  await runTransaction(ctx.db,async tx=>{
   const ref=playroomRef(ctx.db,ctx.user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
   if(!hasPet(data))throw Error('先にペットを迎えてください。');
   if(data.petResurveyPending!==true)throw Error('ショップから再診断を購入してください。');
   tx.set(ref,{petAppearance:appearance,petResurveyPending:false,petResurveyedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
  });
  const shopDialog=document.getElementById('petShopDialog');if(shopDialog?.open)shopDialog.close();
 });
 return resurveyDialog;
}
async function beginResurvey(button,status){
 if(button.disabled)return;
 const ctx=firebaseContext();if(!ctx){status.textContent='Googleログインすると利用できます。';return;}
 button.disabled=true;status.textContent='確認しています…';
 try{
  let shouldConfirm=false;
  const snap=await getDoc(playroomRef(ctx.db,ctx.user)),data=snap.exists()?(snap.data()||{}):{};
  if(!hasPet(data))throw Error('先にペットを迎えてください。');
  if(data.petResurveyPending!==true){
   if(Math.max(0,Math.floor(Number(data.coins)||0))<RESURVEY_PRICE)throw Error('コインが足りません。');
   shouldConfirm=true;
  }
  if(shouldConfirm&&!window.confirm(`${RESURVEY_PRICE}コインを使って、ペットアンケートをもう一度行いますか？\n今の名前・購入済みアイテム・学習記録はそのまま残ります。`)){status.textContent='';return;}
  await runTransaction(ctx.db,async tx=>{
   const ref=playroomRef(ctx.db,ctx.user),freshSnap=await tx.get(ref),fresh=freshSnap.exists()?(freshSnap.data()||{}):{};
   if(!hasPet(fresh))throw Error('先にペットを迎えてください。');
   if(fresh.petResurveyPending===true)return;
   const coins=Math.max(0,Math.floor(Number(fresh.coins)||0));if(coins<RESURVEY_PRICE)throw Error('コインが足りません。');
   tx.set(ref,{coins:coins-RESURVEY_PRICE,petResurveyPending:true,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
  });
  status.textContent='';const shopDialog=document.getElementById('petShopDialog');if(shopDialog?.open)shopDialog.close();ensureResurveyDialog().open();
 }catch(error){status.textContent=error?.message||'再診断を開始できませんでした。';}
 finally{button.disabled=false;decorateShop();}
}
async function refreshResurveyCard(section){
 const button=section.querySelector('[data-pet-resurvey]'),status=section.querySelector('[data-pet-resurvey-status]');if(!button||!status)return;
 const state=await readResurveyState();if(!section.isConnected)return;
 if(!state){if(button.textContent!=='30コインで再診断')button.textContent='30コインで再診断';button.disabled=false;return;}
 if(state.pending){if(button.textContent!=='アンケートを続ける')button.textContent='アンケートを続ける';button.disabled=false;if(status.textContent!=='支払い済みです。続きから再開できます。')status.textContent='支払い済みです。続きから再開できます。';}
 else{if(button.textContent!=='30コインで再診断')button.textContent='30コインで再診断';button.disabled=state.coins<RESURVEY_PRICE;const message=state.coins<RESURVEY_PRICE?'コインが足りません。':'';if(status.textContent!==message)status.textContent=message;}
}
function decorateShop(){
 decorateQueued=false;
 const shop=document.getElementById('petShopDialog');if(!shop)return;
 for(const tab of shop.querySelectorAll('.pet-shop-tab'))if(tab.textContent.includes('見た目変更')&&tab.textContent!=='🐾 ペット')tab.textContent='🐾 ペット';
 const panel=shop.querySelector('#petShopPanel');if(!panel)return;
 const title=panel.querySelector('.pet-shop-panel-title');if(!title||(!title.textContent.includes('見た目変更')&&title.textContent!=='🐾 ペット'))return;
 if(title.textContent!=='🐾 ペット')title.textContent='🐾 ペット';
 for(const section of [...panel.querySelectorAll('.pet-custom-section:not(.pet-resurvey-section)')])section.remove();
 let section=panel.querySelector('.pet-resurvey-section');
 if(!section){
  section=document.createElement('section');section.className='pet-custom-section pet-resurvey-section';
  section.innerHTML=`<div class="pet-custom-heading"><span>🐾</span><span>ペット再診断</span><span class="pet-custom-price">🪙 ${RESURVEY_PRICE}</span></div><p style="margin:0 0 10px;font-size:11px;line-height:1.65;color:#6d756f">もう一度6つの質問に答えて、新しい姿のペットに出会えます。どの動物になるかにはランダム性があります。名前・購入済みアイテム・学習記録はそのまま引き継がれます。</p><button type="button" class="pet-shop-action" data-pet-resurvey>30コインで再診断</button><div data-pet-resurvey-status style="min-height:1.4em;margin-top:7px;font-size:10px;color:#846719" aria-live="polite"></div>`;
  const rename=panel.querySelector('.pet-shop-rename');panel.insertBefore(section,rename||null);
  const button=section.querySelector('[data-pet-resurvey]'),status=section.querySelector('[data-pet-resurvey-status]');button.addEventListener('click',()=>beginResurvey(button,status));
 }
 refreshResurveyCard(section);
}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;queueMicrotask(decorateShop);}
function attachShopDecorator(){
 const shop=document.getElementById('petShopDialog');
 if(!shop){setTimeout(attachShopDecorator,250);return;}
 queueDecorate();
 if(shopObserver)shopObserver.disconnect();
 shopObserver=new MutationObserver(queueDecorate);shopObserver.observe(shop,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachShopDecorator,{once:true});else attachShopDecorator();
