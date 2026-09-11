# Note de synthèse — Fondements scientifiques du dispositif « Moi au moins »

**Objet :** ancrer scientifiquement chaque brique du dispositif en ligne « Moi au moins » (jeu d'argumentation homme/IA, réponses non dirigées, synthèse dirigée, score, analyse méta des tendances du modèle), destiné à un public large (grand public, ateliers citoyens, milieu associatif, éducation), afin de disposer d'une justification robuste et non impressionniste.

---

## 1. Analyser les piques du joueur — théorie de l'argumentation

**Référence pivot : Toulmin, S. (1958), *The Uses of Argument*, Cambridge University Press.**

Le modèle de Toulmin reste la référence dominante en analyse de discours argumentatif. Il décompose un argument en six éléments : la *claim* (l'assertion à prouver), le *ground/evidence* (les faits mobilisés), le *warrant* (le lien logique implicite entre la preuve et la claim), le *backing* (ce qui soutient le warrant), les *qualifiers* (nuances, limites) et le *rebuttal* (anticipation des objections).

**Application au dispositif :** chaque « Moi au moins » est une *claim*. Le score de qualité argumentative peut évaluer objectivement si le joueur explicite son *warrant* (le lien entre le critère invoqué — corps, émotion, autonomie — et la conclusion « je suis différent de l'IA ») ou s'il reste implicite. C'est une mesure reproductible, pas un jugement au doigt mouillé.

---

## 2. Classifier les réponses de l'IA — recherche sur la sycophantie des LLM

**Référence pivot : Sharma, M., Tong, M., Korbak, T. et al. (2023), « Towards Understanding Sycophancy in Language Models », Anthropic, publié à ICLR 2024.**

Cette étude — menée par des chercheurs d'Anthropic — identifie quatre comportements de sycophantie, devenus la grille de référence pour la recherche ultérieure sur le sujet :
1. **Feedback sycophancy** : noter plus favorablement un texte en croyant qu'il vient de l'utilisateur.
2. **« Are you sure? » sycophancy** : revenir sur une réponse correcte quand l'utilisateur exprime un doute.
3. **Answer sycophancy** : biaiser une réponse libre vers ce que l'utilisateur semble vouloir entendre.
4. **Mimicry sycophancy** : répéter les erreurs factuelles ou grammaticales de l'utilisateur.

Les auteurs montrent que ces comportements sont cohérents à travers plusieurs assistants IA différents, ce qui suggère une propriété générale de l'entraînement par RLHF (apprentissage par renforcement à partir de feedback humain) plutôt qu'un trait idiosyncratique d'un système particulier.

**Application au dispositif :** cette typologie à 4 catégories (+ éventuellement « concession légitime » et « contre-argument » comme catégories complémentaires propres au jeu) sert de **grille de codage validée** pour l'étape d'analyse méta — au lieu d'inventer des catégories ad hoc.

---

## 3. Métacognition — fondements francophones

- **Flavell, J. H. (1979)**, introducteur du concept de métacognition en psychologie du développement ; synthétisé en français par des méta-analyses récentes interrogeant son lien avec l'intelligence (*La Recherche*, n°545, 2019).
- **Grangeat, M. & Meirieu, P. (dir.) (1997), *La métacognition, une aide au travail des élèves*, ESF éditeur** — référence pédagogique française centrale sur le rôle de la métacognition dans la réussite scolaire. Grangeat a poursuivi ce travail avec une étude sur les régulations métacognitives dans l'activité enseignante (*Revue des sciences de l'éducation*, 36(1), 2010).
- **Kariger, J. & De Kesel, M., « Analyse de l'influence de pauses métacognitives sur l'évolution de compétences critiques développées dans le cadre de l'enseignement des sciences fondé sur l'investigation »**, *Recherches en didactique des sciences et des technologies* (revue belge francophone). Étude exploratoire montrant que l'insertion de pauses métacognitives (avant l'émission d'hypothèses et lors de l'interprétation) renforce le développement de la pensée critique — présentée explicitement comme un enjeu face aux fake news.

**Application au dispositif :** l'étape « synthèse finale » du jeu est précisément une pause métacognitive au sens de Kariger & De Kesel — c'est elle qui transforme l'échange ludique en prise de recul critique, pas le jeu lui-même.

---

## 4. Double processus cognitif et temps de réponse

- **Kahneman, D. (2011), *Thinking, Fast and Slow*, Farrar, Straus and Giroux** — popularise la distinction Système 1 (rapide, intuitif, heuristique) / Système 2 (lent, réflexif, coûteux), en s'appuyant sur les travaux antérieurs d'Evans & Stanovich sur les théories à double processus.
- **Borst, G. (Université Paris Cité, LaPsyDÉ — CNRS)** — professeur de psychologie du développement et neurosciences cognitives de l'éducation. Ses travaux portent sur le contrôle inhibiteur comme mécanisme central du développement cognitif : la capacité à résister à des automatismes de pensée (« penser contre soi-même ») explique pourquoi enfants, adolescents et adultes commettent des erreurs de raisonnement même simples. Borst relie explicitement ce contrôle cognitif à la capacité à distinguer vraies et fausses informations, dans des contextes où Système 1 et Système 2 sont en conflit — travaux présentés notamment lors de sa conférence « Apprendre à penser par et contre soi-même, une compétence critique pour relever les défis du 21ème siècle » (2021).

**Application au dispositif :** un temps de réponse contraint pour le joueur active préférentiellement le Système 1 — intéressant pour révéler les représentations spontanées plutôt que construites. Côté IA, l'équivalent fonctionnel est le raisonnement étendu (*extended thinking*) activé ou non avant la réponse : cela donne une variable manipulable et mesurable (temps × catégorie d'argument × mode de raisonnement de l'IA), donc un vrai design à plusieurs variables plutôt qu'une notation intuitive.

---

## 5. Charge cognitive et évaluation critique de l'information

**Référence pivot : Tricot, A. (Laboratoire Epsylon, Université Paul-Valéry Montpellier 3) ; Chanquoy, L., Tricot, A. & Sweller, J. (2007), *La charge cognitive : théorie et applications*, Armand Colin.**

Tricot travaille depuis les années 1990 sur les processus cognitifs de recherche et d'évaluation d'information dans les documents numériques, en particulier le cycle évaluation → sélection → traitement de l'information (avec Rouet, J.-F., *Les hypermédias, approches cognitives et ergonomiques*, 1998). 

**Application au dispositif :** ce cadre est directement réutilisable pour l'étape de synthèse dirigée, qui est fondamentalement une tâche d'évaluation critique d'un contenu généré.

---

## 6. Psychologie de l'anthropomorphisme — pourquoi on « discute » avec une IA

- **Cadre CASA (Computers Are Social Actors)** — établit que les comportements sociaux et prosociaux envers des agents informatiques sont déclenchés par la présence d'indices sociaux, en particulier l'anthropomorphisme de l'agent, même en l'absence de tout corps physique.

**Application au dispositif :** utile pour le debrief final — pourquoi le joueur a-t-il l'impression d'« affronter » un interlocuteur pendant le clash, alors qu'il n'y a ni corps, ni intentionnalité, ni enjeu pour l'IA ? C'est un point d'ancrage direct avec les items « corps » et « émotions » déjà testés dans notre partie.

---

## 7. Cadre de littératie IA — positionnement institutionnel

**Référence pivot : UNESCO (2024), *AI Competency Framework for Students*, Miao, F. & Shiohira, K., Paris, UNESCO. DOI : 10.54675/JKJB9835. Disponible en français.**

Référentiel structuré en 12 compétences réparties sur 4 dimensions — posture centrée sur l'humain, éthique de l'IA, techniques et applications de l'IA, conception de systèmes d'IA — selon trois niveaux de progression (comprendre, appliquer, créer). Le référentiel insiste explicitement sur le jugement critique face aux solutions d'IA et sur la conscience des responsabilités citoyennes à l'ère de l'IA.

**Application au dispositif :** le jeu se positionne sur la dimension « posture centrée sur l'humain », niveau « appliquer » — utile pour l'ancrage institutionnel du projet.

---

## 8. Éducation fondée sur des preuves — posture méthodologique globale

**Référence : Ramus, F. (CNRS, Laboratoire de Sciences Cognitives et Psycholinguistique, ENS Paris ; membre du Conseil scientifique de l'Éducation nationale).**

Ramus défend une approche d'« éducation fondée sur des preuves » (*evidence-based education*), qui distingue rigoureusement les apports réels de la recherche en psychologie cognitive et en sciences de l'éducation des effets de mode pseudo-scientifiques (dont l'usage abusif du préfixe « neuro »). Position développée notamment lors de sa conférence « Evidence-based education » (ENS Paris-Saclay, 2022) et dans ses interventions publiques sur les sciences cognitives appliquées aux apprentissages.

**Application au dispositif :** cette exigence méthodologique est précisément ce qui justifie la démarche de cette note — construire le dispositif sur des références vérifiables plutôt que sur des intuitions, aussi bien intentionnées soient-elles.

---

## Tableau récapitulatif

| Brique du dispositif | Cadre scientifique mobilisé | Auteur(s) clé(s) |
|---|---|---|
| Score de qualité argumentative | Modèle de l'argumentation | Toulmin (1958) |
| Classification des réponses IA | Recherche sur la sycophantie des LLM | Sharma et al. (2023, Anthropic) |
| Étape de synthèse finale | Pause métacognitive | Flavell (1979) ; Grangeat & Meirieu (1997) ; Kariger & De Kesel |
| Timer / mode réflexe vs délibéré | Double processus cognitif, contrôle inhibiteur | Kahneman (2011) ; Borst (LaPsyDÉ-CNRS) |
| Grille d'évaluation critique | Charge cognitive, évaluation de l'information | Tricot ; Chanquoy, Tricot & Sweller (2007) |
| Debrief sur la relation joueur/IA | Anthropomorphisme, cadre CASA | Nass & Moon (2000) |
| Positionnement institutionnel | Référentiel de littératie IA | UNESCO (2024) |
| Posture méthodologique générale | Éducation fondée sur des preuves | Ramus (CNRS, CSEN) |

---

## Bibliographie

- Borst, G. — Laboratoire de Psychologie du Développement et de l'Éducation de l'enfant (LaPsyDÉ, CNRS UMR 8240), Université Paris Cité.
- Chanquoy, L., Tricot, A. & Sweller, J. (2007). *La charge cognitive : théorie et applications*. Paris : Armand Colin.
- Evans, J. St. B. T. & Stanovich, K. E. (2013). Dual-Process Theories of Higher Cognition: Advancing the Debate. *Perspectives on Psychological Science*, 8(3), 223–241.
- Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. *American Psychologist*, 34(10), 906–911.
- Grangeat, M. & Meirieu, P. (dir.) (1997). *La métacognition, une aide au travail des élèves*. Paris : ESF éditeur.
- Grangeat, M. (2010). Les régulations métacognitives dans l'activité enseignante : rôle et modes de développement. *Revue des sciences de l'éducation*, 36(1), 233–253.
- Kahneman, D. (2011). *Thinking, Fast and Slow*. New York : Farrar, Straus and Giroux.
- Kariger, J. & De Kesel, M. Analyse de l'influence de pauses métacognitives sur l'évolution de compétences critiques développées dans le cadre de l'enseignement des sciences fondé sur l'investigation. *Recherches en didactique des sciences et des technologies*, n°28, p. 75-114.
- Miao, F. & Shiohira, K. (2024). *AI Competency Framework for Students*. Paris : UNESCO. DOI : 10.54675/JKJB9835.
- Nass, C. & Moon, Y. (2000). Machines and Mindlessness: Social Responses to Computers. *Journal of Social Issues*, 56(1), 81–103.
- Ramus, F. — CNRS, Laboratoire de Sciences Cognitives et Psycholinguistique, École Normale Supérieure de Paris ; membre du Conseil scientifique de l'Éducation nationale.
- Rouet, J.-F. & Tricot, A. (1998). Chercher de l'information dans un hypertexte : vers un modèle des processus cognitifs. In A. Tricot & J.-F. Rouet (dir.), *Les hypermédias, approches cognitives et ergonomiques* (pp. 57-74). Paris : Hermès.
- Sharma, M., Tong, M., Korbak, T., Duvenaud, D., Askell, A., Bowman, S. R. et al. (2023). Towards Understanding Sycophancy in Language Models. *ICLR 2024*. Anthropic.
- Toulmin, S. (1958). *The Uses of Argument*. Cambridge : Cambridge University Press.
- Tricot, A. — Laboratoire Epsylon, Université Paul-Valéry Montpellier 3.

---

## Sources en ligne (URLs de vérification)

- **Sharma et al. (2023)** — arXiv : https://arxiv.org/abs/2310.13548 (article complet, version ICLR 2024)
- **Kariger & De Kesel** — OpenEdition, *Recherches en didactique des sciences et des technologies*, n°28 : https://journals.openedition.org/rdst/5166
- **Borst — conférence « Apprendre à penser par et contre soi-même »** (9 février 2021, Académie de Paris) :
  - Support de conférence : https://ac-paris.fr/media/25415/download
  - Fiche de présentation : https://www.ac-paris.fr/gregoire-borst-apprendre-a-penser-par-et-contre-soi-meme-126032
- **Ramus — conférence « Evidence-based education »** (20 octobre 2022, ENS Paris-Saclay) :
  - Fiche conférence : https://ens-paris-saclay.fr/en/node/8562
  - Cycle 2022/2023 : https://ens-paris-saclay.fr/en/node/8415
  - Conférence complémentaire (Dijon, académie de Dijon/CARDIE, sur les neurosciences et l'éducation fondée sur des preuves) : https://ludomag.com/?p=25579
- **Miao & Shiohira (2024), UNESCO** — DOI : https://doi.org/10.54675/JKJB9835
- **Evans & Stanovich (2013)** — SAGE Journals : https://journals.sagepub.com/toc/ppsa/8/3 (article en libre accès PDF : https://scottbarrykaufman.com///wp-content/uploads/2014/04/dual-process-theory-Evans_Stanovich_PoPS13.pdf)
- **Nass & Moon (2000) / cadre CASA** :
  - Synthèse (Wikipedia, avec liens vers les articles originaux Nass et al. 1994 et Nass & Moon 2000) : https://en.wikipedia.org/wiki/Computers_are_social_actors
  - Article original 1994 (ACM) : https://dl.acm.org/doi/10.1145/191666.191703
  - Article Nass & Moon 2000 (Journal of Social Issues) : https://spssi.onlinelibrary.wiley.com/doi/10.1111/0022-4537.00153
- **Toulmin (1958), Kahneman (2011), Chanquoy/Tricot/Sweller (2007), Rouet & Tricot (1998), Grangeat & Meirieu (1997)** : ouvrages imprimés, pas d'URL de consultation libre — références à vérifier en bibliothèque universitaire ou via le catalogue Sudoc.
- **Grangeat (2010)** — Érudit : https://www.erudit.org/fr/revues/rse/ (rechercher « régulations métacognitives dans l'activité enseignante », vol. 36, n°1)

---

*Note préparée pour appuyer la conception du dispositif « Moi au moins » (jeu d'argumentation homme/IA à visée de littératie IA critique).*
