# Hogwarts System

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)
![Version](https://img.shields.io/badge/version-3.3.0-blue)
![Licence](https://img.shields.io/badge/licence-MIT-lightgrey)

Système Foundry VTT pour le jeu de rôle amateur **Harry Potter JdR** (v1.12) et ses
suppléments : le *Grimoire des sortilèges, potions et ingrédients* (v1.11), le
*Bestiaire des animaux fantastiques*, l'*Encyclopédie des Esprits, Êtres et Non-êtres*
et le livret *Maladies, Blessures, Empoisonnements, Malédictions et objets maudits*.

Le système fournit les fiches, les jets, l'économie de points et les compendiums.
Il ne contient aucun texte de règle recopié : les compendiums sont générés à partir
des tableaux des livres, que vous devez posséder par ailleurs.

---

## Sommaire

- [Installation](#installation)
- [Contenu](#contenu)
- [Règles implémentées](#règles-implémentées)
- [Réglages](#réglages)
- [Développement](#développement)
- [Régénérer les compendiums](#régénérer-les-compendiums)
- [Ambiguïtés des sources](#ambiguïtés-des-sources)
- [Crédits et licence](#crédits-et-licence)

---

## Installation

Dans Foundry, **Configuration → Systèmes de jeu → Installer un système**, puis collez
l'URL de manifeste suivante :

```
https://github.com/nerokiryu/HP-System/releases/latest/download/system.json
```

Prérequis : **Foundry VTT v14** (minimum `14`, vérifié sur `14.365`).
Langues fournies : français et anglais.

---

## Contenu

### Types d'acteurs

| Type | Usage |
|---|---|
| `character` | Personnage joueur : caractéristiques, compétences, maison, année, baguette, hybridité, expérience |
| `npc` | Personnage non joueur, avec un facteur de puissance (`cr`) utilisé pour l'expérience |
| `familiar` | Familier lié à un personnage, avec ses propres compétences et avantages |
| `creature` | Créature du *Bestiaire* ou de l'*Encyclopédie* |

### Types d'objets

| Type | Usage |
|---|---|
| `spell` | Sortilège : niveau, école, cible, incantation, malus, formule extrême |
| `potion` | Potion : niveau, virulence, rareté, temps de préparation, doses, ingrédients |
| `component` | Ingrédient de potion |
| `weapon` | Arme : dégâts, type, portée |
| `armor` | Protection |
| `gear` | Équipement courant : quantité, poids, coût |
| `broom` | Balai : marque, caractéristiques |
| `feature` | Avantage, désavantage, faveur et disgrâce du destin, capacité |

### Compendiums

| Compendium | Type | Documents | Source |
|---|---|---:|---|
| Hogwarts Spells | Item | 366 | *Grimoire* + livre de base |
| Hogwarts Potions | Item | 139 | *Grimoire* |
| Hogwarts Components | Item | 310 | *Grimoire* |
| Hogwarts Creatures | Actor | 162 | *Bestiaire* + *Encyclopédie* |
| Hogwarts Features | Item | 31 | Livre de base |

---

## Règles implémentées

### Jets

Jet de `1d100` sous la valeur de compétence, modifiée par le malus du sort ou de la
potion, l'affinité de baguette, le stress et les modificateurs de circonstance.
Les degrés de réussite sont ceux du livre de base : **critique** sur `01-05`,
**maladroit** sur `96-00`, sinon réussite ou échec.

Le maladroit est évalué **avant** la réussite : un `96` reste un maladroit même si le
seuil dépasse 96, conformément au livre (« non seulement l'action est manquée »).

Un réglage facultatif ajoute les paliers étendus *Extrême* et *Difficile* du BRP.

### Magie

- Écoles : Enchantements, Métamorphose, Mauvais sorts, et les sorts hors école.
- **Sorts instinctifs (pré-scolaires)** : jet sous POUvoir × 3 plutôt que sous la
  compétence d'école.
- **Sans baguette** : −75 %. **Informulé** : −30 %. Les deux se cumulent avec le
  malus propre du sort.
- **Formule extrême** : choisie au moment du lancer si le sort en possède une.
  La maîtriser abaisse durablement le malus du sort de base — les livres notent
  cela `FE : A%/B%`, où `A` est le malus une fois la formule maîtrisée et `B` celui
  du lancer en mode extrême.
- **Affinité de baguette** : +10 % lorsque le champ `affinity` de la baguette
  mentionne l'école du sort lancé (« enchantements », « métamorphose »,
  « mauvais sorts » et leurs variantes).

### Combat

- **Initiative** : `1d6 + DEX + bonus`, relancée à chaque round par défaut.
- **Phases de tour** et gestion de la **surprise** ; les égalités sont tranchées en
  faveur des joueurs.
- **Réactions** : esquive, parade, protection magique.
- **Blessures** : seuils de dégâts, inconscience, mort et récupération.
  Deux procédures d'assommement sont proposées par le livre, toutes deux disponibles.
- L'armure peut être déduite automatiquement des dégâts.

### Progression

- **Points de création** (400 par défaut) et **points de bonus personnel**.
- **Jets d'apprentissage** avec la règle des 90 % : au-delà, la compétence progresse
  sur un jet sous l'INTelligence.
- **Réserves de points d'expérience**, débloquant les compétences de Savoir et de
  Langue à partir de 5 %.
- **Progression scolaire annuelle**, en mode forfaitaire ou dégressif au choix.
- **Maximum des compétences d'école** plafonné à 100 %, recalculé au changement
  d'année tant qu'il n'a pas été forcé manuellement.

### Personnages hybrides

27 combinaisons de race et de génération, 134 capacités. Les modificateurs de
caractéristiques se répercutent sur les points de vie, le bonus aux dégâts,
l'initiative et les sens dérivés.

### Points de maison

Compteur par maison, présenté sous forme de sabliers animés, synchronisé entre tous
les clients connectés. Accessible depuis les contrôles de scène ou les réglages.

---

## Réglages

### Réglages de monde

| Clé | Description | Défaut |
|---|---|---|
| `useExtendedSuccessTiers` | Ajoute les paliers *Extrême* et *Difficile* du BRP | `false` |
| `excludeSchoolSkillsFromCP` | Les compétences scolaires ne consomment pas de points de création | `false` |
| `knockoutMethod` | Procédure d'assommement : `classic` ou `alternative` | `alternative` |
| `applyArmorOnDamage` | Déduit l'armure automatiquement des dégâts | `true` |
| `rerollInitiativeEachRound` | Relance l'initiative à chaque round | `true` |
| `schoolXpMode` | Gain scolaire annuel : `flat` ou `tapered` | `flat` |
| `housePoints` | Points de maison (donnée, non exposée dans l'interface) | tous à `0` |
| `migrationVersion` | Version de migration (interne) | `''` |

### Réglages par client

| Clé | Description | Défaut |
|---|---|---|
| `warnOnNegativeExperience` | Avertit lorsqu'une valeur d'expérience passe sous zéro | `true` |
| `tabsUseIcons` | Affiche les onglets en icônes plutôt qu'en texte | `true` |

---

## Développement

### Prérequis

[Node.js](https://nodejs.org) 20 ou supérieur.

```bash
npm install
```

### Commandes

| Commande | Effet |
|---|---|
| `npm run build` | Compile `src/scss/` vers `css/hogwarts-system.css` |
| `npm run watch` | Idem, en surveillant les modifications |
| `npm test` | Exécute les tests unitaires (`node --test test/`) |
| `npm run compendia` | Régénère les compendiums depuis les livres source |
| `npm run createSymlinks` | Crée les liens symboliques vers le dossier Foundry |

Pour `createSymlinks`, copiez d'abord `example-foundry-config.yaml` en
`foundry-config.yaml` et renseignez-y les chemins de votre installation.

Le CSS livré est compilé : **ne modifiez pas `css/hogwarts-system.css` à la main**,
éditez les fichiers de `src/scss/` puis recompilez.

### Structure

```
module/
  hogwarts-system.mjs      Point d'entrée : hooks, réglages, migrations, helpers Handlebars
  data/                    Modèles de données (TypeDataModel) par type d'acteur et d'objet
  documents/               Classes Actor, Item et Combat
  sheets/                  Fiches ApplicationV2 des acteurs et des objets
  applications/            Applications autonomes (points de maison)
  helpers/                 Configuration, degrés de réussite, effets actifs
templates/                 Gabarits Handlebars
src/scss/                  Sources du thème
packs/                     Compendiums (base LevelDB) et leur source JSON
test/                      Tests unitaires
```

### Points d'attention pour Foundry v14

Le système utilise les API v14 : `ApplicationV2` avec `HandlebarsApplicationMixin`,
`TypeDataModel`, `foundry.applications.api.DialogV2`,
`foundry.applications.ux.TextEditor`, le hook `renderChatMessageHTML` et le registre
`foundry.applications.instances`. Les équivalents V1 (`ui.windows`,
`renderChatMessage`, `TextEditor` global) sont dépréciés et ne doivent pas être
réintroduits.

Les champs numériques des gabarits doivent utiliser `type="number"` et non
`type="text"` avec `data-dtype="Number"` : une saisie à virgule française produit
sinon une erreur de validation à la fermeture de la fiche.

---

## Régénérer les compendiums

Les compendiums sont dérivés des blocs JSON contenus dans les transcriptions des
livres, placées dans `../rules/md/`. Ces fichiers ne sont pas distribués avec le
système.

```bash
npm run compendia
```

`build-compendia.mjs` lit les livres et écrit `packs/<pack>/json/*.json` ;
`build-packs.mjs` compile ensuite ces fichiers vers la base LevelDB que Foundry lit.

Conventions appliquées par le générateur, documentées en tête de `build-compendia.mjs` :

- les malus sont toujours stockés **négatifs**, quelle que soit la notation du livre ;
- le palier `5+` des niveaux de sort et de potion est stocké comme la valeur `6` ;
- `FE : A%/B%` donne `B` au malus de formule extrême et `A` au malus une fois maîtrisée ;
- le mouvement des créatures reconnaît les formes `Sol`, `Vol`/`Air` et `Eau`/`Nage`,
  et retombe sur `8` en l'absence de valeur ;
- les points de vie manquants sont recalculés en `arrondi.sup((TAI + CON) / 2)`.

---

## Ambiguïtés des sources

Les livres se contredisent sur quelques points. Le système ne tranche pas
silencieusement : il expose un réglage ou documente le choix retenu.

| Sujet | Contradiction | Traitement |
|---|---|---|
| Gain d'expérience scolaire | §25.1 donne `1d6+1` la première semaine, §7.3 une table dégressive par trimestre | Réglage `schoolXpMode`, `flat` par défaut |
| Moyenne annuelle de 1ʳᵉ année | §7.3 annonce 21 %, mais sa propre formule `10+3d6+3` donne 23,5 | La formule fait foi |
| Signe des malus | Les sortilèges sont notés `FC : 20%`, les potions `-10%`, le livre de base parfois `FC : -20%` | Normalisé en négatif |
| Assommement | Le livre décrit deux procédures (§2.7.1 et §2.7.2) | Réglage `knockoutMethod` |

Deux affirmations d'audits antérieurs se sont révélées fausses à la vérification et
ne doivent pas être réintroduites : le *Bestiaire* publie bien plusieurs valeurs de
mouvement pour certaines créatures, et le *Grimoire* ne publie **pas** de valeur de
virulence ni de temps de préparation — ces champs restent à saisir à la main.

---

## Crédits et licence

Ce système dérive du [Boilerplate System](https://github.com/asacolips-projects/boilerplate)
d'Asacolips, publié sous licence MIT, dont il conserve la structure de départ.

*Harry Potter JdR* est un jeu de rôle amateur et gratuit. Cette implémentation n'est
affiliée ni à Warner Bros., ni à J. K. Rowling, ni à aucun ayant droit. Aucun contenu
des livres n'est redistribué : vous devez vous procurer les livres pour jouer.

Code distribué sous licence MIT — voir [LICENSE.txt](LICENSE.txt).

Signalements et suggestions : <https://github.com/nerokiryu/HP-System/issues>
