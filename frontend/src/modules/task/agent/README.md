# Task

## Business
Management's To-do page and the shell's badge: what waits on the person, grouped as decide, money, follow.

## Exposes
- Store `useTaskStore`: `tasks`, `fetchTasks(siteId)` (one request, `cachedLoad('tasks:<siteId>')`, 60 s), `markStale()`.
- Composable `useTasks()`: `tasks`, `groups`, `load()`.
- Service: `TaskService.getTasks` → `GET /api/task/tasks`; the mock derives the same tasks from the module stores (`deriveTasks`, `loadTaskSources`).

## Rules and gotchas
- Stores that settle a task (Payment decided, Refund made or confirmed, Discount decided) invalidate `tasks:` rather than importing the task store (it would loop through the mock).
