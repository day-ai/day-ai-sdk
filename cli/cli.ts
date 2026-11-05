#!/usr/bin/env node
/**
 * day-ai — the Day AI platform from your terminal.
 *
 *   day-ai login                     sign in through the browser (no .env)
 *   day-ai tools                     what your assistant can call
 *   day-ai call <tool> '{…}'         call any tool; JSON on stdout
 *   day-ai --help                    everything else
 *
 * Install: `yarn setup` in the repo root (install, build, npm link, doctor).
 * Same layout as day-ops: one register<Group>() per module, credentials in
 * ~/.config/day-ai, results on stdout and progress on stderr, and anything that
 * changes workspace data is a dry run until --yes.
 */
import { Command } from "commander";
import { VERSION } from "./config";
import { registerAuth } from "./auth";
import { registerTools } from "./tools";
import { registerDoctor } from "./doctor";

const program = new Command();

program
  .name("day-ai")
  .description(
    "The Day AI platform from your terminal: sign in once, then list and call any Day AI MCP tool.\n" +
      "Tools that change workspace data are a dry run until --yes."
  )
  .version(VERSION)
  .showHelpAfterError()
  .configureHelp({ sortSubcommands: true })
  .addHelpText(
    "after",
    `
Getting started:
  day-ai login                                   # opens your browser
  day-ai tools                                   # list tools
  day-ai describe search_objects                 # a tool's inputs
  day-ai call search_objects -f query.json       # call it

Docs: TOOLS.md (every tool) and SCHEMA.md (data model) in the day-ai-sdk repo.`
  );

registerAuth(program);
registerTools(program);
registerDoctor(program);

program.parseAsync(process.argv).catch((e: Error) => {
  console.error("Error:", e.message);
  process.exit(1);
});
