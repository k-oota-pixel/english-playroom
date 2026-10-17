import { getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { appearanceFromAnswers, hasPet, validAppearance } from './pet-model.js';

const RESURVEY_PRICE=30;
const QUESTIONS=[
  {key:'personality',title:'一緒に過ごすなら、どんな相棒がいい？',answers:[['calm','のんびり落ち着いて過ごせる子'],['playful','元気いっぱい、一緒に遊べる子'],['curious','好奇心旺盛で、一緒に冒険できる子']]},
  {key:'bodyColor',title:'その子に似合いそうな色は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
  {key:'eyes',title:'目が合ったら、どんな表情がいい？',answers:[['round','ぱっちり、素直なまなざし'],['sleepy','のんびり、眠たそう'],['sparkle','わくわく、目がきらきら'],['cool','ちょっとクール、頼もしい']]},
  {key:'feature',title:'どんなチャームポイントが好き？',answers:[['classic','シンプルで自然なかわいさ'],['long','耳や羽がちょっと大きめ'],['horns','小さな角がある個性的な姿']]},
  {key:'pattern',title:'からだの模様はどんな感じが好き？',answers:[['none','すっきり、無地'],['spots','ころころ、水玉'],['stripes','すらっと、しましま'],['star','きらっと、星のワンポイント']]},
  {key:'baseBackground',title:'一緒に過ごしたい場所は？',answers:[['ivory','やさしい光の、おうち'],['sky','青空の見える、ひろば'],['leaf','緑いっぱいの、お庭'],['rose','桜色に包まれた、花畑']]}
];

function firebaseContext(){
  if(!getApps().length)return null;
  const app=getApp(),auth=getAuth(app),user=auth.currentUser;
  if(!user)return null;
  return {user,db:getFirestore(app)};
}
function playroomRef(db,user){return doc(db,'users',user.uid,'apps','english-playroom');}
function setPageToast(message,kind='ok'){
  const toast=document.getElementById('petShopToast');
  if(!toast)return;
  toast.textContent=message;
  toast.dataset.kind=kind;
}

let surveyDialog=null;
function ensureSurveyDialog(){
  if(surveyDialog)return surveyDialog;
  const dialog=document.createElement('dialog');
  dialog.className='pet-dialog pet-survey';
  dialog.id='petResurveyDialog';
  dialog.setAttribute('aria-labelledby','petResurveyTitle');
  dialog.innerHTML=`<div class="survey-eyebrow">MEET YOUR PET AGAIN</div><h2 id="petResurveyTitle">もう一度、相棒を診断しよう</h2><p>6つの質問に答えると、新しい姿のペットに出会えます。答えによって出会いやすい動物が変わりますが、どの子になるかには少しだけ偶然も入ります。今の名前や購入済みアイテム、学習記録はそのままです。</p><div class="survey-progress" aria-live="polite"></div><div class="pet-options"></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button secondary" data-back>戻る</button><button type="button" class="pet-button" data-next>次へ</button></div>`;
  document.body.append(dialog);
  let answers={},step=0,busy=false;
  const progress=dialog.querySelector('.survey-progress');
  const options=dialog.querySelector('.pet-options');
  const status=dialog.querySelector('.pet-save-status');
  const back=dialog.querySelector('[data-back]');
  const next=dialog.querySelector('[data-next]');

  function renderStep(focus=false){
    const q=QUESTIONS[step];
    options.replaceChildren();
    progress.textContent=`質問 ${step+1} / ${QUESTIONS.length}`;
    const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');
    legend.textContent=q.title;choices.className='choices';field.append(legend,choices);
    for(const [id,label] of q.answers){
      const button=document.createElement('button');
      button.type='button';button.className='pet-choice';button.dataset.value=id;button.textContent=label;
      button.setAttribute('aria-pressed',String(answers[q.key]===id));
      button.addEventListener('click',()=>{
        answers[q.key]=id;
        for(const choice of choices.children)choice.setAttribute('aria-pressed',String(choice.dataset.value===id));
        next.disabled=false;
      });
      choices.append(button);
    }
    options.append(field);
    back.hidden=step===0;
    next.textContent=step===QUESTIONS.length-1?'新しいペットに出会う':'次へ';
    next.disabled=!answers[q.key];
    if(focus)choices.querySelector('button')?.focus();
  }

  dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  back.addEventListener('click',()=>{if(!busy&&step>0){step--;status.textContent='';renderStep(true);}});
  next.addEventListener('click',async()=>{
    if(busy)return;
    const q=QUESTIONS[step];if(!answers[q.key])return;
    if(step<QUESTIONS.length-1){step++;renderStep(true);return;}
    const appearance=appearanceFromAnswers(answers);
    if(!validAppearance(appearance)){status.textContent='診断結果を作れませんでした。もう一度お試しください。';return;}
    const ctx=firebaseContext();if(!ctx){status.textContent='もう一度ログインしてください。';return;}
    busy=true;status.textContent='新しい相棒に出会っています…';
    for(const button of dialog.querySelectorAll('button'))button.disabled=true;
    try{
      await runTransaction(ctx.db,async tx=>{
        const ref=playroomRef(ctx.db,ctx.user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
        if(!hasPet(data))throw Error('先にペットを迎えてください。');
        if(data.petResurveyPending!==true)throw Error('ショップから再診断を購入してください。');
        tx.set(ref,{petAppearance:appearance,petResurveyPending:false,petResurveyedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
      setPageToast('🐾 新しいペットに出会いました！','ok');
      dialog.close();
    }catch(error){status.textContent=error?.message||'新しいペットを保存できませんでした。';}
    finally{
      busy=false;
      for(const button of dialog.querySelectorAll('button'))button.disabled=false;
      next.disabled=!answers[QUESTIONS[step].key];
    }
  });

  surveyDialog={
    open(){if(dialog.open||busy)return;answers={};step=0;status.textContent='';renderStep();dialog.showModal();},
    close(){if(dialog.open&&!busy)dialog.close();}
  };
  return surveyDialog;
}

async function readResurveyState(){
  const ctx=firebaseContext();if(!ctx)return null;
  try{
    const snap=await getDoc(playroomRef(ctx.db,ctx.user)),data=snap.exists()?(snap.data()||{}):{};
    return {pending:data.petResurveyPending===true,coins:Math.max(0,Math.floor(Number(data.coins)||0)),hasPet:hasPet(data)};
  }catch{return null;}
}

async function beginResurvey(button,status){
  if(button.disabled)return;
  const ctx=firebaseContext();if(!ctx){status.textContent='Googleログインすると利用できます。';return;}
  button.disabled=true;status.textContent='確認しています…';
  try{
    const snap=await getDoc(playroomRef(ctx.db,ctx.user)),data=snap.exists()?(snap.data()||{}):{};
    if(!hasPet(data))throw Error('先にペットを迎えてください。');
    const pending=data.petResurveyPending===true;
    if(!pending){
      const coins=Math.max(0,Math.floor(Number(data.coins)||0));
      if(coins<RESURVEY_PRICE)throw Error('コインが足りません。');
      const ok=window.confirm(`${RESURVEY_PRICE}コインを使って、ペットアンケートをもう一度行いますか？\n今の名前・購入済みアイテム・学習記録はそのまま残ります。`);
      if(!ok){status.textContent='';return;}
      await runTransaction(ctx.db,async tx=>{
        const ref=playroomRef(ctx.db,ctx.user),freshSnap=await tx.get(ref),fresh=freshSnap.exists()?(freshSnap.data()||{}):{};
        if(!hasPet(fresh))throw Error('先にペットを迎えてください。');
        if(fresh.petResurveyPending===true)return;
        const freshCoins=Math.max(0,Math.floor(Number(fresh.coins)||0));
        if(freshCoins<RESURVEY_PRICE)throw Error('コインが足りません。');
        tx.set(ref,{coins:freshCoins-RESURVEY_PRICE,petResurveyPending:true,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
    }
    status.textContent='';
    const shop=document.getElementById('petShopDialog');if(shop?.open)shop.close();
    ensureSurveyDialog().open();
  }catch(error){status.textContent=error?.message||'再診断を開始できませんでした。';}
  finally{button.disabled=false;}
}

async function refreshResurveyCard(section){
  if(section.dataset.stateLoading==='1')return;
  section.dataset.stateLoading='1';
  const button=section.querySelector('[data-pet-resurvey]'),status=section.querySelector('[data-pet-resurvey-status]');
  const state=await readResurveyState();
  if(!section.isConnected||!button||!status)return;
  if(!state){button.disabled=false;return;}
  if(state.pending){button.textContent='アンケートを続ける';status.textContent='支払い済みです。続きから再開できます。';button.disabled=false;}
  else{button.textContent='30コインで再診断';status.textContent=state.coins<RESURVEY_PRICE?'コインが足りません。':'';button.disabled=!state.hasPet||state.coins<RESURVEY_PRICE;}
}

let decorateQueued=false;
function decorateShop(){
  decorateQueued=false;
  const shop=document.getElementById('petShopDialog');if(!shop)return;
  for(const tab of shop.querySelectorAll('.pet-shop-tab')){
    if(tab.textContent.includes('見た目変更'))tab.textContent='🐾 ペット';
  }
  const panel=shop.querySelector('#petShopPanel'),title=panel?.querySelector('.pet-shop-panel-title');
  if(!panel||!title)return;
  if(!title.textContent.includes('見た目変更')&&title.textContent.trim()!=='🐾 ペット')return;
  title.textContent='🐾 ペット';
  for(const section of [...panel.querySelectorAll('.pet-custom-section')])section.remove();
  let resurvey=panel.querySelector('.pet-resurvey-section');
  if(!resurvey){
    resurvey=document.createElement('section');
    resurvey.className='pet-resurvey-section';
    resurvey.innerHTML=`<div class="pet-custom-heading"><span>🐾</span><span>ペット再診断</span><span class="pet-custom-price">🪙 ${RESURVEY_PRICE}</span></div><p style="margin:0 0 10px;font-size:11px;line-height:1.65;color:#6d756f">もう一度6つの質問に答えて、新しい姿のペットに出会えます。同じ答えでも、どの動物になるかにはランダム性があります。</p><button class="pet-shop-action" data-pet-resurvey type="button">30コインで再診断</button><div data-pet-resurvey-status style="min-height:1.4em;margin-top:7px;font-size:10px;color:#8a6a19"></div>`;
    const rename=panel.querySelector('.pet-shop-rename');panel.insertBefore(resurvey,rename||null);
    const button=resurvey.querySelector('[data-pet-resurvey]'),status=resurvey.querySelector('[data-pet-resurvey-status]');
    button.addEventListener('click',()=>beginResurvey(button,status));
    refreshResurveyCard(resurvey);
  }
}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;queueMicrotask(decorateShop);}

function installShopEnhancement(){
  const shop=document.getElementById('petShopDialog');
  if(!shop){setTimeout(installShopEnhancement,50);return;}
  const observer=new MutationObserver(queueDecorate);
  observer.observe(shop,{subtree:true,childList:true,characterData:true});
  decorateShop();
}

function installPetMotion(){
  if(document.getElementById('petMotionStyles'))return;
  const style=document.createElement('style');style.id='petMotionStyles';
  style.textContent=`
#petVisual.hatched{cursor:pointer}
#petVisual.hatched .pet-character{transform-box:fill-box;transform-origin:center bottom;animation:petWaddle 8.4s ease-in-out infinite}
#petVisual.hatched .pet-shadow{transform-box:fill-box;transform-origin:center;animation:petShadowWalk 8.4s ease-in-out infinite}
#petVisual.hatched.pet-hop .pet-character{animation:petHop .68s cubic-bezier(.2,.75,.25,1) 1}
@keyframes petWaddle{0%,8%{transform:translateX(-17px) translateY(0) rotate(-1deg)}13%{transform:translateX(-11px) translateY(-2px) rotate(1.6deg)}18%{transform:translateX(-5px) translateY(0) rotate(-1.3deg)}23%{transform:translateX(1px) translateY(-2px) rotate(1.5deg)}28%{transform:translateX(7px) translateY(0) rotate(-1.2deg)}33%{transform:translateX(13px) translateY(-2px) rotate(1.4deg)}40%,52%{transform:translateX(17px) translateY(0) rotate(0)}57%{transform:translateX(11px) translateY(-2px) rotate(-1.6deg)}62%{transform:translateX(5px) translateY(0) rotate(1.3deg)}67%{transform:translateX(-1px) translateY(-2px) rotate(-1.5deg)}72%{transform:translateX(-7px) translateY(0) rotate(1.2deg)}77%{transform:translateX(-13px) translateY(-2px) rotate(-1.4deg)}84%,100%{transform:translateX(-17px) translateY(0) rotate(0)}}
@keyframes petShadowWalk{0%,8%{transform:translateX(-17px)}40%,52%{transform:translateX(17px)}84%,100%{transform:translateX(-17px)}}
@keyframes petHop{0%{transform:translateY(0) scale(1)}18%{transform:translateY(3px) scale(1.04,.96)}48%{transform:translateY(-25px) scale(.98,1.04)}72%{transform:translateY(0) scale(1.04,.96)}100%{transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){#petVisual.hatched .pet-character,#petVisual.hatched .pet-shadow{animation:none!important}}
`;
  document.head.append(style);
  const visual=document.getElementById('petVisual');if(!visual)return;
  let timer=0;
  visual.addEventListener('click',()=>{
    if(!visual.classList.contains('hatched'))return;
    visual.classList.remove('pet-hop');void visual.offsetWidth;visual.classList.add('pet-hop');
    clearTimeout(timer);timer=setTimeout(()=>visual.classList.remove('pet-hop'),720);
  });
}

function boot(){installPetMotion();installShopEnhancement();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
