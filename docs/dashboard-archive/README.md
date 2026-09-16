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

## Limite à garder en tête

Chaque fichier est un total **cumulé depuis le dernier redéploiement**,
pas un delta quotidien. Si aucun redéploiement n'a eu lieu entre deux
snapshots, le second contient simplement plus de données que le premier
(comparaison directe possible). Si un redéploiement a eu lieu entre les
deux, le total repart de zéro : reconstruire une série continue demande de
détecter ce cas (total du jour strictement inférieur à celui du snapshot
précédent, pour la même clé modèle/catégorie/thème) et de sommer les
deltas plutôt que les valeurs brutes — pas fait automatiquement ici, à
faire au moment de l'analyse.
