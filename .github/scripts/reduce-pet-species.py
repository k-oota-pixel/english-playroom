from pathlib import Path

model = Path('pet-model.js')
text = model.read_text(encoding='utf-8')

old_species = "species: [{id:'cat',label:'ねこ'},{id:'dog',label:'いぬ'},{id:'bird',label:'ことり'},{id:'mystery',label:'ふしぎな子'},{id:'rabbit',label:'うさぎ'},{id:'hamster',label:'ハムスター'},{id:'fox',label:'きつね'},{id:'panda',label:'パンダ'},{id:'penguin',label:'ペンギン'},{id:'dragon',label:'ドラゴン'}],"
new_species = "species: [{id:'cat',label:'ねこ'},{id:'dog',label:'いぬ'},{id:'bird',label:'ことり'},{id:'hamster',label:'ハムスター'},{id:'panda',label:'パンダ'},{id:'penguin',label:'ペンギン'}],"
if text.count(old_species) != 1:
    raise SystemExit(f'Expected species list once, got {text.count(old_species)}')
text = text.replace(old_species, new_species)

old_norm = "export const DEFAULT_APPEARANCE = Object.freeze(Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items[0].id])));\nexport function normalizeAppearance(value={}) {return Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items.some(item=>item.id===value?.[key])?value[key]:items[0].id]));}\nexport function validAppearance(value) {return !!value && Object.entries(OPTIONS).every(([key,items])=>items.some(item=>item.id===value[key]));}"
new_norm = "const LEGACY_SPECIES_FALLBACK = Object.freeze({rabbit:'hamster',fox:'dog',dragon:'bird',mystery:'cat'});\nexport const DEFAULT_APPEARANCE = Object.freeze(Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items[0].id])));\nexport function normalizeAppearance(value={}) {const source={...value};if(typeof source.species==='string'&&Object.hasOwn(LEGACY_SPECIES_FALLBACK,source.species))source.species=LEGACY_SPECIES_FALLBACK[source.species];return Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items.some(item=>item.id===source?.[key])?source[key]:items[0].id]));}\nexport function validAppearance(value) {return !!value && Object.entries(OPTIONS).every(([key,items])=>{const raw=value[key];if(key==='species'&&typeof raw==='string'&&Object.hasOwn(LEGACY_SPECIES_FALLBACK,raw))return true;return items.some(item=>item.id===raw);});}"
if text.count(old_norm) != 1:
    raise SystemExit(f'Expected normalization block once, got {text.count(old_norm)}')
text = text.replace(old_norm, new_norm)

old_pools = "export const PERSONALITY_POOLS=Object.freeze({calm:['cat','panda'],playful:['dog','hamster'],curious:['bird','penguin'],gentle:['rabbit','fox'],magical:['mystery','dragon']});"
new_pools = "export const PERSONALITY_POOLS=Object.freeze({calm:['cat','panda'],playful:['dog','hamster'],curious:['bird','penguin']});"
if text.count(old_pools) != 1:
    raise SystemExit(f'Expected personality pools once, got {text.count(old_pools)}')
text = text.replace(old_pools, new_pools)
model.write_text(text, encoding='utf-8')

maker = Path('pet-maker.js')
text = maker.read_text(encoding='utf-8')
old_questions = """export const QUESTIONS=[
 {key:'personality',title:'友だちと過ごすなら、どんな時間が好き？',answers:[['calm','のんびり、お互いのペースで過ごす'],['playful','たくさん笑って、思いきり遊ぶ'],['curious','知らない場所や新しいことを探検する'],['gentle','好きなものや秘密を、そっと教え合う'],['magical','空想の世界で、不思議な冒険をする']]},
 {key:'bodyColor',title:'好きな色の雰囲気は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
 {key:'eyes',title:'目が合ったら、どんな表情がいい？',answers:[['round','ぱっちり、素直なまなざし'],['sleepy','のんびり、眠たそう'],['sparkle','わくわく、目がきらきら'],['cool','ちょっとクール、頼もしい']]},
 {key:'feature',title:'その子のチャームポイントは？',answers:[['classic','シンプルで自然なかわいさ'],['long','ぴょこんと長い耳や羽'],['horns','小さな角のある不思議な姿']]},
 {key:'pattern',title:'お気に入りの服を選ぶなら？',answers:[['none','すっきり、無地'],['spots','ころころ、水玉'],['stripes','すらっと、しましま'],['star','きらっと、星のワンポイント']]},
 {key:'baseBackground',title:'一緒に過ごしたい場所は？',answers:[['ivory','やさしい光の、おうち'],['sky','青空の見える、ひろば'],['leaf','緑いっぱいの、お庭'],['rose','桜色に包まれた、花畑']]}
];"""
new_questions = """export const QUESTIONS=[
 {key:'personality',title:'一緒に過ごすなら、どんな相棒がいい？',answers:[['calm','のんびり落ち着いて過ごせる子'],['playful','元気いっぱい、一緒に遊べる子'],['curious','好奇心旺盛で、一緒に冒険できる子']]},
 {key:'bodyColor',title:'その子に似合いそうな色は？',answers:[['cream','やさしいクリーム'],['pink','あたたかなピンク'],['blue','さわやかなブルー'],['mint','落ち着くミント'],['lavender','夢みたいなラベンダー'],['orange','明るいオレンジ']]},
 {key:'eyes',title:'目が合ったら、どんな表情がいい？',answers:[['round','ぱっちり、素直なまなざし'],['sleepy','のんびり、眠たそう'],['sparkle','わくわく、目がきらきら'],['cool','ちょっとクール、頼もしい']]},
 {key:'feature',title:'どんなチャームポイントが好き？',answers:[['classic','シンプルで自然なかわいさ'],['long','耳や羽がちょっと大きめ'],['horns','小さな角がある個性的な姿']]},
 {key:'pattern',title:'からだの模様はどんな感じが好き？',answers:[['none','すっきり、無地'],['spots','ころころ、水玉'],['stripes','すらっと、しましま'],['star','きらっと、星のワンポイント']]},
 {key:'baseBackground',title:'一緒に過ごしたい場所は？',answers:[['ivory','やさしい光の、おうち'],['sky','青空の見える、ひろば'],['leaf','緑いっぱいの、お庭'],['rose','桜色に包まれた、花畑']]}
];"""
if text.count(old_questions) != 1:
    raise SystemExit(f'Expected survey questions once, got {text.count(old_questions)}')
text = text.replace(old_questions, new_questions)
old_intro = "6つの質問に答えて、10種類の中からあなたの相棒に出会おう。好みと偶然で決まるので、同じ回答でも違う子が生まれることがあります。最後に名前をつけて迎えよう。姿は、かえってからのお楽しみ。"
new_intro = "6つの質問に答えて、6種類の中からあなたの相棒に出会おう。答えによって出会いやすい子が変わりますが、少しだけ偶然も入ります。最後に名前をつけて迎えよう。姿は、かえってからのお楽しみ。"
if text.count(old_intro) != 1:
    raise SystemExit(f'Expected survey intro once, got {text.count(old_intro)}')
text = text.replace(old_intro, new_intro)
maker.write_text(text, encoding='utf-8')

tests = Path('tests/pet-model.test.js')
text = tests.read_text(encoding='utf-8')
text = text.replace("test('11,520 valid SVG combinations, each safe to render'", "test('6,912 valid SVG combinations, each safe to render'")
text = text.replace('assert.equal(count,11520);', 'assert.equal(count,6912);')
text = text.replace("test('all ten species reachable for every answer, with equal-sized preference boosts'", "test('all six species reachable for every answer, with equal-sized preference boosts'")
text = text.replace("for(let i=0;i<14;i++){const id=chooseSpecies(preference,()=> (i+.5)/14);", "for(let i=0;i<10;i++){const id=chooseSpecies(preference,()=> (i+.5)/10);")
text = text.replace('assert.equal(Object.keys(counts).length,10);', 'assert.equal(Object.keys(counts).length,6);')
old_slot_test = "const shop={ownedItems:['red-ribbon','sunglasses','red-bowtie','star-shirt'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie',body:'star-shirt'}};\n const layers=equippedLayers(shop);assert.ok(layers.accessories.includes('#e55f72'));assert.ok(layers.accessories.includes('#344b58'));assert.ok(layers.accessories.includes('#fff4cf'));"
new_slot_test = "const shop={ownedItems:['red-ribbon','sunglasses','red-bowtie'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie'}};\n const layers=equippedLayers(shop);assert.ok(layers.accessories.includes('#e55f72'));assert.ok(layers.accessories.includes('#344b58'));assert.ok(layers.accessories.includes('#8f3343'));"
if old_slot_test not in text:
    raise SystemExit('Expected accessory slot test block once')
text = text.replace(old_slot_test, new_slot_test)
tests.write_text(text, encoding='utf-8')

print('Reduced species to six and refreshed the pet survey.')
