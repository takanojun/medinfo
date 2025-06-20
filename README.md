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
2. `cd my-medical-app` で移動し、`npm install` を実行します。
3. 環境変数 `VITE_API_URL` にバックエンド API の URL を設定します。例: `export VITE_API_URL="http://localhost:8001"`
4. `npm run dev` で開発サーバーを起動します。

## サブディレクトリ README
- [backend/README.md](backend/README.md)
- [my-medical-app/README.md](my-medical-app/README.md)
