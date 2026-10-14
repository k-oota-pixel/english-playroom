# english-playroom

## ペット

別の日に3回ログインすると「どんな子がいい？」が表示されます。連続ログインは不要です。
種類4種（ねこ・いぬ・ことり・ふしぎな子）、体色6色、目4種、耳・羽・角3種、模様4種、背景色4種の計4,608通りを選べます。
6問のアンケートに答え、「たまごをかえす」でクラウド保存が成功した時に姿が現れます。回答が種類・体色・表情・耳や角・模様・背景を決めます。「あとで」なら次回ログイン時も選べます。
従来のひよこ表示まで進んだユーザーも、保存済みのログイン日数を引き継いで見た目を選べます。

### ファイル

- `pet-model.js`: 安定した選択ID、検証、ログイン日数、将来のショップ用レジストリ。
- `pet-art.js`: 背景→耳/角→本体→模様→顔→アクセサリーの軽量SVG合成。外部画像・ビルドは不要。
- `pet-maker.js` / `pet.css`: 1問ずつ答えるアンケートと、見出しの右側の大きなペット表示。キーボード操作・モバイル・動きを減らす設定に対応。
- `index.html`: 既存Firebase Auth / Firestoreとの接続。相対URLなのでGitHub Pagesのサブパスで動作。

### 保存先と互換性

既存の `users/{uid}/apps/english-playroom`（既存 `eiken-retry` のデフォルトFirestore）を使用します。
ログイン日付は従来どおり端末のローカル日付です。同日再ログインは加算せず、日付が過去に戻った場合も加算しません。
読み取りと更新をトランザクションにまとめ、別タブの同時ログインによる二重加算や、孵化時の見た目の上書きを防ぎます。
他の学習データは `merge: true` で保持します。新規データベースやFirebase設定の変更はありません。

```js
{
  petLoginDays: 3,
  petLastLoginDate: '2026-10-14',
  petHatched: true, // 新規ユーザーは選択保存成功後に初めてtrue
  petSchemaVersion: 1,
  petAppearance: {
    species: 'cat', bodyColor: 'cream', eyes: 'round',
    feature: 'classic', pattern: 'none', baseBackground: 'ivory'
  },
  petHatchedAt: /* serverTimestamp */ null,
  petCustomizedAt: /* serverTimestamp */ null,
  petUpdatedAt: /* serverTimestamp */ null
}
```

Firebaseの既存ルールがこのドキュメントの本人による読み書きを許可する必要があります。
フィールドの許可リストがある場合は新規 `petAppearance`、`petSchemaVersion`、`petCustomizedAt` を追加してください。
このリポジトリには実際のルールがないため、ルールの変更・デプロイは含みません。
ログイン日数は従来と同じクライアント管理です。有料アイテムの購入を追加する際は、所有権・決済・日数などの信頼が必要な処理をサーバー側で検証してください。

### 将来のショップ

無料の `baseBackground` とショップの装備を分離しています。見た目を変えずに追加可能です。
`SHOP_LAYERS` の `backgrounds`、`patterns`、`accessories` に、共通 `viewBox="0 0 240 240"` 用の信頼できるローカルSVG断片を登録します。
`petShop.ownedItems` に所有ID、`petShop.equipped` に装備IDを保存します。未登録・未所有のIDは描画されません。
描画順は背景→模様→アクセサリー。リボンと帽子を組み合わせる場合は、アクセサリースロットを分けてこの順番に追加できます。
保存データから任意のSVGやURLを読み込むことはありません。

### 確認

Node.js で `npm test` を実行できます。全4,608通り、日数の境界、既存孵化データ、未知IDの安全な処理を確認します。
`npm install`、`npx playwright install chromium` の後、`npm run test:browser` でFirebase SDKをモックしたブラウザー検証を実行できます。
2日目の制限、3日目の選択、保存失敗→再試行、再読み込み、旧データ、別タブの先行保存、キャンセル、ゲスト、390px表示を確認します。
インストール済みChromeを使う場合は `CHROME_PATH` に実行ファイルのパスを指定できます。
実Firebaseでの最終受け入れは本人のGoogleログインで、3日目の作成→再読み込み→別端末で同じ見た目になることを確認してください。
