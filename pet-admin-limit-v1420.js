const NOTE='幼体/成体の選択は実際の状態に反映されます。幼体では共通の「なぞのいきもの」を表示し、成体では選んだ動物・からだの色・目を反映します。幼体に戻した場合、名前は未設定に戻ります。コイン・装備・学習記録・成長日数には触れません。';

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
