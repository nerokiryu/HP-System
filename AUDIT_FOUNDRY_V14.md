# AUDIT TECHNIQUE — Conformité Foundry VTT v14

**Système :** `hogwarts-system` v3.1.0
**Compatibilité déclarée :** minimum `14` · vérifié `14.360`
**Commit audité :** `cf0b986`
**Date :** 7 septembre 2026
**Périmètre :** conformité aux API et pratiques Foundry VTT v14.
La fidélité aux règles du jeu est traitée séparément dans [compare.md](compare.md).

---

## 1. Résumé exécutif

L'architecture du système est **saine et moderne** : `ApplicationV2` +
`HandlebarsApplicationMixin`, `TypeDataModel` pour tous les types de documents, espaces de noms
`foundry.*` correctement utilisés dans la quasi-totalité du code, système de migration versionné
opérationnel. Il n'existe **aucune incompatibilité bloquante** avec Foundry v14.

Les problèmes se répartissent en trois familles, par ordre de gravité décroissante :

| # | Famille | Gravité | Constat |
|---|---------|---------|---------|
| 1 | **Contenu des compendiums** | 🔴 Bloquant | Les données des packs contredisent massivement les livres sources : **52 % des sorts appariés ont au moins un champ faux**, 11 documents sont des déchets d'extraction, et la couverture plafonne à 74 % (sorts) / 46 % (potions) / 59 % (ingrédients). Voir §7. |
| 2 | **Deux API dépréciées** | 🟠 Majeur | `renderChatMessage` et l'accès global à `TextEditor` — les deux cassent silencieusement, sans erreur visible. Voir §6 et §10. |
| 3 | **Distribution & finition** | 🟡 Mineur | Manifeste non publiable (`manifest`/`download` vides), `trackableAttributes` absent, quelques chaînes non localisées. Voir §3 et §8. |

**Verdict :** le système *fonctionne* sous v14, mais il n'est ni **distribuable** (§3) ni
**fiable sur le plan des données** (§7). Le point 1 est de très loin le plus coûteux et le plus
urgent — il rend le contenu livré inutilisable en l'état pour jouer conformément aux règles.

---

## 2. Méthode

- **Analyse statique** de l'intégralité de `hogwarts-system/` (hors `node_modules/`).
- **Comparaison programmatique** des documents JSON des packs contre les données structurées
  extraites des livres dans `rules/md/` (le Grimoire est un fichier machine-lisible : voir §7).
- **Documentation officielle** consultée : [Introduction to System
  Development](https://foundryvtt.com/article/system-development/), [API
  v13](https://foundryvtt.com/api/v13/), [wiki communautaire
  ApplicationV2](https://foundryvtt.wiki/en/development/api/applicationv2).

Chaque constat porte un identifiant (`T-nn`), une gravité, et une référence `fichier:ligne`.
Les points qui ne peuvent **pas** être tranchés sans exécuter le système sont marqués
🧪 **NON VÉRIFIÉ** et regroupés dans la checklist du §13.

**Gravités :** 🔴 Bloquant · 🟠 Majeur · 🟡 Mineur · ⚪ Information

---

## 3. Manifeste (`system.json`)

### Conforme

| Champ | Valeur | Commentaire |
|-------|--------|-------------|
| `id` | `hogwarts-system` | Correspond au nom du dossier ✅ |
| `compatibility` | `{minimum: "14", verified: "14.360"}` | Forme correcte ✅ |
| `esmodules` | `["module/hogwarts-system.mjs"]` | Préféré à `scripts` ✅ |
| `documentTypes` | 4 Actors, 8 Items, avec `htmlFields` | Obligatoire pour les DataModels ✅ |
| `packs` | 5 packs, `system` et `ownership` renseignés | ✅ |
| `packFolders` | Arborescence à 2 niveaux, couleurs | Fonctionnalité v12+ correctement employée ✅ |
| `flags.hotReload` | `css`, `html`, `hbs`, `json` | Confort de développement ✅ |
| `grid` | `{type: 1, distance: 1, units: "m", diagonals: 0}` | ✅ |

### Constats

**T-01** 🟠 **Manifeste non publiable — `manifest` et `download` vides**
`url`, `bugs`, `manifest` et `download` sont tous des chaînes vides.

> Conséquence : installation par URL de manifeste **impossible**, et Foundry ne peut pas détecter
> les mises à jour. Le système ne peut être distribué que par copie manuelle d'un `.zip`.
> D'après la documentation officielle, `manifest` doit être une **URL stable** pointant vers la
> dernière version, sans quoi « updates will not be detected ».

**T-02** 🟠 **`secondaryTokenAttribute: "fougue"` n'existe que sur le type `character`**
Les DataModels `npc`, `familiar` et `creature` ne définissent aucun champ `fougue`. La deuxième
barre de ressource du prototype Token sera donc vide pour trois des quatre types d'Acteur.

**T-03** 🟡 **`CONFIG.Actor.trackableAttributes` n'est jamais défini**
Le système ne déclare que `primaryTokenAttribute`/`secondaryTokenAttribute` dans le manifeste.
Sans `trackableAttributes`, l'interface de configuration des barres de Token ne propose pas de
liste organisée par type d'acteur (`health`, `fougue`, `stress`, `healthNonLethal`…).
La documentation officielle recommande explicitement cette configuration dans le hook `init`.

**T-04** ⚪ **`filePathFields` non utilisé**
Aucun type de document ne déclare de `filePathFields`. Sans incidence tant qu'aucun champ de
chemin de fichier n'est stocké dans `system`, mais à prévoir si des illustrations de créatures
sont ajoutées (cf. **T-17**).

---

## 4. Architecture applicative

### Conforme ✅

| Élément | Implémentation | Référence |
|---------|----------------|-----------|
| Feuilles | `HandlebarsApplicationMixin(sheets.ActorSheetV2)` / `ItemSheetV2` | [actor-sheet.mjs:3](hogwarts-system/module/sheets/actor-sheet.mjs#L3) |
| Espaces de noms | `const { api, sheets } = foundry.applications` | [actor-sheet.mjs:3](hogwarts-system/module/sheets/actor-sheet.mjs#L3) |
| Collections | `foundry.documents.collections.Actors.registerSheet` | [hogwarts-system.mjs:12](hogwarts-system/module/hogwarts-system.mjs#L12), [79](hogwarts-system/module/hogwarts-system.mjs#L79) |
| Modèles de données | `TypeDataModel` + `defineSchema()` + `LOCALIZATION_PREFIXES` | `module/data/*.mjs` |
| Dialogues | `foundry.applications.api.DialogV2.prompt` | [actor-sheet.mjs:1331](hogwarts-system/module/sheets/actor-sheet.mjs#L1331), [1779](hogwarts-system/module/sheets/actor-sheet.mjs#L1779) |
| Sélecteur de fichier | `foundry.applications.apps.FilePicker.implementation` | [actor-sheet.mjs:841](hogwarts-system/module/sheets/actor-sheet.mjs#L841) |
| Glisser-déposer | `foundry.applications.ux.DragDrop` | [item-sheet.mjs:4](hogwarts-system/module/sheets/item-sheet.mjs#L4) |
| Utilitaires | `foundry.utils.mergeObject` (jamais le global `mergeObject`) | [actor-sheet.mjs:2308](hogwarts-system/module/sheets/actor-sheet.mjs#L2308) |
| Actions | `static DEFAULT_OPTIONS.actions` + `data-action` | [actor-sheet.mjs:86](hogwarts-system/module/sheets/actor-sheet.mjs#L86) |
| Parties | `static PARTS` avec `scrollable` | `module/sheets/*.mjs` |

C'est une base **à jour** : aucune trace des classes V1 (`ActorSheet`, `ItemSheet`, `Dialog`), ni
d'appels globaux à `mergeObject`, `loadTemplates` ou `Actors` hors espace de noms.

### Constats

**T-05** 🟡 **Migration : la logique vit dans l'entrée du système, pas dans les DataModels**
Les deux migrations (`v3.0.0` renommage `system.biography` → `system.bio` ; `v3.1.0` amorçage des
défauts PNJ et ajout `fougue`/`stress`/`movement`) sont exécutées au hook `ready` via un réglage
`migrationVersion`. Ce schéma fonctionne, mais la documentation officielle recommande
`static migrateData(source)` sur le DataModel pour les transformations de forme de données :
`migrateData` s'applique aussi aux documents **des compendiums** et aux documents importés, que le
migrateur au `ready` ne touche jamais.

> Conséquence concrète : un monde qui importe un vieil acteur depuis un `.json` externe ou un
> compendium tiers ne sera pas migré.

---

## 5. Pipeline de préparation et Active Effects

Ordre imposé par Foundry : `prepareData()` → `prepareBaseData()` → `applyActiveEffects()` →
`prepareDerivedData()`.

### Corrections déjà en place ✅

Le commit `cf0b986` a résolu deux bugs réels et non triviaux ; ils sont **corrects** et doivent
être conservés :

1. **`super.prepareBaseData()`** dans [actor.mjs](hogwarts-system/module/documents/actor.mjs) —
   sans cet appel, `Actor#prepareBaseData` n'exécute pas `_clearData()`, qui réinitialise
   l'ensemble privé des **phases d'Active Effect** à chaque cycle de préparation. Le symptôme était
   une exception « phase has already completed » à chaque mise à jour après la première.
2. **`_applySkillActiveEffects()`** — les DataModels recalculent `skill.value = base + spent` dans
   `prepareDerivedData`, donc **après** l'application des Active Effects, écrasant tout effet
   ciblant `system.skills.N.value`. Le correctif réapplique sélectivement ces changements.

**T-06** ⚪ **Le correctif `_applySkillActiveEffects()` est un contournement, pas le motif officiel**
Le motif recommandé consiste à séparer la valeur **source** de la valeur **dérivée** : calculer
`base + spent` dans `prepareBaseData()` (donc *avant* les effets), et réserver
`prepareDerivedData()` aux bornages (`Math.clamp`) qui ne détruisent pas la contribution des
effets. Le contournement actuel fonctionne mais applique certains changements **deux fois** si un
effet cible à la fois `system.skills.N.base` et `system.skills.N.value`, et il ignore les modes
`UPGRADE`/`DOWNGRADE` dont la sémantique dépend de l'ordre d'application.

> Non bloquant. À traiter lors d'une refonte du calcul des compétences, pas en urgence.

---

## 6. Jets, dés et messages de chat

### Conforme ✅

- `await roll.evaluate()` partout — pas de `evaluate({async: true})` déprécié.
- Les objets `Roll` sont attachés à `ChatMessage.create({ rolls: [...] })`, ce qui produit de
  vrais messages de jet (animation Dice So Nice, détail au survol).
- `rollMode: game.settings.get('core', 'rollMode')` respecté.
- Formule d'initiative déclarée via `CONFIG.Combat.initiative` :
  `'1d6 + @stats.dex.value + @system.initiativeBonus'`
  ([hogwarts-system.mjs:49](hogwarts-system/module/hogwarts-system.mjs#L49)).

### Constats

**T-07** 🟠 **Hook `renderChatMessage` déprécié**
[hogwarts-system.mjs:388](hogwarts-system/module/hogwarts-system.mjs#L388)

```js
Hooks.on('renderChatMessage', (message, html) => {   // ❌ déprécié en v13
```

Depuis la v13, le hook est **`renderChatMessageHTML`**, avec une signature différente :
`(message, html: HTMLElement, context)`. L'ancien hook passait un objet **jQuery** ; le nouveau
passe un **`HTMLElement`** natif. Le code du callback devra donc être converti
(`html.find(...)` → `html.querySelectorAll(...)`).

> **Impact fonctionnel si le hook ne se déclenche plus :** les boutons *Appliquer les dégâts*,
> *Appliquer les soins* et *Utiliser la fougue* deviennent **inertes**. Il n'y a aucun message
> d'erreur — les boutons s'affichent et ne font simplement rien.
> 🧪 **NON VÉRIFIÉ** : savoir si `renderChatMessage` est encore émis (déprécié) ou **supprimé**
> en 14.360. Voir la checklist §13, tests R-1 à R-3.

**T-08** 🟠 **Accès global à `TextEditor`**
[item-sheet.mjs:161](hogwarts-system/module/sheets/item-sheet.mjs#L161)

```js
context.enrichedDescription = await TextEditor.enrichHTML(   // ❌ global déprécié
```

`TextEditor` a été déplacé sous `foundry.applications.ux.TextEditor`. La forme correcte est
d'ailleurs **déjà employée** dans l'autre feuille — quatre fois :
[actor-sheet.mjs:318](hogwarts-system/module/sheets/actor-sheet.mjs#L318),
[329](hogwarts-system/module/sheets/actor-sheet.mjs#L329),
[337](hogwarts-system/module/sheets/actor-sheet.mjs#L337),
[345](hogwarts-system/module/sheets/actor-sheet.mjs#L345). Il s'agit donc d'une **incohérence
interne**, pas d'un choix.

> **Impact :** la description enrichie des objets (liens `@UUID`, jets en ligne `[[/r 1d6]]`) cesse
> de fonctionner dès que le shim global est retiré.

---

## 7. Compendiums — 🔴 Le problème principal

### 7.1 Les livres sources sont des données structurées

`rules/md/Grimoire-des-sortileges-potions-et-ingredients-V1.11.md` **n'est pas du texte libre** :
c'est une extraction structurée et lisible par machine, avec des enregistrements typés.

| Contenu | Clés disponibles | Nombre canonique |
|---------|------------------|------------------|
| Sorts | `nom`, `niveau`, `type`, `incantation`, `cibles`, `malus`, `effets`, `maitrise` | **366** |
| Potions | `nom`, `niveau`, `cibles`, `malus`, `effets`, `ingredients`, `rarete_ingredients`, `apprise` | **139** |
| Ingrédients | `nom`, `rarete`, `possede`, `description`, `utilise_pour_les_potions`, `autres_utilisations` | **310** |

Le Bestiaire contient **134** blocs de statistiques, l'Encyclopédie **31** de plus.

**C'est le fait le plus important de cet audit :** les packs n'auraient jamais dû être saisis à la
main, et ne devraient pas être corrigés à la main.

### 7.2 Mesure de l'écart

Comparaison programmatique de chaque document JSON avec son entrée canonique (appariement par
incantation puis par nom) :

| Pack | Docs JSON | Appariés | **Non appariables** | **≥ 1 champ faux** | **Couverture** |
|------|-----------|----------|---------------------|--------------------|----------------|
| Sorts | 292 | 281 | **11** | **145 / 281 = 52 %** | 271 / 366 = **74 %** |
| Potions | 85 | 69 | **16** | 18 / 69 = 26 % | 64 / 139 = **46 %** |
| Ingrédients | 200 | 185 | **15** | 3 / 185 = 2 % | 184 / 310 = **59 %** |
| Créatures | 129 | — | — | — | 129 / 134 (+ 31 de l'Encyclopédie absents) |

Détail par champ, sur les 281 sorts appariés :

| Champ | Erreurs | Taux |
|-------|---------|------|
| `malus` | 101 | **36 %** |
| `target` (cibles) | 67 | **24 %** |
| `extremeFormula` | 20 | 7 % |
| `spellLevel` | 17 | 6 % |
| `name` | 15 | 5 % |
| `spellType` | 7 | 2 % |

### 7.3 Constats

**T-09** 🔴 **Les valeurs mécaniques des sorts contredisent le Grimoire**
Trois exemples vérifiés, représentatifs :

| Document | Champ | Valeur livrée | **Valeur canonique** |
|----------|-------|---------------|----------------------|
| `sp2002Protego.json` | niveau · type · malus | 2 · `E` · −10 | **4 · `S` · FC 40 % / FE 30 %-50 %** |
| `sp2001Expelliarm.json` | malus · `extremeFormula` | −10 · `true` | **FC 20 % · pas de formule extrême** |
| `sp1001Lumos.json` | cibles | `O` | **`X`** |

**T-10** 🔴 **11 documents de sorts sont des déchets d'extraction**
Leur champ `name` est un fragment de phrase, pas un nom de sort. Exemples relevés :
`"Maléfice du lancent tous avec leur malus maximal"`,
`"Sortilège de le second et le second en le premier."`,
`"Permet de faire léviter un arbre. Celui-ci suit ensuite le sorcier tant qu'il"`.
Ces documents apparaîtront tels quels dans le compendium en jeu.
Idem pour 16 potions et 15 ingrédients non appariables.

**T-11** 🔴 **Les noms des sorts sont réinventés**
`sp2002Protego` est nommé « Charme du bouclier » alors que le Grimoire l'appelle **« Protection »** ;
`sp1001Lumos` est « Lumière (Lumos) » contre **« Lumière/Obscurité »** au livre.
Les noms semblent provenir de la culture populaire Harry Potter plutôt que de la source.

**T-12** 🔴 **Les descriptions perdent la mécanique**
Le champ canonique `effets` contient les données de jeu réelles — oppositions (`Opposition :
POU/POU`), durées (`Durée : 1d8+2 heures`), et l'effet exact de la formule extrême. Les
descriptions livrées sont des reformulations narratives qui **suppriment ces informations**.
Exemple, pour Protego, le livre précise « divisant la valeur de POUvoir de l'assaillant par 2 […]
protège des dégâts physiques en les diminuant de 2. (Exception : Avada kedavra) » — rien de tout
cela n'est présent dans le JSON.

**T-13** 🟠 **Le schéma ne peut pas représenter le niveau « 5+ »**
Le Grimoire classe les sorts les plus puissants au niveau **`5+`** (chaîne), tandis que
`spellLevel` est un entier borné 0–6. Les 17 « erreurs de niveau » mesurées sont en grande partie
cet artefact d'encodage. Une décision de modélisation est nécessaire (valeur sentinelle `6`
documentée, ou passage à un `StringField` avec liste d'options).

**T-14** ⚪ **Convention de signe du malus — correcte mais non documentée**
Le livre écrit « FC : 20 % » (positif, désignant une pénalité) ; le schéma stocke `-20`. La
convention est cohérente dans tout le code, mais elle n'est écrite nulle part : à documenter avant
toute regénération, sous peine d'inverser 366 valeurs.

**T-15** 🟡 **Champs systématiquement vides**
- Potions : `virulence` et `prepTime` vides dans la totalité de l'échantillon, alors que le
  Grimoire fournit ces données.
- Créatures : `biography` vide dans 129/129 ; `movement.fly` et `movement.swim` `null` dans
  129/129 — or le Bestiaire ne publie **qu'une valeur de MOUVEMENT unique**, ce qui rend le
  découpage `land`/`fly`/`swim` du schéma non renseignable depuis la source.

**T-16** 🟡 **Les 31 êtres de l'Encyclopédie ne sont pas représentés**
`rules/md/Encyclopedie-des-Esprits-Etres-et-Non-etres.md` contient 31 blocs de statistiques
(esprits, êtres, non-êtres) sans aucune contrepartie dans le pack `hogwarts-creatures`.

**T-17** 🟡 **Toutes les créatures utilisent l'illustration générique**
129/129 documents ont `"img": "icons/svg/mystery-man.svg"`.

### 7.4 Recommandation

**Ne pas corriger les packs à la main.** Écrire un générateur
`rules/md/*.md` → `packs/*/json/*.json`, aux côtés de
[build-packs.mjs](hogwarts-system/build-packs.mjs) qui compile déjà le JSON vers LevelDB. Le
pipeline devient : *livre → JSON → LevelDB*, entièrement reproductible.

Bénéfices : couverture de 100 % par construction, zéro déchet d'extraction, valeurs mécaniques
exactes par définition, et regénération triviale à chaque nouvelle version des livres (le Grimoire
est déjà en v1.11, le livre de base en v1.12 — ils évolueront).

Le générateur devra trancher explicitement : encodage du niveau `5+` (**T-13**), signe du malus
(**T-14**), et découpage du mouvement (**T-15**).

---

## 8. Localisation

**Conforme :** `lang/en.json` et `lang/fr.json` sont synchronisés (2466 lignes chacun) ;
`LOCALIZATION_PREFIXES` est utilisé sur tous les DataModels, ce qui automatise la localisation des
libellés de champs ; les libellés de types de documents (`TYPES.Actor.*`, `TYPES.Item.*`) sont
présents.

**T-18** 🟡 **Chaînes anglaises codées en dur**
Quatre messages utilisateurs contournent `game.i18n` :

| Référence | Chaîne |
|-----------|--------|
| [actor-sheet.mjs:762](hogwarts-system/module/sheets/actor-sheet.mjs#L762) | `'Cannot link actor to itself'` |
| [actor-sheet.mjs:763](hogwarts-system/module/sheets/actor-sheet.mjs#L763) | `'Only familiars can be linked to a character'` |
| [actor-sheet.mjs:787](hogwarts-system/module/sheets/actor-sheet.mjs#L787) | `'Failed to link familiar'` |
| [actor-sheet.mjs:956](hogwarts-system/module/sheets/actor-sheet.mjs#L956) | `'Failed to create familiar'` (repli) |

Incohérent pour un système dont le public cible est francophone et dont le contenu est en français.

**T-19** ⚪ **Traduction des compendiums par patch d'index**
`_patchCompendiumIndex()` et `_applyCompendiumTranslation()`
([item.mjs](hogwarts-system/module/documents/item.mjs)) réécrivent `name` et
`system.description` depuis `i18n.translations.HOGWARTS.Packs`. C'est une approche maison viable,
mais elle devient sans objet si les packs sont regénérés depuis les sources françaises (§7.4) :
à réévaluer à ce moment-là plutôt qu'à maintenir en parallèle.

---

## 9. Réglages

Six réglages enregistrés, tous avec `scope`/`config`/`type`/`default` explicites ✅

| Clé | Portée | Type | Défaut |
|-----|--------|------|--------|
| `migrationVersion` | world | String | `''` |
| `warnOnNegativeExperience` | client | Boolean | `true` |
| `tabsUseIcons` | client | Boolean | `true` |
| `useExtendedSuccessTiers` | world | Boolean | `false` |
| `housePoints` | world | Object | 4 maisons à 0 |
| `excludeSchoolSkillsFromCP` | world | Boolean | `false` |

**T-20** 🟡 **`housePoints` est un `Object` brut plutôt qu'un `DataModel`**
Un réglage typé par `DataModel` bénéficie de la validation de schéma et de la migration
automatique. Avec un `Object` nu, une valeur corrompue en base ne sera jamais détectée.

**T-21** ⚪ **`useExtendedSuccessTiers` est une extension hors règles**
Le réglage est correctement implémenté et cohérent (`Math.ceil` aux 5 emplacements de calcul),
mais les paliers *Extreme*/*Hard* **n'existent pas** dans le livre de base, qui ne définit que
01-05 et 96-00. Il s'agit d'un emprunt au BRP générique. Ce n'est pas un défaut technique — c'est
un point de documentation, détaillé dans [compare.md](compare.md).

---

## 10. Checklist des dépréciations v14

| Dépréciation | Statut dans ce système |
|--------------|------------------------|
| `ActorSheet` / `ItemSheet` (V1) | ✅ Non utilisées |
| `Dialog` (V1) | ✅ `DialogV2` utilisé |
| `mergeObject` global | ✅ `foundry.utils.mergeObject` |
| `Actors` / `Items` globaux | ✅ `foundry.documents.collections.*` |
| `loadTemplates` global | ✅ Non appelé hors espace de noms |
| `FilePicker` global | ✅ `.implementation` utilisé |
| `DragDrop` global | ✅ `foundry.applications.ux.DragDrop` |
| `Roll#evaluate({async})` | ✅ `await roll.evaluate()` |
| `CONFIG.ActiveEffect.legacyTransferral` | ✅ Retiré au commit `cf0b986` |
| jQuery dans les hooks | ⚠️ Voir **T-07** |
| **`renderChatMessage`** | ❌ **T-07** |
| **`TextEditor` global** | ❌ **T-08** |

---

## 11. Qualité de code

**T-22** ⚪ **`actor-sheet.mjs` fait 2560 lignes**
Le fichier concentre 31 gestionnaires d'action, toute la logique de jets, la gestion des
compétences, de la famille, du familier et des créatures. Un découpage par domaine
(`sheets/parts/rolls.mjs`, `skills.mjs`, `creature.mjs`) réduirait le risque de régression.

**T-23** 🟡 **La logique de degrés de réussite est dupliquée 5 fois**
[actor-sheet.mjs:1108](hogwarts-system/module/sheets/actor-sheet.mjs#L1108),
[1413](hogwarts-system/module/sheets/actor-sheet.mjs#L1413),
[1486](hogwarts-system/module/sheets/actor-sheet.mjs#L1486),
[1657](hogwarts-system/module/sheets/actor-sheet.mjs#L1657) et
[hogwarts-system.mjs:497](hogwarts-system/module/hogwarts-system.mjs#L497).

Les cinq copies sont aujourd'hui **cohérentes** — c'est un coup de chance, pas une garantie. Toute
correction de règle (et [compare.md](compare.md) en identifie) devra être appliquée cinq fois sans
en oublier une. À extraire dans une fonction unique `_degreeOf(roll, target, useExtendedTiers)`.

**T-24** ⚪ **Aucun test automatisé, aucun lint**
`package.json` ne déclare ni test ni linter. Vu la densité d'arithmétique de règles, quelques
tests unitaires sur les fonctions pures (degrés de réussite, PV max, bonus de dommages,
progression scolaire) offriraient un rapport bénéfice/coût très favorable.

---

## 12. Backlog priorisé

### P0 — À traiter en premier

| ID | Action | Référence |
|----|--------|-----------|
| **T-09 → T-12** | **Écrire le générateur de packs depuis `rules/md/`** et regénérer les 5 compendiums | §7.4 |
| **T-07** | Migrer `renderChatMessage` → `renderChatMessageHTML` (+ jQuery → DOM natif) | [hogwarts-system.mjs:388](hogwarts-system/module/hogwarts-system.mjs#L388) |
| **T-08** | `TextEditor` → `foundry.applications.ux.TextEditor` | [item-sheet.mjs:161](hogwarts-system/module/sheets/item-sheet.mjs#L161) |
| **R-01** | Corriger le gain d'XP `1d6` → `1d6+1` | [compare.md](compare.md) · [actor-sheet.mjs:1904](hogwarts-system/module/sheets/actor-sheet.mjs#L1904) |

> **T-09 → T-12 et R-01 sont indépendants** : la correction des règles peut avancer en parallèle
> de la regénération des packs.

### P1 — Correction et fiabilité

| ID | Action |
|----|--------|
| T-13 · T-14 · T-15 | Trancher et **documenter** l'encodage `5+`, le signe du malus, le découpage du mouvement — *prérequis du générateur* |
| T-23 | Factoriser les 5 copies de la logique de degrés de réussite |
| T-01 | Renseigner `url`, `bugs`, `manifest`, `download` |
| T-02 | Retirer `secondaryTokenAttribute` ou ajouter `fougue` aux autres types |
| T-18 | Localiser les 4 chaînes en dur |

### P2 — Complétude

| ID | Action |
|----|--------|
| T-16 | Intégrer les 31 êtres de l'Encyclopédie |
| T-15 | Renseigner `virulence`, `prepTime`, `biography` (via le générateur) |
| T-03 | Déclarer `CONFIG.Actor.trackableAttributes` |
| T-05 | Déplacer les migrations de forme vers `static migrateData()` |
| T-21 | Documenter `useExtendedSuccessTiers` comme extension optionnelle |

### P3 — Confort

| ID | Action |
|----|--------|
| T-17 | Illustrations de créatures (+ `filePathFields`, T-04) |
| T-22 | Découper `actor-sheet.mjs` |
| T-24 | Ajouter lint + tests unitaires sur l'arithmétique de règles |
| T-06 | Refondre le calcul des compétences pour supprimer le contournement d'Active Effects |
| T-19 | Réévaluer la traduction des compendiums après regénération |
| T-20 | Typer `housePoints` par un `DataModel` |

---

## 13. Checklist de vérification runtime

À exécuter dans un monde Foundry **14.360** avec la console (F12) ouverte.

| # | Test | Attendu si conforme | Tranche |
|---|------|---------------------|---------|
| **R-1** | Lancer un jet de compétence, puis cliquer *Utiliser la fougue* sur la carte de chat | Le résultat s'inverse et 1 point de fougue est dépensé | **T-07** |
| **R-2** | Lancer un jet de dégâts, cliquer *Appliquer les dégâts* avec un token ciblé | Les PV de la cible diminuent | **T-07** |
| **R-3** | Filtrer la console sur `Deprecation` au chargement du monde | Aucun avertissement | **T-07**, **T-08** |
| **R-4** | Ouvrir la fiche d'un objet contenant `[[/r 1d6]]` dans sa description | Le jet en ligne s'affiche en bouton cliquable | **T-08** |
| **R-5** | Ouvrir la configuration d'un Token de PNJ, dérouler la barre secondaire | `fougue` absent de la liste ⇒ confirme **T-02** | **T-02** |
| **R-6** | Créer un effet actif ciblant `system.skills.0.value`, puis modifier une autre valeur de la fiche | Le bonus persiste, aucune erreur « phase has already completed » | §5 |
| **R-7** | Ouvrir le compendium *Hogwarts Spells* et trier par nom | Présence des 11 entrées à nom aberrant ⇒ confirme **T-10** | **T-10** |

> Les résultats de **R-1**, **R-2** et **R-3** déterminent si **T-07** est 🟠 *majeur* (hook encore
> émis avec avertissement) ou 🔴 *bloquant* (hook supprimé, fonctionnalités mortes).
> Merci de reporter ces résultats pour mettre à jour la gravité.

---

## Annexe — Fichiers audités

```
hogwarts-system/
  system.json              manifeste
  module/
    hogwarts-system.mjs    586 l.  point d'entrée, hooks, réglages, migrations
    documents/             actor.mjs, item.mjs
    data/                  11 DataModels (4 Actor, 8 Item, 2 bases)
    sheets/                actor-sheet.mjs (2560 l.), item-sheet.mjs
    helpers/               config.mjs, effects.mjs
  templates/               22 fichiers .hbs
  lang/                    en.json, fr.json (2466 l. chacun)
  packs/                   5 compendiums + sources JSON
  build-packs.mjs          compilation JSON → LevelDB
```

**Hors périmètre :** `node_modules/`, `src/scss/`, `css/`.
