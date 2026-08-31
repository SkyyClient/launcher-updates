import type { NewsItem } from '../../src/types'

const NEWS_URL =
  process.env.SKYY_NEWS_URL ??
  'https://api.github.com/repos/SkyyClient/launcher-updates/contents/news.json?ref=main'

// Forma de cada noticia tal como la produce el panel admin de la web.
interface WebNewsItem {
  id?: string
  title?: string
  date?: string
  tag?: string
  body?: string
  published?: boolean
}
interface WebNewsFile {
  news?: WebNewsItem[]
}

export async function getNews(): Promise<NewsItem[]> {
  try {
    return await fetchRemoteNews()
  } catch {
    return []
  }
}

async function fetchRemoteNews(): Promise<NewsItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(NEWS_URL, {
      signal: controller.signal,
      headers: {
        'user-agent': 'skyy-client',
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return []
    const gh = (await res.json()) as { content?: string }
    if (!gh.content) return []
    const decoded = Buffer.from(gh.content, 'base64').toString('utf-8')
    const data = JSON.parse(decoded) as WebNewsFile
    const items = Array.isArray(data.news) ? data.news : []
    return items
      // Solo las publicadas (los borradores quedan ocultos)
      .filter((n) => n && n.published !== false && (n.title || n.body))
      // Mapear el formato de la web al formato del launcher
      .map((n) => ({
        id: n.id ?? `news-${n.date ?? Math.random().toString(36).slice(2)}`,
        title: n.title ?? '',
        description: n.body ?? '',
        image: '',
        date: n.date ?? '',
        category: n.tag ?? 'Novedad',
      }))
  } finally {
    clearTimeout(timeout)
  }
}
