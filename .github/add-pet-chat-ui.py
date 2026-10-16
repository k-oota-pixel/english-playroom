from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the old MY PET eyebrow label.
s=s.replace('      <div class="pet-eyebrow">MY PET</div>\n','',1)

status='      <div id="petStatus" class="pet-status" role="status" aria-live="polite">ログイン状態を確認しています…</div>\n'
if status not in s:
    raise SystemExit('pet status marker not found')
s=s.replace(status,status+'      <button id="petChatButton" class="pet-button pet-chat-button" type="button" hidden>英語で話す</button>\n',1)

css=r'''
[hidden]{display:none!important}
.pet-chat-button{margin-top:8px}
.pet-chat-modal{position:fixed;inset:0;z-index:10000;background:#183b386f;display:grid;place-items:center;padding:14px}
.pet-chat-panel{width:min(560px,100%);height:min(680px,88vh);background:#fff;border:1px solid #dbe4dc;border-radius:20px;box-shadow:0 18px 50px #183b3835;display:flex;flex-direction:column;overflow:hidden}
.pet-chat-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #e7ede7;background:#fbfcf8}
.pet-chat-avatar{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;overflow:hidden;border-radius:13px;background:#fff7df}
.pet-chat-avatar svg{width:100%;height:100%;display:block}
.pet-chat-heading{min-width:0;flex:1}.pet-chat-heading strong{display:block;font-size:16px}.pet-chat-heading span{display:block;font-size:10px;color:#718078;margin-top:2px}
.pet-chat-close{border:1px solid #d6e1d8;background:#fff;color:#48645b;border-radius:999px;width:34px;height:34px;font-size:18px;cursor:pointer}
.pet-chat-messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:9px;background:#f7f8f4}
.pet-chat-row{display:flex}.pet-chat-row.user{justify-content:flex-end}.pet-chat-bubble{max-width:82%;padding:10px 12px;border-radius:15px;white-space:pre-wrap;line-height:1.5;font-size:14px;word-break:break-word}
.pet-chat-row.assistant .pet-chat-bubble{background:#fff;border:1px solid #dce5da;border-bottom-left-radius:5px}.pet-chat-row.user .pet-chat-bubble{background:#245f50;color:#fff;border-bottom-right-radius:5px}
.pet-chat-note{font-size:10px;color:#7b8980;text-align:center;padding:0 14px 7px;background:#fff}
.pet-chat-form{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid #e7ede7;background:#fff}
.pet-chat-input{flex:1;min-width:0;border:1px solid #cddbd2;border-radius:12px;padding:11px 12px;font:inherit;font-size:14px;color:#193d38;background:#fff}.pet-chat-input:focus{outline:3px solid #2d796326;border-color:#2d7963}
.pet-chat-send{border:0;border-radius:12px;background:#245f50;color:#fff;padding:10px 15px;font:inherit;font-size:13px;font-weight:850;cursor:pointer}.pet-chat-send:disabled{opacity:.55;cursor:wait}
.pet-chat-error{font-size:11px;color:#b45239;text-align:center;padding:0 12px 8px;background:#fff}
@media(max-width:560px){.pet-chat-modal{padding:0;align-items:end}.pet-chat-panel{width:100%;height:88vh;border-radius:20px 20px 0 0}.pet-chat-bubble{max-width:88%}}
'''
style_end='</style>\n</head>'
if style_end not in s:
    raise SystemExit('style end marker not found')
s=s.replace(style_end,css+'\n</style>\n</head>',1)

modal=r'''
<div id="petChatModal" class="pet-chat-modal" hidden role="dialog" aria-modal="true" aria-labelledby="petChatTitle">
  <div class="pet-chat-panel">
    <div class="pet-chat-head">
      <div id="petChatAvatar" class="pet-chat-avatar" aria-hidden="true"></div>
      <div class="pet-chat-heading"><strong id="petChatTitle">ペットと英語で話す</strong><span>ENGLISH CHAT</span></div>
      <button id="petChatClose" class="pet-chat-close" type="button" aria-label="会話を閉じる">×</button>
    </div>
    <div id="petChatMessages" class="pet-chat-messages" aria-live="polite"></div>
    <div id="petChatError" class="pet-chat-error" hidden></div>
    <div class="pet-chat-note">英語で自由に話しかけてみよう。個人情報は入力しないでください。</div>
    <form id="petChatForm" class="pet-chat-form">
      <input id="petChatInput" class="pet-chat-input" type="text" maxlength="500" autocomplete="off" placeholder="Type in English…" aria-label="ペットへのメッセージ">
      <button id="petChatSend" class="pet-chat-send" type="submit">送信</button>
    </form>
  </div>
</div>
'''
if '</main>\n\n<script type="module">' not in s:
    raise SystemExit('main/module marker not found')
s=s.replace('</main>\n\n<script type="module">','</main>\n'+modal+'\n<script type="module">',1)

const_marker="const petStatus=document.getElementById(\"petStatus\");\nconst petBar=document.getElementById(\"petBar\");\n"
if const_marker not in s:
    raise SystemExit('pet const marker not found')
consts="""const petStatus=document.getElementById(\"petStatus\");
const petBar=document.getElementById(\"petBar\");
const petChatButton=document.getElementById('petChatButton');
const petChatModal=document.getElementById('petChatModal');
const petChatAvatar=document.getElementById('petChatAvatar');
const petChatTitle=document.getElementById('petChatTitle');
const petChatMessages=document.getElementById('petChatMessages');
const petChatError=document.getElementById('petChatError');
const petChatForm=document.getElementById('petChatForm');
const petChatInput=document.getElementById('petChatInput');
const petChatSend=document.getElementById('petChatSend');
const petChatClose=document.getElementById('petChatClose');
const PET_CHAT_ENDPOINT='https://task-quest.onrender.com/api/pet-chat';
"""
s=s.replace(const_marker,consts,1)

name_btn="const petNameButton=document.getElementById('petNameButton');\n"
if name_btn not in s:
    raise SystemExit('pet name button marker not found')
chat_js=r'''const petNameButton=document.getElementById('petNameButton');
let petChatHistory=[];
let petChatIdentity='';
let petChatBusy=false;
const PET_GREETINGS={
  cat:"Hey. I'm glad you're here. What are you doing today?",
  dog:"Hi! I'm so happy to see you! How was your day?",
  bird:"Hi! Tell me something fun. What happened today?",
  hamster:"H-hi! It's nice to see you. How are you today?",
  panda:"Hey there. Let's relax and chat. How was your day?",
  penguin:"Hello! It's good to see you. What shall we talk about today?"
};
function petChatSpecies(){return petData?.petAppearance?.species||'cat';}
function petChatName(){return validPetName(petData?.petName)?normalizePetName(petData.petName):'My Pet';}
function renderPetChat(){
  petChatMessages.replaceChildren();
  for(const item of petChatHistory){
    const row=document.createElement('div');row.className='pet-chat-row '+item.role;
    const bubble=document.createElement('div');bubble.className='pet-chat-bubble';bubble.textContent=item.text;
    row.append(bubble);petChatMessages.append(row);
  }
  petChatMessages.scrollTop=petChatMessages.scrollHeight;
}
function resetPetChatIfNeeded(){
  const species=petChatSpecies(),name=petChatName(),identity=species+'|'+name;
  if(identity===petChatIdentity&&petChatHistory.length)return;
  petChatIdentity=identity;petChatHistory=[{role:'assistant',text:PET_GREETINGS[species]||PET_GREETINGS.cat}];
}
function openPetChat(){
  if(!petUser||!hasPet(petData))return;
  resetPetChatIfNeeded();
  petChatTitle.textContent=petChatName()+'と話す';
  petChatAvatar.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop);
  petChatError.hidden=true;petChatError.textContent='';
  renderPetChat();petChatModal.hidden=false;document.body.style.overflow='hidden';
  setTimeout(()=>petChatInput.focus(),30);
}
function closePetChat(){petChatModal.hidden=true;document.body.style.overflow='';}
function setPetChatBusy(value){petChatBusy=value;petChatInput.disabled=value;petChatSend.disabled=value;petChatSend.textContent=value?'…':'送信';}
async function sendPetChat(){
  if(petChatBusy||!petUser||!hasPet(petData))return;
  const text=petChatInput.value.trim();if(!text)return;
  const previous=petChatHistory.slice(-10);
  petChatHistory.push({role:'user',text});petChatInput.value='';renderPetChat();setPetChatBusy(true);petChatError.hidden=true;
  try{
    const user=auth.currentUser;if(!user)throw Error('ログインし直してください。');
    const token=await user.getIdToken();
    const response=await fetch(PET_CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({species:petChatSpecies(),petName:petChatName(),message:text,history:previous}),signal:AbortSignal.timeout(45000)});
    let result={};try{result=await response.json();}catch{}
    if(!response.ok)throw Error(result.error||'ペットとおしゃべりできませんでした。');
    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('返事を読み取れませんでした。');
    petChatHistory.push({role:'assistant',text:result.reply.trim()});renderPetChat();
  }catch(error){
    petChatError.textContent=error.name==='TimeoutError'?'返事に時間がかかっています。もう一度話しかけてみてください。':error.message;
    petChatError.hidden=false;
  }finally{setPetChatBusy(false);petChatInput.focus();}
}
petChatButton.addEventListener('click',openPetChat);
petChatClose.addEventListener('click',closePetChat);
petChatModal.addEventListener('click',event=>{if(event.target===petChatModal)closePetChat();});
petChatForm.addEventListener('submit',event=>{event.preventDefault();sendPetChat();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!petChatModal.hidden)closePetChat();});
'''
s=s.replace(name_btn,chat_js,1)

render_marker="  petNameButton.hidden=!petUser || !hatched || validPetName(data.petName);\n"
if render_marker not in s:
    raise SystemExit('render pet marker not found')
s=s.replace(render_marker,render_marker+"  petChatButton.hidden=!petUser || !hatched;\n",1)

auth_reset="  petUser=null;petData={};petMaker.close();petNameDialog.close();petCreate.hidden=true;petRetry.hidden=true;petNameButton.hidden=true;\n"
if auth_reset not in s:
    raise SystemExit('auth reset marker not found')
s=s.replace(auth_reset,"  petUser=null;petData={};petMaker.close();petNameDialog.close();closePetChat();petChatHistory=[];petChatIdentity='';petCreate.hidden=true;petRetry.hidden=true;petNameButton.hidden=true;petChatButton.hidden=true;\n",1)

p.write_text(s,encoding='utf-8')
