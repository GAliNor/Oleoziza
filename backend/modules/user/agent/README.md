# User

## Business
Staff [Users](../../../../GLOSSARY.md) (Management, Operators, Accountants; the Owner is Management with the Owner flag), their [Site Assignments](../../../../GLOSSARY.md) with [Permissions](../../../../GLOSSARY.md) per Site, their [Login Methods](../../../../GLOSSARY.md) and status. Clients are Users too, managed from the `client` module later.

## Exposes
- Endpoints (`/api/user`, `user.manage` on the Sites concerned):
  - `GET ""`: the staff list for the Users page.
  - `POST ""`: create a staff User with a first secret to change, or with an Invitation.
  - `PUT /{user_id}/sites/{site_id}`, `DELETE /{user_id}/sites/{site_id}`: give, change or take away a Site and its Permissions.
  - `PUT /{user_id}/login-methods`, `PUT /{user_id}/status`.
  - `POST /{user_id}/invitation`, `POST /{user_id}/reset`: send a new Invitation or a reset link.
- Services: `UserService`. Publishes `auth.send_invitation` by name.

## Refusal codes
- `user_not_found` (404); `users_forbidden`, `site_forbidden`, `permission_not_held`, `user_locked` (403).
- `names_required`, `contact_required`, `contact_invalid`, `site_required`, `method_needs_identifier`, `invalid_first_secret` (422).
- `identifier_taken`, `last_site`, `last_login_method`, `not_active`, `not_invited` (409).

## Rules and gotchas
- An actor only grants Permissions they hold, on Sites they hold.
- Disabling a User bumps `token_version`: they are signed out at their next refresh.
- Default Permissions per Role are in `constants/user_constants.py` (`ACCOUNTANT_DEFAULT_PERMISSIONS` includes `expense.record`).
- `service` is 466 lines: split by use case (Site Permissions, login methods) when next touched.
- Models: User, UserLoginMethod, SiteAssignment, SiteAssignmentPermission.
