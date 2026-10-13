export type ModelRow = { input: number; output: number; cacheRead: number; cacheWrite: number; turns: number }
export type FileRow = { path: string; edits: number; reads: number; at: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-files': { models: Record<string, ModelRow>; files: Record<string, FileRow> }
  }
}
