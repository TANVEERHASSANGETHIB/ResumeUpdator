from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str
    user_id: str


class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
    user_id: str


class GenerateBothRequest(BaseModel):
    resume_text: str
    job_description: str
    user_id: str


class OptimizationResponse(BaseModel):
    id: str
    user_id: str
    original_resume: Optional[str] = None
    job_description: str
    optimized_resume: Optional[str] = None
    cover_letter: Optional[str] = None
    created_at: datetime


class HistoryResponse(BaseModel):
    success: bool
    history: list


class DeleteResponse(BaseModel):
    success: bool
    message: str