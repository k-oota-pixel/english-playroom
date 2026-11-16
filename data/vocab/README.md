# もんすたでぃ 共通英単語・英熟語マスター

元データ: 生徒さん作成HTML（`TARGET1900_WORDS` / `TARGET1400_WORDS` / `TARGET1000_IDIOMS` / `SOKUTAN_WORDS`）。

| ファイル | 項目数 | 内容 |
| --- | ---: | --- |
| `target1900.json` | 1,900 | 英単語 |
| `pre1-advanced.json` | 399 | 上記1,900語の上位範囲から重複語を除いて抽出した、準1級程度の暫定問題データ（英語・日本語・品詞） |
| `target1400.json` | 1,400 | 英単語 |
| `target1000.json` | 1,000 | 英熟語・定型表現 |
| `sokutan.json` | 1,903 | 英単語 |
| **原データ合計** | **6,203** | ※上位399語は原データからの抽出で、別加算しません |

- 書式: `{schemaVersion,deck,label,count,fields,notes,entries:[{id,no,en,ja,pos}]}`
- `no` は元HTMLの配列順、`id` は安定識別子
- ターゲット1000の `en` は `a piece of ～` などの表記を含み、原本の記号や括弧を維持
- 原データ4種類の `ja` と `pos` は現時点で `null`。元HTMLでは翻訳・品詞はAPIから取り込むため、**原データの日本語訳は未登録**です。
- `pre1-advanced.json` はターゲット1900 No.1501〜1900を抽出し、重複の `drown`（No.1636）を除いた399語。こちらには日本語訳と品詞を独自に付けています。英検準1級の公式語彙表という意味ではなく、測定用の暫定難度タグ `pre1_approx` を付与したものです。

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

// 準1級程度の上位語彙から、日本語訳付きで重複なしの10語を抽出
const advanced = await pickVocabulary("pre1Advanced", {
  count: 10, requireJapanese: true
});
console.log(advanced[0].en, advanced[0].ja, advanced[0].pos);

// 全件読み込み
const {entries} = await loadVocabulary("sokutan");
```

これらのファイルは静的JSONなので、**問題用の単語データ取得自体はFirestore read 0**です。初回はHTTP取得（回線通信量のみ）し、同じページの再呼び出しはメモリ上のPromiseキャッシュから返します。次回以降はブラウザのHTTPキャッシュ設定に依存します。既存教材の学習進捗などの保存は別扱いです。

日本語訳の4択問題に使う場合は、正確な訳の入力・検証が必要です。市販教材に由来するリストの一般公開・再配布に当たっては権利関係を確認してください。

## 上位語彙データの扱い

- データベースの追加のみです。診断テストの自動出題や利用者画面には未接続です。
- 語彙の順番だけで難度を推定した暫定グループです。CAT/IRTによる推定に使う前に、実際の正答率による難易度校正が必要です。
- 多義語の代表的な意味を各1つ登録しています。英日・日英の4択に利用する際は、正解の別義や不適切な誤答選択肢がないか確認してください。
- Firebaseへはアクセスしません。ファイルはGitHub/静的ホスティング上に保存し、`loadVocabulary` で1回読み込んでキャッシュします。
- データ元が市販書籍に由来するため、公開・再配布に当たっては必要な利用許諾等を確認してください。
