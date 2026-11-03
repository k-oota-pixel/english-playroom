from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'expected text not found in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# HTML: grade-first lobby, no explanatory clutter.
replace_once(
    'pet-adventure/online-battle.html',
    '<link rel="stylesheet" href="./online-battle.css?v=2.1.0">',
    '<link rel="stylesheet" href="./online-battle.css?v=2.3.45">'
)
replace_once(
    'pet-adventure/online-battle.html',
    '<script type="module" src="./online-battle.js?v=2.2.0"></script>',
    '<script type="module" src="./online-battle.js?v=2.3.45"></script>'
)
replace_once(
    'pet-adventure/online-battle.html',
    '''    <p class="select-intro">友だちと同じルームに入り、育てたペットで勝負しよう。</p>
    <div class="online-wallet">所持コイン <strong id="coinCount">—</strong></div>
    <p id="notice" class="online-notice" role="status">ログイン情報を確認しています…</p>
    <section id="roomList" class="online-room-list" hidden>
      <div class="online-room-heading"><h2>対戦ルーム</h2><button id="refreshBtn" class="secondary-btn" type="button">更新</button></div>
      <p class="hint">同じ番号のルームに入ってください。4級・3級・準2級・2級から選べます。2人が準備完了すると対戦が始まります。</p>
      <div id="rooms" class="online-rooms"></div>
    </section>''',
    '''    <div class="online-wallet">所持コイン <strong id="coinCount">—</strong></div>
    <p id="notice" class="online-notice" role="status">ログイン情報を確認しています…</p>
    <section id="gradePicker" class="online-grade-picker" aria-label="英検級を選ぶ" hidden>
      <button type="button" data-grade="4">4級</button>
      <button type="button" data-grade="3">3級</button>
      <button type="button" data-grade="pre2">準2級</button>
      <button type="button" data-grade="2">2級</button>
    </section>
    <section id="roomList" class="online-room-list" hidden>
      <div class="online-room-heading">
        <button id="backToGradesBtn" class="online-grade-back" type="button">← 級を選ぶ</button>
        <h2 id="selectedGradeTitle">4級</h2>
        <button id="refreshBtn" class="secondary-btn" type="button">更新</button>
      </div>
      <div id="rooms" class="online-rooms"></div>
    </section>'''
)

# JS: one grade summary read, 15s lobby refresh, 2.5s battle refresh unchanged.
replace_once(
    'pet-adventure/online-battle.js',
    "const lobbyView=$('lobbyView'),battleView=$('battleView'),roomList=$('roomList'),roomsEl=$('rooms'),notice=$('notice');",
    "const lobbyView=$('lobbyView'),battleView=$('battleView'),gradePicker=$('gradePicker'),roomList=$('roomList'),roomsEl=$('rooms'),notice=$('notice'),selectedGradeTitle=$('selectedGradeTitle');\nconst GRADES=Object.freeze([{key:'4',label:'4級'},{key:'3',label:'3級'},{key:'pre2',label:'準2級'},{key:'2',label:'2級'}]);\nconst ROOM_STORAGE_KEY='monstudy-online-room-v2';"
)
replace_once(
    'pet-adventure/online-battle.js',
    "let user=null,activeRoom='',pollTimer=0,roomsTimer=0,coins=0,questionPool=[],ownData={};",
    "let user=null,activeRoom='',selectedGrade='',pollTimer=0,roomsTimer=0,coins=0,questionPool=[],ownData={};"
)
replace_once(
    'pet-adventure/online-battle.js',
    "function roomStatus(room){if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(room.players?.length===1)return '1人が待機中';if(room.players?.length===2)return '2人が準備中';return '空室';}\nfunction roomRuleText(room){return '英検'+(room.grade||'4級')+' · '+(room.noItems?'魔法・アイテムなし':'魔法・アイテムあり');}",
    "function roomPlayerCount(room){return Math.max(0,Math.min(2,Number(room.playerCount??room.players?.length??0)||0));}\nfunction roomStatus(room){const count=roomPlayerCount(room);if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(count===1)return '1人待機中';if(count===2)return '準備中';return '空室';}"
)

replace_once(
    'pet-adventure/online-battle.js',
    '''function renderRooms(list){
 roomsEl.replaceChildren();
 for(const room of list){
  const card=document.createElement('article');card.className='online-room-card';
  const heading=document.createElement('strong');heading.textContent='ルーム '+room.roomId;
  const rule=document.createElement('span');rule.className='online-room-rule';rule.textContent=roomRuleText(room);
  const state=document.createElement('span');state.className='online-room-state';state.textContent=roomStatus(room)+' · '+(room.players?.length||0)+'/2人';
  const btn=document.createElement('button');btn.type='button';btn.className='primary-btn';btn.textContent='入室する';
  btn.disabled=['playing','finished'].includes(room.status)||((room.players?.length||0)>=2&&!(room.players||[]).some(p=>p.uid===user.uid));
  btn.addEventListener('click',()=>void enterRoom(room.roomId));
  card.append(heading,rule,state,btn);roomsEl.append(card);
 }
}
''',
    '''function renderRooms(list){
 roomsEl.replaceChildren();
 for(const room of list){
  const count=roomPlayerCount(room),card=document.createElement('article');card.className='online-room-card';card.dataset.status=room.status||'open';
  const heading=document.createElement('strong');heading.textContent='ルーム '+(room.roomNo||String(room.roomId||'').split('-').pop());
  const state=document.createElement('span');state.className='online-room-state';state.innerHTML=`<b>${esc(roomStatus(room))}</b><span>${count} / 2人</span>`;
  const btn=document.createElement('button');btn.type='button';btn.className='primary-btn';btn.textContent='入室する';
  btn.disabled=['playing','finished'].includes(room.status)||count>=2;
  btn.addEventListener('click',()=>void enterRoom(room.roomId));
  card.append(heading,state,btn);roomsEl.append(card);
 }
}
function gradeLabel(key){return GRADES.find(entry=>entry.key===key)?.label||'4級';}
function showGradePicker(){selectedGrade='';roomList.hidden=true;gradePicker.hidden=false;roomsEl.replaceChildren();say('');}
async function selectGrade(key){if(!GRADES.some(entry=>entry.key===key))return;selectedGrade=key;selectedGradeTitle.textContent=gradeLabel(key);gradePicker.hidden=true;roomList.hidden=false;await refreshLobby();}
async function refreshLobby(){
 if(!selectedGrade||activeRoom)return;
 try{const data=await api('/lobby/'+selectedGrade),lobby=data.lobby||{};selectedGradeTitle.textContent=lobby.grade||gradeLabel(selectedGrade);renderRooms(lobby.rooms||[]);say('');}
 catch(e){say(e.message,true);}
}
'''
)
replace_once(
    'pet-adventure/online-battle.js',
    " els.areaLabel.textContent='英検'+(room.grade||'4級');els.stageLabel.textContent='ROOM '+room.roomId;els.enemyCount.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';els.bestLabel.textContent=room.noItems?'ITEM OFF':'ITEM ON';els.battleStatus.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';",
    " els.areaLabel.textContent='英検'+(room.grade||'4級');els.stageLabel.textContent='ROOM '+(room.roomNo||String(room.roomId||'').split('-').pop());els.enemyCount.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';els.bestLabel.textContent='MAGIC / ITEM';els.battleStatus.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';"
)
replace_once(
    'pet-adventure/online-battle.js',
    '''async function refreshRooms(){
 try{
  const data=await api('/rooms'),list=data.rooms||[];const active=list.find(r=>(r.players||[]).some(p=>p.uid===user.uid)&&['waiting','playing','finished'].includes(r.status));
  if(active){activeRoom=active.roomId;renderRoom(active);say('');return;}
  activeRoom='';currentRoom=null;lastStatus='';lastEventSeq=-1;resetTurn();enterLobbyLayout();roomList.hidden=false;renderRooms(list);say('空いているルームを選んでください。');
 }catch(e){say(e.message,true);}
}
async function refreshRoom(){if(!activeRoom)return;try{const data=await api('/room/'+activeRoom),room=data.room;if(!(room.players||[]).some(p=>p.uid===user.uid)){activeRoom='';await refreshRooms();return;}renderRoom(room);}catch(e){say(e.message,true);}}
async function enterRoom(id){try{say('ルームに入室しています…');const data=await api('/room/'+id+'/join','POST');activeRoom=id;lastEventSeq=data.room.seq;lastStatus='';resetTurn();renderRoom(data.room);say('');}catch(e){say(e.message,true);await refreshRooms();}}
async function act(action,{render=true,body=null}={}){
 try{
  const data=await api('/room/'+activeRoom+'/'+action,'POST',body);
  if(action==='leave'){activeRoom='';currentRoom=null;resetTurn();await updateCoins();await refreshRooms();return null;}
  currentRoom=data.room;if(render)renderRoom(data.room);await updateCoins();return data.room;
 }catch(e){say(e.message,true);await refreshRoom();throw e;}
}
''',
    '''async function refreshRoom(){
 if(!activeRoom)return;
 try{const data=await api('/room/'+activeRoom),room=data.room;if(!(room.players||[]).some(p=>p.uid===user.uid)){activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;enterLobbyLayout();if(selectedGrade)await refreshLobby();else showGradePicker();return;}renderRoom(room);say('');}
 catch(e){say(e.message,true);}
}
async function enterRoom(id){
 try{say('ルームに入室しています…');selectedGrade=String(id).split('-')[0]||selectedGrade;const data=await api('/room/'+id+'/join','POST');activeRoom=id;localStorage.setItem(ROOM_STORAGE_KEY,id);lastEventSeq=data.room.seq;lastStatus='';resetTurn();renderRoom(data.room);say('');}
 catch(e){say(e.message,true);await refreshLobby();}
}
async function act(action,{render=true,body=null}={}){
 try{
  const data=await api('/room/'+activeRoom+'/'+action,'POST',body);
  if(action==='leave'){activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;resetTurn();await updateCoins();enterLobbyLayout();if(selectedGrade)await refreshLobby();else showGradePicker();return null;}
  currentRoom=data.room;if(render)renderRoom(data.room);await updateCoins();return data.room;
 }catch(e){say(e.message,true);await refreshRoom();throw e;}
}
'''
)
replace_once(
    'pet-adventure/online-battle.js',
    "$('refreshBtn').addEventListener('click',()=>void refreshRooms());\nels.readyBtn.addEventListener('click',()=>void act('ready'));",
    "$('refreshBtn').addEventListener('click',()=>void refreshLobby());\n$('backToGradesBtn').addEventListener('click',()=>showGradePicker());\ngradePicker.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>void selectGrade(button.dataset.grade)));\nels.readyBtn.addEventListener('click',()=>void act('ready'));"
)
replace_once(
    'pet-adventure/online-battle.js',
    "async function init(){\n try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();await refreshRooms();pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);roomsTimer=window.setInterval(()=>{if(!activeRoom)void refreshRooms();},10000);}catch(e){say(e.message||'初期化できませんでした。',true);}\n}",
    "async function init(){\n try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();enterLobbyLayout();showGradePicker();const saved=localStorage.getItem(ROOM_STORAGE_KEY)||'';if(/^(?:4|3|pre2|2)-(?:10|[1-9])$/.test(saved)){activeRoom=saved;selectedGrade=saved.split('-')[0];await refreshRoom();}pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);roomsTimer=window.setInterval(()=>{if(!activeRoom&&selectedGrade)void refreshLobby();},15000);}catch(e){say(e.message||'初期化できませんでした。',true);}\n}"
)

# CSS: four big grade buttons, simple room cards.
css = Path('pet-adventure/online-battle.css')
s = css.read_text(encoding='utf-8')
marker = '\n\n/* Online uses pet vs pet.'
if marker not in s:
    raise SystemExit('online battle css marker missing')
rest = s.split(marker, 1)[1]
prefix = '''/* Online lobby only. The actual duel intentionally uses the same classes and CSS as 魔王の塔. */
.online-lobby{max-width:820px;margin:auto}.online-wallet{display:inline-flex;align-items:center;gap:8px;margin:8px 0 2px;padding:8px 13px;border:1px solid #d8e3db;border-radius:999px;background:#fffdf8;color:#6a5a2f;font-size:11px;font-weight:800}.online-wallet strong{font-size:15px}.online-notice{min-height:18px;margin:8px 0;color:#657c73;font-size:12px}.online-notice:empty{display:none}.online-notice.error{color:#a14e46;font-weight:900}.online-grade-picker{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:22px}.online-grade-picker[hidden]{display:none!important}.online-grade-picker button{min-height:112px;border:1px solid #355f52;border-radius:22px;background:#173d35;color:#fff;font:900 clamp(22px,3vw,31px)/1 system-ui;letter-spacing:.02em;cursor:pointer;box-shadow:0 8px 24px #193d3812;transition:transform .12s,background .12s}.online-grade-picker button:hover{transform:translateY(-2px);background:#205548}.online-grade-picker button:active{transform:translateY(0)}.online-room-list{margin-top:18px;padding:18px;border:1px solid #d8e3db;border-radius:22px;background:#fffdf8;box-shadow:0 8px 28px #193d3810}.online-room-heading{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-bottom:14px}.online-room-heading h2{margin:0;text-align:center;font-size:24px}.online-room-heading .secondary-btn,.online-grade-back{width:auto;padding:9px 13px}.online-grade-back{border:0;background:transparent;color:#315f52;font:800 12px system-ui;cursor:pointer}.online-rooms{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.online-room-card{display:flex;min-width:0;flex-direction:column;gap:10px;padding:14px;border:1px solid #dce6df;border-radius:16px;background:#fff}.online-room-card>strong{font-size:17px;white-space:nowrap}.online-room-state{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;color:#74857e}.online-room-state b{color:#315f52;font-size:11px}.online-room-card[data-status="playing"] .online-room-state b,.online-room-card[data-status="finished"] .online-room-state b{color:#9b6049}.online-room-card .primary-btn{margin-top:auto;padding:10px 6px}.online-room-card .primary-btn:disabled{opacity:.42;cursor:default}'''
extra = '\n@media(max-width:760px){.online-rooms{grid-template-columns:repeat(2,minmax(0,1fr))}.online-grade-picker{gap:10px}.online-grade-picker button{min-height:88px}.online-room-heading{grid-template-columns:1fr auto}.online-room-heading h2{grid-column:1/-1;grid-row:1}.online-grade-back{grid-column:1;grid-row:2;justify-self:start}.online-room-heading .secondary-btn{grid-column:2;grid-row:2}}\n'
css.write_text(prefix + marker + rest + extra, encoding='utf-8')

# Release 2.3.45 (2.3.44 is already current due TODAY release).
replace_once('version-badge-v176.js', "const APP_VERSION='2.3.44';", "const APP_VERSION='2.3.45';")
index = Path('index.html')
text = index.read_text(encoding='utf-8')
if '2.3.44' not in text:
    raise SystemExit('2.3.44 not found in index.html')
index.write_text(text.replace('2.3.44', '2.3.45'), encoding='utf-8')
