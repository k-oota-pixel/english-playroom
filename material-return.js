const HOME=new URL('./',import.meta.url);

function install(){
  const shell=document.getElementById('monstudyShell');
  const workspace=shell?.querySelector('.ms-workspace');
  const frame=shell?.querySelector('.ms-material');
  if(!shell||!workspace||!frame||!window.MonstudyShell){setTimeout(install,60);return;}
  if(document.getElementById('monstudyMaterialReturn'))return;

  const style=document.createElement('style');
  style.id='monstudyMaterialReturnStyle';
  style.textContent=`
    #monstudyMaterialReturn{box-sizing:border-box;height:44px;display:flex;align-items:center;padding:6px 14px;background:#fffdf8;border-bottom:1px solid #dce5da;position:relative;z-index:20}
    #monstudyMaterialReturn[hidden]{display:none!important}
    #monstudyMaterialReturn button{appearance:none;border:1px solid #d5e0d7;background:#fff;color:#285c4c;border-radius:999px;padding:7px 12px;font:800 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 2px 8px #173d3508}
    #monstudyMaterialReturn button:hover{background:#edf5ef}
    #monstudyMaterialReturn button:focus-visible{outline:3px solid #dfb54d;outline-offset:2px}
    #monstudyShell.ms-showing-material .ms-material{height:calc(100% - 44px)}
    @media(max-width:800px){#monstudyMaterialReturn{height:40px;padding:5px 10px}#monstudyMaterialReturn button{font-size:11px;padding:6px 10px}#monstudyShell.ms-showing-material .ms-material{height:calc(100% - 40px)}}
  `;
  document.head.append(style);

  const bar=document.createElement('div');
  bar.id='monstudyMaterialReturn';
  bar.hidden=true;
  const back=document.createElement('button');
  back.type='button';
  back.textContent='← もんすたでぃに戻る';
  back.setAttribute('aria-label','もんすたでぃのメイン画面に戻る');
  back.addEventListener('click',()=>window.MonstudyShell?.navigate(HOME));
  bar.append(back);
  workspace.prepend(bar);

  const sync=()=>{bar.hidden=!shell.classList.contains('ms-showing-material');};
  new MutationObserver(sync).observe(shell,{attributes:true,attributeFilter:['class']});
  sync();

  let childObserver=null;
  function stopChildObserver(){childObserver?.disconnect();childObserver=null;}
  function applyCoinDelta(doc){
    const toast=doc?.getElementById('englishPlayroomCoinToast');
    if(!toast?.classList.contains('show'))return;
    const match=(toast.textContent||'').match(/🪙\s*\+(\d+)/);
    if(!match)return;
    const delta=Math.max(0,Number(match[1])||0),total=document.getElementById('coinsToday');
    if(!delta||!total)return;
    const current=Number(String(total.textContent||'').replace(/[^0-9]/g,''));
    if(Number.isFinite(current))total.textContent=(current+delta).toLocaleString('ja-JP');
    const caption=document.getElementById('coinsTodayCaption');
    if(caption)caption.textContent='今日、教材に取り組んで獲得したコイン';
  }
  function watchChild(){
    stopChildObserver();
    let doc;try{doc=frame.contentDocument;}catch{return;}
    if(!doc?.documentElement)return;
    childObserver=new MutationObserver(mutations=>{
      const toast=doc.getElementById('englishPlayroomCoinToast');
      if(!toast)return;
      const contentChanged=mutations.some(m=>
        (m.type==='childList'&&m.target===toast)||
        (m.type==='characterData'&&toast.contains(m.target))
      );
      if(contentChanged)applyCoinDelta(doc);
    });
    childObserver.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }
  frame.addEventListener('load',watchChild);
  window.addEventListener('pagehide',stopChildObserver,{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
