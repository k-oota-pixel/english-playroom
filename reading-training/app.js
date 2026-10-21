import {GRADES,validatePassages,judge,nextRandom,validFeedback} from './model.js';
const app=document.getElementById('app');
const API='https://eiken-title.onrender.com/api/reading/summary';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let passages=[],grade='4級',route='exercise',passage=null,index=0,answers=[],language='ja',busy=false,controller=null,requestId=0;
const memory=new Map(),feedbacks=new Map();
function read(k){try{return localStorage.getItem('monstudy-reading-v1:'+k)??memory.get(k)??'';}catch{return memory.get(k)||'';}}
function save(k,v){memory.set(k,v);try{localStorage.setItem('monstudy-reading-v1:'+k,v);}catch{}}
const draftKey=()=>`draft:${passage.id}:${language}`;
const feedbackKey=()=>`${passage.id}:${language}`;
const pool=()=>passages.filter(p=>p.grade===grade);
const meta=p=>`${p.grade} · ${p.year}年度 第${p.session}回 · ${p.text.match(/\b[\w’'-]+\b/g)?.length||0} words`;
function cancel(){requestId++;controller?.abort();controller=null;busy=false;}
function home(){cancel();passage=null;renderHome();window.scrollTo({top:0});}
function renderHome(){
 app.setAttribute('aria-busy','false');
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">READ · UNDERSTAND · EXPRESS</div><h1>長文演習</h1><p>読んで、理解して、自分の言葉で。<br>同じ長文を「問題演習」と「要約」の２つのルートで学べます。</p></div><div class="hero-mark" aria-hidden="true">Aa</div></section>
 <div class="section-top"><h2>レベルを選ぶ</h2><span class="step-label">01 / LEVEL</span></div>
 <div class="grades">${GRADES.map(g=>`<button class="grade ${g===grade?'active':''}" data-grade="${g}" aria-pressed="${g===grade}"><strong>${g}</strong><span>${passages.filter(p=>p.grade===g).length}長文</span></button>`).join('')}</div>
 <div class="section-top"><h2>取り組み方を選ぶ</h2><span class="step-label">02 / ROUTE</span></div>
 <div class="routes"><button class="route ${route==='exercise'?'active':''}" data-route="exercise" aria-pressed="${route==='exercise'}"><div class="route-icon" aria-hidden="true">✓</div><strong>問題演習</strong><p>本文と設問を読んで、選択肢をタップ。１問ずつ答え合わせできます。</p><span class="small">READ &amp; CHOOSE</span><span class="arrow" aria-hidden="true">↗</span></button><button class="route summary ${route==='summary'?'active':''}" data-route="summary" aria-pressed="${route==='summary'}"><div class="route-icon" aria-hidden="true">✎</div><strong>要約</strong><p>本文全体を短くまとめよう。Geminiが要点と内容を確認します。</p><span class="small">READ &amp; SUMMARIZE</span><span class="arrow" aria-hidden="true">↗</span></button></div>
 <section class="library"><div class="library-bar"><div><h2>${grade}の長文で${route==='exercise'?'問題演習':'要約'}</h2><p class="library-note">ランダムに始めるか、下の長文を選んでください。</p></div><button class="primary" id="randomStart">ランダムに始める →</button></div><div class="passage-list">${pool().map(p=>`<button class="passage-link" data-passage="${esc(p.id)}"><span><strong>${esc(p.title)}</strong><small>${esc(meta(p))}</small></span><span class="tag">${p.questions.length}問</span></button>`).join('')}</div></section>`;
 app.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{grade=b.dataset.grade;renderHome();});
 app.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{route=b.dataset.route;renderHome();});
 app.querySelectorAll('[data-passage]').forEach(b=>b.onclick=()=>start(b.dataset.passage));
 app.querySelector('#randomStart').onclick=()=>start(nextRandom(pool(),read('last:'+grade))?.id);
}
function start(id){const p=passages.find(p=>p.id===id);if(!p)return;cancel();passage=p;grade=p.grade;index=0;answers=[];save('last:'+grade,p.id);renderLesson();window.scrollTo({top:0});}
function renderLesson(){
 app.innerHTML=`<nav class="lesson-nav"><button id="back" class="text-button">← レベル・長文を選び直す</button><div class="segmented" aria-label="学習ルート"><button id="exerciseTab" class="${route==='exercise'?'active':''}" aria-pressed="${route==='exercise'}">問題演習</button><button id="summaryTab" class="${route==='summary'?'active':''}" aria-pressed="${route==='summary'}">要約</button></div></nav><div class="lesson-heading"><div><div class="eyebrow">${route==='exercise'?'READ &amp; CHOOSE':'READ &amp; SUMMARIZE'}</div><h1>${esc(passage.title)}</h1><div class="meta">${esc(meta(passage))}</div></div><a href="#work" class="jump">${route==='exercise'?'設問':'要約'}へ ↓</a></div><div class="workspace"><article class="reading-paper" aria-label="長文の本文"><div class="paper-label"><span>PASSAGE</span><span>本文</span></div><div class="passage-body" lang="en">${passage.text.split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join('')}</div></article><section class="work-panel" id="work" tabindex="-1" aria-label="${route==='exercise'?'問題演習':'要約'}"></section></div>`;
 app.querySelector('#back').onclick=home;
 for(const mode of ['exercise','summary'])app.querySelector('#'+mode+'Tab').onclick=()=>{if(route===mode)return;cancel();route=mode;renderLesson();};
 if(route==='exercise')renderExercise();else renderSummary();
}
function focusWork(){document.getElementById('work').focus({preventScroll:true});if(matchMedia('(max-width:700px)').matches)document.getElementById('work').scrollIntoView({behavior:'smooth',block:'start'});}
function renderExercise(){
 const work=document.getElementById('work'),q=passage.questions[index];
 if(!q){renderComplete();return;}
 const selected=answers[index],correct=selected===undefined?null:judge(q,selected);
 work.innerHTML=`<div class="progress-label"><span>QUESTION ${index+1} / ${passage.questions.length}</span><span>${answers.filter((a,i)=>judge(passage.questions[i],a)).length}問正解</span></div><div class="progress-track"><i style="width:${index/passage.questions.length*100}%"></i></div><span class="eyebrow">問題 ${index+1}</span><h2 class="question" lang="en">${esc(q.question)}</h2><div class="choices">${q.choices.map((c,i)=>`<button class="choice ${selected!==undefined?(i+1===q.answer?'correct':i+1===selected?'wrong':''):''}" data-answer="${i+1}" ${selected!==undefined?'disabled':''}><span class="num">${i+1}</span><span lang="en">${esc(c)}</span></button>`).join('')}</div>${selected!==undefined?`<div class="feedback ${correct?'':'wrong-feedback'}" role="status"><strong>${correct?'✓ 正解です！':'もう一度、本文の内容を確認しよう。'}</strong><p>正解：${q.answer}. <span lang="en">${esc(q.choices[q.answer-1])}</span></p>${correct?'':'<p>正解の選択肢と本文を照らし合わせてみましょう。</p>'}</div><div class="actions"><button class="primary" id="nextQuestion">${index+1===passage.questions.length?'結果を見る':'次の問題へ'} →</button></div>`:'<p class="micro" style="margin-top:14px">選択肢をタップすると答え合わせします。</p>'}`;
 work.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(answers[index]!==undefined)return;answers[index]=Number(b.dataset.answer);renderExercise();});
 work.querySelector('#nextQuestion')?.addEventListener('click',()=>{index++;renderExercise();focusWork();});
}
function renderComplete(){
 const correct=answers.filter((a,i)=>judge(passage.questions[i],a)).length;save('completed:'+passage.id,JSON.stringify({correct,total:answers.length,at:Date.now()}));
 document.getElementById('work').innerHTML=`<div class="complete"><div class="eyebrow">PRACTICE COMPLETE</div><h2>おつかれさまでした！</h2><div class="big-score">${correct}<small> / ${passage.questions.length}</small></div><p>本文を読んだら、要約にも挑戦してみよう。</p></div>${passage.questions.map((q,i)=>`<div class="question-log"><span>${judge(q,answers[i])?'✓':'×'} ${i+1}</span>${esc(q.question)}<div class="micro">正解：${q.answer}. ${esc(q.choices[q.answer-1])}</div></div>`).join('')}<div class="actions"><button class="secondary" id="retry">もう一度</button><button class="primary" id="toSummary">この長文を要約する →</button></div><div class="actions"><button class="text-button" id="another">別の長文を選ぶ →</button></div>`;
 document.getElementById('retry').onclick=()=>{index=0;answers=[];renderExercise();focusWork();};document.getElementById('toSummary').onclick=()=>{route='summary';renderLesson();focusWork();};document.getElementById('another').onclick=home;
}
function renderSummary(){
 const draft=read(draftKey()),saved=feedbacks.get(feedbackKey());
 document.getElementById('work').innerHTML=`<div class="eyebrow">WRITE YOUR SUMMARY</div><h2 style="margin:9px 0">本文全体を、短くまとめよう。</h2><p class="summary-help">何についての文章で、どんな展開や結論でしたか？ 細かな例をすべて訳すのではなく、大切な内容を自分の言葉でまとめてください。</p><div class="language-row"><label for="language">要約の言語</label><select id="language"><option value="ja" ${language==='ja'?'selected':''}>日本語</option><option value="en" ${language==='en'?'selected':''}>英語</option></select></div><label class="micro" for="summaryInput">あなたの要約</label><textarea id="summaryInput" class="summary-input" maxlength="2000" placeholder="${language==='ja'?'本文の主題・重要な展開・結論をまとめてみましょう。':'Summarize the main idea and key points in your own words.'}" lang="${language}">${esc(draft)}</textarea><div class="count"><span id="saveStatus">下書きをこのブラウザーに保存します</span><span id="charCount">${draft.length} / 2,000文字</span></div><div class="actions"><button id="checkSummary" class="primary" ${draft.trim().length<5?'disabled':''}>Geminiで要約を確認する →</button></div><p class="micro" style="margin-top:12px">送信すると、本文と要約がGoogleのGeminiに送られます。AIの判定には時間がかかる場合があります。</p><div id="summaryStatus" role="status" aria-live="polite"></div><div id="summaryResult">${saved&&saved.input===draft?feedbackHTML(saved.result):''}</div>`;
 const input=document.getElementById('summaryInput'),button=document.getElementById('checkSummary');
 input.oninput=()=>{save(draftKey(),input.value);document.getElementById('charCount').textContent=`${input.value.length} / 2,000文字`;document.getElementById('saveStatus').textContent='下書き保存済み';button.disabled=busy||input.value.trim().length<5;const old=feedbacks.get(feedbackKey());if(old?.input!==input.value)document.getElementById('summaryResult').innerHTML='';};
 document.getElementById('language').onchange=e=>{save(draftKey(),input.value);cancel();language=e.target.value;renderSummary();};
 button.onclick=submitSummary;
}
function feedbackHTML(r){const names={excellent:'とてもよくまとまっています',good:'要点を捉えています',partial:'もう少しで要点がまとまります',needs_work:'本文全体を振り返ってみよう'};
 const section=(title,items)=>items.length?`<h3>${title}</h3><ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'';
 return `<section class="ai-result" aria-label="要約へのフィードバック"><div class="result-heading"><div><div class="eyebrow">GEMINI FEEDBACK</div><h2>${names[r.verdict]}</h2></div><div class="score">${r.total}<small> / 12</small></div></div><div class="rubric">${Object.entries({main_idea:'全体の主題',key_points:'重要な内容',accuracy:'正確さ',concision:'簡潔さ'}).map(([k,n])=>`<div><span>${n}</span><strong>${r.scores[k]} / 3</strong></div>`).join('')}</div><p>${esc(r.feedback)}</p>${section('✓ よかったところ',r.good_points)}${section('↗ さらによくするには',r.improvements)}${section('英語表現の確認',r.language_notes)}<h3>要約の一例</h3><p class="example ${language==='en'?'en':''}" lang="${language}">${esc(r.example)}</p><p class="micro">この例と同じ表現でなくても、本文の要点が伝われば大丈夫です。書き直して、もう一度確認できます。</p></section>`;
}
async function submitSummary(){
 if(busy)return;const input=document.getElementById('summaryInput'),value=input.value;if(value.trim().length<5)return;save(draftKey(),value);
 const token=++requestId,key=feedbackKey();busy=true;controller=new AbortController();
 document.getElementById('checkSummary').disabled=true;input.readOnly=true;document.getElementById('language').disabled=true;
 document.getElementById('summaryStatus').innerHTML='<div class="busy"><span class="spinner" aria-hidden="true"></span>本文と要約を照らし合わせています…</div>';document.getElementById('summaryResult').innerHTML='';
 const timer=setTimeout(()=>controller?.abort(),65000);
 try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({passage_id:passage.id,summary:value,language})});let result;try{result=await response.json();}catch{throw new Error('AIに接続できませんでした。少し待って再試行してください。');}
 if(!response.ok)throw new Error(result.error||'要約を確認できませんでした。');if(!validFeedback(result))throw new Error('フィードバックを読み取れませんでした。もう一度お試しください。');if(token!==requestId)return;
 feedbacks.set(key,{input:value,result});document.getElementById('summaryStatus').innerHTML='';document.getElementById('summaryResult').innerHTML=feedbackHTML(result);
 }catch(e){if(token!==requestId)return;document.getElementById('summaryStatus').innerHTML=`<div class="error" role="alert">${esc(e.name==='AbortError'?'接続に時間がかかっています。要約は保存されています。もう一度お試しください。':e.message)}</div>`;
 }finally{clearTimeout(timer);if(token===requestId){busy=false;controller=null;input.readOnly=false;document.getElementById('language').disabled=false;document.getElementById('checkSummary').disabled=input.value.trim().length<5;}}
}
async function load(){try{const response=await fetch('passages.json?v=1');if(!response.ok)throw new Error('教材を取得できませんでした。');passages=validatePassages(await response.json());renderHome();}catch(e){app.setAttribute('aria-busy','false');app.innerHTML=`<h1>長文演習</h1><div class="error">${esc(e.message)}</div><button class="primary" id="reload" style="margin-top:15px">もう一度読み込む</button>`;document.getElementById('reload').onclick=load;}}
load();
