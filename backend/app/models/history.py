from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class HistoryItem(Base):
    """
    Generic history log for AI generated content: quizzes, flashcards,
    summaries, chat Q&A, mock papers, and study plans.
    """
    __tablename__ = "history_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    # type: "summary" | "quiz" | "flashcards" | "question" | "mock_paper" | "study_plan" | "explain_simply"
    type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)  # JSON-encoded payload
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="history_items")
