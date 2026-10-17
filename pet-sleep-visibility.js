function installPetSleepVisibility(){
  if(document.getElementById('petSleepVisibilityStyles'))return;
  const style=document.createElement('style');
  style.id='petSleepVisibilityStyles';
  style.textContent=`
.pet-sleep-zzz{
  right:5px!important;
  top:3px!important;
  width:62px!important;
  height:64px!important;
  z-index:20!important;
  color:#fff!important;
  filter:none!important;
  overflow:visible!important;
}
.pet-sleep-zzz span{
  left:4px!important;
  bottom:4px!important;
  opacity:0;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  font-weight:1000!important;
  -webkit-text-stroke:1px #665184;
  paint-order:stroke fill;
  text-shadow:
    0 2px 2px #3a2b5266,
    1px 0 #665184,-1px 0 #665184,
    0 1px #665184,0 -1px #665184;
  animation-name:petSleepZFloatStrong!important;
  animation-duration:2.55s!important;
  animation-timing-function:ease-out!important;
  animation-iteration-count:infinite!important;
}
.pet-sleep-zzz .z1{font-size:24px!important;animation-delay:0s!important}
.pet-sleep-zzz .z2{font-size:19px!important;animation-delay:.78s!important}
.pet-sleep-zzz .z3{font-size:15px!important;animation-delay:1.56s!important}
@keyframes petSleepZFloatStrong{
  0%{transform:translate(-2px,10px) scale(.8) rotate(-6deg);opacity:0}
  14%{opacity:1}
  58%{opacity:1}
  100%{transform:translate(30px,-32px) scale(1.18) rotate(5deg);opacity:0}
}
@media(prefers-reduced-motion:reduce){
  .pet-sleep-zzz span{animation:none!important;opacity:1!important}
  .pet-sleep-zzz .z1{left:2px!important;bottom:3px!important}
  .pet-sleep-zzz .z2{left:20px!important;bottom:20px!important}
  .pet-sleep-zzz .z3{left:38px!important;bottom:37px!important}
}
`;
  document.head.appendChild(style);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPetSleepVisibility,{once:true});
else installPetSleepVisibility();
