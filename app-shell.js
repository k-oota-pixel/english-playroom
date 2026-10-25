const root = new URL('./', import.meta.url);
const features = [
  ['ショップ','#petShopOpen'],['ペット強化','#petStrengthOpen'],
  ['称号','[data-titles-open]'],['チャレンジ','[data-challenge-refresh]'],['ランキング','#coinRankRefresh']
];

function install() {
  if (window !== top || window.MonstudyShell) return;
  const home = document.querySelector('main.home'), topbar = home?.querySelector('.topbar');
  if (!home || !topbar) return;
  const groups = [...home.querySelectorAll('.material-group')].map(group => ({
    name:group.querySelector('h2').textContent,
    items:[...group.querySelectorAll('a.card')].map(card => {
      const title=card.querySelector('.title').cloneNode(true); title.querySelectorAll('.eiken-badge').forEach(n=>n.remove());
      return {name:title.textContent.trim(), url:new URL(card.href)};
    })
  }));
  groups.push({name:'エイゴダンジョンズ',items:[
    {name:'冒険先を選ぶ',url:new URL('pet-adventure/',root)},
    {name:'魔王の塔',url:new URL('pet-adventure/?mode=tower',root)},
    {name:'魔物の巣窟',url:new URL('pet-adventure/?mode=dungeon',root)}
  ]});
  const canonical = path => path.replace(/index\.html$/, '');
  const allowed = new Set(groups.flatMap(g=>g.items.map(i=>canonical(i.url.pathname))));
  allowed.add(new URL('pet-catch/',root).pathname);
  const homePath = root.pathname;
  function canOpen(value) {
    const u=new URL(value,root);
    return u.origin===root.origin && (allowed.has(canonical(u.pathname)) || canonical(u.pathname)===homePath);
  }
  const sidebarIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
  const shell = document.createElement('div'); shell.id='monstudyShell';
  shell.innerHTML = `<header class="ms-header"><button class="ms-menu" type="button" aria-label="メニューを開く" aria-controls="msSidebar" aria-expanded="false" title="サイドバーを表示">${sidebarIcon}</button><a class="ms-brand" href="${root.href}" aria-label="もんすたでぃ ホーム"></a><span class="ms-current" aria-live="polite">ホーム</span><div class="ms-account"></div></header><button class="ms-shade" type="button" aria-label="メニューを閉じる" hidden></button><aside class="ms-sidebar" id="msSidebar" aria-label="共通メニュー"><nav><div class="ms-home-row"><a class="ms-home" href="${root.href}"><span aria-hidden="true">⌂</span> ホーム</a><button class="ms-sidebar-toggle" type="button" aria-label="サイドバーを隠す" title="サイドバーを隠す" aria-controls="msSidebar">${sidebarIcon}</button></div><p class="ms-nav-label">教材カテゴリー</p><div class="ms-groups"></div><p class="ms-nav-label">ペットと学習</p><div class="ms-features"></div></nav><span class="ms-sidebar-foot">もんすたでぃ · ver2.1.4</span></aside><section class="ms-workspace"><div class="ms-home-content"></div><iframe class="ms-material" title="教材" allow="microphone; autoplay; fullscreen" hidden></iframe><p class="ms-status" role="status" hidden></p></section>`;
  document.body.prepend(shell);
  shell.querySelector('.ms-brand').append(topbar.querySelector('.logo'));
  shell.querySelector('.ms-account').append(topbar.querySelector('.auth-area'));
  topbar.remove(); shell.querySelector('.ms-home-content').append(home);
  const frame=shell.querySelector('iframe'), title=shell.querySelector('.ms-current'), status=shell.querySelector('.ms-status');
  const shade=shell.querySelector('.ms-shade'), menu=shell.querySelector('.ms-menu');
  let current='', historyIndex=0, restoring=false, pendingFeature=null, opener=null;
  function mobileMenu(open) {
    shell.classList.toggle('ms-menu-open',open); shade.hidden=!open;
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    if(open) shell.querySelector('.ms-home').focus();
  }
  function closeGroups() { shell.querySelectorAll('.ms-group').forEach(g=>{g.classList.remove('is-open');g.querySelector('button').setAttribute('aria-expanded','false');}); }
  const container=shell.querySelector('.ms-groups');
  groups.forEach((group,index)=>{
    const row=document.createElement('div');row.className='ms-group';
    const button=document.createElement('button');button.type='button';button.textContent=group.name+' ›';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','ms-submenu-'+index);
    const list=document.createElement('div');list.className='ms-submenu';list.id='ms-submenu-'+index;
    const open=()=>{closeGroups();row.classList.add('is-open');button.setAttribute('aria-expanded','true');if(matchMedia('(min-width:801px)').matches){list.style.top='0px';const bounds=list.getBoundingClientRect();if(bounds.bottom>innerHeight-8)list.style.top=Math.min(0,innerHeight-8-bounds.bottom)+'px';}};
    button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(min-width:801px)').matches)open();});
    row.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!row.contains(document.activeElement)) {row.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
    button.addEventListener('click',e=>{if(e.pointerType==='mouse'&&matchMedia('(min-width:801px)').matches){open();return;}if(row.classList.contains('is-open')) {row.classList.remove('is-open');button.setAttribute('aria-expanded','false');} else open();});
    button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();open();list.querySelector('a').focus();}});
    row.addEventListener('focusout',e=>{if(!row.contains(e.relatedTarget)){row.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
    group.items.forEach(item=>{const a=document.createElement('a');a.href=item.url;a.textContent=item.name;list.append(a);});
    row.append(button,list);container.append(row);
  });
  const featureContainer=shell.querySelector('.ms-features');
  features.forEach(([name,selector])=>{
    const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.feature=selector;
    button.addEventListener('click',()=>openFeature(selector,button));featureContainer.append(button);
  });
  const signout=document.createElement('button');signout.type='button';signout.className='ms-signout';signout.textContent='ログアウト';signout.hidden=true;
  signout.onclick=()=>document.getElementById('logoutBtn')?.click();featureContainer.after(signout);
  function child() {try{return frame.contentWindow?.MonstudyMaterial;}catch{return null;}}
  function hasModal(){return !!document.querySelector('dialog[open]');}
  function syncPause(){child()?.setPaused(hasModal()||Boolean(pendingFeature));}
  function updateFeatures(){for(const button of featureContainer.children){const target=document.querySelector(button.dataset.feature),disabled=!target||target.disabled;if(button.disabled!==disabled)button.disabled=disabled;}const logout=document.getElementById('logoutBtn'),hide=!logout||logout.hidden;if(signout.hidden!==hide)signout.hidden=hide;}
  function openFeature(selector,button){
    const target=document.querySelector(selector);if(!target||target.disabled)return;
    opener=button;mobileMenu(false);closeGroups();pendingFeature=selector;syncPause();
    target.click(); pendingFeature=null;syncPause();
  }
  new MutationObserver(()=>{updateFeatures();syncPause();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','disabled','hidden']});
  document.addEventListener('close',()=>{syncPause();if(!hasModal())opener?.focus();},true);
  function cleanURL(value){const u=new URL(value);u.searchParams.delete('monstudy-release');return u;}
  function materialName(value){const u=cleanURL(value);return groups.flatMap(g=>g.items).find(i=>i.url.pathname===u.pathname&&i.url.search===u.search)?.name||groups.flatMap(g=>g.items).find(i=>i.url.pathname===u.pathname)?.name||'教材';}
  function key(value){const u=cleanURL(value);return u.pathname+u.search+u.hash;}
  function isHome(u){return u.pathname===homePath||u.pathname===homePath+'index.html';}
  function show(u){
    current=isHome(u)?'':key(u);
    shell.classList.toggle('ms-showing-material',!!current);
    title.textContent=current?materialName(u):'ホーム';document.title=title.textContent+'｜もんすたでぃ';
    home.hidden=!!current; frame.hidden=!current;
    shell.querySelectorAll('nav a').forEach(a=>{const active=current?key(new URL(a.href))===current:a.classList.contains('ms-home');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(current){const entry=new URL(u);entry.searchParams.set('monstudy-release','2.1.4');frame.title=title.textContent;frame.src=entry.href;status.textContent='教材を読み込んでいます…';status.hidden=false;}
    else {frame.removeAttribute('src');status.hidden=true;}
    mobileMenu(false);closeGroups();shell.querySelector('.ms-workspace').scrollTop=0;
  }
  function routeURL(u){const value=new URL(root);if(!isHome(u))value.searchParams.set('material',key(u));return value;}
  function allowedToLeave(){
    if(!child()?.isActive())return true;
    child().setPaused(true);
    const ok=window.confirm('回答・プレイの途中です。別の画面へ移動しますか？\n途中の状態は復元されない場合があります。');
    syncPause();return ok;
  }
  function navigate(value){
    const u=new URL(value,root);if(!canOpen(u))return false;
    if((isHome(u)?'':key(u))===current){mobileMenu(false);return true;}
    if(!allowedToLeave())return false;
    historyIndex++;history.pushState({monstudy:true,index:historyIndex},'',routeURL(u));show(u);return true;
  }
  window.MonstudyShell={canOpen,navigate,owns:win=>win===frame.contentWindow,materialReady(win){if(win!==frame.contentWindow)return;status.hidden=true;syncPause();}};
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;
    const u=new URL(a.href);if(a.getAttribute('href').startsWith('#'))return;
    if(canOpen(u)){e.preventDefault();if(navigate(u))document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  });
  const mobile = matchMedia('(max-width:800px)');
  function setSidebarHidden(value){
    shell.classList.toggle('ms-concentrated',value);
    try{localStorage.setItem('monstudy-focus',String(value));}catch{}
  }
  menu.onclick=()=>{if(mobile.matches)mobileMenu(!shell.classList.contains('ms-menu-open'));else{setSidebarHidden(false);shell.querySelector('.ms-sidebar-toggle').focus();}};
  shade.onclick=()=>mobileMenu(false);
  shell.querySelector('.ms-sidebar-toggle').onclick=()=>{if(mobile.matches)mobileMenu(false);else setSidebarHidden(true);menu.focus();};
  try{setSidebarHidden(localStorage.getItem('monstudy-focus')==='true');}catch{}
  mobile.addEventListener('change',()=>mobileMenu(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!hasModal()){closeGroups();mobileMenu(false);menu.focus();}});
  window.addEventListener('popstate',e=>{
    if(restoring){restoring=false;return;}
    const targetIndex=e.state?.index??0, delta=historyIndex-targetIndex;
    if(!allowedToLeave()){restoring=true;history.go(delta||1);return;}
    historyIndex=targetIndex;const value=new URL(location.href).searchParams.get('material');const u=value?new URL(value,root):root;
    show(canOpen(u)?u:root);
  });
  window.addEventListener('beforeunload',e=>{if(child()?.isActive()){e.preventDefault();e.returnValue='';}});
  frame.addEventListener('load',()=>{
    if(!current)return;
    status.hidden=true;
    try {const u=new URL(frame.contentWindow.location.href);if(canOpen(u)&&key(u)!==current){current=key(u);history.replaceState({monstudy:true,index:historyIndex},'',routeURL(u));title.textContent=materialName(u);frame.title=title.textContent;}}catch{}
    syncPause();
  });
  const initial=new URL(location.href).searchParams.get('material');let u=root;
  try{if(initial&&canOpen(initial))u=new URL(initial,root);}catch{}
  history.replaceState({monstudy:true,index:0},'',routeURL(u));show(u);updateFeatures();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
