import * as fs from 'fs'
import * as path from 'path'

/**
 * Persists a set of message IDs we have already notified about to a local
 * JSON file in the OpenClaw workspace. This is the authoritative source for
 * "seen" state because the AgentMail label PATCH does not reliably persist.
 */
export class SeenStore {
  private seenIds: Set<string> = new Set()
  private readonly filePath: string

  constructor(workspaceDir: string) {
    this.filePath = path.join(workspaceDir, 'seen-ids.json')
  }

  load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        const ids = JSON.parse(raw) as string[]
        this.seenIds = new Set(ids)
      }
    } catch {
      this.seenIds = new Set()
    }
  }

  has(id: string): boolean {
    return this.seenIds.has(id)
  }

  add(id: string): void {
    this.seenIds.add(id)
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify([...this.seenIds], null, 2))
    } catch {
      // best-effort — in-memory set still prevents duplicate notifications
    }
  }
}
