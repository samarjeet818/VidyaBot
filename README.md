# VidyaBot 🎓
### AI-Powered Personalized Learning Companion

> *"Learn Smarter. Learn Your Way."*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://vidya-bot-iota.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-samarjeet818-181717?style=for-the-badge&logo=github)](https://github.com/samarjeet818/VidyaBot)
[![Hackathon](https://img.shields.io/badge/Bharat%20Academix-CodeQuest%202026-e94560?style=for-the-badge)](https://unstop.com)

---

##  About VidyaBot

VidyaBot is a full-stack AI-powered adaptive learning platform that solves a critical problem in Indian education — the **one-size-fits-all teaching model**.

It acts as a personal AI tutor that:
- 🧠 **Detects your emotional state** (Confident / Struggling / Confused) in real-time
- 📚 **Retrieves NCERT-aligned answers** using RAG (Retrieval-Augmented Generation)
- ⚡ **Adapts its explanation style** — simplifies when you struggle, goes deeper when you're confident
- 📊 **Tracks your learning journey** with Firebase Firestore session history

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Firebase Auth | Google, Email/Password, Phone OTP login |
| 🤖 Adaptive AI | LLaMA 3 via Groq API with dynamic system prompts |
| 🧠 Emotion Detection | HuggingFace NLP detects student emotional state |
| 📚 RAG Pipeline | LangChain + FAISS over NCERT curriculum content |
| 📊 Session History | Realtime Firestore CRUD with bookmark + delete |
| 🎯 Subject Mastery | Visual progress bars per subject |
| 💡 Smart Suggestions | Auto-suggests quiz/summary after every 3 questions |
| 🎨 Premium UI | Glassmorphism dark theme with Framer Motion animations |

---

## 🛠️ Tech Stack

### Frontend
- React.js + Vite
- Tailwind CSS
- Framer Motion
- Lucide React Icons
- Firebase SDK

### Backend
- Python FastAPI
- Uvicorn
- LangChain + FAISS
- HuggingFace Transformers
- Groq API (LLaMA 3 8B)
- Google Generative AI Embeddings

### Database & Auth
- Firebase Authentication
- Cloud Firestore (Realtime NoSQL)

---

## 📁 Project Structure

```
VidyaBot/
├── main.py              ← FastAPI backend
├── rag_engine.py        ← LangChain + FAISS RAG pipeline
├── emotion.py           ← HuggingFace emotion detection
├── knowledge_base.txt   ← NCERT curriculum Q&A content
├── requirements.txt     ← Python dependencies
└── frontend/
    ├── src/
    │   ├── App.jsx      ← Main dashboard
    │   ├── firebase.js  ← Firebase config
    │   └── pages/
    │       ├── Login.jsx    ← Auth page
    │       └── History.jsx  ← Session history
    └── package.json
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key (free at [console.groq.com](https://console.groq.com))
- Firebase Project with Auth + Firestore enabled

### Backend Setup
```bash
# Clone the repo
git clone https://github.com/samarjeet818/VidyaBot.git
cd VidyaBot

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo GROQ_API_KEY=your_groq_key > .env
echo GEMINI_API_KEY=your_gemini_key >> .env

# Start backend
python main.py
# Runs at http://localhost:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:3001
```

---

## 🌐 Live Demo

Frontend: [vidya-bot-iota.vercel.app](https://vidya-bot-iota.vercel.app)

> Note: Backend runs locally. Clone the repo and follow setup instructions to run the full application.

---

## 📊 Evaluation Criteria

| Criteria | Weight | How VidyaBot Addresses It |
|---|---|---|
| Technical Implementation | 25% | FastAPI + LangChain + FAISS + HuggingFace + Groq + Firebase |
| Innovation & Creativity | 25% | First Indian ed-tech MVP with RAG + emotion detection combined |
| Problem-Solving Approach | 20% | Addresses root cause: one-size-fits-all education |
| User Experience & Design | 15% | Premium glassmorphism UI with Framer Motion animations |
| Scalability & Impact | 15% | Targets 250M+ Indian students, cloud-ready Firebase backend |

---

## 🔮 Future Roadmap

- [ ] Hindi + Regional language support (5+ languages)
- [ ] Mobile app via React Native
- [ ] Teacher dashboard with class analytics
- [ ] Gamification (streaks, XP, badges)
- [ ] Azure cloud deployment
- [ ] JEE/NEET question bank integration
- [ ] Voice input/output support

---

## 👨‍💻 Developer

**Samarjeet Singh**
- B.Tech CSE — AI & ML Specialization
- Rungta International Skill University
- SGPA: 9.2 (Semester 1)
- 📧 010samarjeet@gmail.com

---

## 🏆 Hackathon

**Bharat Academix CodeQuest 2026**
- Theme: Artificial Intelligence & Machine Learning
- Round 2: Prototype Development Submission

---

*VidyaBot — Making quality education a right, not a privilege.*
