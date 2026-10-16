from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

old = ".pet-chat-choice:focus-visible{outline:3px solid #e4af37;outline-offset:2px}\n@media(max-width:900px){.pet-chat-panel{height:300px}}\n@media(max-width:560px){.pet-chat-panel{height:340px;border-radius:16px}.pet-chat-bubble{max-width:90%;font-size:12.5px}.pet-chat-form{position:sticky;bottom:0}.pet-chat-note{font-size:8.5px}.pet-chat-choices{gap:5px;padding:7px 8px 3px}.pet-chat-choice{font-size:10px;padding:7px 9px}}\n"
new = ".pet-chat-choice:focus-visible{outline:3px solid #e4af37;outline-offset:2px}\n.pet-chat-row.typing .pet-chat-bubble{display:flex;align-items:center;gap:6px;min-width:62px}\n.pet-chat-dots{display:inline-flex;gap:4px;align-items:center}\n.pet-chat-dots i{width:6px;height:6px;border-radius:50%;background:#7c8f86;display:block;animation:petChatBlink 1.1s infinite ease-in-out}\n.pet-chat-dots i:nth-child(2){animation-delay:.15s}\n.pet-chat-dots i:nth-child(3){animation-delay:.3s}\n@keyframes petChatBlink{0%,80%,100%{opacity:.28;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}\n@media(max-width:900px){.pet-chat-panel{height:320px}}\n@media(max-width:560px){.pet-chat-panel{height:360px;border-radius:16px}.pet-chat-head{padding:10px 10px 8px}.pet-chat-avatar{width:34px;height:34px;flex-basis:34px}.pet-chat-heading strong{font-size:13px}.pet-chat-heading span{font-size:8.5px}.pet-chat-messages{padding:10px;gap:7px}.pet-chat-bubble{max-width:92%;font-size:12.5px;padding:8px 10px}.pet-chat-form{position:sticky;bottom:0;padding:8px}.pet-chat-input{font-size:12.5px;padding:9px 10px}.pet-chat-send{padding:8px 12px;font-size:11.5px}.pet-chat-note{display:none}.pet-chat-choices{display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;gap:6px;padding:7px 8px 6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}.pet-chat-choice{font-size:10px;padding:7px 10px;white-space:nowrap;flex:0 0 auto}.pet-chat-error{font-size:9px;padding:2px 8px 6px}}\n"
if old not in s: raise SystemExit('style block not found')
s=s.replace(old,new,1)

old = "let petChatHistory=[];\nlet petChatIdentity='';\nlet petChatBusy=false;\nlet petChatSuggestions=[];\n"
new = "let petChatHistory=[];\nlet petChatIdentity='';\nlet petChatBusy=false;\nlet petChatTyping=false;\nlet petChatSuggestions=[];\n"
if old not in s: raise SystemExit('chat state block not found')
s=s.replace(old,new,1)

old = "  for(const item of petChatHistory){\n    const row=document.createElement('div');row.className='pet-chat-row '+item.role;\n    const bubble=document.createElement('div');bubble.className='pet-chat-bubble';bubble.textContent=item.text;\n    row.append(bubble);petChatMessages.append(row);\n  }\n"
new = "  for(const item of petChatHistory){\n    const row=document.createElement('div');row.className='pet-chat-row '+item.role+(item.typing?' typing':'');\n    const bubble=document.createElement('div');bubble.className='pet-chat-bubble';\n    if(item.typing){\n      const dots=document.createElement('span');dots.className='pet-chat-dots';\n      dots.innerHTML='<i></i><i></i><i></i>';\n      bubble.append(dots);\n    }else{\n      bubble.textContent=item.text;\n    }\n    row.append(bubble);petChatMessages.append(row);\n  }\n"
if old not in s: raise SystemExit('render loop not found')
s=s.replace(old,new,1)

old = "  petChatIdentity=identity;\n  petChatSuggestions=[...topic.suggestions];\n  petChatHistory=[{role:'assistant',text:(PET_GREETINGS[species]||PET_GREETINGS.cat)+' '+topic.question}];\n}\n"
new = "  petChatIdentity=identity;\n  petChatTyping=false;\n  petChatSuggestions=[...topic.suggestions];\n  petChatHistory=[{role:'assistant',text:(PET_GREETINGS[species]||PET_GREETINGS.cat)+' '+topic.question}];\n}\n"
if old not in s: raise SystemExit('reset block not found')
s=s.replace(old,new,1)

old = "  const previous=petChatHistory.slice(-10);\n  petChatHistory.push({role:'user',text});petChatInput.value='';renderPetChat();setPetChatBusy(true);petChatError.hidden=true;\n  try{\n"
new = "  const previous=petChatHistory.filter(item=>!item.typing).slice(-10);\n  petChatHistory.push({role:'user',text});\n  petChatTyping=true;\n  petChatSuggestions=[];\n  petChatHistory.push({role:'assistant',typing:true,text:''});\n  petChatInput.value='';renderPetChat();setPetChatBusy(true);petChatError.hidden=true;\n  try{\n"
if old not in s: raise SystemExit('send intro block not found')
s=s.replace(old,new,1)

old = "    if(!response.ok)throw Error(result.error||'ペットとおしゃべりできませんでした。');\n    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('返事を読み取れませんでした。');\n    petChatSuggestions=Array.isArray(result.suggestions)?result.suggestions.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):[];\n    petChatHistory.push({role:'assistant',text:result.reply.trim()});renderPetChat();\n  }catch(error){\n    petChatError.textContent=error.name==='TimeoutError'?'返事に時間がかかっています。もう一度話しかけてみてください。':error.message;\n    petChatError.hidden=false;\n  }finally{setPetChatBusy(false);petChatInput.focus();}\n}\n"
new = "    if(!response.ok)throw Error(result.error||'ペットとおしゃべりできませんでした。');\n    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('返事を読み取れませんでした。');\n    petChatTyping=false;\n    petChatHistory=petChatHistory.filter(item=>!item.typing);\n    petChatSuggestions=Array.isArray(result.suggestions)?result.suggestions.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):[];\n    petChatHistory.push({role:'assistant',text:result.reply.trim()});renderPetChat();\n  }catch(error){\n    petChatTyping=false;\n    petChatHistory=petChatHistory.filter(item=>!item.typing);\n    petChatError.textContent=error.name==='TimeoutError'?'返事に時間がかかっています。もう一度話しかけてみてください。':error.message;\n    petChatError.hidden=false;\n    renderPetChat();\n  }finally{setPetChatBusy(false);petChatInput.focus();}\n}\n"
if old not in s: raise SystemExit('send outro block not found')
s=s.replace(old,new,1)

old = "hidePetChatBuiltIn();petChatHistory=[];petChatIdentity='';petChatSuggestions=[];petCreate.hidden=true;"
new = "hidePetChatBuiltIn();petChatHistory=[];petChatIdentity='';petChatTyping=false;petChatSuggestions=[];petCreate.hidden=true;"
if old in s:
    s=s.replace(old,new,1)

assert 'pet-chat-dots' in s
assert 'overflow-x:auto' in s
assert "typing:true" in s
p.write_text(s, encoding='utf-8')
