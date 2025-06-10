from sqlalchemy import Column, Integer, String, Text, ForeignKey, ARRAY, CheckConstraint
from sqlalchemy.orm import relationship
from .database import Base

# 医療機関テーブル
class MedicalFacility(Base):
    __tablename__ = "medical_facility"

    id = Column(Integer, primary_key=True)
    short_name = Column(Text, nullable=False)
    official_name = Column(Text)
    prefecture = Column(Text)
    city = Column(Text)
    address_detail = Column(Text)
    phone_numbers = Column(ARRAY(Text))
    fax = Column(Text)

    # 関連する機能情報をリレーションで持たせる
    functions = relationship("FacilityFunctionEntry", back_populates="facility", cascade="all, delete-orphan")

# 機能マスタテーブル
class Function(Base):
    __tablename__ = "functions"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    selection_type = Column(Text, CheckConstraint("selection_type IN ('single', 'multiple')"))
    choices = Column(ARRAY(Text))

    # 機能エントリ（中間テーブル）側からの逆参照
    entries = relationship("FacilityFunctionEntry", back_populates="function", cascade="all, delete-orphan")

# 中間テーブル：施設と機能の紐づけ
class FacilityFunctionEntry(Base):
    __tablename__ = "facility_function_entries"

    id = Column(Integer, primary_key=True)
    facility_id = Column(Integer, ForeignKey("medical_facility.id"))
    function_id = Column(Integer, ForeignKey("functions.id"))
    selected_values = Column(ARRAY(Text))
    remarks = Column(Text)

    # リレーション：施設
    facility = relationship("MedicalFacility", back_populates="functions")
    # リレーション：機能
    function = relationship("Function", back_populates="entries")
