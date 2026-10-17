const NOTE='幼体プレビューでは、動物の種類がまだ決まっていない共通のふわふわ幼体を表示します。成体プレビューでは、選んだ動物・からだの色・目を確認できます。左のボタンはプレビュー専用です。背景・特徴・模様はキャラクター本体のカスタマイズ対象外です。';

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
