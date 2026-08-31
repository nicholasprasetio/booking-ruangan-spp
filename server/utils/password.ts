const ITERATIONS = 100_000
const SALT_BYTES = 16
const KEY_BYTES = 32

function base64UrlEncode(bytes: Uint8Array): string {
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

async function pbkdf2Sha256(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  lengthBytes: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    lengthBytes * 8,
  )

  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await pbkdf2Sha256(password, salt, ITERATIONS, KEY_BYTES)
  return `pbkdf2_sha256$${ITERATIONS}$${base64UrlEncode(
    salt,
  )}$${base64UrlEncode(hash)}`
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4) return false
  const [algo, iterStr, saltB64u, hashB64u] = parts
  if (algo !== 'pbkdf2_sha256') return false

  const iterations = Number(iterStr)
  if (!Number.isFinite(iterations) || iterations < 10_000 || iterations > ITERATIONS) return false

  const salt = base64UrlDecodeToBytes(saltB64u)
  const expected = base64UrlDecodeToBytes(hashB64u)
  const actual = await pbkdf2Sha256(password, salt, iterations, expected.length)
  return timingSafeEqual(actual, expected)
}

