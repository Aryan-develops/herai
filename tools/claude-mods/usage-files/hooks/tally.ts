import type { FileRow, ModelRow } from '../types'

export const empty = (): ModelRow => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 })

export type Usage = {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export function addUsage(models: Record<string, ModelRow>, u: Usage): Record<string, ModelRow> {
  const row = models[u.model] ?? empty()
  return {
    ...models,
    [u.model]: {
      input: row.input + u.input_tokens,
      output: row.output + u.output_tokens,
      cacheRead: row.cacheRead + u.cache_read_input_tokens,
      cacheWrite: row.cacheWrite + u.cache_creation_input_tokens,
      turns: row.turns + 1,
    },
  }
}

const EDITS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const READS = new Set(['Read'])

export function fileOf(tool: string, input: Record<string, unknown>): { path: string; isEdit: boolean } | null {
  const path = (input.file_path ?? input.notebook_path) as unknown
  if (typeof path !== 'string' || !path) return null
  if (EDITS.has(tool)) return { path, isEdit: true }
  if (READS.has(tool)) return { path, isEdit: false }
  return null
}

export function addFile(files: Record<string, FileRow>, path: string, isEdit: boolean, at: number): Record<string, FileRow> {
  const row = files[path] ?? { path, edits: 0, reads: 0, at }
  return { ...files, [path]: { ...row, edits: row.edits + (isEdit ? 1 : 0), reads: row.reads + (isEdit ? 0 : 1), at } }
}

export const compact = (n: number): string =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)

export type Group = { dir: string; files: FileRow[] }

/** Folders with edits first, then by most recent touch; files edited before files only read. */
export function groupByFolder(files: Record<string, FileRow>, cwd: string): Group[] {
  const rel = (p: string) => (cwd && p.startsWith(cwd + '/') ? p.slice(cwd.length + 1) : p)
  const by = new Map<string, FileRow[]>()
  for (const f of Object.values(files)) {
    const r = rel(f.path)
    const i = r.lastIndexOf('/')
    const dir = i < 0 ? '.' : r.slice(0, i)
    by.set(dir, [...(by.get(dir) ?? []), { ...f, path: i < 0 ? r : r.slice(i + 1) }])
  }
  const groups = [...by].map(([dir, fs]) => ({
    dir,
    files: fs.sort((a, b) => Number(b.edits > 0) - Number(a.edits > 0) || b.at - a.at),
  }))
  const score = (g: Group) => [g.files.some(f => f.edits > 0) ? 1 : 0, Math.max(...g.files.map(f => f.at))]
  return groups.sort((a, b) => score(b)[0] - score(a)[0] || score(b)[1] - score(a)[1])
}
