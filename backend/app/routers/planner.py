import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.history import HistoryItem
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.ai import StudyPlanRequest, StudyPlanResponse, StudyPlanDay
from app.services import ai_service

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])


@router.post("/generate", response_model=StudyPlanResponse)
def generate_plan(
    payload: StudyPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = (
        db.query(Subject)
        .filter(Subject.id == payload.subject_id, Subject.owner_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    try:
        exam_date = datetime.strptime(payload.exam_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="exam_date must be in YYYY-MM-DD format.",
        )

    today = date.today()
    days_available = (exam_date - today).days + 1
    if days_available < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam date must be today or in the future.",
        )
    # Keep the schedule from becoming unreasonably long
    days_available = min(days_available, 60)

    notes = db.query(Note).filter(Note.subject_id == subject.id).all()
    if not notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one note to this subject before generating a study plan.",
        )

    topics_summary = "\n\n".join(f"[{n.title}]\n{n.extracted_text[:1500]}" for n in notes)

    result = ai_service.generate_study_plan(topics_summary, days_available, payload.study_hours_per_day)

    days: list[StudyPlanDay] = []
    for day_entry in result["days"]:
        offset = int(day_entry.get("day_offset", 0))
        actual_date = today + timedelta(days=offset)
        days.append(
            StudyPlanDay(
                date=actual_date.isoformat(),
                topics=day_entry.get("topics", []),
                hours=day_entry.get("hours", payload.study_hours_per_day),
            )
        )

    history_entry = HistoryItem(
        owner_id=current_user.id,
        note_id=None,
        subject_id=subject.id,
        type="study_plan",
        title=f"Study Plan: {subject.name}",
        content=json.dumps({"days": [d.model_dump() for d in days]}),
    )
    db.add(history_entry)
    db.commit()

    return StudyPlanResponse(subject_id=subject.id, days=days)
