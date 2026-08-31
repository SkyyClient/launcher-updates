import fs from 'node:fs'
import path from 'node:path'
import type { DownloadTask } from '../../../src/types'
import { emitLog } from '../console'

type TaskListener = (task: DownloadTask) => void

const tasks = new Map<string, DownloadTask>()
const abortControllers = new Map<string, AbortController>()
const listeners: Set<TaskListener> = new Set()

export function subscribeToTasks(listener: TaskListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(task: DownloadTask) {
  listeners.forEach((listener) => listener(task))
}

function createTask(
  id: string,
  name: string,
  category: DownloadTask['category']
): DownloadTask {
  const task: DownloadTask = {
    id,
    name,
    current: 0,
    total: 1,
    status: 'queued',
    speed: 0,
    category,
  }
  tasks.set(id, task)
  notify(task)
  return task
}

export function getTasks(): DownloadTask[] {
  return Array.from(tasks.values())
}

export function cancelTask(id: string) {
  const controller = abortControllers.get(id)
  if (controller) {
    controller.abort()
    abortControllers.delete(id)
  }
  const task = tasks.get(id)
  if (task) {
    task.status = 'cancelled'
    notify(task)
  }
}

export function pauseTask(id: string) {
  const controller = abortControllers.get(id)
  if (controller) controller.abort()
  const task = tasks.get(id)
  if (task) task.status = 'paused'
}

export async function downloadFile(
  url: string,
  destPath: string,
  options: {
    taskId: string
    name: string
    category: DownloadTask['category']
    expectedSize?: number
    onProgress?: (received: number, total: number) => void
  }
): Promise<void> {
  const { taskId, name, category } = options

  fs.mkdirSync(path.dirname(destPath), { recursive: true })

  if (abortControllers.has(taskId)) {
    // Reuse the existing task if it exists
  }

  const existTask = tasks.get(taskId)
  let task: DownloadTask
  if (existTask && existTask.status === 'downloading') {
    task = existTask
  } else {
    task = createTask(taskId, name, category)
  }

  const controller = new AbortController()
  abortControllers.set(taskId, controller)

  try {
    task.status = 'downloading'
    task.current = 0
    task.total = options.expectedSize ?? 0
    notify(task)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'skyy-client/1.0' },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }

    if (!res.body) {
      throw new Error('Response body is empty')
    }

    const total = options.expectedSize ?? Number(res.headers.get('content-length') ?? 0)
    task.total = total

    const reader = res.body.getReader()
    const fileStream = fs.createWriteStream(destPath)
    let received = 0
    let lastChunkTime = Date.now()
    let lastChunkBytes = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      received += value.byteLength
      if (!fileStream.write(Buffer.from(value))) {
        await new Promise<void>((resolve) => {
          fileStream.once('drain', resolve)
        })
        task.current = received
        task.total = total
        notify(task)
        options.onProgress?.(received, total)
      }

      const now = Date.now()
      if (now - lastChunkTime >= 500) {
        const dt = (now - lastChunkTime) / 1000
        task.speed = (received - lastChunkBytes) / dt
        task.current = received
        task.total = total
        lastChunkTime = now
        lastChunkBytes = received
        notify(task)
        options.onProgress?.(received, total)
      }
    }

    task.current = received
    task.total = total
    task.speed = 0
    // Await the stream flushing to disk before the caller reads the file.
    await new Promise<void>((resolve, reject) => {
      fileStream.once('finish', resolve)
      fileStream.once('error', reject)
      fileStream.end()
    })
    task.status = 'completed'
    abortControllers.delete(taskId)
    notify(task)
  } catch (error) {
    if (controller.signal.aborted) {
      task.status = task.status === 'paused' ? 'paused' : 'cancelled'
    } else {
      task.status = 'error'
      emitLog('ERROR', `Download failed for ${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
    notify(task)
    abortControllers.delete(taskId)
    throw error
  }
}

export { downloadFile as download }
