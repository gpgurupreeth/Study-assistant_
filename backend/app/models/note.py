from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, txt, docx
    extracted_text = Column(Text, nullable=False, default="")
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    subject = relationship("Subject", back_populates="notes")

    # AI generated summary cache (one-to-one, stored as JSON string for simplicity)
    summary = relationship("NoteSummary", back_populates="note", uselist=False, cascade="all, delete-orphan")


class NoteSummary(Base):
    __tablename__ = "note_summaries"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=True)
    key_points = Column(Text, nullable=True)      # JSON-encoded list
    definitions = Column(Text, nullable=True)     # JSON-encoded list
    formulas = Column(Text, nullable=True)        # JSON-encoded list
    exam_tips = Column(Text, nullable=True)       # JSON-encoded list
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    note = relationship("Note", back_populates="summary")
