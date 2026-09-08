#!/usr/bin/env python3
"""
Extract creatures from the Bestiaire PDF and generate Foundry VTT JSON files.
Uses pdfplumber with column splitting + known creature name list from TOC.
"""
import pdfplumber
import re
import json
import os

PDF_PATH = "rules/original/Bestiaire-des-animaux-fantastiques.pdf"
OUTPUT_DIR = "hogwarts-system/packs/hogwarts-creatures/json"

START_PAGE = 17  # 0-indexed (page 18)
END_PAGE = 115   # 0-indexed (page 116)

# Complete list of creature names from the PDF table of contents, including sub-entries
KNOWN_CREATURES = [
    # Araignées section
    "Acromentule jeune", "Acromentule adulte", "Acromentule âgée",
    "Araignée agrandie magiquement", "Araignée venimeuse",
    # Main creatures
    "Augurey", "Bandimon", "Basilic", "Bicorne", "Billywig", "Botruc",
    "Boullu", "Boursouf", "Boursoufflet", "Bousier géant",
    "Chartier", "Chien à trois têtes", "Chupacabra", "Centaure",
    # Chevaux ailés
    "Abraxan", "Ethonan", "Gronian", "Sombral",
    "Chaporouge", "Chimère", "Ciseburine", "Clabbert", "Crabe de feu", "Croup",
    "Curupira", "Demiguise", "Démonzémerveilles", "Diablotin", "Dirico",
    "Dissimuleur", "Doxy", "Dragfeu",
    # Dragons
    "Boutfeu Chinois", "Cornelongue roumain", "Dent-de-Vipère du Pérou",
    "Magyar à pointes", "Noir des Hébrides", "Norvégien à crête",
    "Opalœil des antipodes", "Pansedefer ukrainien", "Suédois à museau court",
    "Vert gallois",
    "Dukuwaqa", "Erkling", "Éruptif",
    # Êtres de l'eau
    "Merrow", "Selkie", "Sirène et Triton",
    # Main creatures continued
    "Fangieux", "Farfadet", "Fée", "Fléreur", "Hybride Chat-Fléreur",
    "Focifère", "Gnome", "Goule", "Goule caméléon", "Goule meurtrière",
    "Grapcorne", "Griffon", "Grinchebourdon",
    "Hippocampe", "Hippocampe monture", "Hippogriffe",
    "Horglup", "Hodag", "Jackalope", "Jobarbille",
    "Kappa", "Kelpi", "Leucrotta", "Licorne",
    "Limace de feu", "Loup-garou", "Louveteau de Loup-garou",
    "Lutin de Cornouaille", "Malagrif tacheté", "Manticore", "Matagot",
    "Moke", "Morenplis", "Murlap", "Musard", "Niffleur", "Noueux", "Nundu",
    "Occamy", "Occamy de petite taille", "Occamy taille moyenne", "Occamy de grande taille",
    "Oiseau-tonnerre", "Oiseau tonnerre", "Phénix",
    "Porlock", "Povrebine", "Qilin", "Quintaped",
    "Raimora", "Re'em", "Rougarou", "Runespoor",
    "Salamandre", "Salamandre géante d'Amazonie",
    "Sasabonsam", "Scroutt à pétard", "Selma", "Serpencendre",
    "Serpent cornu", "Serpent de mer", "Sharak", "Snallygaster",
    "Sphinx", "Strangulot", "Tébo",
    "Troll des montagnes", "Troll des forêts", "Troll des rivières",
    "Vampirmite", "Veaudelune", "Ver luisant", "Verlieu", "Veracrasse",
    "Vivet doré", "Vouivre", "Womatou", "Yéti", "Zouwu",
    "Licheur", "Eruptif",
    # Dragon aliases
    "Dragonlion",
    # Variant names that may appear in the text
    "Prolock",
    "Goules caméléon", "Goules meurtrières",
    "Nixe", "Ombrea", "Vlad",
    "Re'Em", "Re'em",
    "Scroutt à Pétard",
    "Hybrides Chat-Fléreurs",
    "Salamandre géante d'Amazonie",
]


def normalize(s):
    """Normalize string: lowercase + strip accents."""
    s = s.lower()
    replacements = {
        'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'œ': 'oe', 'æ': 'ae', "\u2019": "'", "\u2018": "'",
        "\u0027": "'", "\u2032": "'",
    }
    for old, new in replacements.items():
        s = s.replace(old, new)
    return s

STAT_MAP = {
    'FOR': 'str', 'CON': 'con', 'TAI': 'siz', 'PER': 'per',
    'DEX': 'dex', 'INT': 'int', 'APP': 'app', 'POU': 'pow',
}


def extract_all_text(pdf):
    """Extract text from all creature pages, splitting left/right columns."""
    all_text = []
    for i in range(START_PAGE, END_PAGE + 1):
        page = pdf.pages[i]
        w = page.width
        h = page.height
        mid = w / 2
        left = page.crop((0, 0, mid, h))
        right = page.crop((mid, 0, w, h))
        lt = left.extract_text() or ''
        rt = right.extract_text() or ''
        all_text.append(lt)
        all_text.append(rt)
    return '\n'.join(all_text)


def find_stat_blocks(text):
    """Find all stat blocks (FOR line starts)."""
    lines = text.split('\n')
    blocks = []
    for i, line in enumerate(lines):
        if re.match(r'^FOR\s+\d', line.strip()):
            blocks.append(i)
    return lines, blocks


def match_name_to_block(lines, stat_start, used_names):
    """Match a known creature name to a stat block by looking backwards."""
    name_norm_map = {}
    for n in KNOWN_CREATURES:
        nn = normalize(n)
        if nn not in used_names:
            name_norm_map[nn] = n

    # Search backwards up to 40 lines
    for i in range(stat_start - 1, max(stat_start - 40, 0), -1):
        line = lines[i].strip()
        if not line:
            continue
        line_norm = normalize(line)

        # Direct line match
        if line_norm in name_norm_map:
            return name_norm_map[line_norm], i

        # Line starts with known name
        for nn, name in sorted(name_norm_map.items(), key=lambda x: -len(x[0])):
            if line_norm.startswith(nn) and len(nn) > 3:
                return name, i

        # Known name appears in the line
        for nn, name in sorted(name_norm_map.items(), key=lambda x: -len(x[0])):
            if nn in line_norm and len(nn) > 5:
                return name, i

    return None, stat_start


def parse_avg(s):
    """Parse average value from string like '10-11' or '7'."""
    s = s.strip()
    if '-' in s:
        parts = s.split('-')
        try:
            return round(sum(int(p) for p in parts) / len(parts))
        except ValueError:
            return 0
    try:
        return int(s)
    except ValueError:
        return 0


def parse_block(lines, stat_start, end_line):
    """Parse a creature's stat block and related sections."""
    data = {
        'stats': {},
        'movement': {'land': 8, 'fly': None, 'swim': None},
        'hp': 0,
        'attacks': [],
        'armor': {'value': 0, 'label': ''},
        'skills': [],
        'powers': '',
        'usage': '',
        'classification': 'XXX',
    }

    block_text = '\n'.join(lines[stat_start:end_line])

    # Parse stats
    for i in range(stat_start, min(end_line, stat_start + 20)):
        line = lines[i].strip()
        m = re.match(r'^(FOR|CON|TAI|PER|DEX|INT|APP|POU)\s+(\S+)\s+([\d\-]+)', line)
        if m:
            key = STAT_MAP.get(m.group(1))
            if key:
                data['stats'][key] = {
                    'value': parse_avg(m.group(3)),
                    'formula': m.group(2),
                }

    # Movement
    mv = re.search(r'MOUVEMENT\s*:?\s*(\d+)(?:\s*[(/]\s*(\d+)\s*[)/])?', block_text)
    if mv:
        data['movement']['land'] = int(mv.group(1))
        if mv.group(2):
            data['movement']['fly'] = int(mv.group(2))

    # Check for vol/nage
    fly_m = re.search(r'(?:vol|envol)\s*[:\s]*(\d+)', block_text, re.I)
    if fly_m:
        data['movement']['fly'] = int(fly_m.group(1))
    swim_m = re.search(r'nage\s*[:\s]*(\d+)', block_text, re.I)
    if swim_m:
        data['movement']['swim'] = int(swim_m.group(1))

    # HP
    hp_m = re.search(r'POINTS DE VIE\s*:?\s*([\d\-]+)', block_text)
    if hp_m:
        data['hp'] = parse_avg(hp_m.group(1))

    # Combat attacks
    combat_m = re.search(r'COMBAT\s*:?\s*(.+?)(?=\nARMURE|\nCOMPETENCES|\nPOUVOIRS|\nUTILISATION|\nCLASSIFICATION|\n[A-Z]{3}\s+\d)', block_text, re.DOTALL)
    if combat_m:
        parse_attacks(data, combat_m.group(1))

    # Armor
    armor_m = re.search(r'ARMURE\s*(?:\(([^)]+)\))?\s*:?\s*(.+?)(?:\n|$)', block_text)
    if armor_m:
        data['armor']['label'] = armor_m.group(1) or ''
        detail = armor_m.group(2).strip()
        dmg_m = re.search(r'-?(\d+)\s*d[eé]g[aâ]t', detail)
        if dmg_m:
            data['armor']['value'] = int(dmg_m.group(1))

    # Skills
    skills_m = re.search(r'COMPETENCES\s*:?\s*(.+?)(?=POUVOIRS|UTILISATION|CLASSIFICATION|$)', block_text, re.DOTALL)
    if skills_m:
        parse_skills(data, skills_m.group(1))

    # Powers
    powers_m = re.search(r'POUVOIRS ET CAPACITES\s*:?\s*(.+?)(?=UTILISATION|CLASSIFICATION|$)', block_text, re.DOTALL)
    if powers_m:
        data['powers'] = clean_text(powers_m.group(1))

    # Usage
    usage_m = re.search(r'UTILISATION\s*:?\s*(.+?)(?=CLASSIFICATION|$)', block_text, re.DOTALL)
    if usage_m:
        data['usage'] = clean_text(usage_m.group(1))

    # Classification
    class_m = re.search(r'CLASSIFICATION\s+MDLM\s*:?\s*(X{1,5})', block_text)
    if class_m:
        data['classification'] = class_m.group(1)

    return data


def parse_attacks(data, text):
    """Parse attack entries."""
    pattern = re.compile(
        r'([A-ZÀ-Üa-zà-ÿ][a-zà-ÿA-ZÀ-Ü\s\-\'éèêëàâîïôùûç]+?)\s*:?\s*(\d+)%\s*\(?([\dd\+\-\s]+)\)?',
        re.I
    )
    for m in pattern.finditer(text):
        name = m.group(1).strip().rstrip(':').strip()
        if len(name) > 30:
            continue
        data['attacks'].append({
            'name': name,
            'chance': int(m.group(2)),
            'damage': m.group(3).strip(),
        })


def parse_skills(data, text):
    """Parse skill entries."""
    pattern = re.compile(
        r'([A-ZÀ-Ü][a-zà-ÿA-ZÀ-Ü\s\-\'()éèêëàâîïôùûç]+?)\s*:?\s*(\d+)%',
        re.I
    )
    for m in pattern.finditer(text):
        name = m.group(1).strip().rstrip(':').strip()
        if len(name) > 30:
            continue
        data['skills'].append({
            'name': name,
            'value': int(m.group(2)),
        })


def clean_text(text):
    """Clean up extracted text."""
    text = text.strip()
    text = re.sub(r'www\.geek-it\.org\s*\d*', '', text)
    text = re.sub(r'version \d+\.\d+ par \w+', '', text, flags=re.I)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def make_slug(name):
    """Create a URL-safe slug from a creature name."""
    slug = name.lower()
    replacements = {
        'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'œ': 'oe', 'æ': 'ae', "'": '',
    }
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')


def creature_to_foundry(name, data):
    """Convert parsed creature data to Foundry VTT Actor JSON."""
    stats = {}
    for key in ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'per']:
        s = data['stats'].get(key, {'value': 10, 'formula': ''})
        stats[key] = {'value': s.get('value', 10), 'formula': s.get('formula', '')}

    siz = stats['siz']['value']
    con = stats['con']['value']
    hp_max = data['hp'] if data['hp'] > 0 else max(1, (siz + con + 1) // 2)

    powers_html = f"<p>{data['powers']}</p>" if data['powers'] else ""
    usage_html = f"<p>{data['usage']}</p>" if data['usage'] else ""

    return {
        "name": name,
        "type": "creature",
        "img": "icons/svg/mystery-man.svg",
        "system": {
            "biography": "",
            "health": {"value": hp_max, "max": hp_max},
            "ardor": {"value": 0, "max": 0},
            "initiativeBonus": 0,
            "healthNonLethal": {"value": 0, "max": hp_max},
            "conditions": {"seriousWound": False, "agony": False},
            "classification": data['classification'],
            "stats": stats,
            "movement": data['movement'],
            "armor": data['armor'],
            "attacks": data['attacks'],
            "skills": data['skills'],
            "powers": powers_html,
            "usage": usage_html,
            "magicResistance": {"threshold": 0, "effectReduction": 1},
            "notes": {"gmNotes": ""},
        },
        "items": [],
        "effects": [],
        "folder": None,
        "flags": {},
        "_stats": {
            "compendiumSource": None,
            "duplicateSource": None,
            "coreVersion": "12.331",
            "systemId": "hogwarts-system",
            "systemVersion": "1.0.0",
            "createdTime": None,
            "modifiedTime": None,
            "lastModifiedBy": None,
        },
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Clean old files
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith('.json'):
            os.remove(os.path.join(OUTPUT_DIR, f))

    print("Opening PDF...")
    pdf = pdfplumber.open(PDF_PATH)

    print("Extracting text...")
    text = extract_all_text(pdf)
    print(f"Total text: {len(text)} chars")

    lines, stat_blocks = find_stat_blocks(text)
    print(f"Found {len(stat_blocks)} stat blocks")

    # Match names to blocks
    used_names = set()
    results = []

    for idx, start in enumerate(stat_blocks):
        end = stat_blocks[idx + 1] if idx + 1 < len(stat_blocks) else len(lines)
        name, name_line = match_name_to_block(lines, start, used_names)
        if name:
            used_names.add(normalize(name))
            results.append((name, start, end))
        else:
            # Fallback: try uppercase words nearby
            fallback = None
            for j in range(start - 1, max(start - 15, 0), -1):
                l = lines[j].strip()
                if l and l[0].isupper() and len(l.split()) <= 5 and len(l) < 40:
                    if not any(kw in l for kw in ['Caract', 'Jets de', 'www', 'version']):
                        fallback = l
                        break
            if fallback:
                results.append((f"UNMATCHED: {fallback}", start, end))
            else:
                results.append((f"UNMATCHED: block_{idx}", start, end))

    matched = sum(1 for n, _, _ in results if not n.startswith('UNMATCHED'))
    print(f"Matched {matched} / {len(results)} blocks to known names")

    # Parse and write
    all_creatures = []
    for name, start, end in results:
        if name.startswith('UNMATCHED'):
            print(f"  SKIP {name}")
            continue

        data = parse_block(lines, start, end)
        actor = creature_to_foundry(name, data)
        slug = make_slug(name)
        filepath = os.path.join(OUTPUT_DIR, f"{slug}.json")

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(actor, f, ensure_ascii=False, indent=2)

        all_creatures.append(actor)

        atk_str = ', '.join(f"{a['name']} {a['chance']}% ({a['damage']})" for a in data['attacks'])
        print(f"  {name}: [{data['classification']}] HP={data['hp']} "
              f"MV={data['movement']['land']} "
              f"Attacks=[{atk_str}] Skills={len(data['skills'])}")

    # Write aggregate
    agg_path = os.path.join(OUTPUT_DIR, "_all-creatures.json")
    with open(agg_path, 'w', encoding='utf-8') as f:
        json.dump(all_creatures, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(all_creatures)} creature files to {OUTPUT_DIR}")

    # Show missing creatures from known list
    found_norm = used_names
    missing = [n for n in KNOWN_CREATURES if normalize(n) not in found_norm]
    if missing:
        print(f"\nCreatures from list NOT found ({len(missing)}):")
        for n in missing:
            print(f"  - {n}")


if __name__ == '__main__':
    main()
