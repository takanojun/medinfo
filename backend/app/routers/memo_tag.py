from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas, models

router = APIRouter(prefix="/memo-tags", tags=["memo-tags"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.MemoTagBase])
def read_tags(include_deleted: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.MemoTag)
    if not include_deleted:
        query = query.filter(models.MemoTag.is_deleted == False)
    return query.order_by(models.MemoTag.name, models.MemoTag.id).all()


@router.post("", response_model=schemas.MemoTagBase)
def create_tag(tag: schemas.MemoTagCreate, db: Session = Depends(get_db)):
    db_tag = models.MemoTag(**tag.dict())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.put("/{tag_id}", response_model=schemas.MemoTagBase)
def update_tag(tag_id: int, tag: schemas.MemoTagCreate, db: Session = Depends(get_db)):
    db_tag = db.query(models.MemoTag).filter(models.MemoTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    for key, value in tag.dict(exclude_unset=True).items():
        setattr(db_tag, key, value)
    db.commit()
    db.refresh(db_tag)
    return db_tag




@router.delete("/{tag_id}", response_model=dict)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = db.query(models.MemoTag).filter(models.MemoTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db_tag.is_deleted = True
    db.commit()
    return {"message": "deleted"}


@router.put("/{tag_id}/restore", response_model=schemas.MemoTagBase)
def restore_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = db.query(models.MemoTag).filter(models.MemoTag.id == tag_id, models.MemoTag.is_deleted == True).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db_tag.is_deleted = False
    db.commit()
    db.refresh(db_tag)
    return db_tag
