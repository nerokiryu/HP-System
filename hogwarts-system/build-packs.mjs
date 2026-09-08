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
];

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
    const prefix = packDef.type === "Actor" ? "!actors!" : "!items!";
    const key = `${prefix}${doc._id}`;
    batch.put(key, JSON.stringify(doc));
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
