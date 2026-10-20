let menu=null,bypassOriginal=false;

const GAMES=Object.freeze([
  {
    id:'pet-catch',
    title:'PET CATCH',
    eyebrow:'VOCABULARY · ACTION',
    icon:'↓',
    desc:'英単語の意味を見て、ペットを左右に動かして正しい日本語をキャッチ。',
    meta:'3 LIFE · 10正解で1C',
    href:'./pet-catch/'
  },
  {
    id:'catch',
    title:'CATCH!',
    eyebrow:'ENGLISH INSTRUCTIONS',
    icon:'★',
    desc:'英語の指示を読んで、色・大きさ・形が合うものを見つけよう。',
    meta:'5 ROUNDS · CLEARで報酬',
    original:true
  }
]);

function installStyles(){
  if(document.getElementById('petPlayMenu164Styles'))return;
  const style=document.createElement('style');style.id='petPlayMenu164Styles';
  style.textContent=`
.pet-game-menu{width:min(650px,calc(100vw - 20px));border:0;border-radius:24px;padding:0;background:#fffdf8;color:#193d38;box-shadow:0 22px 80px #10251f66}.pet-game-menu::backdrop{background:#17342f9c;backdrop-filter:blur(3px)}
.pet-game-menu-shell{position:relative;padding:20px}.pet-game-menu-close{position:absolute;right:14px;top:14px;appearance:none;border:1px solid #d9e2dc;background:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer}.pet-game-menu-kicker{font-size:9px;font-weight:900;letter-spacing:.18em;color:#5d8e7c}.pet-game-menu-title{font-size:28px;font-weight:950;margin:2px 0 4px}.pet-game-menu-sub{margin:0;color:#6f7e77;font-size:12px;line-height:1.6}
.pet-game-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:17px}.pet-game-menu-card{appearance:none;text-align:left;border:1px solid #dbe5dd;background:#fff;border-radius:18px;padding:15px;color:inherit;cursor:pointer;box-shadow:0 4px 14px #203b3608;transition:.14s transform,.14s border-color,.14s box-shadow}.pet-game-menu-card:hover{transform:translateY(-2px);border-color:#a9cbb9;box-shadow:0 7px 19px #203b3612}.pet-game-menu-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#e9f4ed;color:#246c57;font-size:20px;font-weight:950}.pet-game-menu-eyebrow{font-size:8.5px;letter-spacing:.12em;color:#70857b;font-weight:850;margin-top:11px}.pet-game-menu-name{font-size:20px;font-weight:950;margin-top:2px}.pet-game-menu-desc{font-size:11px;color:#66766f;line-height:1.55;margin-top:5px;min-height:52px}.pet-game-menu-meta{font-size:9.5px;color:#8a7b50;font-weight:800;border-top:1px solid #edf1ed;padding-top:8px;margin-top:10px}.pet-game-menu-foot{font-size:9.5px;color:#8a928e;margin-top:13px;text-align:center}
@media(max-width:560px){.pet-game-menu-shell{padding:17px 13px}.pet-game-menu-title{font-size:24px}.pet-game-menu-grid{grid-template-columns:1fr;gap:9px}.pet-game-menu-desc{min-height:0}.pet-game-menu-card{padding:13px}}
`;
  document.head.appendChild(style);
}

function ensureMenu(){
  if(menu)return menu;
  menu=document.createElement('dialog');menu.id='petGameMenu';menu.className='pet-game-menu';
  menu.addEventListener('click',event=>{if(event.target===menu)menu.close();});
  document.body.appendChild(menu);return menu;
}

function launch(game){
  if(game.href){location.href=game.href;return;}
  if(game.original){
    menu?.close();
    const button=document.getElementById('petPlayOpen');if(!button)return;
    bypassOriginal=true;button.click();bypassOriginal=false;
  }
}

function openMenu(){
  installStyles();ensureMenu();
  menu.innerHTML=`<div class="pet-game-menu-shell"><button class="pet-game-menu-close" type="button" aria-label="閉じる">×</button><div class="pet-game-menu-kicker">PET PLAY</div><div class="pet-game-menu-title">どのゲームで遊ぶ？</div><p class="pet-game-menu-sub">ペットといっしょに遊べるミニゲームを選ぼう。これからゲームを追加していきます。</p><div class="pet-game-menu-grid"></div><div class="pet-game-menu-foot">ゲームは今後ここに追加されます。</div></div>`;
  menu.querySelector('.pet-game-menu-close').addEventListener('click',()=>menu.close());
  const grid=menu.querySelector('.pet-game-menu-grid');
  for(const game of GAMES){
    const button=document.createElement('button');button.type='button';button.className='pet-game-menu-card';
    button.innerHTML=`<span class="pet-game-menu-icon" aria-hidden="true">${game.icon}</span><div class="pet-game-menu-eyebrow">${game.eyebrow}</div><div class="pet-game-menu-name">${game.title}</div><div class="pet-game-menu-desc">${game.desc}</div><div class="pet-game-menu-meta">${game.meta}</div>`;
    button.addEventListener('click',()=>launch(game));grid.appendChild(button);
  }
  if(!menu.open)menu.showModal();
}

function intercept(event){
  if(bypassOriginal)return;
  const button=event.target instanceof Element?event.target.closest('#petPlayOpen'):null;if(!button)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openMenu();
}

document.addEventListener('click',intercept,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installStyles,{once:true});else installStyles();
