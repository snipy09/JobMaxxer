# Tool Invocation & Naming Guidelines

CRITICAL: All tool names in Claude Code are case-sensitive and must be called with their exact PascalCase names. Never use lowercase or alternative tool names.

- To read files / memory: Use `Read` (NEVER `read`, `view_file`, or `cat`)
- To write new files: Use `Write` (NEVER `write`)
- To edit existing files: Use `Edit` (NEVER `edit` or `str_replace`)
- To find files by pattern: Use `Glob` (NEVER `glob` or `find`)
- To search file contents: Use `Grep` (NEVER `grep` or `search`)
- To execute shell commands on Windows: Use `PowerShell` (NEVER `powershell` or `bash`)
- To manage notebook cells: Use `NotebookEdit`
- To plan and manage tasks: Use `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`
- To coordinate agents: Use `SendMessage`, `ListAgents`
