import { D1Database, R2Bucket } from "@cloudflare/workers-types"

export interface CloudflareEnv {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET: string
  JWT_EXPIRES_SECONDS?: string
  /** R2 S3-compatible API credentials — needed only for presigned upload URLs */
  R2_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_BUCKET_NAME?: string
  GMAIL_SMTP_USER?: string
  GMAIL_SMTP_APP_PASSWORD?: string
  EMAIL_FROM?: string
  SMTP_RELAY_URL?: string
}
