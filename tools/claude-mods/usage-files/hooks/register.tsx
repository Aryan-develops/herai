import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { FileRow, ModelRow } from '../types'
import { addFile, addUsage, compact, fileOf, groupByFolder } from './tally'

const PANE = 'usage-files'
const models = atom({ plugin: 'usage-files', key: 'models' } as const, {} as Record<string, ModelRow>)
const files = atom({ plugin: 'usage-files', key: 'files' } as const, {} as Record<string, FileRow>)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'usage-files', description: 'Per-model usage and files touched this session' })
    return next(e)
  })

  on('command.run', { command: 'usage-files' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Usage and files' })
    return { text: 'Usage and files pane opened.' }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.usage) await update($, models, m => addUsage(m, { ...e.usage! }))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const hit = fileOf(e.tool, e as unknown as Record<string, unknown>)
    if (hit) await update($, files, f => addFile(f, hit.path, hit.isEdit, Date.now()))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const m = Object.entries(await read($, models)).sort((a, b) => b[1].output - a[1].output)
    const groups = groupByFolder(await read($, files), process_cwd(e))
    const room = Math.max(4, (e.viewport?.rows ?? 30) - 6 - m.length)
    let left = room

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>Usage by model</Text>
          {m.length === 0 && <Text dimColor>No completed turns yet.</Text>}
          {m.map(([name, r]) => (
            <Text>
              {name.padEnd(24)} in {compact(r.input).padStart(6)}  out {compact(r.output).padStart(6)}  cache r {compact(r.cacheRead).padStart(6)} w {compact(r.cacheWrite).padStart(6)}  {r.turns} turns
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold>Files this session</Text>
          {groups.length === 0 && <Text dimColor>No files touched yet.</Text>}
          {groups.map(g => {
            if (left <= 1) return null
            left -= 1
            const shown = g.files.slice(0, Math.max(0, left))
            left -= shown.length
            return (
              <Box flexDirection="column">
                <Text color="cyan">{g.dir}/</Text>
                {shown.map(f => (
                  <Text dimColor={f.edits === 0}>
                    {'  '}{f.edits > 0 ? 'M' : ' '} {f.path}{f.edits > 0 ? `  x${f.edits}` : ''}{f.reads > 0 ? `  read x${f.reads}` : ''}
                  </Text>
                ))}
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}

const process_cwd = (e: { cwd?: string }): string => e.cwd ?? ''
