#!/usr/bin/env node

/**
 * Checks that the SDK can read a JSON-RPC response in either wire format.
 *
 * The Day AI MCP endpoint returns plain JSON today, because this SDK sends no
 * `Accept` header. It returns Server-Sent Events to any client that advertises
 * `text/event-stream`, which the MCP spec requires clients to do. These
 * assertions exist so that adding that header later cannot silently break
 * every tool call.
 *
 * Run with `yarn verify:parsing`. No test framework or network access needed.
 */

import * as assert from 'assert';

import { parseJsonRpcBody } from '../src/client';

const JSON_CT = 'application/json';
const SSE_CT = 'text/event-stream';

const checks: Array<[string, () => void]> = [
  [
    'reads a plain JSON body',
    () => {
      const body = JSON.stringify({ jsonrpc: '2.0', id: 7, result: { ok: 1 } });
      assert.deepStrictEqual(parseJsonRpcBody(JSON_CT, body, 7).result, {
        ok: 1,
      });
    },
  ],
  [
    'reads a single SSE message',
    () => {
      const body = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        result: { ok: 1 },
      })}\n\n`;
      assert.deepStrictEqual(parseJsonRpcBody(SSE_CT, body, 7).result, {
        ok: 1,
      });
    },
  ],
  [
    'discards keepalive comments emitted during a slow call',
    () => {
      const body = [
        ': keepalive',
        '',
        ': keepalive',
        '',
        `event: message\ndata: ${JSON.stringify({
          jsonrpc: '2.0',
          id: 7,
          result: { ok: 1 },
        })}`,
        '',
      ].join('\n');
      assert.deepStrictEqual(parseJsonRpcBody(SSE_CT, body, 7).result, {
        ok: 1,
      });
    },
  ],
  [
    'picks the message answering this request when several arrive',
    () => {
      const frame = (payload: unknown) =>
        `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
      const body =
        frame({ jsonrpc: '2.0', id: null, method: 'notifications/progress' }) +
        frame({ jsonrpc: '2.0', id: 7, result: { ok: 1 } });
      assert.deepStrictEqual(parseJsonRpcBody(SSE_CT, body, 7).result, {
        ok: 1,
      });
    },
  ],
  [
    'surfaces a JSON-RPC error delivered over the stream',
    () => {
      const body = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        error: { code: -32603, message: 'Internal error' },
      })}\n\n`;
      assert.strictEqual(parseJsonRpcBody(SSE_CT, body, 7).error?.code, -32603);
    },
  ],
  [
    'throws when a stream closes carrying only keepalives',
    () => {
      assert.throws(
        () => parseJsonRpcBody(SSE_CT, ': keepalive\n\n: keepalive\n\n', 7),
        /without a JSON-RPC message/
      );
    },
  ],
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error instanceof Error ? error.message : error}`);
  }
}

console.log(
  `\n${checks.length - failed}/${checks.length} passed${failed ? '' : ' — SSE and JSON bodies both read correctly'}`
);
process.exit(failed === 0 ? 0 : 1);
