import { build } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const src = join(root, "src");
const dist = join(root, "dist");
const browserTargets = ["chrome", "edge", "opera", "firefox"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

async function copyFile(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function bundle(entry, outfile) {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ["chrome109", "firefox115"],
    format: "esm",
    logLevel: "warning"
  });
}

async function versionedHtml(sourcePath, outputDir, assetNames) {
  let html = await readFile(sourcePath, "utf8");
  for (const assetName of assetNames) {
    const asset = await readFile(join(outputDir, assetName));
    const version = createHash("sha256").update(asset).digest("hex").slice(0, 12);
    html = html.replaceAll(`"${assetName}"`, `"${assetName}?v=${version}"`);
  }
  return html;
}

async function buildSurface(outputDir, includeExtensionRuntime = false) {
  await mkdir(outputDir, { recursive: true });
  await bundle(join(src, "app.js"), join(outputDir, "app.js"));
  await bundle(join(src, "print.js"), join(outputDir, "print.js"));
  await copyFile(join(src, "app.css"), join(outputDir, "app.css"));
  await copyFile(join(src, "print.css"), join(outputDir, "print.css"));
  await cp(join(src, "assets"), join(outputDir, "assets"), { recursive: true });
  await writeFile(
    join(outputDir, "app.html"),
    await versionedHtml(join(src, "app.html"), outputDir, ["app.css", "app.js"]),
  );
  await writeFile(
    join(outputDir, "print.html"),
    await versionedHtml(join(src, "print.html"), outputDir, ["print.css", "print.js"]),
  );
  if (includeExtensionRuntime) {
    await copyFile(join(root, "background.js"), join(outputDir, "background.js"));
  }
}

await buildSurface(join(dist, "web"));
await copyFile(join(dist, "web", "app.html"), join(dist, "web", "index.html"));

const baseManifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
for (const browser of browserTargets) {
  const outputDir = join(dist, browser);
  await buildSurface(outputDir, true);
  const manifest = structuredClone(baseManifest);
  if (browser === "firefox") {
    manifest.background = { scripts: ["background.js"] };
    manifest.browser_specific_settings = {
      gecko: {
        id: "labeloo@wiplash.ai",
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["none"],
          optional: ["authenticationInfo", "personallyIdentifyingInfo"]
        }
      }
    };
  }
  await writeFile(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log("Built Labeloo web app and Chrome, Edge, Opera, and Firefox extensions.");
