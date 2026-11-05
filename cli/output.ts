/** Shared print helpers (same shapes as day-ops src/lib/output.ts). Results go to stdout, progress to stderr. */

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Record<string, string>[], opts: { empty?: string; maxWidth?: number } = {}): void {
  if (rows.length === 0) {
    console.log(opts.empty ?? "(no results)");
    return;
  }
  const max = opts.maxWidth ?? Infinity;
  const clip = (s: string) => (s.length > max ? s.slice(0, max - 1) + "…" : s);
  const cols = Object.keys(rows[0]);
  const widths: Record<string, number> = {};
  for (const c of cols) {
    widths[c] = Math.max(c.length, ...rows.map((r) => clip(r[c] ?? "").length));
  }
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
  const line = (cells: string[]) => cells.join("  ").trimEnd();
  console.log(line(cols.map((c) => pad(c, widths[c]))));
  console.log(line(cols.map((c) => "-".repeat(widths[c]))));
  for (const r of rows) {
    console.log(line(cols.map((c) => pad(clip(r[c] ?? ""), widths[c]))));
  }
}

/** Progress and notices: stderr, so `day-ai call … | jq` stays clean. */
export function info(message: string): void {
  console.error(message);
}

/**
 * The write guard (day-ops `guard`): without --yes, print what would happen
 * and exit 0 without doing it.
 */
export function guard(yes: boolean | undefined, what: string, wouldDo: string[] = []): void {
  if (yes) return;
  console.error(`Dry run: ${what} needs --yes.`);
  for (const l of wouldDo) console.error(`  ${l}`);
  console.error("Re-run with --yes to do it for real.");
  process.exit(0);
}

/** First sentence of a tool description, for tables. */
export function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  const m = flat.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : flat;
}
