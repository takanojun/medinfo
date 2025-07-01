import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# DB接続情報（ユーザー: orca / パスワード: orca）
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://orca:orca@localhost/medinfo_db")

# SQLAlchemyエンジン生成
engine = create_engine(DATABASE_URL)

# セッション作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Baseクラス（モデルの親クラス）
Base = declarative_base()
