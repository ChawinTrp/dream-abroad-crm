// Production builds embed VITE_API_URL (e.g. https://dreamabroad-api.up.railway.app).
// Dev uses the Vite proxy at /api which forwards to the api container.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

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
  // Endpoints that return void (e.g. DELETE /customers/:id/tags/:tagDefId)
  // send 200 with empty body. res.json() throws on empty body, which would
  // reject this promise and skip the caller's follow-up refetch — that's
  // exactly the "DELETE doesn't update until I toggle something else" bug.
  // Read as text first; only parse if non-empty.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
