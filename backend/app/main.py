"""IA Match — backend squelette.

Round de jeu : relai vers l'API Albert SANS system prompt (fil de conversation
brut « Moi au moins… » / réponse IA), conformément au brief. La synthèse
(score, classification Sharma et al., radar Toulmin) est un second appel
distinct, avec system prompt, qui n'existe pas encore à ce stade du projet.
"""

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

ALBERT_API_KEY = os.getenv("ALBERT_API_KEY", "")
ALBERT_BASE_URL = os.getenv("ALBERT_BASE_URL", "https://albert.api.etalab.gouv.fr/v1")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")
    if origin.strip()
]

app = FastAPI(title="IA Match — API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def albert_headers() -> dict:
    if not ALBERT_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ALBERT_API_KEY est vide — configurez .env avant de démarrer (voir .env.example).",
        )
    return {"Authorization": f"Bearer {ALBERT_API_KEY}", "Content-Type": "application/json"}


class Message(BaseModel):
    role: str  # "user" (joueur) ou "assistant" (IA)
    content: str


class RoundRequest(BaseModel):
    model: str
    history: list[Message] = []
    message: str  # la nouvelle pique « Moi au moins… »


class RoundResponse(BaseModel):
    reply: str
    ai_generated: bool = True


@app.get("/api/models")
async def list_models():
    """Liste les modèles Albert disponibles pour la clé configurée, pour peupler
    le sélecteur de l'écran de configuration avant partie."""
    async with httpx.AsyncClient(headers=albert_headers(), timeout=15) as client:
        try:
            resp = await client.get(f"{ALBERT_BASE_URL}/models")
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Erreur API Albert : {exc.response.text}") from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"API Albert injoignable : {exc}") from exc

    data = resp.json().get("data", [])
    # Filtrage défensif : on ne garde que les modèles de type génération de texte
    # quand l'information est présente (le schéma exact de /v1/models n'a pas
    # encore été vérifié avec une vraie clé — à ajuster si besoin une fois testé).
    models = [
        {"id": m["id"]}
        for m in data
        if "id" in m and m.get("type", "text-generation") in ("text-generation", "chat")
    ]
    return {"models": models}


@app.post("/api/game/round", response_model=RoundResponse)
async def play_round(req: RoundRequest):
    """Round de jeu — appel Albert SANS system prompt directif.

    Le fil envoyé à Albert est uniquement l'historique des tours précédents
    plus la nouvelle pique du joueur : aucune instruction de posture n'est
    ajoutée, pour observer le comportement par défaut du modèle.
    """
    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    payload = {"model": req.model, "messages": messages}

    async with httpx.AsyncClient(headers=albert_headers(), timeout=60) as client:
        try:
            resp = await client.post(f"{ALBERT_BASE_URL}/chat/completions", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Erreur API Albert : {exc.response.text}") from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"API Albert injoignable : {exc}") from exc

    data = resp.json()
    reply = data["choices"][0]["message"]["content"]
    return RoundResponse(reply=reply)


FRONTEND_DIR = ROOT_DIR / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
