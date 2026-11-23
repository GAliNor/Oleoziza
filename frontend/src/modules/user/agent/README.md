# User

## Business
The Users page of Management: staff [Users](../../../../../GLOSSARY.md) (Management, Operators, Accountants; the Owner is Management with the Owner flag), their civility, their [Site Assignments](../../../../../GLOSSARY.md) with [Permissions](../../../../../GLOSSARY.md) per Site, their [Login Methods](../../../../../GLOSSARY.md) and status.

## Exposes
- View: `/users` → `views/entry.vue`: list or teams of the staff on the current Site (or every Site), filters by role and status, `?user=<id>` opens a User's detail, `?user=new` the creation form.
- Components: `user-form` (creation: role, civility, names, contact, Sites, first code or Invitation), `user-detail` made of `ui-section`s: `user-profile` (properties edited in place, ownership), `user-access` (Login Methods, status, first secret) and `user-site-rights`, `user-table`, `user-teams`.
- Store: `useUserStore`: `users`, `saveErrorCode`; actions `fetchUsers`, `create`, profile, role, secret and ownership changes, `setSitePermissions`, `setLoginMethods`, `setStatus`, `sendInvitation`, `resetCredential`.
- Service: `UserService` (`/user`), with `user.mock.ts` while the module is mocked.
- Composables: `useUserRights` (who may edit or grant what: `canEditProfile`, `canOwn`, `canSetOwnership`), `useContactCheck` (a phone or email already used, said while typing; also used by Clients), `userErrorMessage`, `useTitleOptions` (civility choices for a `ui-select`).

## Rules and gotchas
- Civility values are the backend's English codes (`mr`, `mrs`, `dr`, `prof`, `counsel`, `hajj`, `hajja`, list in `global/constants/title.ts`); labels live under `global.titles` because the session greeting uses them too.
- Only an Owner changes a role, sets a secret directly or gives and withdraws ownership; non-Owners never touch an Owner. A staff User has no address.
- The Owner has no Site Assignment: the backend lists them on every active Site with every Permission, so the Site-scoped list shows them.
- A changed civility reaches the signed-in User's greeting at their next token refresh, since it rides in the access token.
