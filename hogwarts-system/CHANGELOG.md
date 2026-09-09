# CHANGELOG

## 1.0.0

Première version publique.

### Contenu

- **Compendiums** générés à partir des tableaux des livres : 366 sortilèges,
  139 potions, 310 ingrédients, 162 créatures, 30 avantages et désavantages.
- **Guide du Maître du Jeu** : tutoriel de seize chapitres illustré de douze
  captures d'écran, disponible dans le dépôt (`docs/GUIDE-MJ.md`) et comme
  compendium de journal dans le monde.
- Interface en français et en anglais.

### Types de documents

- Acteurs : personnage, PNJ, familier, créature, équipe de Quidditch.
- Objets : sortilège, potion, ingrédient, arme, protection, équipement, balai,
  avantage.

### Règles implémentées

- **Jets** : `1d100` sous la compétence, degrés de réussite du livre de base,
  maladroit évalué avant la réussite, paliers étendus en option.
- **Magie** : écoles, sorts instinctifs sous POU × 3, sans baguette (−75 %),
  informulé (−30 %), affinité de baguette (+10 %), formule extrême choisie au
  lancer et malus abaissé une fois maîtrisée.
- **Combat** (ch. 2 et 9) : initiative `1d6 + DEX` relançable à chaque round,
  phases de tour, surprise, réactions, blessures, seuils de dégâts,
  inconscience, mort et récupération. Deux procédures d'assommement, réduction
  d'armure automatique.
- **Fougue** (ch. 8) : réserve de cinq points, déclaration avant ou après le
  jet, inversion des dés au choix, point dépensé y compris sur un palindrome,
  échec traité comme une maladresse, sprint du §1.7.7.
- **Quidditch** (ch. 28) : tableau de bord de match, postes et actions
  associées, apparition du vif d'or, fautes, résolution des oppositions, et
  acteur « équipe de Quidditch » avec contrôle de la composition réglementaire.
- **Points de maison** (§24.2) : sabliers partagés, actions du livre, jet
  d'humeur du professeur.
- **Progression** (ch. 7 et 25) : jets d'apprentissage, règle des 90 %,
  réserves de points, périodes scolaires et gain annuel, deux barèmes au choix.
- **Personnages hybrides** : 27 combinaisons race × génération et 134 capacités,
  répercutées sur les points de vie, le bonus aux dégâts et l'initiative.
- **Compétences spécifiques** : Alchimie, Duels, Occlumancie, Legilimancie (§6.6).
- Maximum des compétences d'école plafonné à 100 %, recalculé au changement
  d'année tant qu'il n'a pas été forcé manuellement.

### Réglages

Onze réglages de monde, dont ceux qui arbitrent les contradictions des sources :
gain d'expérience scolaire (§25.1 ou §7.3), méthode d'assommement (§2.7.1 ou
§2.7.2), traitement de l'échec avec Fougue, paliers de réussite étendus.

### Technique

- Foundry VTT **v14**, API `ApplicationV2` et `TypeDataModel`.
- Suite de tests unitaires (`npm test`) et configuration ESLint.
- Compendiums et guide régénérables depuis les sources (`npm run compendia`).
