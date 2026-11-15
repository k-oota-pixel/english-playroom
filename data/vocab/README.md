# もんすたでぃ 共通英単語・英熟語マスター

元データ: 生徒さん作成HTML（`TARGET1900_WORDS` / `TARGET1400_WORDS` / `TARGET1000_IDIOMS` / `SOKUTAN_WORDS`）。

| ファイル | 項目数 | 内容 |
| --- | ---: | --- |
| `target1900.json` | 1,900 | 英単語 |
| `target1400.json` | 1,400 | 英単語 |
| `target1000.json` | 1,000 | 英熟語・定型表現 |
| `sokutan.json` | 1,903 | 英単語 |
| **合計** | **6,203** | |

- 書式: `{schemaVersion,deck,label,count,fields,notes,entries:[{id,no,en,ja,pos}]}`
- `no` は元HTMLの配列順、`id` は安定識別子
- ターゲット1000の `en` は `a piece of ～` などの表記を含み、原本の記号や括弧を維持
- `ja` と `pos` は現時点で `null`。元HTMLでは翻訳・品詞はAPIから取り込むため、**日本語訳は未登録**です。

## 使い方

ブラウザのJavaScript（ES Modules）で:

```js
import {loadVocabulary, pickVocabulary} from "./data/vocab/index.js";

// ターゲット1000のNo.101〜300から重複なしで20問分を抽出
const idioms = await pickVocabulary("target1000", {
  from: 101, to: 300, count: 20
});
console.log(idioms[0].en);

// ターゲット1400も同じインターフェイス
const words = await pickVocabulary("target1400", { count: 10 });

// 全件読み込み
const {entries} = await loadVocabulary("sokutan");
```

これらのファイルは静的JSONなので、**問題用の単語データ取得自体はFirestore read 0**です。初回はHTTP取得（回線通信量のみ）し、同じページの再呼び出しはメモリ上のPromiseキャッシュから返します。次回以降はブラウザのHTTPキャッシュ設定に依存します。既存教材の学習進捗などの保存は別扱いです。

日本語訳の4択問題に使う場合は、正確な訳の入力・検証が必要です。市販教材に由来するリストの一般公開・再配布に当たっては権利関係を確認してください。
