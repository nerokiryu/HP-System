# COMPARAISON RÈGLES ↔ SYSTÈME

**Livre de référence :** Harry Potter JdR v1.12 (`rules/md/Harry-Potter-JdR-v1.12.md`, 29 694 lignes)
**Suppléments :** Grimoire v1.11 · Bestiaire · Encyclopédie · Maladies & Blessures
**Système :** `hogwarts-system` v3.1.0, commit `cf0b986`
**Date :** 7 septembre 2026
**Périmètre :** fidélité aux règles du jeu.
La conformité technique Foundry v14 est traitée dans [AUDIT_FOUNDRY_V14.md](AUDIT_FOUNDRY_V14.md).

---

## Comment lire ce document

Chaque ligne cite le **numéro de ligne exact** dans le fichier markdown du livre. C'est délibéré :
un relecteur peut re-vérifier n'importe quel constat par un simple `sed -n '740,745p'` sans relire
29 694 lignes. **Tout constat non sourcé a été écarté.**

| Statut | Signification |
|--------|---------------|
| ✅ | Conforme aux règles |
| ⚠️ | Implémenté mais divergent ou incomplet |
| ❌ | Absent du système |
| 🧪 | Présent dans le système mais **absent des livres** (extension maison) |
| ❓ | Non tranché — nécessite un arbitrage |

Les actions correctives portent un identifiant `R-nn`, repris dans le backlog de
[AUDIT_FOUNDRY_V14.md §12](AUDIT_FOUNDRY_V14.md).

> **Avertissement sur la version précédente de ce document.** L'ancien `compare.md` affirmait que
> les compétences « Duels, Occlumancie, Legilimancie » étaient « présentes dans le schéma ». C'est
> **faux** : elles sont absentes de `config.mjs` (voir **§2, R-09**). Ce document a été reconstruit
> intégralement à partir des sources.

---

## Synthèse

| Domaine | ✅ | ⚠️ | ❌ | 🧪 |
|---------|----|----|----|----|
| Caractéristiques & dérivées | 6 | 2 | 3 | 1 |
| Compétences | 3 | 2 | 3 | 2 |
| Résolution & jets | 3 | 0 | 1 | 1 |
| Combat & santé | 1 | 1 | 6 | 0 |
| Magie | 3 | 1 | 2 | 2 |
| Potions | 2 | 1 | 1 | 0 |
| Fougue | 3 | 1 | 1 | 0 |
| Expérience | 1 | 2 | 4 | 1 |
| Vie scolaire | 0 | 1 | 5 | 0 |

**Trois constats structurants :**

1. **Un bug arithmétique avéré** — le gain d'expérience est de `1d6` au lieu de `1d6+1`
   (**R-01**). Chaque personnage progresse 1 point trop lentement, à chaque jet, depuis toujours.
2. **Les paliers de réussite étendus n'existent pas dans le livre** (**R-05**). Le système propose
   *Extreme* et *Hard* ; la source ne définit que 01-05 et 96-00. Ce n'est pas un bug, mais ce
   n'est pas non plus une règle du jeu — c'est un emprunt au BRP générique qui doit être étiqueté
   comme tel.
3. **Le socle est solide, la couche « vie scolaire » est absente.** Tout ce qui touche aux
   caractéristiques, aux dérivées, aux jets et à la magie est fidèle. En revanche l'école
   elle-même — progression scolaire, examens, mentorat, Quidditch, emploi du temps — n'est pas
   implémentée, alors que le livre lui consacre des règles chiffrées complètes.

---

## 1. Caractéristiques et valeurs dérivées (ch. 1-2)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Nombre de caractéristiques | 8 : FOR CON TAI PER DEX INT APP POU — l. 565 | `stats{str,con,siz,dex,int,pow,app,per}` | ✅ | — |
| Génération | `2d6+6` pour toutes — l. 566 | Pas d'assistant de création ; saisie manuelle | ⚠️ | R-02 |
| Points de vie | `(CON+TAI)/2`, **« on arrondit au supérieur »** — l. 740-741 | `Math.ceil((siz+con)/2)` — [actor-character.mjs:252](hogwarts-system/module/data/actor-character.mjs#L252) | ✅ | — |
| Bonus aux dommages | `2-24:0 · 25-32:+1d3 · 33-40:+1d6 · 41-60:+2d6` — l. 743-745 | Idem, mais dernier palier `>40` non borné — [actor-character.mjs:260-266](hogwarts-system/module/data/actor-character.mjs#L260) | ⚠️ | R-03 |
| Bonus de dommages **créature** | **Introuvable dans le livre de base, le Bestiaire et l'Encyclopédie** | Table étendue `−1d4 … +4d6` — [actor-creature.mjs:110-124](hogwarts-system/module/data/actor-creature.mjs#L110) | 🧪 | R-04 |
| Idée | `INT × 5` — l. 752 | `this.idea = int * 5` | ✅ | — |
| Chance | `POU × 5` — l. 756 | `this.luck = pow * 5` | ✅ | — |
| Perception (5 sens) | Goût ×3 · Odorat ×3 · Ouïe ×4 · Toucher ×3 · Vue ×5 — l. 3118-3122 | Identique | ✅ | — |
| Initiative | `1d6 + DEX` — l. 1084 s. | `CONFIG.Combat.initiative` — [hogwarts-system.mjs:49](hogwarts-system/module/hogwarts-system.mjs#L49) | ✅ | — |
| Mouvement | 8 m/round — l. 1512, 1520 | Champ `movement`, défaut 8 | ✅ | — |
| Malus d'âge | Appliqué au calcul des PV — l. 740 | Aucun | ❌ | R-06 |
| Progression annuelle | FOR/TAI/CON `+1`/an jusqu'à la fin de 5ᵉ année | Aucune automatisation | ❌ | R-07 |
| Durée du round | « quelques secondes », **non chiffrée** — l. 1084 | — | ❓ | Aucune action : la source est volontairement floue |

**R-03** — Le livre arrête sa table à `41-60`. Le code applique `+2d6` à tout total `> 40`, ce qui
est correct jusqu'à 60 mais extrapole au-delà. Sans incidence pour un personnage joueur (FOR+TAI
ne peut dépasser 60), mais c'est cette extrapolation qui a probablement engendré la table créature
maison (**R-04**).

---

## 2. Compétences (ch. 6)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Trois maîtrises (base / max / actuelle) | §6.10, l. 6707 s. | Champs `base` / `max` / `value` | ✅ | — |
| Maîtrise maximale scolaire | 0 % → **30 %** après les premières semaines → **+15 %/an** → 100 % — l. 6707-6710 | `(year-1)*15 + 30` — [actor-character.mjs:320](hogwarts-system/module/data/actor-character.mjs#L320) | ✅ | — |
| Bonus de première semaine | **+10 %** automatique dans toutes les matières suivies — l. 6849 | Aucun | ❌ | R-08 |
| Gain par période | An 1-2 : `1d6+1` · An 3-4 : `1d4+1` · An 5-7 : `1d4`, 3 périodes/an — l. 6850 | Aucune notion de période ; gain unique `1d6` | ❌ | R-08 |
| Filtrage par statut du sang | Sang-pur : sorcier seul · Né-moldu : moldu seul · Sang-mêlé : les deux **sans bonus de base** — l. 782-792 | Implémenté via `unavailable` | ✅ | — |
| Compétences spécifiques | **Alchimie, Duels, Occlumancie, Legilimancie** — §6.6, l. 6498-6508 | **Aucune des quatre n'existe dans `config.mjs`** | ❌ | R-09 |
| Valeurs `base`/`max` par compétence | **Le livre ne publie aucune table de référence** (un seul exemple chiffré, l. 6599) | 60+ couples `base`/`max` codés en dur dans `config.mjs` | 🧪 | R-10 |
| Mentorat | **+5 %/an**, effectifs **à la fois en base et en maximale** ; dès la 3ᵉ année ; 2 h/semaine/compétence ; plafond **95 %** — l. 6781-6790 | Aucun | ❌ | R-11 |
| Compétences plafonnées | Ex. Acrobatie/Quidditch bloquée à 60 % | `max` librement éditable, aucun verrou | ⚠️ | R-12 |
| `excludeSchoolSkillsFromCP` | Aucune contrepartie dans le livre | Réglage de monde | 🧪 | Aucune — confort MJ assumé |

**R-09** — Les quatre compétences scolaires spécifiques du §6.6 (Alchimie l. 6498, Duels l. 6501,
Occlumancie l. 6505, Legilimancie l. 6507) sont **toutes absentes** de `config.mjs` — un `grep` sur
les quatre noms ne renvoie rien. Trois d'entre elles étaient déclarées « présentes dans le schéma »
par l'audit précédent.

> À noter : Legilimancie et Occlumancie apparaissent **aussi** comme avantages achetables
> (l. 4182 et 4216), octroyant la compétence à **15 %**, maîtrise maximale **80 %** — des valeurs
> qui devront alimenter le catalogue.

**R-10** — Le livre décrit le fonctionnement des maîtrises de base et maximale (§6.10) mais ne
publie **pas** de table complète des pourcentages par compétence ; un seul exemple chiffré est
donné en passant (« Persuasion/Baratin » avec ses maîtrises, l. 6599). Les 60+ valeurs de
`config.mjs` sont donc des choix maison. Ils sont probablement raisonnables — mais ils doivent
être **déclarés comme tels**, sinon un futur relecteur les prendra pour du canon.

---

## 3. Résolution des jets (ch. 1-2)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Réussite | Résultat ≤ valeur de compétence | Implémenté | ✅ | — |
| Réussite critique | **01-05** — l. 978 | `r <= 5` | ✅ | — |
| Maladresse | **96-00** — l. 958 | `r >= 96` | ✅ | — |
| Paliers intermédiaires | **AUCUN.** Le livre ne définit que les deux extrêmes ci-dessus | *Extreme* `≤ ⌈cible/5⌉` et *Hard* `≤ ⌈cible/2⌉` — [actor-sheet.mjs:1108](hogwarts-system/module/sheets/actor-sheet.mjs#L1108) | 🧪 | R-05 |
| Opposition | `50 % − (passive×5) + (active×5)` — l. 1031-1032 | Formule identique, bornée `[1,99]` | ✅ | — |
| Difficulté / assistance | Non défini par le livre | Menus déroulants (Facile +25 … Extrême −50 ; Assistance +10/+25) | 🧪 | Aucune — outil MJ, sans effet sur le canon |

**R-05** — Le réglage `useExtendedSuccessTiers` est **désactivé par défaut**, ce qui est le bon
choix. Deux points à corriger malgré tout : (a) l'intitulé du réglage doit indiquer explicitement
qu'il s'agit d'une **règle optionnelle absente du livre** ; (b) l'arrondi retenu (`Math.ceil`)
n'est pinné par aucun exemple chiffré de la source — c'est la convention BRP générique, pas une
règle de ce jeu. À documenter comme tel.

> À noter : les cinq copies de cette logique de degrés sont aujourd'hui cohérentes entre elles
> (voir T-23 dans l'audit technique). Toute évolution devra les modifier **toutes les cinq**.

---

## 4. Combat, blessures et santé (ch. 2)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Trois phases de combat | Distance → mêlée/sorts → dégainer | Non modélisé | ❌ | R-13 |
| Blessure grave | Perte de **la moitié des PV actuels en un seul coup** → jet **`CON × 5`** — l. 1589 | Booléen `conditions.seriousWound`, aucune automatisation | ⚠️ | R-14 |
| Agonie | À **1 PV** → jet **`CON × 3`** par round — l. 1594 | Booléen `conditions.agony`, aucune automatisation | ⚠️ | R-14 |
| Assommer | 25 % de PV perdus → `CON × 3` · 50 % → `CON × 2` · 75 % → `CON × 1` — l. 2228-2231 | Aucun | ❌ | R-15 |
| Dégâts non létaux | Suivi séparé, KO au-delà des PV actuels | Champ `healthNonLethal` présent, **aucune logique** | ⚠️ | R-16 |
| Guérison naturelle | **`1d3`/semaine** · repos au lit **`1d6`/semaine** · hôpital **`2d3`/semaine** — l. 1986-1988 | Aucun | ❌ | R-17 |
| Parade / esquive | Esquive interdit d'attaquer ; parade 1×/round ; **on ne pare ni n'esquive un sort** | Aucun bouton dédié | ❌ | R-18 |
| Armures et boucliers | Réduction −1 à −8 ; bouclier ±10 %/±20 % à la parade | `armorValue` 0-10, non appliqué automatiquement | ⚠️ | R-19 |

Le combat est le domaine le moins couvert : les **champs de données existent** (`healthNonLethal`,
`conditions.seriousWound`, `conditions.agony`, `armorValue`) mais aucune **logique** ne les
alimente. C'est une base de départ, pas une implémentation.

---

## 5. Magie (ch. 11 et suivants)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Apprentissage d'un sort | `INT × 5 − malus`, **4 issues** : 01-05 maîtrise parfaite / réussite / échec (connaît sans savoir lancer) / 96-00 blocage — l. 23115-23116 | `_onLearnSpell`, 4 issues identiques | ✅ | — |
| Affinité de baguette | **+10 %** dans un domaine — l. 839 | `wand.affinity`, +10 si correspondance | ✅ | — |
| Lancer **sans baguette** | **−75 %**, cumulé au malus du sort (exemple du livre : 75+10 = 85 %) — l. 23205 | Aucun | ❌ | R-20 |
| Sort informulé | **NON PRÉCISÉ PAR LA SOURCE** | Aucun | ❓ | Aucune action — ne pas inventer |
| Compétence de lancement | **Pas de règle unifiée** ; dépend de la discipline de chaque sort | Compétence déduite du `spellType` | ⚠️ | R-21 |
| Magie instinctive / pré-scolaire | **Introuvable** — aucune règle « POU×3 » dans le livre | Champ `preSchool` → jet `POU×3` — [item-spell.mjs](hogwarts-system/module/data/item-spell.mjs) | 🧪 | R-22 |
| Malus de stress | −5 / −10 / −15 / −20 / −25 %+ — l. 3183 s. | `stress.value` 0-25, soustrait des cibles | ✅ | — |
| Opposition POU/POU | Requise par de nombreux sorts (champ `effets` du Grimoire) | Action `rollOpposition` générique disponible, non liée aux sorts | ⚠️ | R-21 |

**R-22** — Le champ `preSchool` et le jet `POU × 3` associé ne correspondent à aucune règle
retrouvée dans le livre de base. Deux hypothèses : soit la règle existe dans une section non
localisée, soit c'est une extension maison. À trancher avant de bâtir davantage dessus.

---

## 6. Potions

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Compétence utilisée | Compétence **Potions** − malus du niveau | `_onBrewPotion` sur la compétence Potions | ✅ | — |
| Malus par niveau | Propre à chaque potion, publié dans le Grimoire | Champ `malus` par potion | ✅ | — |
| Réussite critique | **« permet de créer une potion parfaite »** — l. 12922 | Produit `quantity + 2` au lieu de `+1` | ⚠️ | R-23 |
| Maladresse | **NON PRÉCISÉE PAR LA SOURCE** | Aucun effet | ❓ | Aucune action — ne pas inventer |
| Ingrédients | Liste + rareté par potion | `ingredientList[]` avec rareté et disponibilité | ✅ | — |
| Temps de préparation | Publié par le Grimoire | Champ `prepTime` **vide dans tout le pack** | ❌ | Voir T-15 |

**R-23** — « Potion parfaite » signifie, selon le livre, **maximiser les effets variables** de la
potion, pas en produire une quantité double. L'implémentation actuelle transforme un bonus de
qualité en bonus de quantité.

---

## 7. Fougue (ch. 8)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Dotation initiale | **1 point** en début de partie — l. 915 | Champ `fougue.value` | ✅ | — |
| Effet | **Inverser dizaines et unités** du résultat — l. 2994 | Bouton dédié : 73→37, 100→01, 05→50 | ✅ | — |
| Échec malgré la fougue | **Traité comme une maladresse** — l. 2995 | Degré recalculé après inversion | ✅ | — |
| Maximum | **NON PRÉCISÉ PAR LA SOURCE** | Champ `fougue.max` existe, non contraint | ❓ | R-24 |
| Gain | Critique sur action **hors combat** uniquement | Aucune automatisation | ❌ | R-25 |
| Remise à zéro | En fin de scénario | Aucune | ❌ | R-25 |

**R-24** — L'ancien audit affirmait un plafond de 5 points « non limité dans le code ». La
vérification ne retrouve **aucun plafond** dans le livre de base. Le champ `fougue.max` est donc
correct en tant que valeur libre réglée par le MJ — mais son intitulé devrait le dire.

---

## 8. Expérience et progression (ch. 7 et 25)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Jet d'amélioration | `1d100` **>** valeur → gain **`1d6+1`** — l. 6834 | `new Roll('1d6')` — [actor-sheet.mjs:1904](hogwarts-system/module/sheets/actor-sheet.mjs#L1904) | ❌ | **R-01** |
| Seuil de 90 % | Jet sous **`INT`** (pas INT×5), gain limité à **+1** — l. 6836-6837 | Aucun | ❌ | R-26 |
| Système de coches | Le MJ coche une compétence après une action marquante | Case `xpCheck` par compétence | ✅ | — |
| XP scolaire par période | 3 périodes/an, dés dégressifs — l. 6850 | Aucune notion de période | ❌ | R-08 |
| XP de fin d'année | `Année × 2 + 1 %` + bonus additifs (quêtes annexes, RP, fougue, idées) — l. 28297-28305 | `_onResolveXP` traite les coches, **pas** le bilan annuel | ⚠️ | R-27 |
| Vacances | `1d10+1 %` dans les compétences non scolaires | Aucun | ❌ | R-28 |
| Multiplicateurs par Active Effect | Aucune contrepartie dans le livre | `xp.multiplier.*` / `xp.bonus.*` | 🧪 | Aucune — extension utile |

### R-01 — Le bug à corriger en premier

```js
// actor-sheet.mjs:1904 — actuel
const increaseRoll = new Roll('1d6');
```

Le livre, l. 6834 : « *la compétence augmente de 1D6+1 points* ».

Le gain moyen réel est donc de **3,5 au lieu de 4,5** : un déficit de **22 %** sur toute la
progression du personnage, à chaque jet, depuis la première version du système. C'est une
correction d'une ligne dont l'impact est cumulatif sur toute une campagne.

> Attention à ne pas régresser sur le reste de la fonction : le multiplicateur et le bonus d'Active
> Effect (`Math.max(1, Math.ceil(rawIncrease * multiplier) + bonus)`, l. 1909) s'appliquent
> **après** le jet. Il faut décider si le `+1` canonique entre dans le multiplicateur ou s'ajoute
> ensuite — le livre ne tranche pas, puisque les multiplicateurs sont une extension maison.

---

## 9. Vie scolaire et sous-systèmes non implémentés

Tous ces sous-systèmes disposent de **règles chiffrées** dans le livre et n'ont **aucune**
contrepartie dans le système.

| Sous-système | Contenu des règles | Ligne | Action |
|--------------|--------------------|-------|--------|
| **Quidditch** | Règles complètes : Vif d'or (l. 29510), Pincevif (l. 29575), tableau des rôles Attrapeur/Batteur/Gardien/Poursuiveur et de leurs actions (l. 29636 s.), exemple de match commenté (l. 29870 s.) | 29 510 s. | R-29 |
| **Examens B.U.S.E. / A.S.P.I.C.** | Notation O/E/A/P/D/T | ch. 23 | R-30 |
| **Points de maison** | Tables situationnelles (attribution et retrait par les professeurs et préfets) | 27 548 s. | R-31 |
| **Gestion du temps** | Répartition sommeil / devoirs / activités, influant sur les gains de compétence et le stress | ch. 26 | R-32 |
| **Mentorat** | `+5 %`/an en base **et** en maximale, dès la 3ᵉ année, plafond 95 % | 6 781-6 790 | R-11 |
| **Duel magique** | Types de duels et sorts autorisés ; avantage « Initié au duel » = **+2 en initiative** (coût −0,5) | 4 157 | R-33 |
| **Legilimancie / Occlumancie** | Compétences du §6.6 (l. 6505, 6507) **et** avantages à 15 %, max 80 % (l. 4182, 4216) | 4 182 · 6 505 | R-09, R-34 |
| **Création d'objets** | Procédure par potions de Duplication / Transfert / Combinaison | ch. 14 | R-35 |
| **Personnages hybrides** | Sous-races : ajustements de caractéristiques, armes naturelles, capacités | ch. 17 | R-36 |
| **Animagus** | **Uniquement un avantage** octroyant la compétence Animagus à 20 %, max 90 %. **Aucune procédure de transformation n'est publiée** | 3 752 | R-37 |

**R-31** — Le réglage `housePoints` (4 maisons à 0) existe déjà côté technique : il ne manque que
l'interface et les tables. C'est le sous-système au meilleur rapport effort/rendu.

**R-37** — Le schéma `character` comporte `animagus.{form, mastery, transformed, declared}` avec
quatre niveaux de maîtrise (`none`/`learning`/`partial`/`full`). Le livre ne décrit **rien de
tel** : seulement un avantage donnant une compétence. Ces champs sont donc 🧪 **maison** et
devraient soit être adossés à une règle explicite, soit être documentés comme extension.

---

## 10. Backlog des corrections de règles

Les identifiants ci-dessous alimentent le backlog global de
[AUDIT_FOUNDRY_V14.md §12](AUDIT_FOUNDRY_V14.md).

### P0 — Bug avéré

| ID | Action | Coût |
|----|--------|------|
| **R-01** | `1d6` → `1d6+1` dans `_onResolveXP` | 1 ligne |

### P1 — Étiquetage du contenu hors règles

Aucun code à écrire : il s'agit d'empêcher que du homebrew soit pris pour du canon.

| ID | Action |
|----|--------|
| R-05 | Intituler `useExtendedSuccessTiers` comme règle optionnelle absente du livre ; documenter l'arrondi `Math.ceil` |
| R-10 | Documenter les `base`/`max` de `config.mjs` comme valeurs maison |
| R-04 | Documenter la table de dommages créature comme extension |
| R-22 | Trancher l'origine de `preSchool` / `POU×3` |
| R-24 | Clarifier que `fougue.max` n'est pas plafonné par le livre |
| R-37 | Documenter les champs `animagus` comme extension |

### P2 — Mécaniques centrales manquantes

| ID | Action |
|----|--------|
| R-08 | Progression scolaire : +10 % 1ʳᵉ semaine, 3 périodes/an, dés dégressifs `1d6+1`/`1d4+1`/`1d4` |
| R-26 | Règle des 90 % : jet sous `INT`, gain +1 |
| R-09 | Ajouter Alchimie, Duels, Legilimancie, Occlumancie au catalogue |
| R-20 | Malus −75 % sans baguette |
| R-14 · R-15 | Automatiser blessure grave (`CON×5`), agonie (`CON×3`), seuils d'assommement |
| R-17 | Récupération `1d3` / `1d6` / `2d3` par semaine |
| R-27 | Bilan d'XP de fin d'année (`Année×2+1 %` + bonus) |
| R-23 | « Potion parfaite » = effets maximisés, pas quantité doublée |

### P3 — Sous-systèmes

| ID | Action |
|----|--------|
| R-31 | Points de maison (réglage déjà présent) |
| R-11 | Mentorat : +5 %/an en base et en maximale, dès la 3ᵉ année, plafond 95 % |
| R-29 | Quidditch |
| R-30 | Examens B.U.S.E. / A.S.P.I.C. |
| R-33 · R-34 | Duels, Legilimancie/Occlumancie |
| R-32 · R-35 · R-36 | Gestion du temps, création d'objets, hybrides |
| R-02 · R-06 · R-07 | Assistant de création `2d6+6`, malus d'âge, progression annuelle FOR/TAI/CON |
| R-12 · R-13 · R-16 · R-18 · R-19 · R-21 · R-25 · R-28 | Plafonds de compétences, phases de combat, dégâts non létaux, parade/esquive, armures, disciplines de sorts, gain/reset de fougue, XP de vacances |

---

## Annexe — Points volontairement laissés ouverts

Ces éléments sont **absents ou flous dans la source**. Ils ne doivent pas être « corrigés » par
invention, mais tranchés explicitement par le MJ ou par une décision de conception documentée.

| Sujet | État de la source |
|-------|-------------------|
| Durée du round en secondes | « quelques secondes » — l. 1084 |
| Plafond de fougue | Non précisé |
| Sorts informulés | Aucune pénalité publiée |
| Maladresse en fabrication de potion | Aucun effet publié |
| Compétence de lancement par discipline | Pas de table unifiée ; à lire sort par sort dans le Grimoire |
| Table de base/max des compétences | Non publiée (un seul exemple, l. 6599) |
