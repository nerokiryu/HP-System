# CHANGELOG

## 1.2.0

### Duel magique (ch. 27)

Une fenêtre de duel, accessible depuis les contrôles de scène, s'appuie sur la
rencontre en cours comme le fait déjà le Quidditch.

- **Les quatre types de duel** du §27.4, avec leur condition de disqualification.
  Dans les types *a* et *b*, la fenêtre rappelle que 1 point de dégât disqualifie.
- **La table des sortilèges autorisés** du §27.5 : **67 entrées**, filtrées par
  type de duel. Les sorts que le livre étoile sont signalés, les Impardonnables
  ne sont proposés que dans le duel à mort.
- **L'échelle de priorité** du §27.3 remplace les phases de combat pendant un
  duel : 1 innés, 2 protection, 3 informulés (+3 initiative) et classiques,
  4 formules extrêmes (−3). Le rang apparaît dans le suivi de combat.
- **L'entraînement** : un champ « années de club de duel » sur la fiche vaut +1
  à l'initiative de duel par année, jusqu'à +5, cumulable avec l'avantage
  *Initié au duel* — exactement l'exemple de Mary Macmilliam (l. 28577).
- **Le point de fougue** peut être dépensé sur le jet d'initiative pour relancer
  le d6 avec +2 (l. 28683).
- Le lancement applique le malus du sort, le stress et les −30 % d'un informulé.
  Un sort inné ne rate jamais : un jet manqué compte comme une réussite de
  différence 0 (l. 23197).

> **Trois noms de la table du §27.5 ne correspondent à aucun sortilège** — ni
> dans le livre, ni dans le Grimoire : *Annulation de sort*, *Immobilisation
> totale* et *Explosion*. Ils sont conservés et marqués d'un « ? » plutôt que
> rapprochés d'un candidat plausible. Deux autres n'étaient que des coquilles et
> ont été rapprochées : *Jambencoton* et *Mouche-Sadrines*.

### Jets en opposition (§28.3.4)

La règle n'était implémentée que dans la fenêtre de Quidditch, alors que le
livre s'en sert aussi dans les exemples de combat du chapitre 2 (esquive
l. 3067, bagarre l. 3081). Elle est désormais générale :

- chaque ligne de compétence porte un bouton qui publie la **différence**
  (valeur − jet) au lieu du degré de réussite ;
- un résolveur unique compare deux différences publiées, gère la gêne et tranche
  l'égalité en faveur du premier à l'initiative ;
- le Quidditch et le duel utilisent ce même résolveur.

**Changement de comportement** : la table des résistances est bornée à 5-95 au
lieu de 1-99. La table imprimée ne descend jamais sous 05 ni ne monte au-dessus
de 95 (l. 1038) ; l'ancienne borne ne venait d'aucune source.

### Legilimancie et Occlumancie (ch. 15)

Le chapitre 15 est entièrement descriptif : il ne publie ni dé ni chiffre. Un
bouton sur l'onglet Avantages, visible seulement si le personnage possède la
compétence, oppose la Legilimancie à l'Occlumancie de la cible.

> **Extension maison assumée.** Résoudre une intrusion par une opposition de
> compétences, et la retourner contre le Legilimens quand la défense réussit,
> sont une lecture du §15.1 « Dangers » (l. 24365). Le livre n'attache aucun
> nombre à cette phrase ; la carte de chat le rappelle.

### Personnages non-joueurs et avantages

- **Les compétences octroyées par un avantage** (Animagus, Legilimancie,
  Occlumancie, Métamorphomage) ne sont plus semées sur tout le monde : elles
  apparaissent avec l'avantage et disparaissent avec lui, sans jamais être
  écrites en base.
- **Les sens octroyés** — *Troisième œil* (PER×4) et *Problèmes visuels*
  (Vue ×1) — fonctionnent désormais aussi sur une fiche de PNJ. Le calcul des
  sens vivait dans le seul modèle du personnage ; il est partagé.
- **§22.2.1** : le budget de compétences d'un PNJ gagne le bonus d'année
  (+50 à +410), affiché à part pour rester ajustable.
- L'onglet *Familier* est présent sur une fiche de PNJ, comme sur celle d'un
  joueur.

### Quidditch

Les boutons de score ne savaient qu'**ajouter**. S'ajoutent un **ajustement ±
par équipe** et une **remise à zéro** qui conserve la composition et l'état du
Vif d'or. Le score ne peut pas devenir négatif.

### Corrections

- **Fermer une fenêtre de jet lançait les dés.** `DialogV2.prompt` renvoie
  `null` à la fermeture, mais la valeur était convertie en réponse valide.
- **Le plafond de maîtrise scolaire lisait une valeur périmée** : cliquer le
  cadenas fait sortir du champ voisin, et l'enregistrement n'était pas encore
  arrivé. Un reverrouillage demande maintenant confirmation.
- **L'avantage *Initié au duel* était compté deux fois** : livré comme effet
  conditionnel sur `initiativeBonus`, son +2 y figurait déjà une fois activé.
- **Déclarer une formule extrême rendait la plupart des sorts plus faciles.**
  Le livre imprime « Formule extrême : - » pour la majorité d'entre eux, ce qui
  se traduit par un malus de 0 ; ce zéro était lu comme le coût de la formule.
  **251 sorts sur 366** étaient concernés.
- **L'assistant de création annonçait `2d6+6` à un PNJ** alors que le tirage
  était bien en `3d6`.
- L'icône par défaut d'une équipe de Quidditch est `icons/svg/tower-flag.svg`.

### Sous le capot

- `actor-sheet.mjs` passe de 3 271 à 1 531 lignes, découpé en huit modules par
  domaine ; les fonctions déplacées ont été comparées une à une, sans écart.
- Commentaires, identifiants et intitulés de test sont en anglais. **Les
  citations du livre restent en français**, verbatim et avec leur numéro de
  ligne : elles servent de preuve.
- **51 tests** et une vérification par mutation, qui réintroduit neuf défauts un
  par un pour s'assurer que la suite sait virer au rouge.

### Migration

Les compétences d'avantage déjà stockées sur des fiches qui ne portent pas
l'avantage sont retirées — **sauf** celles où des points ont été investis, qui
sont conservées telles quelles.

## 1.1.0

### Fiche de personnage non-joueur

Une fiche propre, aux budgets du livre. L'onglet d'identité regroupe en quatre
sections repliables les étapes du §21.1 qui n'avaient pas leur place ailleurs :
rôle, archétype, âge, statut de sang, budget, combat et notes du Maître du Jeu.

**Budgets du §21.1.** Un PNJ dispose de **350 points de compétences et 4,5 points
d'avantages**, contre 400 et 6 pour un personnage joueur. La case **Rival**
bascule sur les budgets d'un PJ, comme le conseille le §21.2 : « il est fortement
conseillé de faire des rivaux des anti-héros […] de cette manière, les
confrontations entre les PJ et les rivaux se feront à force égale. »

**Tirage en 3d6.** « On lance 3d6 pour les 8 caractéristiques » (§21.1), là où un
PJ reste à 2d6+6. L'assistant de création s'adapte au type d'acteur et le bouton
annonce la formule employée.

**Années supérieures (§22.2.1).** Un PNJ créé dans une année avancée reçoit des
points de compétences en plus du budget de base : +50 en 2ᵉ année, +110 en 3ᵉ,
+180 en 4ᵉ, +250 en 5ᵉ, +330 en 6ᵉ, +410 en 7ᵉ. C'est le haut de la fourchette
publiée, que le livre autorise explicitement. Un rival de 7ᵉ année atteint donc
**810 points** — l'adversaire le plus solide que les règles permettent, sans
inventer de catégorie hors-livre. Les points d'avantages, eux, ne changent pas :
le §22 n'y touche pas.

Les coups de pouce et croche-pattes du destin sont acceptés sur un PNJ, le §21.1
le prévoyant : « il est tout à fait possible d'en choisir un pour un PNJ ».

### Caractéristiques : tirage, âge et progression

Trois points du livre qui n'étaient pas implémentés, et qui n'en faisaient en
réalité que deux.

**Malus d'âge (§Étape 2).** « La valeur obtenue en lançant les 2d6+6 est celle
d'un personnage adulte, soit un personnage de 16 et plus. On retire 1 à cette
valeur si on incarne un Sorcier de 15 ans, 2 pour un Sorcier de 14 ans, etc. »
Le malus vaut donc `16 − âge` et ne touche que **FOR, CON et TAI** — seules ces
trois caractéristiques portent la remarque, les cinq autres n'en ont aucune. Il
est appliqué au total, donc il atteint les points de vie, le bonus aux dégâts et
l'initiative.

**Progression annuelle.** Le livre n'en publie aucune : « malus qui diminuera de
1 chaque année ». C'est le dégel du malus ci-dessus, rien d'autre. Il suffit de
vieillir le personnage d'un an pour qu'il gagne son point.

**Assistant de création.** Un bouton dans l'onglet Caractéristiques tire les huit
valeurs et les répartit selon l'ordre de priorité publié pour l'archétype
(l. 640-646). Le tirage reste un pool : choisir une valeur déjà placée l'échange
avec l'autre caractéristique, comme au brouillon. L'aperçu montre en direct les
points de vie, le bonus aux dégâts, l'Idée, la Chance, et ce que l'âge retranche.

### Corrections

- **Sélecteur d'archétype inutilisable.** Il était branché sur `data-action`, que
  Foundry déclenche au **clic** — c'est-à-dire le geste qui déroule la liste. Le
  re-rendu la refermait aussitôt : impossible de choisir quoi que ce soit. Il
  réagit désormais au changement, conserve le choix et rend le focus au clavier.
- **Case « formule extrême » sans effet.** Elle n'était reliée ni à son action,
  qui n'existait pas, ni au formulaire, qui ne retenait que `system.quantity`
  avant de jeter le reste. Tous les champs visant un objet embarqué sont
  maintenant transmis.
- **Styles jamais appliqués.** L'assistant de création ciblait
  `.hogwarts-system .character-creation` en descendant, alors qu'ApplicationV2
  pose toutes les classes sur le **même** élément. L'onglet d'identité du PNJ,
  lui, réutilisait le balisage de la biographie sans que les règles couvrent
  `.tab.npc` : titres à la taille par défaut du navigateur, sans l'accent de
  Maison, et champs hors grille.
- **Contraste illisible.** Le rouge des alertes — malus d'âge, budget dépassé,
  valeur vieillie, doublon de tirage — tombait à 2,3:1 sur le thème sombre, pour
  un minimum de 4,5:1. Il suit désormais le thème et atteint 7,5:1.
- **Initiative.** La formule de combat référençait `@system.initiativeBonus`, qui
  ne se résolvait jamais ; le bouton de la fiche ignorait à la fois la Dextérité
  et le bonus.
- **Champs de formulaire en double.** Plusieurs champs du PNJ étaient déclarés
  dans deux onglets, ce qui provoquait des erreurs de validation à la saisie et
  corrompait silencieusement les valeurs de type tableau.

### Qualité

L'immense fiche d'acteur, 3 271 lignes, est découpée en sept modules par domaine.
Les 71 fonctions déplacées ont été comparées une à une avant et après : aucune
différence.

**37 tests automatiques**, dont sept nouveaux tests d'intégrité structurelle :
actions déclarées, absence de `data-action` sur un contrôle de saisie, clés de
traduction présentes et symétriques entre le français et l'anglais, gabarits
existants, sélecteurs de classe racine, cohérence de `system.json`. Chacun est né
d'une panne réelle. `npm run test:mutations` réintroduit chaque défaut un par un
pour vérifier que le test correspondant vire bien au rouge.

### Migration

Les fiches existantes portaient la valeur de l'enfant, pas celle de l'adulte :
appliquer le malus par-dessus l'aurait compté deux fois et aurait divisé par deux
les points de vie de sept personnages sur dix du monde de test. Une migration
rend donc aux caractéristiques leur valeur adulte, de sorte que **rien ne change
à l'écran** après la mise à jour.

## 1.0.1

### Avantages, désavantages et destin

Le compendium passe de **30 à 104 entrées**, désormais générées depuis le livre
au même titre que les sortilèges et les potions : 12 coups de pouce du destin
(§4.1), 12 croche-pattes (§4.2), 34 avantages, 34 désavantages et 12 axiomes de
Maison (§5.2). Les 14 entrées qui ne figuraient dans aucun livre ont été
retirées ; aucun personnage ne les utilisait.

**18 features portent un effet actif.** Neuf s'appliquent d'office, le livre
donnant un bonus permanent sur des compétences qu'il nomme (Communicatif,
Réservé, Empathie, Sportif, Surpoids, Sur le qui-vive, Apathique, Cérébral,
Réactif). Neuf sont livrées désactivées : soit le bonus est lié à une situation
(Baguette bruyante, Initié au duel, Lent à la détente), soit la compétence visée
est au choix du joueur et seule la valeur est connue (Affinité avec…, Doué
pour…, Érudition, Excellent joueur de…, Facilités en…, Lacunes en …).

Nouveau champ `system.skillBonus`, indexé par nom de compétence : c'est la seule
cible praticable pour un effet venu d'un compendium, la liste des compétences
étant un tableau dont l'ordre varie d'une fiche à l'autre.

### Corrections

- **Compétences préréglées enfin enregistrées.** Elles n'étaient ajoutées qu'en
  mémoire : un personnage neuf en affichait 58 sans en stocker aucune, et une
  mise à jour du système ajoutant un préréglage laissait les fiches existantes
  en décalage. La fiche n'en souffrait pas — elle renvoie toutes les lignes à
  chaque saisie et reconstruit donc le tableau complet — mais toute écriture
  ciblée sur un seul indice, depuis une macro ou un module, remplaçait le
  tableau par des lignes vides. Les personnages sont désormais créés avec leurs
  compétences et les fiches existantes sont réconciliées au chargement du monde.
- **Assistant de clés d'effet.** Il propose maintenant `system.skillBonus.<nom>`
  en tête de chaque compétence : c'est la seule clé qui reste valable une fois
  l'effet copié sur une autre fiche.
- **Initiative : le modificateur permanent était ignoré.** La formule du
  tracker de combat visait `@system.initiativeBonus`, alors que `getRollData()`
  place les clés du système à la racine — elle valait donc toujours `+0`. Le
  bouton de la fiche, lui, ignorait à la fois ce modificateur et celui
  d'ascendance. Les deux lisent maintenant la même chose, et la fiche affiche la
  formule complète.
- **Axiomes de Maison facturés à tort.** Les douze coûtaient 1 point chacun,
  alors que le §5 précise qu'ils « n'entrent pas dans le calcul total des points
  attribués lors de la création ». Un Gryffondor perdait 3 points sans raison.
- **En-tête des balais tronqué.** « Caractéristiques et bonus » passait à deux
  lignes et débordait sur la ligne suivante, la hauteur étant figée à 28 px.

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
