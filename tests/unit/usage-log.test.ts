/**
 * Usage log + User-Agent: one `tool_call` line per tool call, through the
 * real server, and a named User-Agent on every API request.
 *
 * @group unit
 */

import { createHash } from 'crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server';
import logger from '../../src/logger';
import { cleanField, clientLabel, keyFingerprint } from '../../src/usage-log';

// version.ts reads import.meta, which this Jest setup cannot load.
jest.mock('../../src/version', () => ({
  VERSION: '0.0.0-test',
  VERSION_INFO: { version: '0.0.0-test' },
  PACKAGE_NAME: 'test',
  BUILD_TIME: '',
  GIT_COMMIT: '',
  GIT_REF: '',
  COMMITS_AHEAD: 0,
  getDisplayVersion: () => '0.0.0-test',
  isDevBuild: () => false,
}));

jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const API = 'https://api.test.invalid/api/v1';
const ID = '11111111-1111-4111-8111-111111111111';
const CRED = 'test-api-key';

function toolCallLines(): Record<string, unknown>[] {
  return (logger.info as jest.Mock).mock.calls
    .map((c) => String(c[0]))
    .filter((m) => m.startsWith('tool_call '))
    .map((m) => JSON.parse(m.slice('tool_call '.length)));
}

describe('usage-log helpers', () => {
  it('fingerprints a key as 12 hex of its SHA-256, never the key', () => {
    const fp = keyFingerprint(CRED)!;
    expect(fp).toBe(createHash('sha256').update(CRED).digest('hex').slice(0, 12));
    expect(fp).not.toContain(CRED);
    expect(keyFingerprint(undefined)).toBeUndefined();
  });

  it('caps client-supplied strings and drops control characters', () => {
    expect(cleanField('a\nb\u0000c')).toBe('a?b?c');
    expect(cleanField('x'.repeat(200))).toHaveLength(80);
    expect(clientLabel({ name: 'claude-ai', version: '0.1.0' })).toBe('claude-ai/0.1.0');
    expect(clientLabel(undefined)).toBeUndefined();
  });
});

describe('tool_call lines through the server', () => {
  let client: Client;
  let server: ReturnType<typeof createServer>;
  let status: number;
  let userAgents: (string | undefined)[];
  const realFetch = global.fetch;
  const realEnv = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;

  beforeAll(async () => {
    process.env.DIGITAL_SAMBA_DEVELOPER_KEY = CRED;
    server = createServer({ apiKey: CRED, apiUrl: API });
    client = new Client({ name: 'usage-test', version: '1.2.3' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
    global.fetch = realFetch;
    if (realEnv === undefined) delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
    else process.env.DIGITAL_SAMBA_DEVELOPER_KEY = realEnv;
  });

  beforeEach(() => {
    (logger.info as jest.Mock).mockClear();
    status = 200;
    userAgents = [];
    global.fetch = jest.fn(async (_input: any, init?: any) => {
      const h = init?.headers;
      userAgents.push(h instanceof Headers ? h.get('user-agent') ?? undefined : h?.['User-Agent']);
      const body = JSON.stringify(
        status === 200 ? { data: [], total_count: 0 } : { message: 'Too Many Attempts.' },
      );
      return {
        ok: status < 400,
        status,
        statusText: status === 200 ? 'OK' : 'Too Many Requests',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => body,
        json: async () => JSON.parse(body),
      } as any;
    }) as any;
  });

  it('logs ok with tool, timing, fingerprint and client; sends the User-Agent', async () => {
    await client.callTool({ name: 'list-rooms', arguments: {} });
    const lines = toolCallLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      tool: 'list-rooms',
      outcome: 'ok',
      caller: keyFingerprint(CRED),
      client: 'usage-test/1.2.3',
    });
    expect(typeof lines[0].ms).toBe('number');
    expect(JSON.stringify(lines[0])).not.toContain(CRED);
    expect(userAgents.length).toBeGreaterThan(0);
    expect(userAgents.every((ua) => ua === 'ds-mcp-server/0.0.0-test')).toBe(true);
  });

  it('logs invalid_params when a required argument is missing', async () => {
    await expect(
      client.callTool({ name: 'get-room-details', arguments: {} }),
    ).rejects.toThrow();
    expect(toolCallLines()).toEqual([
      expect.objectContaining({ tool: 'get-room-details', outcome: 'invalid_params' }),
    ]);
  });

  it('logs a failed API call as an error, with the status when it reaches the server', async () => {
    status = 429;
    await client
      .callTool({ name: 'get-room-details', arguments: { room_id: ID } })
      .catch(() => undefined);
    const [line] = toolCallLines();
    expect(['tool_error', 'error']).toContain(line.outcome);
    if (line.outcome === 'error') expect(line.status).toBe(429);
  });

  it('never logs tool arguments', async () => {
    await client.callTool({
      name: 'list-rooms',
      arguments: { limit: 7, offset: 3 },
    });
    const [line] = toolCallLines();
    expect(Object.keys(line).sort()).toEqual(
      ['caller', 'client', 'ms', 'outcome', 'tool'].sort(),
    );
  });
});
