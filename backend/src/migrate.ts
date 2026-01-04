import mysql from 'mysql2/promise'
import { env } from './env'

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true
  })

  try {
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``)
    await conn.changeUser({ database: env.DB_NAME })

    // Ensure users table exists (new shape)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL,
        username VARCHAR(50) NULL,
        email VARCHAR(320) NULL,
        password_hash VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_users_username (username),
        UNIQUE KEY uniq_users_email (email)
      )
    `)

      // Ensure applications table exists (app requires it)
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS applications (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id CHAR(36) NOT NULL,
          company VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          status ENUM('Applied','Interviewing','Offer','Rejected') NOT NULL DEFAULT 'Applied',
          job_url TEXT NULL,
          salary INT NULL,
          date_applied DATE NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_user_date (user_id, date_applied),
          INDEX idx_user_status (user_id, status),
          CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

    // If the table already existed in the old anonymous-only shape, add the missing columns.
    try {
      await conn.execute('ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL')
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e
    }

    try {
      await conn.execute('ALTER TABLE users ADD COLUMN email VARCHAR(320) NULL')
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e
    }

    try {
      await conn.execute('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL')
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e
    }

    // Ensure unique index exists (MySQL allows multiple NULL values in a UNIQUE index).
    try {
      await conn.execute('CREATE UNIQUE INDEX uniq_users_username ON users (username)')
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') throw e
    }

    try {
      await conn.execute('CREATE UNIQUE INDEX uniq_users_email ON users (email)')
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') throw e
    }

    console.log('Migration complete.')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exitCode = 1
})
