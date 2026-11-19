/**
 * Dispatch tests: every tool and resource the server lists must be routed to
 * a module that recognises it.
 *
 * server.ts routes tools by name substrings and resources by URI prefix, so a
 * new name can be captured by an earlier branch. Handler-level tests call the
 * modules directly and cannot see that; these go through the real server.
 *
 * @group unit
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server';

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

interface Call {
  method: string;
  path: string;
}

describe('server dispatch', () => {
  let client: Client;
  let server: ReturnType<typeof createServer>;
  let calls: Call[];
  const realFetch = global.fetch;
  const realKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;

  beforeAll(async () => {
    process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'test-api-key';
    server = createServer({ apiKey: 'test-api-key', apiUrl: API });
    client = new Client({ name: 'dispatch-test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
    global.fetch = realFetch;
    if (realKey === undefined) delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
    else process.env.DIGITAL_SAMBA_DEVELOPER_KEY = realKey;
  });

  beforeEach(() => {
    calls = [];
    // Records every request and answers with an empty list, which is a valid
    // body for list endpoints and harmless for the rest.
    global.fetch = jest.fn(async (input: any, init?: any) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      calls.push({ method: init?.method || 'GET', path: url.pathname });
      const body = JSON.stringify({ data: [], total_count: 0 });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => body,
        json: async () => JSON.parse(body),
      } as any;
    }) as any;
  });

  /** Minimal arguments: every schema property that looks like an ID. */
  function argsFor(tool: { inputSchema: any }): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    for (const key of Object.keys(tool.inputSchema?.properties || {})) {
      if (/id$/i.test(key)) args[key] = ID;
    }
    return args;
  }

  it('routes every listed tool to a module that knows it', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(100);

    const misrouted: string[] = [];
    for (const tool of tools) {
      let text = '';
      try {
        const result: any = await client.callTool({
          name: tool.name,
          arguments: argsFor(tool),
        });
        text = (result.content || []).map((c: any) => c.text || '').join('\n');
      } catch (error) {
        text = error instanceof Error ? error.message : String(error);
      }
      // Handlers may fail on the stubbed data; that is not what is tested.
      // A module rejecting the name itself is.
      if (/Unknown (\w+ )?tool|Tool not found/i.test(text)) {
        misrouted.push(`${tool.name}: ${text.slice(0, 120)}`);
      }
    }
    expect(misrouted).toEqual([]);
  });

  it('delete-session-recordings reaches DELETE /sessions/{id}/recordings', async () => {
    await client.callTool({
      name: 'delete-session-recordings',
      arguments: { session_id: ID },
    });
    expect(calls).toContainEqual({
      method: 'DELETE',
      path: `/api/v1/sessions/${ID}/recordings`,
    });
  });

  it('reads every listed resource and returns protocol-valid contents', async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBeGreaterThan(30);

    const failures: string[] = [];
    for (const resource of resources) {
      const uri = resource.uri.replace(/\{[^}]+\}/g, ID);
      try {
        // The client validates the result, so contents without `uri` throw.
        await client.readResource({ uri });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Handlers may fail on the stubbed data (McpError from a handler is
        // fine); an unrouted URI or a result the client cannot parse is not.
        if (/Unknown resource URI|Invalid result|invalid_type|expected /i.test(message)) {
          failures.push(`${resource.uri}: ${message.slice(0, 160)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('room-scoped resources call the room-scoped endpoints, not GET /rooms/{id}', async () => {
    await client.readResource({ uri: `digitalsamba://rooms/${ID}/sessions` });
    expect(calls.map((c) => c.path)).toContain(`/api/v1/rooms/${ID}/sessions`);
    expect(calls.map((c) => c.path)).not.toContain(`/api/v1/rooms/${ID}`);

    calls = [];
    await client.readResource({ uri: `digitalsamba://rooms/${ID}/recordings` });
    expect(calls.some((c) => c.path.endsWith('/recordings'))).toBe(true);
    expect(calls.map((c) => c.path)).not.toContain(`/api/v1/rooms/${ID}`);
  });

  it('library resources are readable under the URIs they are listed with', async () => {
    await client.readResource({ uri: 'digitalsamba://libraries' });
    expect(calls).toContainEqual({ method: 'GET', path: '/api/v1/libraries' });
  });
});
