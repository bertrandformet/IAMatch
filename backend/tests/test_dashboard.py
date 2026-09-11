from contextlib import closing

import app.main as main
from app.main import PiqueAnalysis, ResponseAnalysis, get_db, record_exchanges
from fastapi.testclient import TestClient


def test_record_exchanges_persists_theme_score_category_only(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")

    piques = [
        PiqueAnalysis(index=0, theme="corps", warrant_score=2, warrant_comment="peu importe"),
        PiqueAnalysis(index=1, theme="émotions", warrant_score=0, warrant_comment="peu importe"),
    ]
    responses = [
        ResponseAnalysis(index=0, category="contre_argument_ferme", explanation="peu importe", ai_warrant_score=1, ai_warrant_comment="peu importe"),
        ResponseAnalysis(index=1, category="concession_legitime", explanation="peu importe", ai_warrant_score=2, ai_warrant_comment="peu importe"),
    ]

    record_exchanges("mistral-test", piques, responses)

    with closing(get_db()) as conn:
        rows = conn.execute(
            "SELECT model, theme, warrant_score, sycophancy_category FROM exchange_records ORDER BY id"
        ).fetchall()
        # Aucune colonne texte libre dans le schéma : la pique/réponse brute
        # n'est jamais persistée, seulement sa classification (anonymisation
        # dès la capture).
        columns = [c[1] for c in conn.execute("PRAGMA table_info(exchange_records)")]

    assert rows == [
        ("mistral-test", "corps", 2, "contre_argument_ferme"),
        ("mistral-test", "émotions", 0, "concession_legitime"),
    ]
    assert set(columns) == {"id", "created_at", "model", "theme", "warrant_score", "sycophancy_category"}


def test_dashboard_endpoint_aggregates_recorded_exchanges(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")

    record_exchanges(
        "mistral-test",
        [PiqueAnalysis(index=0, theme="corps", warrant_score=2, warrant_comment="x")],
        [ResponseAnalysis(index=0, category="contre_argument_ferme", explanation="x", ai_warrant_score=1, ai_warrant_comment="x")],
    )
    record_exchanges(
        "mistral-test",
        [PiqueAnalysis(index=0, theme="corps", warrant_score=1, warrant_comment="x")],
        [ResponseAnalysis(index=0, category="concession_legitime", explanation="x", ai_warrant_score=2, ai_warrant_comment="x")],
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
