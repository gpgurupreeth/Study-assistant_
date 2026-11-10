"""
Wraps all calls to the Groq LLM API. Every function here is responsible for:
  1. Building a well-scoped prompt (grounded strictly in the note text where required).
  2. Requesting structured JSON output from the model.
  3. Safely parsing that JSON and raising a clean HTTPException on failure.
"""
import json
import re

from fastapi import HTTPException, status
from groq import Groq

from app.core.config import settings

_client: Groq | None = None

# Roughly cap how much note text we send per request to stay within context limits.
MAX_NOTE_CHARS = 12000


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is not configured. Missing GROQ_API_KEY.",
            )
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _truncate(text: str, max_chars: int = MAX_NOTE_CHARS) -> str:
    return text if len(text) <= max_chars else text[:max_chars] + "\n...[truncated]"


def _extract_json(raw_text: str) -> dict:
    """Strips markdown code fences and parses the first JSON object/array found."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service returned an unexpected response format. Please try again.",
        )


def _chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.4) -> dict:
    client = get_client()
    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service request failed: {exc}",
        )

    raw = completion.choices[0].message.content or ""
    return _extract_json(raw)


# ---------------------------------------------------------------------------
# 1. Summary generation
# ---------------------------------------------------------------------------
def generate_summary(note_text: str) -> dict:
    system_prompt = (
        "You are an expert academic study assistant. You produce clear, exam-focused "
        "summaries of lecture notes. Respond ONLY with a single JSON object, no prose "
        "before or after it."
    )
    user_prompt = f"""
Analyze the following lecture notes and respond with a JSON object with EXACTLY these keys:
- "summary_text": a concise 3-6 sentence summary of the whole content.
- "key_points": an array of 5-10 short bullet-point strings covering the most important ideas.
- "definitions": an array of strings, each formatted as "Term: definition", for key terms found in the notes. Empty array if none.
- "formulas": an array of strings for any important formulas or equations found in the notes. Empty array if none.
- "exam_tips": an array of 3-6 short strings with practical tips for what to focus on for exams.

NOTES:
\"\"\"{_truncate(note_text)}\"\"\"
"""
    data = _chat_json(system_prompt, user_prompt)
    return {
        "summary_text": data.get("summary_text", ""),
        "key_points": data.get("key_points", []) or [],
        "definitions": data.get("definitions", []) or [],
        "formulas": data.get("formulas", []) or [],
        "exam_tips": data.get("exam_tips", []) or [],
    }


# ---------------------------------------------------------------------------
# 2. Ask AI - answers ONLY from the note content
# ---------------------------------------------------------------------------
NOT_COVERED_MESSAGE = "This topic is not covered in the uploaded notes."


def ask_question(note_text: str, question: str) -> dict:
    system_prompt = (
        "You are a strict study assistant. You must answer the student's question using "
        "ONLY the information contained in the provided notes. Do not use outside knowledge. "
        "If the answer cannot be found in the notes, you must say so exactly. "
        "Respond ONLY with a single JSON object, no prose before or after it."
    )
    user_prompt = f"""
NOTES:
\"\"\"{_truncate(note_text)}\"\"\"

STUDENT QUESTION: "{question}"

Respond with a JSON object with EXACTLY these keys:
- "grounded": true if the notes contain enough information to answer, false otherwise.
- "answer": if grounded is true, a clear, direct answer based only on the notes. If grounded is false, respond with exactly this string: "{NOT_COVERED_MESSAGE}"
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.2)
    grounded = bool(data.get("grounded", False))
    answer = data.get("answer") or NOT_COVERED_MESSAGE
    if not grounded:
        answer = NOT_COVERED_MESSAGE
    return {"answer": answer, "grounded": grounded}


# ---------------------------------------------------------------------------
# 3. Quiz generation
# ---------------------------------------------------------------------------
def generate_quiz(note_text: str, num_questions: int) -> dict:
    system_prompt = (
        "You are an expert exam question writer. You create multiple-choice questions "
        "strictly based on provided study notes. Respond ONLY with a single JSON object."
    )
    user_prompt = f"""
Based on the notes below, generate exactly {num_questions} multiple-choice questions.

Respond with a JSON object with EXACTLY this shape:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": "must be an exact copy of one of the 4 options",
      "explanation": "short explanation of why the answer is correct"
    }}
  ]
}}

Ensure "questions" has exactly {num_questions} items, each with exactly 4 options.

NOTES:
\"\"\"{_truncate(note_text)}\"\"\"
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.5)
    questions = data.get("questions", []) or []
    return {"questions": questions[:num_questions]}


# ---------------------------------------------------------------------------
# 4. Flashcards
# ---------------------------------------------------------------------------
def generate_flashcards(note_text: str, num_cards: int) -> dict:
    system_prompt = (
        "You are an expert study coach who creates concise flashcards for spaced-repetition "
        "learning, strictly based on provided notes. Respond ONLY with a single JSON object."
    )
    user_prompt = f"""
Based on the notes below, generate exactly {num_cards} flashcards.

Respond with a JSON object with EXACTLY this shape:
{{
  "cards": [
    {{ "question": "short question or term", "answer": "concise answer or definition" }}
  ]
}}

Ensure "cards" has exactly {num_cards} items.

NOTES:
\"\"\"{_truncate(note_text)}\"\"\"
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.5)
    cards = data.get("cards", []) or []
    return {"cards": cards[:num_cards]}


# ---------------------------------------------------------------------------
# 5. Explain Simply
# ---------------------------------------------------------------------------
def explain_simply(text: str) -> dict:
    system_prompt = (
        "You are a friendly teacher who explains complex ideas to a 12-year-old using "
        "simple words, short sentences, and relatable analogies. Respond ONLY with a "
        "single JSON object."
    )
    user_prompt = f"""
Rewrite the following text so a 12-year-old could easily understand it. Use simple
vocabulary and a helpful analogy if useful.

Respond with a JSON object with EXACTLY this key:
- "simple_explanation": the simplified explanation as a string.

TEXT:
\"\"\"{_truncate(text, 4000)}\"\"\"
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.6)
    return {"simple_explanation": data.get("simple_explanation", "")}


# ---------------------------------------------------------------------------
# 6. Study Planner
# ---------------------------------------------------------------------------
def generate_study_plan(topics_summary: str, days_available: int, hours_per_day: float) -> dict:
    system_prompt = (
        "You are an expert academic study planner. You create realistic, balanced daily "
        "revision schedules. Respond ONLY with a single JSON object."
    )
    user_prompt = f"""
A student has {days_available} day(s) until their exam and can study {hours_per_day} hour(s) per day.
Here is a summary of the topics they need to cover across their subject notes:
\"\"\"{_truncate(topics_summary, 6000)}\"\"\"

Create a day-by-day revision schedule. Distribute topics logically (foundational topics
first, revision/practice closer to the exam). Respond with a JSON object with EXACTLY
this shape:
{{
  "days": [
    {{ "day_offset": 0, "topics": ["string", "string"], "hours": {hours_per_day} }}
  ]
}}

"day_offset" is an integer starting at 0 (today) up to {days_available - 1}.
Include exactly {days_available} day entries.
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.4)
    return {"days": data.get("days", []) or []}


# ---------------------------------------------------------------------------
# 7. Mock Paper
# ---------------------------------------------------------------------------
def generate_mock_paper(note_text: str, num_short: int, num_long: int) -> dict:
    system_prompt = (
        "You are an experienced university exam paper setter. You write exam-style "
        "short and long questions strictly based on provided notes. Respond ONLY with "
        "a single JSON object."
    )
    user_prompt = f"""
Based on the notes below, write exactly {num_short} short-answer questions (2-4 marks
each) and exactly {num_long} long-answer questions (8-10 marks each, may include
sub-parts a/b).

Respond with a JSON object with EXACTLY this shape:
{{
  "short_questions": ["string", "..."],
  "long_questions": ["string", "..."]
}}

NOTES:
\"\"\"{_truncate(note_text)}\"\"\"
"""
    data = _chat_json(system_prompt, user_prompt, temperature=0.5)
    return {
        "short_questions": (data.get("short_questions", []) or [])[:num_short],
        "long_questions": (data.get("long_questions", []) or [])[:num_long],
    }
