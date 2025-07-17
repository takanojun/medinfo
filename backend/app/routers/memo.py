from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from .. import database, schemas, models

router = APIRouter(prefix="/memos", tags=["memos"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/facility/{facility_id}", response_model=List[schemas.FacilityMemoBase])
def read_memos(
    facility_id: int, include_deleted: bool = False, db: Session = Depends(get_db)
):
    query = db.query(models.FacilityMemo).filter(
        models.FacilityMemo.facility_id == facility_id
    )
    if not include_deleted:
        query = query.filter(models.FacilityMemo.is_deleted == False)
    memos = query.order_by(models.FacilityMemo.sort_order.asc()).all()
    return memos


@router.get("/general", response_model=List[schemas.FacilityMemoBase])
def read_general_memos(include_deleted: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.FacilityMemo).filter(models.FacilityMemo.facility_id.is_(None))
    if not include_deleted:
        query = query.filter(models.FacilityMemo.is_deleted == False)
    memos = query.order_by(models.FacilityMemo.sort_order.asc()).all()
    return memos


@router.post("/facility/{facility_id}", response_model=schemas.FacilityMemoBase)
def create_memo(
    facility_id: int,
    memo: schemas.FacilityMemoCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    max_order = (
        db.query(models.FacilityMemo.sort_order)
        .filter(models.FacilityMemo.facility_id == facility_id)
        .order_by(models.FacilityMemo.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 1
    db_memo = models.FacilityMemo(
        facility_id=facility_id,
        title=memo.title,
        content=memo.content,
        sort_order=next_order,
    )
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    for tag_id in memo.tag_ids or []:
        db.add(models.FacilityMemoTagLink(memo_id=db_memo.id, tag_id=tag_id))
    db.commit()
    db.refresh(db_memo)

    # record initial version
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.FacilityMemoVersion(
            memo_id=db_memo.id,
            version_no=1,
            content=db_memo.content,
            ip_address=client_ip,
            action="create",
        )
    )
    db.commit()
    return db_memo


@router.post("/general", response_model=schemas.FacilityMemoBase)
def create_general_memo(
    memo: schemas.FacilityMemoCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    max_order = (
        db.query(models.FacilityMemo.sort_order)
        .filter(models.FacilityMemo.facility_id.is_(None))
        .order_by(models.FacilityMemo.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 1
    db_memo = models.FacilityMemo(
        facility_id=None,
        title=memo.title,
        content=memo.content,
        sort_order=next_order,
    )
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    for tag_id in memo.tag_ids or []:
        db.add(models.FacilityMemoTagLink(memo_id=db_memo.id, tag_id=tag_id))
    db.commit()
    db.refresh(db_memo)
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.FacilityMemoVersion(
            memo_id=db_memo.id,
            version_no=1,
            content=db_memo.content,
            ip_address=client_ip,
            action="create",
        )
    )
    db.commit()
    return db_memo


@router.get("/{memo_id}", response_model=schemas.FacilityMemoBase)
def get_memo(memo_id: int, db: Session = Depends(get_db)):
    db_memo = (
        db.query(models.FacilityMemo).filter(models.FacilityMemo.id == memo_id).first()
    )
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return db_memo


@router.put("/{memo_id}", response_model=schemas.FacilityMemoBase)
def update_memo(
    memo_id: int,
    update: schemas.FacilityMemoUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    db_memo = (
        db.query(models.FacilityMemo).filter(models.FacilityMemo.id == memo_id).first()
    )
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    if update.content is not None and update.content != db_memo.content:
        latest_version = (
            db.query(models.FacilityMemoVersion)
            .filter(models.FacilityMemoVersion.memo_id == memo_id)
            .order_by(models.FacilityMemoVersion.version_no.desc())
            .first()
        )
        next_no = latest_version.version_no + 1 if latest_version else 1
        client_ip = request.headers.get("X-Forwarded-For") or request.client.host
        version = models.FacilityMemoVersion(
            memo_id=memo_id,
            version_no=next_no,
            content=db_memo.content,
            ip_address=client_ip,
            action="edit",
        )
        db.add(version)
        db_memo.content = update.content
    if update.title is not None:
        db_memo.title = update.title
    if update.sort_order is not None:
        db_memo.sort_order = update.sort_order
    if update.facility_id is not None:
        db_memo.facility_id = update.facility_id
    if update.tag_ids is not None:
        db.query(models.FacilityMemoTagLink).filter(
            models.FacilityMemoTagLink.memo_id == memo_id
        ).delete()
        for tid in update.tag_ids:
            db.add(models.FacilityMemoTagLink(memo_id=memo_id, tag_id=tid))
    db.commit()
    db.refresh(db_memo)
    return db_memo


@router.delete("/{memo_id}", response_model=dict)
def delete_memo(memo_id: int, request: Request, db: Session = Depends(get_db)):
    db_memo = (
        db.query(models.FacilityMemo).filter(models.FacilityMemo.id == memo_id).first()
    )
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    db_memo.is_deleted = True
    latest_version = (
        db.query(models.FacilityMemoVersion)
        .filter(models.FacilityMemoVersion.memo_id == memo_id)
        .order_by(models.FacilityMemoVersion.version_no.desc())
        .first()
    )
    next_no = latest_version.version_no + 1 if latest_version else 1
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.FacilityMemoVersion(
            memo_id=memo_id,
            version_no=next_no,
            content=db_memo.content,
            ip_address=client_ip,
            action="delete",
        )
    )
    db.commit()
    return {"message": "deleted"}


@router.put("/{memo_id}/restore", response_model=schemas.FacilityMemoBase)
def restore_memo(memo_id: int, request: Request, db: Session = Depends(get_db)):
    db_memo = (
        db.query(models.FacilityMemo)
        .filter(
            models.FacilityMemo.id == memo_id, models.FacilityMemo.is_deleted == True
        )
        .first()
    )
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    db_memo.is_deleted = False
    latest_version = (
        db.query(models.FacilityMemoVersion)
        .filter(models.FacilityMemoVersion.memo_id == memo_id)
        .order_by(models.FacilityMemoVersion.version_no.desc())
        .first()
    )
    next_no = latest_version.version_no + 1 if latest_version else 1
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.FacilityMemoVersion(
            memo_id=memo_id,
            version_no=next_no,
            content=db_memo.content,
            ip_address=client_ip,
            action="restore",
        )
    )
    db.commit()
    db.refresh(db_memo)
    return db_memo


@router.get("/{memo_id}/versions", response_model=List[schemas.FacilityMemoVersionBase])
def get_versions(
    memo_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    ip_address: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.FacilityMemoVersion).filter(
        models.FacilityMemoVersion.memo_id == memo_id
    )
    if start_date:
        query = query.filter(models.FacilityMemoVersion.created_at >= start_date)
    if end_date:
        query = query.filter(models.FacilityMemoVersion.created_at <= end_date)
    if ip_address:
        query = query.filter(models.FacilityMemoVersion.ip_address == ip_address)
    versions = query.order_by(models.FacilityMemoVersion.version_no.desc()).all()
    return versions


@router.post(
    "/{memo_id}/versions/{version_no}/restore", response_model=schemas.FacilityMemoBase
)
def restore_version(
    memo_id: int, version_no: int, request: Request, db: Session = Depends(get_db)
):
    memo = (
        db.query(models.FacilityMemo).filter(models.FacilityMemo.id == memo_id).first()
    )
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    version = (
        db.query(models.FacilityMemoVersion)
        .filter(
            models.FacilityMemoVersion.memo_id == memo_id,
            models.FacilityMemoVersion.version_no == version_no,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    latest = (
        db.query(models.FacilityMemoVersion)
        .filter(models.FacilityMemoVersion.memo_id == memo_id)
        .order_by(models.FacilityMemoVersion.version_no.desc())
        .first()
    )
    next_no = latest.version_no + 1 if latest else 1
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.FacilityMemoVersion(
            memo_id=memo_id,
            version_no=next_no,
            content=memo.content,
            ip_address=client_ip,
            action="restore",
        )
    )
    memo.content = version.content
    db.commit()
    db.refresh(memo)
    return memo


LOCK_TIMEOUT = timedelta(minutes=5)


@router.get("/{memo_id}/lock", response_model=Optional[schemas.FacilityMemoLockBase])
def get_lock(memo_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.FacilityMemoLock)
        .filter(models.FacilityMemoLock.memo_id == memo_id)
        .first()
    )


@router.post("/{memo_id}/lock", response_model=schemas.FacilityMemoLockBase)
def lock_memo(memo_id: int, user: str, request: Request, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    client_ip = request.headers.get("X-Forwarded-For") or request.client.host
    lock = (
        db.query(models.FacilityMemoLock)
        .filter(models.FacilityMemoLock.memo_id == memo_id)
        .first()
    )
    if (
        lock
        and lock.locked_by != user
        and lock.locked_at
        and lock.locked_at > now - LOCK_TIMEOUT
    ):
        raise HTTPException(
            status_code=409, detail=f"locked by {lock.locked_by} ({lock.ip_address})"
        )
    if not lock:
        lock = models.FacilityMemoLock(
            memo_id=memo_id,
            locked_by=user,
            locked_at=now,
            ip_address=client_ip,
        )
        db.add(lock)
    else:
        lock.locked_by = user
        lock.locked_at = now
        lock.ip_address = client_ip
    db.commit()
    db.refresh(lock)
    return lock


@router.delete("/{memo_id}/lock", response_model=dict)
def unlock_memo(memo_id: int, user: str, db: Session = Depends(get_db)):
    lock = (
        db.query(models.FacilityMemoLock)
        .filter(models.FacilityMemoLock.memo_id == memo_id)
        .first()
    )
    if lock and lock.locked_by == user:
        db.delete(lock)
        db.commit()
    return {"message": "unlocked"}


@router.post("/reorder", response_model=dict)
def reorder_memos(update: schemas.MemoOrderUpdate, db: Session = Depends(get_db)):
    for item in update.orders:
        db.query(models.FacilityMemo).filter(models.FacilityMemo.id == item.id).update(
            {"sort_order": item.sort_order}
        )
    db.commit()
    return {"message": "ok"}
