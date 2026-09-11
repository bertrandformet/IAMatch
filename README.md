# IA Match

Un jeu pour développer l'esprit critique face aux IA génératives : le joueur envoie des piques
commençant par « Moi au moins… », l'IA répond sans qu'on lui dicte de posture, puis une synthèse
analyse l'échange (qualité argumentative, réactions de l'IA) — jamais pendant la partie, pour ne
pas influencer le clash en cours.

Projet [Une IA par jour](https://uneiaparjour.fr).

## Principe

1. **Configuration** — mode individuel ou collectif, modèle de langage, nombre de tours (5 à 10),
   timer optionnel.
2. **Round de jeu** — appel à l'API Albert (DINUM) avec un system prompt limité à la forme
   (brièveté, ton direct et mordant) : la posture argumentative de l'IA (concéder ou
   contre-attaquer) reste libre, pour observer son comportement réel.
3. **Synthèse** — un second appel, avec cette fois un system prompt d'analyste, relit tout
   l'échange après coup : thème et spécificité de chaque pique, catégorie de réaction de l'IA
   (inspirée de la recherche sur la sycophantie des LLM — voir [Fondements](frontend/fondements.html)).
4. **Dashboard public** — les échanges anonymisés (thème + score + catégorie, jamais le texte)
   alimentent un tableau de bord agrégé, filtrable par modèle.

Pages de fond : [Anonymisation](frontend/anonymisation.html) · [Fondements](frontend/fondements.html) ·
[À propos de l'IA](frontend/a-propos-ia.html).

## Stack

- **Backend** : FastAPI (Python), relai vers l'[API Albert](https://albert.api.etalab.gouv.fr)
  (DINUM, infrastructure d'IA souveraine).
- **Frontend** : HTML/JS/CSS sans étape de build, servi directement par le backend.
- **Stockage** : SQLite en local (dev) — migration vers Postgres prévue pour la production.

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

Contenu et code sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr) —
[Une IA par jour](https://uneiaparjour.fr). Contact : contact@uneiaparjour.fr
