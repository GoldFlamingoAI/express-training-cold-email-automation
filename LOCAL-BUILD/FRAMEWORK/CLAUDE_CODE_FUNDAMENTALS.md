# Claude Code Fundamentals

Reference doc covering how Claude Code (CC) actually operates — single working directory, cross-repo access patterns, and clone conventions.

---

## Claude Code Has One Working Directory

CC operates in one working directory at a time. It has no ambient awareness of other repos and will not automatically watch or read files outside its current directory.

---

## Cross-Repo Access — What IS Possible

| Method | How It Works | When to Use |
|--------|-------------|-------------|
| **Local filesystem** | Both repos cloned locally. Tell CC explicitly: `"read ../claude-project-framework/DIVISION_OF_LABOR.md"` | Best option for this workflow |
| **GitHub MCP** | The GitHub MCP server fetches file contents from any repo you have access to, on demand | Good when you don't want local clones |
| **Git submodule** | Embed the framework repo inside your project repo. CC sees it as local files | Overkill for most use cases |
| **Manual context** | Paste the relevant doc into the conversation | Low-tech but always reliable |

**Practical recommendation:** Clone both repos locally. When you're in a project session and want CC to cross-reference the framework, say:

> "Read the relevant section from `../claude-project-framework/DIVISION_OF_LABOR.md`"

CC can reach any file on your machine — it just won't do it automatically.

---

## Clone Convention

Pick one parent directory and always clone there:

```
~/projects/
├── my-project/
├── claude-project-framework/
└── future-repo/
```

This makes cross-repo paths predictable every time: `../claude-project-framework/` instead of hunting for it.

**Add to your bootstrap checklist:** Always clone repos to `~/projects/`

---

## Summary

- CC = one working directory, no automatic cross-repo awareness
- Local clones + explicit paths = the most reliable cross-repo pattern
- Consistent clone location (`~/projects/`) makes every path predictable
