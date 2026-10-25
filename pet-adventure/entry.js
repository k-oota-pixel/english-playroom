const mode=new URLSearchParams(location.search).get('mode');
if(mode==='tower'||mode==='dungeon'){document.body.classList.add('battle-mode');document.getElementById('adventureSelect').hidden=true;document.getElementById('battleView').hidden=false;await import('./game.js?v=1.10.12');}
