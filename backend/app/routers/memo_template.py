from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from .. import database, models, schemas

router = APIRouter(prefix="/memo-templates", tags=["memo-templates"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.MemoTemplateBase])
def list_templates(
    include_deleted: bool = False,
    search: Optional[str] = None,
    tag: Optional[List[int]] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.MemoTemplate)
    if not include_deleted:
        query = query.filter(models.MemoTemplate.is_deleted == False)
    if search:
        ilike = f"%{search}%"
        query = query.filter(
            models.MemoTemplate.title.ilike(ilike)
            | models.MemoTemplate.name.ilike(ilike)
            | models.MemoTemplate.content.ilike(ilike)
        )
    if tag:
        query = query.join(models.MemoTemplateTagLink).filter(
            models.MemoTemplateTagLink.tag_id.in_(tag)
        )
    return query.order_by(models.MemoTemplate.sort_order.asc()).all()


@router.post("", response_model=schemas.MemoTemplateBase)
def create_template(
    tpl: schemas.MemoTemplateCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    max_order = db.query(models.MemoTemplate.sort_order).order_by(models.MemoTemplate.sort_order.desc()).first()
    next_order = (max_order[0] + 1) if max_order else 1
    obj = models.MemoTemplate(
        name=tpl.name,
        title=tpl.title,
        content=tpl.content,
        sort_order=tpl.sort_order or next_order,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    for tag_id in tpl.tag_ids or []:
        db.add(models.MemoTemplateTagLink(template_id=obj.id, tag_id=tag_id))
    db.commit()
    db.refresh(obj)
    ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.MemoTemplateVersion(
            template_id=obj.id,
            version_no=1,
            content=obj.content,
            ip_address=ip,
            action="create",
        )
    )
    db.commit()
    return obj


@router.put("/{tpl_id}", response_model=schemas.MemoTemplateBase)
def update_template(
    tpl_id: int,
    update: schemas.MemoTemplateUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    obj = db.query(models.MemoTemplate).filter(models.MemoTemplate.id == tpl_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    if update.content is not None and update.content != obj.content:
        last = (
            db.query(models.MemoTemplateVersion)
            .filter(models.MemoTemplateVersion.template_id == tpl_id)
            .order_by(models.MemoTemplateVersion.version_no.desc())
            .first()
        )
        next_no = last.version_no + 1 if last else 1
        ip = request.headers.get("X-Forwarded-For") or request.client.host
        db.add(
            models.MemoTemplateVersion(
                template_id=tpl_id,
                version_no=next_no,
                content=obj.content,
                ip_address=ip,
                action="edit",
            )
        )
        obj.content = update.content
    if update.name is not None:
        obj.name = update.name
    if update.title is not None:
        obj.title = update.title
    if update.sort_order is not None:
        obj.sort_order = update.sort_order
    if update.tag_ids is not None:
        db.query(models.MemoTemplateTagLink).filter(
            models.MemoTemplateTagLink.template_id == tpl_id
        ).delete()
        for tid in update.tag_ids:
            db.add(models.MemoTemplateTagLink(template_id=tpl_id, tag_id=tid))
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{tpl_id}", response_model=dict)
def delete_template(tpl_id: int, request: Request, db: Session = Depends(get_db)):
    obj = db.query(models.MemoTemplate).filter(models.MemoTemplate.id == tpl_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    obj.is_deleted = True
    last = (
        db.query(models.MemoTemplateVersion)
        .filter(models.MemoTemplateVersion.template_id == tpl_id)
        .order_by(models.MemoTemplateVersion.version_no.desc())
        .first()
    )
    next_no = last.version_no + 1 if last else 1
    ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.MemoTemplateVersion(
            template_id=tpl_id,
            version_no=next_no,
            content=obj.content,
            ip_address=ip,
            action="delete",
        )
    )
    db.commit()
    return {"message": "deleted"}


@router.put("/{tpl_id}/restore", response_model=schemas.MemoTemplateBase)
def restore_template(tpl_id: int, request: Request, db: Session = Depends(get_db)):
    obj = (
        db.query(models.MemoTemplate)
        .filter(models.MemoTemplate.id == tpl_id, models.MemoTemplate.is_deleted == True)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    obj.is_deleted = False
    last = (
        db.query(models.MemoTemplateVersion)
        .filter(models.MemoTemplateVersion.template_id == tpl_id)
        .order_by(models.MemoTemplateVersion.version_no.desc())
        .first()
    )
    next_no = last.version_no + 1 if last else 1
    ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.MemoTemplateVersion(
            template_id=tpl_id,
            version_no=next_no,
            content=obj.content,
            ip_address=ip,
            action="restore",
        )
    )
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{tpl_id}/versions", response_model=List[schemas.MemoTemplateVersionBase])
def get_versions(
    tpl_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(models.MemoTemplateVersion)
        .filter(models.MemoTemplateVersion.template_id == tpl_id)
        .order_by(models.MemoTemplateVersion.version_no.desc())
        .all()
    )


@router.post("/{tpl_id}/versions/{version_no}/restore", response_model=schemas.MemoTemplateBase)
def restore_version(
    tpl_id: int,
    version_no: int,
    request: Request,
    db: Session = Depends(get_db),
):
    obj = db.query(models.MemoTemplate).filter(models.MemoTemplate.id == tpl_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    ver = (
        db.query(models.MemoTemplateVersion)
        .filter(
            models.MemoTemplateVersion.template_id == tpl_id,
            models.MemoTemplateVersion.version_no == version_no,
        )
        .first()
    )
    if not ver:
        raise HTTPException(status_code=404, detail="Version not found")
    last = (
        db.query(models.MemoTemplateVersion)
        .filter(models.MemoTemplateVersion.template_id == tpl_id)
        .order_by(models.MemoTemplateVersion.version_no.desc())
        .first()
    )
    next_no = last.version_no + 1 if last else 1
    ip = request.headers.get("X-Forwarded-For") or request.client.host
    db.add(
        models.MemoTemplateVersion(
            template_id=tpl_id,
            version_no=next_no,
            content=obj.content,
            ip_address=ip,
            action="restore",
        )
    )
    obj.content = ver.content
    db.commit()
    db.refresh(obj)
    return obj


LOCK_TIMEOUT = timedelta(minutes=5)


@router.get("/{tpl_id}/lock", response_model=Optional[schemas.MemoTemplateLockBase])
def get_lock(tpl_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.MemoTemplateLock)
        .filter(models.MemoTemplateLock.template_id == tpl_id)
        .first()
    )


@router.post("/{tpl_id}/lock", response_model=schemas.MemoTemplateLockBase)
def lock_template(tpl_id: int, user: str, request: Request, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    ip = request.headers.get("X-Forwarded-For") or request.client.host
    lock = (
        db.query(models.MemoTemplateLock)
        .filter(models.MemoTemplateLock.template_id == tpl_id)
        .first()
    )
    if lock and lock.locked_by != user and lock.locked_at and lock.locked_at > now - LOCK_TIMEOUT:
        raise HTTPException(status_code=409, detail=f"locked by {lock.locked_by} ({lock.ip_address})")
    if not lock:
        lock = models.MemoTemplateLock(
            template_id=tpl_id,
            locked_by=user,
            locked_at=now,
            ip_address=ip,
        )
        db.add(lock)
    else:
        lock.locked_by = user
        lock.locked_at = now
        lock.ip_address = ip
    db.commit()
    db.refresh(lock)
    return lock


@router.delete("/{tpl_id}/lock", response_model=dict)
def unlock_template(tpl_id: int, user: str, db: Session = Depends(get_db)):
    lock = (
        db.query(models.MemoTemplateLock)
        .filter(models.MemoTemplateLock.template_id == tpl_id)
        .first()
    )
    if lock and lock.locked_by == user:
        db.delete(lock)
        db.commit()
    return {"message": "unlocked"}


@router.post("/reorder", response_model=dict)
def reorder_templates(update: schemas.MemoTemplateOrderUpdate, db: Session = Depends(get_db)):
    for item in update.orders:
        db.query(models.MemoTemplate).filter(models.MemoTemplate.id == item.id).update({"sort_order": item.sort_order})
    db.commit()
    return {"message": "ok"}
