// PET FISHING uses the same standalone question script as Eiken Retry.
// Loading the Eiken page HTML is no longer a valid source for question data.
export const EIKEN_GRADES=['4級','3級','準2級','2級','準1級'];
export const EIKEN_QUESTIONS_URL='https://k-oota-pixel.github.io/eiken-retry/assets/question-data.js?v=split1';

function validQuestion(q){
 if(!q||typeof q!=='object'||!q.id||!EIKEN_GRADES.includes(q.grade)||typeof q.question!=='string'||!q.question.trim())return false;
 if(!Array.isArray(q.choices)||q.choices.length<4)return false;
 const answer=Number(q.answer_number),choices=q.choices.slice(0,4);
 return Number.isInteger(answer)&&answer>0&&choices.every(c=>c&&Number.isInteger(Number(c.number))&&typeof c.text==='string'&&c.text.trim())&&choices.some(c=>Number(c.number)===answer);
}

export function validateFishingQuestionBank(raw){
 if(!Array.isArray(raw))throw Error('英検の問題データを確認できませんでした。');
 const questions=raw.filter(validQuestion);
 if(questions.length<20||EIKEN_GRADES.some(grade=>questions.filter(q=>q.grade===grade).length<2)){
  throw Error('英検の問題データが不足しています。');
 }
 return questions;
}

export function pickFishingEikenQuestion(questions,grade,lastId='',random=Math.random){
 const pool=questions.filter(q=>q.grade===grade);
 if(pool.length<2)throw Error('選択した級の問題が読み込まれていません。画面を再読み込みしてください。');
 const candidates=pool.filter(q=>String(q.id)!==String(lastId));
 const list=candidates.length?candidates:pool;
 return list[Math.floor(random()*list.length)];
}

export function loadFishingEikenBank({documentObject=document,globalObject=window,url=EIKEN_QUESTIONS_URL,timeoutMs=30000}={}){
 // The separate JavaScript asset sets window.RETRY_QUESTIONS. Its loading
 // needs no Firestore access and works with GitHub Pages' normal script rules.
 if(Array.isArray(globalObject.RETRY_QUESTIONS))return Promise.resolve(validateFishingQuestionBank(globalObject.RETRY_QUESTIONS));
 return new Promise((resolve,reject)=>{
  const script=documentObject.createElement('script');
  script.src=url;
  script.async=true;
  let settled=false;
  const finish=(error,bank)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timer);
   script.onload=null;
   script.onerror=null;
   script.remove();
   if(error)reject(error);
   else resolve(bank);
  };
  const timer=setTimeout(()=>finish(Error('英検問題データの読み込みがタイムアウトしました。')),timeoutMs);
  script.onload=()=>{
   try{finish(null,validateFishingQuestionBank(globalObject.RETRY_QUESTIONS));}
   catch(error){finish(error);}
  };
  script.onerror=()=>finish(Error('英検問題データを読み込めませんでした。'));
  documentObject.head.append(script);
 });
}
