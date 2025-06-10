<<<<<<< HEAD
from fastapi import FastAPI
from .database import Base, engine
from .routers import facility, function, facility_function_entry
from fastapi.middleware.cors import CORSMiddleware

# DB初期化（テーブル作成）
Base.metadata.create_all(bind=engine)

app = FastAPI(title="医療機関情報API")

# CORS（フロントエンドとの連携を許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適宜制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(facility.router)
app.include_router(function.router)
app.include_router(facility_function_entry.router)
=======
from fastapi import FastAPI
from .database import Base, engine
from .routers import facility, function, facility_function_entry
from fastapi.middleware.cors import CORSMiddleware

# DB初期化（テーブル作成）
Base.metadata.create_all(bind=engine)

app = FastAPI(title="医療機関情報API")

# CORS（フロントエンドとの連携を許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適宜制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(facility.router)
app.include_router(function.router)
app.include_router(facility_function_entry.router)
>>>>>>> 7bd7996a4e39d31cfa208aedf412f9c576f5a1bf
