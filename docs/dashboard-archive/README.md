# Archive du tableau de bord

Instantanés quotidiens de `/api/dashboard` (données déjà anonymisées et
agrégées — voir [Anonymisation](../../frontend/anonymisation.html)),
capturés automatiquement par une GitHub Action
(`.github/workflows/dashboard-archive.yml`), un fichier par jour
(`AAAA-MM-JJ.json`).

## Pourquoi

La base SQLite de production vit sur le disque éphémère du tier gratuit
Render : elle repart à zéro à chaque redéploiement. Sans cette archive,
toute tendance observée sur le tableau de bord public disparaît au
prochain push. Solution provisoire en attendant une éventuelle migration
vers un stockage persistant (Postgres/Supabase, voir
[`docs/brief/checklist-rgpd-ia-match.md`](../brief/checklist-rgpd-ia-match.md)).

## `cumulative.json` : l'historique reconstruit

Chaque fichier quotidien est un total **cumulé depuis le dernier
redéploiement**, pas un delta — un redémarrage entre deux snapshots remet
les compteurs à zéro. Comparer deux fichiers bruts au hasard peut donc
donner un delta négatif ou trompeur si un redéploiement a eu lieu entre
les deux.

`scripts/rebuild_dashboard_history.py` reconstruit automatiquement, à
chaque exécution de l'action, un historique cohérent à travers ces remises
à zéro : il détecte les redémarrages (compte du jour strictement inférieur
à celui de la veille, pour une même clé modèle/catégorie ou thème/catégorie)
et additionne les segments plutôt que les valeurs brutes. Le résultat est
écrit dans `cumulative.json`, dans le même format que `/api/dashboard` —
c'est ce fichier qu'il faut utiliser pour toute analyse de tendance dans le
temps, pas les fichiers quotidiens bruts directement. Le script est
idempotent : il repart des fichiers bruts à chaque fois, jamais d'état
intermédiaire à maintenir à la main.
