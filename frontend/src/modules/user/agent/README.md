# User

## Business
The Users page of Management: staff [Users](../../../../../GLOSSARY.md) (Management, Operators, Accountants; the Owner is Management with the Owner flag), their civility, their [Site Assignments](../../../../../GLOSSARY.md) with [Permissions](../../../../../GLOSSARY.md) per Site, their [Login Methods](../../../../../GLOSSARY.md) and status.

## Exposes
- View: `/users` → `views/entry.vue`: list or teams of the staff on the current Site (or every Site), filters by role and status, `?user=<id>` opens a User's detail, `?user=new` the creation form.
- Components: `user-form` (creation: role, civility, names, contact, Sites, first code or Invitation), `user-detail` (civility, contact, Login Methods, status, Permissions per Site), `user-table`, `user-teams`, `user-site-rights`, `user-location`.
- Store: `useUserStore`: `users`; actions `fetchUsers`, `create`, `setTitle`, `setSitePermissions`, `setLoginMethods`, `setStatus`, `setLocation`, `sendInvitation`, `resetCredential`.
- Service: `UserService` (`/user`), with `user.mock.ts` while the module is mocked.
- Composables: `useUserRights` (who may edit or grant what), `useTitleOptions` (civility choices for a `ui-select`).

## Rules and gotchas
- Civility values are the backend's English codes (`mr`, `mrs`, `dr`, `prof`, `counsel`, `hajj`, `hajja`, list in `global/constants/title.ts`); labels live under `global.titles` because the session greeting uses them too.
- Nobody edits the Owner or their own account (`canEdit`), except the Owner's own civility.
- The Owner has no Site Assignment: the backend lists them on every active Site with every Permission, so the Site-scoped list shows them.
- A changed civility reaches the signed-in User's greeting at their next token refresh, since it rides in the access token.
