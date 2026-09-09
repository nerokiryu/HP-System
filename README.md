# HP-System

Dépôt de travail du système Foundry VTT **Hogwarts System**, pour le jeu de rôle amateur
*Harry Potter JdR*.

## 📖 La documentation du système est ici → [hogwarts-system/README.md](hogwarts-system/README.md)

Vous y trouverez l'installation, le contenu des compendiums, les règles implémentées, les
réglages et les instructions de développement.

## Installation rapide

Dans Foundry : **Configuration → Systèmes de jeu → Installer un système**, puis collez :

```
https://github.com/nerokiryu/HP-System/releases/latest/download/system.json
```

## Organisation du dépôt

| Chemin | Contenu |
|---|---|
| [hogwarts-system/](hogwarts-system/) | Le système lui-même — c'est ce qui est publié dans les releases |
| [rules/](rules/) | Transcriptions des livres, utilisées pour générer les compendiums |
| [AUDIT_FOUNDRY_V14.md](AUDIT_FOUNDRY_V14.md) | Audit de conformité aux API Foundry v14 |
| [compare.md](compare.md) | Suivi de la fidélité aux règles des livres |

Seul le dossier `hogwarts-system/` est distribué : les transcriptions et les documents de
suivi restent propres au dépôt.
