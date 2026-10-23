import {normalizePetName,validPetName} from './pet-model.js?v=1.8.23';

const SPECIES=['cat','dog','bird','hamster','panda','penguin','dragon'];
const PERSONALITY_POOLS={calm:['cat','panda'],playful:['dog','hamster'],curious:['bird','penguin','dragon']};
const EYE_POOLS={
 oyoyo:['oyoyo'],
 bright:['round','round','round','sparkle','sparkle'],
 gentle:['gentle','gentle','gentle','watery','watery'],
 happy:['smile','smile','smile','round','round'],
 drowsy:['sleepy','sleepy','sleepy','gentle','gentle']
};
function pick(list,random=Math.random){return list[Math.min(list.length-1,Math.max(0,Math.floor(random()*list.length)))];}
function chooseSpecies(preference,random=Math.random){
 const favorites=PERSONALITY_POOLS[preference]||[];
 const tickets=SPECIES.flatMap(id=>Array(favorites.includes(id)?3:1).fill(id));
 return pick(tickets,random);
}
function chooseEyes(mood,random=Math.random){return pick(EYE_POOLS[mood]||['round'],random);}
function legacyEye(style){return style==='sleepy'?'sleepy':style==='sparkle'?'sparkle':'round';}
function appearanceFromAnswers(answers,random=Math.random){
 const eyeStyle=chooseEyes(answers.eyeMood,random);
 return {
  species:chooseSpecies(answers.personality,random),
  bodyColor:answers.bodyColor,
  eyes:legacyEye(eyeStyle),
  eyeStyle,
  feature:'classic',
  pattern:'none',
  baseBackground:'sky'
 };
}

export const QUESTIONS=[
 {key:'personality',title:'一緒に過ごすなら、どんな相棒がいい？',answers:[['calm','のんびり落ち着いて過ごせる子'],['playful','元気いっぱい、一緒に遊べる子'],['curious','好奇心旺盛で、一緒に冒険できる子']]},
 {key:'bodyColor',title:'その子に似合いそうな色は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
 {key:'eyeMood',title:'目が合ったとき、どんな表情だとうれしい？',answers:[['bright','ぱっちり元気なまなざし'],['gentle','やさしく見つめてくれる'],['happy','いつもごきげんな笑顔'],['drowsy','ちょっと眠たそうでおっとり'],['oyoyo','およよ：すっと横線のおとぼけ顔']]}
];
export function createPetMaker(onSave){
 const dialog=document.createElement('dialog');dialog.className='pet-dialog pet-survey';dialog.setAttribute('aria-labelledby','petMakerTitle');
 dialog.innerHTML=`<div class="survey-eyebrow">MEET YOUR PET</div><h2 id="petMakerTitle">どんな子に出会いたい？</h2><p>3つの質問に答えて、7種類の中からあなたの相棒に出会おう。答えによって出会いやすい子や目の表情が変わりますが、少しだけ偶然も入ります。最後に名前をつけて迎えよう。</p><div class="survey-progress" aria-live="polite"></div><div class="pet-options"></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button secondary" data-back>戻る</button><button type="button" class="pet-button" data-next>次へ</button></div>`;document.body.append(dialog);
 let answers={},step=0,busy=false,pendingAppearance=null,petName='';
 const status=dialog.querySelector('.pet-save-status'),next=dialog.querySelector('[data-next]'),back=dialog.querySelector('[data-back]'),options=dialog.querySelector('.pet-options');
 function update(focus=false){
  options.replaceChildren();
  if(step===QUESTIONS.length){
   dialog.querySelector('.survey-progress').textContent='最後に、相棒の名前をつけよう';
   options.innerHTML='<label for="newPetName">ペットの名前</label><input id="newPetName" class="pet-name-input" type="text" autocomplete="off" aria-describedby="newPetNameHint"><p id="newPetNameHint">1〜12文字。日本語でも英語でもOK！</p>';
   const input=options.querySelector('input');input.value=petName;input.addEventListener('input',()=>{petName=input.value;next.disabled=!validPetName(petName);});
   back.hidden=false;next.textContent='この姿に成長する';next.disabled=!validPetName(petName);if(focus)input.focus();return;
  }
  const q=QUESTIONS[step];dialog.querySelector('.survey-progress').textContent=`質問 ${step+1} / ${QUESTIONS.length}`;
  const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');legend.textContent=q.title;choices.className='choices';field.append(legend,choices);
  for(const [id,label] of q.answers){const b=document.createElement('button');b.type='button';b.className='pet-choice';b.dataset.value=id;b.textContent=label;b.setAttribute('aria-pressed',String(answers[q.key]===id));b.addEventListener('click',()=>{answers[q.key]=id;for(const c of choices.children)c.setAttribute('aria-pressed',String(c.dataset.value===id));next.disabled=false;});choices.append(b);}
  options.append(field);back.hidden=step===0;next.textContent=step===QUESTIONS.length-1?'名前をつける':'次へ';next.disabled=!answers[q.key];if(focus)choices.querySelector('button').focus();
 }
 dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 back.addEventListener('click',()=>{if(!busy&&step>0){step--;status.textContent='';update(true);}});
 next.addEventListener('click',async()=>{
  if(busy)return;if(step<QUESTIONS.length){if(!answers[QUESTIONS[step].key])return;step++;update(true);return;}if(!validPetName(petName))return;
  busy=true;status.textContent='成長しています…';for(const b of dialog.querySelectorAll('button'))b.disabled=true;
  try{pendingAppearance ||= appearanceFromAnswers(answers);await onSave({...pendingAppearance},normalizePetName(petName));dialog.close();}catch(e){status.textContent=e.message||'保存できませんでした。通信状態を確認して再度お試しください。';}
  finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}
 });
 return {open(existingName=''){if(dialog.open||busy)return;answers={};petName=validPetName(existingName)?existingName:'';pendingAppearance=null;step=0;status.textContent='';update();dialog.showModal();},close(){dialog.close();}};
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
