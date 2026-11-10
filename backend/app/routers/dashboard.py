from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.history import HistoryItem
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.note import NoteOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_subjects = db.query(Subject).filter(Subject.owner_id == current_user.id).count()
    total_notes = db.query(Note).filter(Note.owner_id == current_user.id).count()
    total_quizzes = (
        db.query(HistoryItem)
        .filter(HistoryItem.owner_id == current_user.id, HistoryItem.type == "quiz")
        .count()
    )
    total_flashcards = (
        db.query(HistoryItem)
        .filter(HistoryItem.owner_id == current_user.id, HistoryItem.type == "flashcards")
        .count()
    )

    recent_uploads = (
        db.query(Note)
        .filter(Note.owner_id == current_user.id)
        .order_by(Note.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_subjects": total_subjects,
        "total_notes": total_notes,
        "total_quizzes_generated": total_quizzes,
        "total_flashcard_sets": total_flashcards,
        "recent_uploads": [NoteOut.model_validate(n) for n in recent_uploads],
    }
