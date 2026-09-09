/**
 * Build the Game Master guide journal entry from docs/GUIDE-MJ.md.
 *
 * The Markdown file is the single source of truth: it renders on GitHub and is
 * converted here into a Foundry JournalEntry whose pages mirror the level-2
 * headings of the guide. Image paths are rewritten from the repository-relative
 * form (`../assets/...`) to the Foundry-served form
 * (`systems/hogwarts-system/assets/...`).
 *
 * Usage: node build-guide.mjs
 * The LevelDB pack itself is produced afterwards by build-packs.mjs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE = path.join(__dirname, 'docs', 'GUIDE-MJ.md');
const OUT_DIR = path.join(__dirname, 'packs', 'hogwarts-guide', 'json');
// Foundry rejects any document whose id is not exactly 16 alphanumeric characters,
// and it does so silently for embedded documents: pages simply vanish.
const ID_PATTERN = /^[a-zA-Z0-9]{16}$/;
const JOURNAL_ID = 'hogwartsguidemj0';
const PAGE_ID_PREFIX = 'hogwartsguide';
const ASSET_PREFIX = 'systems/hogwarts-system/assets/';

/** Escape the five characters that must never appear raw in HTML text. */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convert the inline Markdown subset used by the guide. */
function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Internal anchors are meaningless once split into pages: keep the label only.
  out = out.replace(/\[([^\]]+)\]\(#[^)]*\)/g, '$1');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function imagePath(src) {
  return src.replace(/^\.\.\/assets\//, ASSET_PREFIX);
}

function tableRow(line, cell) {
  const cells = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return `<tr>${cells.map((c) => `<${cell}>${inline(c)}</${cell}>`).join('')}</tr>`;
}

/** Convert a block of Markdown lines into HTML. */
function toHtml(lines) {
  const html = [];
  let i = 0;

  const flushParagraph = (buffer) => {
    if (buffer.length) html.push(`<p>${inline(buffer.join(' '))}</p>`);
    buffer.length = 0;
  };

  const paragraph = [];

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph(paragraph);
      html.push('<hr />');
      i++;
      continue;
    }

    // Blank line
    if (!line.trim()) {
      flushParagraph(paragraph);
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{3,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(paragraph);
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Image
    const image = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line);
    if (image) {
      flushParagraph(paragraph);
      html.push(
        `<figure><img src="${imagePath(image[2])}" alt="${escapeHtml(image[1])}" />`
        + `<figcaption>${inline(image[1])}</figcaption></figure>`,
      );
      i++;
      continue;
    }

    // Table
    if (line.trim().startsWith('|') && lines[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushParagraph(paragraph);
      const rows = [`<thead>${tableRow(line, 'th')}</thead>`];
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        body.push(tableRow(lines[i], 'td'));
        i++;
      }
      rows.push(`<tbody>${body.join('')}</tbody>`);
      html.push(`<table>${rows.join('')}</table>`);
      continue;
    }

    // Block quote
    if (line.trim().startsWith('>')) {
      flushParagraph(paragraph);
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    // Lists
    const ordered = /^\d+\.\s+/.test(line.trim());
    const unordered = /^[-*]\s+/.test(line.trim());
    if (ordered || unordered) {
      flushParagraph(paragraph);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length) {
        const current = lines[i];
        const isItem = ordered ? /^\d+\.\s+/.test(current.trim()) : /^[-*]\s+/.test(current.trim());
        if (isItem) {
          items.push(current.trim().replace(/^(\d+\.|[-*])\s+/, ''));
          i++;
        } else if (current.trim() && /^\s{2,}/.test(current)) {
          // Continuation line of the previous item.
          items[items.length - 1] += ` ${current.trim()}`;
          i++;
        } else {
          break;
        }
      }
      html.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flushParagraph(paragraph);
  return html.join('\n');
}

/** Split the guide on level-2 headings, one journal page each. */
function splitPages(markdown) {
  const lines = markdown.split(/\r?\n/);
  const pages = [];
  let title = null;
  let buffer = [];

  const push = () => {
    if (title === null) return;
    // Drop the trailing horizontal rule that separates sections.
    while (buffer.length && (!buffer[buffer.length - 1].trim() || /^---+$/.test(buffer[buffer.length - 1].trim()))) {
      buffer.pop();
    }
    // Foundry already lists the pages, so the Markdown table of contents — whose
    // anchors would be dead once split — is dropped.
    if (title.toLowerCase() !== 'sommaire') pages.push({ title, html: toHtml(buffer) });
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      push();
      // Strip the leading section number: the page order already conveys it.
      title = heading[1].replace(/^\d+\.\s*/, '').trim();
      continue;
    }
    if (title === null) continue; // Preamble and table of contents.
    buffer.push(line);
  }
  push();

  return pages;
}

/**
 * A JournalEntry with its pages inline, matching the layout `foundryvtt-cli`
 * expects as pack source. `build-packs.mjs` splits the pages into their own
 * LevelDB records and rewrites this array as a list of ids.
 */
function buildJournal(pages) {
  return {
    _id: JOURNAL_ID,
    name: 'Guide du Maître du Jeu',
    pages: pages.map((page, index) => ({
      _id: `${PAGE_ID_PREFIX}${String(index).padStart(16 - PAGE_ID_PREFIX.length, '0')}`,
      name: page.title,
      type: 'text',
      title: { show: true, level: 1 },
      text: { format: 1, content: page.html },
      sort: (index + 1) * 100000,
      ownership: { default: -1 },
      flags: {},
    })),
    folder: null,
    sort: 0,
    ownership: { default: 2 },
    flags: {},
    _stats: { systemId: 'hogwarts-system' },
  };
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source introuvable : ${SOURCE}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(SOURCE, 'utf-8');
  const pages = splitPages(markdown);
  if (!pages.length) {
    console.error('Aucune section de niveau 2 trouvée dans le guide.');
    process.exit(1);
  }

  const missing = [];
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const file = path.join(__dirname, 'docs', match[1]);
    if (!fs.existsSync(file)) missing.push(match[1]);
  }
  if (missing.length) {
    console.error(`Images manquantes :\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(OUT_DIR, file));
  }

  const journal = buildJournal(pages);

  const badIds = [journal._id, ...journal.pages.map((p) => p._id)].filter((id) => !ID_PATTERN.test(id));
  if (badIds.length) {
    console.error(`Identifiants invalides (16 caractères alphanumériques attendus) :\n  ${badIds.join('\n  ')}`);
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'guide-mj.json'),
    `${JSON.stringify(journal, null, 2)}\n`,
    'utf-8',
  );

  console.log(`[hogwarts-guide] ${pages.length} pages générées depuis docs/GUIDE-MJ.md`);
  for (const page of pages) console.log(`  - ${page.title}`);
}

main();
