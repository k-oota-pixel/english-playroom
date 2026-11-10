// Receives the same user document already watched by pet-shop.js; no additional Firestore listener.
const API='https://task-quest.onrender.com';
const MSG={thanks:'いつもありがとう！',birthday:'お誕生日おめでとう！',cheer:'がんばってね！',enjoy:'これ、使ってね！',friends:'これからもよろしく！'};
const REPLY={thanks:'ありがとう！',happy:'とってもうれしい！',treasure:'大切に使うね！',hooray:'やったー！'};
let user=null,profile={},chosen=null,recipient=null,pendingId='',busy=false,tab='received';
let button=null,sendDialog=null,boxDialog=null;
const entries=x=>Array.isArray(x)?x.filter(v=>v&&typeof v==='object'):[];
const el=(parent,tag,label,cls)=>{const node=document.createElement(tag);node.textContent=String(label??'');if(cls)node.className=cls;parent.append(node);return node;};
function notice(message,error=false){
 const box=document.querySelector((sendDialog?.open?'#giftSendNotice':'#giftBoxNotice'));
 if(box){box.textContent=message;box.style.color=error?'#af3030':'#27785b';}
}
async function request(path,payload){
 if(!user)throw Error('ログインしてください。');
 const token=await user.getIdToken();
 const response=await fetch(API+path,{method:payload===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(payload===undefined?{}:{'Content-Type':'application/json'})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'通信に失敗しました。');
 return data;
}
async function attempt(fn){
 if(busy)return;
 busy=true;paintButton();
 try{await fn();}catch(e){notice(e?.message||'処理に失敗しました。',true);}
 finally{busy=false;paintButton();}
}
function paintButton(){
 const unread=Number(profile.giftUnreadCount||0)+Number(profile.giftUnreadReplyCount||0);
 if(button){button.disabled=!user;button.textContent=unread?'🎁 ギフト '+unread:'🎁 ギフト';}
 const sendNow=sendDialog?.querySelector('#giftSendNow');if(sendNow)sendNow.disabled=busy||!recipient||!chosen||Number(profile.coins||0)<chosen.price;
}
function init(){
 if(button)return;
 const shop=document.getElementById('petShopOpen');
 if(!shop){setTimeout(init,100);return;}
 const style=document.createElement('style');
 style.textContent='.pet-shop-gift-action{width:100%;margin-top:6px;padding:7px 4px;border-radius:9px;border:1px solid #d8c184;background:#fff6dc;color:#654b18;font-weight:800;cursor:pointer}.pet-gift-modal{box-sizing:border-box;width:min(510px,calc(100vw - 24px));max-height:90vh;overflow:auto;border:0;border-radius:18px;background:#fffef7;color:#173a31;padding:18px}.pet-gift-modal::backdrop{background:#102b28aa}.pet-gift-modal h2{margin:0 0 12px;font-size:20px}.pet-gift-modal button{cursor:pointer}.pet-gift-modal button:disabled{opacity:.5;cursor:not-allowed}.pet-gift-close{float:right;background:#eef1eb;border:0;border-radius:99px;font-size:22px;width:34px;height:34px}.pet-gift-modal input,.pet-gift-modal select{box-sizing:border-box;border:1px solid #b5c7bb;border-radius:8px;padding:9px;color:#19392e;background:#fff;font:inherit}.pet-gift-modal input{flex:1;min-width:0}.pet-gift-search{display:flex;gap:8px;margin:10px 0}.pet-gift-result,.pet-gift-card{display:block;width:100%;box-sizing:border-box;text-align:left;border:1px solid #d4dfd5;border-radius:10px;padding:10px;margin:7px 0;background:#fff;color:#19392e}.pet-gift-result[aria-pressed=true]{background:#e6f5e8;border-color:#298b69}.pet-gift-primary{background:#257b64;border:0;border-radius:9px;padding:10px;color:#fff;font-weight:800}.pet-gift-wide{width:100%;margin-top:10px}.pet-gift-note{font-size:12px;color:#576f60;line-height:1.6;margin:8px 0}.pet-gift-status{min-height:20px;font-size:13px;font-weight:700}.pet-gift-tabs{display:flex;gap:5px}.pet-gift-tabs button{flex:1;padding:8px 4px;border:1px solid #b2d2c3;border-radius:8px;background:#fff;color:#245744}.pet-gift-tabs button[aria-pressed=true]{background:#2d8168;color:#fff}.pet-gift-card strong{display:block;font-size:14px}.pet-gift-card small{display:block;margin:6px 0;color:#566d63}.pet-gift-card button{border:1px solid #6ca992;border-radius:8px;padding:8px;background:#e3f4ec;color:#245843}.pet-gift-card select{width:100%;margin:7px 0}.pet-gift-pop{animation:giftPop .45s ease-out}@keyframes giftPop{from{transform:scale(.8);opacity:.2}70%{transform:scale(1.08)}to{transform:scale(1);opacity:1}}body[data-screen-theme=dark] .pet-gift-modal{background:#27343b;color:#f4f5ee}body[data-screen-theme=dark] .pet-gift-card{background:#354640;color:#f4f5ee}';
 document.head.append(style);
 button=document.createElement('button');button.type='button';button.className='pet-shop-open';button.id='petGiftOpen';button.textContent='🎁 ギフト';
 shop.insertAdjacentElement('afterend',button);
 sendDialog=document.createElement('dialog');sendDialog.className='pet-gift-modal';
 sendDialog.innerHTML='<button class="pet-gift-close" type="button">×</button><h2>🎁 おともだちに贈る</h2><strong id="giftProduct"></strong><p class="pet-gift-note">ぺっと名で検索し、ニックネームも確認してください。相手が持っている商品は送れません。</p><div class="pet-gift-search"><input id="giftSearchText" maxlength="24" placeholder="ぺっと名"><button class="pet-gift-primary" id="giftSearchBtn" type="button">検索</button></div><div id="giftResults"></div><p id="giftRecipient" class="pet-gift-note">送る相手を選択してください。</p><label for="giftMessage">メッセージ：</label><select id="giftMessage"></select><button id="giftSendNow" type="button" class="pet-gift-primary pet-gift-wide" disabled>ギフトを送る</button><p id="giftSendNotice" class="pet-gift-status" role="status"></p>';
 document.body.append(sendDialog);
 sendDialog.querySelector('.pet-gift-close').onclick=()=>sendDialog.close();
 sendDialog.querySelector('#giftSearchBtn').onclick=search;
 sendDialog.querySelector('#giftSearchText').onkeydown=e=>{if(e.key==='Enter')search();};
 sendDialog.querySelector('#giftSendNow').onclick=send;
 for(const [key,value] of Object.entries(MSG)){const option=el(sendDialog.querySelector('#giftMessage'),'option',value);option.value=key;}
 boxDialog=document.createElement('dialog');boxDialog.className='pet-gift-modal';
 boxDialog.innerHTML='<button class="pet-gift-close" type="button">×</button><h2>🎁 ギフトボックス</h2><div class="pet-gift-tabs"><button data-gift-tab="received" type="button">届いたギフト</button><button data-gift-tab="sent" type="button">送ったギフト</button><button data-gift-tab="replies" type="button">お礼</button></div><p id="giftBoxNotice" class="pet-gift-status" role="status"></p><div id="giftBoxList"></div>';
 document.body.append(boxDialog);
 boxDialog.querySelector('.pet-gift-close').onclick=()=>boxDialog.close();
 boxDialog.querySelectorAll('[data-gift-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.giftTab;notice('');renderBox();});
 button.onclick=()=>{if(!user)return;tab='received';renderBox();boxDialog.showModal();};
 paintButton();
}
function startGift(item){
 if(!user||busy)return;
 if(!item||!Number.isSafeInteger(item.price)||item.price<1)return;
 chosen={id:item.id,name:item.name,price:item.price};recipient=null;pendingId='';
 sendDialog.querySelector('#giftProduct').textContent=item.name+'　🪙 '+item.price+'コイン';
 sendDialog.querySelector('#giftSearchText').value='';
 sendDialog.querySelector('#giftResults').replaceChildren();
 sendDialog.querySelector('#giftRecipient').textContent='送る相手を選択してください。';
 sendDialog.querySelector('#giftMessage').value='thanks';
 sendDialog.querySelector('#giftSendNotice').textContent='';
 sendDialog.showModal();paintButton();
}
window.monstudyGiftStart=startGift;
async function search(){
 if(busy)return;
 const q=sendDialog.querySelector('#giftSearchText').value.normalize('NFKC').trim();
 if(!q||[...q].length>12){notice('ぺっと名は1〜12文字で検索してください。',true);return;}
 recipient=null;pendingId='';paintButton();
 const area=sendDialog.querySelector('#giftResults');area.textContent='検索しています…';
 await attempt(async()=>{
   const {users=[]}=await request('/api/shop/gifts/search?q='+encodeURIComponent(q));
   area.replaceChildren();
   if(!users.length){el(area,'p','該当するぺっとが見つかりませんでした。','pet-gift-note');return;}
   for(const person of users){
     const b=el(area,'button','🐾 '+person.petName+' ／ '+person.nickname,'pet-gift-result');b.type='button';b.setAttribute('aria-pressed','false');
     b.onclick=()=>{recipient=person;pendingId='';area.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));sendDialog.querySelector('#giftRecipient').textContent='ぺっと名：'+person.petName+' ／ ニックネーム：'+person.nickname;paintButton();};
   }
   if(users.length===10)el(area,'small','上位10件を表示しています。名前を詳しく入力すると絞り込めます。');
 });
}
async function send(){
 if(!recipient||!chosen||busy)return;
 const to={...recipient},item={...chosen};
 if(!window.confirm('ぺっと名：'+to.petName+'\nニックネーム：'+to.nickname+'\n「'+item.name+'」を'+item.price+'コインで贈りますか？'))return;
 if(!pendingId)pendingId=crypto.randomUUID();
 const giftId=pendingId;
 await attempt(async()=>{
   await request('/api/shop/gifts/send',{giftId,recipientUid:to.uid,recipientPetName:to.petName,recipientNickname:to.nickname,itemId:item.id,messageId:sendDialog.querySelector('#giftMessage').value});
   sendDialog.close();recipient=null;chosen=null;pendingId='';
   const toast=document.getElementById('petShopToast');if(toast){toast.textContent='🎁 '+to.petName+'さんにギフトを送りました！';toast.dataset.kind='ok';}
 });
}
function renderBox(){
 if(!boxDialog)return;
 boxDialog.querySelectorAll('[data-gift-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.giftTab===tab)));
 const area=boxDialog.querySelector('#giftBoxList');area.replaceChildren();
 const items=(tab==='received'?entries(profile.giftInbox):tab==='sent'?entries(profile.giftSent):entries(profile.giftReplies)).slice(-20).reverse();
 if(!items.length){el(area,'p','まだギフトはありません。','pet-gift-note');return;}
 for(const gift of items){
   const card=el(area,'section','','pet-gift-card');
   if(tab==='received'){
     el(card,'strong','🎁 '+gift.itemName);
     el(card,'small','送信者：'+gift.senderPetName+' ／ '+gift.senderNickname);
     el(card,'p',MSG[gift.messageId]||'プレゼントです！');
     if(!gift.opened){
       const b=el(card,'button','🎁 プレゼントを開く');b.disabled=busy;
       b.onclick=()=>attempt(async()=>{
         await request('/api/shop/gifts/open',{giftId:gift.giftId});
         profile={...profile,giftInbox:entries(profile.giftInbox).map(x=>x.giftId===gift.giftId?{...x,opened:true}:x),giftUnreadCount:Math.max(0,Number(profile.giftUnreadCount||0)-1)};
         notice('✨ '+gift.itemName+'が届きました！');renderBox();paintButton();area.firstElementChild?.classList.add('pet-gift-pop');
       });
     }else if(!gift.replyId){
       const select=document.createElement('select');
       for(const [key,value] of Object.entries(REPLY)){const o=el(select,'option',value);o.value=key;}card.append(select);
       const b=el(card,'button','お礼を送る');b.disabled=busy;
       b.onclick=()=>attempt(async()=>{
         await request('/api/shop/gifts/reply',{giftId:gift.giftId,replyId:select.value});
         profile={...profile,giftInbox:entries(profile.giftInbox).map(x=>x.giftId===gift.giftId?{...x,replyId:select.value}:x)};
         notice('お礼を送りました。');renderBox();
       });
     }else el(card,'small','返信済み：'+(REPLY[gift.replyId]||''));
   }else if(tab==='sent'){
     el(card,'strong','🎁 '+gift.itemName);el(card,'small','送信先：'+gift.recipientPetName+' ／ '+gift.recipientNickname);el(card,'p',MSG[gift.messageId]||'');
   }else{
     el(card,'strong','💌 '+gift.recipientPetName+'からのお礼');
     el(card,'small','ニックネーム：'+gift.recipientNickname);
     el(card,'p',REPLY[gift.replyId]||'');
     if(!gift.seen){const b=el(card,'button','確認した');b.disabled=busy;b.onclick=()=>attempt(async()=>{
       await request('/api/shop/gifts/seen',{giftId:gift.giftId});
       profile={...profile,giftReplies:entries(profile.giftReplies).map(x=>x.giftId===gift.giftId?{...x,seen:true}:x),giftUnreadReplyCount:Math.max(0,Number(profile.giftUnreadReplyCount||0)-1)};
       notice('お礼を確認しました。');renderBox();paintButton();
     });}
   }
 }
}
window.addEventListener('monstudy-shop-state',e=>{user=e.detail?.user||null;profile=e.detail?.data||{};paintButton();if(boxDialog?.open&&!busy)renderBox();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
