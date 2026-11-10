import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.history import HistoryItem
from app.models.user import User
from app.schemas.history import HistoryItemDetailOut, HistoryItemOut

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=list[HistoryItemOut])
def list_history(
    type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(HistoryItem).filter(HistoryItem.owner_id == current_user.id)
    if type:
        query = query.filter(HistoryItem.type == type)
    return query.order_by(HistoryItem.created_at.desc()).limit(200).all()


@router.get("/{item_id}", response_model=HistoryItemDetailOut)
def get_history_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(HistoryItem)
        .filter(HistoryItem.id == item_id, HistoryItem.owner_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")

    return HistoryItemDetailOut(
        id=item.id,
        type=item.type,
        title=item.title,
        note_id=item.note_id,
        subject_id=item.subject_id,
        created_at=item.created_at,
        content=json.loads(item.content),
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(HistoryItem)
        .filter(HistoryItem.id == item_id, HistoryItem.owner_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")
    db.delete(item)
    db.commit()
    return None
