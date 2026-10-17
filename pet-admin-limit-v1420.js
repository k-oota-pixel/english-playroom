const NOTE='ペット本体の描画は「動物の種類・からだの色・幼体/成体・目」の4要素だけで変化します。幼体/成体は成長段階に合わせて切り替わり、左のボタンでは両方をプレビューできます。背景・特徴・模様はキャラクター本体のカスタマイズ対象外です。';

function patch(){
  const dialog=document.querySelector('#petAdminDialog');
  if(!dialog)return false;
  if(dialog.dataset.petAdminLimitPatched==='1')return true;

  const bg=dialog.querySelector('select[data-key="baseBackground"]');
  bg?.closest('.pet-admin-field')?.remove();

  const random=dialog.querySelector('[data-random]');
  if(random)random.hidden=true;

  const note=dialog.querySelector('.pet-admin-note');
  if(note&&note.textContent!==NOTE)note.textContent=NOTE;

  dialog.dataset.petAdminLimitPatched='1';
  return true;
}

function start(){
  if(patch())return;
  const observer=new MutationObserver(()=>{
    if(patch())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
