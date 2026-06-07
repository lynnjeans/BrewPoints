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

export async function apiGet<T>(path: string, token: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (!res.ok) throw new ApiError(res.status, `Request failed: ${res.status}`)
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed: ${res.status}`)
  return data
}
