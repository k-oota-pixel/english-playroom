import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from '../auth-session.js?v=2.4.37';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {VALUE_PRESETS,CHOICES,blankState,normalizeState,calculate,sampleState} from './model.js?v=1.0.0';

const firebaseConfig={
  apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',
  authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',
  storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',
  appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'
};
const app=getApps().find(item=>item.name==='[DEFAULT]')||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]));
const safeRead=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const storageKey=uid=>'monstudy-career-matrix-v1:'+uid;
let currentUser=null;
let state=blankState();
let revision=0;
let loading=false;
let saving=false;
// Whether the user has explicitly opened a free-text input (UI-only, no database writes).
const customValueSlots=new Set();
const customOptionSlots=new Set();

function notice(message,tone=''){
  const node=$('notice');
  node.textContent=message;
  node.className='notice'+(tone?' '+tone:'');
}
function saveLocal(){
  if(!currentUser)return;
  try{localStorage.setItem(storageKey(currentUser.uid),JSON.stringify(state));}
  catch(error){console.warn('[career-matrix] local save unavailable',error);}
}
function markChanged(){
  revision++;
  state.updatedAt=Date.now();
  saveLocal();
  notice('入力中の内容をこの端末に仮保存しました。アカウントに残すには「この内容を保存する」を押してください。');
}
function showIfEmpty(value,fallback){return value||fallback;}
function clearRow(i){state.ratings[i]=[0,0,0,0];}
function clearColumn(j){for(let i=0;i<4;i++)state.ratings[i][j]=0;}
function updateValue(i,text){
  const next=String(text||'').slice(0,60);
  if(state.values[i].label===next)return;
  state.values[i].label=next;
  clearRow(i);
  markChanged();
}
function updateOption(i,text){
  const next=String(text||'').slice(0,60);
  if(state.options[i].name===next)return;
  state.options[i].name=next;
  clearColumn(i);
  markChanged();
}
function renderValues(){
  $('valuesEditor').innerHTML=state.values.map((value,i)=>{
    const isPreset=VALUE_PRESETS.includes(value.label);
    const isCustom=customValueSlots.has(i)||(!isPreset&&Boolean(value.label));
    const selected=isCustom?'__custom':(isPreset?value.label:'');
    const choices='<option value="">価値観を選択</option>'+
      VALUE_PRESETS.map(label=>'<option value="'+esc(label)+'"'+(selected===label?' selected':'')+'>'+esc(label)+'</option>').join('')+
      '<option value="__custom"'+(selected==='__custom'?' selected':'')+'>自由記述する</option>';
    const stars=[1,2,3,4,5].map(weight=>
      '<button type="button" class="star'+(weight<=value.weight?' selected':'')+'" data-action="weight" data-index="'+i+'" data-weight="'+weight+'" aria-label="判断基準'+(i+1)+'の重要度を'+weight+'にする" aria-pressed="'+(weight===value.weight)+'">★</button>'
    ).join('');
    return '<div class="edit-card'+(value.label?' is-filled':'')+'">'+
      '<div class="edit-title"><span><b>'+(i+1)+'</b> 判断基準 '+(i+1)+'</span></div>'+
      '<div class="field"><label for="valueSelect'+i+'">大切にしたいこと</label>'+
      '<select id="valueSelect'+i+'" data-role="value-select" data-index="'+i+'">'+choices+'</select></div>'+
      '<div class="field custom-field"'+(isCustom?'':' hidden')+' style="margin-top:8px"><label for="valueInput'+i+'">あなたの言葉で入力</label>'+
      '<input id="valueInput'+i+'" data-role="value-input" data-index="'+i+'" type="text" maxlength="60" value="'+esc(isPreset?'':value.label)+'" placeholder="例：家族との時間を確保したい"></div>'+
      '<div class="weight-line"><span>あなたにとっての重要度</span><div class="stars" role="group" aria-label="重要度">'+stars+'</div><span class="star-count">'+value.weight+' / 5</span></div>'+
      '</div>';
  }).join('');
}
function renderOptions(){
  $('optionsEditor').innerHTML=state.options.map((option,i)=>{
    const config=CHOICES[option.kind];
    const isPreset=config.examples.includes(option.name);
    const isCustom=customOptionSlots.has(i)||(!isPreset&&Boolean(option.name));
    const selected=isCustom?'__custom':(isPreset?option.name:'');
    const kinds=Object.entries(CHOICES).map(([key,value])=>
      '<button class="kind'+(option.kind===key?' active':'')+'" type="button" data-action="kind" data-index="'+i+'" data-kind="'+key+'" aria-pressed="'+(option.kind===key)+'">'+esc(value.label)+'</button>'
    ).join('');
    const choices='<option value="">'+esc(config.label)+'を選択</option>'+
      config.examples.map(name=>'<option value="'+esc(name)+'"'+(selected===name?' selected':'')+'>'+esc(name)+'</option>').join('')+
      '<option value="__custom"'+(selected==='__custom'?' selected':'')+'>その他（自由記述）</option>';
    return '<div class="edit-card'+(option.name?' is-filled':'')+'">'+
      '<div class="edit-title"><span><b>'+(i+1)+'</b> 比較候補 '+(i+1)+'</span><span class="count">'+esc(config.label)+'</span></div>'+
      '<div class="kinds" role="group" aria-label="比較候補'+(i+1)+'の種類">'+kinds+'</div>'+
      '<div class="option-fields"><div class="field"><label for="optionSelect'+i+'">詳しい'+esc(config.label)+'を選ぶ</label>'+
      '<select id="optionSelect'+i+'" data-role="option-select" data-index="'+i+'">'+choices+'</select></div>'+
      '<div class="field custom-field"'+(isCustom?'':' hidden')+'><label for="optionInput'+i+'">候補にない場合は自由記述</label>'+
      '<input type="text" id="optionInput'+i+'" data-role="option-input" data-index="'+i+'" value="'+esc(isPreset?'':option.name)+'" maxlength="60" placeholder="例：地域創生学部"></div></div>'+
      '<p class="custom-tip">別の候補に変えると、この候補の評価4か所は未評価に戻ります。</p></div>';
  }).join('');
}
function renderMatrix(){
  const result=calculate(state);
  const header='<thead><tr><th scope="col">判断基準 / 比較候補</th>'+
    state.options.map((option,j)=>'<th scope="col">'+esc(showIfEmpty(option.name,'候補 '+(j+1)))+'<small>'+esc(CHOICES[option.kind].label)+'</small></th>').join('')+
    '</tr></thead>';
  const body='<tbody>'+state.values.map((value,i)=>{
    const cells=state.options.map((option,j)=>{
      const rating=state.ratings[i][j];
      const buttons=[1,2,3,4,5].map(n=>
        '<button type="button" class="rate'+(rating===n?' active':'')+'" data-action="rate" data-row="'+i+'" data-col="'+j+'" data-score="'+n+'" aria-label="'+esc(showIfEmpty(value.label,'判断基準'+(i+1)))+'：'+esc(showIfEmpty(option.name,'候補'+(j+1)))+'の評価を'+n+'にする" aria-pressed="'+(rating===n)+'">'+n+'</button>'
      ).join('');
      return '<td><div class="rater" role="group" aria-label="1から5で評価">'+buttons+'</div>'+
        '<p class="calc">'+(rating?rating+' × '+value.weight+' = <strong>'+result.rows[i][j]+'</strong>':'未評価')+'</p></td>';
    }).join('');
    return '<tr><th scope="row"><div class="value-label">'+esc(showIfEmpty(value.label,'判断基準 '+(i+1)))+'</div>'+
      '<div class="weight-caption">'+('★'.repeat(value.weight))+'<span style="color:#c3cbc2">'+('☆'.repeat(5-value.weight))+'</span></div></th>'+cells+'</tr>';
  }).join('')+'</tbody>';
  const foot='<tfoot><tr><th scope="row" class="total-label">総合点<small>最大 '+result.maxPoints+'点</small></th>'+
    result.options.map(item=>'<td class="total-cell">'+item.score+'<small>'+item.completed+' / 4 項目を評価</small></td>').join('')+
    '</tr></tfoot>';
  $('matrixTable').innerHTML=header+body+foot;
}
function renderMobileEvaluator(){
  const result=calculate(state);
  $('mobileEvaluation').innerHTML=state.options.map((option,j)=>{
    const label=showIfEmpty(option.name,'比較候補 '+(j+1));
    const rows=state.values.map((value,i)=>{
      const rating=state.ratings[i][j];
      const weighted=result.rows[i][j];
      const descriptor=showIfEmpty(value.label,'判断基準 '+(i+1));
      const buttons=[1,2,3,4,5].map(n=>
        '<button type="button" class="rate'+(n===rating?' active':'')+'" data-action="rate" data-row="'+i+'" data-col="'+j+'" data-score="'+n+'" aria-label="'+esc(label)+'：'+esc(descriptor)+'の評価を'+n+'にする" aria-pressed="'+(rating===n)+'">'+n+'</button>'
      ).join('');
      return '<div class="mobile-score-row"><div class="mobile-score-top"><strong>'+esc(descriptor)+'</strong>'+
        '<span aria-label="重要度'+value.weight+'">'+('★'.repeat(value.weight))+('☆'.repeat(5-value.weight))+'</span></div>'+
        '<div class="mobile-score-controls"><div class="rater" role="group" aria-label="'+esc(descriptor)+'の5段階評価">'+buttons+'</div>'+
        '<div class="calc">'+(rating?rating+' × '+value.weight+' = <strong>'+weighted+'</strong>':'未評価')+'</div></div></div>';
    }).join('');
    return '<section class="mobile-option" aria-label="'+esc(label)+'の評価">'+
      '<div class="mobile-option-head"><div><div class="mobile-option-label">'+esc(label)+'</div>'+
      '<div class="mobile-option-meta">'+esc(CHOICES[option.kind].label)+' · '+result.options[j].completed+'/4 評価</div></div>'+
      '<div class="mobile-option-score" aria-label="現在の合計'+result.options[j].score+'点">'+result.options[j].score+'<span style="font-size:10px;font-weight:600;color:#738878"> / '+result.maxPoints+'</span></div></div>'+
      rows+'</section>';
  }).join('');
}
function renderResults(){
  const result=calculate(state);
  const completed=result.ready;
  if(result.duplicateValues||result.duplicateOptions){
    $('resultDescription').textContent='同じ価値観や比較候補が重複しています。重複を解消すると最終順位を表示できます。';
  }else{
    $('resultDescription').textContent=completed?
      '4つの価値観と4つの候補を、あなたがつけた点数で比較しました。':
      'すべて入力すると正式な順位がつきます。いまは入力済みの評価だけを暫定集計しています。';
  }
  const ordered=completed?result.order:result.options;
  $('results').innerHTML=ordered.map((option,i)=>{
    const label=showIfEmpty(option.name,'候補 '+(option.index+1));
    const ratio=result.maxPoints?Math.min(100,100*option.score/result.maxPoints):0;
    const bestRow=state.values.map((v,row)=>({name:v.label,score:result.rows[row][option.index]}))
      .filter(item=>item.name&&item.score>0).sort((a,b)=>b.score-a.score)[0];
    return '<article class="result'+(completed&&i===0?' top':'')+'">'+
      '<div class="result-header"><div><div class="rank">'+(completed?'第'+(i+1)+'位':'比較候補 '+(option.index+1))+' · '+esc(CHOICES[option.kind].label)+'</div>'+
      '<h3>'+esc(label)+'</h3></div><div class="scoreline"><strong>'+option.score+'</strong><span>/ '+result.maxPoints+'点</span></div></div>'+
      '<div class="bar"><i style="width:'+ratio+'%"></i></div>'+
      '<small>'+(option.completed<4?'未評価 '+(4-option.completed)+' 項目 · 暫定点数':(completed?'すべて評価済み':'評価済み 4/4'))+
      (bestRow?' ／ 最も加点が大きい項目：'+esc(bestRow.name)+'（'+bestRow.score+'点）':'')+'</small></article>';
  }).join('');
}
function renderCounters(){
  const result=calculate(state);
  $('valueCount').textContent=result.enteredValues+' / 4';
  $('optionCount').textContent=result.enteredOptions+' / 4';
  $('ratingCount').textContent=result.filled+' / 16';
  const count=result.enteredValues+result.enteredOptions+result.filled;
  $('progressCount').textContent=count+' / 24';
  $('progressBar').style.width=(count/24*100)+'%';
  $('progressText').textContent=result.ready?'すべての評価が完成しました！':
    result.duplicateValues||result.duplicateOptions?'同じ名前の項目が重複しています':
    count===0?'判断基準と進路候補を選ぼう':
    count<8?'あと '+(8-result.enteredValues-result.enteredOptions)+' 件の項目を設定しよう':
    'あと '+(16-result.filled)+' か所の評価を入力しよう';
}
function renderAll(){
  renderValues();renderOptions();renderMatrix();renderMobileEvaluator();renderResults();renderCounters();
}
function updateAfterInput(){
  renderMatrix();renderMobileEvaluator();renderResults();renderCounters();
}

$('valuesEditor').addEventListener('input',event=>{
  const target=event.target;
  if(target.dataset.role!=='value-input')return;
  updateValue(Number(target.dataset.index),target.value);
  updateAfterInput();
});
$('valuesEditor').addEventListener('change',event=>{
  const target=event.target;
  const i=Number(target.dataset.index);
  if(target.dataset.role==='value-select'){
    const custom=target.value==='__custom';
    if(custom)customValueSlots.add(i);else customValueSlots.delete(i);
    updateValue(i,custom?'':target.value);
    renderAll();
    if(custom)$('valueInput'+i)?.focus();
  }
  if(target.dataset.role==='value-input')renderValues();
});
$('optionsEditor').addEventListener('input',event=>{
  const target=event.target;
  if(target.dataset.role!=='option-input')return;
  updateOption(Number(target.dataset.index),target.value);
  updateAfterInput();
});
$('optionsEditor').addEventListener('change',event=>{
  const target=event.target;
  const i=Number(target.dataset.index);
  if(target.dataset.role==='option-select'){
    const custom=target.value==='__custom';
    if(custom)customOptionSlots.add(i);else customOptionSlots.delete(i);
    updateOption(i,custom?'':target.value);
    renderAll();
    if(custom)$('optionInput'+i)?.focus();
  }
  if(target.dataset.role==='option-input')renderOptions();
});
$('valuesEditor').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action="weight"]');
  if(!button)return;
  const i=Number(button.dataset.index),weight=Number(button.dataset.weight);
  if(state.values[i].weight===weight)return;
  state.values[i].weight=weight;
  markChanged();renderValues();renderMatrix();renderMobileEvaluator();renderResults();renderCounters();
});
$('optionsEditor').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action="kind"]');
  if(!button)return;
  const i=Number(button.dataset.index),kind=button.dataset.kind;
  if(state.options[i].kind===kind)return;
  state.options[i]={kind,name:''};clearColumn(i);customOptionSlots.delete(i);
  markChanged();renderAll();
});
function onRatingClick(event){
  const button=event.target.closest('button[data-action="rate"]');
  if(!button)return;
  const i=Number(button.dataset.row),j=Number(button.dataset.col),value=Number(button.dataset.score);
  state.ratings[i][j]=state.ratings[i][j]===value?0:value;
  markChanged();
  renderMatrix();renderMobileEvaluator();renderResults();renderCounters();
}
$('matrixTable').addEventListener('click',onRatingClick);
$('mobileEvaluation').addEventListener('click',onRatingClick);
$('tableToggle').addEventListener('click',()=>{
  const table=$('desktopMatrix');
  const show=!table.classList.contains('force-show');
  table.classList.toggle('force-show',show);
  $('tableToggle').setAttribute('aria-expanded',String(show));
  $('tableToggle').textContent=show?'一覧表を閉じる −':'一覧表でも見る ＋';
});
function confirmReplace(){
  return !calculate(state).enteredValues&&!calculate(state).enteredOptions&&!calculate(state).filled ||
    window.confirm('現在の入力内容を置き換えます。よろしいですか？');
}
$('sampleButton').addEventListener('click',()=>{
  if(!confirmReplace())return;
  customValueSlots.clear();customOptionSlots.clear();
  state=sampleState();markChanged();renderAll();
  notice('添付画像と同じサンプルを表示しました。点数や価値観を変えて試せます。');
});
$('resetButton').addEventListener('click',()=>{
  if(!confirmReplace())return;
  customValueSlots.clear();customOptionSlots.clear();
  state=blankState();markChanged();renderAll();
  notice('新しい表にしました。この端末に仮保存されています。');
});
$('printButton').addEventListener('click',()=>window.print());
$('saveButton').addEventListener('click',async()=>{
  if(saving||!currentUser)return;
  const result=calculate(state);
  if(result.duplicateValues||result.duplicateOptions){
    notice('同じ判断基準または比較候補が重複しています。修正してから保存してください。','error');
    return;
  }
  saving=true;
  const button=$('saveButton');
  button.disabled=true;button.textContent='保存中…';
  const writeRevision=revision;
  const payload=normalizeState(state);
  try{
    await setDoc(doc(db,'users',currentUser.uid,'apps','career-matrix'),{
      matrix:{...payload,ratings:payload.ratings.flat()},updatedAt:serverTimestamp()
    },{merge:true});
    notice(revision===writeRevision?'アカウントに保存しました。別の端末でも同じ内容を開けます。':
      '保存操作時点の内容を保存しました。その後の変更は、もう一度保存してください。','success');
  }catch(error){
    console.warn('[career-matrix] cloud save failed',error);
    notice('クラウド保存に失敗しました。入力内容はこの端末に残っています。通信状態や権限を確認して再度保存してください。','error');
  }finally{
    saving=false;button.disabled=false;button.textContent='この内容を保存する';
  }
});
async function start(user){
  currentUser=user;
  loading=true;
  state=normalizeState(safeRead(storageKey(user.uid)));
  const startingRevision=revision;
  renderAll();
  try{
    const snap=await getDoc(doc(db,'users',user.uid,'apps','career-matrix'));
    if(snap.exists()&&revision===startingRevision){
      const remote=normalizeState(snap.data().matrix);
      if(remote.updatedAt>state.updatedAt){
        state=remote;saveLocal();renderAll();
        notice('アカウントに保存されている表を読み込みました。','success');
      }else if(state.updatedAt){
        notice('この端末の入力内容を復元しました。変更をアカウントにも残す場合は保存してください。');
      }
    }
  }catch(error){
    console.warn('[career-matrix] cloud load failed',error);
    notice('クラウドからの読込ができませんでした。この端末のデータで続けられます。','error');
  }finally{loading=false;}
}
onAuthStateChanged(auth,user=>{
  if(!user)return;
  if(currentUser?.uid===user.uid)return;
  void start(user);
},error=>{
  console.warn('[career-matrix] auth failed',error);
  notice('ログイン状態を確認できません。もう一度読み込んでください。','error');
});
