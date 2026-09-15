#!/usr/bin/env python3
"""Checks that each integrity test really fails when its defect is put back.

A green test proves nothing if it is incapable of turning red. So one mutation
is applied at a time, the suite is re-run, and the file is always restored.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (label, file, search, replace, recompile_scss)
MUTATIONS = [
    ("undeclared action", "templates/actor/features.hbs",
     "data-action='openCreation'", "data-action='rollThatDoesNotExist'", False),
    ("data-action on a select", "templates/actor/npc.hbs",
     "<select name='system.profile.archetype'>",
     "<select name='system.profile.archetype' data-action='toggleBioSection'>", False),
    ("missing translation key", "templates/actor/npc.hbs",
     "'HOGWARTS.Actor.NPC.Role'", "'HOGWARTS.Actor.NPC.RoleGone'", False),
    ("missing translation key (JS)", "module/sheets/actor/skills.mjs",
     "'HOGWARTS.Skills.MaxAuto.RestoreTitle'", "'HOGWARTS.Skills.MaxAuto.TitleGone'", False),
    ("format argument renamed", "templates/apps/character-creation.hbs",
     "age=age malus=ageMalus", "age=age wrongName=ageMalus", False),
    ("fr and en out of sync", "lang/en.json",
     '"Budget": "Creation budget",', '"BudgetExtra": "x", "Budget": "Creation budget",', False),
    ("missing template", "module/sheets/actor-sheet.mjs",
     "templates/actor/header.hbs", "templates/actor/header-missing.hbs", False),
    ("descendant CSS selector", "src/scss/components/_forms.scss",
     "&.character-creation {", ".character-creation {", True),
    ("version out of sync", "system.json",
     '"version": "', '"version": "9.9.9', False),
]


def run_tests():
    r = subprocess.run(['node', '--test', 'test/'], cwd=ROOT,
                       capture_output=True, text=True)
    return r.returncode == 0


def compile_scss():
    subprocess.run(['node', 'node_modules/sass/sass.js',
                    'src/scss/hogwarts-system.scss', 'css/hogwarts-system.css',
                    '--style=expanded', '--no-source-map'],
                   cwd=ROOT, capture_output=True)


def main():
    if not run_tests():
        print('ABORTED: the suite is already red before any mutation.')
        return 1

    results = []
    for label, filename, search, replace, recompile in MUTATIONS:
        target = ROOT / filename
        src = target.read_text(encoding='utf-8')
        if src.count(search) < 1:
            results.append((label, 'TARGET NOT FOUND'))
            continue

        backup = Path(tempfile.mkdtemp()) / target.name
        shutil.copy2(target, backup)
        css_backup = None
        if recompile:
            css_backup = Path(tempfile.mkdtemp()) / 'hogwarts-system.css'
            shutil.copy2(ROOT / 'css/hogwarts-system.css', css_backup)
        try:
            target.write_text(src.replace(search, replace, 1), encoding='utf-8')
            if recompile:
                compile_scss()
            caught = not run_tests()
        finally:
            shutil.copy2(backup, target)
            if css_backup:
                shutil.copy2(css_backup, ROOT / 'css/hogwarts-system.css')
        results.append((label, 'caught' if caught else 'NOT CAUGHT'))

    width = max(len(n) for n, _ in results)
    for label, state in results:
        print(f'{label.ljust(width)}  {state}')

    missed = [n for n, s in results if s != 'caught']
    print()
    if missed:
        print(f'{len(missed)} mutation(s) not caught: {", ".join(missed)}')
        return 1
    print(f'{len(results)}/{len(results)} mutations caught.')
    return 0 if run_tests() else 1


if __name__ == '__main__':
    sys.exit(main())
