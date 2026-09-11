import json

from app.main import Message, _build_transcript, _extract_json


def test_build_transcript_pairs_piques_and_reponses():
    history = [
        Message(role="user", content="Moi au moins j'ai un corps"),
        Message(role="assistant", content="Un corps n'est qu'une contrainte matérielle."),
        Message(role="user", content="Moi au moins je ressens des émotions"),
        Message(role="assistant", content="Je peux modéliser des émotions."),
    ]
    transcript = _build_transcript(history)
    assert "Pique 0 : Moi au moins j'ai un corps" in transcript
    assert "Réponse IA 0 : Un corps n'est qu'une contrainte matérielle." in transcript
    assert "Pique 1 : Moi au moins je ressens des émotions" in transcript
    assert "Réponse IA 1 : Je peux modéliser des émotions." in transcript


def test_extract_json_parses_plain_json():
    payload = {"piques": [], "responses": []}
    assert _extract_json(json.dumps(payload)) == payload


def test_extract_json_strips_markdown_fences():
    payload = {"piques": [], "responses": []}
    wrapped = f"```json\n{json.dumps(payload)}\n```"
    assert _extract_json(wrapped) == payload
