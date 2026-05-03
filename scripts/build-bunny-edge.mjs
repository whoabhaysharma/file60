import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const entry = path.join(root, "bunny-edge", "api.ts");
const outDir = path.join(root, "bunny-edge", "dist");
const outFile = path.join(outDir, "api.bundle.js");

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [entry],
  outfile: outFile,
  bundle: true,
  format: "iife",
  platform: "browser",
  conditions: ["browser"],
  mainFields: ["browser", "module", "main"],
  target: ["es2022"],
  sourcemap: false,
  minify: false,
  logLevel: "info",
  banner: {
    js: "// Bundled Bunny Edge script. Paste this file into Bunny Edge Standalone."
  }
});

await writeFile(
  path.join(outDir, "README.txt"),
  [
    "How to deploy Bunny Edge backend:",
    "1) Run: npm run build:bunny-edge",
    "2) Open bunny-edge/dist/api.bundle.js",
    "3) Copy-paste into Bunny Edge Script Standalone editor",
    "4) Set env vars in Bunny dashboard and publish"
  ].join("\n"),
  "utf8"
);

console.log(`Bundled script written to: ${outFile}`);
