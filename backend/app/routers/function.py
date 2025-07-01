from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, models

# /functions で始まるAPIルート
router = APIRouter(prefix="/functions", tags=["functions"])

def get_db():
    """
    データベースセッション取得用の共通関数。
    """
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 機能マスタ一覧取得（GET /functions）
@router.get("", response_model=List[schemas.FunctionBase])
def read_functions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    functions = (
        db.query(models.Function)
        .filter(models.Function.is_deleted == False)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return functions

# 機能マスタ新規作成（POST /functions）
@router.post("", response_model=schemas.FunctionBase)
def create_function(function: schemas.FunctionCreate, db: Session = Depends(get_db)):
    """新しい機能マスタを登録するAPI
    POST 時には ID を含めないため、FunctionCreate スキーマを利用する"""
    db_function = models.Function(**function.dict())
    db.add(db_function)
    db.commit()
    db.refresh(db_function)
    return db_function

# 機能マスタ更新（PUT /functions/{function_id}）
@router.put("/{function_id}", response_model=schemas.FunctionBase)
def update_function(function_id: int, update_data: schemas.FunctionUpdate, db: Session = Depends(get_db)):
    """
    機能マスタ情報を更新するAPI。
    部分更新対応。対象がなければ404。
    """
    db_function = (
        db.query(models.Function)
        .filter(models.Function.id == function_id, models.Function.is_deleted == False)
        .first()
    )
    if not db_function:
        raise HTTPException(status_code=404, detail="Function not found")
    
    # 送られてきた項目だけ更新する
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(db_function, key, value)
    
    db.commit()
    db.refresh(db_function)
    return db_function


# 機能マスタ削除（DELETE /functions/{function_id}）
@router.delete("/{function_id}", response_model=dict)
def delete_function(function_id: int, db: Session = Depends(get_db)):
    """
    機能マスタ情報を削除するAPI。
    削除対象が見つからない場合は404。
    """
    db_function = (
        db.query(models.Function)
        .filter(models.Function.id == function_id, models.Function.is_deleted == False)
        .first()
    )
    if not db_function:
        raise HTTPException(status_code=404, detail="Function not found")
    
    db_function.is_deleted = True
    db.commit()
    return {"message": "Function deleted successfully"}
