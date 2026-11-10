import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.history import HistoryItem
from app.models.note import Note, NoteSummary
from app.models.user import User
from app.schemas.ai import (
    AskAIRequest,
    AskAIResponse,
    ExplainSimplyRequest,
    ExplainSimplyResponse,
    FlashcardRequest,
    FlashcardResponse,
    MockPaperRequest,
    MockPaperResponse,
    QuizRequest,
    QuizResponse,
)
from app.schemas.note import NoteSummaryOut
from app.services import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Features"])


def _get_owned_note(note_id: int, current_user: User, db: Session) -> Note:
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note


def _log_history(db: Session, owner_id: int, note_id: int | None, subject_id: int | None,
                  item_type: str, title: str, content: dict):
    entry = HistoryItem(
        owner_id=owner_id,
        note_id=note_id,
        subject_id=subject_id,
        type=item_type,
        title=title,
        content=json.dumps(content),
    )
    db.add(entry)
    db.commit()


@router.post("/summary/{note_id}", response_model=NoteSummaryOut)
def generate_or_get_summary(
    note_id: int,
    force_regenerate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(note_id, current_user, db)

    existing = db.query(NoteSummary).filter(NoteSummary.note_id == note_id).first()
    if existing and not force_regenerate:
        return NoteSummaryOut(
            summary_text=existing.summary_text or "",
            key_points=json.loads(existing.key_points or "[]"),
            definitions=json.loads(existing.definitions or "[]"),
            formulas=json.loads(existing.formulas or "[]"),
            exam_tips=json.loads(existing.exam_tips or "[]"),
        )

    result = ai_service.generate_summary(note.extracted_text)

    if existing:
        existing.summary_text = result["summary_text"]
        existing.key_points = json.dumps(result["key_points"])
        existing.definitions = json.dumps(result["definitions"])
        existing.formulas = json.dumps(result["formulas"])
        existing.exam_tips = json.dumps(result["exam_tips"])
    else:
        existing = NoteSummary(
            note_id=note_id,
            summary_text=result["summary_text"],
            key_points=json.dumps(result["key_points"]),
            definitions=json.dumps(result["definitions"]),
            formulas=json.dumps(result["formulas"]),
            exam_tips=json.dumps(result["exam_tips"]),
        )
        db.add(existing)

    db.commit()

    _log_history(db, current_user.id, note_id, note.subject_id, "summary", f"Summary: {note.title}", result)

    return NoteSummaryOut(**result)


@router.post("/ask", response_model=AskAIResponse)
def ask_ai(
    payload: AskAIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(payload.note_id, current_user, db)
    result = ai_service.ask_question(note.extracted_text, payload.question)

    _log_history(
        db, current_user.id, note.id, note.subject_id, "question",
        payload.question[:100],
        {"question": payload.question, **result},
    )

    return AskAIResponse(**result)


@router.post("/quiz", response_model=QuizResponse)
def generate_quiz(
    payload: QuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(payload.note_id, current_user, db)
    result = ai_service.generate_quiz(note.extracted_text, payload.num_questions)

    _log_history(
        db, current_user.id, note.id, note.subject_id, "quiz",
        f"Quiz: {note.title} ({payload.num_questions}Q)", result,
    )

    return QuizResponse(note_id=note.id, questions=result["questions"])


@router.post("/flashcards", response_model=FlashcardResponse)
def generate_flashcards(
    payload: FlashcardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(payload.note_id, current_user, db)
    result = ai_service.generate_flashcards(note.extracted_text, payload.num_cards)

    _log_history(
        db, current_user.id, note.id, note.subject_id, "flashcards",
        f"Flashcards: {note.title} ({payload.num_cards})", result,
    )

    return FlashcardResponse(note_id=note.id, cards=result["cards"])


@router.post("/explain-simply", response_model=ExplainSimplyResponse)
def explain_simply(
    payload: ExplainSimplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = ai_service.explain_simply(payload.text)

    _log_history(
        db, current_user.id, None, None, "explain_simply",
        "Explain Simply", {"original_text": payload.text, **result},
    )

    return ExplainSimplyResponse(original_text=payload.text, simple_explanation=result["simple_explanation"])


@router.post("/mock-paper", response_model=MockPaperResponse)
def generate_mock_paper(
    payload: MockPaperRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(payload.note_id, current_user, db)
    result = ai_service.generate_mock_paper(
        note.extracted_text, payload.num_short_questions, payload.num_long_questions
    )

    _log_history(
        db, current_user.id, note.id, note.subject_id, "mock_paper",
        f"Mock Paper: {note.title}", result,
    )

    return MockPaperResponse(note_id=note.id, **result)
