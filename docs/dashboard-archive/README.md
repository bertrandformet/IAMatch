# Archive du tableau de bord

Instantanés de `/api/dashboard` (données déjà anonymisées et agrégées —
voir [Anonymisation](../../frontend/anonymisation.html)), capturés
automatiquement par une GitHub Action
(`.github/workflows/dashboard-archive.yml`) une fois par jour (6h UTC),
un fichier par exécution, horodaté (`AAAA-MM-JJTHH-MM-SSZ.json`) — jamais
écrasé, y compris en cas de déclenchement manuel supplémentaire le même
jour (voir plus bas pourquoi c'est important).

## Pourquoi

La base SQLite de production vit sur le disque éphémère du tier gratuit
Render : elle repart à zéro à chaque redéploiement. Sans cette archive,
toute tendance observée sur le tableau de bord public disparaît au
prochain push. Solution provisoire en attendant une éventuelle migration
vers un stockage persistant (Postgres/Supabase, voir
[`docs/brief/checklist-rgpd-ia-match.md`](../brief/checklist-rgpd-ia-match.md)).

## `cumulative.json` : l'historique reconstruit

Chaque snapshot est un total **cumulé depuis le dernier redéploiement**,
pas un delta — un redémarrage entre deux snapshots remet les compteurs à
zéro. Comparer deux fichiers bruts au hasard peut donc donner un delta
négatif ou trompeur si un redéploiement a eu lieu entre les deux.

`scripts/rebuild_dashboard_history.py` reconstruit automatiquement, à
chaque exécution de l'action, un historique cohérent à travers ces remises
à zéro : il détecte les redémarrages (compte strictement inférieur au
snapshot précédent, pour une même clé modèle/catégorie ou thème/catégorie)
et additionne les segments plutôt que les valeurs brutes. Le résultat est
écrit dans `cumulative.json`, dans le même format que `/api/dashboard` —
c'est ce fichier qu'il faut utiliser pour toute analyse de tendance dans le
temps, pas les fichiers bruts directement. Le script est idempotent : il
repart des fichiers bruts à chaque fois, jamais d'état intermédiaire à
maintenir à la main.

**Pourquoi un fichier par jour ne suffisait pas** : la première version
nommait les fichiers par seule date (`AAAA-MM-JJ.json`). Testé en
conditions réelles (partie jouée -> snapshot -> partie jouée -> redéploiement
manuel -> snapshot, le même jour) : le second snapshot a écrasé le premier
avant même que le script de reconstruction ne voie les deux valeurs — le
total d'avant le reset a disparu du même coup. Passage à un nom de fichier
horodaté à la seconde près pour que deux exécutions le même jour produisent
deux fichiers distincts, jamais un écrasement.
