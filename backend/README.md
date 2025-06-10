# Backend - FastAPI

Python 製の API サーバーです。

## セットアップ

1. Python 3.10 以上を準備してください。
2. 以下のパッケージをインストールします。

```bash
pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary
```

## 環境変数

PostgreSQL に接続するため `DATABASE_URL` を設定します。例:

```bash
export DATABASE_URL="postgresql://user:password@localhost/medinfo_db"
```

## サーバー起動

リポジトリのルートから次のコマンドを実行します。

```bash
uvicorn backend.app.main:app --reload --port 8001
```
