// Career matrix: deterministic, framework-free scoring and curated choices.
export const VALUE_PRESETS=[
  '興味・好奇心を持てるか','自分の得意を生かせるか','将来の仕事につながるか',
  '人や社会の役に立てるか','学びたい内容があるか','幅広い進路を選べるか',
  '就職の安定性','収入や生活の安定','働き方の自由度','資格取得につながるか',
  '家族のすすめ','先生や先輩のすすめ','大学での学びの楽しさ',
  '新しいことに挑戦できるか','地域に貢献できるか','海外と関わる機会があるか',
  '数学が受験に必要ない','将来の起業に役立つか','学費や通学の負担が少ない',
  '自分らしさを大切にできるか','人と関わる仕事につながるか',
  '専門性を深められるか','最新技術に触れられるか','学問の探究を続けられるか'
];
export const CHOICES={
  faculty:{label:'学部',examples:[
    '文学部','人文学部','外国語学部','国際学部','法学部','政治経済学部','経済学部','経営学部','商学部','社会学部','総合政策学部',
    '教育学部','心理学部','理学部','工学部','理工学部','情報学部','データサイエンス学部','農学部','獣医学部','水産学部','環境学部',
    '医学部','歯学部','薬学部','看護学部','保健医療学部','福祉学部','栄養学部','体育学部','スポーツ科学部','芸術学部','デザイン学部','観光学部'
  ]},
  field:{label:'分野',examples:[
    '日本文学','歴史学','哲学','言語学','英語・外国語','国際関係','法律','政治','経済','経営','会計','マーケティング','社会福祉',
    '教育・保育','心理学','数学','物理学','化学','生物学','地球科学','機械工学','電気電子工学','建築','土木','情報工学',
    'AI・データサイエンス','農業','食品科学','環境科学','看護','医療技術','薬学','スポーツ','美術・デザイン','観光','防災','地域づくり'
  ]},
  industry:{label:'業界',examples:[
    'IT・ソフトウェア','通信','半導体・電子部品','自動車','機械・ものづくり','建設・住宅','エネルギー','化学・素材','食品','農業','水産業',
    '医療・病院','医薬品','介護・福祉','教育','金融・銀行','保険','証券','商社','小売・流通','物流・運輸','観光・ホテル','航空・鉄道',
    '出版・新聞','放送・映像','広告','ゲーム・エンタメ','アパレル','美容','不動産','公務・行政','コンサルティング','研究開発','国際協力'
  ]},
  job:{label:'職種',examples:[
    '医師','看護師','保健師','薬剤師','理学療法士','作業療法士','臨床検査技師','管理栄養士','獣医師','保育士','小学校教員','中学校・高校教員',
    '大学教員・研究者','心理職','社会福祉士','公務員','警察官','消防士','弁護士','税理士','公認会計士','銀行員','経営者','起業家',
    '営業職','企画・マーケティング職','人事職','広報職','事務職','システムエンジニア','プログラマー','データサイエンティスト',
    'AIエンジニア','建築士','機械設計技術者','研究開発職','食品開発職','農業従事者','客室乗務員','通訳・翻訳','デザイナー','編集者','記者','ゲームクリエイター','観光・ホテルスタッフ'
  ]}
};
const cleanText=(s,max=48)=>String(s??'').trim().slice(0,max);
const integer=(n,min,max,fallback)=>Number.isInteger(Number(n))&&Number(n)>=min&&Number(n)<=max?Number(n):fallback;
export const blankState=()=>({
  version:1,values:Array.from({length:4},()=>({label:'',weight:3})),
  options:Array.from({length:4},()=>({kind:'faculty',name:''})),
  ratings:Array.from({length:4},()=>Array(4).fill(0)),
  updatedAt:0
});
export function normalizeState(raw){
  const state=blankState();
  if(!raw||typeof raw!=='object')return state;
  for(let i=0;i<4;i++){
    const v=raw.values?.[i]||{};
    state.values[i]={label:cleanText(v.label,60),weight:integer(v.weight,1,5,3)};
    const o=raw.options?.[i]||{};
    state.options[i]={kind:Object.hasOwn(CHOICES,o.kind)?o.kind:'faculty',name:cleanText(o.name,60)};
    for(let j=0;j<4;j++){
      const cell=Array.isArray(raw.ratings?.[i])?raw.ratings[i][j]:raw.ratings?.[i*4+j];
      state.ratings[i][j]=integer(cell,0,5,0);
    }
  }
  state.updatedAt=Number.isFinite(raw.updatedAt)&&raw.updatedAt>0?raw.updatedAt:0;
  return state;
}
export function calculate(stateInput){
  const state=normalizeState(stateInput);
  const maxPoints=5*state.values.reduce((sum,v)=>sum+v.weight,0);
  const rows=state.values.map((v,i)=>state.options.map((_,j)=>state.ratings[i][j]*v.weight));
  const options=state.options.map((o,j)=>{
    const completed=state.values.reduce((count,_,i)=>count+Number(state.ratings[i][j]>0),0);
    return {index:j,name:o.name,kind:o.kind,score:rows.reduce((sum,row)=>sum+row[j],0),completed};
  });
  const labels=state.values.map(v=>v.label);
  const names=state.options.map(o=>o.name);
  const duplicateValues=new Set(labels.filter(Boolean)).size!==labels.filter(Boolean).length;
  const duplicateOptions=new Set(names.filter(Boolean)).size!==names.filter(Boolean).length;
  const enteredValues=labels.filter(Boolean).length;
  const enteredOptions=names.filter(Boolean).length;
  const filled=state.ratings.flat().filter(Boolean).length;
  const ready=enteredValues===4&&enteredOptions===4&&filled===16&&!duplicateValues&&!duplicateOptions;
  return {rows,options,maxPoints,ready,enteredValues,enteredOptions,filled,duplicateValues,duplicateOptions,
    order:[...options].sort((a,b)=>b.score-a.score||a.index-b.index)};
}
export function sampleState(){
  return normalizeState({values:[
    {label:'将来の起業に役立つか',weight:3},
    {label:'数学が受験に必要ない',weight:1},
    {label:'家族のすすめ',weight:4},
    {label:'興味・好奇心を持てるか',weight:2}
  ],options:['経済学部','経営学部','工学部','商学部'].map(name=>({kind:'faculty',name})),
  ratings:[[1,4,2,3],[2,5,1,4],[3,1,5,2],[5,2,2,1]]});
}
