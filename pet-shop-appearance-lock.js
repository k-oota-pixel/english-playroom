// v1.5.32: retire the entire appearance-customization tab.
// Purchased accessories/effects/background items remain available; direct pet appearance editing does not.
function isAppearanceTab(tab){
  return !!tab && tab.classList?.contains('pet-shop-tab') && tab.textContent.includes('見た目変更');
}

function firstRegularTab(){
  return [...document.querySelectorAll('#petShopDialog .pet-shop-tab')].find(tab=>!isAppearanceTab(tab));
}

function removeAppearanceCustomization(){
  const shop=document.getElementById('petShopDialog');
  if(!shop)return;

  for(const tab of shop.querySelectorAll('.pet-shop-tab')){
    if(isAppearanceTab(tab))tab.remove();
  }

  const panel=shop.querySelector('#petShopPanel');
  const title=panel?.querySelector('.pet-shop-panel-title')?.textContent||'';
  if(title.includes('見た目変更')){
    const fallback=firstRegularTab();
    if(fallback)fallback.click();
    else if(panel)panel.replaceChildren();
  }
}

function installAppearanceLock(){
  document.addEventListener('click',event=>{
    const tab=event.target.closest?.('.pet-shop-tab');
    if(!isAppearanceTab(tab))return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    tab.remove();
    firstRegularTab()?.click();
  },true);

  const observer=new MutationObserver(removeAppearanceCustomization);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  removeAppearanceCustomization();
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAppearanceLock,{once:true});
else installAppearanceLock();
