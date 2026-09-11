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
| Aucune donnée sensible (Art. 9) n'est collectée, y compris de façon incidente dans le texte libre des piques. | Art. 9 RGPD | ☐ **Faux** | Risque résiduel : un joueur peut spontanément écrire une donnée sensible sur lui-même — aucune mesure de mitigation prévue à ce stade (voir section 8). |
| Aucune donnée de genre n'est demandée pour l'avatar du joueur. | Art. 5.1.c RGPD | ☑ **Vrai** | — |
| Aucune adresse IP n'est conservée en lien avec une partie ou un échange. | Art. 5.1.c RGPD | ☐ **Faux** | Les logs serveur par défaut (ex. logs d'accès FastAPI) contiennent une IP — à exclure ou tronquer explicitement, non traité dans le brief actuel. |
| Le contenu des piques et réponses IA n'est associé à aucun identifiant reliant plusieurs parties à la même personne. | Art. 5.1.c RGPD | ☑ **Vrai** | — |

---

## 5. Durées de conservation

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Une durée de conservation des échanges bruts (avant agrégation anonyme) est définie et documentée. | Art. 5.1.e RGPD (limitation de la conservation) | ☐ **Faux** | Non fixée dans le brief actuel — à trancher avec Claude Code. |
| Passé cette durée, seules les statistiques agrégées du dashboard méta sont conservées. | Art. 5.1.e RGPD | ☐ **Faux** | Dépend directement du point précédent, non encore réalisable. |

---

## 6. Information des personnes

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Le joueur est informé, avant de commencer une partie, que ses échanges anonymisés alimentent un dashboard public. | Art. 12 et 13 RGPD | ☐ **Faux** | La page « Anonymisation » prévue au brief est en footer, pas nécessairement vue avant le lancement d'une partie — à corriger (ex. lien visible sur l'écran d'accueil, pas seulement en pied de page). |
| Cette information précise concrètement ce qui est capturé et ce qui ne l'est jamais. | Art. 13.1 RGPD | ☑ **Vrai** | Contenu prévu explicitement pour la page « Anonymisation » du brief. |

---

## 7. Droits des personnes

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Un moyen de contact est indiqué pour toute question relative aux données. | Art. 13.1.b RGPD | ☐ **Faux** | Non prévu dans le brief actuel — à ajouter (adresse générique suffisante, pas besoin d'un DPO dédié à ce stade). |
| L'absence de droit d'accès/suppression individuel — de fait, puisqu'aucune donnée n'est identifiante — est explicitement expliquée plutôt que laissée implicite. | Art. 15-17 RGPD, considérant 57 | ☑ **Vrai** | Point prévu pour la page « Anonymisation ». |

---

## 8. Sécurité et mitigation du risque résiduel

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Les flux vers l'API Albert et le stockage sont chiffrés en transit (HTTPS/TLS). | Art. 32 RGPD | ☐ **Faux** | Non explicitement confirmé — dépend de la configuration finale de l'hébergement backend, pas encore tranchée. |
| Les données stockées sont chiffrées au repos ou hébergées sur une infrastructure chiffrée par défaut. | Art. 32 RGPD | ☐ **Faux** | Dépend du choix d'hébergement (SQLite local / Supabase / Hugging Face Space), non arbitré. |
| Une mesure de mitigation est prévue pour le risque de saisie spontanée de donnée sensible par un joueur. | Art. 5.1.c et Art. 9 RGPD | ☐ **Faux** | Non couvert par le brief actuel — à ajouter (ex. mention explicite avant la partie : « n'écris pas d'information personnelle sensible »). |

---

## 9. Sous-traitants et hébergement

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| L'unique fournisseur de génération IA est l'API Albert (DINUM), infrastructure souveraine française. | Art. 28 RGPD | ☑ **Vrai** | — |
| L'hébergeur retenu pour le stockage est situé dans l'Union européenne ou présente des garanties équivalentes. | Art. 28 et 44-49 RGPD | ☐ **Faux** | Arbitrage encore ouvert (SQLite local / Postgres-Supabase / Hugging Face Space) — Hugging Face héberge par défaut hors UE sauf configuration spécifique. |

---

## 10. Transferts hors Union européenne

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Aucune donnée n'est transférée hors UE, ou tout transfert repose sur un mécanisme conforme (pays adéquat, clauses contractuelles types). | Art. 44-46 RGPD ; carte des pays adéquats CNIL | ☐ **Faux** | Point de vigilance direct si l'option Hugging Face Space est retenue pour l'hébergement — à trancher avant mise en production. |

---

## 11. Analyse d'impact sur la protection des données (AIPD)

| Critère | Référence | Réponse | Raison de la non-conformité |
|---|---|---|---|
| Le seuil de déclenchement d'une AIPD a été vérifié formellement. | Art. 35 RGPD ; lignes directrices CEPD (ex-G29, WP248) — grille des 9 critères, seuil CNIL à 2 critères réunis | ☐ **Faux** | Estimation rapide (non formalisée) : au moins deux des neuf critères semblent réunis — **personnes vulnérables** (le jeu est ouvert « tous publics » sans exclusion explicite des mineurs) et **usage innovant** (analyse comportementale d'un LLM en temps réel). Cela va à l'encontre de l'hypothèse initiale « probablement non requise » formulée plus tôt dans l'échange : une AIPD est vraisemblablement recommandée, à documenter formellement plutôt qu'à écarter par supposition. |

---

## Synthèse des points ouverts (à trancher avant mise en production)

1. **AIPD probablement nécessaire** (section 11) — à documenter formellement, notamment le critère « personnes vulnérables » si les mineurs ne sont pas explicitement exclus.
2. Mesure de mitigation pour la saisie spontanée de données sensibles par un joueur (sections 4 et 8).
3. Traitement des logs serveur bruts contenant une IP (section 4).
4. Durée de conservation des échanges bruts avant agrégation (section 5).
5. Visibilité de l'information avant le début de partie, pas seulement en footer (section 6).
6. Adresse de contact pour toute question relative aux données (section 7).
7. Choix final d'hébergement et sa localisation géographique (sections 8, 9, 10) — impacte directement plusieurs points de conformité si Hugging Face Space est retenu.
8. Test de mise en balance des intérêts pour la base légale d'intérêt légitime (section 3).
