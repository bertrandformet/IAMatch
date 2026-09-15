# Check-list de conformité RGPD — IA Match

**Objet :** vérifier la conformité du traitement de données mis en œuvre par IA Match au regard du RGPD. Cette check-list s'inspire de la structure des référentiels CNIL (réponse vrai/faux, colonne "raison de la non-conformité"), avec les références légales correspondantes — mais ce n'est **pas** un référentiel CNIL officiel : IA Match ne relève d'aucun référentiel sectoriel existant.

**Toute réponse « Faux » signale un point à corriger avant mise en production, ou à documenter dans l'analyse d'impact si le risque est jugé acceptable.**

Les cases sont cochées à partir de ce qui a été arrêté dans le brief de développement (*prompt-claude-code-ia-match.md*) et de nos échanges. Une réponse « Vrai » reflète un engagement de conception déjà pris, pas encore une implémentation vérifiée — à recontrôler à la livraison.

---

## 1. Qualification du traitement

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Le traitement ne porte sur aucune donnée de santé, RH ou financière sensible. | Art. 9 RGPD | ☑ **Vrai** | — |
| Le traitement ne vise aucune décision individuelle automatisée produisant des effets juridiques ou similaires. | Art. 22 RGPD | ☑ **Vrai** | Le score/la synthèse sont un retour pédagogique immédiat, non retenus comme profil attaché à une personne. |

---

## 2. Finalités

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Les données sont collectées uniquement pour (a) faire fonctionner la partie en cours et (b) alimenter le dashboard méta agrégé et anonymisé. | Art. 5.1.b RGPD (limitation des finalités) | ☑ **Vrai** | — |
| Aucune donnée n'est exploitée à des fins de profilage individuel, prospection commerciale ou revente à un tiers. | Art. 5.1.b RGPD | ☑ **Vrai** | — |
| Les échanges de jeu ne sont pas réutilisés pour ré-entraîner un modèle sans base légale distincte et sans anonymisation préalable. | Art. 5.1.b et 6 RGPD | ☐ **Faux** | Conditions d'usage exactes des données par l'API Albert non vérifiées — à confirmer auprès de la DINUM avant mise en production. |

---

## 3. Base légale

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Une base légale est identifiée et formellement documentée, y compris le test de mise en balance des intérêts si l'intérêt légitime est retenu. | Art. 6.1.f RGPD | ☐ **Faux** | L'intérêt légitime est le candidat naturel (outil de sensibilisation sans compte ni donnée sensible) mais le test de mise en balance des intérêts n'est pas encore rédigé. |
| Si un compte ou une identification est ajoutée ultérieurement, la base légale est réévaluée avant mise en œuvre. | Art. 6 RGPD | ☑ **Vrai** | Engagement de principe pris pour toute évolution future du produit. |

---

## 4. Données collectées — minimisation

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Aucun nom réel, e-mail ou identifiant de compte n'est collecté (accès libre sans inscription). | Art. 5.1.c RGPD (minimisation) | ☑ **Vrai** | — |
| Aucune donnée sensible (Art. 9) n'est collectée, y compris de façon incidente dans le texte libre des piques. | Art. 9 RGPD | ☐ **Faux** | Risque résiduel non éliminable techniquement : un joueur peut toujours spontanément écrire une donnée sensible sur lui-même. Une mitigation existe désormais (pop-up de consentement obligatoire avant toute partie, voir section 8) mais elle réduit le risque plutôt que de l'éliminer — cette ligne reste donc « Faux » par nature. |
| Aucune donnée de genre n'est demandée pour l'avatar du joueur. | Art. 5.1.c RGPD | ☑ **Vrai** | — |
| Aucune adresse IP n'est conservée en lien avec une partie ou un échange. | Art. 5.1.c RGPD | ☐ **Faux** | Côté application, l'IP n'est jamais écrite en base : elle n'est lue que de façon transitoire, en mémoire, pour le rate-limiting anti-abus (voir `_enforce_rate_limit`), puis oubliée. Reste un point ouvert hors du contrôle applicatif : les journaux d'accès techniques que l'hébergeur (Render) peut conserver de son côté à des fins de sécurité, non traités dans le brief actuel. |
| Le contenu des piques et réponses IA n'est associé à aucun identifiant reliant plusieurs parties à la même personne. | Art. 5.1.c RGPD | ☑ **Vrai** | — |

---

## 5. Durées de conservation

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Une durée de conservation des échanges bruts (avant agrégation anonyme) est définie et documentée. | Art. 5.1.e RGPD (limitation de la conservation) | ☑ **Vrai** | Question devenue sans objet : l'implémentation n'a jamais de fenêtre de stockage d'« échanges bruts » à gérer — l'agrégation anonyme (thème, score, catégorie) est calculée de façon synchrone, dans le même appel serveur qui produit la classification. Le texte des piques/réponses n'est jamais écrit sur disque, à aucun moment, donc aucune durée de conservation à fixer. |
| Passé cette durée, seules les statistiques agrégées du dashboard méta sont conservées. | Art. 5.1.e RGPD | ☑ **Vrai** | Conséquence directe du point précédent : il n'y a jamais eu d'autre chose que les statistiques agrégées à conserver. |

---

## 6. Information des personnes

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Le joueur est informé, avant de commencer une partie, que ses échanges anonymisés alimentent un dashboard public. | Art. 12 et 13 RGPD | ☑ **Vrai** | Une pop-up de consentement obligatoire (frontend/index.html) s'affiche avant le lancement de toute partie et l'explique explicitement ; impossible de jouer sans cliquer « J'ai compris ». La page « Anonymisation » détaille le sujet et reste accessible en permanence via le footer (présent aussi sur l'écran d'accueil). |
| Cette information précise concrètement ce qui est capturé et ce qui ne l'est jamais. | Art. 13.1 RGPD | ☑ **Vrai** | Contenu prévu explicitement pour la page « Anonymisation » du brief. |

---

## 7. Droits des personnes

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Un moyen de contact est indiqué pour toute question relative aux données. | Art. 13.1.b RGPD | ☑ **Vrai** | contact@uneiaparjour.fr indiqué sur la page « Anonymisation » et dans le footer présent sur toutes les pages. |
| L'absence de droit d'accès/suppression individuel — de fait, puisqu'aucune donnée n'est identifiante — est explicitement expliquée plutôt que laissée implicite. | Art. 15-17 RGPD, considérant 57 | ☑ **Vrai** | Point prévu pour la page « Anonymisation ». |

---

## 8. Sécurité et mitigation du risque résiduel

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Les flux vers l'API Albert et le stockage sont chiffrés en transit (HTTPS/TLS). | Art. 32 RGPD | ☑ **Vrai** | Confirmé : le site est servi en HTTPS par Render, et l'API Albert est appelée en HTTPS (`ALBERT_BASE_URL`). |
| Les données stockées sont chiffrées au repos ou hébergées sur une infrastructure chiffrée par défaut. | Art. 32 RGPD | ☐ **Faux** | En production, le stockage est aujourd'hui du SQLite éphémère sur le tier gratuit Render (pas de disque persistant, effacé à chaque redéploiement) — pas de garantie de chiffrement au repos à proprement parler tant que ce n'est pas persistant. La migration vers Postgres/Supabase (chiffré au repos par défaut), annoncée dans le README, réglerait ce point pour un stockage réellement durable. |
| Une mesure de mitigation est prévue pour le risque de saisie spontanée de donnée sensible par un joueur. | Art. 5.1.c et Art. 9 RGPD | ☑ **Vrai** | La pop-up de consentement obligatoire (frontend/index.html) inclut un avertissement explicite : « Aucune donnée personnelle ne doit être transmise... ». Réduit le risque, ne l'élimine pas (voir section 4) — un joueur peut toujours passer outre. |

---

## 9. Sous-traitants et hébergement

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| L'unique fournisseur de génération IA est l'API Albert (DINUM), infrastructure souveraine française. | Art. 28 RGPD | ☑ **Vrai** | — |
| L'hébergeur retenu pour le stockage est situé dans l'Union européenne ou présente des garanties équivalentes. | Art. 28 et 44-49 RGPD | ☑ **Vrai** | Arbitrage tranché : Render, région Frankfurt (UE). L'option Hugging Face Space (hors UE par défaut) a été explicitement écartée pour cette raison. Migration vers Postgres/Supabase (également prévu en Frankfurt) encore à faire, mais l'hébergeur et sa localisation ne sont plus en question. |

---

## 10. Transferts hors Union européenne

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Aucune donnée n'est transférée hors UE, ou tout transfert repose sur un mécanisme conforme (pays adéquat, clauses contractuelles types). | Art. 44-46 RGPD ; carte des pays adéquats CNIL | ☑ **Vrai** | L'option Hugging Face Space (qui aurait posé ce risque) a été écartée. Hébergement (Render Frankfurt) et fournisseur IA (Albert, DINUM) sont tous deux situés dans l'UE — aucun transfert hors UE identifié à ce jour. |

---

## 11. Analyse d'impact sur la protection des données (AIPD)

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Le seuil de déclenchement d'une AIPD a été vérifié formellement. | Art. 35 RGPD ; lignes directrices CEPD (ex-G29, WP248) — grille des 9 critères, seuil CNIL à 2 critères réunis | ☐ **Faux** | Estimation rapide (non formalisée) : au moins deux des neuf critères semblent réunis — **personnes vulnérables** (le jeu reste ouvert « tous publics », sans mécanisme d'exclusion ni de vérification des mineurs) et **usage innovant** (analyse comportementale d'un LLM en temps réel). Mitigation partielle ajoutée depuis (pop-up de consentement, frontend/index.html) : un avertissement indique que le jeu s'adresse en priorité aux plus de 14 ans (seuil aligné sur le cadre d'usage de l'IA en éducation du ministère de l'Éducation nationale, juin 2025, qui autorise l'usage autonome d'IA générative à partir de la 4ème) et recommande un accompagnement adulte en dessous — un texte informatif, pas une vérification d'âge ni une exclusion, qui ne fait donc pas disparaître le critère « personnes vulnérables » de la grille. Une AIPD reste vraisemblablement recommandée, à documenter formellement plutôt qu'à écarter par supposition. |

---

## Synthèse des points ouverts (à trancher avant mise en production)

*Mise à jour après implémentation — points résolus retirés de cette liste, gardés comme « Vrai » documenté dans les sections ci-dessus plutôt que supprimés silencieusement.*

1. **AIPD probablement nécessaire** (section 11) — à documenter formellement ; le critère « personnes vulnérables » reste réuni malgré l'avertissement d'âge ajouté à la pop-up de consentement (information, pas exclusion ni vérification).
2. Journaux d'accès techniques que l'hébergeur (Render) peut conserver de son côté (section 4) — hors du contrôle applicatif, non traité dans le brief actuel.
3. Chiffrement au repos d'un stockage réellement persistant (section 8) — dépend de la migration SQLite → Postgres/Supabase, pas encore faite (le SQLite actuel est éphémère sur le tier gratuit Render, donc non persistant plutôt que non chiffré).
4. Test de mise en balance des intérêts pour la base légale d'intérêt légitime (section 3).

Résolus depuis la version initiale de cette checklist : mitigation de la saisie de données sensibles, durée de conservation des échanges bruts (devenue sans objet — voir section 5), visibilité de l'information avant partie, adresse de contact, chiffrement en transit (HTTPS confirmé), hébergeur et localisation UE (Render Frankfurt, Hugging Face écarté — sections 8, 9, 10).
