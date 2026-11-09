// The cave uses the full Retry Notebook question bank. Keep draws distinct until each grade's deck is exhausted.
export const EIKEN_GRADES=Object.freeze(['4級','3級','準2級','2級','準1級']);

export function buildEikenQuestionBank(rows,{minimumPerGrade=20}={}){
  if(!Array.isArray(rows))throw new Error('Retry Notebook question bank is missing');
  const banks=Object.fromEntries(EIKEN_GRADES.map(grade=>[grade,[]]));
  const seen=new Set();
  for(const q of rows){
    if(!q||!EIKEN_GRADES.includes(q.grade)||!q.id||!String(q.question||'').trim()||!Array.isArray(q.choices)||q.choices.length<4)continue;
    if(!q.choices.every(choice=>Number.isInteger(Number(choice?.number))&&String(choice?.text||'').trim()))continue;
    if(!q.choices.some(choice=>Number(choice.number)===Number(q.answer_number)))continue;
    const id=String(q.id);
    if(seen.has(id))continue;
    seen.add(id);
    banks[q.grade].push(q);
  }
  for(const grade of EIKEN_GRADES){
    if(banks[grade].length<minimumPerGrade)throw new Error(`Retry Notebook ${grade} question bank is too small (${banks[grade].length})`);
  }
  return banks;
}

export function createEikenQuestionPicker(banks,rng=Math.random){
  const decks=Object.create(null),lastIds=Object.create(null);
  return function pick(grade){
    const pool=banks?.[grade];
    if(!Array.isArray(pool)||!pool.length)throw new Error(`No questions for ${grade}`);
    if(!decks[grade]?.length){
      const deck=[...pool];
      for(let i=deck.length-1;i>0;i--){
        const j=Math.floor(rng()*(i+1));
        [deck[i],deck[j]]=[deck[j],deck[i]];
      }
      // Avoid a repeat at the boundary between two complete draws.
      if(deck.length>1&&deck[deck.length-1].id===lastIds[grade]){
        const alternate=deck.findIndex(q=>q.id!==lastIds[grade]);
        if(alternate>=0)[deck[deck.length-1],deck[alternate]]=[deck[alternate],deck[deck.length-1]];
      }
      decks[grade]=deck;
    }
    const question=decks[grade].pop();
    lastIds[grade]=question.id;
    return question;
  };
}
