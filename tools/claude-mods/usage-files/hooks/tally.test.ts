import { test, expect } from 'claude-code/testing'

import { addFile, addUsage, fileOf, groupByFolder } from './tally'

const u = (model: string, o: number) => ({ model, input_tokens: 10, output_tokens: o, cache_read_input_tokens: 5, cache_creation_input_tokens: 1 })

test('usage is summed per model', () => {
  let m = addUsage({}, u('a', 3))
  m = addUsage(m, u('a', 4))
  m = addUsage(m, u('b', 1))
  expect(m.a.output).toBe(7)
  expect(m.a.turns).toBe(2)
  expect(m.b.turns).toBe(1)
})

test('only file tools count, edits tracked apart from reads', () => {
  expect(fileOf('Bash', { command: 'ls' })).toBe(null)
  expect(fileOf('Read', { file_path: '/r/a.ts' })).toEqual({ path: '/r/a.ts', isEdit: false })
  expect(fileOf('Edit', { file_path: '/r/a.ts' })?.isEdit).toBe(true)
})

test('folders with edits come first, paths made relative', () => {
  let f = addFile({}, '/r/docs/x.md', false, 5)
  f = addFile(f, '/r/src/a.ts', true, 1)
  const g = groupByFolder(f, '/r')
  expect(g[0].dir).toBe('src')
  expect(g[1].files[0].path).toBe('x.md')
})
