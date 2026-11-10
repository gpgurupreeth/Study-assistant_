from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    color: str = Field(default="#2563EB", max_length=20)


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    color: str | None = Field(default=None, max_length=20)


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    color: str
    created_at: datetime
    note_count: int = 0
