# User

## Business
Staff [Users](../../../../GLOSSARY.md) (Management, Operators, Accountants; the Owner is Management with the Owner flag), their [Site Assignments](../../../../GLOSSARY.md) with [Permissions](../../../../GLOSSARY.md) per Site, their [Login Methods](../../../../GLOSSARY.md) and status. Clients are Users too, managed from the `client` module later.

## Exposes
- Endpoints (`/api/user`, `user.manage` on the Sites concerned):
  - `GET ""`: the staff list for the Users page: every staff User for the Owner; otherwise only those assigned to one of the actor's `user.manage` Sites, each showing only those Sites (rules A3, A6). The Owner's own row lists every active Site with every Permission, though they have no Site Assignment.
  - `POST ""`: create a staff User, with an optional `title` (civility), and a first secret to change or an Invitation.
  - `PUT /{user_id}/profile` (names, civility, phone, email); Owner only: `PUT …/role` (resets every Site's Permissions, signs out), `PUT …/secret` (a first secret to change, signs out), `PUT …/ownership` (signs out; never the last active Owner's).
  - `GET /contact-check?phone=|email=`: who already uses it (the name, or an empty one when it may not be shown).
  - `PUT /{user_id}/title` `{title}` (`null` clears it): change a staff User's civility; the Owner may also set their own.
  - `PUT /{user_id}/sites/{site_id}`, `DELETE /{user_id}/sites/{site_id}`: give, change or take away a Site and its Permissions.
  - `PUT /{user_id}/login-methods`, `PUT /{user_id}/status`.
  - `POST /{user_id}/invitation`, `POST /{user_id}/reset`: send a new Invitation or a reset link.
- Services: `UserService`, `UserProfileService` (`user_profile_services.py`). Publishes `auth.send_invitation` by name.
- Business: `build_staff_user(db, user, visible_site_ids)` and `list_site_permissions(db, user)` in `business/staff_users.py`.

## Refusal codes
- `user_not_found` (404); `users_forbidden`, `site_forbidden`, `permission_not_held`, `user_locked`, `owner_only` (403).
- `names_required`, `contact_required`, `contact_invalid`, `site_required`, `method_needs_identifier`, `invalid_first_secret` (422).
- `phone_taken`, `email_taken`, `last_owner`, `owner_needs_management`, `last_site`, `last_login_method`, `not_active`, `not_invited` (409).

## Rules and gotchas
- An actor only grants Permissions they hold, on Sites they hold.
- Disabling a User bumps `token_version`: they are signed out at their next refresh.
- Default Permissions per Role are in `constants/user_constants.py` (`ACCOUNTANT_DEFAULT_PERMISSIONS` includes `expense.record`).
- `user_services.py` is 391 non-blank lines, near the split limit: split by use case (staff list, Site Permissions, login methods) when next touched. `list_staff` still reads Assignments, Login Methods and Invitations per User (3 queries a row).
- Models: User, UserLoginMethod, SiteAssignment, SiteAssignmentPermission.
- Several Owners may exist; withdrawals are serialized, so two at once can't leave none active. A staff User has no location.
