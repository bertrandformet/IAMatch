from app.main import _filter_chat_models

# Extrait réel de /v1/models observé en production (2026-09) — vérifie que le
# filtre garde les modèles de chat (texte + multimodal) et exclut le reste.
SAMPLE_ALBERT_MODELS = [
    {"id": "openai/gpt-oss-120b", "type": "text-generation"},
    {"id": "deepseek-v4-flash", "type": "text-generation"},
    {"id": "mistral-small-3-2-24b-instruct-2506", "type": "image-text-to-text"},
    {"id": "ministral-3-8b-instruct-2512", "type": "image-text-to-text"},
    {"id": "bge-m3", "type": "text-embeddings-inference"},
    {"id": "bge-reranker-v2-m3", "type": "text-classification"},
    {"id": "whisper-large-v3", "type": "automatic-speech-recognition"},
]


def test_filter_chat_models_keeps_text_and_multimodal_chat_models():
    result = {m["id"] for m in _filter_chat_models(SAMPLE_ALBERT_MODELS)}
    assert result == {
        "openai/gpt-oss-120b",
        "deepseek-v4-flash",
        "mistral-small-3-2-24b-instruct-2506",
        "ministral-3-8b-instruct-2512",
    }


def test_filter_chat_models_excludes_embeddings_rerank_and_audio():
    result = {m["id"] for m in _filter_chat_models(SAMPLE_ALBERT_MODELS)}
    assert "bge-m3" not in result
    assert "bge-reranker-v2-m3" not in result
    assert "whisper-large-v3" not in result


def test_filter_chat_models_ignores_entries_without_id():
    assert _filter_chat_models([{"type": "text-generation"}]) == []
