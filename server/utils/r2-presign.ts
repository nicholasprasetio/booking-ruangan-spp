/**
 * Generate AWS Signature V4 presigned PUT URLs for Cloudflare R2 (S3-compatible API).
 * Uses Web Crypto API only — no external dependencies required.
 */

export interface R2PresignConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSHA256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * URI-encode each path segment (but keep `/` separators intact).
 * Follows the AWS canonical URI encoding rules.
 */
function encodeObjectKey(key: string): string {
  return key.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

export async function generateR2PresignedPutUrl(
  config: R2PresignConfig,
  objectKey: string,
  contentType: string,
  expiresSeconds = 300,
): Promise<string> {
  const region = 'auto'
  const service = 's3'
  const host = `${config.accountId}.r2.cloudflarestorage.com`

  const now = new Date()
  // Format: YYYYMMDDTHHmmssZ
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const dateStamp = amzDate.slice(0, 8) // YYYYMMDD

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const credential = `${config.accessKeyId}/${credentialScope}`
  const signedHeaders = 'host'

  // Query parameters (must be sorted alphabetically by key)
  const rawParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSeconds)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ]
  rawParams.sort(([a], [b]) => a.localeCompare(b))

  const canonicalQueryString = rawParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const encodedKey = encodeObjectKey(objectKey)
  const canonicalUri = `/${config.bucketName}/${encodedKey}`
  const canonicalHeaders = `host:${host}\n`

  // UNSIGNED-PAYLOAD is required for browser presigned uploads
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const canonicalRequestHash = await sha256Hex(canonicalRequest)

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  // Derive signing key: HMAC chain AWS4+secret → date → region → service → "aws4_request"
  const kDate = await hmacSHA256(
    new TextEncoder().encode(`AWS4${config.secretAccessKey}`),
    dateStamp,
  )
  const kRegion = await hmacSHA256(kDate, region)
  const kService = await hmacSHA256(kRegion, service)
  const kSigning = await hmacSHA256(kService, 'aws4_request')

  const signature = toHex(await hmacSHA256(kSigning, stringToSign))

  return `https://${host}/${config.bucketName}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}
