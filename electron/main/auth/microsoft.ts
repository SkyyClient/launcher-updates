import { BrowserWindow, session } from 'electron'
import type { MicrosoftAccount } from '../../../src/types'
import { emitLog } from '../console'
import { storeAccount, getStoredAccount, deleteStoredAccount } from './token-store'

const CLIENT_ID = process.env.SKYY_MICROSOFT_CLIENT_ID || ''
const REDIRECT_URI = 'https://login.microsoftonline.com/common/oauth2/nativeclient'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  account_type: string
}

interface AccountEndpoint {
  id: string
  username: string
}

interface XboxResponse {
  Token: string
  DisplayClaims: Record<string, unknown>
}

interface MinecraftAuthResponse {
  access_token: string
  username: string
  expires_in: number
}

interface MinecraftProfileData {
  id: string
  name: string
}

export { getStoredAccount } from './token-store'

export async function logoutAccount(): Promise<void> {
  try {
    deleteStoredAccount()
  } catch (error) {
    emitLog('ERROR', `Failed to logout: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function exchangeCodeForToken(authCode: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    code: authCode,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: 'XboxLive.signin offline_access',
  })

  const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as TokenResponse
}

async function xboxLiveAuthenticate(accessToken: string): Promise<XboxResponse> {
  const body = JSON.stringify({
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${accessToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  })

  const res = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  })

  if (!res.ok) throw new Error(`XBL authentication failed: ${res.status}`)
  return (await res.json()) as XboxResponse
}

async function xstsAuthenticate(xboxToken: string): Promise<XboxResponse> {
  const body = JSON.stringify({
    Properties: { SandboxId: 'RETAIL', UserTokens: [xboxToken] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  })

  const res = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`XSTS authentication failed: ${res.status} ${text}`)
  }
  return (await res.json()) as XboxResponse
}

async function minecraftAuthenticate(userHash: string, xstsToken: string): Promise<MinecraftAuthResponse> {
  const body = JSON.stringify({ identityToken: `XBL3.0 x=${userHash};${xstsToken}` })

  const res = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  })

  if (!res.ok) throw new Error(`Minecraft auth failed: ${res.status}`)
  return (await res.json()) as MinecraftAuthResponse
}

async function getMinecraftProfile(accessToken: string): Promise<MinecraftProfileData> {
  const res = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  return (await res.json()) as MinecraftProfileData
}

export async function microsoftLogin(): Promise<MicrosoftAccount | null> {
  if (!CLIENT_ID) {
    emitLog(
      'ERROR',
      'Microsoft OAuth no está configurado. No se puede iniciar sesión real de Minecraft (se necesita un Client ID de Azure).'
    )
    return null
  }

  try {
    emitLog('INFO', 'Starting Microsoft OAuth flow')

    const authWindow = new BrowserWindow({
      width: 520,
      height: 690,
      title: 'SKYY CLIENT - Microsoft Login',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    const authUrl =
      `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        response_mode: 'query',
        scope: 'XboxLive.signin offline_access',
      }).toString()

    const code = await new Promise<string | null>((resolve) => {
      const handle = async (url: string) => {
        try {
          const parsed = new URL(url)
          if (parsed.hostname === 'login.microsoftonline.com') return
          if (url.startsWith(REDIRECT_URI)) {
            const authCode = parsed.searchParams.get('code')
            if (!authCode) {
              emitLog('ERROR', 'OAuth callback missing code')
              resolve(null)
            } else {
              resolve(authCode)
            }
            authWindow.close()
          }
        } catch {
          /* ignore */
        }
      }

      authWindow.webContents.on('will-redirect', (_event, url) => handle(url))

      // Also listen for any navigation matching the redirect
      authWindow.webContents.on('will-navigate', (_event, url) => handle(url))

      authWindow.on('closed', () => {
        resolve(null)
      })

      void authWindow.loadURL(authUrl)
    })

    if (!code) {
      emitLog('WARNING', 'Microsoft login cancelled')
      return null
    }

    emitLog('INFO', 'Exchanging authorization code for token')

    // Clear session cookies that could interfere
    await session.defaultSession.clearStorageData({ storages: ['cookies'] })

    const tokenResponse = await exchangeCodeForToken(code)
    const xbl = await xboxLiveAuthenticate(tokenResponse.access_token)

    const userHash = (xbl.DisplayClaims as { xui: Array<{ uhs: string }> }).xui[0].uhs
    const xsts = await xstsAuthenticate(xbl.Token)
    const mc = await minecraftAuthenticate(userHash, xsts.Token)
    const profile = await getMinecraftProfile(mc.access_token)

    const account: MicrosoftAccount = {
      username: profile.name,
      uuid: profile.id,
      accessToken: mc.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + mc.expires_in * 1000,
    }

    await storeAccount(account)
    emitLog('INFO', `Logged in as ${profile.name} (${profile.id})`)
    return account
  } catch (error) {
    emitLog('ERROR', `Microsoft login failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
