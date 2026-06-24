# AUDIT FOUNDRY VTT v14 — Hogwarts System (Harry Potter JdR)

**Date d'audit :** 22 juin 2026  
**Version du système :** 3.1.0  
**Foundry VTT vérifié :** 14.360  
**Auditeur :** GitHub Copilot (Claude Sonnet 4.6)

---

## 1. Résumé de l'état du système

Le système `hogwarts-system` est une implémentation Foundry VTT du jeu de rôle **Harry Potter JdR** (basé sur le système BRP/Chaosium, adapté par l'équipe geek-it.org). La version 3.1.0 utilise les APIs modernes de Foundry v14 (`ApplicationV2`, `HandlebarsApplicationMixin`, `TypeDataModel`) et est manifestement en bonne santé structurelle. Il n'y a pas d'incompatibilité bloquante avec Foundry v14.

**Points forts :**
- Architecture modulaire ES2020+ propre
- Modèles de données TypeDataModel (v14 natif)
- Feuilles ApplicationV2 avec `HandlebarsApplicationMixin` (v14 natif)
- Système de migration versionnée en place
- 8 caractéristiques BRP fidèles au jeu (FOR, CON, TAI, INT, PER, POU, DEX, APP)
- Système de résolution d100 avec 5 niveaux de réussite + tiers étendus (setting)
- Fougue (inversion des chiffres, coût 1 point)
- Stress (malus 0–25%, 6 niveaux visuels)
- 4 types d'Actor, 8 types d'Item
- i18n français + anglais présente

**Points faibles :**
- Plusieurs mécaniques fondamentales de HP-JdR sont absentes (filtrage sang/compétences, sorts instinctifs, bonus baguette, apprentissage de sort à 4 cas, Animagus, Quidditch, points de maison, duel magique)
- Le contenu des compendiums est inexistant ou très sparse
- Certaines mécaniques partielles manquent de logique (filtrage S/M, bonus baguette, progression d'année)

---

## 2. Sources utilisées

| Source | Utilisation |
|--------|-------------|
| Code source du projet (`f:\Github\HP-system\hogwarts-system\`) | Analyse complète de l'implémentation |
| `https://www.geek-it.org/harry-potter-jdr/` | Règles officielles (résumé + commentaires) |
| `https://www.geek-it.org/faq-harry-potter-jdr/` | Clarifications de règles |
| Foundry VTT v14 API (manifest vérifié `14.360`) | Compatibilité |
| PDFs `rules/` (binaires, non lisibles) | Non accessible — à traiter séparément |

---

## 3. Tableau des règles HP-JdR

| Domaine | Source | Règle ou contenu attendu | Implémentation actuelle | Statut | Fichier(s) concerné(s) | Action recommandée |
|---------|--------|--------------------------|-------------------------|--------|------------------------|-------------------|
| **Caractéristiques** | geek-it.org | 8 stats BRP : FOR, CON, TAI, INT, PER, POU, DEX, APP | Implémentées (stats.str/con/siz/int/per/pow/dex/app) | OK | `data/actor-character.mjs`, `data/base-actor.mjs` | — |
| **Caractéristiques** | geek-it.org | Génération : 2d6+6 par caractéristique (8 jets) | Pas de générateur automatique dans l'UI | Missing | `sheets/actor-sheet.mjs` | Ajouter bouton de génération dans l'onglet paramètres |
| **Caractéristiques dérivées** | geek-it.org | Idée (INT×5), Chance (POU×5), Percevoir (PER×5), etc. | Calculées dans `prepareDerivedData()` via `checks[key] = stat×5` | OK | `data/actor-character.mjs` | — |
| **Points de vie** | geek-it.org | PV max = (TAI+CON)/2, pool séparé non-létaux | `health.max = Math.floor((siz+con)/2)`, `healthNonLethal` | OK | `data/actor-character.mjs` | — |
| **Bonus aux dégâts** | geek-it.org | FOR+TAI ≤24: —, 25–32: +1d3, 33–40: +1d6, 41+: +2d6 | Implémenté dans `prepareDerivedData()` | OK | `data/actor-character.mjs` | — |
| **Statut du sang** | geek-it.org | sangpur=S uniquement, né-moldu=M uniquement, sang-mêlé=S+M sans base | Champ `bloodStatus` présent (muggleborn/halfblood/pureblood), mais aucun filtrage appliqué aux compétences | Partial | `data/actor-character.mjs`, `sheets/actor-sheet.mjs` | Implémenter le filtre dans `prepareData()` et l'affichage conditionnel dans la feuille |
| **Points de création** | geek-it.org | 400 points à distribuer dans les compétences | Champs `experience.creationPoints.max=400, spent` | OK | `data/actor-character.mjs` | — |
| **Points de Bonus Personnel (PBP)** | geek-it.org | 6 PBP pour acheter avantages, balai, familier, baguette améliorée | Champs `experience.personalBonusPoints.max=6, spent`, coût calculé auto | OK | `data/actor-character.mjs`, `sheets/actor-sheet.mjs` | — |
| **École autre que Poudlard** | geek-it.org | +1 PBP si autre école | Option `options.otherSchool` → +1 PBP dans l'UI | OK | `data/actor-character.mjs` | — |
| **Argent** | geek-it.org | Gallions, Serties (Sickles), Noises (Knuts) | `currency.galleons/sickles/knuts` | OK | `data/actor-character.mjs` | — |
| **Argent de départ** | FAQ | 15G standard, 50G riche, 100G fortuné, 5G pauvre | Pas de logique automatique, champs libres | Missing | `data/actor-character.mjs` | Ajouter note dans l'UI ou logique via avantage "Riche" |
| **Année scolaire** | geek-it.org | Années 1–7, progression | Champ `profile.year` (1–7) | OK | `data/actor-character.mjs` | — |
| **Max compétences scolaires** | geek-it.org | Max = (année−1)×15+30 | Calculé dynamiquement pour catégorie `school` | OK | `sheets/actor-sheet.mjs` | — |
| **Compétences générales** | geek-it.org | ~22 compétences générales avec base et max | Seeded depuis `CONFIG.HOGWARTS.skillPresets` | OK | `helpers/config.mjs`, `data/actor-character.mjs` | — |
| **Compétences de sorciers (S)** | geek-it.org | Accessibles aux sang-pur (avec base) et sang-mêlé (sans base) | Catégorie `wizard` présente dans skillPresets, mais pas de filtrage par bloodStatus | Partial | `data/actor-character.mjs`, `sheets/actor-sheet.mjs` | Appliquer filtre et effacer la valeur de base pour sang-mêlé |
| **Compétences moldues (M)** | geek-it.org | Accessibles aux né-moldu (avec base) et sang-mêlé (sans base) | Catégorie `muggle` présente, mais pas de filtrage | Partial | `data/actor-character.mjs`, `sheets/actor-sheet.mjs` | Idem |
| **Compétences scolaires** | geek-it.org | Non achetables à la création, progressent avec les cours | Catégorie `school`, non distribuables via CP | Partial | `sheets/actor-sheet.mjs` | Bloquer le champ CP pour les compétences scolaires dans l'UI |
| **Jet de compétence** | geek-it.org | 1d100 ≤ valeur → réussite | Implémenté, 5 niveaux : Critique(01-05), Extrême(≤valeur/5), Difficile(≤valeur/2), Réussite(≤valeur), Échec, Maladresse(96-00) | OK | `sheets/actor-sheet.mjs` | — |
| **Fougue (points d'héroïsme)** | geek-it.org | Inversion des chiffres d100 (73→37), coût 1 point | Implémenté, bouton dans chat | OK | `sheets/actor-sheet.mjs`, `hogwarts-system.mjs` | — |
| **Stress** | geek-it.org | Malus 0–25% sur tous les jets, 6 niveaux visuels | Champ `stress.value` (0–25), 6 niveaux visuels | Partial | `data/actor-character.mjs`, `sheets/actor-sheet.mjs` | Vérifier que le stress est bien soustrait lors du calcul de jet |
| **Initiative** | geek-it.org | 1d6 + DEX | Formula `1d6 + @stats.dex.value + @system.initiativeBonus` | OK | `hogwarts-system.mjs` | — |
| **Baguette** | geek-it.org | Bois, noyau, longueur, flexibilité, affinité → +10% dans compétence | Champs présents (wand.wood/core/length/flexibility/affinity/pbpCost) | Partial | `data/actor-character.mjs` | Calculer automatiquement le bonus d'affinité dans `prepareDerivedData()` |
| **Avantages / Désavantages** | geek-it.org | 8 types : fateBoon, fateBane, advantage, disadvantage, ability, abilityNatural, abilitySpecial, houseAxiom | Item type `feature` avec `perkType` (8 valeurs) + PBP cost | OK | `data/item-feature.mjs` | — |
| **Axiomes de maison** | geek-it.org | Chaque maison a un pack d'avantages/désavantages automatiques | Type `houseAxiom` présent, compendium `hogwarts-features` | Partial | `packs/hogwarts-features` | Vérifier et compléter le compendium avec les axiomes des 4 maisons |
| **Maladies / Blessures graves** | règles PDF | Blessure grave (flag) + Agonie (flag) | `conditions.seriousWound`, `conditions.agony` | OK | `data/base-actor.mjs` | — |
| **Sorts** | geek-it.org | Niveaux 0–6, malus, type (E/M/S/X), cibles (A/O/P/V/S/X), incantation | Item type `spell` avec tous ces champs | OK | `data/item-spell.mjs` | — |
| **Formule extrême** | geek-it.org | Version amplifiée d'un sort avec malus différent | `extremeFormula` + `malusExtremeFormula` | OK | `data/item-spell.mjs` | — |
| **Jet de sort** | geek-it.org | Jet via compétence scolaire (E, M, S) avec malus du sort | Action `rollSpell` dans la feuille | OK | `sheets/actor-sheet.mjs` | — |
| **Sorts appris avant l'école** | FAQ | Lancés avec POUvoir (instinctif), pas la compétence scolaire | Aucun flag `preSchool` sur les sorts | Missing | `data/item-spell.mjs`, `sheets/actor-sheet.mjs` | Ajouter champ `preSchool: BooleanField` sur les sorts + logique de jet avec POU×5 |
| **Apprentissage de sort (4 cas)** | FAQ/geek-it.org | Jet INT×5 − malus sort → Critique(01-05): maîtrise totale / Succès: sort appris / Échec: effets imprévus / Maladresse(96-00): blocage | Aucun jet d'apprentissage dédié | Missing | `sheets/actor-sheet.mjs`, `data/item-spell.mjs` | Ajouter action `learnSpell` avec ces 4 cas + message de chat |
| **Potions** | geek-it.org | Niveaux 1–6, malus, cibles, rareté ingrédients, liste ingrédients, fabrication | Item type `potion` avec tous ces champs | OK | `data/item-potion.mjs` | — |
| **Fabrication de potion** | geek-it.org | Jet dans compétence Potions avec malus, vérification ingrédients | Action `brewPotion`, méthode `canBrew()` | Partial | `data/item-potion.mjs`, `sheets/actor-sheet.mjs` | Ajouter la mécanique "Prêter assistance" (+10% par assistant) |
| **Prêter assistance** | FAQ | +10% par assistant (1/3 de leur compétence, partagé) dans la compétence maîtresse | Non implémenté | Missing | `sheets/actor-sheet.mjs` | Créer dialog d'assistance avant le jet de potion/sort |
| **Ingrédients** | geek-it.org | Composants avec rareté (commun/rare/rarissime) | Item type `component` avec `rarity`, quantité, coût, utilisations | OK | `data/item-component.mjs` | — |
| **Équipement** | geek-it.org | Objets divers avec quantité, poids, coût | Item type `gear` | OK | `data/item-gear.mjs` | — |
| **Armes** | geek-it.org | Corps-à-corps/à distance avec dommages, portée | Item type `weapon` avec `damage`, `weaponType`, `range` | OK | `data/item-weapon.mjs` | — |
| **Armures** | geek-it.org | Valeur d'armure 0–10 | Item type `armor` avec `armorValue` | OK | `data/item-armor.mjs` | — |
| **Balai** | geek-it.org | Modèle, caractéristiques, effets mécaniques | Item type `broom` avec marque, caractéristiques, effets | Partial | `data/item-broom.mjs` | Ajouter une liste de balais dans un compendium |
| **Duel magique** | geek-it.org | Initiative, déclaration d'intention, résolution, Protego en réaction prioritaire | Aucun système de duel dédié | Missing | `sheets/actor-sheet.mjs` | Implémenter mécanique de duel avec réaction Protego |
| **Combat physique** | geek-it.org | Initiative, déclaration, attaque/défense (parade/esquive) | Actions d'initiative, jet d'attaque, dégâts, dommages bonus | Partial | `sheets/actor-sheet.mjs` | Vérifier l'intégration avec le système de combat Foundry |
| **Familier** | geek-it.org | Lien PC↔familier, espèce, lien (faible/normal/fort), compétences propres | Actor type `familiar`, lien `linkedActor` + `familiar.bond`, 7 compétences par défaut | OK | `data/actor-familiar.mjs`, `data/actor-character.mjs` | — |
| **Créatures** | geek-it.org | Danger X à XXXXX, stats, mouvement tri-modal, résistance magique, attaques | Actor type `creature` avec tous ces champs | OK | `data/actor-creature.mjs` | — |
| **PNJ** | geek-it.org | Stats comme personnage, CR/XP, notes MJ | Actor type `npc` avec CR, XP calculé (CR²×100), notes GM | OK | `data/actor-npc.mjs` | — |
| **Animagus** | geek-it.org | Avantage Animagus (2 PBP), transformation jet POU×5, forme animale | Aucun champ ni mécanique Animagus | Missing | `data/actor-character.mjs`, `data/item-feature.mjs` | Ajouter champs `animagus` dans le modèle + action de transformation |
| **Quidditch** | geek-it.org | Positions, jets par position, initiative dans le match | Compétence `Quidditch` listée dans les skills, mais aucune mécanique de match | Missing | `sheets/actor-sheet.mjs` | Implémenter un système de match Quidditch (dialog ou scene) |
| **Points de maison** | geek-it.org | Gagner/perdre des points pour Gryffondor/Serpentard/Serdaigle/Poufsouffle | Aucun tracker de points de maison | Missing | `hogwarts-system.mjs` | Ajouter un Setting world `housePoints` ou un Actor dédié |
| **Légilimancie/Occlumencie** | geek-it.org | Capacités spéciales (avantage) | Aucune mécanique dédiée | Missing | `data/item-feature.mjs` | Ajouter comme Feature spéciale avec jet POUvoir |
| **Personnages hybrides** | geek-it.org | Avantage hybride (loup-garou, vampire) — 2 PBP | Type `abilitySpecial` dans Feature existe | Partial | `data/item-feature.mjs` | Ajouter des features hybrides dans le compendium |
| **Clubs scolaires** | geek-it.org | Bonus de compétences selon club (potions → potions, etc.) | Non implémenté | Missing | `sheets/actor-sheet.mjs` | Bas priorité — peut être géré comme Feature |
| **Mentorat** | geek-it.org | Disponible dès la 3e année, accélère l'apprentissage | Non implémenté | Missing | `sheets/actor-sheet.mjs` | Bas priorité — peut être géré comme Feature ou note |
| **Premier acte de magie** | geek-it.org | Sort instinctif avant l'école, jet POUvoir | Aucun système dédié | Missing | `sheets/actor-sheet.mjs` | Lié à l'implémentation des sorts pré-scolaires |
| **Effets actifs** | Foundry | Active Effects sur Actor et Item | `legacyTransferral = false`, helper `prepareActiveEffectCategories` | OK | `helpers/effects.mjs` | — |
| **Migrations** | Foundry | Migration des données entre versions | Migrations v3.0.0 (bio rename) et v3.1.0 (NPC/char seeding) | OK | `hogwarts-system.mjs` | — |

---

## 4. Tableau des fonctionnalités déjà implémentées

| Fonctionnalité | Fichier(s) | Notes |
|----------------|------------|-------|
| 8 caractéristiques BRP avec checks (stat×5) | `actor-character.mjs` | Correct |
| PV = (TAI+CON)/2, pool non-létaux | `actor-character.mjs` | Correct |
| Bonus aux dégâts (FOR+TAI) | `actor-character.mjs` | Correct |
| Stress (0–25%, 6 niveaux) | `actor-character.mjs` | Champ correct |
| Points de Fougue avec inversion d100 | `actor-sheet.mjs` | Correct |
| Jet 1d100 avec 5 niveaux de réussite | `actor-sheet.mjs` | Correct |
| Tiers étendus (Extreme/Hard) optionnels | `hogwarts-system.mjs` | Setting world |
| Initiative 1d6 + DEX + bonus | `hogwarts-system.mjs` | Correct |
| 4 types Actor + 8 types Item | `_module.mjs` | Correct |
| Modèles TypeDataModel (v14) | `data/*.mjs` | v14 natif |
| Feuilles ApplicationV2 (v14) | `sheets/*.mjs` | v14 natif |
| Active Effects | `effects.mjs` | Correct |
| Système de migration versionnée | `hogwarts-system.mjs` | En place |
| i18n fr.json + en.json | `lang/*.json` | Présent |
| Compendiums (structure) | `packs/*` | Structure présente |
| Profil personnage (année, maison, âge, archétype) | `actor-character.mjs` | Correct |
| 400 CP + 6 PBP (calcul automatique) | `actor-character.mjs` | Correct |
| Monnaie (Gallions/Serties/Noises) | `actor-character.mjs` | Correct |
| Baguette (données) | `actor-character.mjs` | Données OK, bonus manque |
| Familier lié | `actor-character.mjs`, `actor-familiar.mjs` | Correct |
| Thème CSS par maison | `hogwarts-system.css` | Correct |
| Sorts (niveaux, malus, type, cibles) | `item-spell.mjs` | Correct |
| Potions (niveaux, ingrédients, fabrication) | `item-potion.mjs` | Correct |
| Features (8 types perk) | `item-feature.mjs` | Correct |
| Armes, armures, équipement | `item-weapon.mjs`, etc. | Correct |
| Balais (données) | `item-broom.mjs` | Données OK |
| Créatures (X–XXXXX, résistance magique) | `actor-creature.mjs` | Correct |
| PNJ (CR, XP calculé) | `actor-npc.mjs` | Correct |
| Macros Foundry | `hogwarts-system.mjs` | Correct |

---

## 5. Tableau des fonctionnalités manquantes

| Fonctionnalité | Priorité | Fichier(s) à créer/modifier | Effort estimé |
|----------------|----------|------------------------------|---------------|
| Filtrage compétences S/M par statut sang | **P1** | `actor-character.mjs`, `actor-sheet.mjs` | Moyen |
| Sorts pré-scolaires (POUvoir) | **P1** | `item-spell.mjs`, `actor-sheet.mjs` | Faible |
| Bonus baguette automatique (+10%) | **P1** | `actor-character.mjs` | Faible |
| Jet d'apprentissage de sort (4 cas) | **P1** | `actor-sheet.mjs`, `item-spell.mjs` | Moyen |
| Dialogue de difficulté contextuelle | **P2** | `actor-sheet.mjs` | Faible |
| "Prêter assistance" (+10% par assistant) | **P2** | `actor-sheet.mjs` | Moyen |
| Duel magique (Protego en réaction) | **P2** | `actor-sheet.mjs` | Élevé |
| Animagus (transformation + forme animale) | **P2** | `actor-character.mjs`, `actor-sheet.mjs` | Élevé |
| Points de maison (tracker global) | **P2** | `hogwarts-system.mjs`, settings | Faible |
| Quidditch (système de match) | **P3** | Nouveau fichier + `actor-sheet.mjs` | Très élevé |
| Génération de stats (2d6+6) | **P3** | `actor-sheet.mjs` | Faible |
| Argent de départ automatique | **P3** | `actor-sheet.mjs` | Faible |
| Légilimancie/Occlumencie | **P3** | `item-feature.mjs`, compendium | Faible |
| Personnages hybrides (compendium) | **P3** | Compendium features | Faible |

---

## 6. Tableau des fonctionnalités incorrectes ou incomplètes

| Fonctionnalité | Problème | Fichier(s) | Correction recommandée |
|----------------|----------|------------|------------------------|
| Statut sang → compétences | Champ `bloodStatus` présent mais aucune logique de filtrage S/M | `actor-character.mjs` | Implémenter dans `prepareDerivedData()` |
| Stress → malus au jet | Le champ stress existe mais rien ne l'applique automatiquement aux jets | `actor-sheet.mjs` | Soustraire `stress.value` dans le calcul de la valeur effective lors du jet |
| Bonus baguette → compétence | `wand.affinity` stocké mais non traduit en bonus de compétence | `actor-character.mjs` | Mapper l'affinité vers la compétence scolaire concernée et ajouter +10% |
| Compétences scolaires → blocage CP | Non bloquées explicitement dans l'UI de distribution | `actor-sheet.mjs` | Désactiver le champ "dépenser CP" pour `category === 'school'` |
| Maladresse Foundry | Le seuil 96–00 pour maladresse est figé ; le système ne prend pas en compte que certains sorts très difficiles (malus 120%) pourraient forcer ce seuil à descendre | `actor-sheet.mjs` | Le seuil de maladresse dans HP-JdR reste 96–00, peu importe le malus — à documenter |
| TYPES.Item.component | La clé `component` (Ingrédient) est absente du `fr.json` TYPES.Item | `lang/fr.json` | Ajouter `"component": "Ingrédient"` |

---

## 7. Tableau des incompatibilités Foundry VTT v14

| Élément | Risque | Évaluation | Action requise |
|---------|--------|------------|----------------|
| `foundry.appv1.sheets.ActorSheet` | Faible | API `appv1` est le namespace v14 pour l'ancien AppV1 — correct | Vérifier que `foundry.appv1` existe bien à runtime |
| `foundry.applications.api.HandlebarsApplicationMixin` | Faible | API v14 — correct | — |
| `foundry.applications.sheets.ActorSheetV2` | Faible | API v14 — correct | — |
| `CONFIG.ActiveEffect.legacyTransferral = false` | Faible | Correct en v14 | — |
| `renderChatMessage` hook | Moyen | En v14 la signature est `(message, html)` mais `html` peut être un `HTMLElement` au lieu d'un objet jQuery | Vérifier et utiliser `querySelector` au lieu de sélecteurs jQuery |
| `game.settings.register` avec `type: String` | Faible | Standard Foundry | — |
| `static LOCALIZATION_PREFIXES` | Faible | Feature v14 native de TypeDataModel | — |
| `fields.SetField` pour les cibles de sort | Faible | Disponible en v14 | — |
| `CompendiumDocument.getIndex()` dans la migration | Faible | API standard | — |
| CSS dark theme variables | Faible | Compatible mais non testé en mode sombre Foundry v14 | Tester en mode sombre |
| `hotReload` flags dans system.json | Faible | Feature v14 — correct | — |
| `documentTypes` avec `htmlFields` dans system.json | Faible | Feature v14 — correct | — |
| `static DEFAULT_OPTIONS.actions` (ApplicationV2) | Faible | Correct en v14 | — |
| `form.submitOnChange: true` dans les sheets | Faible | Correct en v14 | — |

**Conclusion v14** : Le système est globalement compatible avec Foundry VTT v14. Le seul point d'attention réel est la gestion du hook `renderChatMessage` où `html` peut être un `HTMLElement` natif en v14 (pas jQuery).

---

## 8. Tableau des besoins de traduction

| Clé manquante | Catégorie | Valeur FR attendue | Valeur EN attendue |
|---------------|-----------|-------------------|-------------------|
| `TYPES.Item.component` | Types | Ingrédient | Ingredient |
| `HOGWARTS.Item.Spell.preSchool` | Sort | Sort instinctif (avant école) | Instinctive Spell (before school) |
| `HOGWARTS.Roll.Learn.Critical` | Apprentissage | Réussite Critique d'apprentissage | Critical Learning Success |
| `HOGWARTS.Roll.Learn.Success` | Apprentissage | Sort appris (pratique nécessaire) | Spell Learned (practice needed) |
| `HOGWARTS.Roll.Learn.Failure` | Apprentissage | Sort mal appris (effets imprévus) | Poorly Learned Spell (unexpected effects) |
| `HOGWARTS.Roll.Learn.Fumble` | Apprentissage | Maladresse ! Blocage psychologique | Fumble! Psychological Block |
| `HOGWARTS.Roll.Difficulty.VeryEasy` | Difficulté | Très facile (0%) | Very Easy (0%) |
| `HOGWARTS.Roll.Difficulty.Easy` | Difficulté | Facile (−10%) | Easy (−10%) |
| `HOGWARTS.Roll.Difficulty.Normal` | Difficulté | Moyen (−25%) | Normal (−25%) |
| `HOGWARTS.Roll.Difficulty.Hard` | Difficulté | Difficile (−50%) | Hard (−50%) |
| `HOGWARTS.Roll.Difficulty.Extreme` | Difficulté | Extrême (automatique) | Extreme (automatic fail) |
| `HOGWARTS.Roll.Assistance` | Assistance | Prêter assistance | Assist |
| `HOGWARTS.Actor.Animagus.label` | Animagus | Animagus | Animagus |
| `HOGWARTS.Actor.Animagus.animalForm` | Animagus | Forme animale | Animal Form |
| `HOGWARTS.Actor.Animagus.mastery` | Animagus | Maîtrise de la transformation | Transformation Mastery |
| `HOGWARTS.Actor.HousePoints.label` | Maison | Points de maison | House Points |
| `HOGWARTS.Quidditch.match` | Quidditch | Match de Quidditch | Quidditch Match |
| `HOGWARTS.Quidditch.positions.*` | Quidditch | Gardien, Poursuiveur, Batteur, Attrapeur | Keeper, Chaser, Beater, Seeker |
| `HOGWARTS.Duel.challenge` | Duel | Défi de duel | Duel Challenge |
| `HOGWARTS.Duel.protego` | Duel | Lancer Protego | Cast Protego |

---

## 9. Tableau des compendiums nécessaires

| Pack | Type | Contenu attendu | Statut actuel | Action recommandée |
|------|------|-----------------|---------------|-------------------|
| `hogwarts-features` | Item (feature) | Avantages des 4 maisons (axiomes), avantages/désavantages généraux (~30 entries) | Structure présente, contenu sparse | Compléter avec axiomes des 4 maisons + avantages communs |
| `hogwarts-spells` | Item (spell) | Sorts niveaux 0–6 classés par type (E/M/S), ~80+ entrées | Structure présente, contenu sparse | Compléter — en attente des PDFs |
| `hogwarts-potions` | Item (potion) | Potions niveaux 1–6 avec ingrédients | Structure présente, contenu sparse | Compléter — en attente des PDFs |
| `hogwarts-components` | Item (component) | Ingrédients de potions avec rareté et coût | Structure présente, contenu sparse | Compléter — en attente des PDFs |
| `hogwarts-creatures` | Actor (creature) | Créatures fantastiques classées X–XXXXX | Structure présente, contenu sparse | Compléter — en attente des PDFs |
| `hogwarts-gear` | Item (gear) | Fournitures scolaires avec prix en Gallions | **Absent** | Créer le pack + entrées de base |
| `hogwarts-brooms` | Item (broom) | Balais (Nimbus 2000, Eclair de Feu, etc.) avec stats | **Absent** | Créer le pack + entrées |
| `hogwarts-actors` | Actor (character) | 1–3 personnages prétirés pour l'introduction | **Absent** | Créer après réception des PDFs |
| `hogwarts-npcs` | Actor (npc) | PNJs types (professeurs, préfets, etc.) | **Absent** | Créer après réception des PDFs |

---

## 10. Priorités de correction

### Priorité 1 — Correctifs critiques (sans lesquels le système est incomplet)

1. **`renderChatMessage` en v14** — Vérifier que les boutons de chat fonctionnent avec l'API v14 (HTMLElement vs jQuery)
2. **Clé i18n manquante** — Ajouter `TYPES.Item.component` dans fr.json et en.json
3. **Stress soustrait des jets** — Appliquer automatiquement le malus de stress lors de chaque jet percentile
4. **Filtrage compétences S/M** — Implémenter la restriction selon `bloodStatus`
5. **Bonus baguette** — Calculer et afficher le bonus d'affinité dans la feuille
6. **Sorts instinctifs** — Ajouter flag `preSchool` et jet via POU×5
7. **4 cas d'apprentissage de sort** — Implémenter le jet d'apprentissage avec chat messages

### Priorité 2 — Fonctionnalités importantes du jeu

8. **Difficulté contextuelle** — Dialog de malus de difficulté avant chaque jet
9. **Prêter assistance** — Mécanique de bonus partagé
10. **Duel magique** — Réaction Protego prioritaire
11. **Animagus** — Champs + jet de transformation
12. **Points de maison** — Tracker simple dans les settings

### Priorité 3 — Contenu et enrichissement

13. **Quidditch** — Système de match complet
14. **Compendiums** — En attente des PDFs convertis
15. **Génération de stats** — Bouton 2d6+6
16. **Argent de départ** — Logique via avantage

---

## 11. Plan d'implémentation recommandé

### Sprint 1 — Fondations (1–2 jours)

- [ ] Fix `renderChatMessage` pour v14 (HTMLElement vs jQuery)
- [ ] Fix clé i18n `TYPES.Item.component`
- [ ] Appliquer le stress comme malus dans les jets
- [ ] Ajouter bonus baguette dans `prepareDerivedData()`
- [ ] Filtrage S/M des compétences selon bloodStatus
- [ ] Compléter i18n (clés manquantes de base)

### Sprint 2 — Magie (2–3 jours)

- [ ] Flag `preSchool` sur sorts + jet POUvoir
- [ ] Jet d'apprentissage de sort (4 cas)
- [ ] Dialog de difficulté contextuelle
- [ ] "Prêter assistance"

### Sprint 3 — Mécaniques avancées (3–5 jours)

- [ ] Duel magique + Protego en réaction
- [ ] Animagus (champs + jet)
- [ ] Points de maison (tracker)
- [ ] Quidditch (système de match)

### Sprint 4 — Contenu (variable selon PDFs)

- [ ] Compendiums (après réception des PDFs)
- [ ] Personnages prétirés
- [ ] Fournitures scolaires (`hogwarts-gear`)
- [ ] Balais (`hogwarts-brooms`)

---

## 12. Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| `foundry.appv1.sheets` absent en future version v14.x | Faible | Moyen | Surveiller les changelogs Foundry |
| Breakage de l'hook `renderChatMessage` (jQuery vs HTMLElement) | Moyenne | Élevé | Corriger immédiatement, tester avec un chat message réel |
| Migration de données existantes en cas de refonte du schéma | Moyenne | Élevé | Implémenter une migration versionnée avant tout changement de schéma |
| Performance des SetField pour les grandes listes de compétences | Faible | Faible | L'ArrayField actuel est suffisant |
| Compatibilité future du flag `hotReload` | Faible | Faible | — |

---

## 13. Risques liés au contenu protégé

Ce projet est déclaré à **usage privé uniquement**. Les éléments suivants comportent un risque de droit d'auteur si partagés publiquement :

- Noms de personnages canoniques (Harry Potter, Hermione Granger, Albus Dumbledore, etc.) — à utiliser uniquement comme exemples non-canoniques dans les prétirés
- Textes issus des PDFs Harry Potter JdR (geek-it.org) — reproduire uniquement les données mécaniques, pas les textes narratifs
- Noms de sorts issus de J.K. Rowling — utilisables dans un contexte de jeu privé

---

## 14. Références aux fichiers du projet

| Fichier | Rôle dans le système |
|---------|---------------------|
| [system.json](hogwarts-system/system.json) | Manifeste Foundry (v14, vérifié 14.360) |
| [module/hogwarts-system.mjs](hogwarts-system/module/hogwarts-system.mjs) | Point d'entrée, hooks Init/Ready, Handlebars, migration |
| [module/data/_module.mjs](hogwarts-system/module/data/_module.mjs) | Export centralisé des DataModels |
| [module/data/base-actor.mjs](hogwarts-system/module/data/base-actor.mjs) | Champs communs à tous les acteurs |
| [module/data/actor-character.mjs](hogwarts-system/module/data/actor-character.mjs) | Modèle personnage joueur |
| [module/data/actor-npc.mjs](hogwarts-system/module/data/actor-npc.mjs) | Modèle PNJ |
| [module/data/actor-familiar.mjs](hogwarts-system/module/data/actor-familiar.mjs) | Modèle familier |
| [module/data/actor-creature.mjs](hogwarts-system/module/data/actor-creature.mjs) | Modèle créature |
| [module/data/item-spell.mjs](hogwarts-system/module/data/item-spell.mjs) | Modèle sort |
| [module/data/item-potion.mjs](hogwarts-system/module/data/item-potion.mjs) | Modèle potion |
| [module/data/item-feature.mjs](hogwarts-system/module/data/item-feature.mjs) | Modèle avantage/désavantage |
| [module/data/item-broom.mjs](hogwarts-system/module/data/item-broom.mjs) | Modèle balai |
| [module/documents/actor.mjs](hogwarts-system/module/documents/actor.mjs) | Classe document Actor |
| [module/documents/item.mjs](hogwarts-system/module/documents/item.mjs) | Classe document Item |
| [module/sheets/actor-sheet.mjs](hogwarts-system/module/sheets/actor-sheet.mjs) | Feuille acteur (ApplicationV2) |
| [module/sheets/item-sheet.mjs](hogwarts-system/module/sheets/item-sheet.mjs) | Feuille objet (ApplicationV2) |
| [module/helpers/config.mjs](hogwarts-system/module/helpers/config.mjs) | Constants et skill presets |
| [module/helpers/effects.mjs](hogwarts-system/module/helpers/effects.mjs) | Active Effects helpers |
| [lang/fr.json](hogwarts-system/lang/fr.json) | Traductions françaises |
| [lang/en.json](hogwarts-system/lang/en.json) | Traductions anglaises |
| [css/hogwarts-system.css](hogwarts-system/css/hogwarts-system.css) | Styles + thèmes par maison |
| [packs/](hogwarts-system/packs/) | Compendiums LevelDB (5 packs) |

---

## 15. Instructions pour tester dans Foundry VTT v14

```
1. Ouvrir Foundry VTT v14
2. Installer le système depuis le dossier hogwarts-system/ (manifest URL ou dossier local)
3. Créer un monde de test avec ce système
4. Ouvrir la console (F12) — vérifier l'absence d'erreurs au chargement
5. Créer un Actor type "character" → ouvrir sa feuille → vérifier tous les onglets
6. Créer un Item type "spell" → l'ajouter à l'actor → cliquer "Lancer le sort"
7. Vérifier que les 5 niveaux de réussite s'affichent correctement dans le chat
8. Cliquer le bouton "Fougue" dans le message de chat → vérifier l'inversion
9. Changer la langue en français → vérifier que toutes les étiquettes sont en français
10. Ouvrir les compendiums → vérifier que les entrées apparaissent
```

---

*Rapport généré le 22 juin 2026 — Basé sur la version 3.1.0 du système, Foundry VTT v14.360*
