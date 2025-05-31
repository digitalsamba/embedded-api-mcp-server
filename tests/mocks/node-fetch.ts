/**
 * Mock implementation of node-fetch for Jest tests
 * Provides a simple mock that resolves to basic Response objects
 */

export interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type RequestInfo = string | URL;

export class Response {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Map<string, string>;
  private _body: string;

  constructor(body: string = '{}', init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  async json() {
    return JSON.parse(this._body);
  }

  async text() {
    return this._body;
  }
}

const fetch = jest.fn().mockImplementation(async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  return new Response('{"success": true}', { status: 200 });
});

export default fetch;
export { fetch };