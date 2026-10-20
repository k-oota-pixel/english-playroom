function removeLegacyPetCatchCard(){document.getElementById('petCatchCard')?.remove();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacyPetCatchCard,{once:true});else removeLegacyPetCatchCard();
