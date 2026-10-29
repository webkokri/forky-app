import { API_URL } from './config';
import { tokens } from './tokens';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, body: { message?: string; code?: string; details?: string[] } | null) {
    const details = body?.details?.length ? `: ${body.details.join(', ')}` : '';
    super(`${body?.message || 'Request failed'}${details}`);
    this.status = status;
    this.code = body?.code;
  }
}

type Opts = { method?: string; body?: unknown; params?: Record<string, unknown>; auth?: boolean; token?: string; retry?: boolean };

const qs = (params: Opts['params'] = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

const signedOutListeners = new Set<() => void>();
export const onSignedOut = (fn: () => void) => {
  signedOutListeners.add(fn);
  return () => void signedOutListeners.delete(fn);
};

let refreshing: Promise<boolean> | null = null;
function refreshTokens(): Promise<boolean> {
  if (!tokens.refresh) return Promise.resolve(false);
  refreshing ??= fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refresh }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error('refresh failed');
      await tokens.set(await r.json());
      return true;
    })
    .catch(async () => {
      await tokens.clear();
      signedOutListeners.forEach((fn) => fn());
      return false;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** Call the Forky API. Adds the bearer token and renews an expired one once. */
export async function http<T = any>(path: string, { method = 'GET', body, params, auth = true, token, retry = true }: Opts = {}): Promise<T> {
  const bearer = token ?? (auth ? tokens.access : null);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000); // a stalled connection fails after 20s instead of hanging
  const res = await fetch(`${API_URL}${path}${qs(params)}`, {
    signal: ctl.signal,
    method,
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).finally(() => clearTimeout(timer));
  if (res.status === 401 && auth && !token && retry && tokens.refresh && (await refreshTokens())) {
    return http<T>(path, { method, body, params, auth, retry: false });
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return (res.status === 204 ? null : await res.json().catch(() => null)) as T;
}
