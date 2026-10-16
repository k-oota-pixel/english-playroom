from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="""  }catch(error){
    petChatTyping=false;
    petChatHistory=petChatHistory.filter(item=>!item.typing);
    petChatError.textContent=error.name==='TimeoutError'?'返事に時間がかかっています。もう一度話しかけてみてください。':error.message;
    petChatError.hidden=false;
    renderPetChat();
  }finally{setPetChatBusy(false);petChatInput.focus();}
}
"""
new="""  }catch(error){
    petChatTyping=false;
    petChatHistory=petChatHistory.filter(item=>!item.typing);
    const last=petChatHistory[petChatHistory.length-1];
    if(last?.role==='user' && last.text===text)petChatHistory.pop();
    if(!quickText)petChatInput.value=text;
    petChatError.textContent=error.name==='TimeoutError'?'返事に時間がかかっています。もう一度話しかけてみてください。':error.message;
    petChatError.hidden=false;
    renderPetChat();
  }finally{setPetChatBusy(false);petChatInput.focus();}
}
"""
if old not in s: raise SystemExit('pet catch block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
