from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from sqlalchemy.orm import Session
from .. import database, models, schemas

router = APIRouter(prefix="/images", tags=["images"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.NoteImageBase)
async def upload_image(
    memo_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = await file.read()
    img = models.NoteImage(
        memo_id=memo_id,
        file_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        data=data,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return img


@router.get("/{image_id}")
def get_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(models.NoteImage).filter(models.NoteImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=img.data, media_type=img.mime_type)

