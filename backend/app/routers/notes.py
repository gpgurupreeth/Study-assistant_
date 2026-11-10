from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.note import NoteDetailOut, NoteOut
from app.services.file_extraction import extract_text

router = APIRouter(prefix="/api/notes", tags=["Notes"])


def _get_owned_note(note_id: int, current_user: User, db: Session) -> Note:
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note


@router.post("/upload", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def upload_note(
    subject_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.owner_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    file_bytes = await file.read()

    if len(file_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    extracted_text, file_ext = extract_text(file.filename, file_bytes)

    note = Note(
        title=title,
        file_name=file.filename,
        file_type=file_ext,
        extracted_text=extracted_text,
        subject_id=subject_id,
        owner_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[NoteOut])
def list_notes(
    subject_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.owner_id == current_user.id)
    if subject_id is not None:
        query = query.filter(Note.subject_id == subject_id)
    return query.order_by(Note.created_at.desc()).all()


@router.get("/search", response_model=list[NoteOut])
def search_notes(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    like_pattern = f"%{q}%"
    return (
        db.query(Note)
        .filter(
            Note.owner_id == current_user.id,
            (Note.title.ilike(like_pattern) | Note.extracted_text.ilike(like_pattern)),
        )
        .order_by(Note.created_at.desc())
        .all()
    )


@router.get("/{note_id}", response_model=NoteDetailOut)
def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_note(note_id, current_user, db)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(note_id, current_user, db)
    db.delete(note)
    db.commit()
    return None
