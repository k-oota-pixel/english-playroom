const mode=new URLSearchParams(location.search).get('mode');
if(mode==='tower'||mode==='dungeon'){
 document.body.classList.add('battle-mode');document.getElementById('adventureSelect').hidden=true;document.getElementById('battleView').hidden=false;
 const actionStyles=document.createElement('link');actionStyles.rel='stylesheet';actionStyles.href='./dungeons-actions.css?v=1.10.23';document.head.append(actionStyles);
 await import('./game.js?v=2.3.14');
 await import('./ranking-publisher.js?v=2.3.13');
}
else{await import('./rankings.js?v=2.3.6');}



