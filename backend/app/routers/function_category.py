from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas

router = APIRouter(prefix="/function-categories", tags=["function_categories"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.FunctionCategoryBase])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.FunctionCategory).offset(skip).limit(limit).all()


@router.post("", response_model=schemas.FunctionCategoryBase)
def create_category(category: schemas.FunctionCategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.FunctionCategory(**category.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.put("/{category_id}", response_model=schemas.FunctionCategoryBase)
def update_category(category_id: int, update_data: schemas.FunctionCategoryUpdate, db: Session = Depends(get_db)):
    db_cat = db.query(models.FunctionCategory).filter(models.FunctionCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.delete("/{category_id}", response_model=dict)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(models.FunctionCategory).filter(models.FunctionCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_cat)
    db.commit()
    return {"message": "Category deleted"}
