# AUDIT TECHNIQUE — Conformité Foundry VTT v14

**Système :** `hogwarts-system` v1.2.0
**Compatibilité déclarée :** minimum `14` · vérifié `14.365`
**État audité :** `v1.2.0`
**Dernière révision :** 15 septembre 2026
**Périmètre :** conformité aux API et pratiques Foundry VTT v14.
La fidélité aux règles du jeu est traitée séparément dans [compare.md](compare.md).

---

## 1. Résumé exécutif

L'architecture est **saine et moderne** : `ApplicationV2` + `HandlebarsApplicationMixin`,
`TypeDataModel` pour tous les types de documents, espaces de noms `foundry.*` employés
partout, système de migration versionné opérationnel. **Aucune incompatibilité bloquante**
avec Foundry v14.

| # | Famille | État | Constat |
|---|---------|------|---------|
| 1 | Contenu des compendiums | ✅ Résolu | Les 6 packs sont générés depuis les livres par [build-compendia.mjs](hogwarts-system/build-compendia.mjs) : 1082 documents, couverture 100 %, zéro déchet d'extraction. Voir §7. |
| 2 | API dépréciées | ✅ Résolu | `renderChatMessage`, `TextEditor` global et `SortingHelpers` traités. Voir §6 et §10. |
| 3 | Distribution | ✅ Résolu | Manifeste publiable, release `v1.1.0` en ligne. Voir §3. |
| 4 | Outillage | ✅ Résolu | 50 tests unitaires, un linter, et une vérification par mutation. Voir §11. |
| 5 | Dette structurelle | ✅ Résolu | `actor-sheet.mjs` est passé de 3 271 à 1 531 lignes, découpé en sept modules. Voir §11. |

**Verdict :** le système est **distribuable** et **prêt pour la v15**.

---

## 2. Méthode

- Analyse statique de l'intégralité de `hogwarts-system/` (hors `node_modules/`).
- **Vérification en conditions réelles** sur une instance Foundry **14.365** :
  toute affirmation de ce document portant la mention ✅ **VÉRIFIÉ** a été mesurée en jeu,
  pas déduite du code.
- Comparaison programmatique des documents des packs contre les données structurées des
  livres.
- Documentation officielle : [Introduction to System
  Development](https://foundryvtt.com/article/system-development/),
  [API](https://foundryvtt.com/api/), [wiki communautaire
  ApplicationV2](https://foundryvtt.wiki/en/development/api/applicationv2).

> **Les livres sources ne sont plus dans le dépôt.** Depuis la v1.1.0, `rules/` est exclu du
> suivi Git : ce sont des œuvres de tiers. Les fichiers restent en local pour alimenter
> `build-compendia.mjs`, mais un clone neuf ne peut plus régénérer les compendiums — seuls
> les packs compilés, eux versionnés, permettent au système de fonctionner.

Chaque constat porte un identifiant (`T-nn`) et une gravité.
**Gravités :** 🔴 Bloquant · 🟠 Majeur · 🟡 Mineur · ⚪ Information

> **Avertissement de méthode.** La première rédaction de cet audit contenait plusieurs
> affirmations fausses, reprises sans vérification : que le Bestiaire ne publiait qu'une
> valeur de mouvement (faux, 7 créatures en publient plusieurs), que le Grimoire fournissait
> la virulence et le temps de préparation (faux, il ne les publie pas), et que la logique de
> degrés était dupliquée 5 fois (il y en avait 9). Une affirmation d'audit non mesurée doit
> être traitée comme une hypothèse.

---

## 3. Manifeste (`system.json`)

| Champ | Valeur | État |
|-------|--------|------|
| `id` | `hogwarts-system` | ✅ correspond au dossier |
| `compatibility` | `{minimum: "14", verified: "14.365"}` | ✅ aligné sur le serveur testé |
| `esmodules` | `["module/hogwarts-system.mjs"]` | ✅ préféré à `scripts` |
| `documentTypes` | **5 Actors**, 8 Items, avec `htmlFields` | ✅ obligatoire pour les DataModels |
| `packs` | **6 packs**, `system` et `ownership` renseignés | ✅ |
| `packFolders` | Arborescence à 2 niveaux, couleurs | ✅ fonctionnalité v12+ |
| `url` · `bugs` · `manifest` · `download` | URL GitHub complètes | ✅ **T-01 résolu** |
| `primaryTokenAttribute` | `health` | ✅ |
| `secondaryTokenAttribute` | absent | ✅ **T-02 résolu** |
| `grid` | `{type: 1, distance: 1, units: "m", diagonals: 0}` | ✅ |
| `flags.hotReload` | `css`, `html`, `hbs`, `json` | ✅ confort de développement |

**T-01** ✅ **Résolu.** Les quatre URL étaient vides, rendant l'installation par manifeste et
la détection des mises à jour impossibles. La release `v1.1.0` est publiée et
`releases/latest/download/system.json` répond en HTTP 200 avec la bonne version.

**T-02** ✅ **Résolu.** `secondaryTokenAttribute` valait `fougue`, un champ que seul le type
`character` définit : la barre secondaire était vide pour 3 types d'acteur sur 4.
Le champ a été retiré du manifeste au profit de `trackableAttributes`.

**T-03** ✅ **Résolu.** `CONFIG.Actor.trackableAttributes` est désormais déclaré par type dans
le hook `init`, ce qui alimente correctement la configuration des barres de Token.

**T-04** ✅ **Clos — sans objet.** Vérification faite : aucun schéma `system` ne stocke de
chemin de fichier (les images d'acteur et d'objet vivent dans le champ `img` du document,
géré par Foundry). Déclarer `filePathFields` reviendrait à déclarer un ensemble vide.
À rouvrir si une illustration est un jour stockée dans `system` (cf. **T-17**).

---

## 4. Architecture applicative

| Élément | Implémentation |
|---------|----------------|
| Feuilles | `HandlebarsApplicationMixin(sheets.ActorSheetV2 / ItemSheetV2)` |
| Espaces de noms | `const { api, sheets } = foundry.applications` |
| Collections | `foundry.documents.collections.Actors.registerSheet` |
| Modèles de données | `TypeDataModel` + `defineSchema()` + `LOCALIZATION_PREFIXES` |
| Dialogues | `foundry.applications.api.DialogV2` |
| Sélecteur de fichier | `foundry.applications.apps.FilePicker.implementation` |
| Glisser-déposer | `foundry.applications.ux.DragDrop` |
| Tri | `foundry.utils.performIntegerSort` |
| Utilitaires | `foundry.utils.mergeObject` |
| Actions | `static DEFAULT_OPTIONS.actions` + `data-action` |
| Registre des fenêtres | `foundry.applications.instances` |

Aucune trace des classes V1 (`ActorSheet`, `ItemSheet`, `Dialog`), ni d'appel global à
`mergeObject`, `loadTemplates`, `Actors` ou `ui.windows`.

**T-05** ✅ **Résolu.** Les migrations de forme vivaient uniquement dans le hook `ready`,
qui ne touche ni les documents de compendium ni les documents importés. Deux modèles
utilisent désormais `static migrateData()` :

| Modèle | Migration |
|--------|-----------|
| `item-spell.mjs` | Cible unique en chaîne (`"A/P"`) → jeu de codes |
| `item-potion.mjs` | Idem |
| `actor-character.mjs` | `system.biography` → `system.bio.history` |

> **Bug réel découvert en traitant T-05.** La migration `3.0.0` était **doublement cassée** et
> n'a jamais rien migré :
> 1. sa garde était `if (bioSource && !bioTarget)`, or `system.bio` est un `SchemaField`
>    toujours initialisé — donc **toujours truthy**, et `!bioTarget` toujours faux ;
> 2. même déclenchée, elle exécutait `update({'system.bio': bioSource})`, affectant une
>    **chaîne** à un `SchemaField` de deux champs.
>
> ✅ **VÉRIFIÉ** en jeu : `system.bio` vaut `{motivation: "", history: ""}` et la garde
> s'évalue bien à `false`. Le déplacement est désormais fait par `migrateData` vers
> `bio.history`, et la migration `3.0.0` se contente de le persister.

---

## 5. Préparation et Active Effects

Ordre imposé : `prepareData()` → `prepareBaseData()` → `applyActiveEffects()` →
`prepareDerivedData()`.

Un correctif antérieur est **correct et doit être conservé** :

1. **`super.prepareBaseData()`** dans [actor.mjs](hogwarts-system/module/documents/actor.mjs) —
   sans lui, `_clearData()` ne réinitialise pas les phases d'Active Effect, d'où une exception
   « phase has already completed » à chaque mise à jour après la première.
   ✅ **VÉRIFIÉ** : plus aucune occurrence en jeu.

Le second, `_applySkillActiveEffects()`, réappliquait les effets après coup ; il a été
remplacé par le motif officiel décrit ci-dessous.

**T-06** ✅ **Résolu.** Le calcul suit désormais le motif officiel : `base + spent` est
établi dans `prepareBaseData()`, donc **avant** les effets, et `prepareDerivedData()` ne
fait plus qu'ajouter les bonus d'ascendance et le bornage. Pour qu'un effet visant
`…N.base` reste pris en compte *sans* qu'un effet visant `…N.value` soit écrasé, la
phase dérivée mesure l'écart introduit par les effets (`_preEffectValue`) et le réapplique
après recalcul : chaque changement compte exactement une fois, ce qui supprime la double
application signalée ici. `_applySkillActiveEffects()` a été supprimé.

---

## 6. Jets, dés et messages de chat

- `await roll.evaluate()` partout — pas de `evaluate({async: true})`.
- Les `Roll` sont attachés à `ChatMessage.create({ rolls: [...] })`, ce qui produit de vrais
  messages de jet (animation Dice So Nice, détail au survol).
- `rollMode: game.settings.get('core', 'rollMode')` respecté.
- Initiative déclarée via `CONFIG.Combat.initiative` :
  `'1d6 + @stats.dex.total + @system.initiativeBonus'`.

**T-07** ✅ **Résolu.** `Hooks.on('renderChatMessage')` est déprécié depuis la v13 et
**supprimé en v15**. Le hook passait un objet **jQuery**, le nouveau passe un `HTMLElement`
natif : le callback a été converti (`html.find` → `html.querySelectorAll`).

> Impact évité : les boutons *Appliquer les dégâts*, *Appliquer les soins* et *Utiliser la
> fougue* seraient devenus **inertes en v15**, sans aucun message d'erreur.

**T-08** ✅ **Résolu.** `TextEditor` global → `foundry.applications.ux.TextEditor` dans
`item-sheet.mjs`. C'était une **incohérence interne** : `actor-sheet.mjs` employait déjà la
forme correcte à quatre endroits.

> Impact évité : la description enrichie des objets (liens `@UUID`, jets en ligne
> `[[/r 1d6]]`) aurait cessé de fonctionner en v15.

---

## 7. Compendiums

### 7.1 Les livres sources sont des données structurées

`rules/md/Grimoire-…-V1.11.md` n'est pas du texte libre : c'est une extraction lisible par
machine, avec des enregistrements typés (`nom`, `niveau`, `type`, `incantation`, `cibles`,
`malus`, `effets`, `maitrise`…).

**C'est le fait déterminant de cet audit :** les packs n'auraient jamais dû être saisis à la
main, et ne doivent pas être corrigés à la main.

### 7.2 État après régénération

| Pack | Documents | Couverture |
|------|-----------|-----------|
| Sorts | **366** | 100 % |
| Potions | **139** | 100 % |
| Ingrédients | **310** | 100 % |
| Créatures | **162** | 100 % (Bestiaire + Encyclopédie) |
| Avantages, désavantages et destin | **104** | 100 % (§4.1, §4.2, §5.2) |
| Guide du MJ | 1 | — |

Pour mémoire, l'état antérieur, saisi à la main : 292 sorts dont **52 % avec au moins un champ
faux** (36 % de malus erronés, 24 % de cibles erronées) et **11 documents dont le `name` était
un fragment de phrase** ; 85 potions couvrant 46 % du Grimoire ; 200 ingrédients pour 59 %.

**T-09 à T-12** ✅ **Résolus par construction** par [build-compendia.mjs](hogwarts-system/build-compendia.mjs) :
valeurs mécaniques, noms canoniques, déchets d'extraction et pertes de mécanique dans les
descriptions.

**T-13 · T-14 · T-15** ✅ **Tranchés et documentés** en tête du générateur :

| Question | Décision |
|----------|----------|
| Niveau `5+` du Grimoire (chaîne) contre `spellLevel` entier | Valeur sentinelle **`6`**, commentée dans le schéma |
| Signe du malus — le livre écrit « FC : 20 % », le schéma stocke `-20` | **Toujours négatif**, quelle que soit la notation source |
| `FE : A%/B%` | `B` → `malusExtremeFormula`, `A` → `malusMastered` |
| Découpage du mouvement des créatures | `Sol` / `Vol`\|`Air` / `Eau`\|`Nage`, repli sur `8` |
| Points de vie manquants | `arrondi.sup((TAI + CON) / 2)` |

**T-15** ✅ **Résolu — et le constat initial était faux dans les deux sens.** La première version
de cet audit affirmait que le Grimoire publiait `virulence` et `prepTime` ; la seconde, l'inverse.
La vérification tranche : le Grimoire **publie bien** la virulence et la durée, mais **dans la
prose** du champ `effets` (`VIRulence : N`, `Durée : …`) plutôt que dans une colonne — c'est
pourquoi aucune lecture des entêtes ne les trouvait. Le générateur les extrait désormais :
**19 potions** ont une virulence, **54** une durée. En revanche `prepTime` n'est réellement jamais
publié : le livre de base le laisse « à la discrétion du MJ » (l. 12963). Le champ reste donc
libre et son intitulé le dit (« Temps de préparation (MJ) »).

> Les antidotes citent une **VIRulence seuil** (« annule les poisons jusqu'à une VIRulence 10 »)
> qui n'est pas la leur : seule la forme avec deux-points est lue.

**T-26** ✅ **Résolu — doublon de compendium.** `packs/hogwarts-features/json/` contenait
`_advantages-disadvantages.json`, un agrégat de 18 documents **déjà présents** sous forme de
fichiers individuels : 48 documents lus pour 30 identifiants uniques. `build-packs.mjs`
dédoublonne par `_id`, si bien que **la version retenue dépendait de l'ordre de lecture**. Les
deux versions étaient identiques au moment du constat, mais toute modification de l'une seule
aurait produit un résultat non déterministe. L'agrégat est supprimé : 30 fichiers, 30 documents.

**T-16** ✅ **Résolu.** Les 31 êtres de l'Encyclopédie sont intégrés ; le pack créatures
combine les deux ouvrages.

**T-17** 🟡 **Ouvert.** Toutes les créatures utilisent `icons/svg/mystery-man.svg`.

> **Piège découvert en production.** Trois icônes du cœur ont été **supprimées en v14** :
> `icons/svg/leaf.svg` (utilisée par 310 documents), `icons/svg/transform.svg` (84) et
> `icons/skills/social_dark.svg` (12). Elles s'affichaient en image cassée. ✅ **VÉRIFIÉ** : les
> **1082 documents** des six packs ne référencent plus que **11 icônes**, toutes présentes en
> v14.365, et aucune des trois retirées. À revérifier à chaque version majeure de Foundry — le
> manifeste ne signale pas ces retraits.

---

## 8. Localisation

`lang/en.json` et `lang/fr.json` sont synchronisés (1307 lignes chacun).
`LOCALIZATION_PREFIXES` est utilisé sur tous les DataModels, ce qui automatise la localisation
des libellés de champs. Les libellés de types (`TYPES.Actor.*`, `TYPES.Item.*`) sont présents.

**T-18** ✅ **Résolu.** Quatre messages utilisateur contournaient `game.i18n`
(« Cannot link actor to itself », « Only familiars can be linked to a character »,
« Failed to link familiar », « Failed to create familiar ») dans un système dont le public est
francophone. Ils sont désormais sous `HOGWARTS.Errors.*`.

**T-19** ✅ **Résolu.** `_patchCompendiumIndex()` réécrivait `name` et `system.description`
depuis les traductions au chargement. Devenu sans objet une fois les packs générés depuis les
sources françaises : le patch a été supprimé.

---

## 9. Réglages

Dix réglages enregistrés, tous avec `scope`, `config`, `type` et `default` explicites.

| Clé | Portée | Type | Défaut |
|-----|--------|------|--------|
| `migrationVersion` | world | String | `''` |
| `housePoints` | world | **`HousePointsData`** | 4 maisons à 0 |
| `useExtendedSuccessTiers` | world | Boolean | `false` |
| `excludeSchoolSkillsFromCP` | world | Boolean | `false` |
| `knockoutMethod` | world | String | `alternative` |
| `applyArmorOnDamage` | world | Boolean | `true` |
| `rerollInitiativeEachRound` | world | Boolean | `true` |
| `schoolXpMode` | world | String | `flat` |
| `warnOnNegativeExperience` | client | Boolean | `true` |
| `tabsUseIcons` | client | Boolean | `true` |

**T-20** ✅ **Résolu.** `housePoints` était un `Object` nu : n'importe quelle forme était
acceptée et une valeur corrompue n'apparaissait qu'en `NaN` dans l'interface. Le réglage est
typé par [house-points.mjs](hogwarts-system/module/data/house-points.mjs), un `DataModel` de
quatre `NumberField` entiers. L'accesseur `HousePointsApp.points` renvoie toujours un objet
simple via `toObject()`, les appelants attendant une valeur mutable.

**T-21** ✅ **Résolu.** Les paliers *Extrême* et *Difficile* n'existent pas dans le livre de
base, qui ne définit que `01-05` et `96-00` : c'est un emprunt au BRP générique. Le réglage
est désormais explicitement étiqueté « règle optionnelle ».

---

## 10. Checklist des dépréciations v14

| Dépréciation | État |
|--------------|------|
| `ActorSheet` / `ItemSheet` (V1) | ✅ non utilisées |
| `Dialog` (V1) | ✅ `DialogV2` |
| `mergeObject` global | ✅ `foundry.utils.mergeObject` |
| `Actors` / `Items` globaux | ✅ `foundry.documents.collections.*` |
| `loadTemplates` global | ✅ non appelé hors espace de noms |
| `FilePicker` global | ✅ `.implementation` |
| `DragDrop` global | ✅ `foundry.applications.ux.DragDrop` |
| `ui.windows` | ✅ `foundry.applications.instances` |
| `Roll#evaluate({async})` | ✅ `await roll.evaluate()` |
| `CONFIG.ActiveEffect.legacyTransferral` | ✅ retiré |
| jQuery dans les hooks | ✅ `HTMLElement` natif partout |
| `renderChatMessage` | ✅ **T-07** — `renderChatMessageHTML` |
| `TextEditor` global | ✅ **T-08** — `foundry.applications.ux.TextEditor` |
| **`SortingHelpers`** | ✅ **T-25** — `foundry.utils.performIntegerSort` |

**T-25** ✅ **Résolu — trouvé par le linter, manqué par l'audit manuel.**
Trois appels utilisaient le global `SortingHelpers.performIntegerSort` (réordonnancement des
effets actifs par glisser-déposer). ✅ **VÉRIFIÉ** en jeu : l'appel déclenche **deux**
avertissements empilés, tous deux *« removed in Version 15 »* :

```
You are accessing the global "SortingHelpers" which is now namespaced
under foundry.utils.SortingHelpers — Deprecated since Version 13
foundry.utils.SortingHelpers.performIntegerSort has been deprecated.
Access this helper at foundry.utils.performIntegerSort instead.
```

`foundry.utils.performIntegerSort` n'émet aucun avertissement. Les globaux `getDocumentClass`,
`Macro` et `Folder`, également signalés par le linter, ont été **vérifiés non dépréciés** et
sont simplement déclarés dans la configuration du linter.

> Le premier audit affirmait le système « prêt pour la v15 » alors que le tri des effets
> aurait cessé de fonctionner. C'est précisément l'intérêt d'un linter face à une relecture
> humaine.

---

## 11. Qualité de code

**T-22** ✅ **Résolu.** `actor-sheet.mjs` faisait **3 271 lignes** et concentrait les gestionnaires
d'action, la logique de jets, les compétences, la famille, le familier et les créatures. Il est
découpé en **sept modules** par domaine sous `module/sheets/actor/`, et retombe à **1 531 lignes** :

| Module | Rôle |
|--------|------|
| `rolls.mjs` | jets de compétence, initiative, dégâts, oppositions, réactions, fougue |
| `experience.mjs` | gains, bilans de trimestre et d'année, réserve, repos |
| `magic.mjs` | lancement, apprentissage, préparation et usage des potions |
| `creature.mjs` | attaques, compétences libres et jets de créature |
| `biography.mjs` | famille, sections repliables, transformation d'Animagus |
| `skills.mjs` | ajout, suppression, plafond automatique |
| `chat-cards.mjs` | boutons partagés des cartes de chat |

> **Vérification du découpage.** Les 71 fonctions déplacées ont été comparées une à une, avant et
> après, par empreinte normalisée : **aucune différence**. Les 47 actions déclarées se résolvent
> toutes à l'exécution. Un premier extracteur automatique avait mordu sur `#onSubmitActorForm` et
> dupliqué `toggleSettingsSection` : il a été réécrit avec un suivi de parité des accolades
> inverses et un refus de tout chevauchement.

**T-23** ✅ **Résolu.** La logique de degrés était dupliquée — **9 fois, pas 5** comme
l'affirmait la première version de ce document. Elle est factorisée dans
[helpers/degrees.mjs](hogwarts-system/module/helpers/degrees.mjs) (`degreeOf`, `degreeBadge`).
L'apprentissage de sort conserve sa propre logique à 4 issues, documentée sur place.

> **Erreur de règle découverte en factorisant.** La maladresse était testée **après** la
> réussite : un `96` sur une compétence à 96 % ou plus passait pour une réussite. Le livre est
> catégorique — « *lorsque le résultat est compris entre 96 et 00, **non seulement l'action est
> manquée**…* » (l. 960). Atteignable en jeu : les matières scolaires plafonnent à 100 % en 6ᵉ
> et 7ᵉ année, et l'assistance ou l'affinité de baguette poussent la cible au-delà de 95.
> Corrigé aux 9 emplacements d'un seul coup grâce à la factorisation.

**T-24** ✅ **Résolu.** Le dépôt n'avait ni test ni linter.

| Outil | Commande | État |
|-------|----------|------|
| Tests unitaires | `npm test` | **50 tests, 0 échec** |
| Linter | `npm run lint` | **0 erreur, 0 avertissement** |
| Vérification par mutation | `npm run test:mutations` | **9 défauts sur 9 détectés** |

La configuration ([eslint.config.mjs](hogwarts-system/eslint.config.mjs)) déclare les globaux
Foundry, sans quoi `no-undef` produit un bruit inexploitable. Le premier passage a signalé
29 problèmes : 8 erreurs (dont **T-25**), 8 variables mortes laissées par la factorisation
T-23, 2 comparaisons lâches et 11 avertissements de style. Tous traités.

**T-31** ✅ **Résolu — tests d'intégrité structurelle.** Les tests d'origine ne couvraient que
l'arithmétique des règles ; rien ne vérifiait que le code tenait debout. Neuf tests
([test/integrity.test.mjs](hogwarts-system/test/integrity.test.mjs)) comblent ce trou, chacun
né d'une panne réelle :

| Test | Ce qu'il empêche |
|------|------------------|
| Actions déclarées | ApplicationV2 ignore un `data-action` inconnu **en silence** |
| Actions atteignables | Une action déclarée sans bouton est une fonctionnalité invisible |
| Pas de `data-action` sur un `<select>` | Le clic est le geste qui déroule la liste ; le re-rendu la referme |
| Clés de traduction présentes | Un libellé affiché en brut à l'écran |
| Arguments de `localize` | Un `{malus}` non substitué après renommage d'un seul côté |
| `fr` et `en` symétriques | Un champ traduit d'un seul côté |
| Gabarits existants | Un chemin `PARTS` cassé lors d'un renommage |
| Sélecteurs racine CSS | `.hogwarts-system .x` ne correspond jamais à rien |
| `system.json` cohérent | Version désynchronisée, pack ou langue absent |

> **Un test vert ne prouve rien s'il ne sait pas virer au rouge.**
> [tools/check-tests.py](hogwarts-system/tools/check-tests.py) réintroduit chaque défaut un par
> un, relance la suite et restaure toujours le fichier. Neuf mutations, neuf détections.

**T-32** ✅ **Résolu — code en anglais.** Commentaires, identifiants et intitulés de test sont
en anglais dans tout le code. **Les citations du livre restent en français**, verbatim et avec
leur numéro de ligne : elles servent de preuve et doivent rester retrouvables dans les sources.
Un contrôle confronte chaque citation longue au texte du livre, après normalisation des accents
et des espaces.

> **Trois dégâts causés par les renommages en masse**, tous rattrapés : une citation du livre
> corrompue (« la valeur » devenue « la valueOf »), une classe CSS renommée (`stat-malus`), et
> un argument de traduction désaligné de son marqueur. Le linter a attrapé toutes les références
> oubliées, mais **aucun de ces trois cas** : ils sont invisibles pour un analyseur JavaScript.
> D'où le test sur les arguments de `localize`, ajouté en conséquence.

---

## 12. Backlog restant

| ID | Gravité | Action | Pourquoi c'est reporté |
|----|---------|--------|------------------------|
| T-17 | 🟡 | Illustrations des créatures | Demande des ressources graphiques, pas du code |

T-04, T-06, T-22, T-27, T-28, T-29, T-30, T-31, T-32 et T-35 sont traités. Tous les points P0 et
P1 sont traités.

**T-35** ✅ **Résolu en 1.2.0 — une règle générale implémentée à un seul endroit.** La comparaison
des marges du §28.3.4 ne vivait que dans l'application Quidditch, alors que le livre l'emploie dès
le chapitre 2. Elle est extraite dans `helpers/opposition.mjs` (arithmétique, testable sans
Foundry) et `applications/opposition.mjs` (cartes de chat et résolveur). Le Quidditch, le duel et
la Legilimancie passent tous par ce code, et la classe CSS de la ligne de marge est devenue
`hogwarts-margin` au lieu de `quidditch-margin`.

> **Effet de bord assumé** : la table des résistances est désormais bornée à 5-95 au lieu de 1-99,
> parce que la table imprimée ne sort jamais de cet intervalle (l. 1038). L'ancienne borne ne
> venait d'aucune source. Le jet d'opposition des fiches et la résistance au cognard s'en trouvent
> tous deux modifiés aux valeurs extrêmes.

**T-33** ✅ **Corrigé en 1.2.0 — fermer une fenêtre de jet lançait les dés.** `DialogV2.prompt`
renvoie `null` à la fermeture, mais la valeur était convertie en réponse valide : fermer par la
croix revenait à cliquer OK avec un modificateur de zéro. Reproduit en jeu avant correction. Les
six appels concernés renoncent désormais. Les huit autres boîtes de dialogue du système géraient
déjà la fermeture correctement.

**T-34** ✅ **Corrigé en 1.2.0 — lecture de données périmées.** Le cadenas du plafond de maîtrise
lisait l'acteur au moment du clic. Or cliquer le cadenas fait sortir du champ voisin : le `change`
part, mais l'enregistrement n'est **pas encore arrivé**. Mesuré : seul un délai de 0 ms échoue,
dès 50 ms tout fonctionne — or un clic humain, c'est précisément 0 ms. Le gestionnaire lit
maintenant la valeur affichée sur la fiche, et relit le tableau **après** la confirmation.

> Leçon de méthode : simuler un `change` puis cliquer n'équivaut pas à un vrai clic, puisque
> c'est le clic lui-même qui déclenche le `change`. Trois campagnes de tests automatisés sont
> passées au vert sur un code cassé avant que le protocole manuel de l'utilisateur ne tranche.

**T-29** ✅ **Corrigé en 1.0.1 — compétences préréglées jamais enregistrées.**
`_backfillPresetSkills()` ne remplissait que les données préparées : un personnage neuf
affichait 58 compétences sans en stocker **aucune**, et sept des dix personnages du monde de
test étaient en décalage, l'écart correspondant aux préréglages ajoutés par une mise à jour du
système — dont la compétence Animagus.

**Portée réelle, mesurée après coup.** J'avais d'abord conclu que la fiche corrompait la liste
dès la première saisie, parce qu'un `update()` visant un seul indice (`system.skills.42.spent`)
produit bien 43 lignes vides : Foundry reconstruit l'`ArrayField` à partir des seules clés
fournies. **C'était faux pour la fiche.** Vérification faite sur une saisie authentique, le
formulaire renvoie ses 236 champs, soit les 58 lignes, et le tableau est reconstruit en entier :
une fiche à zéro compétence stockée passe à 58, sans aucune ligne sans nom, et la valeur saisie
arrive à la bonne compétence. Aucun code du système n'écrit par indice. Le risque ne concernait
donc que les macros et modules tiers.

Les deux correctifs sont conservés comme garde-fous : `Actor#_preCreate` inscrit les compétences
préréglées à la création, et `persistBackfilledSkills()` réconcilie les fiches existantes à
chaque chargement, ce qui absorbe aussi les futurs ajouts de préréglages.

**T-30** ✅ **Corrigé en 1.0.1 — modificateur d'initiative inopérant.** `CONFIG.Combat.initiative`
visait `@system.initiativeBonus`, alors que `Actor#getRollData()` renvoie `system` lui-même :
ses clés sont à la racine et il n'existe aucune clé `system` imbriquée. La référence ne résolvait
rien et le jet valait toujours `+0` — le champ n'avait jamais fonctionné depuis sa création.
Mesuré avant/après sur un personnage à `−2` : `1d6 + 10 + 0` puis `1d6 + 10 − 2`, confirmé par un
jet réel dans le tracker (total 13 pour un dé à 5). Le bouton de la fiche, qui recalculait le jet
de son côté, ignorait en plus le modificateur d'ascendance (`dex.value` au lieu de `dex.total`).

**T-27** ✅ **Clos — extérieur au système.** Mesuré le 2026-09-10 sur un combat rattaché à
une scène, dans un seul appel :

| Ce qui est mesuré | Ordre obtenu |
|---|---|
| `combat.turns` | Sascha, Elowen, Rykard |
| Contexte de rendu (`_prepareTrackerContext`) | Sascha, Elowen, Rykard |
| Gabarit `tracker.hbs` rendu à la main | Sascha, Elowen, Rykard |
| **DOM affiché** | **Sascha, Rykard, Elowen** |

Le tri du système, `setupTurns()`, le contexte et le gabarit **concordent tous** : la
divergence apparaît *après* le rendu. Chaque `<li>` porte la classe `dsn-initiative-pending`
de **Dice So Nice! 6.1.0**, seul module à instrumenter le tracker (avec `dice-calculator`,
`find-the-culprit` et les deux modules Forge). Le nombre d'initiative masqué par un sablier,
attribué à tort au badge de phase lors d'un relévé précédent, vient de la même source.

> Aucun correctif côté système. À confirmer côté utilisateur en désactivant Dice So Nice!
> le temps d'un lancement si la gêne persiste en partie.

---

## 13. Vérifications en conditions réelles

Instance Foundry **14.365**, sur les versions de développement ayant abouti à la v1.2.0.

| Test | Résultat |
|------|----------|
| `renderChatMessage` encore émis en 14.365 ? | Oui, mais avec avertissement — **retrait en v15** |
| `TextEditor` global | Idem — retrait en v15 |
| `SortingHelpers.performIntegerSort` | **Deux** avertissements empilés — retrait en v15 |
| `getDocumentClass`, `Macro`, `Folder` | **Non dépréciés** — globaux légitimes |
| `foundry.utils.performIntegerSort` | Aucun avertissement |
| Effets actifs sur les compétences | Aucune erreur « phase has already completed » |
| Garde de la migration `3.0.0` | S'évalue à `false` — **la migration n'a jamais tourné** |
| Plafond de maîtrise scolaire | an 1 → 30 · an 3 → 60 · an 5 → 90 · an 6 → 100 · an 7 → 100 |
| Rattrapage des presets | 55 compétences persistées → 59 préparées, sur 8 personnages |
| Bascule auto → manuel du plafond | an 3 auto = 60 → manuel 42 → passage en an 5 : reste 42 |
| Images cassées dans les compendiums | 0 sur 1082 documents |
| Fiches d'objets, 8 types | Un seul onglet visible à la fois, en-tête à 140 px pour tous |
| Malus de formule extrême maîtrisée | non maîtrisée −30 · maîtrisée −20 · mode extrême −40 |
| Fermeture d'une fenêtre de jet | Plus aucun dé lancé, sur les 6 appels concernés |
| Onglet *Familier* sur une fiche de PNJ | Présent (9 onglets), création et liaison fonctionnelles |
| Cadenas du plafond scolaire | Déverrouillage immédiat, reverrouillage toujours confirmé — 18 essais sur 18 à la souris réelle |
| Budget de PNJ, §22.2.1 | standard 350/460/600/760 · rival 400/510/650/810 (années 1/3/5/7) |
| Avantage *Troisième œil* | Sens à `PER × 4` apparaît et disparaît avec l'avantage |
| Avantage *Problèmes visuels* | Livré désactivé ; une fois activé, Vue 70 → 14 |
| Compétences octroyées par avantage | 4 lignes apparaissent et disparaissent, jamais écrites en base |
| Bonus de duel *Initié au duel* | 26 que l'effet conditionnel soit allumé ou éteint (était 28 / 26) |
| Mode formule extrême | 0 sortilège sur 366 rendu plus facile qu'en mode classique (était 251) |
| Tri du tracker en duel | À initiative égale, P1 avant P3 et P2 avant P4 |
| Legilimancie contre Occlumancie | Intrusion / échec / renversement / égalité au Legilimens |
| Migration `1.2.0` | Exécutée : 0 résidu sur 11 acteurs, 2219 points de compétence préservés |
| Identité visuelle de la fiche PNJ | Titres à 16,8 px, accent de maison appliqué, grille correcte |

**Faux positif à ignorer** : un avertissement porte sur le global `FilePicker`, mais sa pile
d'appel pointe `forge-vtt.com/js/forgevtt-module.js` — il vient du **module Forge**, pas du
système.

---

## Annexe — Périmètre audité

```
hogwarts-system/
  system.json              manifeste
  eslint.config.mjs        configuration du linter
  module/
    hogwarts-system.mjs    1130 l.  point d'entrée, hooks, réglages, migrations
    documents/             actor.mjs, item.mjs, combat.mjs
    data/                  17 modèles (5 Actor, 8 Item, 2 bases, house-points, _module)
    sheets/                actor-sheet.mjs (1531 l.), item-sheet.mjs (630 l.),
                           quidditch-team-sheet.mjs, actor/ (8 modules par domaine)
    applications/          house-points.mjs, quidditch.mjs, character-creation.mjs,
                           duel.mjs, opposition.mjs
    helpers/               config.mjs, degrees.mjs, effects.mjs, quidditch.mjs,
                           duel.mjs, opposition.mjs
  templates/               30 fichiers .hbs
  lang/                    en.json, fr.json
  packs/                   6 compendiums + sources JSON
  test/                    rules.test.mjs, integrity.test.mjs — 50 tests
  tools/                   check-tests.py (vérification par mutation)
  build-compendia.mjs      livres → JSON
  build-packs.mjs          JSON → LevelDB
```

**Hors périmètre :** `node_modules/`, `src/scss/`, `css/`.
**Hors dépôt :** `rules/` — livres de tiers, conservés en local (voir §2).
