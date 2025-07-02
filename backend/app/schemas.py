from pydantic import BaseModel
from typing import Optional, List


class ContactInfo(BaseModel):
    value: str
    comment: Optional[str] = None

class FunctionBase(BaseModel):
    """機能マスタの基本スキーマ (読み取り用)"""

    id: int
    name: str
    description: Optional[str]
    memo: Optional[str]
    selection_type: str
    choices: List[str]

    class Config:
        from_attributes = True

class FunctionCreate(BaseModel):
    """機能マスタ登録用のスキーマ
    POST 時は自動採番されるため id フィールドは含めない"""

    name: str
    description: Optional[str] = None
    memo: Optional[str] = None
    selection_type: str
    choices: List[str] = []


class FacilityFunctionEntryBase(BaseModel):
    id: int
    selected_values: Optional[List[str]]
    remarks: Optional[str]
    function: FunctionBase  # 機能マスタ情報

    class Config:
        from_attributes = True

class MedicalFacilityBase(BaseModel):
    short_name: str
    official_name: Optional[str]
    prefecture: Optional[str]
    city: Optional[str]
    address_detail: Optional[str]
    phone_numbers: Optional[List[ContactInfo]]
    emails: Optional[List[ContactInfo]]
    fax: Optional[str]
    remarks: Optional[str]

class MedicalFacility(MedicalFacilityBase):
    id: int
    functions: List[FacilityFunctionEntryBase] = []

    class Config:
        from_attributes = True

class MedicalFacilityUpdate(BaseModel):
    short_name: Optional[str] = None
    official_name: Optional[str] = None
    prefecture: Optional[str] = None
    city: Optional[str] = None
    address_detail: Optional[str] = None
    phone_numbers: Optional[List[ContactInfo]] = None
    emails: Optional[List[ContactInfo]] = None
    fax: Optional[str] = None
    remarks: Optional[str] = None

class FacilityFunctionEntryCreate(BaseModel):
    facility_id: int
    function_id: int
    selected_values: Optional[List[str]] = []
    remarks: Optional[str] = None

class FunctionUpdate(BaseModel):
    """
    機能マスタ更新用のスキーマ。
    すべてOptionalなので部分更新にも対応可能。
    """
    name: Optional[str] = None
    description: Optional[str] = None
    memo: Optional[str] = None
    selection_type: Optional[str] = None
    choices: Optional[List[str]] = None

class FacilityFunctionEntryUpdate(BaseModel):
    """
    施設機能割り当て情報の更新用スキーマ。
    すべてOptionalで部分更新に対応。
    """
    facility_id: Optional[int] = None
    function_id: Optional[int] = None
    selected_values: Optional[List[str]] = None
    remarks: Optional[str] = None

