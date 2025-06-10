from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, models

router = APIRouter(prefix="/facilities", tags=["facilities"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.MedicalFacility])
def read_facilities(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    facilities = db.query(models.MedicalFacility).offset(skip).limit(limit).all()
    return facilities


@router.post("", response_model=schemas.MedicalFacility)
def create_facility(
    facility: schemas.MedicalFacilityCreate, db: Session = Depends(get_db)
):
    db_facility = models.MedicalFacility(**facility.dict())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility


@router.put("/{facility_id}", response_model=schemas.MedicalFacility)
def update_facility(
    facility_id: int,
    update_data: schemas.MedicalFacilityUpdate,
    db: Session = Depends(get_db),
):
    db_facility = (
        db.query(models.MedicalFacility)
        .filter(models.MedicalFacility.id == facility_id)
        .first()
    )
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(db_facility, key, value)

    db.commit()
    db.refresh(db_facility)
    return db_facility


@router.delete("/{facility_id}", response_model=dict)
def delete_facility(facility_id: int, db: Session = Depends(get_db)):
    db_facility = (
        db.query(models.MedicalFacility)
        .filter(models.MedicalFacility.id == facility_id)
        .first()
    )
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    db.delete(db_facility)
    db.commit()
    return {"message": "Facility deleted successfully"}
