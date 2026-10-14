import {appearanceFromAnswers} from './pet-model.js';
export const QUESTIONS=[
 {key:'personality',title:'友だちと過ごすなら、どんな時間が好き？',answers:[['calm','のんびり、お互いのペースで過ごす'],['playful','たくさん笑って、思いきり遊ぶ'],['curious','知らない場所や新しいことを探検する'],['gentle','好きなものや秘密を、そっと教え合う'],['magical','空想の世界で、不思議な冒険をする']]},
 {key:'bodyColor',title:'好きな色の雰囲気は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
 {key:'eyes',title:'目が合ったら、どんな表情がいい？',answers:[['round','ぱっちり、素直なまなざし'],['sleepy','のんびり、眠たそう'],['sparkle','わくわく、目がきらきら'],['cool','ちょっとクール、頼もしい']]},
 {key:'feature',title:'その子のチャームポイントは？',answers:[['classic','シンプルで自然なかわいさ'],['long','ぴょこんと長い耳や羽'],['horns','小さな角のある不思議な姿']]},
 {key:'pattern',title:'お気に入りの服を選ぶなら？',answers:[['none','すっきり、無地'],['spots','ころころ、水玉'],['stripes','すらっと、しましま'],['star','きらっと、星のワンポイント']]},
 {key:'baseBackground',title:'一緒に過ごしたい場所は？',answers:[['ivory','やさしい光の、おうち'],['sky','青空の見える、ひろば'],['leaf','緑いっぱいの、お庭'],['rose','桜色に包まれた、花畑']]}
];
export function createPetMaker(onSave){
 const dialog=document.createElement('dialog');dialog.className='pet-dialog pet-survey';dialog.setAttribute('aria-labelledby','petMakerTitle');
 dialog.innerHTML=`<div class="survey-eyebrow">MEET YOUR PET</div><h2 id="petMakerTitle">どんな子に出会いたい？</h2><p>6つの質問に答えて、10種類の中からあなたの相棒に出会おう。好みと偶然で決まるので、同じ回答でも違う子が生まれることがあります。姿は、かえってからのお楽しみ。</p><div class="survey-progress" aria-live="polite"></div><div class="pet-options"></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button secondary" data-back>戻る</button><button type="button" class="pet-button" data-next>次へ</button></div>`;document.body.append(dialog);
 let answers={},step=0,busy=false,pendingAppearance=null;
 const status=dialog.querySelector('.pet-save-status'),next=dialog.querySelector('[data-next]'),back=dialog.querySelector('[data-back]'),options=dialog.querySelector('.pet-options');
 function update(focus=false){
  const q=QUESTIONS[step];options.replaceChildren();dialog.querySelector('.survey-progress').textContent=`質問 ${step+1} / ${QUESTIONS.length}`;
  const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');legend.textContent=q.title;choices.className='choices';field.append(legend,choices);
  for(const [id,label] of q.answers){const b=document.createElement('button');b.type='button';b.className='pet-choice';b.dataset.value=id;b.textContent=label;b.setAttribute('aria-pressed',String(answers[q.key]===id));b.addEventListener('click',()=>{answers[q.key]=id;if(pendingAppearance && q.key!=='personality')pendingAppearance[q.key]=id;for(const c of choices.children)c.setAttribute('aria-pressed',String(c.dataset.value===id));next.disabled=false;});choices.append(b);}
  options.append(field);back.hidden=step===0;next.textContent=step===QUESTIONS.length-1?'たまごをかえす':'次へ';next.disabled=!answers[q.key];if(focus)choices.querySelector('button').focus();
 }
 dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 back.addEventListener('click',()=>{if(!busy&&step>0){step--;status.textContent='';update(true);}});
 next.addEventListener('click',async()=>{
  if(busy||!answers[QUESTIONS[step].key])return;if(step<QUESTIONS.length-1){step++;update(true);return;}
  busy=true;status.textContent='たまごがかえりそう…';for(const b of dialog.querySelectorAll('button'))b.disabled=true;
  try{pendingAppearance ||= appearanceFromAnswers(answers);await onSave({...pendingAppearance});dialog.close();}catch(e){status.textContent=e.message||'保存できませんでした。通信状態を確認して再度お試しください。';}
  finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}
 });
 return {open(){if(dialog.open||busy)return;answers={};pendingAppearance=null;step=0;status.textContent='';update();dialog.showModal();},close(){dialog.close();}};
}
