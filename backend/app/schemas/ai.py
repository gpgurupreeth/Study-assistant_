from pydantic import BaseModel, Field


class AskAIRequest(BaseModel):
    note_id: int
    question: str = Field(min_length=1, max_length=1000)


class AskAIResponse(BaseModel):
    answer: str
    grounded: bool  # False if the model could not find the answer in the notes


class QuizRequest(BaseModel):
    note_id: int
    num_questions: int = Field(default=5, ge=5, le=15)


class QuizQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    note_id: int
    questions: list[QuizQuestion]


class FlashcardRequest(BaseModel):
    note_id: int
    num_cards: int = Field(default=10, ge=5, le=30)


class Flashcard(BaseModel):
    question: str
    answer: str


class FlashcardResponse(BaseModel):
    note_id: int
    cards: list[Flashcard]


class ExplainSimplyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ExplainSimplyResponse(BaseModel):
    original_text: str
    simple_explanation: str


class StudyPlanRequest(BaseModel):
    subject_id: int
    exam_date: str  # ISO date string, e.g. "2026-08-15"
    study_hours_per_day: float = Field(gt=0, le=16)


class StudyPlanDay(BaseModel):
    date: str
    topics: list[str]
    hours: float


class StudyPlanResponse(BaseModel):
    subject_id: int
    days: list[StudyPlanDay]


class MockPaperRequest(BaseModel):
    note_id: int
    num_short_questions: int = Field(default=5, ge=1, le=15)
    num_long_questions: int = Field(default=3, ge=1, le=10)


class MockPaperResponse(BaseModel):
    note_id: int
    short_questions: list[str]
    long_questions: list[str]
