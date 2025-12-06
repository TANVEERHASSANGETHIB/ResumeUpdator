import os
import httpx
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# List of models to try (cheap models first)
MODELS = [
    "google/gemini-2.0-flash-exp:free",  # Free
    "meta-llama/llama-3.2-3b-instruct:free",  # Free
    "openai/gpt-3.5-turbo",  # Paid but very cheap ($0.0005 per request)
    "google/gemini-flash-1.5",  # Paid but cheap
]

print(f"AI Service - OPENROUTER_API_KEY loaded: {bool(OPENROUTER_API_KEY)}")


async def call_openrouter(prompt: str, system_message: str = None) -> Optional[str]:
    """
    Call OpenRouter API with fallback mechanism
    """
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY not found in environment variables")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_URL", "http://localhost:3000"),
        "X-Title": "Job Application Assistant"
    }
    
    messages = []
    if system_message:
        messages.append({"role": "system", "content": system_message})
    messages.append({"role": "user", "content": prompt})
    
    # Try each model in sequence
    for model in MODELS:
        try:
            print(f"Trying model: {model}")
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 3000
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = data["choices"][0]["message"]["content"]
                    print(f"✓ Model {model} succeeded")
                    return result
                else:
                    print(f"✗ Model {model} failed with status {response.status_code}")
                    continue
        
        except Exception as e:
            print(f"✗ Error with model {model}: {str(e)}")
            continue
    
    # If all models fail
    raise Exception("All AI models failed. Please add credits to OpenRouter or check your API key.")


async def optimize_resume(resume_text: str, job_description: str) -> str:
    """
    Optimize resume based on job description using AI
    """
    system_message = """You are an expert resume optimizer specialized in ATS (Applicant Tracking Systems). 
Your task is to rewrite resumes to perfectly match job descriptions while maintaining truthfulness and the candidate's actual experience."""
    
    prompt = f"""
Please optimize the following resume to better match the job description. Follow these guidelines:

1. Keep all information truthful - do not add skills or experience the candidate doesn't have
2. Reorder and emphasize relevant skills and experiences that match the job requirements
3. Use keywords from the job description naturally throughout the resume
4. Make the resume ATS-friendly with clear sections and bullet points
5. Keep the same general structure but optimize content and wording
6. Ensure the resume is professional and well-formatted

JOB DESCRIPTION:
{job_description}

ORIGINAL RESUME:
{resume_text}

Please provide the optimized resume in a clean, professional format:
"""
    
    return await call_openrouter(prompt, system_message)


async def generate_cover_letter(resume_text: str, job_description: str) -> str:
    """
    Generate a professional cover letter based on resume and job description
    """
    system_message = """You are an expert career counselor specializing in writing compelling cover letters. 
Your cover letters are professional, personalized, and highlight the perfect match between candidates and positions."""
    
    prompt = f"""
Please write a professional cover letter for the following job application. Follow these guidelines:

1. Start with a strong opening that shows enthusiasm for the specific role
2. Highlight 2-3 key qualifications from the resume that match the job requirements
3. Explain why the candidate is interested in this specific company/role
4. Show personality while maintaining professionalism
5. End with a clear call to action
6. Keep it concise (3-4 paragraphs, under 400 words)
7. Use a professional business letter format

JOB DESCRIPTION:
{job_description}

CANDIDATE'S RESUME:
{resume_text}

Please provide a complete, professional cover letter:
"""
    
    return await call_openrouter(prompt, system_message)