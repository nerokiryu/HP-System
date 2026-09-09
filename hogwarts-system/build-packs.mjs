/**
 * Build LevelDB compendium packs from individual JSON source files.
 * Usage: node build-packs.mjs
 */
import { ClassicLevel } from "classic-level";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PACKS = [
  { name: "hogwarts-spells", type: "Item" },
  { name: "hogwarts-potions", type: "Item" },
  { name: "hogwarts-components", type: "Item" },
  { name: "hogwarts-features", type: "Item" },
  { name: "hogwarts-creatures", type: "Actor" },
  { name: "hogwarts-guide", type: "JournalEntry" },
];

// Embedded collections live in their own LevelDB records and the parent keeps only
// their ids -- see `mapHierarchy` in @foundryvtt/foundryvtt-cli. A parent holding
// inline objects, or none at all, loads with an empty collection and no error.
const EMBEDDED = {
  JournalEntry: { sublevel: "journal", collections: ["pages"] },
};

async function buildPack(packDef) {
  const jsonDir = path.join(__dirname, "packs", packDef.name, "json");
  const dbDir = path.join(__dirname, "packs", packDef.name);

  // Remove existing LevelDB files (keep json/ subfolder)
  for (const f of fs.readdirSync(dbDir)) {
    const full = path.join(dbDir, f);
    if (f === "json" || f === "README.md") continue;
    if (fs.statSync(full).isDirectory()) continue;
    fs.unlinkSync(full);
  }

  const db = new ClassicLevel(dbDir, { keyEncoding: "utf8", valueEncoding: "utf8" });
  await db.open();

  const SKIP = new Set(["_all-spells.json", "_all-potions.json", "_all-components.json", "_all-creatures.json", "_advantages-disadvantages.json"]);
  const files = fs.readdirSync(jsonDir).filter((f) => f.endsWith(".json") && !SKIP.has(f));
  let count = 0;

  const batch = db.batch();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(jsonDir, file), "utf-8");
    const doc = JSON.parse(raw);
    if (!doc._id) {
      // Generate a deterministic 16-char hex ID from the filename
      const id = file.replace(/\.json$/, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).padEnd(16, "0");
      doc._id = id;
    }
    const embedded = EMBEDDED[packDef.type];
    const prefix = embedded ? `!${embedded.sublevel}!`
      : packDef.type === "Actor" ? "!actors!"
        : "!items!";

    if (embedded) {
      for (const collection of embedded.collections) {
        const children = doc[collection] ?? [];
        for (const child of children) {
          batch.put(`!${embedded.sublevel}.${collection}!${doc._id}.${child._id}`, JSON.stringify(child));
        }
        doc[collection] = children.map((child) => child._id);
      }
    }

    batch.put(`${prefix}${doc._id}`, JSON.stringify(doc));
    count++;
  }
  await batch.write();
  await db.close();

  console.log(`[${packDef.name}] Packed ${count} documents into LevelDB`);
}

async function main() {
  for (const pack of PACKS) {
    await buildPack(pack);
  }
  console.log("All packs built successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
