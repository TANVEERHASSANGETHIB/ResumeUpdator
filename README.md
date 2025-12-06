# Job Application Assistant - Quick Start Guide 🚀

AI-powered resume optimizer and cover letter generator.

---

## ⚡ Quick Run (For Developers)

### Prerequisites
- Node.js (v18+)
- Python (3.11+)

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
OPENROUTER_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_SERVICE_KEY=your_key_here
APP_URL=http://localhost:3000
```

**Frontend** - Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
VITE_API_BASE_URL=http://localhost:8000
```

### Step 3: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Open the App

Go to: **http://localhost:3000**

---

## 🎯 Usage

1. **Sign Up/Login** with email and password
2. **Paste your resume** in the left text box
3. **Paste job description** in the right text box
4. Click **"Generate Resume & Cover Letter"**
5. Wait 30-60 seconds
6. **Download** your optimized documents

---

## 🐛 Common Issues

**Backend won't start:**
```bash
# Make sure virtual environment is activated
cd backend
venv\Scripts\activate  # Windows
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend shows 404:**
- Make sure `index.html` is in `frontend/` root folder (not in `public/`)

**Database errors:**
- Ensure you created the database table in Supabase (see setup docs)

**AI generation fails:**
- Check OPENROUTER_API_KEY is valid
- Verify you have credits/free tier access

---

## 📁 Project Structure

```
job-application-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py           # API endpoints
│   │   ├── ai_service.py     # AI integration
│   │   └── database.py       # Database connection
│   ├── .env                  # Config (create this)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   └── services/         # API & Auth
│   ├── .env                  # Config (create this)
│   └── package.json
│
└── README.md
```

---

## 🔧 Tech Stack

**Frontend:** React + Tailwind CSS + Vite  
**Backend:** FastAPI + Python  
**Database:** Supabase  
**AI:** OpenRouter (Llama 3.2)

---

## 📧 Need Help?

Check terminal logs for error messages:
- Backend errors appear in Terminal 1
- Frontend errors appear in Terminal 2 and browser console

---

**That's it! Happy coding! 🎉**