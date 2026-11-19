/**
 * API coverage gate.
 *
 * `openapi-stored.yaml` is the API contract this server was last reviewed
 * against; `api-coverage.json` records what we did about every operation in it.
 * These tests fail when the two disagree, so the stored spec cannot be updated
 * without deciding, per operation, whether it is covered by a tool, deliberately
 * excluded, or pending against a tracked issue. That is what stops the server
 * drifting silently behind the API again.
 *
 * @group unit
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server';

// version.ts reads import.meta, which this Jest setup cannot load. Nothing
// here depends on the version.
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

const ROOT = join(__dirname, '..', '..');

interface SpecOperation {
  key: string; // "METHOD /path"
  operationId: string;
}

interface ManifestEntry {
  operationId: string;
  tools?: string[];
  resources?: string[];
  excluded?: string;
  pending?: string;
  issue?: number;
  note?: string;
}

interface Manifest {
  spec: string;
  unmappedTools: Record<string, string>;
  operations: Record<string, ManifestEntry>;
}

/**
 * Extract every operation from the spec's `paths:` block.
 *
 * Line-based on purpose: the spec is machine-generated (Scribe) with fixed
 * two-space indentation, and this keeps a YAML parser out of the test's type
 * surface. `parseSpec` cross-checks its own result against a raw count of
 * `operationId:` lines, so a layout change fails loudly instead of silently
 * dropping operations.
 */
function parseSpec(yamlText: string): SpecOperation[] {
  const operations: SpecOperation[] = [];
  let inPaths = false;
  let path: string | null = null;
  let method: string | null = null;

  for (const line of yamlText.split('\n')) {
    if (/^\S/.test(line)) {
      inPaths = /^paths:\s*$/.test(line);
      path = null;
      method = null;
      continue;
    }
    if (!inPaths) continue;

    const pathMatch = line.match(/^ {2}'?(\/[^':]*)'?:\s*$/);
    if (pathMatch) {
      path = pathMatch[1];
      method = null;
      continue;
    }
    const methodMatch = line.match(
      /^ {4}(get|post|put|patch|delete|head|options):\s*$/,
    );
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
      continue;
    }
    if (/^ {4}\S/.test(line)) {
      // Another path-level key (e.g. `parameters:`): not an operation.
      method = null;
      continue;
    }
    const idMatch = line.match(/^ {6}operationId:\s*'?([^'\s]+)'?\s*$/);
    if (idMatch && path && method) {
      operations.push({ key: `${method} ${path}`, operationId: idMatch[1] });
    }
  }

  const rawCount = (yamlText.match(/^\s*operationId:/gm) || []).length;
  if (rawCount !== operations.length) {
    throw new Error(
      `Spec parser found ${operations.length} operations but the file has ${rawCount} operationId lines - the spec layout changed; fix parseSpec.`,
    );
  }
  return operations;
}

function disposition(entry: ManifestEntry): string[] {
  const kinds: string[] = [];
  if (entry.tools !== undefined || entry.resources !== undefined) {
    kinds.push('covered');
  }
  if (entry.excluded !== undefined) kinds.push('excluded');
  if (entry.pending !== undefined) kinds.push('pending');
  return kinds;
}

describe('API coverage manifest', () => {
  const manifest: Manifest = JSON.parse(
    readFileSync(join(ROOT, 'api-coverage.json'), 'utf8'),
  );
  const specOps = parseSpec(
    readFileSync(join(ROOT, manifest.spec), 'utf8'),
  );
  const entries = Object.entries(manifest.operations);

  let toolNames: Set<string>;
  let resourceUris: Set<string>;

  beforeAll(async () => {
    // Ask the real server, over the real protocol, so a tool module that is
    // written but not wired into server.ts does not count as registered.
    const server = createServer({ apiKey: 'test-api-key' });
    const client = new Client({ name: 'coverage-test', version: '0.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    const { resources } = await client.listResources();
    toolNames = new Set(tools.map((t) => t.name));
    resourceUris = new Set(resources.map((r) => r.uri));

    await client.close();
    await server.close();
  });

  it('parses a plausible spec', () => {
    expect(specOps.length).toBeGreaterThan(100);
    expect(new Set(specOps.map((o) => o.key)).size).toBe(specOps.length);
  });

  it('has an entry for every operation in the stored spec', () => {
    const missing = specOps
      .filter((op) => !manifest.operations[op.key])
      .map((op) => `${op.operationId} (${op.key})`);

    // A failure here means openapi-stored.yaml gained operations that nobody
    // has triaged. Add each to api-coverage.json as tools / excluded / pending.
    expect(missing).toEqual([]);
  });

  it('names no operation that is not in the stored spec', () => {
    const specKeys = new Set(specOps.map((o) => o.key));
    const stale = entries
      .filter(([key]) => !specKeys.has(key))
      .map(([key, entry]) => `${entry.operationId} (${key})`);

    // A failure here means the API removed or moved an endpoint. Check the
    // tools that called it before deleting the entry.
    expect(stale).toEqual([]);
  });

  it('records the same operationId as the spec for every operation', () => {
    const renamed = specOps
      .filter((op) => manifest.operations[op.key])
      .filter((op) => manifest.operations[op.key].operationId !== op.operationId)
      .map(
        (op) =>
          `${op.key}: spec says ${op.operationId}, manifest says ${manifest.operations[op.key].operationId}`,
      );

    // A rename is how the API signalled the chat endpoint's new contract:
    // re-read the endpoint before updating the id here.
    expect(renamed).toEqual([]);
  });

  it('gives every operation exactly one disposition', () => {
    const bad = entries
      .filter(([, entry]) => disposition(entry).length !== 1)
      .map(([key, entry]) => `${key}: ${disposition(entry).join('+') || 'none'}`);
    expect(bad).toEqual([]);

    const empty = entries
      .filter(([, entry]) => disposition(entry)[0] === 'covered')
      .filter(
        ([, entry]) =>
          (entry.tools?.length ?? 0) + (entry.resources?.length ?? 0) === 0,
      )
      .map(([key]) => key);
    expect(empty).toEqual([]);

    const unexplained = entries
      .filter(
        ([, entry]) =>
          (entry.excluded !== undefined && !entry.excluded.trim()) ||
          (entry.pending !== undefined && !entry.pending.trim()),
      )
      .map(([key]) => key);
    expect(unexplained).toEqual([]);
  });

  it('tracks every pending operation against an issue', () => {
    const untracked = entries
      .filter(([, entry]) => entry.pending !== undefined)
      .filter(
        ([, entry]) => !Number.isInteger(entry.issue) || (entry.issue ?? 0) <= 0,
      )
      .map(([key]) => key);
    expect(untracked).toEqual([]);

    const stray = entries
      .filter(([, entry]) => entry.pending === undefined)
      .filter(([, entry]) => entry.issue !== undefined)
      .map(([key]) => key);
    expect(stray).toEqual([]);
  });

  it('only names tools and resources the server really registers', () => {
    const unknownTools = entries.flatMap(([key, entry]) =>
      (entry.tools ?? [])
        .filter((tool) => !toolNames.has(tool))
        .map((tool) => `${tool} (${key})`),
    );
    expect(unknownTools).toEqual([]);

    const unknownResources = entries.flatMap(([key, entry]) =>
      (entry.resources ?? [])
        .filter((uri) => !resourceUris.has(uri))
        .map((uri) => `${uri} (${key})`),
    );
    expect(unknownResources).toEqual([]);
  });

  it('accounts for every registered tool', () => {
    const mapped = new Set(entries.flatMap(([, entry]) => entry.tools ?? []));
    const unmapped = manifest.unmappedTools;

    // A new tool must say which API operation it calls, or why it calls none.
    const unaccounted = [...toolNames].filter(
      (tool) => !mapped.has(tool) && !(tool in unmapped),
    );
    expect(unaccounted).toEqual([]);

    const contradictory = Object.keys(unmapped).filter(
      (tool) => mapped.has(tool) || !toolNames.has(tool),
    );
    expect(contradictory).toEqual([]);
  });

  it('reports the pending backlog', () => {
    const pending = entries.filter(([, entry]) => entry.pending !== undefined);
    const excluded = entries.filter(
      ([, entry]) => entry.excluded !== undefined,
    );
    const byIssue = new Map<number, number>();
    for (const [, entry] of pending) {
      byIssue.set(entry.issue as number, (byIssue.get(entry.issue as number) ?? 0) + 1);
    }
    const issues = [...byIssue.entries()]
      .map(([issue, count]) => `#${issue}: ${count}`)
      .join(', ');

    // Informational, never a failure: the backlog is allowed to exist, it is
    // just not allowed to be invisible.
    console.info(
      `API coverage: ${specOps.length} operations - ` +
        `${entries.length - pending.length - excluded.length} covered, ` +
        `${excluded.length} excluded, ${pending.length} pending` +
        (issues ? ` (${issues})` : ''),
    );
    expect(pending.length + excluded.length).toBeLessThanOrEqual(entries.length);
  });
});

describe('parseSpec', () => {
  it('keeps operations that share an operationId apart by method and path', () => {
    const ops = parseSpec(
      [
        'paths:',
        "  '/api/v1/a/{id}':",
        '    get:',
        '      operationId: same',
        '    parameters:',
        '      -',
        '        in: path',
        '  /api/v1/b:',
        '    post:',
        "      summary: 'x'",
        '      operationId: same',
        'components:',
        '  schemas: {}',
      ].join('\n'),
    );
    expect(ops).toEqual([
      { key: 'GET /api/v1/a/{id}', operationId: 'same' },
      { key: 'POST /api/v1/b', operationId: 'same' },
    ]);
  });

  it('refuses a layout it cannot read rather than under-counting', () => {
    expect(() =>
      parseSpec(
        ['paths:', '    /deep:', '        get:', '            operationId: lost'].join(
          '\n',
        ),
      ),
    ).toThrow(/spec layout changed/);
  });
});
