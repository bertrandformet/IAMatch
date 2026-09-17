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

La timeline (répartition par jour) suit la MÊME logique de segments que
category_frequency/theme_category_matrix, appliquée par clé (date, modèle)
plutôt que (catégorie, modèle) — chaque ligne est déjà datée par jour
calendaire (created_at d'un échange, pas la date du snapshot), mais le
compte pour UNE date donnée reste soumis au même risque de redémarrage
en cours de journée qu'une catégorie : repéré en conditions réelles (un
redéploiement en cours de journée juste après un archivage a fait
apparaître un total du jour inférieur à un snapshot précédent). Un simple
max() par (date, modèle), utilisé dans une première version, sous-comptait
silencieusement ce cas (il retombe sur le compte pré-redémarrage, plus élevé
mais périmé, au lieu de sommer les deux segments) — remplacé par
`_reconcile_counter`, identique à category_frequency. `open_segment.timeline`
expose ensuite, comme pour les deux autres clés, la valeur du dernier
snapshot pour que le backend puisse remplacer/additionner avec le live.

`open_segment` : pour que /api/dashboard (backend) puisse fusionner ce
fichier avec les données live SANS compter deux fois le segment en cours,
il a besoin de savoir combien ce fichier a déjà compté pour le DERNIER
segment (potentiellement encore ouvert, si aucun redémarrage n'a eu lieu
depuis ce snapshot). C'est exactement la valeur du DERNIER snapshot de
chaque clé (pas le total reconstruit) — exposée séparément ici plutôt que
recalculée côté backend.
"""

import json
from pathlib import Path

ARCHIVE_DIR = Path(__file__).resolve().parent.parent / "docs" / "dashboard-archive"

# Un snapshot déjà archivé peut contenir un thème légèrement différent du
# libellé canonique (ex. "autres" au lieu de "autre", vu en conditions
# réelles) : repris tel quel par le backend au moment de l'écriture (voir
# THEME_ALIASES dans backend/app/main.py). Normalisé ici aussi pour que les
# anciens snapshots déjà commités fusionnent correctement au prochain
# rebuild, sans avoir à réécrire les fichiers bruts.
THEME_ALIASES = {"autres": "autre"}


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
            "open_segment": {"category_frequency": [], "theme_category_matrix": [], "timeline": [], "boot_id": None},
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
    open_segment_cat_freq = []
    total_exchanges = 0
    for (category, model), seq in cat_freq_series.items():
        count, avg = _reconcile_counter(seq)
        if count > 0:
            category_frequency.append(
                {"category": category, "model": model, "count": count, "avg_response_time_ms": avg}
            )
            total_exchanges += count
        # Dernier snapshot de cette clé = ce que le segment en cours (peut-être
        # encore ouvert) pesait déjà à ce moment-là — voir docstring du module.
        last_count, last_avg = seq[-1]
        if last_count > 0:
            open_segment_cat_freq.append(
                {
                    "category": category,
                    "model": model,
                    "count": last_count,
                    "time_sum_ms": (last_avg * last_count) if last_avg is not None else None,
                }
            )

    # theme_category_matrix : clé = (theme, category) -> [(count, None), ...].
    # Les variantes ("autre"/"autres") sont d'abord sommées PAR SNAPSHOT (un
    # même fichier peut contenir les deux si le live avait déjà les deux au
    # moment de la capture) avant d'entrer dans la séquence chronologique —
    # sinon deux lignes du même fichier apparaîtraient comme deux points de la
    # séquence, faussant la détection de redémarrage.
    theme_series: dict = {}
    for _date, data in snapshots:
        per_snapshot: dict = {}
        for row in data.get("theme_category_matrix", []):
            theme = THEME_ALIASES.get(row["theme"], row["theme"])
            key = (theme, row["category"])
            per_snapshot[key] = per_snapshot.get(key, 0) + row["count"]
        for key, count in per_snapshot.items():
            theme_series.setdefault(key, []).append((count, None))

    theme_category_matrix = []
    open_segment_theme = []
    for (theme, category), seq in theme_series.items():
        count, _ = _reconcile_counter(seq)
        if count > 0:
            theme_category_matrix.append({"theme": theme, "category": category, "count": count})
        last_count, _ = seq[-1]
        if last_count > 0:
            open_segment_theme.append({"theme": theme, "category": category, "count": last_count})

    # timeline : clé = (date, model) -> [(count, None), ...], même logique de
    # segments que category_frequency/theme_category_matrix (voir docstring
    # du module) plutôt qu'un max() — un simple max() donnait le même résultat
    # tant qu'aucun redémarrage ne survenait le même jour qu'un snapshot
    # précédent, mais sous-comptait silencieusement dans ce cas (constaté en
    # conditions réelles).
    timeline_series: dict = {}
    for _date, data in snapshots:
        per_snapshot: dict = {}
        for row in data.get("timeline", []):
            key = (row["date"], row["model"])
            per_snapshot[key] = per_snapshot.get(key, 0) + row["count"]
        for key, count in per_snapshot.items():
            timeline_series.setdefault(key, []).append((count, None))

    timeline = []
    open_segment_timeline = []
    for (date, model), seq in timeline_series.items():
        count, _ = _reconcile_counter(seq)
        if count > 0:
            timeline.append({"date": date, "model": model, "count": count})
        last_count, _ = seq[-1]
        if last_count > 0:
            open_segment_timeline.append({"date": date, "model": model, "count": last_count})
    timeline.sort(key=lambda r: (r["date"], r["model"]))
    open_segment_timeline.sort(key=lambda r: (r["date"], r["model"]))

    return {
        "available_models": sorted(available_models),
        "total_exchanges": total_exchanges,
        "category_frequency": category_frequency,
        "theme_category_matrix": theme_category_matrix,
        "timeline": timeline,
        "open_segment": {
            "category_frequency": open_segment_cat_freq,
            "theme_category_matrix": open_segment_theme,
            "timeline": open_segment_timeline,
            # BOOT_ID vu par le DERNIER snapshot (voir backend/app/main.py) :
            # permet au backend de savoir, sans ambiguïté de comptes, si le
            # live actuel est encore ce même segment ou un nouveau depuis un
            # redémarrage. Absent sur un snapshot pris avant l'ajout de ce
            # champ : le backend traite alors prudemment comme "redémarrage"
            # (additionne plutôt que remplacer, jamais de sous-comptage).
            "boot_id": snapshots[-1][1].get("live_boot_id"),
        },
        "snapshots_used": len(snapshots),
    }


if __name__ == "__main__":
    result = rebuild()
    out_path = ARCHIVE_DIR / "cumulative.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Écrit {out_path} — {result['total_exchanges']} échanges reconstruits sur {result['snapshots_used']} snapshot(s).")
