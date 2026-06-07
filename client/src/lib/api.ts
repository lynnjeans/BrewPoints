// Carries the HTTP status so callers can tell "server unreachable" (status 0 / 5xx → D.7.15)
// apart from a real app error (4xx → e.g. D.7.13).
export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// True when the backend couldn't be reached (network failure or server error).
export function isUnreachable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500)
}

// Session-invalid notifier: when a request comes back 401 (or 404 on /api/me — a stale token whose
// customer no longer exists), registered handlers fire so the app can log out and clear the session.
type ApiAuthErrorHandler = (path: string) => void
const authErrorHandlers = new Set<ApiAuthErrorHandler>()

export function onApiAuthError(handler: ApiAuthErrorHandler): () => void {
  authErrorHandlers.add(handler)
  return () => authErrorHandlers.delete(handler)
}

function maybeAuthError(path: string, status: number): void {
  const sessionInvalid = status === 401 || (status === 404 && path.startsWith('/api/me'))
  if (sessionInvalid) for (const handler of authErrorHandlers) handler(path)
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (!res.ok) {
    maybeAuthError(path, res.status)
    throw new ApiError(res.status, `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

async function apiSend<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    maybeAuthError(path, res.status)
    throw new ApiError(res.status, data.error ?? `Request failed: ${res.status}`)
  }
  return data
}

export function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiSend<T>('POST', path, token, body)
}

export function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiSend<T>('PATCH', path, token, body)
}

export function apiDelete<T>(path: string, token: string, body?: unknown): Promise<T> {
  return apiSend<T>('DELETE', path, token, body)
}
