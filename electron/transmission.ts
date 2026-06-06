// Transmission RPC client. Runs in the Electron main process (Node), so it is
// free of browser CORS limits. Handles the X-Transmission-Session-Id 409
// handshake and HTTP basic auth.
import type { ServerConfig, RpcResult } from '../shared/types';

const SESSION_HEADER = 'x-transmission-session-id';

export class TransmissionClient {
  private sessionId = '';

  constructor(private cfg: ServerConfig) {}

  get config(): ServerConfig {
    return this.cfg;
  }

  private url(): string {
    const scheme = this.cfg.useHttps ? 'https' : 'http';
    const path = this.cfg.rpcPath || '/transmission/rpc';
    return `${scheme}://${this.cfg.host}:${this.cfg.port}${path}`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.sessionId) h[SESSION_HEADER] = this.sessionId;
    if (this.cfg.username != null) {
      const token = Buffer.from(`${this.cfg.username}:${this.cfg.password ?? ''}`).toString('base64');
      h['authorization'] = `Basic ${token}`;
    }
    return h;
  }

  /** Low-level RPC call. Retries once on a 409 session-id challenge. */
  async call<T = unknown>(method: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
    const body = JSON.stringify({ method, arguments: args });

    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(this.url(), { method: 'POST', headers: this.headers(), body });
      } catch (e) {
        return { ok: false, result: `network error: ${(e as Error).message}` };
      }

      if (res.status === 409) {
        const id = res.headers.get(SESSION_HEADER);
        if (id && attempt === 0) {
          this.sessionId = id;
          continue; // retry with the fresh session id
        }
        return { ok: false, result: 'session handshake failed' };
      }

      if (res.status === 401) return { ok: false, result: 'authentication failed' };
      if (!res.ok) return { ok: false, result: `HTTP ${res.status}` };

      const json = (await res.json()) as { result: string; arguments?: T };
      return { ok: json.result === 'success', result: json.result, arguments: json.arguments };
    }
    return { ok: false, result: 'unreachable' };
  }
}
