from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, models

"""医療機関関連のAPIルーター定義。"""

# /facilities で始まるAPIルート
router = APIRouter(prefix="/facilities", tags=["facilities"])

# DBセッションを取得する共通の依存関数
def get_db():
    """
    データベースセッションを取得し、
    呼び出し後に自動的にクローズするための共通関数。
    """
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 医療機関一覧を取得（GET /facilities）
@router.get("", response_model=List[schemas.MedicalFacility])
def read_facilities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    医療機関情報の一覧を取得するAPI。

    :param skip: 取得開始位置（デフォルト0）
    :param limit: 最大取得件数（デフォルト100）
    :return: 医療機関モデルのリスト
    """
    facilities = db.query(models.MedicalFacility).offset(skip).limit(limit).all()
    return facilities

# 医療機関を新規登録（POST /facilities）
@router.post("", response_model=schemas.MedicalFacility)
def create_facility(facility: schemas.MedicalFacilityBase, db: Session = Depends(get_db)):
    """
    新しい医療機関情報を登録するAPI。

    :param facility: 登録する医療機関データ
    :return: 登録後の医療機関モデル
    """
    db_facility = models.MedicalFacility(**facility.dict())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)  # 保存後の最新情報を返す
    return db_facility

# 医療機関を更新する（PUT /facilities/{facility_id}）
@router.put("/{facility_id}", response_model=schemas.MedicalFacility)
def update_facility(facility_id: int, update_data: schemas.MedicalFacilityUpdate, db: Session = Depends(get_db)):
    """
    既存の医療機関情報を更新するAPI。

    :param facility_id: 更新対象のID
    :param update_data: 更新内容（部分更新可能）
    :return: 更新後の医療機関モデル
    """
    # 更新対象を取得
    db_facility = db.query(models.MedicalFacility).filter(models.MedicalFacility.id == facility_id).first()
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # 送られてきた項目だけ更新する
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(db_facility, key, value)

    db.commit()
    db.refresh(db_facility)
    return db_facility

# 医療機関を削除する（DELETE /facilities/{facility_id}）
@router.delete("/{facility_id}", response_model=dict)
def delete_facility(facility_id: int, db: Session = Depends(get_db)):
    """
    医療機関情報を削除するAPI。

    :param facility_id: 削除対象のID
    :return: 削除結果メッセージ
    """
    db_facility = db.query(models.MedicalFacility).filter(models.MedicalFacility.id == facility_id).first()
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    db.delete(db_facility)
    db.commit()
    return {"message": "Facility deleted successfully"}
