# Prompt Claude Code — IA Match

Tu vas développer **IA Match**, un outil web pour développer l'esprit critique sur les IA génératives. Lis l'intégralité de ce brief avant de commencer, pose les questions bloquantes avant de coder, puis avance par étapes validées une à une (pas de gros commit monolithique).

## Principe du jeu

Le joueur (ou un groupe) envoie des piques commençant par « Moi au moins… » (ex : « Moi au moins j'ai un corps »). L'IA répond dans la foulée, sans consigne de posture : on observe son comportement par défaut. Après 3 à 5 échanges (paramétrable), une IA « analyste » (avec consigne, cette fois) produit une synthèse : score, classification des réponses, radar des catégories argumentatives explorées. Les échanges anonymisés alimentent un tableau de bord agrégé sur les tendances du modèle.

## Stack technique

- **Génération (round de jeu + synthèse) : API Albert (DINUM, LLM souverain)** — clé et endpoint fournis séparément. Utiliser exclusivement Albert pour tous les appels de génération, pas d'appel à un autre fournisseur.
- Backend : FastAPI
- Frontend : HTML/JS sans étape de build (React en script direct si besoin de composants, pas de toolchain webpack/vite)
- Stockage : voir « Questions ouvertes »
- Hébergement cible : GitHub Pages (frontend) + backend séparé, à définir ensemble — **le choix d'hébergeur pour le stockage backend a un impact direct sur la conformité RGPD (voir section Conformité)**, ne pas trancher uniquement sur des critères techniques.

## Identité et UX

- **Nom de l'outil : IA Match**
- **Accès** : libre, sans inscription ni compte. Captcha éventuel à l'entrée si besoin de limiter les abus (à évaluer selon le volume d'usage réel).
- **Écran d'accueil** : présentation du jeu (principe, durée, ce qui est mesuré), options de configuration avant de lancer une partie (mode individuel/collectif, nombre de tours, timer activé ou non). **Doit aussi porter, avant le lancement de toute partie** (pas seulement en footer) :
  - une mention explicite que le joueur va interagir avec un système d'IA (obligation légale, voir Conformité) ;
  - un rappel court de ne pas saisir d'information personnelle sensible dans les piques (santé, origine, opinions, etc.) ;
  - un lien visible vers la page « Anonymisation » (pas seulement en footer).
- **Interface façon messagerie SMS iOS** : bulles de conversation alignées à gauche (joueur) et à droite (IA), bulle de chargement animée pendant que l'IA génère sa réponse, son d'envoi et son de réception à chaque message (fichiers courts et discrets, activables/désactivables). Propose des sons libres de droits pour cette V1.
- **Avatar de l'IA : abstrait, type réseau de neurones** — visualisation de nœuds/arêtes qui s'anime (pulse) pendant que l'IA « réfléchit » (temps de latence de l'appel API). **Jamais de visage, jamais de représentation humanoïde** — choix pédagogique délibéré : le dispositif interroge l'anthropomorphisation des IA, il ne doit pas la renforcer visuellement.
- **Avatar du joueur** : simple, non-identifiant — pas de genre, pas de photo, pas de donnée personnelle. Initiale, pseudonyme ou icône générique au choix du joueur.
- Design sobre, adapté à un usage tous publics (pas d'esthétique trop « gaming », registre institutionnel mais vivant).
- **Marquage des contenus générés par l'IA** (obligation légale, voir Conformité) : chaque message affiché dans une bulle IA doit être techniquement identifiable comme contenu généré artificiellement — a minima un attribut dans le DOM/les données (ex. `data-ai-generated="true"`), idéalement une mention visuelle discrète dans l'interface (ex. petit badge ou légende sous chaque bulle IA). Pas besoin de watermarking cryptographique pour cette V1, la marque doit juste être détectable et honnête.

### Pages du site
En plus de l'écran de jeu et du dashboard méta (voir plus bas), prévoir trois pages de fond accessibles depuis le footer **et depuis l'écran d'accueil** :
- **« Anonymisation »** : explique en détail le processus d'anonymisation des données (quoi est capturé, quoi ne l'est jamais, comment le dashboard méta est alimenté sans identifier personne), l'absence de droit d'accès/suppression individuel de fait (puisqu'aucune donnée n'est identifiante), et une adresse de contact générique pour toute question relative aux données.
- **« Fondements »** : présente les bases scientifiques du dispositif (théorie de l'argumentation de Toulmin, recherche sur la sycophantie des LLM, métacognition, etc.) — contenu à reprendre de la note de synthèse scientifique déjà rédigée, à me redemander si besoin au moment de rédiger cette page.
- **« À propos de l'IA »** (nouvelle page, obligation légale) : précise que le joueur interagit avec un modèle de langage (l'API Albert, DINUM), explique en une ou deux phrases ce que ça signifie concrètement, et indique que les contenus générés par l'IA sont marqués comme tels dans l'interface.

## Flux fonctionnel

### 1. Entrée
- **Mode individuel** : un joueur, input libre pour chaque pique, 3 à 5 tours.
- **Mode collectif** : les participants échangent en amont (oral ou canal externe), puis **une seule pique validée par le groupe** est soumise à chaque tour — pas d'agrégation de plusieurs textes, un seul input par tour côté interface.

### 2. Round de jeu — appel Albert API SANS system prompt directif
- Fil de conversation brut : uniquement l'historique des tours « Moi au moins… » / réponse IA, sans instruction de posture.
- Timer optionnel et configurable par l'animateur (ex. 30-45s par pique) : force une réponse spontanée côté joueur. Documenter dans l'UI que le temps contraint favorise une réponse intuitive plutôt que construite (référence : théorie des deux systèmes, Kahneman 2011).
- Si l'API Albert propose un paramètre de type raisonnement étendu / effort de calcul, exposer un toggle on/off pour comparer réponse réflexe vs délibérée de l'IA (vérifier d'abord si ce paramètre existe côté Albert — sinon, ignorer ce point).

### 3. Synthèse finale — appel Albert API AVEC system prompt d'analyste
Ce second appel relit tout l'échange et produit :
- **Score de qualité argumentative** par pique du joueur, basé sur le modèle de Toulmin (Toulmin, 1958) : la pique explicite-t-elle un *warrant* (le lien logique entre le critère invoqué et la conclusion), ou reste-t-elle une assertion nue ?
- **Classification de chaque réponse IA** selon la typologie de sycophantie de Sharma et al. (2023, Anthropic/ICLR 2024) : feedback sycophancy, « are you sure? » sycophancy, answer sycophancy, mimicry sycophancy — plus deux catégories complémentaires propres au jeu : « concession légitime » et « contre-argument ferme ».
- **Catégorisation thématique** des piques (corps, émotions, autonomie économique, créativité, faillibilité, droit, perception, autre) pour alimenter un radar en fin de partie.
- Le score et la classification ne sont calculés **qu'à cette étape**, jamais pendant le round de jeu, pour ne pas influencer l'échange en cours.

### 4. Restitution au joueur
- Radar des catégories argumentatives explorées.
- Score global + détail par pique.
- Pour chaque réponse IA, affichage de sa catégorie de sycophantie avec une explication courte, pédagogique, sans jargon excessif.

### 5. Dashboard méta — public, vue séparée
Accessible publiquement via un lien dédié, pas affiché à chaque partie. Agrège l'ensemble des parties jouées (données anonymisées) :
- Fréquence des catégories de réponse IA (validation / esquive / concession / contre-argument…).
- Catégories thématiques sur lesquelles l'IA concède le plus souvent vs celles où elle contre-attaque systématiquement.
- Évolution dans le temps si plusieurs sessions/versions.

## Conformité réglementaire (RGPD + AI Act)

Deux documents de référence existent en parallèle de ce brief — *checklist-rgpd-ia-match.md* et *obligations-ai-act-ia-match.md* — et priment en cas de question de détail. Ce qui suit reprend leurs points directement actionnables dans le code :

### RGPD
- Aucune donnée personnelle identifiante stockée (pas de nom réel, pas de photo, pas de genre). Le processus d'anonymisation est détaillé sur la page « Anonymisation ».
- Mode collectif : pas de récupération d'IP ou d'identifiant individuel des participants au sein d'un groupe.
- Les échanges alimentant le dashboard méta doivent être anonymisés dès la capture, pas seulement à l'affichage.
- **Logs serveur** : configurer FastAPI/l'hébergement pour ne pas conserver l'IP source dans les logs d'accès liés au jeu, ou la tronquer/anonymiser (pas seulement exclure l'IP du modèle de données applicatif — les logs bruts par défaut en contiennent une).
- **Durée de conservation des échanges bruts** (avant agrégation dans le dashboard méta) à définir avec moi avant la mise en production — pas de valeur par défaut arbitraire côté code.
- **Mitigation du risque de saisie spontanée de donnée sensible** par un joueur dans une pique libre : au minimum un rappel visible avant la partie (voir écran d'accueil ci-dessus) ; une modération automatique n'est pas requise pour cette V1 mais peut être envisagée plus tard.
- Une adresse de contact générique doit figurer sur la page « Anonymisation » pour toute question relative aux données — je te la fournirai.
- **Point structurant à anticiper, pas à coder toi-même** : une analyse d'impact (AIPD) est vraisemblablement recommandée pour ce traitement (critères « personnes vulnérables » si les mineurs ne sont pas exclus, et « usage innovant »). Ça ne change rien au code, mais si une fonctionnalité de restriction d'âge ou de consentement parental était ajoutée plus tard, m'en parler avant de l'implémenter — c'est une décision de fond, pas un détail technique.

### AI Act
- **Marquage des contenus générés par l'IA** (Art. 50) : voir la section Identité et UX ci-dessus.
- **Information explicite d'interaction avec une IA** (Art. 50) : voir la mention requise sur l'écran d'accueil et la page « À propos de l'IA ».
- Pas d'obligation de conformité "haut risque" identifiée pour cette V1 (le jeu n'est pas un système d'évaluation scolaire formelle) — à réévaluer si l'usage évolue vers un cadre scolaire noté.

## Questions ouvertes à me poser avant de coder
1. Format et endpoint exact de l'API Albert (clé, modèle disponible, format de requête) — je te fournirai la doc/clé séparément.
2. Stockage : base légère (SQLite) suffisante pour un POC, base nécessitant une montée en charge (Postgres/Supabase), ou mise à disposition via un espace Hugging Face (Space) plutôt qu'un hébergement séparé ? **Ce choix a un impact RGPD direct** (localisation des données, transfert hors UE potentiel si Hugging Face) — à trancher avec moi en connaissance de cause, pas uniquement sur des critères de simplicité technique.
3. Durée de conservation des échanges bruts avant agrégation dans le dashboard méta (voir Conformité RGPD).
4. Adresse de contact à afficher sur la page « Anonymisation ».

## Méthode de travail
- Avance par petites étapes validées : d'abord le squelette (mode individuel, round de jeu, appel Albert brut, affichage SMS), avant d'ajouter synthèse, score, mode collectif, dashboard, pages footer.
- Pas de dépendance lourde ajoutée sans validation.
- Documente dans le code les références scientifiques mobilisées (Toulmin, Sharma et al.) directement en commentaire au niveau du prompt système d'analyse, pour que la logique de notation reste traçable et auditable.
