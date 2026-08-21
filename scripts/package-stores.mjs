import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url).pathname;
const artifacts = join(root, "artifacts", "packages");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
spawnSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts, { recursive: true });

for (const browser of ["chrome", "edge", "opera", "firefox"]) {
  const result = spawnSync("zip", ["-qr", join(artifacts, `labeloo-${browser}-${version}.zip`), "."], {
    cwd: join(root, "dist", browser),
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const firefoxSource = spawnSync(
  "zip",
  [
    "-qr",
    join(artifacts, `labeloo-firefox-source-${version}.zip`),
    "background.js",
    "manifest.json",
    "package.json",
    "package-lock.json",
    "src",
    "scripts",
    "tests",
    "docs",
    "README.md",
    "PRIVACY.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "LICENSE"
  ],
  { cwd: root, stdio: "inherit" }
);
if (firefoxSource.status !== 0) process.exit(firefoxSource.status || 1);

console.log(`Store packages written to ${artifacts}`);
