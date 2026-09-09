#!/usr/bin/env python3
"""Extrait un PNG encode en base64 depuis un fichier texte.

Usage: python3 tools/b64-to-png.py <fichier-source> <fichier-png-destination>

Le fichier source doit contenir la charge utile entre les marqueurs
B64START et B64END (format produit par les captures Playwright du tutoriel).
"""
import base64
import pathlib
import re
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2

    source = pathlib.Path(sys.argv[1])
    target = pathlib.Path(sys.argv[2])

    text = source.read_text(encoding="utf-8", errors="ignore")
    match = re.search(r"B64START(.*?)B64END", text, re.S)
    if not match:
        print("Marqueurs B64START/B64END introuvables.", file=sys.stderr)
        return 1

    payload = re.sub(r"\s+", "", match.group(1))
    data = base64.b64decode(payload)
    if not data.startswith(b"\x89PNG"):
        print("Le contenu decode n'est pas un PNG.", file=sys.stderr)
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print(f"{target} ecrit ({len(data)} octets)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
