const BASE = '/api';

let agentIdHeader: string | null = null;

export function setAgentId(id: number | null) {
  agentIdHeader = id ? String(id) : null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(agentIdHeader ? { 'X-Agent-Id': agentIdHeader } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  // cache: 'no-store' prevents the browser from serving stale GET responses
  // after a mutation. Our API doesn't set Cache-Control headers, so without
  // this the browser may treat /api/customers/:id as cacheable and skip the
  // refetch we explicitly trigger after a tag toggle / stage change / etc.
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
