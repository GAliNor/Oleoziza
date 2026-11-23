# Task

## Business
Management's To-do page and the shell's badge: what waits on the person, grouped as decide, money, follow.

## Exposes
- Store `useTaskStore`: `tasks`, `fetchTasks(siteId)` (one request, `cachedLoad('tasks:<siteId>')`, 60 s), `markStale()`.
- Composable `useTasks()`: `tasks`, `groups`, `load()`.
- Service: `TaskService.getTasks` → `GET /api/task/tasks`; the mock derives the same tasks from the module stores (`deriveTasks`, `loadTaskSources`).

## Rules and gotchas
- Stores that settle a task (Payment decided, Refund made or confirmed, Discount decided) invalidate `tasks:` rather than importing the task store (it would loop through the mock).
- « Client à relancer » gets its link from `withClientTaskLinks` (`composables/client-task-links.ts`), applied by the store to API answers and by `deriveTasks` to mock ones: Recouvrement on the Client (`/debts?client=`) for `debt.follow`, else the Client page; with `payment.record` too, an « Encaisser » shortcut (`task.action`, `/debts?client=&pay=1`) that opens the payment form at once.
- `expense-due` speaks through `task-text.ts` (category, days left, red once late); the shell counts them as the Charges badge too (`app-layout.vue`), and the Charges page reloads the Tasks when what is to pay changes.
