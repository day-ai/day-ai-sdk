import * as fs from "node:fs";
import * as path from "node:path";

/** Package root: this file is src/version.ts in source and dist/src/version.js when built. */
const ROOT = path.resolve(__dirname, __dirname.includes(`${path.sep}dist${path.sep}`) ? "../.." : "..");

/** The SDK version from package.json, the single source of truth. */
export const SDK_VERSION: string = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")).version;
  } catch {
    return "0.0.0";
  }
})();
