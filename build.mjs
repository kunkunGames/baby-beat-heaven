import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const MODULES = [
  "src/math.js",
  "src/camera.js",
  "src/audio.js",
  "src/rig.js",
  "src/charts.js",
  "src/stages.js",
  "src/game.js",
];

const template = readFileSync(resolve(ROOT, "src/template.html"), "utf8");
const chunks = MODULES.map((rel) => {
  const code = readFileSync(resolve(ROOT, rel), "utf8");
  return `/* ===== ${rel} ===== */\n${code}\n`;
});

const bundle = `"use strict";\n(() => {\n${chunks.join("\n")}\n})();\n`;
const outHtml = template.replace("/*__GAME_BUNDLE__*/", () => bundle);

const outPath = resolve(ROOT, "index.html");
writeFileSync(outPath, outHtml, "utf8");
// Also emit raw JS to tmp for syntax checking
writeFileSync(resolve(ROOT, "bundle-check.tmp.js"), bundle, "utf8");

console.log(
  `Built ${outPath} (${(Buffer.byteLength(outHtml, "utf8") / 1024).toFixed(1)} KB, ${MODULES.length} modules)`
);
