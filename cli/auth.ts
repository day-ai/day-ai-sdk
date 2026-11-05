/**
 * `day-ai login | logout | status | token | profiles | use` — authorization and profiles.
 *
 * A profile is one authorization: the workspace and assistant picked on the
 * Day AI consent screen. Log in once per pair you need (`--profile work`), then
 * pick per command with `--profile` or DAY_AI_PROFILE, or set the default with
 * `day-ai use`.
 */
import { Command, Option } from "commander";
import { DayAIClient } from "../src/client";
import {
  CREDENTIALS_FILE,
  DEFAULT_BASE_URL,
  clientFor,
  describeSource,
  profileName,
  readCredentials,
  removeProfile,
  saveProfile,
  updateProfile,
  writeCredentials,
  type Profile,
} from "./config";
import { defaultClientName, login } from "./oauth";
import { info, json, printTable } from "./output";

const profileOption = () => new Option("-p, --profile <name>", "credentials profile (default: DAY_AI_PROFILE, then the default profile)");

interface Workspace {
  workspaceName?: string;
  workspaceId?: string;
  userId?: string;
}

/** The workspace behind a token, or the reason it couldn't be read. */
async function workspaceOf(client: DayAIClient): Promise<{ ok: true; ws: Workspace } | { ok: false; error: string }> {
  try {
    const meta = await client.getWorkspaceMetadata();
    if (!meta.success) return { ok: false, error: meta.error ?? "metadata request failed" };
    if (meta.data?.authError || !meta.data?.workspaceId) return { ok: false, error: meta.data?.authError ?? "no workspace returned" };
    return { ok: true, ws: { workspaceName: meta.data.workspaceName, workspaceId: meta.data.workspaceId, userId: meta.data.userId } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const expiresIn = (epochSeconds?: number) => {
  if (!epochSeconds) return "none cached";
  const mins = Math.round((epochSeconds - Date.now() / 1000) / 60);
  return mins > 0 ? `valid ~${mins} min` : "expired (refreshes on next call)";
};

export function registerAuth(program: Command): void {
  program
    .command("login")
    .description("Sign in through your browser and save credentials to ~/.config/day-ai (no .env needed)")
    .addOption(profileOption())
    .option("--base-url <url>", "Day AI URL (default: DAY_AI_BASE_URL, then https://day.ai)")
    .option("--name <name>", "OAuth client name shown on the consent screen", defaultClientName())
    .option("--port <port>", "local callback port (default: any free port)", (v) => parseInt(v, 10))
    .option("--no-browser", "print the sign-in URL instead of opening a browser")
    .option("--default", "make this the default profile (the first login always is)")
    .action(async (opts: { profile?: string; baseUrl?: string; name: string; port?: number; browser: boolean; default?: boolean }) => {
      const name = profileName(opts.profile);
      const existing = readCredentials().profiles[name];
      const baseUrl = (opts.baseUrl || process.env.DAY_AI_BASE_URL || existing?.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");

      info(`Logging in to ${baseUrl} as profile "${name}"${existing ? " (replacing the existing login)" : ""}.`);
      const result = await login({ baseUrl, clientName: opts.name, port: opts.port, openBrowser: opts.browser });

      const client = new DayAIClient({ quiet: true, baseUrl, ...result });
      const ws = await workspaceOf(client);
      const now = new Date().toISOString();
      const profile: Profile = {
        baseUrl,
        ...result,
        ...(ws.ok ? ws.ws : {}),
        createdAt: now,
        updatedAt: now,
      };
      saveProfile(name, profile, !!opts.default);

      const isDefault = readCredentials().defaultProfile === name;
      info(
        `\nLogged in${ws.ok && ws.ws.workspaceName ? ` to ${ws.ws.workspaceName}` : ""} as profile "${name}"${isDefault ? " (default)" : ""}.` +
          (ws.ok ? "" : `\nCouldn't read the workspace yet (${ws.error}); \`day-ai status\` will retry.`) +
          `\nCredentials: ${CREDENTIALS_FILE}\nTry: day-ai tools`
      );
    });

  program
    .command("logout")
    .description("Delete a profile's saved credentials (doesn't revoke the authorization in Day AI)")
    .addOption(profileOption())
    .option("--all", "delete every profile")
    .action((opts: { profile?: string; all?: boolean }) => {
      if (opts.all) {
        const names = Object.keys(readCredentials().profiles);
        writeCredentials({ version: 1, profiles: {} });
        info(names.length ? `Removed ${names.length} profile(s): ${names.join(", ")}.` : "No profiles to remove.");
        return;
      }
      const name = profileName(opts.profile);
      info(removeProfile(name) ? `Removed profile "${name}".` : `No profile named "${name}".`);
    });

  program
    .command("status")
    .alias("whoami")
    .description("Which credentials this command would use, and whether they work")
    .addOption(profileOption())
    .option("--no-network", "don't contact Day AI")
    .option("--json", "machine-readable output")
    .action(async (opts: { profile?: string; network: boolean; json?: boolean }) => {
      const { client, source } = clientFor(opts.profile);
      const p = source.kind === "profile" ? source.profile : undefined;
      const out: Record<string, unknown> = {
        source: describeSource(source),
        profile: source.kind === "profile" ? source.name : null,
        baseUrl: p?.baseUrl ?? (source.kind === "env" ? source.baseUrl : undefined),
        mcpUrl: client.mcpUrl,
        clientId: p?.clientId ?? (source.kind === "env" ? source.clientId : undefined),
        workspace: p?.workspaceName ?? null,
        accessToken: expiresIn(p?.accessTokenExpiresAt),
      };

      if (opts.network) {
        const ws = await workspaceOf(client);
        out.connection = ws.ok ? "ok" : `failed: ${ws.error}`;
        if (ws.ok) {
          out.workspace = ws.ws.workspaceName ?? out.workspace;
          out.workspaceId = ws.ws.workspaceId;
          out.userId = ws.ws.userId;
          if (source.kind === "profile") updateProfile(source.name, ws.ws);
          const tools = await client.mcpListTools();
          out.tools = tools.success ? tools.data!.tools.length : `failed: ${tools.error}`;
        }
      }

      if (opts.json) return json(out);
      printTable(Object.entries(out).map(([k, v]) => ({ field: k, value: v === null || v === undefined ? "—" : String(v) })));
      if (out.connection && out.connection !== "ok") process.exitCode = 1;
    });

  program
    .command("token")
    .description("Print a valid access token (refreshing if needed) for curl or another MCP client")
    .addOption(profileOption())
    .option("--json", "also print the MCP URL and expiry")
    .action(async (opts: { profile?: string; json?: boolean }) => {
      const { client } = clientFor(opts.profile);
      const accessToken = await client.getAccessToken();
      if (!opts.json) return console.log(accessToken);
      const p = (() => {
        try {
          return readCredentials().profiles[profileName(opts.profile)];
        } catch {
          return undefined;
        }
      })();
      json({ accessToken, mcpUrl: client.mcpUrl, expiresAt: p?.accessTokenExpiresAt ? new Date(p.accessTokenExpiresAt * 1000).toISOString() : null });
    });

  program
    .command("profiles")
    .description("List saved profiles")
    .option("--json", "machine-readable output")
    .action((opts: { json?: boolean }) => {
      const data = readCredentials();
      const rows = Object.entries(data.profiles).map(([name, p]) => ({
        profile: name === data.defaultProfile ? `${name} *` : name,
        workspace: p.workspaceName ?? "—",
        "base url": p.baseUrl,
        "logged in": p.createdAt.slice(0, 10),
      }));
      if (opts.json) return json({ defaultProfile: data.defaultProfile ?? null, profiles: Object.keys(data.profiles) });
      printTable(rows, { empty: "No profiles. Run `day-ai login`." });
      if (rows.length) info("\n* default. Switch with `day-ai use <profile>`.");
    });

  program
    .command("use <profile>")
    .description("Set the default profile")
    .action((name: string) => {
      const data = readCredentials();
      if (!data.profiles[name]) {
        throw new Error(`No profile named "${name}". Profiles: ${Object.keys(data.profiles).join(", ") || "none"}.`);
      }
      data.defaultProfile = name;
      writeCredentials(data);
      info(`Default profile is now "${name}".`);
    });

}
