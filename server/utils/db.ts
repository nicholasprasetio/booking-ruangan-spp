import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'booking',
  timezone: '+07:00',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
})

function normalizeSql(sql: string, params: any[]) {
  const hasIndexedParams = /\?\d+/.test(sql)

  if (!hasIndexedParams) {
    return {
      sql,
      params,
    }
  }

  const orderedParams: any[] = []

  const normalized = sql.replace(/\?(\d+)/g, (_, index) => {
    const i = Number(index) - 1

    if (i < 0 || i >= params.length) {
      throw new Error(`SQL parameter ?${index} has no matching bind value`)
    }

    orderedParams.push(params[i])
    return '?'
  })

  return {
    sql: normalized,
    params: orderedParams,
  }
}

function makeResult(rows: any, fields: any = []) {
  return {
    results: Array.isArray(rows) ? rows : [],
    success: true,
    meta: { fields },
  }
}

class MySqlStatement {
  private sql: string
  private params: any[] = []

  constructor(sql: string) {
    this.sql = sql
  }

  bind(...params: any[]) {

    this.params = params.map((value) => {

      if (

        typeof value === 'string' &&

        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)

      ) {

        return value.slice(0, 19).replace('T', ' ')

      }



      return value

    })



    return this

  }

  async first<T = any>(column?: string): Promise<T | null> {
    const q = normalizeSql(this.sql, this.params)
    const [rows] = await pool.query(q.sql, q.params)
    const row = (rows as any[])[0]

    return column ? (row?.[column] ?? null) : (row ?? null)
  }

  async all<T = any>(): Promise<{ results: T[]; success: boolean }> {
    const q = normalizeSql(this.sql, this.params)
    const [rows, fields] = await pool.query(q.sql, q.params)

    return makeResult(rows, fields) as {
      results: T[]
      success: boolean
    }
  }

  async run(): Promise<{ success: boolean; meta: any }> {
    const q = normalizeSql(this.sql, this.params)
    const [result] = await pool.query(q.sql, q.params)

    const mysqlMeta = result as any

    return {
      success: true,
      meta: {
        ...mysqlMeta,
        last_row_id: Number(mysqlMeta.insertId || 0),
        changes: Number(mysqlMeta.affectedRows || 0),
      },
    }
  }
}

export const mysqlD1 = {
  prepare(sql: string) {
    return new MySqlStatement(sql)
  },

  async batch(statements: MySqlStatement[]) {
    const results = []

    for (const statement of statements) {
      results.push(await statement.run())
    }

    return results
  },
}
