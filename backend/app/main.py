from fastapi import FastAPI
from .database import Base, engine
from .routers import (
    facility,
    function,
    facility_function_entry,
    function_category,
    memo,
    memo_tag,
    note_image,
)
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
app.include_router(function_category.router)
app.include_router(memo.router)
app.include_router(memo_tag.router)
app.include_router(note_image.router)
