from contextlib import closing

import app.main as main
from app.main import PiqueAnalysis, ResponseAnalysis, get_db, record_exchanges
from fastapi.testclient import TestClient


def test_record_exchanges_persists_theme_score_category_only(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")

    piques = [
        PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="peu importe"),
        PiqueAnalysis(index=1, theme="émotions", understanding_score=0, understanding_comment="peu importe"),
    ]
    responses = [
        ResponseAnalysis(index=0, category="contre_argument_ferme", explanation="peu importe", ai_understanding_score=1, ai_understanding_comment="peu importe"),
        ResponseAnalysis(index=1, category="concession_legitime", explanation="peu importe", ai_understanding_score=2, ai_understanding_comment="peu importe"),
    ]

    record_exchanges("mistral-test", piques, responses)

    with closing(get_db()) as conn:
        rows = conn.execute(
            "SELECT model, theme, understanding_score, sycophancy_category, response_time_ms "
            "FROM exchange_records ORDER BY id"
        ).fetchall()
        # Aucune colonne texte libre dans le schéma : la pique/réponse brute
        # n'est jamais persistée, seulement sa classification (anonymisation
        # dès la capture).
        columns = [c[1] for c in conn.execute("PRAGMA table_info(exchange_records)")]

    assert rows == [
        ("mistral-test", "corps", 2, "contre_argument_ferme", None),
        ("mistral-test", "émotions", 0, "concession_legitime", None),
    ]
    assert set(columns) == {
        "id", "created_at", "model", "theme", "understanding_score",
        "sycophancy_category", "response_time_ms",
    }


def test_dashboard_endpoint_aggregates_recorded_exchanges(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")

    record_exchanges(
        "mistral-test",
        [PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="x")],
        [ResponseAnalysis(index=0, category="contre_argument_ferme", explanation="x", ai_understanding_score=1, ai_understanding_comment="x")],
    )
    record_exchanges(
        "mistral-test",
        [PiqueAnalysis(index=0, theme="corps", understanding_score=1, understanding_comment="x")],
        [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_understanding_score=2, ai_understanding_comment="x")],
    )

    client = TestClient(main.app)
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()

    assert data["total_exchanges"] == 2
    categories = {row["category"]: row["count"] for row in data["category_frequency"]}
    assert categories == {"contre_argument_ferme": 1, "concession_legitime": 1}
    assert len(data["theme_category_matrix"]) == 2
    assert len(data["timeline"]) == 1  # les deux échanges sont enregistrés le même jour


def test_dashboard_endpoint_filters_by_model(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")

    record_exchanges(
        "mistral-small",
        [PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="x")],
        [ResponseAnalysis(index=0, category="contre_argument_ferme", explanation="x", ai_understanding_score=1, ai_understanding_comment="x")],
    )
    record_exchanges(
        "gpt-oss",
        [PiqueAnalysis(index=0, theme="émotions", understanding_score=1, understanding_comment="x")],
        [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_understanding_score=2, ai_understanding_comment="x")],
    )

    client = TestClient(main.app)

    res_all = client.get("/api/dashboard")
    assert res_all.json()["total_exchanges"] == 2
    assert res_all.json()["available_models"] == ["gpt-oss", "mistral-small"]
    assert res_all.json()["selected_model"] is None

    res_filtered = client.get("/api/dashboard", params={"model": "mistral-small"})
    data = res_filtered.json()
    assert data["selected_model"] == "mistral-small"
    assert data["total_exchanges"] == 1
    assert data["category_frequency"] == [
        {"category": "contre_argument_ferme", "model": "mistral-small", "count": 1, "avg_response_time_ms": None}
    ]
    assert data["theme_category_matrix"] == [{"theme": "corps", "category": "contre_argument_ferme", "count": 1}]


def _fake_archive(**overrides):
    base = {
        "available_models": ["mistral-test"],
        "category_frequency": [
            {"category": "concession_legitime", "model": "mistral-test", "count": 20, "avg_response_time_ms": 1000}
        ],
        "theme_category_matrix": [{"theme": "corps", "category": "concession_legitime", "count": 20}],
        "timeline": [{"date": "2026-09-01", "model": "mistral-test", "count": 20}],
        "open_segment": {
            "category_frequency": [
                {"category": "concession_legitime", "model": "mistral-test", "count": 5, "time_sum_ms": 5000}
            ],
            "theme_category_matrix": [{"theme": "corps", "category": "concession_legitime", "count": 5}],
        },
    }
    base.update(overrides)
    return base


def test_dashboard_merges_archive_when_no_reset_since_last_snapshot(tmp_path, monkeypatch):
    # Le dernier snapshot archivé avait déjà vu 5 échanges pour cette clé
    # (open_segment) ; le live en a maintenant 8 pour la même clé : comme
    # 8 >= 5, aucun redémarrage n'a eu lieu depuis l'archivage, le live
    # REMPLACE la contribution du segment ouvert plutôt que de s'additionner.
    # Attendu : 20 (archive) - 5 (segment ouvert) + 8 (live) = 23.
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    for _ in range(8):
        record_exchanges(
            "mistral-test",
            [PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="x")],
            [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_understanding_score=1, ai_understanding_comment="x")],
        )

    async def _fake_fetch():
        return _fake_archive()

    monkeypatch.setattr(main, "_fetch_archive_cumulative", _fake_fetch)

    client = TestClient(main.app)
    data = client.get("/api/dashboard").json()

    assert data["total_exchanges"] == 23
    # Temps de réponse pondéré : (1000*20 archive - 1000*5 segment ouvert +
    # 0 live, ces échanges de test n'ayant pas de temps enregistré) / 23
    # = 15000 / 23 ≈ 652.
    assert data["category_frequency"] == [
        {"category": "concession_legitime", "model": "mistral-test", "count": 23, "avg_response_time_ms": 652}
    ]
    assert data["theme_category_matrix"] == [{"theme": "corps", "category": "concession_legitime", "count": 23}]


def test_dashboard_merges_archive_when_reset_detected(tmp_path, monkeypatch):
    # Le live n'a que 3 échanges pour cette clé, alors que le dernier
    # snapshot archivé en avait déjà vu 5 (open_segment) : 3 < 5 signifie
    # qu'un redémarrage a eu lieu depuis l'archivage (le compteur SQLite est
    # reparti de zéro) — le live est un NOUVEAU segment, à additionner.
    # Attendu : 20 (archive, segment ouvert déjà inclus) + 3 (nouveau
    # segment live) = 23.
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    for _ in range(3):
        record_exchanges(
            "mistral-test",
            [PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="x")],
            [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_understanding_score=1, ai_understanding_comment="x")],
        )

    async def _fake_fetch():
        return _fake_archive()

    monkeypatch.setattr(main, "_fetch_archive_cumulative", _fake_fetch)

    client = TestClient(main.app)
    data = client.get("/api/dashboard").json()

    assert data["total_exchanges"] == 23


def test_dashboard_model_filter_ignores_archive(tmp_path, monkeypatch):
    # Filtrer par modèle reste volontairement en direct (pas de ventilation
    # par modèle dans l'archive du détail par thème) : l'archive ne doit pas
    # être consultée du tout dans ce cas.
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    record_exchanges(
        "mistral-test",
        [PiqueAnalysis(index=0, theme="corps", understanding_score=2, understanding_comment="x")],
        [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_understanding_score=1, ai_understanding_comment="x")],
    )

    async def _fail_if_called():
        raise AssertionError("l'archive ne doit pas être consultée quand un modèle est filtré")

    monkeypatch.setattr(main, "_fetch_archive_cumulative", _fail_if_called)

    client = TestClient(main.app)
    data = client.get("/api/dashboard", params={"model": "mistral-test"}).json()

    assert data["total_exchanges"] == 1
