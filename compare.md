# COMPARAISON RÈGLES vs SYSTÈME FOUNDRY VTT
## Harry Potter JdR v1.12 — Analyse des écarts

> **Fichiers sources :** `rules/md/Harry-Potter-JdR-v1.12.md` (29 694 lignes) + suppléments  
> **Système :** `hogwarts-system/` (Sprint 1 complété)  
> **Date :** Analyse complète des chapitres 1–28

---

## LÉGENDE
- ✅ **Correctement implémenté** — conforme aux règles
- ⚠️ **Partiellement implémenté / incorrect** — existe mais dévie des règles
- ❌ **Absent** — non implémenté du tout
- 🔧 **À faire** — priorité d'implémentation

---

## 1. CARACTÉRISTIQUES ET DÉRIVÉES (Ch. 1–2)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 8 statistiques (FOR, CON, TAI, PER, DEX, INT, APP, POU) | 2d6+6 chacune | Champs présents | ✅ |
| Malus d'âge | 11 ans = −5 ; diminue de 1/an | Non géré automatiquement | ❌ |
| PV max = ceil((TAI+CON)/2) | Arrondi au supérieur | Math.ceil implémenté | ✅ |
| Bonus aux dommages | 2–24=0 ; 25–32=+1d3 ; 33–40=+1d6 ; 41–60=+2d6 | Calcul présent | ✅ |
| Initiative = 1d6 + DEX | Standard BRP | Config système | ✅ |
| FOR/CON/TAI +1/an jusqu'à fin 5e année | Auto-évolution physique | Non automatisé | ❌ |
| Idée = INT×5 ; Chance = INT×5 | Dérivés standards | Présents dans le schéma | ✅ |
| Perception 5 sens : PER×3 (goût/odorat/toucher), PER×4 (ouïe), PER×5 (vue) | Règle additionnelle p.40 | Non implémenté | ❌ |
| Mouvement 8 m/round | Règle de base | Non exposé dans la fiche | ❌ |

---

## 2. COMPÉTENCES (Ch. 6)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 3 maîtrises : base / max / actuelle | Toutes distinctes | Champs base/max/value dans les skills | ✅ |
| Base scolaire = 0% (sauf Enchantements) | Fixe, non modifiable | `base` = 0 dans le schéma | ✅ |
| Max scolaire = 0% → 30% après 1re semaine → +15%/an → 100% | Progression stricte | Auto-calc approximatif (remplace 95 ou valeur précédente) | ⚠️ |
| Compétences bloquées à un max fixe (ex: Acrobatie/Quidditch 60%) | Max non augmentable sauf mentorat | Champ `max` editable sans restriction | ⚠️ |
| Mentorat : +5% base ET max par an, max 95% | Règle de mentorat | Non implémenté | ❌ |
| Compétences scolaires bloquées après 5e année | Cours optionnels uniquement en 6e/7e | Pas de vérification | ❌ |
| `excludeSchoolSkillsFromCP` | Setting pour exclure du total CP | Implémenté | ✅ |
| Filtrage sang : sang pur = pas de compétences moldues | Règle de sang | Implémenté (`unavailable`) | ✅ |
| Filtrage sang : né-moldu = pas de compétences sorciers | Règle de sang | Implémenté | ✅ |
| Sang-mêlé : accès aux deux listes, sans bonus de base | Pas de bonus de base supplémentaire | Implémenté (aucun bonus) | ✅ |
| Compétences Vol en balai et Acrobatie/Quidditch pour matchs | Utilisées en Quidditch | Présentes dans le schéma | ✅ |
| Compétences Duels, Occlumancie, Legilimancie (spécifiques) | Dès 3e année selon conditions | Présentes dans le schéma | ✅ |

---

## 3. JETS DE COMPÉTENCE ET COMBATS (Ch. 1–2)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Réussite si résultat ≤ compétence% | Standard BRP | Implémenté | ✅ |
| Critique : 01–05 | Fixe | Implémenté | ✅ |
| Fumble : 96–00 | Fixe | Implémenté | ✅ |
| Étendu : critique ≤ compétence/5 ; succès ≤ compétence/2 | Degrés de réussite | Math.ceil(target/5) et ceil(target/2) | ✅ |
| 3 phases de combat | Phases exposition / intention / résolution | Non modélisé (informatif) | ❌ |
| Opposition : 50% − (passive×5) + (active×5) | Table de résistance | Non implémenté dans le système | ❌ |
| Dégâts non-létaux trackés séparément | KO si non-létaux ≥ PV actuels | Non implémenté | ❌ |
| Blessure grave : perd ≥ ½ PV → jet CON×5 → KO si raté | (21−CON) minutes KO minimum | Non implémenté | ❌ |
| Agonie : 1 PV → jet CON×3/round | Sauvegarde mortelle | Non implémenté | ❌ |
| Récupération : 1d3/sem seul, 1d6/sem repos, 2d3/sem hôpital | Règle de récup | Non implémenté | ❌ |
| On ne peut pas parer/esquiver un sort | Règle combat magique | Non modélisé (pas de bouton dédié) | ❌ |
| Baguette : bonus +10% dans une discipline | Affinité de baguette | Non implémenté | ❌ |
| Sans baguette : −75% à la magie | Malus lourd | Non implémenté | ❌ |
| Sort informulé : −30% supplémentaire | Malus silencieux | Non implémenté | ❌ |

---

## 4. FOUGUE (Ch. 8)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 1 point en début de scénario | Gain initial | Implémenté | ✅ |
| Max 5 points | Plafond | Non limité dans le code | ⚠️ |
| Gain si critique sur action non-combat passionnée | Condition de gain | Implémenté (via note dans la fiche) | ✅ |
| Aucun gain en combat (même critique) | Règle de restriction | Non automatisé | ❌ |
| Usage : inverser dizaines et unités du résultat | Mécanique précise | Non automatisé (pas de bouton dédié) | ❌ |
| Échec avec fougue = traité comme fumble | Pénalité | Non automatisé | ❌ |
| Remise à 0 après chaque scénario | Reset | Non automatisé | ❌ |
| Duel : dépenser 1 fougue → relancer 1d6 + bonus +2 | Règle duel | Non implémenté | ❌ |

---

## 5. EXPÉRIENCE ET ÉVOLUTION (Ch. 7 + 25)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| XP scolaire : 1d6+1% par période (3 fois/an) | Gain automatique de compétence | Système de gestion XP partiel | ⚠️ |
| Bonus 1re semaine : +10% dans toutes les matières | Débloque les compétences scolaires | Non automatisé | ❌ |
| XP d'actions : réussite importante → coche → lancer d100 > compétence → 1d6+1 pts | Système de coches | Non implémenté (pas de case à cocher) | ❌ |
| À 90%+ : INT chance d'améliorer, +1 point seulement | Seuil de plafonnement | Non implémenté | ❌ |
| XP fin d'année : Année×2+1% + bonus roleplay/fougue/etc. | Calcul de fin de scénario | `_onResolveXP()` avec multiplicateurs AE | ⚠️ |
| Multiplicateurs XP via Active Effects (xp.multiplier.*, xp.bonus.*) | Extension homebrew | Implémenté | ✅ |
| Points de partage : 3–6 pts par joueur, redistribuables en fin de session | Règle additionnelle | Non implémenté | ❌ |
| Vacances : 1d10+1% dans compétences non-scolaires | Gain vacances | Non implémenté | ❌ |
| Lecture de livres : bonus de compétence | Tableau exhaustif p.75–82 | Non implémenté | ❌ |

---

## 6. HÉROÏSME ET FOUGUE — ERREUR DE VALEUR

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Usage fougue = **inverser dizaines et unités** | Règle exacte (p.87) | Implémenté comme description textuelle uniquement | ⚠️ |
| Duel : fougue = relancer d6 + **+2 en initiative** | Règle duel spécifique (p.204) | Non différencié du cas général | ❌ |

---

## 7. SORTILÈGES (Ch. 11–12)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 3 types : Enchantement (E), Mauvais Sort (S), Métamorphose (M) | Distinctions de catégorie | Champ `type` dans item-spell | ✅ |
| Niveau de sort 0–5+ | 6 niveaux | Champ `level` dans item-spell | ✅ |
| Malus FC appliqué à la compétence scolaire associée | Malus de difficulté max | Dialog de difficulté (`showDifficulty`) | ✅ |
| Formule extrême (FE) : malus plus élevé, effets améliorés | 2 modes de lancer | Non implémenté (pas de toggle FE/FC) | ❌ |
| Sorts pré-école : POUvoir×3 − malus | Règle avant scolarisation | `preSchool = true` → POW×3 | ✅ |
| Apprentissage : INT×5 − malus → 4 cas (critique/réussi/raté/raté critique) | Système d'apprentissage | `_onLearnSpell()` avec 4 cas | ✅ |
| Apprentissage en subissant un sort : tentative immédiate | Variante d'apprentissage | Non implémenté | ❌ |
| Sort supérieur à son année : malus supplémentaire, risques | Règle de niveau sup. | Non modélisé | ❌ |
| Sorts innés : automatiquement réussis, sans jet | Coup de pouce du destin | Non implémenté | ❌ |
| Durée variable : Niveau×POU | Calcul de durée | Non calculé automatiquement | ❌ |
| Durée volontaire, permanente, aléatoire, fixe | 5 types de durée | Champ texte libre | ⚠️ |
| Sous-type Maléfice : contre-sort général inefficace | Distinction maléfice | Non implémenté | ❌ |
| Incantation : formule à prononcer | Donnée | Champ `incantation` présent | ✅ |
| Cibles : A/O/P/V/S/X | Types de cibles | Champ `target` dans item-spell | ✅ |

---

## 8. POTIONS (Ch. 9–10)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Niveau 1–5, malus de fabrication | Difficulté | Champ `level` dans item-potion | ✅ |
| Cibles A/O/P/V/X | Types de cibles | Présent | ✅ |
| Malus max de fabrication | Malus de compétence | Non exposé dans la fiche de potion | ❌ |
| Ingrédients (Communs/Rares/Rarissimes) | 3 classes | Champ `rarity` dans item-component | ✅ |
| Temps de préparation | Variable par recette | Non implémenté | ❌ |
| Virulence (VIRulence : valeur pour les poisons) | Système de poison | Non implémenté | ❌ |
| Effets secondaires de fabrication ratée | Règle d'échec | Non implémenté | ❌ |
| Potion de vérification / Révélasort de Scarpin | Vérification de qualité | Non implémenté | ❌ |
| Création d'objets magiques (Ch. 14) : 5 potions spéciales (Duplication, Transfert, etc.) | Système de crafting | Non implémenté | ❌ |

---

## 9. ANIMAGUS (Ch. 16)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Avantage Animagus coûte −2 points de création | Coût de création | Documenté mais non géré automatiquement | ⚠️ |
| Compétence Animagus : base **10%** / max **80%** | Valeurs précises | `mastery` est un enum à 4 niveaux discrets | ⚠️ **INCORRECT** |
| La compétence évolue comme toute compétence (%) | Progression numérique | Enum n'est pas un % | ⚠️ **INCORRECT** |
| Forme animale déterminée lors de la 1re transformation | Ne peut pas être choisie | Champ `form` texte libre | ⚠️ |
| Transformation : booléen (transformé ou non) | État binaire | `transformed: BooleanField` | ✅ |
| Déclaré au Ministère : oui/non | État de déclaration | `declared: BooleanField` | ✅ |
| Process de 10 étapes pour devenir Animagus | Processus en jeu | Non géré comme workflow | ❌ |
| Ingrédient Potion d'Animagus (Chrysalide de Sphinx tête-de-mort) | Utilisé dans le processus | Présent dans la liste des ingrédients | ✅ |

---

## 10. AVANTAGES ET DÉSAVANTAGES (Ch. 4–5)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 6 points de création pour avantages/désavantages | Budget de création | Non géré comme budget auto | ❌ |
| Chanceux : zone critique 001–010 | Agrandit la zone critique | Non implémenté | ❌ |
| Érudition : +15% compétence intellectuelle + XP ×4/3 | Bonus XP | XP multiplier via AE existe | ⚠️ |
| Facilités en… : +10% matière scolaire + XP ×4/3 | Similaire à Érudition | Partiellement via AE | ⚠️ |
| Communicatif : +10% toutes compétences sociales | Bonus global | Non implémenté | ❌ |
| Initié au duel : +2 initiative en duels | Bonus duel | Non implémenté | ❌ |
| Formule extrême : maîtriser la FE du sort de départ | Avantage sur FE | FE non implémentée | ❌ |
| Premier de la classe : devoirs en 1/3 du temps, +24h lecture/semaine | Bonus scolaire | Non implémenté | ❌ |
| Hybride (½, ¼, ⅛) : ajustements caractéristiques + capacités magiques | Système d'hybrides | Non implémenté | ❌ |
| Croche-pattes du destin : coups durs pour le personnage | Désavantages actifs | Non implémenté | ❌ |
| Coups de pouce du destin : hérédité, famille riche, etc. | Avantages passifs | Non implémenté | ❌ |
| ~50 avantages/désavantages décrits dans les règles | Liste exhaustive | Aucun mécanisme AV/DES spécifique | ❌ |

---

## 11. ARCHÉTYPES ET SANG (Ch. 1 + création)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 6 archétypes : canaille, cérébral, honnête, manipulateur, naturaliste, sportif | Guides de création | Champ `archetype` présent | ✅ |
| Axiomes de maison : Gryffondor/Poufsouffle/Serdaigle/Serpentard | Bonus/malus psych. spécifiques | Données dans config mais non appliquées automatiquement | ⚠️ |
| Sang pur : 0% base moldues, accès uniquement sorciers | Filtrage | Implémenté | ✅ |
| Né-moldu : 0% base sorciers, accès uniquement moldu | Filtrage | Implémenté | ✅ |
| Sang-mêlé : accès aux deux, aucun bonus de base particulier | Neutre | Implémenté | ✅ |
| Argent de départ : 15 Gallions (normal), 50 (fortuné), 8 (fauché)… | 5 niveaux de fortune | Non implémenté | ❌ |
| 2 sorts gratuits à la création (sauf né-moldu) : 1 niveau-1 + 1 niveau-0 | Sorts de départ | Non automatisé | ❌ |
| 400 PC à distribuer dans les compétences | Budget de création | Non modélisé dans la fiche | ❌ |
| Création en 10 étapes | Workflow de création | Pas de wizard de création | ❌ |

---

## 12. POINTS DE MAISON (Ch. 24)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 4 maisons avec compteur de points | Structure | `housePoints` setting (Object) | ✅ |
| Gain/perte selon comportement (tables p.194–195) | Règles avec tables d'humeur | Non implémenté | ❌ |
| Punitions avec table d20 | Table de punitions | Non implémenté | ❌ |
| Quidditch → points de maison (victoire ≥ 150) | Liaison Quidditch → Points | Non automatisé | ❌ |
| Sabliers dans le hall de l'école | Visualisation | Pas de widget visuel | ❌ |
| Coupe des Quatre Maisons de fin d'année | Récompense annuelle | Non implémenté | ❌ |

---

## 13. DUEL MAGIQUE (Ch. 27)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Priorités : Innés (1) > Protection (2) > Informulés+3 (3) > Classiques (3) > FE−3 (4) | Ordre de résolution | Non implémenté | ❌ |
| Initiative duel : 1d6 + DEX + bonus club | Même que combat + bonus | Non différencié du combat classique | ❌ |
| 4 types de duel (a/b/c/d) | Types de conditions | Non implémenté | ❌ |
| Liste de sorts autorisés selon le type | Table de sorts de duel | Non implémenté | ❌ |
| Compétence Duels : bonus initiative (+1/an de pratique) | Progression via mentorat | Non implémenté | ❌ |
| Club de duel par maison | Organisation scolaire | Non implémenté | ❌ |

---

## 14. QUIDDITCH (Ch. 28)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 7 joueurs par équipe : 3 poursuiveurs, 2 batteurs, 1 gardien, 1 attrapeur | Structure équipe | Non implémenté | ❌ |
| Compétences : Acrobatie/Quidditch + Vol en balai | Deux compétences distinctes | Présentes dans le schéma | ✅ |
| Rounds d'action avec initiative (1d6 + DEX) | Comme combat | Non implémenté comme mini-jeu | ❌ |
| Repérer vif d'or : PER×3 (avec malus météo) | Jet de PER | Non implémenté | ❌ |
| Attraper vif d'or : DEX×1 | Jet de DEX | Non implémenté | ❌ |
| Vif d'or : 10% chance/round +5%/round jusqu'à 100% au round 20 | Apparition progressive | Non implémenté | ❌ |
| Cognard : 1d4−2 dégâts non-létaux + 1 létal | Dommages de Cognard | Non implémenté | ❌ |
| Points : souafle = 10 pts, vif d'or = 150 pts → points de maison | Liaison | Non implémenté | ❌ |
| Fautes : 12 fautes communes décrites | Règles sportives | Non implémenté | ❌ |

---

## 15. LEGILIMANCIE / OCCLUMANCIE (Ch. 15)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| Compétences Legilimancie / Occlumancie | Base 0%–50% (inné) / Max 95% | Présentes dans le schéma | ✅ |
| Sorts Legilimens (jet d'opposition) | Jet d'opposition POU/POU | Non implémenté comme action | ❌ |
| Innée (hérédité) : base 50%, max 95%, sans baguette | Cas spécial | Non géré automatiquement | ❌ |

---

## 16. HYBRIDES (Ch. 17)

| Élément | Règle | Système | Statut |
|---------|-------|---------|--------|
| 6 types d'hybrides (elfe, géant, gobelin, troll, vampire, vélane) | Ajustements de stats + capacités | Non implémenté | ❌ |
| 3 générations (½, ¼, ⅛) avec effets décroissants | Tabelles par race/génération | Non implémenté | ❌ |

---

## RÉSUMÉ DES PRIORITÉS 🔧

### Priorité HAUTE — Impact direct sur le gameplay courant

1. **Animagus mastery (ERREUR)** : Remplacer l'enum à 4 niveaux par un champ numérique `value` (0–80) comme toute compétence. La règle dit base 10%, max 80%.

2. **Fougue plafond à 5** : Ajouter une vérification `Math.min(current + 1, 5)` lors du gain de fougue.

3. **Dégâts non-létaux** : Ajouter un tracker de PV non-létaux sur la fiche personnage (séparé des PV létaux).

4. **Table de résistance** : Implémenter le calcul 50% − (passive×5) + (active×5) pour les jets d'opposition.

5. **Compétences scolaires max (précision)** : Remplacer la logique approximative par la formule exacte : `max = 30 + (année−1) × 15`, plafonné à 100%.

6. **Baguette (données)** : Ajouter sur la fiche un champ baguette avec affiliation et bonus +10%. Ne pas oublier le malus −75% sans baguette et −30% informulé.

### Priorité MOYENNE — Fonctionnalités importantes mais non bloquantes

7. **Formules extrêmes (FE)** : Ajouter un toggle FC/FE sur chaque sort avec affichage conditionnel des effets et malus.

8. **XP d'actions (coches)** : Ajouter une case à cocher sur chaque compétence pour marquer une réussite importante. En fin de session, un bouton lance les jets d'XP.

9. **Avantages/Désavantages** : Créer un onglet dédiés sur la fiche avec liste des avantages pris, gestion du budget de 6 points, effets via Active Effects.

10. **Blessures graves** : Implémenter le test automatique CON×5 quand les PV perdus ≥ ½ PV actuels, avec KO si raté.

11. **FOR/CON/TAI auto +1/an** : Automatiser le gain annuel basé sur `schoolYear` ≤ 5.

### Priorité BASSE — Enrichissement du système

12. **Mini-jeu Quidditch** : Dialog de match avec rounds d'action, jets DEX×1 / PER×3, gestion des Cognards.

13. **Duel magique** : Dialog de duel avec sélection de sorts de la liste autorisée, priorités, initiative.

14. **Points de maison interactifs** : Widget sur la scène/sidebar avec les 4 sabliers, boutons +/− avec motif (comportement, cours, Quidditch).

15. **Hybrides** : Nouveau type d'acteur ou sous-type avec tabelles des ajustements de stats et capacités.

16. **Potions complètes** : Ajouter malus de fabrication, virulence, liste d'ingrédients structurée, temps de préparation.

17. **Wizard de création de personnage** : Les 10 étapes de création (stats, sang, archétype, compétences, avantages, sorts, etc.).

18. **Argent et fortune** : Champ gallions/mornilles/noises + niveau de fortune initial.

---

## ERREURS À CORRIGER EN PRIORITÉ

### 1. `actor-character.mjs` — animagus.mastery

**Problème :** Le schéma définit `mastery` comme `StringField` avec 4 choix (none/basic/intermediate/advanced/master). Les règles définissent une compétence numérique base 10% / max 80%.

**Correction :**
```js
// Remplacer :
animagus: new foundry.data.fields.SchemaField({
  mastery: new foundry.data.fields.StringField({ choices: ['none','basic','intermediate','advanced'] }),
  ...
})
// Par :
animagus: new foundry.data.fields.SchemaField({
  skill: new foundry.data.fields.SchemaField({
    base: new foundry.data.fields.NumberField({ initial: 10, min: 0, max: 100 }),
    max: new foundry.data.fields.NumberField({ initial: 80, min: 0, max: 100 }),
    value: new foundry.data.fields.NumberField({ initial: 10, min: 0, max: 100 })
  }),
  ...
})
```

### 2. Fougue sans plafond

**Problème :** Le champ `fougue.value` peut dépasser 5.

**Correction :** Dans `actor-character.mjs`, `prepareDerivedData()`, ajouter :
```js
this.system.fougue.value = Math.min(this.system.fougue.value, 5);
```

### 3. PreSchool vs Sorts innés

**Problème :** Les règles font une distinction entre :
- Sorts appris **avant l'école** (`preSchool`) → POUvoir×3 − malus du sort ✓ (correct dans notre implémentation)
- Sorts **innés** (coup de pouce du destin) → automatiquement réussis, pas de jet, pas de malus baguette

Le flag `preSchool` est correct pour le cas 1. Le cas 2 (sorts innés) n'est pas encore géré.

---

## NOTES SUR LES SUPPLÉMENTS

- **Bestiaire des animaux fantastiques** (21 935 lignes) : Aucune donnée de créature n'est chargée dans les compendiums `hogwarts-creatures`. Les actors de type `creature` existent mais sans données.
- **Grimoire des sortilèges et potions v1.11** (8 497 lignes) : Les compendiums `hogwarts-spells` et `hogwarts-potions` sont vides. Les sorts et potions doivent être peuplés depuis ce grimoire.
- **Maladies, Blessures, Empoisonnements, Malédictions** (12 228 lignes) : Aucun système de maladie/blessure grave structuré. Lié à l'absence des règles de blessures graves dans le système.
- **Encyclopédie des Esprits, Êtres et Non-Êtres** (7 364 lignes) : Nécessaire pour les hybrides (Ch. 17) et la Legilimancie/Occlumancie.
