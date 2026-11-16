# Auth

## Business
Signs [Users](../../../../GLOSSARY.md) in with their [Login Methods](../../../../GLOSSARY.md) (phone + PIN, email + password; phone + one-time code later), keeps them signed in, and lets Management bring new staff in through an [Invitation](../../../../GLOSSARY.md). Stateless: no session table.

## Exposes
- Endpoints (`/api/auth`, all public):
  - `POST /login-options`: the Login Methods a typed identifier may use.
  - `POST /login`: PIN or password; locks the User a while after too many wrong tries.
  - `POST /refresh`, `POST /logout`: rotate or drop the refresh cookie `refresh_token_<user id>` (the front sends the user id).
  - `PUT /credential`, `POST /credential/skip`: set a new PIN or password (current one required unless the change is forced), or keep the first one once.
  - `GET /invitations/{token}`, `POST /invitations/{token}/accept`: read an Invitation, choose a secret and sign in.
- Services: `AuthService.open_session` (used by Invitation acceptance), `InvitationService.create_invitation` (used by `user`).
- Tasks: `auth.send_invitation` (`SEND_INVITATION_TASK`): sends the Invitation by email, or SMS without one; retried while the mail server is down. Published by `user` through `publish_task`.

## Refusal codes
`AuthError`, answered as `{"code": ...}`:
- `invalid_credential` (401/400): wrong PIN or password, or a new secret too weak.
- `invalid_identifier` (400), `unknown_identifier` (404): the typed phone or email.
- `method_not_allowed` (400/403): the Login Method isn't enabled for this User.
- `locked` (423, with `lockedUntil`), `disabled` (403).
- `session_expired` (401): refresh token missing, expired or revoked.
- `invalid_invitation` (404): unknown, used or expired Invitation token.

## Rules and gotchas
- Access token: ES256, 15 min, carries the Role, Owner flag and Permissions per Site; trusted on its signature (`core/security.py`). Refresh token: 30 days, rotated on every refresh, bound to `users.token_version`; bumping it revokes every device.
- Only the hash of an Invitation token is stored; the plain token travels in the message.
- `helpers/auth_cookies.py` imports FastAPI's `Request`/`Response`: the one accepted exception in the import-linter contracts.
- Models: Credential, OneTimeCode, Invitation.
