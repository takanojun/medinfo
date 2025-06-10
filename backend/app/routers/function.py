from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, models

"""機能マスタを操作するAPIルーター。"""

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
    """
    登録されている機能マスタの一覧を取得するAPI。

    :param skip: 取得開始位置（デフォルト0）
    :param limit: 最大取得件数（デフォルト100）
    :return: 機能マスタのリスト
    """
    functions = db.query(models.Function).offset(skip).limit(limit).all()
    return functions

# 機能マスタ新規作成（POST /functions）
@router.post("", response_model=schemas.FunctionBase)
def create_function(function: schemas.FunctionCreate, db: Session = Depends(get_db)):
    """
    新しい機能マスタを登録するAPI。

    :param function: 追加する機能情報
    :return: 登録後の機能マスタ
    """
    db_function = models.Function(
        name=function.name,
        description=function.description,
        selection_type=function.selection_type,
        choices=function.choices,  # ここは list[str] そのまま
    )
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
    db_function = db.query(models.Function).filter(models.Function.id == function_id).first()
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
    db_function = db.query(models.Function).filter(models.Function.id == function_id).first()
    if not db_function:
        raise HTTPException(status_code=404, detail="Function not found")
    
    db.delete(db_function)
    db.commit()
    return {"message": "Function deleted successfully"}
