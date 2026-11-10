from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


def _to_subject_out(subject: Subject, db: Session) -> SubjectOut:
    note_count = db.query(Note).filter(Note.subject_id == subject.id).count()
    data = SubjectOut.model_validate(subject)
    data.note_count = note_count
    return data


@router.get("", response_model=list[SubjectOut])
def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subjects = (
        db.query(Subject)
        .filter(Subject.owner_id == current_user.id)
        .order_by(Subject.created_at.desc())
        .all()
    )
    return [_to_subject_out(s, db) for s in subjects]


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = Subject(
        name=payload.name,
        description=payload.description,
        color=payload.color,
        owner_id=current_user.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return _to_subject_out(subject, db)


def _get_owned_subject(subject_id: int, current_user: User, db: Session) -> Subject:
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.owner_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return subject


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = _get_owned_subject(subject_id, current_user, db)
    return _to_subject_out(subject, db)


@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = _get_owned_subject(subject_id, current_user, db)

    if payload.name is not None:
        subject.name = payload.name
    if payload.description is not None:
        subject.description = payload.description
    if payload.color is not None:
        subject.color = payload.color

    db.commit()
    db.refresh(subject)
    return _to_subject_out(subject, db)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = _get_owned_subject(subject_id, current_user, db)
    db.delete(subject)
    db.commit()
    return None
