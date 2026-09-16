import pytest

import app.main as main


@pytest.fixture(autouse=True)
def _disable_dashboard_archive(monkeypatch):
    """Le dashboard fusionne les chiffres live avec l'archive GitHub
    (docs/dashboard-archive/cumulative.json) quand aucun modèle n'est
    filtré (voir _fetch_archive_cumulative dans main.py). Désactivé par
    défaut dans les tests pour rester déterministe et ne pas dépendre du
    réseau — les tests qui veulent vérifier la fusion remplacent
    explicitement _fetch_archive_cumulative avec leur propre archive."""
    monkeypatch.setattr(main, "_archive_cache", {"data": None, "fetched_at": 0.0})

    async def _no_archive():
        return None

    monkeypatch.setattr(main, "_fetch_archive_cumulative", _no_archive)
