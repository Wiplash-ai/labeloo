import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url).pathname;
const artifacts = join(root, "artifacts", "packages");
spawnSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts, { recursive: true });

for (const browser of ["chrome", "edge", "opera", "firefox"]) {
  const result = spawnSync("zip", ["-qr", join(artifacts, `labeloo-${browser}-0.1.0.zip`), "."], {
    cwd: join(root, "dist", browser),
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Store packages written to ${artifacts}`);
