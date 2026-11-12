/**
 * Credential and profile resolution for every day-ai command.
 *
 * Credentials live in one file, written by `day-ai login`:
 *   ~/.config/day-ai/credentials.json   (dir 700, file 600; DAY_AI_CONFIG_DIR overrides the dir)
 *
 * It holds named profiles, one per authorization (a workspace + assistant pair),
 * plus which profile is the default. The cached access token is stored next to
 * the refresh token so most commands skip the refresh round trip, and a rotated
 * refresh token is written back the moment the server issues it.
 *
 * Profile resolution, first hit wins:
 *   1. --profile <name>
 *   2. DAY_AI_PROFILE
 *   3. the file's defaultProfile (set by the first login, changed by `day-ai use`)
 *
 * When no profile exists at all, CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN from
 * the shell (or a .env in the current directory) are used instead, so CI and the
 * older `yarn oauth:setup` flow keep working. Nothing is ever printed that would
 * reveal a secret.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DayAIClient } from "../src/client";
import { SDK_VERSION } from "../src/version";

/** Repo root: this file is cli/config.ts in source and dist/cli/config.js when built. */
export const ROOT = path.resolve(__dirname, __dirname.includes(`${path.sep}dist${path.sep}`) ? "../.." : "..");

export const VERSION: string = SDK_VERSION;

export const CONFIG_DIR = process.env.DAY_AI_CONFIG_DIR || path.join(os.homedir(), ".config", "day-ai");
export const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");
export const DEFAULT_BASE_URL = "https://day.ai";

export interface Profile {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  /** Epoch seconds. */
  accessTokenExpiresAt?: number;
  workspaceName?: string;
  workspaceId?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialsFile {
  version: 1;
  defaultProfile?: string;
  profiles: Record<string, Profile>;
}

export function readCredentials(): CredentialsFile {
  if (!fs.existsSync(CREDENTIALS_FILE)) return { version: 1, profiles: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8")) as CredentialsFile;
    return { version: 1, defaultProfile: parsed.defaultProfile, profiles: parsed.profiles ?? {} };
  } catch (e) {
    throw new Error(`${CREDENTIALS_FILE} is not valid JSON (${(e as Error).message}). Fix it or delete it and run \`day-ai login\`.`);
  }
}

/** Atomic write (temp file + rename) so two commands refreshing at once can't truncate the file. */
export function writeCredentials(data: CredentialsFile): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${CREDENTIALS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(tmp, CREDENTIALS_FILE);
}

/** Read-modify-write one profile. */
export function updateProfile(name: string, patch: Partial<Profile>): void {
  const data = readCredentials();
  const existing = data.profiles[name];
  if (!existing) return;
  data.profiles[name] = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  writeCredentials(data);
}

export function saveProfile(name: string, profile: Profile, makeDefault: boolean): void {
  const data = readCredentials();
  data.profiles[name] = profile;
  if (makeDefault || !data.defaultProfile || !data.profiles[data.defaultProfile]) data.defaultProfile = name;
  writeCredentials(data);
}

export function removeProfile(name: string): boolean {
  const data = readCredentials();
  if (!data.profiles[name]) return false;
  delete data.profiles[name];
  if (data.defaultProfile === name) data.defaultProfile = Object.keys(data.profiles)[0];
  writeCredentials(data);
  return true;
}

/** The profile name a command should use, before checking it exists. */
export function profileName(flag?: string): string {
  return flag || process.env.DAY_AI_PROFILE || readCredentials().defaultProfile || "default";
}

export type CredentialSource =
  | { kind: "profile"; name: string; profile: Profile }
  | { kind: "env"; baseUrl: string; clientId: string; clientSecret: string; refreshToken: string };

/** Load a `.env` from the current directory without overriding the shell (dotenv semantics). */
function loadCwdDotenv(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config({ quiet: true });
}

/**
 * Where credentials come from for this invocation. A named profile wins; the
 * environment is the fallback only when no profile was asked for explicitly.
 */
export function resolveCredentials(flag?: string): CredentialSource {
  const data = readCredentials();
  const explicit = flag || process.env.DAY_AI_PROFILE;
  const name = explicit || data.defaultProfile || "default";
  const profile = data.profiles[name];
  if (profile) return { kind: "profile", name, profile };

  if (!explicit) {
    loadCwdDotenv();
    const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
    if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
      return {
        kind: "env",
        baseUrl: process.env.DAY_AI_BASE_URL || DEFAULT_BASE_URL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
      };
    }
  }

  const known = Object.keys(data.profiles);
  throw new Error(
    explicit && known.length
      ? `No profile named "${name}". Profiles: ${known.join(", ")}. Run \`day-ai login --profile ${name}\` to add it.`
      : "Not logged in. Run `day-ai login` (opens your browser; no environment variables needed)."
  );
}

export function describeSource(src: CredentialSource): string {
  return src.kind === "profile" ? `profile "${src.name}" (${CREDENTIALS_FILE})` : "environment (CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN)";
}

/**
 * A DayAIClient for this invocation: quiet (stdout is for results), seeded with
 * the cached access token, and persisting every refresh back to the profile.
 */
export function clientFor(flag?: string): { client: DayAIClient; source: CredentialSource } {
  const source = resolveCredentials(flag);
  const common = { quiet: true, clientInfo: { name: "day-ai CLI", version: VERSION } };

  if (source.kind === "env") {
    return { client: new DayAIClient({ ...common, ...source }), source };
  }

  const p = source.profile;
  const client = new DayAIClient({
    ...common,
    baseUrl: p.baseUrl,
    clientId: p.clientId,
    clientSecret: p.clientSecret,
    refreshToken: p.refreshToken,
    accessToken: p.accessToken,
    accessTokenExpiresAt: p.accessTokenExpiresAt,
    onTokenRefresh: (t) =>
      updateProfile(source.name, {
        accessToken: t.accessToken,
        accessTokenExpiresAt: t.accessTokenExpiresAt,
        refreshToken: t.refreshToken,
      }),
  });
  return { client, source };
}

/** Owner-only permission check for doctor. Returns null when the file is fine. */
export function permissionProblem(file: string, want: number): string | null {
  if (!fs.existsSync(file) || process.platform === "win32") return null;
  const mode = fs.statSync(file).mode & 0o777;
  return mode & ~want ? `mode ${mode.toString(8)}, expected ${want.toString(8)} (chmod ${want.toString(8)} ${file})` : null;
}
