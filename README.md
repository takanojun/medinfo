# Medinfo

FastAPI 製バックエンドと React/Vite フロントエンドからなるサンプルアプリケーションです。

## 実行手順

### バックエンド
1. Python 3.10 以上をインストールします。
2. 必要なパッケージをインストールします。
   `pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary`
3. 環境変数 `DATABASE_URL` に PostgreSQL の接続情報を設定します。
   例: `export DATABASE_URL="postgresql://user:password@localhost/medinfo_db"`
4. 下記コマンドで API サーバーを起動します。

```bash
uvicorn backend.app.main:app --reload --port 8001
```

### フロントエンド
1. Node.js をインストールします。
2. `cd my-medical-app` に移動してから `npm install` を実行し、依存パッケージをインストールします。
   - ルートディレクトリで実行すると `package.json` が見つからずエラーになるので注意してください。
   - `react-markdown` がない場合は `npm install react-markdown` を追加で実行します。
3. 環境変数 `VITE_API_URL` にバックエンド API の URL を設定します。例: `export VITE_API_URL="http://localhost:8001"`
4. `npm run dev` で開発サーバーを起動します。

### 日本語入力を常に有効にする
アプリ側では `ImeInput` と `ImeTextarea` コンポーネントを用意しており、
通常の `input` や `textarea` の代わりに使用すると IME が初期状態から日本語入力モードになります。
電話番号やメール、FAX の入力には従来の `input` を使ってください。

## サブディレクトリ README
- [backend/README.md](backend/README.md)
- [my-medical-app/README.md](my-medical-app/README.md)

### メモ機能のマークダウン見出し
メモ編集では `#` 記号の後に半角スペースを入れると見出しとして表示されます。
例: `# タイトル`
