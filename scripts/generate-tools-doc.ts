#!/usr/bin/env node
/**
 * Regenerates TOOLS.md from the live Day AI MCP server.
 *
 *   yarn docs:tools
 *
 * The tool list reflects what the authorized agent can see, which depends on
 * the workspace's plan. Run it with credentials for an agent on the highest
 * plan you want to document.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DayAIClient } from '../src';
import type { McpTool } from '../src/client';

// Comma-separated tool names to leave out of TOOLS.md, e.g. DOCS_EXCLUDE_TOOLS=foo,bar
const HIDDEN_TOOLS = new Set(
  (process.env.DOCS_EXCLUDE_TOOLS ?? '').split(',').map((name) => name.trim()).filter(Boolean)
);

// Tools not listed here land in "Other", so new tools still show up.
const CATEGORIES: Array<[string, string[]]> = [
  ['Search & schema', ['search_objects', 'read_crm_schema', 'read_object_history', 'read_property_history', 'resolve_dates', 'whoami', 'get_share_url']],
  ['People & companies', ['create_or_update_person_organization', 'batch_create_or_update_people_organizations', 'enrich_people', 'create_or_update_relationship']],
  ['Opportunities & pipeline', ['create_or_update_opportunity', 'batch_create_or_update_opportunities', 'migrate_opportunity']],
  ['Tasks', ['create_or_update_action']],
  ['Meetings', ['get_meeting_recording_context', 'get_context_for_meeting_recording_citations', 'create_meeting_recording_clip', 'create_meeting_comment', 'read_meeting_comments', 'update_meeting_comment']],
  ['Pages & notes', ['create_page', 'read_page', 'update_page', 'attach_page_image', 'get_page_image_upload_url', 'create_page_comment', 'read_page_comments', 'update_page_comment', 'create_or_update_workspace_context']],
  ['Email', ['create_email_draft', 'open_email_sharing_rules']],
  ['Campaigns', ['list_campaigns', 'get_campaign_details', 'get_campaign_members_due_to_draft', 'get_campaign_drafts_in_flight', 'get_campaign_draft_reasoning', 'get_campaign_import_result', 'draft_campaign_outreach', 'refine_campaign_drafting', 'regenerate_campaign_drafts', 'manage_campaign_member_statuses', 'update_campaign_member', 'remove_campaign_member']],
  ['Views, charts & lists', ['create_view', 'update_view', 'create_chart', 'create_widget', 'create_table_widget', 'create_or_update_list']],
  ['Folders & files', ['create_or_update_folder', 'move_to_folder', 'read_folder', 'read_file', 'read_csv_file', 'analyze_csv', 'transform_csv', 'export_to_sandbox', 'upload_file_to_sandbox']],
  ['Imports', ['validate_import_file', 'create_import_from_file', 'save_import_mapping', 'start_import', 'get_import_progress', 'get_import_errors', 'get_import_members', 'get_imports_by_object_type']],
  ['Custom properties', ['create_or_update_custom_property', 'backfill_custom_property']],
  ['Skills & delegation', ['activate_skill', 'deactivate_skill', 'manage_skills', 'respond_to_delegation', 'cancel_delegation']],
  ['Workspace & settings', ['assistant_settings', 'manage_workspace_instructions', 'manage_workspace_members', 'connect_slack']],
];

function anchor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function firstSentence(text: string | undefined, max = 160): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  const match = flat.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match ? match[1] : flat;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function typeOf(schema: any): string {
  if (!schema) return 'any';
  if (schema.enum) return schema.enum.map((v: unknown) => `\`${JSON.stringify(v)}\``).join(' \\| ');
  if (schema.anyOf || schema.oneOf) {
    return (schema.anyOf || schema.oneOf).map(typeOf).filter((t: string) => t !== 'null').join(' \\| ');
  }
  if (schema.type === 'array') return `${typeOf(schema.items)}[]`;
  if (Array.isArray(schema.type)) return schema.type.filter((t: string) => t !== 'null').join(' \\| ');
  return schema.type || 'object';
}

function hints(tool: McpTool): string {
  const a = tool.annotations || {};
  if (a.readOnlyHint) return 'read-only';
  if (a.destructiveHint) return 'writes · can overwrite';
  return 'writes';
}

function renderTool(tool: McpTool): string {
  const lines: string[] = [`### ${tool.name}`, ''];
  lines.push(`*${hints(tool)}* — ${firstSentence(tool.description, 400)}`, '');

  const props: Record<string, any> = tool.inputSchema?.properties || {};
  const required = new Set<string>(tool.inputSchema?.required || []);
  const names = Object.keys(props);
  if (names.length > 0) {
    lines.push('| Parameter | Type | Required | Description |', '|---|---|---|---|');
    for (const name of names) {
      const p = props[name];
      lines.push(`| \`${name}\` | ${cell(typeOf(p))} | ${required.has(name) ? 'yes' : ''} | ${cell(firstSentence(p.description))} |`);
    }
    lines.push('');
  } else {
    lines.push('No parameters.', '');
  }

  if (tool.description && tool.description.length > 400) {
    lines.push('<details><summary>Full description</summary>', '', tool.description.trim(), '', '</details>', '');
  }
  return lines.join('\n');
}

async function main() {
  const client = new DayAIClient();
  const init = await client.mcpInitialize();
  const result = await client.mcpListTools();
  if (!result.success || !result.data) {
    throw new Error(`tools/list failed: ${result.error}`);
  }

  const tools = result.data.tools
    .filter((t) => !HIDDEN_TOOLS.has(t.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const byName = new Map(tools.map((t) => [t.name, t]));
  const placed = new Set<string>();
  const groups: Array<[string, McpTool[]]> = [];

  for (const [title, names] of CATEGORIES) {
    const members = names.filter((n) => byName.has(n)).map((n) => byName.get(n)!);
    members.forEach((t) => placed.add(t.name));
    if (members.length) groups.push([title, members]);
  }
  const other = tools.filter((t) => !placed.has(t.name));
  if (other.length) groups.push(['Other', other]);

  const protocol = (init.data as any)?.protocolVersion ?? 'unknown';
  const tier = await client
    .mcpCallTool('whoami', {})
    .then((r) => JSON.parse(r.data?.content[0]?.text ?? '{}').assistant?.tierName as string | undefined)
    .catch(() => undefined);
  const today = new Date().toISOString().slice(0, 10);

  const out: string[] = [
    '# Day AI MCP Tools',
    '',
    `<!-- Generated by \`yarn docs:tools\` (scripts/generate-tools-doc.ts). Do not edit by hand. -->`,
    '',
    `Generated ${today} from \`https://day.ai/api/mcp\` (MCP protocol ${protocol}) for an agent on the **${tier ?? 'unknown'}** plan. ${tools.length} tools.`,
    '',
    'Which tools an integration sees depends on the Day AI plan of the workspace and the agent chosen when authorizing — see [Plans and tool access](README.md#plans-and-tool-access). Your MCP client always gets the authoritative list from `tools/list`.',
    '',
    'For the data model, objectIds and `search_objects` query syntax, see [SCHEMA.md](SCHEMA.md).',
    '',
    '## Summary',
    '',
  ];

  for (const [title, members] of groups) {
    out.push(`**${title}**`, '', '| Tool | Kind | What it does |', '|---|---|---|');
    for (const t of members) {
      out.push(`| [\`${t.name}\`](#${anchor(t.name)}) | ${hints(t)} | ${cell(firstSentence(t.description, 120))} |`);
    }
    out.push('');
  }

  for (const [title, members] of groups) {
    out.push(`## ${title}`, '');
    for (const t of members) out.push(renderTool(t));
  }

  const target = path.resolve(__dirname, '..', '..', 'TOOLS.md');
  fs.writeFileSync(target, `${out.join('\n').trimEnd()}\n`);
  console.log(`Wrote ${tools.length} tools to ${target}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
