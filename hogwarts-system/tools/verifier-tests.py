#!/usr/bin/env python3
"""Vérifie que chaque test d'intégrité échoue bien quand on réintroduit le défaut.

Un test vert ne prouve rien s'il est incapable de virer au rouge. On applique
donc une mutation à la fois, on relance la suite, et on restaure toujours.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

MUTATIONS = [
    ("action inexistante", "templates/actor/features.hbs",
     "data-action='openCreation'", "data-action='rollQuiNExistePas'", False),
    ("data-action sur un select", "templates/actor/npc.hbs",
     "<select name='system.profile.archetype'>",
     "<select name='system.profile.archetype' data-action='toggleBioSection'>", False),
    ("cle de traduction absente", "templates/actor/npc.hbs",
     "'HOGWARTS.Actor.NPC.Role'", "'HOGWARTS.Actor.NPC.RoleDisparu'", False),
    ("fr et en desynchronises", "lang/en.json",
     '"Budget": "Creation budget",', '"BudgetEnTrop": "x", "Budget": "Creation budget",', False),
    ("gabarit manquant", "module/sheets/actor-sheet.mjs",
     "templates/actor/header.hbs", "templates/actor/header-absent.hbs", False),
    ("selecteur CSS descendant", "src/scss/components/_forms.scss",
     "&.character-creation {", ".character-creation {", True),
    ("version desynchronisee", "system.json",
     '"version": "', '"version": "9.9.9', False),
]


def lancer_tests():
    r = subprocess.run(['node', '--test', 'test/'], cwd=RACINE,
                       capture_output=True, text=True)
    return r.returncode == 0


def compiler_scss():
    subprocess.run(['node', 'node_modules/sass/sass.js',
                    'src/scss/hogwarts-system.scss', 'css/hogwarts-system.css',
                    '--style=expanded', '--no-source-map'],
                   cwd=RACINE, capture_output=True)


def main():
    if not lancer_tests():
        print('ABANDON : la suite est deja rouge avant toute mutation.')
        return 1

    resultats = []
    for nom, fichier, avant, apres, recompiler in MUTATIONS:
        chemin = RACINE / fichier
        src = chemin.read_text(encoding='utf-8')
        if src.count(avant) < 1:
            resultats.append((nom, 'CIBLE INTROUVABLE'))
            continue

        sauvegarde = Path(tempfile.mkdtemp()) / chemin.name
        shutil.copy2(chemin, sauvegarde)
        css_sauve = None
        if recompiler:
            css_sauve = Path(tempfile.mkdtemp()) / 'hogwarts-system.css'
            shutil.copy2(RACINE / 'css/hogwarts-system.css', css_sauve)
        try:
            chemin.write_text(src.replace(avant, apres, 1), encoding='utf-8')
            if recompiler:
                compiler_scss()
            detecte = not lancer_tests()
        finally:
            shutil.copy2(sauvegarde, chemin)
            if css_sauve:
                shutil.copy2(css_sauve, RACINE / 'css/hogwarts-system.css')
        resultats.append((nom, 'detecte' if detecte else 'NON DETECTE'))

    largeur = max(len(n) for n, _ in resultats)
    for nom, etat in resultats:
        print(f'{nom.ljust(largeur)}  {etat}')

    rates = [n for n, e in resultats if e != 'detecte']
    print()
    if rates:
        print(f'{len(rates)} mutation(s) non detectee(s) : {", ".join(rates)}')
        return 1
    print(f'{len(resultats)}/{len(resultats)} mutations detectees.')
    return 0 if lancer_tests() else 1


if __name__ == '__main__':
    sys.exit(main())
