from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    file_name: str
    file_type: str
    subject_id: int
    created_at: datetime


class NoteDetailOut(NoteOut):
    extracted_text: str


class NoteSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    summary_text: str
    key_points: list[str]
    definitions: list[str]
    formulas: list[str]
    exam_tips: list[str]
