# CHANGELOG

## 3.3.0

### Règles

- **Combat** : blessures, seuils de dégâts, inconscience, mort et récupération
  alignés sur le chapitre 9.
- **Initiative** : `1d6 + DEX + bonus`, phases de tour, surprise, égalité au
  profit des joueurs, relance optionnelle à chaque round.
- **Réactions** : esquive, parade et bouclier.
- **Points de maison** : suivi par maison, sabliers animés dans une application
  dédiée, synchronisation entre clients.
- **Personnages hybrides** : 27 combinaisons race × génération, 134 capacités,
  modificateurs de caractéristiques répercutés sur les points de vie, le bonus
  aux dégâts et l'initiative.
- **Expérience et progression** (ch. 7 et 25) : jets d'apprentissage, règle des
  90 %, réserves de points, progression scolaire annuelle en mode forfaitaire ou
  dégressif (réglage `schoolXpMode`).
- **Compétences spécifiques** : Alchimie, Duels, Occlumancie, Legilimancie (§6.6).
- **Maximum des compétences d'école** : plafonné à 100 %, éditable manuellement,
  et recalculé au changement d'année tant qu'il n'a pas été forcé.
- **Sortilèges sans baguette** (−75 %) et **informulés** (−30 %).
- **Formule extrême** : devient un choix au moment du lancer, et la maîtriser
  abaisse le malus du sort de base (nouveau champ « malus une fois maîtrisée »
  et case « formule extrême maîtrisée »).

### Compendiums

- Régénération complète depuis les livres source : 366 sortilèges, 139 potions,
  310 composants, 162 créatures.
- Remplacement des trois icônes supprimées dans Foundry v14 (`leaf.svg`,
  `transform.svg`, `social_dark.svg`) : plus aucune image cassée.

### Interface

- Fiches d'objets : onglet « Attributs » corrigé pour les armes, armures,
  composants et balais (libellé non traduit et onglet actif perdu au re-rendu).
- Fiches d'objets : un champ par ligne, libellé à gauche et contrôle à droite,
  pour tous les types.
- En-tête des fiches d'objets de hauteur identique quel que soit le type ; les
  champs spécifiques au balai et à l'équipement ont rejoint l'onglet Attributs.
- Fiche de personnage : en-tête de taille stable d'un onglet à l'autre.
- Champs numériques passés en `type="number"`, ce qui supprime les erreurs de
  validation à la fermeture d'une fiche.

### Technique

- Migration vers les API Foundry v14 : `renderChatMessageHTML`,
  `foundry.applications.ux.TextEditor`, `foundry.applications.instances`.
- Facteur commun des degrés de réussite dans `module/helpers/degrees.mjs`, avec
  correction du maladroit critique, désormais testé avant la réussite.
- Suite de tests unitaires (`npm test`).

## 1.2.0

- Add support for Foundry v10