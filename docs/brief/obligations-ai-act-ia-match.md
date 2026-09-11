# Obligations AI Act — IA Match

**Source :** résultats du EU AI Act Compliance Checker officiel (Commission européenne, outil bêta), appliqués à IA Match. L'outil précise lui-même que ses résultats sont informatifs, ne constituent pas un conseil juridique, et ne représentent pas une évaluation de la Commission européenne — à garder en tête pour tout usage institutionnel de ce document.

---

## 1. Qualification et rôle

| Point | Résultat du checker | Référence |
|---|---|---|
| IA Match est-il un système d'IA au sens du règlement ? | Oui — le jeu infère, à partir des réponses du joueur, des sorties (réponses, score, classification) qui influencent l'environnement virtuel de l'échange. | Art. 3(1) ; Considérant 12 |
| Votre rôle | **Fournisseur** ("provider") | Art. 3(3) |
| Champ d'application | Couvert par le règlement (système mis en service dans l'UE, opérateur établi dans l'UE). | Art. 3(1) |

**Point d'attention sur le rôle** : IA Match intègre l'API Albert (DINUM) comme modèle sous-jacent. Le rôle de « fournisseur » porte ici sur le **système** IA Match (l'interface de jeu, la logique de score, le dashboard) — pas sur le modèle Albert lui-même, dont les obligations de modèle à usage général (GPAI) relèvent du fournisseur du modèle (DINUM), pas de vous. C'est cohérent avec la logique de l'outil officiel : « si un modèle est intégré dans votre système, les obligations pour le modèle s'appliquent en plus de celles pour le système » (Considérant 97).

---

## 2. Niveau de risque

| Point | Résultat du checker | Référence |
|---|---|---|
| IA Match relève-t-il d'un des huit domaines de l'Annexe III (infrastructures critiques, biométrie, éducation/formation professionnelle, emploi, services essentiels, application de la loi, migration, justice/processus démocratiques) ? | Non identifié dans les résultats transmis — à confirmer explicitement, le domaine « éducation et formation professionnelle » étant le plus proche d'IA Match sans pour autant le recouvrir : le jeu ne conditionne ni l'accès à une formation, ni l'évaluation ou l'orientation d'un élève, il reste un outil de sensibilisation autonome. | Art. 6(2) ; Annexe III |
| Niveau de risque | **Minimal / non élevé** — IA Match n'est probablement pas un système à haut risque. | — |

**Point de vigilance à documenter, pas à écarter par supposition** (même logique que pour l'AIPD RGPD) : si IA Match est un jour intégré formellement à un programme scolaire noté ou conditionnant une évaluation d'élève, la qualification « éducation et formation professionnelle » de l'Annexe III redeviendrait pertinente et changerait le niveau de risque. Tant que l'usage reste un jeu de sensibilisation libre, sans lien avec une évaluation scolaire formelle, le niveau minimal tient.

---

## 3. Pratiques interdites (Art. 5)

Aucune des pratiques interdites listées par le checker ne s'applique a priori à IA Match (pas de manipulation subliminale, pas de scoring social, pas de reconnaissance d'émotion en milieu scolaire/professionnel, pas de biométrie, pas de contenu à caractère sexuel non consenti). Point à vérifier spécifiquement : **reconnaissance d'émotion en milieu éducatif** (Art. 5) — IA Match n'en fait pas usage (le jeu classe des arguments, pas des émotions du joueur), mais à garder explicitement à l'esprit si une fonctionnalité d'analyse du ton ou de l'état émotionnel du joueur était envisagée plus tard : ce serait alors potentiellement couvert par l'interdiction si utilisé en contexte scolaire.

---

## 4. Obligations de transparence (Art. 50) — directement applicables

C'est la section la plus concrète pour IA Match : le système **interagit directement avec des personnes physiques** et **génère du texte synthétique** — les deux critères déclenchant l'Art. 50.

| Obligation | Référence | Application à IA Match |
|---|---|---|
| Informer la personne qu'elle interagit avec un système d'IA, sauf si c'est évident du point de vue d'une personne raisonnablement informée. | Art. 50 ; Considérant 132 | Probablement déjà couvert par le principe même du jeu (le joueur sait qu'il clashe une IA), mais **à rendre explicite quand même** pour ne pas reposer sur une présomption : une phrase claire sur l'écran d'accueil ("vous allez échanger avec un modèle de langage (IA)") sécurise ce point plutôt que de le supposer acquis. |
| Marquer les contenus générés par IA dans un format lisible par machine et détectable comme générés/manipulés artificiellement. | Art. 50 ; Considérant 133 | **Nouvelle exigence à ajouter au brief Claude Code** — les réponses de l'IA affichées dans l'interface (bulles de droite) doivent être techniquement marquées comme contenu généré (ex. métadonnée dans le flux de données, attribut HTML `data-ai-generated`, ou mention explicite au niveau du message). L'obligation porte sur une solution technique fiable et interopérable « dans la mesure où cela est techniquement faisable » — donc proportionnée à un outil de cette taille, pas un système de watermarking cryptographique complexe. |
| Information fournie de façon claire et distincte, au plus tard au moment de la première interaction. | Art. 50 | À intégrer à l'écran d'accueil, pas seulement à la page footer « Anonymisation » — même remarque que pour l'information RGPD (section 6 de la check-list RGPD). |

---

## 5. Culture de l'IA du personnel (Art. 4)

| Obligation | Référence | Application à IA Match |
|---|---|---|
| Mesures pour soutenir le développement de la culture de l'IA du personnel et des personnes opérant ou utilisant le système pour votre compte. | Art. 4 | Concerne les personnes qui **animent** IA Match (ex. lors d'un atelier, d'un café IA) plutôt que les joueurs eux-mêmes — obligation de moyens, pas de résultat garanti sur un niveau individuel. Si des animateurs encadrent des sessions collectives, prévoir un support minimal (une page ou une notice courte) expliquant le fonctionnement du système et ses limites. |

---

## 6. Synthèse — ce qui doit être ajouté au brief Claude Code

1. **Marquage technique des contenus générés par l'IA** (Art. 50) — nouvelle exigence, absente du brief actuel.
2. **Mention explicite « vous interagissez avec une IA »** sur l'écran d'accueil, avant toute partie — à coupler avec l'information RGPD déjà prévue (section 6 de la check-list RGPD), plutôt que de créer deux mentions séparées.
3. **Support minimal pour les animateurs** de sessions collectives (Art. 4) — une notice courte sur le fonctionnement du système.
4. **Point de vigilance à surveiller dans le temps**, pas à traiter maintenant : si IA Match était un jour intégré à une évaluation scolaire formelle, requalifier le niveau de risque (Annexe III, domaine éducation).

*Rappel : ces résultats proviennent d'un outil officiel mais explicitement qualifié de non-juridiquement engageant par la Commission européenne elle-même. Pour un usage institutionnel, une vérification par un service juridique reste recommandée avant mise en production, notamment sur le point 3 (Annexe III éducation).*
