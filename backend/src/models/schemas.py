from pydantic import BaseModel
from typing import List, Optional

class QuestionRequest(BaseModel):
    previous_answer: str
    language: str
    current_question_number: int
    audio_data: Optional[bytes] = None

class QuestionResponse(BaseModel):
    success: bool
    questions: List[str] = []
    error: Optional[str] = None
    response_id: Optional[str] = None

class SurveyResponse(BaseModel):
    question_number: int
    language: str
    transcription: str
    question: str

class SurveyRequest(BaseModel):
    responses: List[SurveyResponse]
    questions: List[str]

class Survey(BaseModel):
    title: str
    description: str
    questions: list[dict]  # Each question is a dictionary with 'id' and 'text'

class SurveyUpdate(BaseModel):
    title: str
    description: str
    questions: list[dict]  # Each question is a dictionary with 'id' and 'text'