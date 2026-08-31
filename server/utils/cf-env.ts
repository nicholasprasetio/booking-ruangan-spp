
import type { H3Event } from 'h3'

import type { CloudflareEnv } from '../types/cloudflare-env'

import { mysqlD1 } from './db'



export function getCloudflareEnv(event: H3Event): CloudflareEnv {

  return {

    DB: mysqlD1,

    JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_ME',

    JWT_EXPIRES_SECONDS: Number(process.env.JWT_EXPIRES_SECONDS || 86400),

  } as unknown as CloudflareEnv

}

