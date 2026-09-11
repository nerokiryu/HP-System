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
> les compétences « Duels, Occlumancie, Legilimancie » étaient « présentes dans le schéma ». C'était
> **faux** : aucune des quatre n'existait dans `config.mjs` (voir **§2, R-09** — depuis corrigé).
> Ce document a été reconstruit intégralement à partir des sources.

---

## Synthèse

| Domaine | ✅ | ⚠️ | ❌ | 🧪 |
|---------|----|----|----|----|
| Caractéristiques & dérivées | 6 | 2 | 3 | 1 |
| Compétences | 6 | 2 | 0 | 3 |
| Résolution & jets | 3 | 0 | 1 | 1 |
| Combat & santé | 15 | 0 | 0 | 0 |
| Magie | 5 | 1 | 0 | 2 |
| Potions | 2 | 1 | 1 | 0 |
| Fougue | 11 | 1 | 0 | 0 |
| Expérience | 6 | 1 | 0 | 1 |
| Vie scolaire | 3 | 1 | 2 | 0 |

**Trois constats structurants :**

1. **Le bug arithmétique est corrigé** — le gain d'expérience était de `1d6` au lieu de `1d6+1`
   (**R-01**, l. 6834). Chaque personnage progressait 1 point trop lentement, à chaque jet, depuis
   la première version du système.
2. **Les paliers de réussite étendus n'existent pas dans le livre** (**R-05**). Le système propose
   *Extreme* et *Hard* ; la source ne définit que 01-05 et 96-00. Ce n'est pas un bug, mais ce
   n'est pas non plus une règle du jeu — c'est un emprunt au BRP générique qui doit être étiqueté
   comme tel.
3. **Le socle est solide, la couche « vie scolaire » est absente.** Tout ce qui touche aux
   caractéristiques, aux dérivées, aux jets, à la magie et désormais aux blessures est fidèle. En
   revanche l'école elle-même — progression scolaire, examens, mentorat, Quidditch, emploi du
   temps — n'est pas implémentée, alors que le livre lui consacre des règles chiffrées complètes.

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
| Maîtrise maximale scolaire | 0 % → **30 %** après les premières semaines → **+15 %/an**, « pour atteindre les 100 % » — l. 6707-6714 | `Math.min(100, 30 + (year-1)*15)` — [actor-character.mjs:320](hogwarts-system/module/data/actor-character.mjs#L320) | ✅ | Corrigé |
| Bonus de première semaine | **+10 %** automatique dans toutes les matières suivies — l. 6849 | Bouton « Période scolaire » (voir §8) | ✅ | Corrigé |
| Gain par période | An 1-2 : `1d6+1` · An 3-4 : `1d4+1` · An 5-7 : `1d4`, 3 périodes/an — l. 6850 | Deux modes au choix (voir §8) | ✅ | Corrigé |
| Filtrage par statut du sang | Sang-pur : sorcier seul · Né-moldu : moldu seul · Sang-mêlé : les deux **sans bonus de base** — l. 782-792 | Implémenté via `unavailable` | ✅ | — |
| Compétences spécifiques | **Alchimie, Duels, Occlumancie, Legilimancie** — §6.6, l. 6498-6508 | Catégorie `special` — [config.mjs](hogwarts-system/module/helpers/config.mjs) | ✅ | Corrigé |
| Valeurs `base`/`max` par compétence | **Le livre ne publie aucune table de référence** (un seul exemple chiffré, l. 6599) | 60+ couples `base`/`max` codés en dur dans `config.mjs` | 🧪 | R-10 |
| Mentorat | **+5 %/an**, effectifs **à la fois en base et en maximale** ; dès la 3ᵉ année ; 2 h/semaine/compétence ; plafond **95 %** — l. 6781-6790 | Aucun | ❌ | R-11 |
| Compétences plafonnées | Ex. Acrobatie/Quidditch bloquée à 60 % | `max` librement éditable, aucun verrou | ⚠️ | R-12 |
| `excludeSchoolSkillsFromCP` | Aucune contrepartie dans le livre | Réglage de monde | 🧪 | Aucune — confort MJ assumé |

**R-09** — Les quatre compétences scolaires spécifiques du §6.6 (Alchimie l. 6498, Duels l. 6501,
Occlumancie l. 6505, Legilimancie l. 6507) étaient **toutes absentes** de `config.mjs`. Trois
d'entre elles étaient déclarées « présentes dans le schéma » par l'audit précédent.

### Correctif appliqué — compétences spécifiques

Les quatre compétences sont ajoutées à la catégorie **`special`**, et non `school` : les cours
débutent en 3ᵉ année (Duels) ou en 6ᵉ (Alchimie), donc la progression annuelle du max
(30 % → +15 %/an) ne doit **pas** s'y appliquer — un élève de 6ᵉ débutant l'Alchimie serait
sinon placé d'emblée à 90 % de maîtrise maximale.

| Compétence | Base | Max | Source |
|------------|------|-----|--------|
| Alchimie | 0 % | 95 % | 🧪 **non publié** — défaut du schéma |
| Duels | 0 % | 95 % | 🧪 **non publié** — défaut du schéma |
| Legilimancie | 15 % | 80 % | ✅ l. 4257 (avantage *Legilimens*, coût −2) |
| Occlumancie | 15 % | 80 % | ✅ l. 4297 (avantage *Occlumens*) |

Le livre ne publie aucun pourcentage pour Alchimie ni pour Duels : les valeurs retenues sont le
défaut neutre du schéma, pas une lecture de la source.

> Variante non implémentée : *Legilimancie innée* et *Occlumancie innée* à **50 % / 95 %**
> (l. 24416-24419), réservées à certains hybrides et utilisables **sans baguette**. Relève du
> sous-système des personnages hybrides (R-36).

Le semis des compétences ne s'appliquait qu'aux listes **vides**, donc aux seuls nouveaux
personnages. Comme les compétences preset ne peuvent pas être supprimées de la fiche
(`CannotDeletePreset`), toute preset absente signale un ajout postérieur à la création du
personnage : le semis est devenu un **rattrapage idempotent**
([actor-character.mjs](hogwarts-system/module/data/actor-character.mjs#L216)), qui complète les
personnages existants sans toucher à leurs valeurs ni à leurs compétences personnalisées. Aucune
migration versionnée n'est nécessaire.

**R-10** — Le livre décrit le fonctionnement des maîtrises de base et maximale (§6.10) mais ne
publie **pas** de table complète des pourcentages par compétence ; un seul exemple chiffré est
donné en passant (« Persuasion/Baratin » avec ses maîtrises, l. 6599). Les 60+ valeurs de
`config.mjs` sont donc des choix maison. Ils sont probablement raisonnables — mais ils doivent
être **déclarés comme tels**, sinon un futur relecteur les prendra pour du canon.

### Correctif appliqué — maîtrise maximale scolaire

Deux défauts corrigés dans [actor-character.mjs:320](hogwarts-system/module/data/actor-character.mjs#L320) :

1. **Dépassement du plafond.** L'ancienne formule `(year-1)*15 + 30` donnait **105 %** en 6ᵉ année
   et **120 %** en 7ᵉ, alors que le livre écrit « augmente ensuite de 15 % chaque année pour
   atteindre les 100 % » (l. 6714). Désormais `Math.min(100, …)`.
2. **Blocage en cas de saut d'année.** L'ancien code ne reconnaissait comme « non modifié » qu'une
   valeur égale au maximum de l'année *précédente* : un personnage passant de la 1ʳᵉ à la 4ᵉ année
   restait figé à 30 %. Le suivi automatique repose maintenant sur un champ explicite
   `maxOverride` ([l. 55](hogwarts-system/module/data/actor-character.mjs#L55)) au lieu de deviner
   à partir de la valeur.

La maîtrise maximale scolaire est aussi devenue **éditable** : un bouton bascule entre suivi
automatique et saisie manuelle
([`_toggleSkillMaxAuto`](hogwarts-system/module/sheets/actor-sheet.mjs#L1764)). Tant que le mode
automatique est actif, la valeur suit l'année ; en mode manuel, elle est libre et n'est plus
écrasée.

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
| Initiative | `1d6 + DEX`, **relancée au début de chaque round** — l. 2033 | `CONFIG.Combat.initiative` + relance automatique (réglable) | ✅ | Corrigé |
| Égalité d'initiative | Départage au `1d6` ; **PJ contre PNJ, le joueur l'emporte** — l. 2038 | Le PJ passe devant dans le tri | ✅ | Corrigé |
| Trois phases d'action | 1 projectiles · 2 mêlée/sorts/déplacement · 3 dégainer/fouiller — l. 2093-2111 | Badge cliquable par combattant, tri phase → initiative | ✅ | Corrigé |
| Pris par surprise | Agit en **3ᵉ phase**, sans action, donc réellement au 2ᵉ round — l. 2051-2054 | Marqueur Alt+clic, phase 3 forcée au round 1 puis levé | ✅ | Corrigé |
| **Mort** | **0 PV ou moins = mort instantanée et définitive** — l. 1602 | Statut Foundry « mort » appliqué automatiquement | ✅ | Corrigé |
| Blessure grave | Perte de **la moitié des PV actuels en un seul coup** → jet **`CON × 5`** ; échec = inconscient **(21 − CON) minutes** — l. 1589 | Seuil détecté, bouton de jet dans le chat | ✅ | Corrigé |
| Agonie | À **1 PV** → jet **`CON × 3`** par round ; échec = inconscient **(21 − CON) heures** — l. 1594 | Seuil détecté, bouton de jet | ✅ | Corrigé |
| Assommer | §2.7.1 table de résistance **ou** §2.7.2 paliers 25 % → `CON×3`, 50 % → `CON×2`, 75 % → `CON×1` ; 1/3 des dégâts au réveil — l. 2228-2231 | Les deux méthodes, au choix dans les réglages | ✅ | Corrigé |
| Dégâts non létaux | Cumul séparé ; **= PV restants → chancelant**, **> PV restants → inconscient** ; un dégât de plus sur un inconscient = mort — l. 1943-1947 | Bouton dédié, seuils et conditions automatisés | ✅ | Corrigé |
| Guérison naturelle | **`1d3`/semaine** · repos au lit **`1d6`** · hôpital **`2d3`** ; jamais au-dessus du total initial ; chocolat = ×2 et +1 au dé — l. 1986-1993 | Action « Récupération hebdomadaire » sur la fiche | ✅ | Corrigé |
| Esquive | Compétence à part entière ; **un personnage qui esquive ne peut pas attaquer** — §2.5.1 | Bouton dédié, restriction rappelée sur la carte | ✅ | Corrigé |
| Parade | **Jet de la compétence d'attaque**, pas une compétence propre ; **une seule fois par round** ; corps à corps uniquement — §2.5.2 | Bouton dédié, choix de la compétence, blocage après la 1ʳᵉ parade | ✅ | Corrigé |
| Sortilèges irrésistibles | « **On ne peut ni parer, ni esquiver les sortilèges** » — §2.5.2 | Rappelé sur chaque carte de réaction | ✅ | Corrigé |
| Armures | Réduction **−1 à −8** soustraite des dégâts — l. 2367-2376 | Champ « équipée » sur les armures, soustraction automatique | ✅ | Corrigé |
| Boucliers | **±10 %** petit bouclier, **±20 %** grand écu : bonus à la parade, malus équivalent à l'attaque — §2.8.2 | Champ sur les armures, bonus appliqué à la parade | ✅ | Corrigé |

### Correctif appliqué — combat, blessures et santé

Le chapitre 1.8 à 1.11 est désormais couvert. L'application des dégâts se limitait auparavant à
`health.value − dégâts` borné à 0 : aucun seuil, aucune armure, aucun suivi des dégâts non létaux.

**Choix de conception retenus** (les règles laissent plusieurs portes ouvertes) :

- **Les jets de CON ne partent pas tout seuls.** Le système détecte le seuil franchi et publie une
  carte avec un bouton *Jet CON×N* ; le MJ décide quand le lancer. Les seuils sont mécaniques, le
  déclenchement reste narratif.
- **L'armure ne compte que si elle est portée.** Un champ `equipped` a été ajouté aux objets de type
  armure ; sans lui, sommer l'inventaire aurait donné une réduction fausse dès qu'un personnage
  transporte plusieurs protections. Désactivable par réglage.
- **Les deux méthodes d'assommement sont disponibles**, le livre en proposant deux sans trancher.
  Réglage de monde, l'alternative (paliers) par défaut.
- **La mort applique le statut Foundry `dead`**, conformément à la lettre du livre — « *la mort est
  définitive* ».

**Seuils vérifiés par simulation** (personnage à 10 PV) :

| Dégâts | PV restants | Conséquence |
|--------|-------------|-------------|
| 2 | 8 | — |
| 5 | 5 | blessure grave (`CON×5`) |
| 9 | 1 | blessure grave **et** agonie (`CON×3`/round) |
| 10 | 0 | mort |

Assommement alternatif sur 10 PV : 3 dégâts → `CON×3`, 5 → `CON×2`, 8 → `CON×1`.
Durées d'inconscience : `21 − CON` pour les blessures, `CON` heures pour un assommement.

> **Interprétation à valider en jeu** : le chocolat « double la vitesse de récupération tout en
> ajoutant un bonus de +1 au dé » (l. 1993). L'implémentation calcule `(dé + 1) × 2`. L'ordre des
> deux opérations n'est pas précisé par la source.

### Correctif appliqué — initiative et ordre des actions

Le système se contentait de la formule `1d6 + DEX` déclarée dans `CONFIG.Combat.initiative` :
l'initiative était donc roulée **une seule fois** et conservée pour tout le combat, sans aucune
notion de phase ni de surprise.

Une classe `HogwartsCombat` ([combat.mjs](hogwarts-system/module/documents/combat.mjs)) prend
désormais en charge :

- **Le tri par phase puis par initiative décroissante.** La phase prime toujours : un archer à 5
  d'initiative agit avant un duelliste à 20.
- **L'égalité en faveur du joueur** — le livre tranche explicitement (l. 2038).
- **La relance de l'initiative à chaque round**, conforme au « *au début de chaque round* » de la
  l. 2033. Désactivable par réglage, la relance systématique ne plaisant pas à toutes les tables.
- **La surprise** : un combattant marqué surpris est forcé en 3ᵉ phase au premier round, ce qui
  reproduit le « *n'agira que durant le second round* » de la l. 2054, puis le marqueur se lève seul.

Dans le tracker de combat, chaque ligne porte un badge coloré indiquant sa phase : un clic la fait
défiler, Alt+clic bascule la surprise.

**Vérification sur l'exemple chiffré du livre** (l. 2042-2047) — Kateline DEX 11 + 2, Melissa
DEX 10 + 5, Andy DEX 16 + 2 :

| Ordre attendu par le livre | Ordre produit |
|----------------------------|---------------|
| Andy (18), Melissa (15), Kateline (13) | Andy (18), Melissa (15), Kateline (13) ✅ |

> **Non implémenté volontairement** : le départage à égalité **entre deux joueurs** se fait au `1d6`
> (l. 2037). Le système applique un ordre stable plutôt que de lancer un dé invisible — un jet
> automatique et non montré serait plus déroutant qu'utile. À arbitrer à la table.

### Correctif appliqué — réactions : esquive, parade, boucliers

Deux boutons apparaissent dans l'en-tête des fiches de personnage.

- **Esquive** roule la compétence du même nom et rappelle sur la carte qu'un personnage qui esquive
  ne peut pas attaquer ce round.
- **Parade** demande d'abord *quelle* compétence d'attaque est employée — le livre insiste : la
  parade « n'est pas vraiment une compétence, c'est seulement une autre manière d'utiliser les
  compétences d'attaque ». La liste ne propose que les compétences martiales, et **exclut Esquive**,
  qui est une défense et non une attaque.
- **Une seule parade par round** : l'état est stocké avec le numéro de round courant, si bien qu'il
  se réinitialise seul au round suivant et hors combat, sans aucun nettoyage à faire.
- **Les boucliers** sont un champ des objets de type armure : petit (±10 %) ou grand écu (±20 %).
  Le bonus s'ajoute à la parade, et le malus d'attaque correspondant est rappelé sur la carte.
- Chaque carte de réaction répète que **ni la parade ni l'esquive ne fonctionnent contre un
  sortilège**.

> **Le malus d'attaque du bouclier n'est pas appliqué automatiquement.** Le système ne distingue pas
> un jet d'attaque d'un jet de compétence ordinaire : le soustraire partout serait faux. Il est donc
> affiché comme rappel, et la valeur est exposée en `system.shieldBonus`.

> **Dette technique évitée** : la logique de degrés de réussite était déjà dupliquée cinq fois
> (T-23). Plutôt que d'en écrire une sixième copie, les réactions utilisent une fonction partagée
> `_degreeOf()`. Les cinq copies existantes restent à factoriser.

---

## 5. Magie (ch. 11 et suivants)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Apprentissage d'un sort | `INT × 5 − malus`, **4 issues** : 01-05 maîtrise parfaite / réussite / échec (connaît sans savoir lancer) / 96-00 blocage — l. 23115-23116 | `_onLearnSpell`, 4 issues identiques | ✅ | — |
| Affinité de baguette | **+10 %** dans un domaine — l. 839 | `wand.affinity`, +10 si correspondance | ✅ | — |
| Lancer **sans baguette** | **−75 %**, cumulé au malus du sort (exemple du livre : 75+10 = 85 %) — l. 23205 | Case au jet de sort, réduite par certaines ascendances | ✅ | Corrigé |
| Sort informulé | **−30 %**, cumulable avec le sans-baguette — l. 23224 | Case au jet de sort | ✅ | Corrigé |
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
| Réussite critique | **« permet de créer une potion parfaite »** — l. 12922 | Une dose, et la carte annonce les effets variables maximisés | ✅ | Corrigé |
| Maladresse | **NON PRÉCISÉE PAR LA SOURCE** | Aucun effet | ❓ | Aucune action — ne pas inventer |
| Ingrédients | Liste + rareté par potion | `ingredientList[]` avec rareté et disponibilité | ✅ | — |
| Virulence | Publiée, mais **dans la prose** : `VIRulence : N` au sein du champ `effets` | Extraite par le générateur — **19 potions** renseignées | ✅ | Corrigé |
| Durée des effets | Publiée dans la prose : `Durée : …` | Extraite — **54 potions** renseignées | ✅ | Corrigé |
| Temps de préparation | **Non publié** : le livre le laisse « à la discrétion du MJ » — l. 12963 | Champ libre, intitulé « Temps de préparation (MJ) » | ✅ | Corrigé |

**R-23** — « Potion parfaite » signifie, selon le livre, **maximiser les effets variables** de la
potion, pas en produire une quantité double. L'implémentation actuelle transforme un bonus de
qualité en bonus de quantité.

**R-38** — Les trois champs de fabrication étaient donnés pour « publiés par le Grimoire » et
vides dans tout le pack. La vérification renverse ce constat :

| Champ | Réalité de la source |
|-------|---------------------|
| `virulence` | **Publiée** — mais sans colonne dédiée : elle est enfouie dans le champ `effets` sous la forme `VIRulence : N`. 19 potions la portent. |
| `duration` | **Publiée** de la même manière, sous `Durée : …`. 54 potions après exclusion du tiret marquant l'absence de durée. |
| `prepTime` | **Jamais publié.** Le livre de base l'attribue explicitement au MJ (l. 12963). |

> **Piège d'extraction évité** : les antidotes emploient le même mot pour un **seuil**
> (« annule les poisons jusqu'à une VIRulence 10 »). Ce n'est pas leur propre virulence : seule la
> forme avec deux-points est lue, ce qui écarte les 2 lignes concernées.

---

## 7. Fougue (ch. 8)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Dotation initiale | **1 point** au début de chaque scénario — l. 10189 | `fougue.value` initial 1, rétabli par la fin de scénario | ✅ | Corrigé |
| Effet | **Inverser dizaines et unités** — l. 10202 | 71→17, 05→50, 80→08, 00→01 | ✅ | — |
| Inverser est **un choix** | « le personnage peut très bien choisir de garder le résultat obtenu » — l. 10203 | Dialogue « Inverser / Garder » après le jet déclaré | ✅ | Corrigé |
| Point consommé **quoi qu'il arrive** | « Quoi qu'il arrive, le point est utilisé » — l. 10201 | Dépensé même sur un palindrome et même si le joueur garde le résultat | ✅ | Corrigé |
| Déclaration **avant** le jet | l. 10199 | Case du dialogue de jet ; le bouton de chat reste disponible via `fougueAfterRoll` | ⚠️ | Assumé — réglage de monde, activé par défaut |
| Échec malgré la fougue | « équivalent à une **maladresse** » — l. 2995 | Degré escaladé en maladresse, réglage `fougueFailureIsFumble` | ✅ | Corrigé |
| **Maximum 5 points** | « pour un maximum de 5 durant une partie » — l. 10192 | `fougue.max` par défaut 5, migration des personnages existants | ✅ | Corrigé |
| Gain | Critique **001-005** sur une action passionnée, **hors combat** — l. 10190 | Bouton MJ sur la carte du critique, masqué pendant un combat actif | ✅ | Corrigé |
| Remise à zéro | « remis à 0 une fois le scénario terminé », 1 point au suivant — l. 10193 | Bouton MJ « Fin de scénario » dans les contrôles de scène | ✅ | Corrigé |
| Aucun gain en combat | « les personnages ne reçoivent **aucun** point de fougue en se battant » — §8.4 | Bouton de gain masqué si l'acteur est engagé dans un combat démarré | ✅ | Corrigé |
| Poursuite | −1 point → mouvement **×1,5**, course limitée à CON/2 rounds, repos équivalent — l. 1573 | Action « Sprint (Fougue) » sur la fiche | ✅ | Corrigé |

### Correctif appliqué — Fougue

L'ancienne version de ce document donnait quatre lignes pour conformes ou indécidables ; la
relecture du chapitre 8 en a infirmé trois.

**R-24 était faux.** Ce document affirmait « Maximum — **non précisé par la source** » et le
justifiait par « la vérification ne retrouve aucun plafond dans le livre de base ». La ligne 10192
est pourtant explicite : « gagne un point de fougue supplémentaire **pour un maximum de 5 durant
une partie** ». Le premier audit avait raison, c'est la correction qui avait tort. `fougue.max`
passe de 1 à 5, avec une migration pour les personnages existants — 1 n'ayant jamais été un choix,
seulement l'ancien défaut du schéma.

**Le point n'était pas toujours dépensé.** L'inversion n'était comptée que si elle changeait le
résultat : sur un palindrome (11, 22, … 99), le joueur récupérait son point. Le livre dit
l'inverse, et le §8.3 nomme précisément ce cas — « l'inversion d'un 77 ou d'un 99 n'apporte pas
grande différence ». Neuf résultats sur cent étaient concernés.

**L'inversion était forcée.** Le livre en fait un choix explicite, exercé *après* avoir vu le dé,
le point restant consommé dans les deux cas. Un dialogue « Inverser (17) / Garder (71) » le
restitue.

**L'échec n'était pas escaladé.** Ce document donnait la ligne « Échec malgré la fougue » pour
conforme, au motif que « le degré est recalculé après inversion ». Recalculer n'est pas escalader :
un jet manqué affichait « Échec », jamais « Maladresse ». La source se contredit d'ailleurs —
l'exemple joué de la l. 2995 est catégorique (« le résultat est équivalent à une maladresse »)
alors que le §8.3 en fait un pire cas. Les deux lectures sont disponibles, la stricte par défaut.

**La règle de poursuite n'était pas recensée.** Le §1.7.7 (l. 1570-1580) offre un second usage :
dépenser 1 point pour majorer le mouvement de moitié, au prix d'une course limitée à CON/2 rounds
et d'autant de rounds de repos. Ni ce document ni le système ne la mentionnaient.

> **Contradiction de la source, non résolue.** Le §8.4 est catégorique : « les personnages ne
> reçoivent aucun point de fougue en se battant, et ce peu importe le nombre de réussites
> critiques ». Mais l'exemple joué de la l. 3087 accorde un point à Kelly pour une charge en plein
> affrontement (« Kelly, tu peux ajouter un point de fougue à ta réserve »), juste avant la mention
> « Fin du combat ». Le texte de règle l'emporte sur l'illustration : le bouton de gain est masqué
> tant que l'acteur participe à un combat démarré. Le MJ peut toujours ajuster le compteur à la
> main s'il suit l'exemple.

> **Non implémenté** : la potion *Potentiel-absolu* (niveau 5+, l. 12753) élargit les critiques à
> 001-010 et fait que « chaque jet se fait comme si un point de fougue avait été employé **sans les
> effets en cas d'échec** ». Cela demande un effet temporaire d'une heure qui modifie à la fois la
> bande de critique et la résolution de la fougue — à traiter avec le sous-système des potions
> actives, pas ici.


---

## 8. Expérience et progression (ch. 7 et 25)

| Élément | Règle canonique | Implémentation | Statut | Action |
|---------|-----------------|----------------|--------|--------|
| Jet d'amélioration | `1d100` **>** valeur → gain **`1d6+1`** — l. 6834 | `ceil(1d6 × mult) + 1` — [actor-sheet.mjs](hogwarts-system/module/sheets/actor-sheet.mjs) | ✅ | Corrigé |
| Seuil de 90 % | Jet sous **`INT`** (pas INT×5), gain limité à **+1** — l. 6836-6837 | Bascule automatique au-delà de 90 % | ✅ | Corrigé |
| Système de coches | Le MJ coche une compétence après une action marquante | Case `xpCheck` par compétence | ✅ | — |
| XP scolaire par période | 3 périodes/an, dés dégressifs — l. 6850 **ou** forfait `1d6+1` — l. 28186 | Bouton « Période scolaire », deux modes au choix | ✅ | Corrigé |
| Bonus de première semaine | **+10 %** (§7.3, l. 6841) **ou** `1d6+1` (§25.1, l. 28195) | Suit le mode retenu | ✅ | Corrigé |
| XP de fin d'année | `Année × 2 + 1 %` + bonus additifs — l. 28293-28300 | Dialogue des 8 lignes → pool à répartir | ✅ | Corrigé |
| Vacances | `1d10+1 %` dans les compétences non scolaires — l. 28202 | Bouton dédié → pool | ✅ | Corrigé |
| Déblocage connaissance/langue | **5 %** → maîtrise 10 %, max `50 + année×5` ou 95 % — l. 28312-28316 | Proposé dans la répartition | ✅ | Corrigé |
| Multiplicateurs par Active Effect | Aucune contrepartie dans le livre | `xp.multiplier.*` / `xp.bonus.*` | 🧪 | Aucune — extension utile |

### Correctif appliqué — expérience et progression

**R-01 était bien un bug** : `new Roll('1d6')` au lieu de `1d6+1` (l. 6834), soit un déficit de 22 %
sur toute progression depuis l'origine du système. Corrigé.

> **Le `+1` est placé en dehors du multiplicateur maison** : `ceil(1d6 × mult) + 1 + bonus`. Le
> livre ne tranche pas, les multiplicateurs étant une extension. Ce placement garantit que le +1
> canonique reste intact quels que soient les effets actifs. Vérifié : `1d6=3` avec ×4/3 donne
> `ceil(4) + 1 = 5`.

**R-26** — au-delà de 90 %, la chance d'amélioration devient l'INTelligence brute (pas INT×5) et le
gain est plafonné à +1. Vérifié : compétence à 90 avec INT 12, un `d100` de 10 donne +1, un 50 ne
donne rien ; à 89 la règle normale s'applique toujours.

#### La source se contredit sur le gain scolaire

Ce point méritait un arbitrage plutôt qu'un choix silencieux :

| | §7.3 (l. 6841-6850) | §25.1 (l. 28185-28196) |
|---|---|---|
| Première semaine | **+10 %** automatique | **`1d6+1`** |
| Gain par période | dégressif `1d6+1` / `1d4+1` / `1d4` | **`1d6+1` partout** |
| Nombre de gains en 1ʳᵉ année | 3 périodes + les 10 % | **4 fois** `1d6+1` |

Les deux versions sont implémentées et sélectionnables par le réglage `schoolXpMode`, **le forfait
du §25.1 par défaut**. Le §7.3 est d'ailleurs bancal sur sa propre ligne « moyenne annuelle » : il
annonce 21 % en 1ʳᵉ année alors que `10 + 3d6+3` donne 23,5. Les années 2 à 7 concordent en
revanche (13,5 / 10,5 / 10,5 / 7,5 / 7,5 / 7,5 contre 14 / 11 / 11 / 8 / 8 / 8 arrondis).

> **Approximation assumée** : le tableau du §7.3 est indexé sur le **nombre d'années
> d'enseignement de la matière**, pas sur l'année de l'élève. Le système utilise l'année de l'élève.
> C'est exact pour les 8 matières communes, mais faux pour les 5 options, qui démarrent en 2ᵉ ou 3ᵉ
> année (l. 6399-6407) : un élève de 5ᵉ ayant pris Arithmancie en 3ᵉ est traité comme s'il l'avait
> depuis toujours. Sans effet dans le mode forfait par défaut, qui n'utilise pas ce tableau.

#### Pools de pourcentages

Les gains de fin d'année et de vacances ne s'appliquent pas directement : ils alimentent un **pool
de pourcentages** que le joueur répartit ensuite dans les compétences **non scolaires** uniquement
(générales, liste des Sorciers, liste des Moldus — l. 28308-28310).

La répartition propose aussi la conversion du livre : **5 %** pour débloquer une nouvelle
connaissance (maîtrise 10 %, maximale `50 + année×5`) ou une nouvelle langue (maîtrise 10 %,
maximale 95 %).

Exemple vérifié pour une 5ᵉ année au maximum théorique : `Quête 11 + Annexes 5 + Participation 5 +
Fougue/RP 5 + Idée 5 + Familiers 5 + Autres 10` = **46 %**.

> **Les gains sont plafonnés à la maîtrise maximale** de chaque compétence. Un gain de période qui
> dépasserait le plafond est tronqué et la carte de chat l'indique, plutôt que d'être perdu en
> silence par l'écrêtage du modèle de données.

---

## 9. Vie scolaire et sous-systèmes non implémentés

Tous ces sous-systèmes disposent de **règles chiffrées** dans le livre et n'ont **aucune**
contrepartie dans le système.

| Sous-système | Contenu des règles | Ligne | Action |
|--------------|--------------------|-------|--------|
| ~~**Quidditch**~~ | Rounds, initiative, oppositions, vif d'or, cognards, fautes | 29 445 s. | ✅ **Implémenté** |
| **Examens B.U.S.E. / A.S.P.I.C.** | Notation O/E/A/P/D/T | ch. 23 | R-30 |
| ~~**Points de maison**~~ | Tables situationnelles avec humeur du professeur | 27 548 s. | ✅ **Implémenté** |
| **Gestion du temps** | Répartition sommeil / devoirs / activités, influant sur les gains de compétence et le stress | ch. 26 | R-32 |
| **Mentorat** | `+5 %`/an en base **et** en maximale, dès la 3ᵉ année, plafond 95 % | 6 781-6 790 | R-11 |
| **Duel magique** | Types de duels et sorts autorisés ; avantage « Initié au duel » = **+2 en initiative** (coût −0,5) | 4 157 | R-33 |
| **Legilimancie / Occlumancie** | Compétences du §6.6 (l. 6505, 6507) **et** avantages à 15 %, max 80 % (l. 4182, 4216) | 4 182 · 6 505 | R-34 (jets en opposition) |
| **Création d'objets** | Procédure par potions de Duplication / Transfert / Combinaison | ch. 14 | R-35 |
| ~~**Personnages hybrides**~~ | Sous-races : ajustements de caractéristiques, capacités magiques | ch. 17 | ✅ **Implémenté** |
| **Animagus** | **Uniquement un avantage** octroyant la compétence Animagus à 20 %, max 90 %. **Aucune procédure de transformation n'est publiée** | 3 752 | R-37 |

### Correctif appliqué — avantages, désavantages et destin (§4 et §5)

Le compendium ne contenait que **30 entrées**, dont **14 introuvables dans le livre** (Ambidextre,
Bonne mémoire, Robuste, Séduisant, Sens aiguisés…). Vérification faite en jeu, **aucun acteur du
monde ne les possédait**, alors que plusieurs personnages avaient saisi *à la main* des entrées
pourtant publiées (Surdoué, Empathie, Sportif, Problèmes visuels, Lent à la détente) : le manque se
faisait sentir en pratique. Les 14 inventées ont été retirées.

Le pack est désormais **généré depuis le livre** par `build-compendia.mjs`, au même titre que les
sorts, potions, ingrédients et créatures — **104 documents** :

| Catégorie | Nombre | Source |
|-----------|--------|--------|
| Coups de pouce du destin | 12 | §4.1 |
| Croche-pattes du destin | 12 | §4.2 |
| Avantages | 34 | §5.2 |
| Désavantages | 34 | §5.2 |
| Axiomes de maison | 12 | §5.2, repérés par la mention « Axiome des… » |

Deux points de fidélité tranchés au passage :

- **Sens du coût.** Le livre note un avantage `-1` et un désavantage `+1`, du point de vue du
  joueur. La fiche, elle, calcule `max − total des coûts` : le signe est donc **inversé** à la
  génération. Sportif (livre `-1`) vaut `pbpCost: 1`, Poissard (livre `+2`) vaut `pbpCost: -2`.
- **Les axiomes ne coûtent rien.** Le §5 est explicite : « Ces axiomes de maison n'entrent pas dans
  le calcul total des points attribués lors de la création du personnage. » Les douze entrées
  portaient toutes `pbpCost: 1` — un Gryffondor perdait donc 3 points de création sans raison. Elles
  valent désormais 0.
- **« Hybride » est publié deux fois** : en croche-patte du §4.2 (première génération, subie) et en
  avantage du §5.2 (toute génération, achetée). Les deux sont conservés.

#### Effets actifs

Les compétences sont stockées dans un **tableau**, donc une clé `system.skills.N.value` dépend de
l'ordre propre à chaque fiche et reste inutilisable depuis un objet de compendium. Un champ
`system.skillBonus` indexé par **nom** a été ajouté au personnage : `system.skillBonus.Athlétisme`
est stable partout. Chaque compétence reçoit une case numérique à 0 avant l'exécution des effets —
sans quoi Foundry, qui déduit le type de la valeur en place, stockerait la chaîne « 15 » au lieu du
nombre. Comportement vérifié en jeu sur la v14.365.

**18 features** portent un effet. Neuf sont **actifs d'office** parce que le livre donne un bonus
permanent sur des compétences qu'il nomme : Communicatif, Réservé, Empathie, Sportif, Surpoids,
Sur le qui-vive (compétences), Apathique, Cérébral, Réactif (initiative). Neuf sont livrés
**désactivés**, prêts à être basculés : soit le livre restreint le bonus à une situation (Baguette
bruyante, Initié au duel, Lent à la détente), soit il laisse la compétence au choix du joueur et
seule la valeur est connue (Affinité avec…, Doué pour…, Érudition, Excellent joueur de…, Facilités
en…, Lacunes en …).

Le reste demeure descriptif, faute de champ à viser : les bonus « une fois par scénario » de
`+30 %` à **toutes** les actions (Courageux, Fourberie, Justicier), les décalages de VIRulence
(Faiblesse / Résistance immunitaire), les `PERx4` du Troisième œil, et les features qui accordent
une **compétence entière** (Animagus, Legilimens, Occlumens, Métamorphomage) — un effet actif ne
sait pas ajouter une entrée dans un tableau.

**Deux bugs d'initiative corrigés au passage**, tous deux vérifiés en jeu sur la v14.365 :

- La **formule du tracker de combat** lisait `@system.initiativeBonus`. Or `Actor#getRollData()`
  renvoie `system` *lui-même* : ses clés sont à la racine et il n'existe aucune clé `system`
  imbriquée. La référence ne résolvait donc rien et le jet valait toujours `+0`. Mesuré sur un
  personnage à `initiativeBonus = −2` : `1d6 + 10 + 0` avant, `1d6 + 10 − 2` après. Le champ
  n'avait jamais fonctionné depuis sa création.
- Le **bouton d'initiative de la fiche** calculait `1d6 + DEX.value`, en ignorant à la fois
  `initiativeBonus` et le modificateur d'ascendance (`DEX.total`).

### Correctif appliqué — points de maison (§24.2)

Le réglage `housePoints` existait déjà mais **rien ne le lisait ni ne l'écrivait**. Un suivi complet
a été ajouté, accessible par un bouton dans les contrôles de scène et par les réglages du système.

- **Classement des quatre maisons**, trié par total décroissant, visible par tous les joueurs.
- **Ajustement manuel** ± pour le MJ.
- **Les deux tables du livre** — 19 actions de retrait, 16 de gain, réparties entre « durant les
  cours » et « en dehors des cours ». Un clic lance `1d100` pour l'humeur du professeur et applique
  la valeur correspondante.
- Chaque changement produit une **carte de chat** avec le motif, l'humeur tirée et le nouveau total.

**Les fourchettes d'humeur diffèrent selon le sens**, ce que la mise en page du livre rend facile à
manquer :

| | Retrait | Gain |
|---|---------|------|
| Bonne humeur | 001-020 | 006-025 |
| Neutre | 021-075 | 026-080 |
| Mauvaise | 076-095 | 081-000 |
| Automatique | 096-100 (punition) | 001-005 (récompense) |

Vérification sur deux entrées : « Insulter un professeur » (15/25/35) donne −15 / −25 / −35 selon
l'humeur ; « Victoire à un tournoi de club » (15/25/50) donne +15 / +25 / +50.

> **Choix d'interprétation** : sur un résultat dans la bande extrême, le livre prévoit une punition
> ou une récompense *en plus* du retrait ou du gain, sans chiffrer ces points. L'implémentation
> applique la valeur la plus forte de la ligne et signale l'humeur « extrême » sur la carte, à
> charge du MJ de narrer la sanction ou la récompense.

> **Non implémenté** : la restriction « les préfets ne peuvent pas retirer de points aux autres
> préfets », et le modificateur d'humeur lié aux désavantages « Bête noire d'un professeur » /
> « Souffre-douleur » (l. 27 660 s.), qui décalent l'humeur d'un cran.

**R-31** — traité.

### Correctif appliqué — Quidditch (ch. 28)

| Élément | Règle canonique | Implémentation | Statut |
|---------|-----------------|----------------|--------|
| Structure du match | « se découpe de la même manière qu'un combat » — l. 29629 | Le match s'appuie sur le suivi de combat : rounds, tours et initiative existants | ✅ |
| Initiative | `1d6 + DEX` pour poursuiveurs et batteurs ; **gardiens et attrapeurs en dernier** — l. 29691 | Tri par rôle puis initiative décroissante, les phases du ch. 2 sont neutralisées | ✅ |
| Opposition | Marge = **compétence − jet** ; la plus élevée l'emporte ; égalité au premier dans l'ordre — l. 29820 | Chaque jet publie sa marge ; le résolveur du MJ compare et retranche la gêne | ✅ |
| Apparition du vif d'or | Round 2 : **10 %**, **+5 %/round**, 100 % au round 20 — l. 29706 | Tirage automatique au passage de round, tant qu'il n'est pas apparu | ✅ |
| Repérer le vif d'or | **PER×3** — l. 29710 | Action de l'attrapeur, modificateur demandé à chaque jet | ✅ |
| Observer l'autre attrapeur | **PER×5**, feintes possibles — l. 29713 | Action distincte | ✅ |
| Poursuite | L'attrapeur comble **5 m/round**, avance initiale d'environ 30 m — l. 29805 | Compteur de distance, bouton « Combler 5 m » | ✅ |
| Attraper le vif d'or | **DEX×1** — l. 29811 | Action de l'attrapeur, avec bouton d'attribution des 150 points | ✅ |
| Cognard | **1 létal + 1d4−2 non létaux**, assommement par table de résistance, inconscience **CON×1 h** — l. 29778 | Carte unique : dégâts, jet de résistance, boutons d'application | ✅ |
| Points | But **10**, vif d'or **150** et fin du match — l. 29524 | Tableau de score, la capture clôt le match | ✅ |
| Actions par rôle | 4 rôles, listes distinctes + actions spéciales — l. 29636 | Boutons contextuels par joueur, selon son rôle | ✅ |
| Compétences | « Vol en balai » pour le vol simple, « Acrobatie/Quidditch » pour les figures — l. 29594 | Chaque action pointe vers la bonne compétence | ✅ |
| Fautes | 11 fautes nommées ; penalty tiré depuis le cercle central — l. 29556, 29542 | Liste déroulante, carte de chat rappelant la règle du penalty | ✅ |
| Possession initiale | Pile ou face — l. 29650 | `1d2` au lancement du match | ✅ |
| Équipes | *Aucune règle* | Escouades enregistrées, réutilisables d'une séance à l'autre | 🧪 confort |

**La notion de « différence » était le point à ne pas rater.** Le chapitre 28 écrit « on compare
les deux différences et c'est la plus élevée qui emporte l'action », puis note les exemples sous la
forme « Poursuiveur Serdaigle 1 : Quidditch 40 ». Lu naïvement, cela ressemble à un jet brut où le
plus haut gagne — ce qui inverserait tout le système, bâti sur le jet sous la valeur. La ligne 3066
tranche définitivement, ailleurs dans le livre : « il lance les dés et obtient 046 soit une
**différence de 58−46 = 12** ». La différence est donc la **marge de réussite**, et les « 40 » des
exemples sont des marges, pas des dés. Les trois exemples du chapitre se recalculent exactement
sur cette base.

> **Contradiction de la source.** Le tableau des rôles annonce « Repérer le vif d'or (**PER×5**) »
> alors que le texte qui le suit impose « un jet de **Perception × 3** » (l. 29710) et réserve le
> ×5 à l'observation de l'attrapeur adverse (l. 29713). Le texte l'emporte sur le tableau, dont la
> mise en page a manifestement fusionné les deux lignes : c'est PER×3 pour repérer, PER×5 pour lire
> l'adversaire.

> **La « gêne » de −10 n'est pas une règle.** Elle n'apparaît que dans l'exemple 1 (l. 29857) et
> nulle part ailleurs. Le résolveur la demande donc au MJ au lieu de la coder en dur.

> **Non implémenté volontairement** : la déclaration d'intention. Le livre veut que tous les
> joueurs annoncent leur action *avant* toute résolution (l. 29694). C'est une discipline de table,
> pas une mécanique — l'imposer par l'interface obligerait à verrouiller les jets jusqu'à ce que
> chacun ait déclaré, pour un bénéfice nul en jeu.

**R-29** — traité.

**R-37** — ⚠️ **Analyse précédente erronée, corrigée le 2026-09-10.** Il était écrit ici que le
livre ne publiait qu'un avantage et aucune procédure. La lecture du PDF montre un **chapitre 16
complet** :

| Source | Contenu |
|--------|---------|
| §16.1 (l. 24465) | Le processus en dix étapes de J.K. Rowling : feuille de mandragore gardée un mois, fiole de cristal, incantation *Amato Animo Animato Animagus* matin et soir, attente de l'orage, potion rouge sang. **Narratif, aucun jet.** |
| §16.2 (l. 24515) | Un test de personnalité de 14 questions donnant la **catégorie d'animal**, avec six profils de résultat. |
| l. 24645 | « Animagus : Maîtrise de base 10 % / Maîtrise maximale : 80 % » |

**Contradiction de la source** : le tableau des avantages (l. 3753) annonce « Animagus à 20 %
(degré de maîtrise maximal : 90 %) », la fin du chapitre 16 « base 10 % / max 80 % ». Le
système retient le chapitre dédié (10 / 80), les deux colonnes restant éditables sur la fiche.

**Ce qui reste hors source** : les quatre paliers `mastery` et le jet de transformation sont une
extension maison, signalée comme telle par une infobulle et par le chapitre « Extensions maison »
du guide.

> **Test des 14 questions non reproduit.** Les puces qui associent chaque réponse à un profil sont
> des tracés vectoriels dans le PDF (92 `constructPath` sur la page, aucune police de symboles,
> trois couleurs de remplissage seulement) : la grille réponse → profil n'est pas récupérable par
> extraction. La fiche propose donc directement les six profils publiés, et renvoie au livre pour
> le questionnaire.

---

## 10. Backlog des corrections de règles

Les identifiants ci-dessous alimentent le backlog global de
[AUDIT_FOUNDRY_V14.md §12](AUDIT_FOUNDRY_V14.md).

### P1 — Étiquetage du contenu hors règles

✅ **Traité.** Chaque écart est désormais signalé à trois endroits : un commentaire
`EXTENSION MAISON` dans le code, une infobulle dans l'interface là où le champ se saisit,
et le chapitre « Extensions maison » du guide du MJ.

| ID | Action | Où c'est signalé |
|----|--------|------------------|
| R-05 | Paliers étendus donnés pour une règle optionnelle absente du livre, arrondi documenté | Libellé du réglage `useExtendedSuccessTiers` + guide |
| R-10 | `base`/`max` donnés pour des valeurs maison | Commentaire dans `config.mjs`, infobulles des colonnes *Base* et *Max* + guide |
| R-04 | Table de dommages créature donnée pour une extension | Commentaire dans `actor-creature.mjs` + guide |
| R-22 | `preSchool` / `POU×3` : aucune source, extension assumée | Commentaire dans `item-spell.mjs`, infobulle de la case + guide |
| R-37 | Champs `animagus` donnés pour une extension | Commentaire dans `actor-character.mjs` + guide. **Complété** : compétence Animagus 10 %/80 % ajoutée, six profils du §16.2, bloc de fiche et jet de transformation |

### P2 — Mécaniques centrales manquantes

| ID | Action | État |
|----|--------|------|
| R-23 | « Potion parfaite » = effets maximisés, pas quantité doublée | ✅ Corrigé : la réussite critique produit une dose comme une réussite ordinaire et la carte de chat annonce la potion parfaite |

### P3 — Sous-systèmes

| ID | Action |
|----|--------|
| R-11 | Mentorat : +5 %/an en base et en maximale, dès la 3ᵉ année, plafond 95 % |
| R-30 | Examens B.U.S.E. / A.S.P.I.C. |
| R-33 · R-34 | Duels, Legilimancie/Occlumancie : procédures et jets en opposition |
| R-32 · R-35 | Gestion du temps, création d'objets |
| R-02 · R-06 · R-07 | Assistant de création `2d6+6`, malus d'âge, progression annuelle FOR/TAI/CON |
| R-12 · R-21 | Plafonds de compétences, disciplines de sorts |

---

## Annexe — Points volontairement laissés ouverts

Ces éléments sont **absents ou flous dans la source**. Ils ne doivent pas être « corrigés » par
invention, mais tranchés explicitement par le MJ ou par une décision de conception documentée.

| Sujet | État de la source |
|-------|-------------------|
| Durée du round en secondes | « quelques secondes » — l. 1084 |
| Sorts informulés | Aucune pénalité publiée |
| Maladresse en fabrication de potion | Aucun effet publié |
| Compétence de lancement par discipline | Pas de table unifiée ; à lire sort par sort dans le Grimoire |
| Table de base/max des compétences | Non publiée (un seul exemple, l. 6599) |
