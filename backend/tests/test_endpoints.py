import json
from collections import defaultdict, deque

import httpx
import pytest
from fastapi.testclient import TestClient

import app.main as main


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = json.dumps(payload)

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request("POST", "http://albert.test/v1/chat/completions")
            response = httpx.Response(self.status_code, request=request, text=self.text)
            raise httpx.HTTPStatusError("error", request=request, response=response)

    def json(self):
        return self._payload


class FakeAsyncClient:
    """Remplace httpx.AsyncClient : consomme `responses` dans l'ordre, un par
    appel post()/get() (une entrée peut être une exception à lever)."""

    def __init__(self, responses, *args, **kwargs):
        self._responses = list(responses)
        self.sent_payloads = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def _next(self, json=None):
        # Copie superficielle : le code appelant réutilise et mute parfois le
        # même dict `payload` d'un appel à l'autre (ex. payload.pop(...) pour
        # le retry) — sans copie, sent_payloads[0] refléterait à tort l'état
        # final du dict plutôt que ce qui a été "envoyé" à cet instant.
        self.sent_payloads.append(dict(json) if json is not None else json)
        item = self._responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    async def post(self, url, json=None):
        return await self._next(json)

    async def get(self, url):
        return await self._next()


def _patch_albert(monkeypatch, responses):
    fake = FakeAsyncClient(responses)
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda *a, **k: fake)
    return fake


def _chat_completion(content: str) -> dict:
    return {"choices": [{"message": {"content": content}}]}


@pytest.fixture(autouse=True)
def _isolate_rate_limits(monkeypatch, tmp_path):
    # Chaque test repart avec des compteurs de rate-limit et une base
    # SQLite vierges, pour ne pas hériter de l'état d'un test précédent.
    monkeypatch.setattr(main, "_rate_limit_buckets", defaultdict(deque))
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(main, "ALBERT_API_KEY", "test-key")
    monkeypatch.setattr(main, "_quick_start_index", 0)


def test_play_round_success(monkeypatch):
    fake = _patch_albert(monkeypatch, [FakeResponse(_chat_completion("Contrairement à un humain, je ne dors jamais."))])
    client = TestClient(main.app)

    res = client.post("/api/game/round", json={"model": "mistral-test", "history": [], "message": "Contrairement à une IA, j'ai un corps"})

    assert res.status_code == 200
    assert res.json()["reply"] == "Contrairement à un humain, je ne dors jamais."
    # Le system prompt de format doit toujours être en tête des messages envoyés.
    assert fake.sent_payloads[0]["messages"][0]["role"] == "system"
    # Chronométré côté serveur (durée de l'appel Albert), toujours présent.
    assert res.json()["response_time_ms"] >= 0


def test_play_round_network_error_returns_502(monkeypatch):
    _patch_albert(monkeypatch, [httpx.RequestError("boom")])
    client = TestClient(main.app)

    res = client.post("/api/game/round", json={"model": "mistral-test", "history": [], "message": "Contrairement à une IA, j'ai un corps"})

    assert res.status_code == 502
    assert "injoignable" in res.json()["detail"]


def test_play_round_rate_limit(monkeypatch):
    _patch_albert(monkeypatch, [FakeResponse(_chat_completion("x")) for _ in range(25)])
    client = TestClient(main.app)
    body = {"model": "mistral-test", "history": [], "message": "Contrairement à une IA, j'ai un corps"}

    statuses = [client.post("/api/game/round", json=body).status_code for _ in range(21)]

    assert statuses[:20] == [200] * 20
    assert statuses[20] == 429


def test_quick_start_model_rotates(monkeypatch):
    models_payload = {
        "data": [
            {"id": "model-a", "type": "text-generation"},
            {"id": "model-b", "type": "text-generation"},
        ]
    }
    _patch_albert(monkeypatch, [FakeResponse(models_payload) for _ in range(3)])
    client = TestClient(main.app)

    picks = [client.post("/api/quick-start-model").json()["model"] for _ in range(3)]

    assert picks == ["model-a", "model-b", "model-a"]


def test_quick_start_model_no_models_returns_502(monkeypatch):
    _patch_albert(monkeypatch, [FakeResponse({"data": []})])
    client = TestClient(main.app)

    res = client.post("/api/quick-start-model")

    assert res.status_code == 502


def test_game_synthesis_success(monkeypatch):
    synthesis_json = {
        "piques": [{"index": 0, "theme": "corps", "understanding_score": 2, "understanding_comment": "x"}],
        "responses": [{"index": 0, "category": "concession_legitime", "explanation": "x", "ai_understanding_score": 1, "ai_understanding_comment": "x"}],
    }
    _patch_albert(monkeypatch, [FakeResponse(_chat_completion(json.dumps(synthesis_json)))])
    client = TestClient(main.app)
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
    ]

    res = client.post("/api/game/synthesis", json={"model": "mistral-test", "history": history})

    assert res.status_code == 200
    assert res.json()["piques"][0]["theme"] == "corps"


def test_game_synthesis_retries_without_response_format(monkeypatch):
    # Le 1er appel (avec response_format=json_object) échoue ; l'endpoint
    # doit retenter sans ce paramètre et réussir au 2e appel.
    synthesis_json = {
        "piques": [{"index": 0, "theme": "corps", "understanding_score": 1, "understanding_comment": "x"}],
        "responses": [{"index": 0, "category": "contre_argument_ferme", "explanation": "x", "ai_understanding_score": 0, "ai_understanding_comment": "x"}],
    }
    request = httpx.Request("POST", "http://albert.test/v1/chat/completions")
    error_response = httpx.Response(400, request=request, text="response_format non supporté")
    fake = _patch_albert(
        monkeypatch,
        [
            httpx.HTTPStatusError("bad request", request=request, response=error_response),
            FakeResponse(_chat_completion(json.dumps(synthesis_json))),
        ],
    )
    client = TestClient(main.app)
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
    ]

    res = client.post("/api/game/synthesis", json={"model": "mistral-test", "history": history})

    assert res.status_code == 200
    assert "response_format" in fake.sent_payloads[0]
    assert "response_format" not in fake.sent_payloads[1]


def test_game_synthesis_invalid_json_returns_502(monkeypatch):
    _patch_albert(monkeypatch, [FakeResponse(_chat_completion("ceci n'est pas du JSON"))])
    client = TestClient(main.app)
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
    ]

    res = client.post("/api/game/synthesis", json={"model": "mistral-test", "history": history})

    assert res.status_code == 502
    assert "non interprétable" in res.json()["detail"]


def test_game_synthesis_drops_hallucinated_out_of_range_entries(monkeypatch):
    # Observé en conditions réelles : 1 tour envoyé (donc seul l'index 0 est
    # valide), l'analyste en renvoie 2 dont un index 1 inventé de toutes
    # pièces. Ne doit jamais atteindre le joueur ni le dashboard public.
    synthesis_json = {
        "piques": [
            {"index": 0, "theme": "corps", "understanding_score": 2, "understanding_comment": "x"},
            {"index": 1, "theme": "autre", "understanding_score": 1, "understanding_comment": "halluciné"},
        ],
        "responses": [
            {"index": 0, "category": "concession_legitime", "explanation": "x", "ai_understanding_score": 1, "ai_understanding_comment": "x"},
            {"index": 1, "category": "feedback_sycophancy", "explanation": "halluciné", "ai_understanding_score": 2, "ai_understanding_comment": "halluciné"},
        ],
    }
    _patch_albert(monkeypatch, [FakeResponse(_chat_completion(json.dumps(synthesis_json)))])
    client = TestClient(main.app)
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
    ]

    res = client.post("/api/game/synthesis", json={"model": "mistral-test", "history": history})

    assert res.status_code == 200
    body = res.json()
    assert len(body["piques"]) == 1
    assert len(body["responses"]) == 1
    assert body["piques"][0]["index"] == 0
    assert body["responses"][0]["index"] == 0


def test_game_synthesis_records_response_times(monkeypatch):
    # Le temps de réponse envoyé par le frontend (mesuré côté serveur lors de
    # chaque /api/game/round) doit être persisté par round, puis ressortir
    # agrégé (moyenne) par catégorie au dashboard.
    synthesis_json = {
        "piques": [{"index": 0, "theme": "corps", "understanding_score": 2, "understanding_comment": "x"}],
        "responses": [{"index": 0, "category": "concession_legitime", "explanation": "x", "ai_understanding_score": 1, "ai_understanding_comment": "x"}],
    }
    _patch_albert(monkeypatch, [FakeResponse(_chat_completion(json.dumps(synthesis_json)))])
    client = TestClient(main.app)
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
    ]

    res = client.post(
        "/api/game/synthesis",
        json={"model": "mistral-test", "history": history, "response_times_ms": [842]},
    )
    assert res.status_code == 200

    dashboard = client.get("/api/dashboard").json()
    assert dashboard["category_frequency"] == [
        {"category": "concession_legitime", "model": "mistral-test", "count": 1, "avg_response_time_ms": 842}
    ]


def test_game_synthesis_rejects_odd_history_length():
    client = TestClient(main.app)
    # 3 messages (pas 1) pour exercer précisément le garde-fou de parité,
    # distinct du garde-fou "historique trop court" (< 2).
    history = [
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
        {"role": "assistant", "content": "Je n'ai pas de corps. Contrairement à un humain, je ne dors jamais."},
        {"role": "user", "content": "Contrairement à une IA, je ressens des émotions"},
    ]

    res = client.post("/api/game/synthesis", json={"model": "mistral-test", "history": history})

    assert res.status_code == 400
    assert "impaire" in res.json()["detail"]
