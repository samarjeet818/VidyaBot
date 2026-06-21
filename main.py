import os
import sys
from dotenv import load_dotenv
load_dotenv()

print("=== VidyaBot Starting ===")
print(f"PORT: {os.environ.get('PORT', 'NOT SET')}")
print(f"GROQ: {'SET' if os.environ.get('GROQ_API_KEY') else 'MISSING'}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

try:
    from emotion import detect_emotion
    print("Emotion OK")
except Exception as e:
    print(f"Emotion failed: {e}")
    def detect_emotion(text):
        return "Neutral"

try:
    from rag_engine import retrieve_context, vectorstore
    print("RAG OK")
except Exception as e:
    print(f"RAG failed: {e}")
    vectorstore = None
    def retrieve_context(vs, query, k=3):
        return ""

try:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    print("Groq OK")
except Exception as e:
    print(f"Groq failed: {e}")
    client = None

app = FastAPI(title="VidyaBot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    question: str
    subject: str = "General"
    difficulty: str = "Medium"
    student_name: str = "Student"

@app.get("/")
def root():
    return {"message": "VidyaBot API is live!"}

@app.get("/health")
def health():
    return {"status": "VidyaBot is running!"}

@app.post("/ask")
def ask(request: AskRequest):
    question_text = request.question.strip()
    emotion = detect_emotion(question_text)
    context = retrieve_context(vectorstore, question_text) if question_text else ""
    context_text = context if context and context.strip() else "No relevant context found."

    system_prompt = (
        "You are VidyaBot, an adaptive AI tutor for Indian students.\n"
        f"Student: {request.student_name}, Subject: {request.subject},\n"
        f"Difficulty: {request.difficulty}, Emotional State: {emotion}.\n"
        "If student is Struggling, simplify your explanation.\n"
        "If Confident, go deeper. Always use examples.\n"
        f"Relevant context: {context_text}"
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question_text},
            ],
        )
        answer = response.choices[0].message.content
    except Exception as error:
        answer = f"VidyaBot could not generate a response. Details: {error}"

    return {
        "answer": answer,
        "emotion": emotion,
        "subject": request.subject,
        "difficulty": request.difficulty,
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"=== Starting on port {port} ===")
    uvicorn.run(app, host="0.0.0.0", port=port)
