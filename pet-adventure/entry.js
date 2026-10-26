const mode=new URLSearchParams(location.search).get('mode');
if(mode==='tower'||mode==='dungeon'){
 document.body.classList.add('battle-mode');document.getElementById('adventureSelect').hidden=true;document.getElementById('battleView').hidden=false;
 const actionStyles=document.createElement('link');actionStyles.rel='stylesheet';actionStyles.href='./dungeons-actions.css?v=1.10.22';document.head.append(actionStyles);
 await import('./game.js?v=2.1.14');
 await import('./ranking-publisher.js?v=2.1.14');
}
else{await import('./rankings.js?v=2.1.10');}
