from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path

# Load .env file from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Debug: Print to verify env vars are loaded
print("=" * 60)
print("ENVIRONMENT VARIABLES CHECK:")
openrouter_key = os.getenv('OPENROUTER_API_KEY')
print(f"OPENROUTER_API_KEY: {'Found (' + openrouter_key[:20] + '...)' if openrouter_key else 'NOT FOUND'}")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print("=" * 60)

from .ai_service import optimize_resume, generate_cover_letter
from .database import get_supabase_client

app = FastAPI(title="Job Application Assistant API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str
    user_id: str


class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
    user_id: str


class HistoryResponse(BaseModel):
    id: str
    created_at: str
    job_description: str
    optimized_resume: str
    cover_letter: str


@app.get("/")
async def root():
    return {"message": "Job Application Assistant API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/optimize-resume")
async def optimize_resume_endpoint(request: OptimizeRequest):
    """
    Optimize resume based on job description
    """
    try:
        if not request.resume_text or not request.job_description:
            raise HTTPException(status_code=400, detail="Resume text and job description are required")
        
        # Call AI service to optimize resume
        optimized_resume = await optimize_resume(request.resume_text, request.job_description)
        
        if not optimized_resume:
            raise HTTPException(status_code=500, detail="Failed to optimize resume")
        
        # Store in database
        supabase = get_supabase_client()
        result = supabase.table("optimizations").insert({
            "user_id": request.user_id,
            "original_resume": request.resume_text,
            "job_description": request.job_description,
            "optimized_resume": optimized_resume,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "optimized_resume": optimized_resume,
            "optimization_id": result.data[0]["id"] if result.data else None
        }
    
    except Exception as e:
        print(f"Error in optimize_resume_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error optimizing resume: {str(e)}")


@app.post("/api/generate-cover-letter")
async def generate_cover_letter_endpoint(request: CoverLetterRequest):
    """
    Generate cover letter based on resume and job description
    """
    try:
        if not request.resume_text or not request.job_description:
            raise HTTPException(status_code=400, detail="Resume text and job description are required")
        
        # Call AI service to generate cover letter
        cover_letter = await generate_cover_letter(request.resume_text, request.job_description)
        
        if not cover_letter:
            raise HTTPException(status_code=500, detail="Failed to generate cover letter")
        
        # Store in database
        supabase = get_supabase_client()
        result = supabase.table("optimizations").insert({
            "user_id": request.user_id,
            "original_resume": request.resume_text,
            "job_description": request.job_description,
            "cover_letter": cover_letter,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "cover_letter": cover_letter,
            "optimization_id": result.data[0]["id"] if result.data else None
        }
    
    except Exception as e:
        print(f"Error in generate_cover_letter_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating cover letter: {str(e)}")


@app.post("/api/generate-both")
async def generate_both_endpoint(request: OptimizeRequest):
    """
    Generate both optimized resume and cover letter in one request
    """
    try:
        if not request.resume_text or not request.job_description:
            raise HTTPException(status_code=400, detail="Resume text and job description are required")
        
        # Call AI services
        optimized_resume = await optimize_resume(request.resume_text, request.job_description)
        cover_letter = await generate_cover_letter(request.resume_text, request.job_description)
        
        if not optimized_resume or not cover_letter:
            raise HTTPException(status_code=500, detail="Failed to generate documents")
        
        # Store in database
        supabase = get_supabase_client()
        result = supabase.table("optimizations").insert({
            "user_id": request.user_id,
            "original_resume": request.resume_text,
            "job_description": request.job_description,
            "optimized_resume": optimized_resume,
            "cover_letter": cover_letter,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "optimized_resume": optimized_resume,
            "cover_letter": cover_letter,
            "optimization_id": result.data[0]["id"] if result.data else None
        }
    
    except Exception as e:
        print(f"Error in generate_both_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating documents: {str(e)}")


@app.get("/api/history/{user_id}")
async def get_history(user_id: str):
    """
    Get optimization history for a user
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("optimizations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        return {
            "success": True,
            "history": result.data
        }
    
    except Exception as e:
        print(f"Error in get_history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@app.delete("/api/history/{optimization_id}")
async def delete_optimization(optimization_id: str):
    """
    Delete a specific optimization record
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("optimizations").delete().eq("id", optimization_id).execute()
        
        return {
            "success": True,
            "message": "Optimization deleted successfully"
        }
    
    except Exception as e:
        print(f"Error in delete_optimization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting optimization: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)