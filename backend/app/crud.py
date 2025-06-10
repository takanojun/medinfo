"""CRUDユーティリティモジュール。

SQLAlchemy セッションを使用して医療機関データを操作する関数を提供する。
"""

from sqlalchemy.orm import Session
from . import models, schemas


def get_facilities(db: Session, skip: int = 0, limit: int = 10):
    """
    医療機関の一覧を取得して返す。

    :param db: データベースセッション
    :param skip: 取得開始位置（デフォルト0）
    :param limit: 最大取得件数（デフォルト10）
    :return: 医療機関モデルのリスト
    """
    return db.query(models.MedicalFacility).offset(skip).limit(limit).all()


def create_facility(db: Session, facility: schemas.MedicalFacilityCreate):
    """
    医療機関データを新規作成し、DBへ保存する。

    :param db: データベースセッション
    :param facility: 登録する医療機関情報
    :return: 登録後の医療機関モデル
    """
    db_facility = models.MedicalFacility(**facility.dict())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility
