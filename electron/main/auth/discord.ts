import http from 'node:http'
import { URL } from 'node:url'
import { app, shell } from 'electron'
import { emitLog } from '../console'
import type { MicrosoftAccount } from '../../../src/types'

const DISCORD_CLIENT_ID = '1542876598825517066'
const REDIRECT_PORT = 29347
const SCOPE = 'identify'
const DISCORD_SERVER_INVITE = 'https://discord.com/invite/u2KXcKdQTR'
const PROXY_BASE = 'https://skyyclient.vercel.app/api'

interface ProxyTokenResponse {
  access_token: string
  expires_in: number
}

interface ProxyUserResponse {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

function avatarUrl(userId: string, avatarHash: string): string {
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=128`
}

export async function discordLogin(): Promise<MicrosoftAccount | null> {
  if (DISCORD_SERVER_INVITE) {
    await shell.openExternal(DISCORD_SERVER_INVITE)
  }

  try {
    emitLog('INFO', 'Iniciando login con Discord')

    const { port, server, waitForCode } = await startCallbackServer()
    const redirectUri = `http://localhost:${port}/callback`

    const authUrl =
      `https://discord.com/api/oauth2/authorize?` +
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
      }).toString()

    await shell.openExternal(authUrl)

    const code = await waitForCode
    server.close()

    if (!code) {
      emitLog('WARNING', 'Discord login cancelado o sin codigo')
      return null
    }

    emitLog('INFO', 'Intercambiando codigo de Discord por token (via proxy)')

    const tokenRes = await fetch(`${PROXY_BASE}/discord-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      throw new Error(`Proxy token exchange failed: ${tokenRes.status} ${text}`)
    }

    const tokenData = (await tokenRes.json()) as ProxyTokenResponse

    const userRes = await fetch(
      `${PROXY_BASE}/discord-user?access_token=${encodeURIComponent(tokenData.access_token)}`
    )

    if (!userRes.ok) throw new Error(`Proxy user fetch failed: ${userRes.status}`)
    const discordUser = (await userRes.json()) as ProxyUserResponse

    const account: MicrosoftAccount = {
      username: discordUser.global_name || discordUser.username,
      uuid: `discord-${discordUser.id}`,
      accessToken: tokenData.access_token,
      avatar: discordUser.avatar ? avatarUrl(discordUser.id, discordUser.avatar) : undefined,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    }

    const { storeAccount } = await import('./token-store')
    storeAccount(account)
    emitLog('INFO', `Discord login exitoso: ${account.username}`)

    if (DISCORD_SERVER_INVITE) {
      await shell.openExternal(DISCORD_SERVER_INVITE)
    }

    return account
  } catch (error) {
    emitLog('ERROR', `Discord login failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function startCallbackServer(): Promise<{
  port: number
  server: http.Server
  waitForCode: Promise<string | null>
}> {
  return new Promise((resolve) => {
    let codeResolver: (code: string | null) => void
    const codePromise = new Promise<string | null>((res) => {
      codeResolver = res
    })

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost`)
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2 style="font-family:sans-serif">Sesion iniciada correctamente. Ya puedes cerrar esta ventana.</h2></body></html>')
        codeResolver(code)
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : REDIRECT_PORT
      resolve({ port, server, waitForCode: codePromise })
    })
  })
}
