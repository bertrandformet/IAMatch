# IA Match

Un jeu pour développer l'esprit critique face aux IA génératives : le joueur affirme ce qui le
distingue d'une IA (« Contrairement à une IA, … »), l'IA répond sans qu'on lui dicte de posture
puis relance en miroir (« Contrairement à un humain, je… »), et une synthèse analyse l'échange
après coup, jamais pendant la partie, pour ne pas influencer le match en cours. Deux objectifs :
voir si les affirmations du joueur reflètent une compréhension juste de ce qu'est un LLM, et
observer comment l'IA y réagit.

Projet [Une IA par jour](https://uneiaparjour.fr).

## Principe

1. **Configuration** : mode individuel ou collectif (le collectif suit ses propres 4 étapes
   chronométrées — réflexion individuelle, tirage au sort, amélioration collective, envoi — plutôt
   qu'une simple saisie libre), modèle de langage, nombre de tours (5 à 10), timer optionnel
   (individuel uniquement).
2. **Round de jeu** : appel à l'API Albert (DINUM) avec un system prompt limité à la forme
   (brièveté, pas de liste à puces), chronométré côté serveur (temps de réponse remonté au
   dashboard). La posture argumentative de l'IA (concéder ou contre-attaquer) reste libre, pour
   observer son comportement réel — sauf message hors-sujet (refus + redirection vers le format du
   jeu) ou détresse réelle (abandon du jeu, redirection vers une aide réelle : 3114, médecin de
   garde, SAMU selon le cas).
3. **Synthèse** : un second appel, avec cette fois un system prompt d'analyste, relit tout
   l'échange après coup : thème et score de compréhension des LLM de chaque affirmation,
   catégorie de réaction de l'IA (inspirée de la recherche sur la sycophantie des LLM, enrichie de
   catégories propres au jeu dont un faux positif de sécurité — voir
   [Fondements](frontend/fondements.html), qui documente aussi les limites méthodologiques de
   cette classification). Ce second appel utilise un modèle fixe (`ANALYST_MODEL`), indépendant
   du modèle de jeu choisi par le joueur, pour que les comparaisons entre modèles sur le dashboard
   ne mélangent pas comment un modèle joue et comment il juge.
4. **Dashboard public** : les échanges anonymisés (thème + score + catégorie + temps de réponse,
   jamais le texte) alimentent un tableau de bord agrégé, filtrable par modèle.

Pages de fond : [Anonymisation](frontend/anonymisation.html) · [Fondements](frontend/fondements.html) ·
[À propos de l'IA](frontend/a-propos-ia.html).

## Stack

- **Backend** : FastAPI (Python), relai vers l'[API Albert](https://albert.api.etalab.gouv.fr)
  (DINUM, infrastructure d'IA souveraine).
- **Frontend** : HTML/JS/CSS sans étape de build, servi directement par le backend.
- **Stockage** : SQLite en local (dev), migration vers Postgres prévue pour la production.

## Structure du repo

```
backend/
  app/main.py           API FastAPI (round, synthèse, modèles, dashboard)
  tests/                Tests unitaires (pytest)
frontend/
  index.html, app.js    Écran de configuration + jeu
  dashboard.html/js      Tableau de bord public
  anonymisation.html, fondements.html, a-propos-ia.html   Pages de fond
docs/brief/             Brief, notes scientifiques, checklists RGPD/AI Act
docs/prompts-systeme.md Copie exacte des system prompts (round de jeu, analyse)
docs/dashboard-archive/ Instantanés quotidiens du dashboard (la base SQLite
                        de prod est éphémère, repart à zéro à chaque déploiement)
```

## Lancer en local

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp ../.env.example ../.env   # puis renseigner ALBERT_API_KEY dans ce fichier
.venv/bin/uvicorn app.main:app --port 8000 --reload
```

Ouvrir `http://localhost:8000`.

## Tests

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
ALBERT_API_KEY=test-key .venv/bin/python -m pytest
```

## Licence

Contenu et code sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr),
[Une IA par jour](https://uneiaparjour.fr). Contact : contact@uneiaparjour.fr
