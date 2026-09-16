"""Reconstruit un historique cumulé à partir des snapshots quotidiens de
docs/dashboard-archive/*.json (chacun un dump brut de /api/dashboard).

Pourquoi ce n'est pas une simple somme des snapshots : chaque fichier est un
total DÉJÀ CUMULÉ depuis le dernier redéploiement (la base SQLite de
production est éphémère, elle repart à zéro à chaque déploiement). Comparer
deux snapshots consécutifs demande donc de détecter si un redéploiement a eu
lieu entre les deux :
  - si le compte du jour est >= celui de la veille : pas de redéploiement,
    la valeur du jour inclut déjà tout l'historique précédent.
  - si le compte du jour est < celui de la veille : un redéploiement a eu
    lieu, le compteur est reparti de zéro — il faut additionner ce nouveau
    "segment" au lieu de le comparer au segment précédent.

Algorithme (par clé modèle/catégorie ou thème/catégorie, indépendamment) :
on parcourt la séquence de comptes dans l'ordre chronologique ; chaque fois
que le compte suivant est strictement inférieur au précédent, on "banque"
la dernière valeur du segment qui se termine (elle contient déjà tout ce
segment, grâce à l'accumulation monotone de SQLite tant qu'il n'y a pas eu
de redémarrage). À la fin, on banque aussi le dernier segment en cours. Le
total reconstruit est la somme des valeurs banquées.

Pour le temps de réponse moyen (avg_response_time_ms), la même logique
s'applique mais pondérée : chaque segment banqué contribue sa propre somme
de temps (avg * count), et la moyenne finale = somme des temps / somme des
comptes — valide parce qu'au sein d'un même segment (pas de redémarrage),
avg * count au dernier snapshot du segment est déjà la vraie somme des
temps de réponse de ce segment.

La timeline (répartition par jour) suit une logique différente et plus
simple : chaque ligne est déjà datée par jour calendaire (created_at d'un
échange, pas la date du snapshot) — une fois un jour passé, son compte ne
peut que croître jusqu'à ce qu'un redémarrage l'efface. Le maximum observé
pour une (date, modèle) donnée à travers tous les snapshots est donc déjà
la valeur finale exacte.
"""

import json
from pathlib import Path

ARCHIVE_DIR = Path(__file__).resolve().parent.parent / "docs" / "dashboard-archive"


def _load_snapshots():
    """Charge tous les snapshots, triés chronologiquement par nom de fichier
    (horodatage AAAA-MM-JJTHH-MM-SSZ.json — un fichier par exécution, jamais
    écrasé même si plusieurs exécutions tombent le même jour ; les anciens
    fichiers AAAA-MM-JJ.json, antérieurs à ce format, restent lisibles)."""
    files = sorted(ARCHIVE_DIR.glob("[0-9]" * 4 + "-*.json"))
    snapshots = []
    for f in files:
        with open(f, encoding="utf-8") as fh:
            snapshots.append((f.stem, json.load(fh)))
    return snapshots


def _reconcile_counter(sequence):
    """sequence : liste de (count, avg_or_None) dans l'ordre chronologique
    pour UNE clé donnée. Renvoie (total_count, total_avg_or_None).

    On détecte les redémarrages (une valeur suivie d'une valeur plus petite)
    et on "banque" la dernière valeur de chaque segment monotone — elle
    contient déjà tout ce segment, sans redémarrage entre-temps. Le dernier
    segment en cours est banqué même sans redémarrage après lui."""
    if not sequence:
        return 0, None
    banked_count = 0
    banked_time_sum = 0.0
    has_time = False
    for i, (count, avg) in enumerate(sequence):
        is_last = i == len(sequence) - 1
        is_reset_next = (not is_last) and sequence[i + 1][0] < count
        if is_last or is_reset_next:
            banked_count += count
            if avg is not None:
                banked_time_sum += avg * count
                has_time = True
    total_avg = round(banked_time_sum / banked_count) if (has_time and banked_count > 0) else None
    return banked_count, total_avg


def rebuild():
    snapshots = _load_snapshots()
    if not snapshots:
        return {
            "available_models": [],
            "total_exchanges": 0,
            "category_frequency": [],
            "theme_category_matrix": [],
            "timeline": [],
            "snapshots_used": 0,
        }

    available_models = set()

    # category_frequency : clé = (category, model) -> [(count, avg), ...]
    cat_freq_series: dict = {}
    for _date, data in snapshots:
        for row in data.get("category_frequency", []):
            key = (row["category"], row["model"])
            cat_freq_series.setdefault(key, []).append(
                (row["count"], row.get("avg_response_time_ms"))
            )
            available_models.add(row["model"])

    category_frequency = []
    total_exchanges = 0
    for (category, model), seq in cat_freq_series.items():
        count, avg = _reconcile_counter(seq)
        if count == 0:
            continue
        category_frequency.append(
            {"category": category, "model": model, "count": count, "avg_response_time_ms": avg}
        )
        total_exchanges += count

    # theme_category_matrix : clé = (theme, category) -> [(count, None), ...]
    theme_series: dict = {}
    for _date, data in snapshots:
        for row in data.get("theme_category_matrix", []):
            key = (row["theme"], row["category"])
            theme_series.setdefault(key, []).append((row["count"], None))

    theme_category_matrix = []
    for (theme, category), seq in theme_series.items():
        count, _ = _reconcile_counter(seq)
        if count == 0:
            continue
        theme_category_matrix.append({"theme": theme, "category": category, "count": count})

    # timeline : clé = (date, model) -> max(count) observé (voir docstring).
    timeline_max: dict = {}
    for _snap_date, data in snapshots:
        for row in data.get("timeline", []):
            key = (row["date"], row["model"])
            timeline_max[key] = max(timeline_max.get(key, 0), row["count"])

    timeline = [
        {"date": d, "model": m, "count": c}
        for (d, m), c in sorted(timeline_max.items())
        if c > 0
    ]

    return {
        "available_models": sorted(available_models),
        "total_exchanges": total_exchanges,
        "category_frequency": category_frequency,
        "theme_category_matrix": theme_category_matrix,
        "timeline": timeline,
        "snapshots_used": len(snapshots),
    }


if __name__ == "__main__":
    result = rebuild()
    out_path = ARCHIVE_DIR / "cumulative.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Écrit {out_path} — {result['total_exchanges']} échanges reconstruits sur {result['snapshots_used']} snapshot(s).")
