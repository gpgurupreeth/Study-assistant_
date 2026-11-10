from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HistoryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    note_id: int | None
    subject_id: int | None
    created_at: datetime


class HistoryItemDetailOut(HistoryItemOut):
    content: dict
