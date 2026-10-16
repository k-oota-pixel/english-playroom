from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the old launch button; the chat will always be visible beside/below a hatched pet.
s=s.replace('      <button id="petChatButton" class="pet-button pet-chat-button" type="button" hidden>英語で話す</button>\n','',1)

# Move the existing chat markup from outside <main> into the hero, between intro and pet.
start=s.index('<div id="petChatModal"')
end=s.index('<script type="module">', start)
modal=s[start:end].strip()
s=s[:start]+s[end:]
modal=modal.replace('<div id="petChatModal"','<section id="petChatModal"',1)
last=modal.rfind('</div>')
if last < 0: raise SystemExit('chat closing tag not found')
modal=modal[:last]+'</section>'+modal[last+6:]
modal=modal.replace('      <button id="petChatClose" class="pet-chat-close" type="button" aria-label="会話を閉じる">×</button>\n','',1)
pet_marker='  <section class="pet-card" aria-label="ペット育成">\n'
if pet_marker not in s: raise SystemExit('pet marker not found')
s=s.replace(pet_marker,modal+'\n\n'+pet_marker,1)

# Replace overlay/modal styling with an embedded chat card.
css_start=s.index('[hidden]{display:none!important}')
css_end_marker='@media(max-width:560px){.pet-chat-modal{padding:0;align-items:end}.pet-chat-panel{width:100%;height:88vh;border-radius:20px 20px 0 0}.pet-chat-bubble{max-width:88%}}\n'
css_end=s.index(css_end_marker,css_start)+len(css_end_marker)
new_css='''[hidden]{display:none!important}\n.pet-chat-modal{position:static;inset:auto;z-index:auto;background:transparent;padding:0;min-width:0}\n.pet-chat-panel{width:100%;height:330px;background:#fff;border:1px solid #dbe4dc;border-radius:18px;box-shadow:0 8px 24px #183b3810;display:flex;flex-direction:column;overflow:hidden}\n.pet-chat-head{display:flex;align-items:center;gap:9px;padding:10px 12px;border-bottom:1px solid #e7ede7;background:#fbfcf8}\n.pet-chat-avatar{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;overflow:hidden;border-radius:11px;background:#fff7df}\n.pet-chat-avatar svg{width:100%;height:100%;display:block}\n.pet-chat-heading{min-width:0;flex:1}.pet-chat-heading strong{display:block;font-size:14px}.pet-chat-heading span{display:block;font-size:9px;color:#718078;margin-top:2px;letter-spacing:.08em}\n.pet-chat-close{display:none}\n.pet-chat-messages{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f8f4;scrollbar-width:thin}\n.pet-chat-row{display:flex}.pet-chat-row.user{justify-content:flex-end}.pet-chat-bubble{max-width:86%;padding:9px 11px;border-radius:14px;white-space:pre-wrap;line-height:1.45;font-size:13px;word-break:break-word}\n.pet-chat-row.assistant .pet-chat-bubble{background:#fff;border:1px solid #dce5da;border-bottom-left-radius:5px}.pet-chat-row.user .pet-chat-bubble{background:#245f50;color:#fff;border-bottom-right-radius:5px}\n.pet-chat-note{font-size:9px;color:#7b8980;text-align:center;padding:0 10px 6px;background:#fff}\n.pet-chat-form{display:flex;gap:7px;padding:9px 10px 10px;border-top:1px solid #e7ede7;background:#fff}\n.pet-chat-input{flex:1;min-width:0;border:1px solid #cddbd2;border-radius:11px;padding:10px 11px;font:inherit;font-size:13px;color:#193d38;background:#fff}.pet-chat-input:focus{outline:3px solid #2d796326;border-color:#2d7963}\n.pet-chat-send{border:0;border-radius:11px;background:#245f50;color:#fff;padding:9px 13px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.pet-chat-send:disabled{opacity:.55;cursor:wait}\n.pet-chat-error{font-size:10px;color:#b45239;text-align:center;padding:0 10px 7px;background:#fff}\n@media(max-width:900px){.pet-chat-panel{height:300px}}\n@media(max-width:560px){.pet-chat-panel{height:310px;border-radius:16px}.pet-chat-bubble{max-width:90%;font-size:12.5px}.pet-chat-form{position:sticky;bottom:0}.pet-chat-note{font-size:8.5px}}\n'''
s=s[:css_start]+new_css+s[css_end:]

# Remove button/close-element references.
s=s.replace("const petChatButton=document.getElementById('petChatButton');\n",'',1)
s=s.replace("const petChatClose=document.getElementById('petChatClose');\n",'',1)

# Make chat show/hide as part of pet rendering instead of opening a modal.
old_open="""function openPetChat(){\n  if(!petUser||!hasPet(petData))return;\n  resetPetChatIfNeeded();\n  petChatTitle.textContent=petChatName()+'と話す';\n  petChatAvatar.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop);\n  petChatError.hidden=true;petChatError.textContent='';\n  renderPetChat();petChatModal.hidden=false;document.body.style.overflow='hidden';\n  setTimeout(()=>petChatInput.focus(),30);\n}\nfunction closePetChat(){petChatModal.hidden=true;document.body.style.overflow='';}\n"""
new_open="""function showPetChatBuiltIn(){\n  if(!petUser||!hasPet(petData)){petChatModal.hidden=true;return;}\n  resetPetChatIfNeeded();\n  petChatTitle.textContent=petChatName()+'と話す';\n  petChatAvatar.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop);\n  petChatError.hidden=true;petChatError.textContent='';\n  renderPetChat();petChatModal.hidden=false;\n}\nfunction hidePetChatBuiltIn(){petChatModal.hidden=true;}\n"""
if old_open not in s: raise SystemExit('open/close chat block not found')
s=s.replace(old_open,new_open,1)

for old in [
    "petChatButton.addEventListener('click',openPetChat);\n",
    "petChatClose.addEventListener('click',closePetChat);\n",
    "petChatModal.addEventListener('click',event=>{if(event.target===petChatModal)closePetChat();});\n",
    "document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!petChatModal.hidden)closePetChat();});\n",
]:
    s=s.replace(old,'',1)

s=s.replace("  petChatButton.hidden=!petUser || !hatched;\n",'',1)
render_if="  if(hatched){\n"
if render_if not in s: raise SystemExit('hatched render marker not found')
s=s.replace(render_if,"  if(hatched){\n    showPetChatBuiltIn();\n",1)
render_else="  }else{\n    petVisual.textContent='🥚';\n"
if render_else not in s: raise SystemExit('unhatched render marker not found')
s=s.replace(render_else,"  }else{\n    hidePetChatBuiltIn();\n    petVisual.textContent='🥚';\n",1)

old_reset="  petUser=null;petData={};petMaker.close();petNameDialog.close();closePetChat();petChatHistory=[];petChatIdentity='';petCreate.hidden=true;petRetry.hidden=true;petNameButton.hidden=true;petChatButton.hidden=true;\n"
new_reset="  petUser=null;petData={};petMaker.close();petNameDialog.close();hidePetChatBuiltIn();petChatHistory=[];petChatIdentity='';petCreate.hidden=true;petRetry.hidden=true;petNameButton.hidden=true;\n"
if old_reset not in s: raise SystemExit('auth reset block not found')
s=s.replace(old_reset,new_reset,1)

# Sanity checks.
assert 'petChatButton' not in s
assert 'position:fixed;inset:0;z-index:10000' not in s
assert 'showPetChatBuiltIn' in s
assert s.count('id="petChatModal"')==1
assert s.index('id="petChatModal"') < s.index('<section class="pet-card"')

p.write_text(s,encoding='utf-8')
