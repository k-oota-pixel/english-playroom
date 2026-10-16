from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Add daily topic label and quick reply buttons to embedded chat.
old='''      <div class="pet-chat-heading"><strong id="petChatTitle">ペットと英語で話す</strong><span>ENGLISH CHAT</span></div>\n    </div>\n    <div id="petChatMessages" class="pet-chat-messages" aria-live="polite"></div>\n    <div id="petChatError" class="pet-chat-error" hidden></div>\n    <div class="pet-chat-note">英語で自由に話しかけてみよう。個人情報は入力しないでください。</div>\n    <form id="petChatForm" class="pet-chat-form">'''
new='''      <div class="pet-chat-heading"><strong id="petChatTitle">ペットと英語で話す</strong><span id="petChatTopic">TODAY'S TOPIC</span></div>\n    </div>\n    <div id="petChatMessages" class="pet-chat-messages" aria-live="polite"></div>\n    <div id="petChatError" class="pet-chat-error" hidden></div>\n    <div id="petChatChoices" class="pet-chat-choices" aria-label="返答例"></div>\n    <div class="pet-chat-note">ボタンを選んでも、自分で入力してもOK。</div>\n    <form id="petChatForm" class="pet-chat-form">'''
if old not in s: raise SystemExit('chat markup anchor missing')
s=s.replace(old,new,1)

# Add styles for topic and quick replies.
css_anchor='.pet-chat-error{font-size:10px;color:#b45239;text-align:center;padding:0 10px 7px;background:#fff}\n'
if css_anchor not in s: raise SystemExit('chat css anchor missing')
css_add='''.pet-chat-choices{display:flex;gap:6px;flex-wrap:wrap;padding:8px 10px 4px;background:#fff;border-top:1px solid #edf1ec}\n.pet-chat-choice{appearance:none;border:1px solid #cfe0d6;background:#f2f7f3;color:#245f50;border-radius:999px;padding:7px 10px;font:inherit;font-size:10.5px;font-weight:750;line-height:1.25;cursor:pointer;transition:background .12s,border-color .12s,transform .12s}\n.pet-chat-choice:hover{background:#e5f0e9;border-color:#a9c9b7;transform:translateY(-1px)}\n.pet-chat-choice:disabled{opacity:.5;cursor:wait;transform:none}\n.pet-chat-choice:focus-visible{outline:3px solid #e4af37;outline-offset:2px}\n'''
s=s.replace(css_anchor,css_anchor+css_add,1)

# Ensure small screens have comfortable wrapping.
mobile='@media(max-width:560px){.pet-chat-panel{height:310px;border-radius:16px}.pet-chat-bubble{max-width:90%;font-size:12.5px}.pet-chat-form{position:sticky;bottom:0}.pet-chat-note{font-size:8.5px}}\n'
mobile_new='@media(max-width:560px){.pet-chat-panel{height:340px;border-radius:16px}.pet-chat-bubble{max-width:90%;font-size:12.5px}.pet-chat-form{position:sticky;bottom:0}.pet-chat-note{font-size:8.5px}.pet-chat-choices{gap:5px;padding:7px 8px 3px}.pet-chat-choice{font-size:10px;padding:7px 9px}}\n'
if mobile not in s: raise SystemExit('mobile chat css missing')
s=s.replace(mobile,mobile_new,1)

# DOM refs.
old_refs="""const petChatTitle=document.getElementById('petChatTitle');\nconst petChatMessages=document.getElementById('petChatMessages');\nconst petChatError=document.getElementById('petChatError');\n"""
new_refs="""const petChatTitle=document.getElementById('petChatTitle');\nconst petChatTopic=document.getElementById('petChatTopic');\nconst petChatMessages=document.getElementById('petChatMessages');\nconst petChatError=document.getElementById('petChatError');\nconst petChatChoices=document.getElementById('petChatChoices');\n"""
if old_refs not in s: raise SystemExit('chat refs missing')
s=s.replace(old_refs,new_refs,1)

# Replace greeting block with daily-topic system.
start=s.index('let petChatHistory=[];')
end=s.index('function petChatSpecies()',start)
old_block=s[start:end]
new_block=r'''let petChatHistory=[];
let petChatIdentity='';
let petChatBusy=false;
let petChatSuggestions=[];
const PET_GREETINGS={
  cat:"Hey. I'm glad you're here.",
  dog:"Hi! I'm so happy to see you!",
  bird:"Hi! I was waiting to chat!",
  hamster:"H-hi! It's nice to see you.",
  panda:"Hey there. Let's relax and chat.",
  penguin:"Hello! It's good to see you."
};
const PET_DAILY_TOPICS=[
  {id:'school',label:'SCHOOL LIFE',question:'What was the best part of school today?',suggestions:['English class was fun.','Lunch was the best part.','I was a little tired.']},
  {id:'food',label:'FOOD & DRINKS',question:'What food would make you happy right now?',suggestions:['I want some ramen.','I would like something sweet.','I am not very hungry.']},
  {id:'hobbies',label:'HOBBIES',question:'What do you like doing in your free time?',suggestions:['I like playing games.','I enjoy playing sports.','I usually watch videos.']},
  {id:'weekend',label:'WEEKEND',question:'What would you like to do this weekend?',suggestions:['I want to relax at home.','I want to go outside.','I have no plans yet.']},
  {id:'music',label:'ENTERTAINMENT',question:'What have you enjoyed watching or listening to recently?',suggestions:['I listened to music.','I watched a funny video.','I have nothing special.']},
  {id:'places',label:'PLACES',question:'Where would you like to go someday?',suggestions:['I want to visit Tokyo.','I want to go abroad.','I like staying near home.']},
  {id:'favorites',label:'FAVORITES',question:'What is one thing you really like these days?',suggestions:['I like my favorite game.','I like good food.','I like spending time with friends.']},
  {id:'weather',label:'WEATHER & SEASONS',question:'What kind of weather do you like best?',suggestions:['I like sunny days.','I like cool weather.','Snowy days are fun.']},
  {id:'dreams',label:'TRY SOMETHING',question:'What is something you want to get better at?',suggestions:['I want to improve my English.','I want to get better at sports.','I want to learn something new.']},
  {id:'memories',label:'RECENT MOMENTS',question:'Did anything interesting happen recently?',suggestions:['Something funny happened.','I had a good day.','Nothing special happened.']}
];
function petDailyTopic(){
  const d=new Date(),stamp=Math.floor(new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()/86400000);
  return PET_DAILY_TOPICS[((stamp%PET_DAILY_TOPICS.length)+PET_DAILY_TOPICS.length)%PET_DAILY_TOPICS.length];
}
'''
s=s[:start]+new_block+s[end:]

# Add quick reply renderer before chat renderer.
anchor='''function petChatName(){return validPetName(petData?.petName)?normalizePetName(petData.petName):'My Pet';}\n'''
if anchor not in s: raise SystemExit('petChatName anchor missing')
add=r'''function renderPetChatChoices(){
  petChatChoices.replaceChildren();
  for(const text of petChatSuggestions.slice(0,3)){
    const button=document.createElement('button');
    button.type='button';button.className='pet-chat-choice';button.textContent=text;button.disabled=petChatBusy;
    button.addEventListener('click',()=>sendPetChat(text));
    petChatChoices.append(button);
  }
  petChatChoices.hidden=!petChatSuggestions.length;
}
'''
s=s.replace(anchor,anchor+add,1)

# Make chat renderer refresh buttons too.
old='''  petChatMessages.scrollTop=petChatMessages.scrollHeight;\n}\nfunction resetPetChatIfNeeded(){\n  const species=petChatSpecies(),name=petChatName(),identity=species+'|'+name;\n  if(identity===petChatIdentity&&petChatHistory.length)return;\n  petChatIdentity=identity;petChatHistory=[{role:'assistant',text:PET_GREETINGS[species]||PET_GREETINGS.cat}];\n}\n'''
new='''  petChatMessages.scrollTop=petChatMessages.scrollHeight;\n  renderPetChatChoices();\n}\nfunction resetPetChatIfNeeded(){\n  const species=petChatSpecies(),name=petChatName(),topic=petDailyTopic(),identity=species+'|'+name+'|'+localDateKey();\n  if(identity===petChatIdentity&&petChatHistory.length)return;\n  petChatIdentity=identity;\n  petChatSuggestions=[...topic.suggestions];\n  petChatHistory=[{role:'assistant',text:(PET_GREETINGS[species]||PET_GREETINGS.cat)+' '+topic.question}];\n}\n'''
if old not in s: raise SystemExit('chat render/reset block missing')
s=s.replace(old,new,1)

# Show today's topic in header.
old="""  petChatTitle.textContent=petChatName()+'と話す';\n  petChatAvatar.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop);\n"""
new="""  const topic=petDailyTopic();\n  petChatTitle.textContent=petChatName()+'と話す';\n  petChatTopic.textContent='TODAY · '+topic.label;\n  petChatAvatar.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop);\n"""
if old not in s: raise SystemExit('show chat block missing')
s=s.replace(old,new,1)

# Busy state controls buttons too.
old="function setPetChatBusy(value){petChatBusy=value;petChatInput.disabled=value;petChatSend.disabled=value;petChatSend.textContent=value?'…':'送信';}\n"
new="function setPetChatBusy(value){petChatBusy=value;petChatInput.disabled=value;petChatSend.disabled=value;petChatSend.textContent=value?'…':'送信';renderPetChatChoices();}\n"
if old not in s: raise SystemExit('busy fn missing')
s=s.replace(old,new,1)

# Accept button text directly; send daily topic id; update AI-generated suggestions.
s=s.replace('async function sendPetChat(){\n','async function sendPetChat(quickText=\'\'){\n',1)
s=s.replace("  const text=petChatInput.value.trim();if(!text)return;\n","  const text=(quickText||petChatInput.value).trim();if(!text)return;\n",1)
s=s.replace("    const response=await fetch(PET_CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({species:petChatSpecies(),petName:petChatName(),message:text,history:previous}),signal:AbortSignal.timeout(45000)});\n","    const response=await fetch(PET_CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({species:petChatSpecies(),petName:petChatName(),topic:petDailyTopic().id,message:text,history:previous}),signal:AbortSignal.timeout(45000)});\n",1)
s=s.replace("    petChatHistory.push({role:'assistant',text:result.reply.trim()});renderPetChat();\n","    petChatSuggestions=Array.isArray(result.suggestions)?result.suggestions.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):[];\n    petChatHistory.push({role:'assistant',text:result.reply.trim()});renderPetChat();\n",1)

# Clear suggestions on logout/auth reset.
s=s.replace("hidePetChatBuiltIn();petChatHistory=[];petChatIdentity='';petCreate.hidden=true;","hidePetChatBuiltIn();petChatHistory=[];petChatIdentity='';petChatSuggestions=[];petCreate.hidden=true;",1)

assert 'PET_DAILY_TOPICS' in s
assert 'petChatChoices' in s
assert 'topic:petDailyTopic().id' in s
p.write_text(s,encoding='utf-8')
