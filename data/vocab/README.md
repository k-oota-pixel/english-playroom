# もんすたでぃ 共通英単語マスター

元データ: 生徒さん作成HTML（`TARGET1900_WORDS` / `SOKUTAN_WORDS`）
- `target1900.json`: 1,900語
- `sokutan.json`: 1,903語
- 書式: `{schemaVersion,deck,label,count,fields,notes,entries:[{id,no,en,ja,pos}]}`
- `no` は元HTMLの配列順、`id` は安定識別子
- `ja` と `pos` は現時点で `null`。元HTMLでは翻訳・品詞はAPIから取り込むため、**日本語訳は未登録**です。

## 使い方

ブラウザのJavaScript（ES Modules）で:

```js
import {loadVocabulary, pickVocabulary} from "./data/vocab/index.js";

// No.401〜600から重複なしで20問分を抽出する
const questions = await pickVocabulary("target1900", {
  from: 401, to: 600, count: 20
});
console.log(questions[0].en);

// 全件利用
const {entries} = await loadVocabulary("sokutan");
```

ここにあるデータは静的JSONなので、Firebaseにはアクセスしません。初回はHTTP取得（回線通信量のみ）し、同じページの再呼び出しはPromiseキャッシュから返します。次回以降はブラウザのHTTPキャッシュ設定に依存します。既存教材の学習進捗の保存等は別扱いです。

日本語訳4択問題に使う場合は、正確な訳の入力・検証が必要です。市販教材に由来するリストの公開・再配布に当たっては権利関係を確認してください。
