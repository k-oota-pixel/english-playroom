import {OPTIONS,DEFAULT_APPEARANCE,normalizeAppearance} from './pet-model.js';
import {renderPetSVG,appearanceLabel} from './pet-art.js';
const labels={species:'種類',bodyColor:'体の色',eyes:'目',feature:'耳・羽・角',pattern:'模様',baseBackground:'背景色'};
export function createPetMaker(onSave) {
  const dialog=document.createElement('dialog');
  dialog.className='pet-dialog';dialog.setAttribute('aria-labelledby','petMakerTitle');
  dialog.innerHTML=`<h2 id="petMakerTitle">あなただけのペットを作ろう</h2><p>3日ログイン達成！ 好きな見た目を選んで、たまごから迎えよう。決めた見た目は大切に保存されます。</p><div class="pet-maker"><div class="pet-preview" role="img" aria-label="ペットのプレビュー"></div><div class="pet-options"></div></div><div class="pet-save-status" role="status" aria-live="polite"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>あとで</button><button type="button" class="pet-button" data-save>この子を迎える</button></div>`;
  document.body.append(dialog);
  let draft={...DEFAULT_APPEARANCE},busy=false;
  const preview=dialog.querySelector('.pet-preview'), status=dialog.querySelector('.pet-save-status'), save=dialog.querySelector('[data-save]');
  for(const [key,items] of Object.entries(OPTIONS)) {
    const field=document.createElement('fieldset'),legend=document.createElement('legend'),choices=document.createElement('div');
    legend.textContent=labels[key];choices.className='choices';field.append(legend,choices);
    for(const item of items){
      const button=document.createElement('button');button.type='button';button.className='pet-choice';button.dataset.key=key;button.dataset.value=item.id;
      if(item.color){const swatch=document.createElement('span');swatch.className='swatch';swatch.style.setProperty('--swatch',item.color);button.append(swatch);}
      button.append(document.createTextNode(item.label));
      button.addEventListener('click',()=>{draft[key]=item.id;update();});choices.append(button);
    }
    dialog.querySelector('.pet-options').append(field);
  }
  function update(){preview.innerHTML=renderPetSVG(draft);preview.setAttribute('aria-label',appearanceLabel(draft));for(const b of dialog.querySelectorAll('.pet-choice'))b.setAttribute('aria-pressed',String(draft[b.dataset.key]===b.dataset.value));}
  dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  save.addEventListener('click',async()=>{
    if(busy)return;busy=true;status.textContent='保存しています…';for(const b of dialog.querySelectorAll('button'))b.disabled=true;
    try{await onSave({...draft});dialog.close();}catch(error){status.textContent=error.message||'保存できませんでした。通信状態を確認して再度お試しください。';}
    finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}
  });
  return {open(value){if(dialog.open||busy)return;draft=normalizeAppearance(value);status.textContent='';update();dialog.showModal();},close(){dialog.close();}};
}
