import { createError } from 'h3'

function base64UrlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function base64UrlDecodeJson<T>(input: string): T {
  const bytes = base64UrlDecodeToBytes(input)
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json) as T
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(sig)
}

export type JwtUserPayload = {
  sub: string
  phoneNumber: string
  roles?: string[]
  /** @deprecated use roles */
  role?: string | null
  iat: number
  exp: number
}

export async function signUserJwt(params: {
  userId: number
  phoneNumber: string
  roles?: string[]
  secret: string
  expiresSeconds: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload: JwtUserPayload = {
    sub: String(params.userId),
    phoneNumber: params.phoneNumber,
    roles: params.roles ?? [],
    iat: now,
    exp: now + params.expiresSeconds,
  }

  const h = base64UrlEncodeJson(header)
  const p = base64UrlEncodeJson(payload)
  const data = `${h}.${p}`
  const sig = await hmacSha256(params.secret, data)
  const s = base64UrlEncodeBytes(sig)
  return `${data}.${s}`
}

export async function verifyUserJwt(params: {
  token: string
  secret: string
}): Promise<JwtUserPayload> {
  const parts = params.token.split('.')
  if (parts.length !== 3) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
  const [h, p, s] = parts
  const header = base64UrlDecodeJson<{ alg?: string; typ?: string }>(h)
  if (header?.alg !== 'HS256') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token alg' })
  }

  const data = `${h}.${p}`
  const expected = await hmacSha256(params.secret, data)
  const actual = base64UrlDecodeToBytes(s)
  if (!timingSafeEqual(expected, actual)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token signature' })
  }

  const payload = base64UrlDecodeJson<JwtUserPayload>(p)
  const now = Math.floor(Date.now() / 1000)
  if (!payload?.sub || !payload?.exp || payload.exp < now) {
    throw createError({ statusCode: 401, statusMessage: 'Token expired' })
  }
  return payload
}

