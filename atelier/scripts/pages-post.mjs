#!/usr/bin/env node
/** Prépare dist/client pour GitHub Pages : index.html, 404.html, .nojekyll. */
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "dist/client";
const shell = join(dir, "_shell.html");
if (!existsSync(shell)) {
  console.error("[pages] dist/client/_shell.html introuvable");
  process.exit(1);
}

const css = readdirSync(join(dir, "assets")).find((f) => f.endsWith(".css"));
if (!css) {
  console.error("[pages] pas de CSS client");
  process.exit(1);
}

let html = readFileSync(shell, "utf8");
html = html.replace(/\/Eidos\/assets\/styles-[^."]+\.css/g, `/Eidos/assets/${css}`);

writeFileSync(join(dir, "index.html"), html);
copyFileSync(join(dir, "index.html"), join(dir, "404.html"));
writeFileSync(join(dir, ".nojekyll"), "");
console.log("[pages] prêt :", dir, "· css", css);
