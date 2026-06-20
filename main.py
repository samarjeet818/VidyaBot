import os
from dotenv import load_dotenv

load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

from emotion import detect_emotion
from rag_engine import retrieve_context, vectorstore

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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


@app.post("/ask")
def ask(request: AskRequest):
    question_text = request.question.strip()
    emotion = detect_emotion(question_text)
    context = retrieve_context(vectorstore, question_text) if question_text else ""
    context_text = context if context.strip() else "No relevant context found."

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
        answer = (
            "VidyaBot could not generate a response right now. "
            f"Please try again later. Details: {error}"
        )

    return {
        "answer": answer,
        "emotion": emotion,
        "subject": request.subject,
        "difficulty": request.difficulty,
    }


@app.get("/health")
def health():
    return {"status": "VidyaBot is running!"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
