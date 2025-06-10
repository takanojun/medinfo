from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas

"""施設と機能の紐づけを管理するAPIルーター。"""

router = APIRouter(prefix="/facility-function-entries", tags=["facility_function_entries"])

def get_db():
    """DB セッションを取得し、処理後にクローズする共通関数。"""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[schemas.FacilityFunctionEntryBase])
def read_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    施設機能割り当ての一覧を取得するAPI。

    :param skip: 取得開始位置（デフォルト0）
    :param limit: 最大取得件数（デフォルト100）
    :return: 施設機能割り当て情報のリスト
    """
    entries = db.query(models.FacilityFunctionEntry).offset(skip).limit(limit).all()
    return entries

@router.post("", response_model=schemas.FacilityFunctionEntryBase)
def create_entry(entry: schemas.FacilityFunctionEntryCreate, db: Session = Depends(get_db)):
    """
    施設と機能の紐づけを新規に登録するAPI。

    :param entry: 作成する割り当て情報
    :return: 登録後の割り当て情報
    """
    db_entry = models.FacilityFunctionEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

# 更新API（PUT）
@router.put("/{entry_id}", response_model=schemas.FacilityFunctionEntryBase)
def update_entry(entry_id: int, update_data: schemas.FacilityFunctionEntryUpdate, db: Session = Depends(get_db)):
    """
    既存の施設機能割り当て情報を更新するAPI。

    :param entry_id: 更新対象ID
    :param update_data: 更新内容（部分更新可能）
    :return: 更新後の割り当て情報
    """
    db_entry = db.query(models.FacilityFunctionEntry).filter(models.FacilityFunctionEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="FacilityFunctionEntry not found")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(db_entry, key, value)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

# 削除API（DELETE）
@router.delete("/{entry_id}", response_model=dict)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    """
    施設機能割り当て情報を削除するAPI。

    :param entry_id: 削除対象ID
    :return: 削除結果メッセージ
    """
    db_entry = db.query(models.FacilityFunctionEntry).filter(models.FacilityFunctionEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="FacilityFunctionEntry not found")

    db.delete(db_entry)
    db.commit()
    return {"message": "FacilityFunctionEntry deleted successfully"}
