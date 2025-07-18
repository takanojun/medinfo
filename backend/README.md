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

## DB のリセット

すべてのテーブルを削除して作成し直すには次のコマンドを使います。リポジトリのルートで実行してください。

```bash
python -m backend.app.reset_db
```

## CSV からの医療機関一括登録

カンマ区切りの CSV を読み込み医療機関を追加登録できます。電話番号を複数登録したい場合は `phone_numbers` 列で `|` で区切ってください。

```bash
python -m backend.app.import_facilities_csv path/to/facilities.csv
```

サンプルとして `backend/facilities_sample.csv` を用意しています。

