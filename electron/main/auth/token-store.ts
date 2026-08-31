import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { app } from 'electron'
import type { MicrosoftAccount } from '../../../src/types'

const TOKEN_FILE = 'skyy-auth.json'
const SALT = 'skyy-salt-v1'

function deriveKey(): Buffer {
  return crypto.scryptSync(os.hostname() + '-' + os.userInfo().username, SALT, 32)
}

function getAuthDir(): string {
  const dir = path.join(app.getPath('appData'), '.skyyclient')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getAuthFilePath(): string {
  return path.join(getAuthDir(), TOKEN_FILE)
}

export function storeAccount(account: MicrosoftAccount): void {
  const key = deriveKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let enc = cipher.update(JSON.stringify(account), 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag()
  fs.writeFileSync(
    getAuthFilePath(),
    JSON.stringify({ iv: iv.toString('hex'), data: enc, tag: tag.toString('hex') }),
    'utf-8'
  )
}

export function getStoredAccount(): MicrosoftAccount | null {
  try {
    const filePath = getAuthFilePath()
    if (!fs.existsSync(filePath)) return null
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    if (raw.iv && raw.data && raw.tag) {
      const key = deriveKey()
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'))
      decipher.setAuthTag(Buffer.from(raw.tag, 'hex'))
      let out = decipher.update(raw.data, 'hex', 'utf8')
      out += decipher.final('utf8')
      return JSON.parse(out) as MicrosoftAccount
    }

    // Migración: archivo viejo sin encriptar — leer y re-guardar encriptado
    const account = raw as MicrosoftAccount
    if (account.username) {
      storeAccount(account)
      return account
    }

    return null
  } catch {
    return null
  }
}

export function deleteStoredAccount(): void {
  try {
    const filePath = getAuthFilePath()
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true })
    }
  } catch {
    // ignorar
  }
}
