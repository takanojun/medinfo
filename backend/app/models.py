from sqlalchemy import Column, Integer, String, Text, ForeignKey, ARRAY, CheckConstraint, Boolean, JSON, TIMESTAMP
from sqlalchemy.orm import relationship
from .database import Base

# 機能カテゴリテーブル
class FunctionCategory(Base):
    __tablename__ = "function_categories"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    is_deleted = Column(Boolean, default=False)

    functions = relationship("Function", back_populates="category")

# 医療機関テーブル
class MedicalFacility(Base):
    __tablename__ = "medical_facility"

    id = Column(Integer, primary_key=True)
    short_name = Column(Text, nullable=False)
    official_name = Column(Text)
    prefecture = Column(Text)
    city = Column(Text)
    address_detail = Column(Text)
    phone_numbers = Column(JSON)
    emails = Column(JSON)
    fax = Column(Text)
    remarks = Column(Text)
    is_deleted = Column(Boolean, default=False)

    # 関連する機能情報をリレーションで持たせる
    functions = relationship("FacilityFunctionEntry", back_populates="facility", cascade="all, delete-orphan")

# 機能マスタテーブル
class Function(Base):
    __tablename__ = "functions"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    memo = Column(Text)
    selection_type = Column(Text, CheckConstraint("selection_type IN ('single', 'multiple')"))
    choices = Column(ARRAY(Text))
    category_id = Column(Integer, ForeignKey("function_categories.id"))
    is_deleted = Column(Boolean, default=False)

    category = relationship("FunctionCategory", back_populates="functions")
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

# メモタグマスタ
class MemoTag(Base):
    __tablename__ = "memo_tags"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    remark = Column(Text)
    is_deleted = Column(Boolean, default=False)

    memos = relationship(
        "FacilityMemo",
        secondary="facility_memo_tag_links",
        back_populates="tags",
    )


class FacilityMemo(Base):
    __tablename__ = "facility_memos"

    id = Column(Integer, primary_key=True)
    facility_id = Column(Integer, ForeignKey("medical_facility.id"))
    title = Column(Text, nullable=False)
    content = Column(Text)
    is_deleted = Column(Boolean, default=False)
    updated_at = Column(TIMESTAMP, server_default="now()")

    facility = relationship("MedicalFacility")
    versions = relationship(
        "FacilityMemoVersion",
        back_populates="memo",
        cascade="all, delete-orphan",
        order_by="FacilityMemoVersion.version_no",
    )
    tags = relationship(
        "MemoTag",
        secondary="facility_memo_tag_links",
        back_populates="memos",
    )
    lock = relationship(
        "FacilityMemoLock",
        uselist=False,
        back_populates="memo",
        cascade="all, delete-orphan",
    )


class FacilityMemoVersion(Base):
    __tablename__ = "facility_memo_versions"

    id = Column(Integer, primary_key=True)
    memo_id = Column(Integer, ForeignKey("facility_memos.id", ondelete="CASCADE"))
    version_no = Column(Integer, nullable=False)
    content = Column(Text)
    created_at = Column(TIMESTAMP, server_default="now()")

    memo = relationship("FacilityMemo", back_populates="versions")


class FacilityMemoTagLink(Base):
    __tablename__ = "facility_memo_tag_links"

    memo_id = Column(Integer, ForeignKey("facility_memos.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("memo_tags.id"), primary_key=True)


class FacilityMemoLock(Base):
    __tablename__ = "facility_memo_locks"

    memo_id = Column(Integer, ForeignKey("facility_memos.id", ondelete="CASCADE"), primary_key=True)
    locked_by = Column(Text)
    locked_at = Column(TIMESTAMP, server_default="now()")

    memo = relationship("FacilityMemo", back_populates="lock")
