from app.main import _filter_chat_models

# Extrait réel de /v1/models observé en production (2026-09) — vérifie que le
# filtre garde les modèles de chat (texte + multimodal) et exclut le reste.
SAMPLE_ALBERT_MODELS = [
    {"id": "openai/gpt-oss-120b", "type": "text-generation", "aliases": ["openweight-large"]},
    {"id": "deepseek-v4-flash", "type": "text-generation", "aliases": ["deepseek-ai/DeepSeek-V4-Flash-0731"]},
    {"id": "mistral-small-3-2-24b-instruct-2506", "type": "image-text-to-text", "aliases": ["mistralai/Mistral-Small-3.2-24B-Instruct-2506", "openweight-medium"]},
    {"id": "ministral-3-8b-instruct-2512", "type": "image-text-to-text", "aliases": ["mistralai/Ministral-3-8B-Instruct-2512", "openweight-small"]},
    {"id": "gemma-4-31b-it", "type": "image-text-to-text", "aliases": ["google/gemma-4-31B-it"]},
    {"id": "qwen3-coder-30b-A3b-instruct", "type": "text-generation", "aliases": ["Qwen/Qwen3-Coder-30B-A3B-Instruct", "openweight-code"]},
    {"id": "lightonocr-2-1b", "type": "image-text-to-text", "aliases": ["lightonai/LightOnOCR-2-1B", "openweight-ocr"]},
    {"id": "bge-m3", "type": "text-embeddings-inference", "aliases": ["BAAI/bge-m3", "openweight-embeddings"]},
    {"id": "bge-reranker-v2-m3", "type": "text-classification", "aliases": ["BAAI/bge-reranker-v2-m3", "openweight-rerank"]},
    {"id": "whisper-large-v3", "type": "automatic-speech-recognition", "aliases": ["openai/whisper-large-v3", "openweight-audio"]},
]


def test_filter_chat_models_keeps_general_purpose_text_and_multimodal_models():
    result = {m["id"] for m in _filter_chat_models(SAMPLE_ALBERT_MODELS)}
    assert result == {
        "openai/gpt-oss-120b",
        "deepseek-v4-flash",
        "mistral-small-3-2-24b-instruct-2506",
        "ministral-3-8b-instruct-2512",
        "gemma-4-31b-it",
    }


def test_filter_chat_models_excludes_embeddings_rerank_and_audio():
    result = {m["id"] for m in _filter_chat_models(SAMPLE_ALBERT_MODELS)}
    assert "bge-m3" not in result
    assert "bge-reranker-v2-m3" not in result
    assert "whisper-large-v3" not in result


def test_filter_chat_models_excludes_code_and_ocr_specialized_models():
    result = {m["id"] for m in _filter_chat_models(SAMPLE_ALBERT_MODELS)}
    assert "qwen3-coder-30b-A3b-instruct" not in result
    assert "lightonocr-2-1b" not in result


def test_filter_chat_models_does_not_false_positive_on_encoder_token():
    # "encoder" ne doit pas être exclu comme s'il matchait "code" en sous-chaîne.
    models = [{"id": "some-encoder-model", "type": "text-generation", "aliases": []}]
    assert {m["id"] for m in _filter_chat_models(models)} == {"some-encoder-model"}


def test_filter_chat_models_ignores_entries_without_id():
    assert _filter_chat_models([{"type": "text-generation"}]) == []
