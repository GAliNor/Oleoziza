# Wayfinder tracker (local markdown)

- `map.md` is the map (label `wayfinder:map`).
- `tickets/NNNN-slug.md` are its child tickets; the number is the ticket id.
- Frontmatter fields: `title`, `label` (`wayfinder:research|prototype|grilling|task`), `status` (`open|closed`), `assignee` (empty = unclaimed), `blocked-by` (ticket ids; native-blocking fallback).
- Frontier = `status: open`, empty `assignee`, every `blocked-by` ticket closed.
- Resolution: append a `## Resolution` section, set `status: closed`, add a line to the map's Decisions so far.
- Assets are linked from the ticket, never pasted in.
