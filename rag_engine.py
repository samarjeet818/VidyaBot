import os
from typing import Optional

from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def build_vectorstore(filepath: str = "knowledge_base.txt") -> FAISS:
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("paste_"):
        raise RuntimeError("GEMINI_API_KEY is missing; skipping vectorstore initialization.")

    with open(filepath, "r", encoding="utf-8") as file:
        text = file.read()

    splitter = CharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separator="\n\n",
    )
    chunks = splitter.split_text(text)
    documents = [Document(page_content=chunk) for chunk in chunks if chunk.strip()]

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    return FAISS.from_documents(documents, embeddings)


def retrieve_context(vectorstore: Optional[FAISS], query: str, k: int = 3) -> str:
    if vectorstore is None:
        return ""

    results = vectorstore.similarity_search(query, k=k)
    return "\n\n".join(doc.page_content for doc in results)


try:
    vectorstore = build_vectorstore()
except Exception as error:
    print(error)
    vectorstore = None
