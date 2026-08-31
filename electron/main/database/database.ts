import path from 'node:path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import type { LauncherSettings, MinecraftProfile } from '../../../src/types'

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) {
    const dir = path.join(app.getPath('appData'), '.skyyclient')
    require('node:fs').mkdirSync(dir, { recursive: true })
    db = new Database(path.join(dir, 'skyy-client.db'))
    init(db)
  }
  return db
}

function init(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      mod_loader TEXT NOT NULL,
      mod_loader_version TEXT,
      game_dir TEXT,
      memory INTEGER DEFAULT 4,
      jvm_args TEXT,
      resolution TEXT,
      mods TEXT,
      java_path TEXT,
      created TEXT NOT NULL
    );
  `)
}

export function getSettings(): LauncherSettings {
  const defaultSettings: LauncherSettings = {
    theme: 'sky',
    language: 'es',
    memory: 4,
    autoLogin: true,
    closeBehavior: 'minimize',
    resolution: { width: 1920, height: 1080 },
    gameDir: '',
  }

  const rows = getDb().prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]

  const settings = { ...defaultSettings }
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value)
      ;(settings as Record<string, unknown>)[row.key] = parsed
    } catch {
      /* ignore malformed values */
    }
  }
  return settings
}

export function setSettings(patch: Partial<LauncherSettings>) {
  const db = getDb()
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  for (const [key, value] of Object.entries(patch)) {
    stmt.run(key, JSON.stringify(value))
  }
}

export function getProfiles(): MinecraftProfile[] {
  const rows = getDb()
    .prepare('SELECT * FROM profiles')
    .all() as Record<string, unknown>[]

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    version: String(row.version),
    modLoader: String(row.mod_loader) as MinecraftProfile['modLoader'],
    modLoaderVersion: row.mod_loader_version ? String(row.mod_loader_version) : undefined,
    gameDir: row.game_dir ? String(row.game_dir) : '',
    memory: Number(row.memory),
    jvmArgs: row.jvm_args ? (JSON.parse(String(row.jvm_args)) as string[]) : [],
    resolution: row.resolution
      ? (JSON.parse(String(row.resolution)) as { width: number; height: number })
      : { width: 1920, height: 1080 },
    mods: row.mods ? (JSON.parse(String(row.mods)) as string[]) : [],
    javaPath: row.java_path ? String(row.java_path) : undefined,
    created: String(row.created),
  }))
}

export function saveProfile(profile: MinecraftProfile) {
  getDb()
    .prepare(
      `INSERT INTO profiles (id, name, version, mod_loader, mod_loader_version, game_dir, memory, jvm_args, resolution, mods, java_path, created)
       VALUES (@id, @name, @version, @modLoader, @modLoaderVersion, @gameDir, @memory, @jvmArgs, @resolution, @mods, @javaPath, @created)
       ON CONFLICT(id) DO UPDATE SET
         name = @name,
         version = @version,
         mod_loader = @modLoader,
         mod_loader_version = @modLoaderVersion,
         game_dir = @gameDir,
         memory = @memory,
         jvm_args = @jvmArgs,
         resolution = @resolution,
         mods = @mods,
         java_path = @javaPath`
    )
    .run({
      id: profile.id,
      name: profile.name,
      version: profile.version,
      modLoader: profile.modLoader,
      modLoaderVersion: profile.modLoaderVersion ?? null,
      gameDir: profile.gameDir,
      memory: profile.memory,
      jvmArgs: JSON.stringify(profile.jvmArgs),
      resolution: JSON.stringify(profile.resolution),
      mods: JSON.stringify(profile.mods),
      javaPath: profile.javaPath ?? null,
      created: profile.created,
    })
}

export function deleteProfile(id: string) {
  getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id)
}
