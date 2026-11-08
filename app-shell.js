const root = new URL('./', import.meta.url);
const MATERIAL_RELEASE='2.1.33';
const features = [
  ['ショップ','#petShopOpen'],['ペット強化','#petStrengthOpen'],
  ['称号','[data-titles-open]'],['チャレンジ','[data-challenge-refresh]'],['ランキング','#coinRankRefresh']
];

function install() {
  if (window !== top || window.MonstudyShell) return;
  const home = document.querySelector('main.home'), topbar = home?.querySelector('.topbar');
  if (!home || !topbar) return;

  const conversationSection=home.querySelector('#materials-conversation');
  const conversationCards=conversationSection?.querySelector('.cards');
  if(conversationCards&&!conversationCards.querySelector('[data-case-talk-card]')){
    const card=document.createElement('a');
    card.className='card task';
    card.href='https://k-oota-pixel.github.io/task-quest/case-talk.html';
    card.dataset.caseTalkCard='1';
    card.innerHTML='<div class="eyebrow">COMMUNICATION REPAIR</div><div class="title">サポート付きケーストーク</div><div class="desc">相手に伝わるまで言い直す実践英会話。EASYはヒント多め、NORMALは聞き返し中心。</div><div class="chips"><span class="chip">EASY / NORMAL</span><span class="chip">言い直し</span><span class="chip">AI判定</span></div><div class="play"><span>ケーストークを始める</span><span>→</span></div>';
    conversationCards.append(card);
    const count=conversationSection.querySelector('.material-group-head>span');
    if(count)count.textContent=conversationCards.querySelectorAll('a.card').length+'教材';
  }

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
    {name:'魔物の巣窟',url:new URL('pet-adventure/?mode=dungeon',root)},
    {name:'オンライン対戦',url:new URL('pet-adventure/online-battle.html',root)},
    {name:'もんすた城の防衛',url:new URL('pet-typing-defense/',root)}
  ]});
  const hiddenMaterials=[{name:'ぺっとのおへや',url:new URL('pet-room/room-v4.html',root)},{name:'WebPベッド試験版',url:new URL('pet-room/room-webp-v1.html',root)},{name:'ぺっとのおへや・ほっこり版',url:new URL('pet-room/room-cozy.html',root)},{name:'ペットのおへや（旧トップビュー版）',url:new URL('pet-room/topview.html',root)},{name:'ペットのおへや（旧アイソメ版）',url:new URL('pet-room/v5.html',root)},{name:'PET FISHING',url:new URL('pet-fishing/',root)}];
  const canonical = path => path.replace(/index\.html$/, '');
  const allMaterials=[...groups.flatMap(g=>g.items),...hiddenMaterials];
  const allowed = new Set(allMaterials.map(i=>canonical(i.url.pathname)));
  allowed.add(new URL('pet-catch/',root).pathname);
  const homePath = root.pathname;
  const immersiveMaterialPath = new URL('../eiken-retry/',root).pathname;
  function canOpen(value) {
    const u=new URL(value,root);
    return u.origin===root.origin && (allowed.has(canonical(u.pathname)) || canonical(u.pathname)===homePath);
  }
  const sidebarIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
  const shell = document.createElement('div'); shell.id='monstudyShell';
  shell.innerHTML = `<header class="ms-header"><a class="ms-brand" href="${root.href}" aria-label="もんすたでぃ ホーム"></a><div class="ms-page-nav"><a class="ms-current" href="${root.href}" aria-live="polite" aria-label="もんすたでぃ ホーム">ホーム</a><button class="ms-menu" type="button" aria-label="メニューを開く" aria-controls="msSidebar" aria-expanded="false" title="サイドバーを表示">${sidebarIcon}</button></div><div class="ms-account"></div></header><button class="ms-shade" type="button" aria-label="メニューを閉じる" hidden></button><aside class="ms-sidebar" id="msSidebar" aria-label="共通メニュー"><nav><div class="ms-home-row"><a class="ms-home" href="${root.href}"><span aria-hidden="true">⌂</span> ホーム</a><button class="ms-sidebar-toggle" type="button" aria-label="サイドバーを隠す" title="サイドバーを隠す" aria-controls="msSidebar">${sidebarIcon}</button></div><p class="ms-nav-label">教材カテゴリー</p><div class="ms-groups"></div><p class="ms-nav-label">ペットと学習</p><div class="ms-features"></div></nav></aside><section class="ms-workspace"><div class="ms-home-content"></div><iframe class="ms-material" title="教材" allow="microphone; autoplay; fullscreen" hidden></iframe><p class="ms-status" role="status" hidden></p></section>`;
  document.body.prepend(shell);
  shell.querySelector('.ms-brand').append(topbar.querySelector('.logo'));
  shell.querySelector('.ms-account').append(topbar.querySelector('.auth-area'));
  topbar.remove(); shell.querySelector('.ms-home-content').append(home);
  const frame=shell.querySelector('iframe'), title=shell.querySelector('.ms-current'), status=shell.querySelector('.ms-status');
  const shade=shell.querySelector('.ms-shade'), menu=shell.querySelector('.ms-menu');
  let current='', historyIndex=0, restoring=false, pendingFeature=null, opener=null, departingVersion=0;
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
    const open=()=>{closeGroups();row.classList.add('is-open');button.setAttribute('aria-expanded','true');if(matchMedia('(min-width:481px) and (max-width:800px)').matches){const anchor=button.getBoundingClientRect(),left=Math.min(anchor.right,innerWidth-list.offsetWidth-8),top=Math.max(58,Math.min(anchor.top,innerHeight-list.offsetHeight-8));list.style.left=left+'px';list.style.top=top+'px';}else if(matchMedia('(min-width:801px)').matches){list.style.top='0px';const bounds=list.getBoundingClientRect();if(bounds.bottom>innerHeight-8)list.style.top=Math.min(0,innerHeight-8-bounds.bottom)+'px';}else{list.style.left='';list.style.top='';}};
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
  let sharedScreenTheme=null;
  let themedSurfaceDoc=null,themedSurfaceKey='',themedSurfaceObserver=null,themedSurfaceTimer=0;
  const themedSurfaceOriginals=new Map();
  function restoreThemedSurfaces(){
    themedSurfaceObserver?.disconnect();themedSurfaceObserver=null;
    if(themedSurfaceTimer){clearTimeout(themedSurfaceTimer);themedSurfaceTimer=0;}
    for(const [element,original] of themedSurfaceOriginals){
      for(const [property,value,priority] of [['background-color',original.backgroundColor,original.backgroundColorPriority],['background-image',original.backgroundImage,original.backgroundImagePriority],['color',original.color,original.colorPriority],['caret-color',original.caretColor,original.caretColorPriority],['-webkit-text-fill-color',original.textFillColor,original.textFillColorPriority]]){
        if(value)element.style.setProperty(property,value,priority);else element.style.removeProperty(property);
      }
    }
    themedSurfaceOriginals.clear();themedSurfaceDoc=null;themedSurfaceKey='';
  }
  function cssRgb(value){
    const m=String(value||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
    return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null;
  }
  function colorLuminance(rgb){
    if(!rgb)return 0;
    const channel=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
    return .2126*channel(rgb.r)+.7152*channel(rgb.g)+.0722*channel(rgb.b);
  }
  function hexRgb(hex){
    const value=String(hex||'').replace('#','');
    if(!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))return null;
    const short=value.length<=4,full=short?[...value.slice(0,3)].map(c=>c+c).join('')+ (value.length===4?value[3]+value[3]:''):value;
    return {r:parseInt(full.slice(0,2),16),g:parseInt(full.slice(2,4),16),b:parseInt(full.slice(4,6),16),a:full.length===8?parseInt(full.slice(6,8),16)/255:1};
  }
  function mixedHex(background,foreground){
    const a=hexRgb(background)||hexRgb('#202421'),b=hexRgb(foreground)||hexRgb('#ffffff');
    const channel=(x,y)=>Math.round(x*.94+y*.06).toString(16).padStart(2,'0');
    return '#'+channel(a.r,b.r)+channel(a.g,b.g)+channel(a.b,b.b);
  }
  function patchThemedSurface(element,property,value){
    if(!themedSurfaceOriginals.has(element))themedSurfaceOriginals.set(element,{
      backgroundColor:element.style.getPropertyValue('background-color'),backgroundColorPriority:element.style.getPropertyPriority('background-color'),
      backgroundImage:element.style.getPropertyValue('background-image'),backgroundImagePriority:element.style.getPropertyPriority('background-image'),
      color:element.style.getPropertyValue('color'),colorPriority:element.style.getPropertyPriority('color'),
      caretColor:element.style.getPropertyValue('caret-color'),caretColorPriority:element.style.getPropertyPriority('caret-color'),
      textFillColor:element.style.getPropertyValue('-webkit-text-fill-color'),textFillColorPriority:element.style.getPropertyPriority('-webkit-text-fill-color')
    });
    if(element.style.getPropertyValue(property)!==value||element.style.getPropertyPriority(property)!=='important')element.style.setProperty(property,value,'important');
  }
  function scanThemedSurfaces(doc,color,foreground){
    if(!doc.body)return;
    const bg=hexRgb(color),fg=hexRgb(foreground);
    if(colorLuminance(bg)>.38||colorLuminance(fg)<.62){restoreThemedSurfaces();return;}
    const key=color.toLowerCase()+'|'+foreground.toLowerCase();
    if(themedSurfaceDoc!==doc||themedSurfaceKey!==key){restoreThemedSurfaces();themedSurfaceDoc=doc;themedSurfaceKey=key;}
    const win=doc.defaultView,surface=[],surfaceSet=new Set(),surfaceColor=mixedHex(color,foreground);
    const candidates=doc.body.querySelectorAll('*');
    for(const element of candidates){
      if(/^(SVG|PATH|IMG|VIDEO|CANVAS|IFRAME|SCRIPT|STYLE)$/.test(element.tagName))continue;
      const style=win.getComputedStyle(element),background=cssRgb(style.backgroundColor);
      let light=Boolean(background&&background.a>=.90&&colorLuminance(background)>.88);
      if(!light&&style.backgroundImage&&style.backgroundImage!=='none'){
        const stops=[...style.backgroundImage.matchAll(/#[0-9a-f]{3,8}\b/ig)].map(m=>hexRgb(m[0]));
        if(stops.length&&stops.length<=8&&stops.every(stop=>colorLuminance(stop)>.86))light=true;
      }
      const formControl=/^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(element.tagName);
      if(light&&(formControl||Boolean(element.textContent?.trim()))){surface.push(element);surfaceSet.add(element);}
    }
    for(const element of surface){
      patchThemedSurface(element,'background-color',surfaceColor);
      if(win.getComputedStyle(element).backgroundImage!=='none')patchThemedSurface(element,'background-image','none');
    }
    for(const root of surface){
      const textNodes=[root,...root.querySelectorAll('*')];
      for(const element of textNodes){
        if(element!==root&&surfaceSet.has(element))continue;
        if(![...element.childNodes].some(node=>node.nodeType===3&&node.nodeValue.trim()))continue;
        const style=win.getComputedStyle(element);
        if(style.display==='none'||style.visibility==='hidden')continue;
        if(colorLuminance(cssRgb(style.color))<.36)patchThemedSurface(element,'color',foreground);
      }
    }
    // Form fields have no text nodes, so the surface scanner above cannot adjust
    // the entered text. Keep background, ink and caret together for dark themes.
    // Exclude non-text inputs (checkboxes, buttons, sliders, etc.) to preserve their UI.
    for(const control of doc.body.querySelectorAll('textarea,select,input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="range"]):not([type="color"]):not([type="file"])')){
      const appearance=win.getComputedStyle(control);
      if(appearance.display==='none'||appearance.visibility==='hidden')continue;
      patchThemedSurface(control,'background-color',surfaceColor);
      patchThemedSurface(control,'color',foreground);
      patchThemedSurface(control,'caret-color',foreground);
      patchThemedSurface(control,'-webkit-text-fill-color',foreground);
    }
    themedSurfaceObserver?.takeRecords();
  }
  function applySharedScreenTheme(){
    try{
      const doc=frame.contentDocument;
      if(!doc?.documentElement)return;
      let style=doc.getElementById('monstudy-shared-screen-theme');
      if(!sharedScreenTheme){doc.documentElement.removeAttribute('data-monstudy-screen-theme');style?.remove();restoreThemedSurfaces();return;}
      if(!style){style=doc.createElement('style');style.id='monstudy-shared-screen-theme';(doc.head||doc.documentElement).append(style);}
      const color=/^#[0-9a-f]{6}$/i.test(sharedScreenTheme.color||'')?sharedScreenTheme.color:'#f6f5ef';
      const foreground=/^#[0-9a-f]{6}$/i.test(sharedScreenTheme.textColor||'')?sharedScreenTheme.textColor:'#193d38';
      const pattern=typeof sharedScreenTheme.pattern==='string'&&/^url\("data:image\/svg\+xml,[^"\n]+"\)$/.test(sharedScreenTheme.pattern)?sharedScreenTheme.pattern:'none';
      const patternSize=/^(?:[1-9][0-9]{1,2}px [1-9][0-9]{1,2}px|cover)$/.test(sharedScreenTheme.patternSize||'')?sharedScreenTheme.patternSize:'auto';
      const patternRepeat=sharedScreenTheme.patternRepeat==='no-repeat'?'no-repeat':'repeat';
      const patternPosition=sharedScreenTheme.patternPosition==='center bottom'?'center bottom':'center center';
      // The equipped SHOP palette is the single source of truth; child materials use this attribute for matched surfaces and text.
      doc.documentElement.setAttribute('data-monstudy-screen-theme',sharedScreenTheme.theme==='dark'?'dark':'light');
      style.textContent=`html,body{--screen-background:${color};--screen-foreground:${foreground};background-color:${color}!important;background-image:${pattern}!important;background-size:${patternSize}!important;background-repeat:${patternRepeat}!important;background-position:${patternPosition}!important;background-attachment:fixed!important;color:${foreground}!important;transition:background-color .2s,color .2s}input::placeholder,textarea::placeholder{color:color-mix(in srgb,${foreground} 62%,${color} 38%)!important}option{background-color:${color};color:${foreground}}`;
      scanThemedSurfaces(doc,color,foreground);
      if(!themedSurfaceObserver||themedSurfaceDoc!==doc){
        themedSurfaceObserver=new doc.defaultView.MutationObserver(()=>{
          if(themedSurfaceTimer)clearTimeout(themedSurfaceTimer);
          themedSurfaceTimer=setTimeout(()=>{themedSurfaceTimer=0;restoreThemedSurfaces();applySharedScreenTheme();},90);
        });
        themedSurfaceObserver.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
      }
    }catch{}
  }
  function cleanLegacyMaterialChrome(){
    try{
      const doc=frame.contentDocument;
      if(!doc?.documentElement)return;
      if(!doc.getElementById('monstudy-shared-chrome-cleanup')){
        const style=doc.createElement('style');
        style.id='monstudy-shared-chrome-cleanup';
        style.textContent='.monstudy-home-wrap,.authbar,.authrow,.auth-area,.auth-status,.auth-note,.authnote,.syncnote,.firebase-logout,.logoutbtn,#basicLogin,#basicLogout,#ateruLogin,#ateruLogout,#firebaseLogin,#firebaseLogout,#logoutBtn,button[id$="Logout"],a[id$="Logout"]{display:none!important}';
        (doc.head||doc.documentElement).append(style);
      }
    }catch{}
  }
  function updateMaterialPresentation(){applySharedScreenTheme();cleanLegacyMaterialChrome();}
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
  function materialName(value){const u=cleanURL(value);return allMaterials.find(i=>i.url.pathname===u.pathname&&i.url.search===u.search)?.name||allMaterials.find(i=>i.url.pathname===u.pathname)?.name||'教材';}
  function materialHome(value){
    const u=cleanURL(value);
    const matches=allMaterials.filter(i=>i.url.pathname===u.pathname&&[...i.url.searchParams].every(([name,val])=>u.searchParams.get(name)===val));
    matches.sort((a,b)=>[...b.url.searchParams].length-[...a.url.searchParams].length);
    return matches[0]?.url||allMaterials.find(i=>i.url.pathname===u.pathname)?.url||u;
  }
  function key(value){const u=cleanURL(value);return u.pathname+u.search+u.hash;}
  function isHome(u){return u.pathname===homePath||u.pathname===homePath+'index.html';}
  function syncTitle(u){
    const homeView=isHome(u);
    title.textContent=homeView?'ホーム':materialName(u);
    const target=homeView?root:materialHome(u);
    title.href=target.href;
    title.setAttribute('aria-label',homeView?'もんすたでぃ ホーム':title.textContent+' のトップへ戻る');
    document.title=title.textContent+'｜もんすたでぃ';
  }
  function hideRetryMaterialHeader(){
    if(!shell.classList.contains('ms-retry-header-hidden'))return;
    try{
      const doc=frame.contentDocument;
      if(!doc?.body)return;
      const backLink=[...doc.querySelectorAll('a')].find(a=>/もんすたでぃ/.test(a.textContent||'')&&(/トップへ戻る|←/.test(a.textContent||'')||/もんすたでぃトップへ戻る/.test(a.getAttribute('aria-label')||'')));
      if(backLink)backLink.style.display='none';
      const homeButton=doc.querySelector('button[aria-label*="ホームへ"]')||[...doc.querySelectorAll('button')].find(button=>/ホームへ/.test(button.textContent||''));
      const mainMenu=[...doc.querySelectorAll('nav,[role="navigation"]')].find(element=>['学習','復習','記録'].every(label=>(element.innerText||'').includes(label)));
      const login=doc.getElementById('firebaseLogin'),logout=doc.getElementById('firebaseLogout');
      let auth=null;
      if(login&&logout)for(let element=login.parentElement;element&&element!==doc.body;element=element.parentElement){if(element.contains(logout)){auth=element;break;}}
      const parts=[homeButton,mainMenu,auth].filter(Boolean);
      let header=parts[0]?.parentElement||null;
      while(header&&header!==doc.body&&!parts.every(part=>header.contains(part)))header=header.parentElement;
      if(header&&header!==doc.body){header.style.display='none';return;}
      for(const part of parts)part.style.display='none';
      if(login)login.style.display='none';
      if(logout)logout.style.display='none';
    }catch{}
  }
  function show(u,afterDeparture=false){
    const next=isHome(u)?'':key(u);
    if(!afterDeparture&&current&&current!==next){
      // Wait briefly for the online room release before removing its iframe.
      // Continue navigation even if the network is unavailable.
      let departure=null;
      try{departure=child()?.onNavigateAway?.();}catch(error){console.warn('material navigation cleanup failed',error);}
      if(departure&&typeof departure.then==='function'){
        const version=++departingVersion;
        status.textContent='対戦ルームを退出しています…';status.hidden=false;
        Promise.race([departure,new Promise(resolve=>setTimeout(resolve,2000))])
          .catch(()=>{}).then(()=>{if(version===departingVersion)show(u,true);});
        return;
      }
    }
    departingVersion++;
    current=next;
    shell.classList.toggle('ms-showing-material',!!current);
    shell.classList.toggle('ms-retry-header-hidden',!!current&&u.pathname===immersiveMaterialPath);
    syncTitle(u);
    home.hidden=!!current; frame.hidden=!current;
    shell.querySelectorAll('nav a').forEach(a=>{const active=current?key(new URL(a.href))===current:a.classList.contains('ms-home');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(current){const entry=new URL(u);entry.searchParams.set('monstudy-release',`${MATERIAL_RELEASE}-${Date.now()}`);frame.title=title.textContent;frame.src=entry.href;status.textContent='教材を読み込んでいます…';status.hidden=false;}
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
  title.addEventListener('click',e=>{
    if(!current)return;
    e.preventDefault();e.stopPropagation();
    const u=new URL(title.href,root);
    if(!canOpen(u)||!allowedToLeave())return;
    if(key(u)!==current){historyIndex++;history.pushState({monstudy:true,index:historyIndex},'',routeURL(u));}
    show(u);
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  });
  window.MonstudyShell={canOpen,navigate,owns:win=>win===frame.contentWindow,updateScreenTheme(theme){sharedScreenTheme=theme&&theme.color?{theme:theme.theme,color:theme.color,textColor:theme.textColor,pattern:theme.pattern||null,patternSize:theme.patternSize||null,patternRepeat:theme.patternRepeat||null,patternPosition:theme.patternPosition||null}:null;updateMaterialPresentation();},materialReady(win){if(win!==frame.contentWindow)return;status.hidden=true;updateMaterialPresentation();syncPause();}};
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
    hideRetryMaterialHeader();
    updateMaterialPresentation();
    status.hidden=true;
    try {
      const u=new URL(frame.contentWindow.location.href);
      if(canOpen(u)){
        if(key(u)!==current){current=key(u);history.replaceState({monstudy:true,index:historyIndex},'',routeURL(u));}
        syncTitle(u);frame.title=title.textContent;
      }
    }catch{}
    syncPause();
  });
  const initial=new URL(location.href).searchParams.get('material');let u=root;
  try{if(initial&&canOpen(initial))u=new URL(initial,root);}catch{}
  history.replaceState({monstudy:true,index:0},'',routeURL(u));show(u);updateFeatures();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
