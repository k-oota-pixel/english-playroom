import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from './auth-session.js?v=2.3.2';

const LOADER_STYLE_ID='monstudy-access-loader-style';
const LOADER_ID='monstudy-access-loader';

function installLoader(){
 if(document.getElementById(LOADER_ID))return;
 const style=document.createElement('style');
 style.id=LOADER_STYLE_ID;
 style.textContent=`
 #${LOADER_ID}{
  visibility:visible!important;position:fixed;inset:0;z-index:2147483646;overflow:hidden;
  display:grid;place-items:center;padding:28px 18px;
  background:
   radial-gradient(circle at -3% 8%,rgba(197,225,251,.58) 0 90px,transparent 91px),
   radial-gradient(circle at 103% 18%,rgba(211,233,251,.52) 0 110px,transparent 111px),
   radial-gradient(circle at 7% 100%,rgba(207,231,250,.48) 0 115px,transparent 116px),
   radial-gradient(circle at 94% 97%,rgba(221,239,253,.55) 0 125px,transparent 126px),
   linear-gradient(180deg,#fbfdff 0%,#f6fbff 52%,#fbfdff 100%);
  color:#27445f;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
 }
 #${LOADER_ID} .monstudy-loader-scene{position:relative;width:min(88vw,390px);display:grid;justify-items:center;gap:34px}
 #${LOADER_ID} .monstudy-loader-diamond-wrap{position:relative;width:236px;height:236px;display:grid;place-items:center}
 #${LOADER_ID} .monstudy-loader-diamond{
  position:absolute;inset:18px;transform:rotate(45deg);border-radius:31px;
  background:rgba(255,255,255,.42);box-shadow:0 14px 45px rgba(90,151,207,.10),inset 0 0 28px rgba(255,255,255,.78)
 }
 #${LOADER_ID} .monstudy-loader-diamond:before{
  content:"";position:absolute;inset:-7px;border-radius:36px;padding:6px;
  background:conic-gradient(from 0deg,
   rgba(120,184,245,.12) 0 8%,#71b5f5 12% 20%,#d8f2ff 24% 30%,#ffffff 31% 35%,
   rgba(113,181,245,.20) 39% 48%,#54a2ee 52% 61%,#bdeaff 65% 72%,#ffffff 74% 77%,
   rgba(113,181,245,.16) 82% 91%,#78baf5 94% 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  filter:drop-shadow(0 0 8px rgba(95,175,245,.35));
  animation:monstudyDiamondSweep 1.85s linear infinite;
 }
 #${LOADER_ID} .monstudy-loader-diamond:after{
  content:"";position:absolute;inset:-17px;border:3px solid rgba(120,189,247,.15);border-radius:42px;
  animation:monstudyDiamondPulse 1.85s ease-in-out infinite;
 }
 #${LOADER_ID} .monstudy-loader-dog{position:relative;z-index:2;width:184px;height:184px;filter:drop-shadow(0 9px 10px rgba(75,55,39,.10));animation:monstudyDogFloat 2.1s ease-in-out infinite}
 #${LOADER_ID} .monstudy-loader-dog svg{width:100%;height:100%;display:block}
 #${LOADER_ID} .monstudy-loader-message{display:flex;align-items:center;justify-content:center;gap:2px;font-size:clamp(17px,4.5vw,23px);font-weight:850;letter-spacing:.025em;color:#2d4965;text-align:center;text-shadow:0 2px 12px rgba(255,255,255,.9)}
 #${LOADER_ID} .monstudy-loader-dots{display:inline-flex;align-items:flex-end;width:27px;gap:2px;margin-left:1px}
 #${LOADER_ID} .monstudy-loader-dots i{width:5px;height:5px;border-radius:50%;background:#69a8df;display:block;animation:monstudyDot 1.1s ease-in-out infinite}
 #${LOADER_ID} .monstudy-loader-dots i:nth-child(2){animation-delay:.14s}#${LOADER_ID} .monstudy-loader-dots i:nth-child(3){animation-delay:.28s}
 #${LOADER_ID} .monstudy-loader-paw,#${LOADER_ID} .monstudy-loader-star{position:absolute;user-select:none;pointer-events:none}
 #${LOADER_ID} .monstudy-loader-paw{font-size:34px;color:#90bdec;opacity:.16}
 #${LOADER_ID} .monstudy-loader-paw.p1{left:-2px;top:43px;transform:rotate(-14deg) scale(.8)}
 #${LOADER_ID} .monstudy-loader-paw.p2{right:-4px;bottom:84px;transform:rotate(11deg) scale(.72)}
 #${LOADER_ID} .monstudy-loader-star{font-size:23px;color:#f1ca62;opacity:.6;animation:monstudyStar 2.2s ease-in-out infinite}
 #${LOADER_ID} .monstudy-loader-star.s1{left:24px;top:142px}#${LOADER_ID} .monstudy-loader-star.s2{right:27px;top:83px;font-size:16px;animation-delay:.55s}#${LOADER_ID} .monstudy-loader-star.s3{right:50px;bottom:129px;font-size:12px;animation-delay:1.05s}
 @keyframes monstudyDiamondSweep{to{transform:rotate(360deg)}}
 @keyframes monstudyDiamondPulse{0%,100%{opacity:.25;transform:scale(.985)}50%{opacity:.7;transform:scale(1.025)}}
 @keyframes monstudyDogFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
 @keyframes monstudyDot{0%,70%,100%{opacity:.25;transform:translateY(0)}35%{opacity:1;transform:translateY(-4px)}}
 @keyframes monstudyStar{0%,100%{opacity:.35;transform:scale(.86) rotate(0)}50%{opacity:.9;transform:scale(1.08) rotate(8deg)}}
 @media(max-width:420px){#${LOADER_ID} .monstudy-loader-diamond-wrap{width:214px;height:214px}#${LOADER_ID} .monstudy-loader-diamond{inset:20px}#${LOADER_ID} .monstudy-loader-dog{width:165px;height:165px}#${LOADER_ID} .monstudy-loader-scene{gap:30px}}
 @media(prefers-reduced-motion:reduce){#${LOADER_ID} *{animation-duration:.001ms!important;animation-iteration-count:1!important}}
 `;
 document.head.append(style);
 const panel=document.createElement('section');
 panel.id=LOADER_ID;
 panel.setAttribute('role','status');
 panel.setAttribute('aria-live','polite');
 panel.setAttribute('aria-label','ログイン情報を確認中');
 panel.innerHTML=`
  <div class="monstudy-loader-scene">
   <span class="monstudy-loader-paw p1" aria-hidden="true">🐾</span><span class="monstudy-loader-paw p2" aria-hidden="true">🐾</span>
   <span class="monstudy-loader-star s1" aria-hidden="true">★</span><span class="monstudy-loader-star s2" aria-hidden="true">★</span><span class="monstudy-loader-star s3" aria-hidden="true">★</span>
   <div class="monstudy-loader-diamond-wrap" aria-hidden="true">
    <div class="monstudy-loader-diamond"></div>
    <div class="monstudy-loader-dog">
     <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(16.8 30.38) scale(.86)" stroke="#513829" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round">
       <path d="M158 177 Q192 166 192 141 Q198 130 205 143 Q219 168 201 187 Q193 200 164 197Z" fill="#dfa05f"/>
       <path d="M192 141 Q198 130 205 143 Q211 153 207 162 Q199 169 193 165 Q202 157 199 151 Q195 156 187 154Z" fill="#fff7e9" stroke="none"/>
       <path d="M158 177 Q192 166 192 141 Q198 130 205 143 Q219 168 201 187 Q193 200 164 197Z" fill="none"/>
       <path d="M96 145 Q72 159 76 190 Q79 207 120 208 Q161 207 164 190 Q168 159 144 145Z" fill="#dfa05f"/>
       <path d="M106 147 Q97 161 104 179 L120 204 L136 179 Q143 161 134 147Z" fill="#fff7e9" stroke="none"/>
       <ellipse cx="84" cy="192" rx="20" ry="18" fill="#dfa05f"/><ellipse cx="156" cy="192" rx="20" ry="18" fill="#dfa05f"/>
       <path d="M96 174 Q96 153 104 161 Q115 174 116 202 L94 202Z M144 174 Q144 153 136 161 Q125 174 124 202 L146 202Z" fill="#dfa05f"/>
       <ellipse cx="86" cy="204" rx="12" ry="10" fill="#fff7e9"/><ellipse cx="154" cy="204" rx="12" ry="10" fill="#fff7e9"/>
       <ellipse cx="106" cy="205" rx="15" ry="12" fill="#fff7e9"/><ellipse cx="134" cy="205" rx="15" ry="12" fill="#fff7e9"/>
       <path d="M102 204 v6 M110 204 v6 M130 204 v6 M138 204 v6" stroke-width="2.2"/>
       <path d="M72 73 Q83 49 120 49 Q157 49 168 73 L167 114 Q164 151 120 151 Q76 151 73 114Z" fill="#dfa05f"/>
       <ellipse cx="120" cy="127" rx="36" ry="23" fill="#fff7e9" stroke="none"/>
       <path d="M81 74 Q58 63 39 94 Q26 115 42 135 Q62 156 76 132Z M159 74 Q182 63 201 94 Q214 115 198 135 Q178 156 164 132Z" fill="#dfa05f"/>
       <path d="M70 86 Q52 88 43 109 Q37 126 52 134 Q68 143 70 86Z M170 86 Q188 88 197 109 Q203 126 188 134 Q172 143 170 86Z" fill="#513829" opacity=".09" stroke="none"/>
       <g fill="#513829" stroke="none">
        <ellipse cx="98" cy="108" rx="11" ry="14"/><ellipse cx="142" cy="108" rx="11" ry="14"/>
        <circle cx="94" cy="103" r="3.6" fill="#fff"/><circle cx="138" cy="103" r="3.6" fill="#fff"/>
        <circle cx="101" cy="112" r="2.2" fill="#fff" opacity=".9"/><circle cx="145" cy="112" r="2.2" fill="#fff" opacity=".9"/>
       </g>
       <g fill="#ff91a4" opacity=".85" stroke="none"><ellipse cx="81" cy="128" rx="8.5" ry="6.4"/><ellipse cx="159" cy="128" rx="8.5" ry="6.4"/></g>
       <path d="M114 118 Q120 115 126 118 Q128 121 120 126 Q112 121 114 118Z" fill="#513829" stroke="none"/>
       <path d="M120 125 v5 Q114 137 107 131 M120 130 Q126 137 133 131" fill="none" stroke-width="3.2"/>
      </g>
     </svg>
    </div>
   </div>
   <div class="monstudy-loader-message">ログイン情報を確認中<span class="monstudy-loader-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
  </div>`;
 document.body.append(panel);
}

function removeLoader(){
 document.getElementById(LOADER_ID)?.remove();
 document.getElementById(LOADER_STYLE_ID)?.remove();
}

if(document.body)installLoader();
else document.addEventListener('DOMContentLoaded',installLoader,{once:true});

if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
await new Promise(resolve=>setTimeout(resolve,0));
const app=getApps().find(app=>app.name==='[DEFAULT]')||initializeApp({apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'});
const auth=getAuth(app);
function failure(error){
 removeLoader();
 document.getElementById('monstudy-access-message')?.remove();
 const panel=document.createElement('section');panel.id='monstudy-access-message';
 panel.style.cssText='visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:16px;padding:24px;background:#f6f5ef;color:#193d38;font:16px/1.7 system-ui';
 const message=document.createElement('p');message.textContent=error.message||'ログイン確認に接続できませんでした。';
 const retry=document.createElement('button');retry.textContent='もう一度確認する';retry.onclick=()=>location.reload();
 const logout=document.createElement('button');logout.textContent='ログイン画面へ';logout.onclick=async()=>{await signOut(auth);location.href='https://k-oota-pixel.github.io/english-playroom/login.html';};
 panel.append(message,retry,logout);document.body.append(panel);
}
window.addEventListener('monstudy-access-error',event=>failure(event.detail));
onAuthStateChanged(auth,user=>{
 if(!user)return;
 document.getElementById('monstudy-access-lock')?.remove();
 document.getElementById('monstudy-access-message')?.remove();
 removeLoader();
},failure);