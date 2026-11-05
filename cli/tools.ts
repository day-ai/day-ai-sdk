/**
 * `day-ai tools | describe | call` — any Day AI MCP tool from the terminal.
 *
 *   day-ai tools [filter]                         what this profile's assistant can call
 *   day-ai describe <tool>                        its inputs, from the live schema
 *   day-ai call <tool> '{"key": "value"}'         call it; JSON result on stdout
 *   day-ai call <tool> -a key=value -a n:=5       httpie-style args (= string, := raw JSON)
 *   day-ai call <tool> -f args.json | -           args from a file or stdin
 *
 * The tool list comes from the server on every call (`tools/list` is the source
 * of truth; it differs by assistant plan). Tools the server doesn't mark
 * read-only change workspace data, so they're a dry run until --yes, the same
 * guard day-ops uses for anything that sends or writes.
 */
import { Command, Option } from "commander";
import * as fs from "node:fs";
import type { DayAIClient, McpTool } from "../src/client";
import { clientFor } from "./config";
import { firstSentence, guard, info, json, printTable } from "./output";

const profileOption = () => new Option("-p, --profile <name>", "credentials profile (default: DAY_AI_PROFILE, then the default profile)");

async function listTools(client: DayAIClient): Promise<McpTool[]> {
  const res = await client.mcpListTools();
  if (!res.success) throw new Error(`Couldn't list tools: ${res.error}`);
  return res.data!.tools;
}

function access(t: McpTool): string {
  if (t.annotations?.readOnlyHint) return "read-only";
  return t.annotations?.destructiveHint ? "writes · destructive" : "writes";
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Closest tool names, for "did you mean": shared words first, then edit distance. */
function suggest(name: string, tools: McpTool[]): string[] {
  const q = name.toLowerCase();
  const parts = q.split(/[_\s-]+/).filter(Boolean);
  return tools
    .map((t) => ({ t: t.name, words: parts.filter((p) => t.name.includes(p)).length, dist: editDistance(q, t.name) }))
    .filter((x) => x.words > 0 || x.dist <= Math.max(2, Math.floor(q.length / 3)))
    .sort((a, b) => a.dist - b.dist || b.words - a.words)
    .slice(0, 3)
    .map((x) => x.t);
}

function findTool(name: string, tools: McpTool[]): McpTool {
  const t = tools.find((x) => x.name === name);
  if (t) return t;
  const close = suggest(name, tools);
  throw new Error(
    `No tool "${name}" for this assistant.` +
      (close.length ? ` Did you mean: ${close.join(", ")}?` : "") +
      " `day-ai tools` lists them; availability depends on the assistant's plan."
  );
}

function typeOf(schema: any): string {
  if (!schema) return "any";
  if (schema.enum) return schema.enum.map((v: unknown) => JSON.stringify(v)).join(" | ");
  if (schema.anyOf || schema.oneOf) return (schema.anyOf ?? schema.oneOf).map(typeOf).join(" | ");
  if (schema.type === "array") return `${typeOf(schema.items)}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  return schema.type ?? "object";
}

// ─── argument parsing ────────────────────────────────────────────────────────

function readStdin(): string {
  return fs.readFileSync(0, "utf-8");
}

function parseJsonArgs(text: string, from: string): Record<string, any> {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch (e) {
    throw new Error(`Arguments from ${from} aren't valid JSON: ${(e as Error).message}`);
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`Arguments from ${from} must be a JSON object`);
  return v as Record<string, any>;
}

/** `key=value` → string, `key:=json` → parsed JSON (numbers, booleans, arrays, objects). */
function parsePair(pair: string): [string, unknown] {
  const raw = pair.match(/^([^=:]+):=(.*)$/s);
  if (raw) {
    try {
      return [raw[1], JSON.parse(raw[2])];
    } catch (e) {
      throw new Error(`-a ${pair}: the value after := must be JSON (${(e as Error).message})`);
    }
  }
  const str = pair.match(/^([^=]+)=(.*)$/s);
  if (!str) throw new Error(`-a ${pair}: expected key=value (string) or key:=json`);
  return [str[1], str[2]];
}

const collect = (v: string, prev: string[] = []) => [...prev, v];

export function buildArgs(inline: string | undefined, file: string | undefined, pairs: string[] = []): Record<string, any> {
  let args: Record<string, any> = {};
  if (inline !== undefined && file !== undefined) throw new Error("Pass arguments inline or with --file, not both");
  if (inline === "-" || file === "-") args = parseJsonArgs(readStdin(), "stdin");
  else if (file !== undefined) args = parseJsonArgs(fs.readFileSync(file, "utf-8"), file);
  else if (inline !== undefined) args = parseJsonArgs(inline, "the command line");
  for (const p of pairs) {
    const [k, v] = parsePair(p);
    args[k] = v;
  }
  return args;
}

// ─── commands ────────────────────────────────────────────────────────────────

export function registerTools(program: Command): void {
  program
    .command("tools [filter]")
    .description("List the tools this profile's assistant can call (filter matches name or description)")
    .addOption(profileOption())
    .option("--read-only", "only tools that don't change data")
    .option("--writes", "only tools that change data")
    .option("--names", "names only, one per line")
    .option("--json", "the full tool list with input schemas")
    .action(async (filter: string | undefined, opts: { profile?: string; readOnly?: boolean; writes?: boolean; names?: boolean; json?: boolean }) => {
      const { client } = clientFor(opts.profile);
      let tools = await listTools(client);
      if (filter) {
        const f = filter.toLowerCase();
        tools = tools.filter((t) => t.name.includes(f) || (t.description ?? "").toLowerCase().includes(f));
      }
      if (opts.readOnly) tools = tools.filter((t) => t.annotations?.readOnlyHint);
      if (opts.writes) tools = tools.filter((t) => !t.annotations?.readOnlyHint);
      tools.sort((a, b) => a.name.localeCompare(b.name));

      if (opts.json) return json(tools);
      if (opts.names) return tools.forEach((t) => console.log(t.name));
      printTable(
        tools.map((t) => ({ tool: t.name, access: access(t), description: firstSentence(t.description) })),
        { empty: filter ? `No tools match "${filter}".` : "No tools.", maxWidth: 100 }
      );
      info(`\n${tools.length} tool(s). Inputs: day-ai describe <tool>. Call: day-ai call <tool> '{…}'`);
    });

  program
    .command("describe <tool>")
    .description("Show a tool's description and inputs from the live schema")
    .addOption(profileOption())
    .option("--json", "the raw tool definition")
    .action(async (name: string, opts: { profile?: string; json?: boolean }) => {
      const { client } = clientFor(opts.profile);
      const t = findTool(name, await listTools(client));
      if (opts.json) return json(t);

      console.log(`${t.name}  (${access(t)})\n`);
      if (t.description) console.log(`${t.description.trim()}\n`);
      const props = t.inputSchema?.properties ?? {};
      const required = new Set(t.inputSchema?.required ?? []);
      printTable(
        Object.entries(props).map(([k, s]: [string, any]) => ({
          parameter: k,
          type: typeOf(s),
          required: required.has(k) ? "yes" : "",
          description: firstSentence(s?.description),
        })),
        { empty: "(no parameters)", maxWidth: 90 }
      );
      const example = Object.fromEntries([...required].map((k) => [k, `<${typeOf(props[k])}>`]));
      console.log(`\nday-ai call ${t.name} '${JSON.stringify(example)}'${t.annotations?.readOnlyHint ? "" : " --yes"}`);
    });

  program
    .command("call <tool> [args]")
    .description("Call any tool. args is a JSON object, or - for stdin. Tools that change data need --yes")
    .addOption(profileOption())
    .option("-f, --file <path>", "read the JSON arguments from a file (- for stdin)")
    .option("-a, --arg <key=value>", "set one argument; repeatable. key=value is a string, key:=json is raw JSON", collect)
    .option("-y, --yes", "actually run a tool that changes data (otherwise a dry run)")
    .option("--dry-run", "print the request and send nothing, even for read-only tools")
    .option("--raw", "print the tool's text output as-is instead of pretty JSON")
    .addHelpText(
      "after",
      `
Examples:
  day-ai call search_objects '{"queries":[{"objectType":"native_organization","where":{"propertyId":"domain","operator":"eq","value":"acme.com"}}]}'
  day-ai call read_page -a objectId=<page objectId>
  day-ai call update_page -a objectId=<id> -a insertContentHtml='<p>New entry</p>' -a insertPosition=page_end --yes
  cat args.json | day-ai call create_page - --yes
  day-ai call search_objects -f query.json | jq '.native_contact.results[].email'`
    )
    .action(async (name: string, inline: string | undefined, opts: { profile?: string; file?: string; arg?: string[]; yes?: boolean; dryRun?: boolean; raw?: boolean }) => {
      const args = buildArgs(inline, opts.file, opts.arg);
      const { client } = clientFor(opts.profile);
      const tool = findTool(name, await listTools(client));

      const missing = (tool.inputSchema?.required ?? []).filter((k) => !(k in args));
      if (missing.length) {
        throw new Error(`${name} needs: ${missing.join(", ")}. See \`day-ai describe ${name}\`.`);
      }

      const request = [`tool: ${name} (${access(tool)})`, `args: ${JSON.stringify(args)}`];
      if (opts.dryRun) {
        info("Dry run (--dry-run): nothing sent.");
        request.forEach((l) => info(`  ${l}`));
        return;
      }
      if (!tool.annotations?.readOnlyHint) guard(opts.yes, `${name} changes workspace data and`, request);

      const res = await client.mcpCallTool(name, args);
      if (!res.success) throw new Error(res.error ?? "Tool call failed");

      const text = (res.data?.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      if (res.data?.isError) {
        console.error(text || `${name} returned an error with no message`);
        process.exitCode = 1;
        return;
      }
      if (opts.raw) return console.log(text);
      try {
        json(JSON.parse(text));
      } catch {
        console.log(text);
      }
    });
}
