# usage-files

Claude Code mod. Run `/usage-files` to open a pane with:

- tokens per model (input, output, cache read/write, turns), including subagent turns
- files touched this session, grouped by folder; edited files and folders first

Use it with `claude --plugin-dir tools/claude-mods/usage-files`. Tests: `claude plugin test tools/claude-mods/usage-files`.
