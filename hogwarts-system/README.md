# Hogwarts System

![Foundry v11](https://img.shields.io/badge/foundry-v11-green) ![Foundry v12](https://img.shields.io/badge/foundry-v12-green)

This system is a hogwarts-system system that you can use as a starting point for building your own custom systems. It's similar to Simple World-building, but has examples of creating attributes in code rather than dynamically through the UI.

> **Tutorial Updates are WIP**
> 
> The v12 branch of Hogwarts has switched to using Foundry's ApplicationV2 version of document sheets, and the updates for the accompanying tutorial on the wiki are still in progress. Feel free to use this version of the system, but you'll need to use the comments within the actor and item sheet classes for context on what's happening vs. reading the tutorial.

## Usage

There are two ways to get started: using the Hogwarts system generator command or manually renaming and updating files.

Regardless of which method you choose, think carefully about your system's name. Your system's package name when submitted to Foundry must be formatted like `alphanumeric-lowercase`, and it must be unique. Check the Foundry systems package list for conflicts before committing to a name!

> **Data Models**
>
> If you would like to use DataModel classes instead of the older template.json configuration, you'll need to use the `npm run generate` command described below and choose to enable them when asked. DataModels are currently an optional feature, and are only availabe in the generator CLI due to that.

### Generator

This system includes a generator CLI in `package.json`. To use it, you must have [node.js](https://nodejs.org) installed, and it's recommended that you install node 20 or later.

> **Python Generator**
> 
> If you would rather use Python than node, there’s an excellent Python-based generator created by Cussa at https://github.com/Cussa/fvtt-hogwarts-system-initializator. Give it a shot!

Once you have npm installed, you can run the following in your terminal or command prompt:

```bash
npm install
npm run generate
```

Your terminal should prompt you to name your system. Read the instructions carefully, the letter case and special characters in each question matter for correct system generation.

Once the generator completes, it will output your system to `build/<your-system-name>`, where `<your-system-name>` is the package name you supplied during the prompt.

Copy this directory over to your Foundry systems directory and start coding!

### Manual Replacement

Before installing this system, you should rename any files that have `hogwarts-system` in their filename to use whatever machine-safe name your system needs, such as `adnd2e` if you were building a system for 2nd edition Advanced Dungeons & Dragons. In addition, you should search through the files for `hogwarts-system` and `Hogwarts` and do the same for those, replacing them with appropriate names for your system.

The `name` property in your `system.json` file is your system's package name. This need to be formatted `alphanumeric-lowercase`, and it must also match the foldername you use for your system.

### Vue 3 Hogwarts

**NOTE: The Vue 3 version is currently outdated and considered an advanced usage of Foundry due to it being a custom renderer. Only try it out if you _really_ like Vue and are feeling dangerous!**

Alternatively, there's another build of this system that supports using Vue 3 components (ES module build target) for character sheet templates.

Head over to the [Vue3Hogwarts System](https://gitlab.com/asacolips-projects/foundry-mods/vue3hogwarts-system) repo if you're interested in using Vue!

### Getting Help

Check out the [Official Foundry VTT Discord](https://discord.gg/foundryvtt)! The #system-development channel has helpful pins and is a good place to ask questions about any part of the foundry application.

For more static references, the [Knowledge Base](https://foundryvtt.com/kb/) and [API Documentation](https://foundryvtt.com/api/) provide different levels of detail. For the most detail, you can find the client side code in your foundry installation location. Classes are documented in individual files under `resources/app/client` and `resources/app/common`, and the code is collated into a single file at `resources/app/public/scripts/foundry.js`.

#### Tutorial

For much more information on how to use this system as a starting point for making your own, see the [full tutorial on the Foundry Wiki](https://foundryvtt.wiki/en/development/guides/SD-tutorial)!

Note: Tutorial may be out of date, so look out for the Foundry compatibility badge at the top of each page.

## Sheet Layout

This system includes a handful of helper CSS classes to help you lay out your sheets if you're not comfortable diving into CSS fully. Those are:

- `flexcol`: Included by Foundry itself, this lays out the child elements of whatever element you place this on vertically.
- `flexrow`: Included by Foundry itself, this lays out the child elements of whatever element you place this on horizontally.
- `flex-center`: When used on something that's using flexrow or flexcol, this will center the items and text.
- `flex-between`: When used on something that's using flexrow or flexcol, this will attempt to place space between the items. Similar to "justify" in word processors.
- `flex-group-center`: Add a border, padding, and center all items.
- `flex-group-left`: Add a border, padding, and left align all items.
- `flex-group-right`: Add a border, padding, and right align all items.
- `grid`: When combined with the `grid-Ncol` classes, this will lay out child elements in a grid.
- `grid-Ncol`: Replace `N` with any number from 1-12, such as `grid-3col`. When combined with `grid`, this will layout child elements in a grid with a number of columns equal to the number specified.

## Compiling the CSS

This repo includes both CSS for the theme and SCSS source files. If you're new to CSS, it's probably easier to just work in those files directly and delete the SCSS directory. If you're interested in using a CSS preprocessor to add support for nesting, variables, and more, you can run `npm install` in this directory to install the dependencies for the scss compiler. After that, just run `npm run build` to compile the SCSS and start a process that watches for new changes.

![image](http://mattsmith.in/images/hogwarts-system.png)

## Reference for `system.*` fields

The table below lists the `system.*` fields defined by the system DataModels, their purpose, and the default value as defined in the `module/data/*.mjs` files.

| Field | Description | Default | Source |
|---|---|---:|---|
| `system.health.value` | Current health value (HP) | `10` | `module/data/base-actor.mjs` |
| `system.health.max` | Maximum health | `10` (recomputed for characters) | `module/data/base-actor.mjs` + `module/data/actor-character.mjs` |
| `system.biography` | Legacy biography HTML content | `''` (HTMLField) | `module/data/base-actor.mjs` |
| `system.profile.year` | Character school year | `1` | `module/data/actor-character.mjs` |
| `system.profile.house` | House (`gryffindor`/`slytherin`/`ravenclaw`/`hufflepuff`) | `'gryffindor'` | `module/data/actor-character.mjs` |
| `system.profile.age` | Age | `11` | `module/data/actor-character.mjs` |
| `system.stats.<stat>.value` | Attribute value (e.g. `str`, `dex`, ...) | `10` | `module/data/actor-character.mjs` (generated from `CONFIG.HOGWARTS.stats`) |
| `system.skills` (array) | Skills array: `{name, value, base, max, spent, category, spec, custom}` | `[]` (seeded from `CONFIG.HOGWARTS.skillPresets` if present); defaults: `value:0, base:0, max:95, spent:0, category:'general', custom:false` | `module/data/actor-character.mjs` |
| `system.family` (array) | Family members list `{role, name, age, details}` | `[]` | `module/data/actor-character.mjs` |
| `system.appearance.*` | Appearance fields (`height`, `weight`, `skin`, `hair*`, `eyes`, `dominantHand`) | empty strings or default choices | `module/data/actor-character.mjs` |
| `system.character.*` | Character fields (`qualities`, `flaws`, ...) | `''` | `module/data/actor-character.mjs` |
| `system.information.*` | Misc info (`patronus`, `origin`, `gender`, `bloodStatus`) | `bloodStatus: 'halfblood'` | `module/data/actor-character.mjs` |
| `system.boggart.*` | Boggart fields (`visual`, `description`, `riddikulus`) | `''` | `module/data/actor-character.mjs` |
| `system.bio.motivation` / `system.bio.history` | Enriched biography (HTML) | `''` | `module/data/actor-character.mjs` |
| `system.notes.rpNotes` / `system.notes.gmNotes` | RP / GM notes (HTML) | `''` | `module/data/actor-character.mjs` |
| `system.experience.creationPoints.max` | Creation points maximum | `400` | `module/data/actor-character.mjs` |
| `system.experience.creationPoints.spent` | Creation points spent (computed) | `0` (updated in derived) | `module/data/actor-character.mjs` |
| `system.experience.personalBonusPoints.max` | Personal Bonus Points (PBP) maximum | `6` | `module/data/actor-character.mjs` |
| `system.experience.personalBonusPoints.spent` | PBPs spent | `0` | `module/data/actor-character.mjs` |
| `system.currency.galleons` / `.sickles` / `.knuts` | Currency | `0` / `0` / `0` | `module/data/actor-character.mjs` |
| `system.wand.*` | Wand data (`wood`, `core`, `length`, `flexibility`, `affinity`, `pbpCost`, `description`) | `pbpCost: 0` and empty strings for others | `module/data/actor-character.mjs` |
| `system.options.otherSchool` | Gameplay option (affects PBP display) | `false` | `module/data/actor-character.mjs` |
| `system.familiar.linkedActor` | ID of a linked familiar Actor | `''` | `module/data/actor-character.mjs` |
| `system.stats.<stat>.value` | Familiar stats (on familiar actors: `str`, `con`, `siz`, `dex`, `int`, `pow`, `app`, `per`) | `10` per stat | `module/data/actor-familiar.mjs` |
| `system.skills` (array) | Familiar skills (same structure as character skills) | seeded defaults if empty (common general skills) | `module/data/actor-familiar.mjs` |
| `system.familiar.armor` | Familiar armor (displayed) | `0` | `module/data/actor-familiar.mjs` |
| `system.familiar.movement` | Familiar movement | `0` | `module/data/actor-familiar.mjs` |
| `system.familiar.dmg` | Editable familiar damage formula (string) | `'1d3'` (validated) | `module/data/actor-familiar.mjs` |
| `system.perks[]` | Familiar perks / advantages `{name, category, description, pbpCost}` | `[]` (pbpCost default 0) | `module/data/actor-familiar.mjs` |
| `system.bio.*` | Familiar biography (`species`, `appearance`, `personality`, `bond`, `notes`) | empty HTML fields | `module/data/actor-familiar.mjs` |
| `system.cr` | Challenge rating (used for XP) | `1` | `module/data/actor-npc.mjs` |
| `system.description` | Item description HTML (displayed / enriched) | `''` | `module/data/base-item.mjs` |
| `system.quantity` | Quantity | `1` | `module/data/item-gear.mjs` |
| `system.weight` | Weight | `0` | `module/data/item-gear.mjs` |
| `system.cost.galleons` / `.sickles` / `.knuts` | Item cost in wizarding currency | `0` / `0` / `0` | `module/data/item-gear.mjs` |
| `system.pbpCost` | Cost in Personal Bonus Points (PBP) | `0` (step 0.5) | `module/data/item-gear.mjs` |
| `system.perkType` | Perk type (`fateBoon`, `fateBane`, `advantage`, `disadvantage`, `ability*`) | `''` | `module/data/item-feature.mjs` |
| `system.pbpCost` | PBP cost | `0` (step 0.5) | `module/data/item-feature.mjs` |
| `system.spellLevel` | Spell level (0..6) | `1` | `module/data/item-spell.mjs` |
| `system.malus` | Malus applied to the skill check (negative or 0) | `0` | `module/data/item-spell.mjs` |
| `system.spellType` | Spell category (`E`,`M`,`S`,`X`) | `'X'` | `module/data/item-spell.mjs` |
| `system.target` | Spell target (`A`,`O`,`P`,`V`,`S`) | `'P'` | `module/data/item-spell.mjs` |
| `system.incantation` | Incantation text | `''` | `module/data/item-spell.mjs` |
| `system.malusExtremeFormula` | Malus for extreme formula | `0` | `module/data/item-spell.mjs` |
| `system.extremeFormula` | Use the extreme formula | `false` | `module/data/item-spell.mjs` |
| `system.potionLevel` | Potion level (1..6) | `1` | `module/data/item-potion.mjs` |
| `system.malus` | Malus applied to checks | `0` | `module/data/item-potion.mjs` |
| `system.brand` | Broom brand | `''` | `module/data/item-broom.mjs` |
| `system.characteristics` | Technical characteristics / description | `''` | `module/data/item-broom.mjs` |
| `system.effects` | Free-form effects field | `''` | `module/data/item-broom.mjs` |
| `system.pbpCost` | PBP cost | `0` (step 0.5) | `module/data/item-broom.mjs` |

---

Notes:
- Derived values (e.g. `checks`, `derived`, `damageBonus`, `health.max`) are calculated in the DataModel `prepareDerivedData()` methods and are not stored in the schema; they are exposed via `getRollData()` for use in formulas and templates.
- If you add or rename a `system.*` field, update the corresponding DataModel (`module/data/*.mjs`), update templates (`templates/*`) and sheet logic (`module/sheets/*`). For structural renames add a migration in `module/hogwarts-system.mjs` (the `MIGRATIONS` block) to maintain world compatibility.
