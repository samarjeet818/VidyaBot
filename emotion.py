from __future__ import annotations

from typing import Any, Optional

from transformers import pipeline

EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

_EMOTION_TO_STATE = {
    "joy": "Confident",
    "surprise": "Confident",
    "fear": "Struggling",
    "sadness": "Struggling",
    "disgust": "Struggling",
    "anger": "Confused",
}

try:
    emotion_pipeline = pipeline(
        "text-classification",
        model=EMOTION_MODEL,
        device=-1,
    )
except Exception:
    emotion_pipeline = None


def _extract_label(result: Any) -> Optional[str]:
    if isinstance(result, dict):
        return result.get("label")

    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, list) and first:
            first = first[0]
        if isinstance(first, dict):
            return first.get("label")

    return None


def detect_emotion(text: str) -> str:
    try:
        if not text or emotion_pipeline is None:
            return "Neutral"

        result = emotion_pipeline(text)
        label = _extract_label(result)
        if not label:
            return "Neutral"

        return _EMOTION_TO_STATE.get(label.lower(), "Neutral")
    except Exception:
        return "Neutral"
