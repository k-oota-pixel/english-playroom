from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'expected text not found in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


js = 'pet-adventure/online-battle.js'
replace_once(
    js,
    "const ROOM_STORAGE_KEY='monstudy-online-room-v2';",
    "const ROOM_STORAGE_KEY='monstudy-online-room-v2';\nconst AUTO_IDLE_MS=5*60*1000;"
)

replace_once(
    js,
    "let currentRoom=null,turnCards=[],selectedAttack=null,currentQuestion=null,lastQuestionId='',lastEventSeq=-1,lastStatus='',busy=false;",
    """let currentRoom=null,turnCards=[],selectedAttack=null,currentQuestion=null,lastQuestionId='',lastEventSeq=-1,lastStatus='',busy=false;
let idleTimer=0,autoPausedForIdle=false,resumeSyncing=false,lastResumeSyncAt=0;

function stopAutoRefresh(){
 if(pollTimer){clearInterval(pollTimer);pollTimer=0;}
 if(roomsTimer){clearInterval(roomsTimer);roomsTimer=0;}
}
function startAutoRefresh(){
 if(document.hidden||!user||autoPausedForIdle)return;
 if(!pollTimer)pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);
 if(!roomsTimer)roomsTimer=window.setInterval(()=>{if(!activeRoom&&selectedGrade)void refreshLobby();},15000);
}
function armIdlePause(){
 clearTimeout(idleTimer);
 idleTimer=window.setTimeout(()=>{autoPausedForIdle=true;stopAutoRefresh();},AUTO_IDLE_MS);
}
async function syncVisibleState(){
 if(document.hidden||!user||resumeSyncing)return;
 const now=Date.now();if(now-lastResumeSyncAt<750)return;lastResumeSyncAt=now;resumeSyncing=true;
 try{if(activeRoom)await refreshRoom();else if(selectedGrade)await refreshLobby();}
 finally{resumeSyncing=false;}
}
function registerActivity(){
 if(document.hidden||!user)return;
 const shouldResync=autoPausedForIdle||(!pollTimer&&!roomsTimer);
 autoPausedForIdle=false;armIdlePause();startAutoRefresh();
 if(shouldResync)void syncVisibleState();
}
function handleVisibility(){
 if(document.hidden){stopAutoRefresh();return;}
 autoPausedForIdle=false;armIdlePause();startAutoRefresh();void syncVisibleState();
}"""
)

old_init = """async function init(){
 try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();enterLobbyLayout();showGradePicker();const saved=localStorage.getItem(ROOM_STORAGE_KEY)||'';if(/^(?:4|3|pre2|2)-(?:10|[1-9])$/.test(saved)){activeRoom=saved;selectedGrade=saved.split('-')[0];await refreshRoom();}pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);roomsTimer=window.setInterval(()=>{if(!activeRoom&&selectedGrade)void refreshLobby();},15000);}catch(e){say(e.message||'初期化できませんでした。',true);}
}
window.addEventListener('pagehide',()=>{clearInterval(pollTimer);clearInterval(roomsTimer);});
init();"""
new_init = """async function init(){
 try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();enterLobbyLayout();showGradePicker();const saved=localStorage.getItem(ROOM_STORAGE_KEY)||'';if(/^(?:4|3|pre2|2)-(?:10|[1-9])$/.test(saved)){activeRoom=saved;selectedGrade=saved.split('-')[0];await refreshRoom();}autoPausedForIdle=false;armIdlePause();startAutoRefresh();}catch(e){say(e.message||'初期化できませんでした。',true);}
}
window.addEventListener('pointerdown',registerActivity,{capture:true,passive:true});
window.addEventListener('touchstart',registerActivity,{capture:true,passive:true});
window.addEventListener('keydown',registerActivity,true);
document.addEventListener('visibilitychange',handleVisibility);
window.addEventListener('focus',handleVisibility);
window.addEventListener('pagehide',()=>{stopAutoRefresh();clearTimeout(idleTimer);});
init();"""
replace_once(js, old_init, new_init)

html = 'pet-adventure/online-battle.html'
replace_once(html, './online-battle.js?v=2.3.45', './online-battle.js?v=2.3.46')
