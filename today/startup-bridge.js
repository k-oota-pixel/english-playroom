const params=new URLSearchParams(location.search);
const articleId=params.get('article')||'';
const openProfile=params.get('profile')==='1';

function waitFor(test,{timeout=12000,interval=60}={}){
  return new Promise(resolve=>{
    const started=Date.now();
    const tick=()=>{
      const value=test();
      if(value){resolve(value);return;}
      if(Date.now()-started>=timeout){resolve(null);return;}
      setTimeout(tick,interval);
    };
    tick();
  });
}

function selectorForArticle(id){
  try{return `[data-open="${CSS.escape(id)}"]`;}
  catch{return '';}
}

async function openRequestedArticle(id){
  const selector=selectorForArticle(id);
  if(!selector)return;
  await waitFor(()=>document.querySelector('#app [data-view]')||document.querySelector('#app [data-open]'));
  let button=document.querySelector(selector);
  if(!button){
    const archive=document.querySelector('[data-view="archive"]');
    if(archive){
      archive.click();
      button=await waitFor(()=>document.querySelector(selector));
    }
  }
  button?.click();
}

async function openRequestedProfile(){
  await waitFor(()=>document.querySelector('#app [data-view]')||document.querySelector('#app [data-open]'));
  // TODAY already auto-opens the survey for a brand-new profile. Give that
  // existing behavior first chance, then open the same dialog when a remote
  // profile was hydrated after the home card was rendered.
  await new Promise(resolve=>setTimeout(resolve,350));
  const dialog=document.getElementById('profileDialog');
  if(dialog?.open)return;
  document.getElementById('profileButton')?.click();
}

if(articleId)void openRequestedArticle(articleId);
if(openProfile)void openRequestedProfile();
