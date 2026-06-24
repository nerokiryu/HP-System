Hogwarts Features — Import des exemples JSON

Contenu
- `json/axiome-loyaute.json`
- `json/axiome-courage.json`
- `json/axiome-ruse.json`

But : fournir des exemples JSON d'items "Axiomes de Maison" pour import manuel dans Foundry.

Instructions d'import (méthode recommandée)
1. Déployez le système vers votre dossier Foundry (votre watcher `create-symlinks.mjs` ou robocopy le fait déjà). Les fichiers JSON seront synchronisés si vous utilisez le script de déploiement.
2. Dans Foundry, créez un compendium si nécessaire :
   - Ouvrez le menu `Compendium Packs` (icône de tiroir) → clic droit → `Create Compendium`.
   - Choisissez `System: Hogwarts System`, `Type: Item`, donnez-lui le nom "Hogwarts Features".
3. Ouvrez le compendium créé, cliquez sur le bouton de menu (roue/crantée) ou l'icône `Import` et sélectionnez les fichiers JSON depuis le dossier synchronisé `systems/hogwarts-system/packs/hogwarts-features/json/`.
   - Si l'UI de Foundry propose "Import Document(s)", sélectionnez les 3 fichiers et importez.
4. Les items importeront en tant qu'`Item` de type `feature`. Si vous ne voyez pas `perkType` correctement, vérifiez que la clé `perkType` dans `data` correspond à l'option définie dans `module/data/item-feature.mjs` ("houseAxiom").

Alternative (copie manuelle)
- Ouvrez le compendium, puis utilisez `Import` → `Upload Files` et sélectionnez les JSON depuis l'explorateur Windows.

Remarques
- Si vous préférez que j'essaie de générer un `.db` Loki prêt à l'emploi, dites-le — je peux fournir un script Node qui convertit ces JSON en une base Loki compatible Foundry, mais il faudra tester la compatibilité avec votre installation Foundry (versions de Loki et des packs).