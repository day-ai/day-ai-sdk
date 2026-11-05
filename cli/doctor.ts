/**
 * `day-ai doctor` — node, the global link, the build, credential files and
 * profiles, and (unless --no-network) a live check of the active credentials.
 * Prints a table; never prints a secret. Exits 1 when something is missing.
 */
import { Command } from "commander";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CONFIG_DIR, CREDENTIALS_FILE, ROOT, clientFor, describeSource, permissionProblem, readCredentials, resolveCredentials } from "./config";
import { printTable } from "./output";

type Row = { check: string; status: string; detail: string };
const OK = "ok";
const WARN = "warn";
const MISSING = "missing";

/**
 * First `bin` on PATH, skipping temp dirs: under `yarn run` (as in `yarn setup`)
 * yarn prepends a temp dir with shims for this package's own bins, which would
 * otherwise shadow the real global link.
 */
function which(bin: string): string | null {
  const tmp = [os.tmpdir(), fs.realpathSync(os.tmpdir())];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const args = process.platform === "win32" ? [bin] : ["-a", bin];
    const hits = execFileSync(cmd, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return hits.find((h) => !tmp.some((t) => h.startsWith(t) || h.startsWith(`/private${t}`))) ?? null;
  } catch {
    return null;
  }
}

function linkRows(): Row[] {
  const rows: Row[] = [];
  const major = Number(process.versions.node.split(".")[0]);
  rows.push({ check: "node", status: major >= 20 ? OK : MISSING, detail: `${process.version}${major >= 20 ? "" : " (need 20+)"}` });

  const built = path.join(ROOT, "dist", "cli", "cli.js");
  rows.push({ check: "build", status: fs.existsSync(built) ? OK : MISSING, detail: fs.existsSync(built) ? built : "run `yarn build`" });

  const onPath = which("day-ai");
  if (!onPath) {
    rows.push({
      check: "day-ai on PATH",
      status: WARN,
      detail: "not linked: run `yarn setup` (or `npm link`); if it still isn't found, add `npm prefix -g`/bin to PATH",
    });
  } else {
    let target = onPath;
    try {
      target = fs.realpathSync(onPath);
    } catch {
      /* keep onPath */
    }
    const ours = target.startsWith(fs.realpathSync(ROOT));
    rows.push({
      check: "day-ai on PATH",
      status: ours ? OK : WARN,
      detail: ours ? `${onPath} → this repo` : `${onPath} → ${target} (a different checkout; re-run \`npm link\` here to switch)`,
    });
  }
  return rows;
}

function credentialRows(): Row[] {
  const rows: Row[] = [];
  const dirProblem = permissionProblem(CONFIG_DIR, 0o700);
  const fileProblem = permissionProblem(CREDENTIALS_FILE, 0o600);
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    rows.push({ check: "credentials file", status: WARN, detail: `${CREDENTIALS_FILE} doesn't exist yet: run \`day-ai login\`` });
  } else {
    rows.push({
      check: "credentials file",
      status: dirProblem || fileProblem ? WARN : OK,
      detail: dirProblem || fileProblem ? (fileProblem ?? dirProblem)! : `${CREDENTIALS_FILE} (owner-only)`,
    });
    try {
      const data = readCredentials();
      const names = Object.keys(data.profiles);
      rows.push({
        check: "profiles",
        status: names.length ? OK : WARN,
        detail: names.length ? names.map((n) => (n === data.defaultProfile ? `${n} (default)` : n)).join(", ") : "none: run `day-ai login`",
      });
    } catch (e) {
      rows.push({ check: "profiles", status: MISSING, detail: (e as Error).message });
    }
  }

  if (process.env.DAY_AI_PROFILE) rows.push({ check: "DAY_AI_PROFILE", status: OK, detail: process.env.DAY_AI_PROFILE });

  try {
    rows.push({ check: "active credentials", status: OK, detail: describeSource(resolveCredentials()) });
  } catch (e) {
    rows.push({ check: "active credentials", status: WARN, detail: (e as Error).message });
  }
  return rows;
}

async function networkRows(): Promise<Row[]> {
  let client;
  try {
    client = clientFor().client;
  } catch {
    return []; // already reported as missing
  }
  const meta = await client.getWorkspaceMetadata().catch((e: Error) => ({ success: false, error: e.message, data: undefined }));
  if (!meta.success || meta.data?.authError || !meta.data?.workspaceId) {
    return [{ check: "Day AI connection", status: MISSING, detail: `${meta.error ?? meta.data?.authError ?? "no workspace"}: run \`day-ai login\` again` }];
  }
  const tools = await client.mcpListTools();
  return [
    { check: "Day AI connection", status: OK, detail: `${meta.data.workspaceName ?? meta.data.workspaceId} via ${client.mcpUrl}` },
    {
      check: "MCP tools",
      status: tools.success ? OK : MISSING,
      detail: tools.success ? `${tools.data!.tools.length} available to this assistant` : `${tools.error}`,
    },
  ];
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Check node, the global link, the build, credential files and profiles, and the live connection")
    .option("--no-network", "skip the live connection check")
    .action(async (opts: { network: boolean }) => {
      const rows = [...linkRows(), ...credentialRows()];
      if (opts.network) rows.push(...(await networkRows()));
      printTable(rows);
      if (rows.some((r) => r.status === MISSING)) process.exitCode = 1;
    });
}
