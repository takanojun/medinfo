from sqlalchemy.orm import Session
from . import models, schemas

def get_facilities(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.MedicalFacility).offset(skip).limit(limit).all()

def create_facility(db: Session, facility: schemas.MedicalFacilityCreate):
    db_facility = models.MedicalFacility(**facility.dict())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility
