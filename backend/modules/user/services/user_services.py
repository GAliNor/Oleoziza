from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.integrations.celery.celery_publisher import publish_task
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.helpers.auth_identifiers import normalize_identifier
from modules.auth.models.auth_models import Credential
from modules.auth.services.auth_services import AuthService
from modules.auth.services.invitation_services import InvitationService
from modules.auth.types.auth_types import SEND_INVITATION_TASK, CredentialKind
from modules.site.models.site_models import Site
from modules.user.business.staff_users import build_staff_user
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from modules.user.types.user_types import (
    LoginMethod,
    Permission,
    Role,
    StaffRole,
    StaffStatusChange,
    StaffUserCreateIn,
    StaffUserOut,
    Title,
    UserStatus,
)


PHONE_METHODS = (LoginMethod.PHONE_PIN, LoginMethod.PHONE_OTP)


class UserService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the Management User acting on staff accounts.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

    def list_staff(self) -> list[StaffUserOut]:
        """
        List the staff Users (Management, Operators, Accountants) the actor may manage for the Users page: everyone for the Owner, otherwise those assigned to one of the actor's user.manage Sites (rules A3 and A6).

        Returns:
            list[StaffUserOut]: Staff Users, by last then first name.

        Raises:
            RefusedError: users_forbidden without user.manage on any Site.
        """
        manageable_site_ids = self._get_manageable_site_ids()
        if not manageable_site_ids:
            raise RefusedError("users_forbidden", 403)
        query = select(User).where(User.role != Role.CLIENT)
        if not self.current_user.is_owner:
            assigned_user_ids = select(SiteAssignment.user_id).where(SiteAssignment.site_id.in_([UUID(site_id) for site_id in manageable_site_ids]))
            query = query.where(User.id.in_(assigned_user_ids))
        users = self.db.scalars(query.order_by(User.last_name, User.first_name)).all()
        return [self._build_staff_user(user) for user in users]

    def create_staff_user(self, payload: StaffUserCreateIn) -> StaffUserOut:
        """
        Create a staff User on the actor's Sites, either with a first secret they must change or with an Invitation.

        Args:
            payload (StaffUserCreateIn): Role, names, contact, Sites with their Permissions, and access mode.

        Returns:
            StaffUserOut: The new User.

        Raises:
            RefusedError: names_required, contact_invalid, contact_required, identifier_taken, site_required, or a rights or secret refusal.
        """
        first_name, last_name = payload.first_name.strip(), payload.last_name.strip()
        if not first_name or not last_name:
            raise RefusedError("names_required", 422)
        phone = self._normalize_contact(payload.phone)
        email = self._normalize_contact(payload.email)
        if phone is None and email is None:
            raise RefusedError("contact_required", 422)
        self._check_identifiers_free(phone, email)
        location = payload.location
        if not payload.sites:
            raise RefusedError("site_required", 422)
        for site_id, permissions in payload.sites.items():
            self._check_can_grant(site_id, permissions)
        login_method = LoginMethod.PHONE_PIN if payload.role == StaffRole.OPERATOR or email is None else LoginMethod.EMAIL_PASSWORD
        if login_method == LoginMethod.PHONE_PIN and phone is None:
            raise RefusedError("contact_required", 422)
        credential_kind = CredentialKind.PIN if login_method == LoginMethod.PHONE_PIN else CredentialKind.PASSWORD
        if not payload.is_invited and not AuthService(self.db).is_secret_strong_enough(credential_kind, payload.first_secret or ""):
            raise RefusedError("invalid_first_secret", 422)
        user = User(
            role=Role(payload.role.value),
            title=payload.title,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email,
            province_id=(location.province or None) if location else None,
            city=(location.city.strip() or None) if location else None,
            address=(location.address.strip() or None) if location else None,
            status=UserStatus.INVITED if payload.is_invited else UserStatus.ACTIVE,
            must_change_credential=not payload.is_invited,
            created_by_id=self.current_user.id,
        )
        self.db.add(user)
        self.db.flush()
        self.db.add(UserLoginMethod(user_id=user.id, method=login_method, created_by_id=self.current_user.id))
        if not payload.is_invited:
            self.db.add(Credential(user_id=user.id, kind=credential_kind, hash=hash_secret(payload.first_secret or ""), created_by_id=self.current_user.id))
        for site_id, permissions in payload.sites.items():
            self._write_site_permissions(user.id, site_id, permissions)
        invitation = InvitationService(self.db).create_invitation(user, self.current_user.id) if payload.is_invited else None
        record_audit_event(self.db, self.current_user.id, "user.created", entity_type="user", entity_id=user.id, after={"role": user.role.value, "isInvited": payload.is_invited})
        self.db.commit()
        if invitation:
            publish_task(SEND_INVITATION_TASK, str(invitation[0].id), invitation[1])
        return self._build_staff_user(user)

    def set_site_permissions(self, user_id: UUID, site_id: UUID, permissions: list[Permission] | None) -> StaffUserOut:
        """
        Give a staff User a Site with its Permissions, change them, or take the Site away (None), keeping at least one Site.

        Args:
            user_id (UUID): User changed.
            site_id (UUID): Site concerned.
            permissions (list[Permission] | None): New Permissions, or None to remove the Site.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: user_locked, site_forbidden, permission_not_held, last_site.
        """
        user = self._get_editable_user(user_id)
        if permissions is None:
            if not self._can_manage_site(site_id):
                raise RefusedError("site_forbidden", 403)
            site_count = self.db.scalar(select(func.count()).select_from(SiteAssignment).where(SiteAssignment.user_id == user.id))
            if site_count <= 1:
                raise RefusedError("last_site")
            self._delete_site_assignment(user.id, site_id)
        else:
            self._check_can_grant(site_id, permissions)
            self._delete_site_assignment(user.id, site_id)
            self._write_site_permissions(user.id, site_id, permissions)
        record_audit_event(self.db, self.current_user.id, "user.site_permissions_set", site_id=site_id, entity_type="user", entity_id=user.id, after={"permissions": [permission.value for permission in permissions] if permissions is not None else None})
        self.db.commit()
        return self._build_staff_user(user)

    def set_login_methods(self, user_id: UUID, login_methods: list[LoginMethod]) -> StaffUserOut:
        """
        Choose how a staff User may log in, keeping at least one method that matches their phone or email.

        Args:
            user_id (UUID): User changed.
            login_methods (list[LoginMethod]): Allowed methods.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: user_locked, last_login_method, method_needs_identifier.
        """
        user = self._get_managed_user(user_id)
        methods = list(dict.fromkeys(login_methods))
        if not methods:
            raise RefusedError("last_login_method")
        needs_phone = any(method in PHONE_METHODS for method in methods)
        needs_email = LoginMethod.EMAIL_PASSWORD in methods
        if (needs_phone and not user.phone) or (needs_email and not user.email):
            raise RefusedError("method_needs_identifier", 422)
        self.db.execute(delete(UserLoginMethod).where(UserLoginMethod.user_id == user.id))
        for method in methods:
            self.db.add(UserLoginMethod(user_id=user.id, method=method, created_by_id=self.current_user.id))
        record_audit_event(self.db, self.current_user.id, "user.login_methods_set", entity_type="user", entity_id=user.id, after={"loginMethods": [method.value for method in methods]})
        self.db.commit()
        return self._build_staff_user(user)

    def set_title(self, user_id: UUID, title: Title | None) -> StaffUserOut:
        """
        Set or clear the civility printed before a staff User's name; the Owner may also set their own (rule A5).

        Args:
            user_id (UUID): User changed.
            title (Title | None): New civility, None to clear it.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: user_not_found, user_locked, site_forbidden.
        """
        is_owner_self = self.current_user.is_owner and user_id == self.current_user.id
        user = self.db.get(User, user_id) if is_owner_self else self._get_managed_user(user_id)
        if user is None:
            raise RefusedError("user_not_found", 404)
        before = user.title.value if user.title else None
        user.title = title
        user.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "user.title_set", entity_type="user", entity_id=user.id, before={"title": before}, after={"title": title.value if title else None})
        self.db.commit()
        return self._build_staff_user(user)

    def set_status(self, user_id: UUID, status: StaffStatusChange) -> StaffUserOut:
        """
        Disable a staff User, logging them out at their next refresh, or enable them again.

        Args:
            user_id (UUID): User changed.
            status (StaffStatusChange): active or disabled.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: user_locked.
        """
        user = self._get_managed_user(user_id)
        if status == StaffStatusChange.DISABLED:
            user.status = UserStatus.DISABLED
            user.disabled_at = datetime.now(timezone.utc)
            user.token_version += 1
        else:
            user.status = UserStatus.ACTIVE if user.last_login_at or self._has_credential(user.id) else UserStatus.INVITED
            user.disabled_at = None
        user.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "user.status_set", entity_type="user", entity_id=user.id, after={"status": user.status.value})
        self.db.commit()
        return self._build_staff_user(user)

    def send_invitation(self, user_id: UUID) -> StaffUserOut:
        """
        Send a new Invitation to a staff User who has not chosen their secret yet.

        Args:
            user_id (UUID): Invited User.

        Returns:
            StaffUserOut: The User, with the new invitation date.

        Raises:
            RefusedError: user_locked, not_invited when the User is not waiting for an Invitation.
        """
        user = self._get_managed_user(user_id)
        if user.status != UserStatus.INVITED:
            raise RefusedError("not_invited")
        self._invite(user, "user.invitation_sent")
        return self._build_staff_user(user)

    def reset_credential(self, user_id: UUID) -> None:
        """
        Send an active staff User a link to choose a new secret, the way an Invitation does.

        Args:
            user_id (UUID): User whose secret is reset.

        Raises:
            RefusedError: user_locked, not_active when the User is not active.
        """
        user = self._get_managed_user(user_id)
        if user.status != UserStatus.ACTIVE:
            raise RefusedError("not_active")
        self._invite(user, "user.credential_reset")

    def _invite(self, user: User, action: str) -> None:
        """
        Create an Invitation, record it, commit, then publish its sending to the worker.

        Args:
            user (User): User receiving the link.
            action (str): Audit action to record.
        """
        invitation, token = InvitationService(self.db).create_invitation(user, self.current_user.id)
        record_audit_event(self.db, self.current_user.id, action, entity_type="user", entity_id=user.id, after={"channel": invitation.channel.value})
        self.db.commit()
        publish_task(SEND_INVITATION_TASK, str(invitation.id), token)

    def _get_manageable_site_ids(self) -> set[str]:
        """
        List the Sites where the actor may manage staff: every active Site for the Owner.

        Returns:
            set[str]: Site ids, as text.
        """
        if self.current_user.is_owner:
            return {str(site_id) for site_id in self.db.scalars(select(Site.id))}
        return {site_id for site_id, permissions in self.current_user.permissions_by_site.items() if Permission.USER_MANAGE.value in permissions}

    def _can_manage_site(self, site_id: UUID) -> bool:
        """
        Tell whether the actor may manage staff on a Site.

        Args:
            site_id (UUID): Site to check.

        Returns:
            bool: True when allowed.
        """
        return str(site_id) in self._get_manageable_site_ids()

    def _check_can_grant(self, site_id: UUID, permissions: list[Permission]) -> None:
        """
        Refuse a Site the actor cannot manage, or a Permission the actor does not hold there.

        Args:
            site_id (UUID): Site concerned.
            permissions (list[Permission]): Permissions to give.

        Raises:
            RefusedError: site_forbidden, permission_not_held.
        """
        if self.db.get(Site, site_id) is None or not self._can_manage_site(site_id):
            raise RefusedError("site_forbidden", 403)
        if any(not self.current_user.has_permission(site_id, permission.value) for permission in permissions):
            raise RefusedError("permission_not_held", 403)

    def _get_editable_user(self, user_id: UUID) -> User:
        """
        Load a staff User the actor may change: never the Owner, never the actor themselves.

        Args:
            user_id (UUID): User to change.

        Returns:
            User: The User.

        Raises:
            RefusedError: user_not_found, user_locked.
        """
        user = self.db.get(User, user_id)
        if user is None or user.role == Role.CLIENT:
            raise RefusedError("user_not_found", 404)
        if user.is_owner or user.id == self.current_user.id:
            raise RefusedError("user_locked", 403)
        return user

    def _get_managed_user(self, user_id: UUID) -> User:
        """
        Load an editable staff User assigned to at least one Site the actor manages.

        Args:
            user_id (UUID): User to change.

        Returns:
            User: The User.

        Raises:
            RefusedError: user_not_found, user_locked, site_forbidden.
        """
        user = self._get_editable_user(user_id)
        user_site_ids = {str(site_id) for site_id in self.db.scalars(select(SiteAssignment.site_id).where(SiteAssignment.user_id == user.id))}
        if not user_site_ids & self._get_manageable_site_ids():
            raise RefusedError("site_forbidden", 403)
        return user

    def _normalize_contact(self, raw_contact: str | None) -> str | None:
        """
        Normalize an optional phone or email, refusing one typed but invalid.

        Args:
            raw_contact (str | None): Contact as typed.

        Returns:
            str | None: Normalized contact, or None when left empty.

        Raises:
            RefusedError: contact_invalid.
        """
        if raw_contact is None or not raw_contact.strip():
            return None
        contact = normalize_identifier(raw_contact)
        if contact is None:
            raise RefusedError("contact_invalid", 422)
        return contact

    def _check_identifiers_free(self, phone: str | None, email: str | None) -> None:
        """
        Refuse a phone or email another User already logs in with.

        Args:
            phone (str | None): Normalized phone.
            email (str | None): Normalized email.

        Raises:
            RefusedError: identifier_taken.
        """
        conditions = [column == value for column, value in ((User.phone, phone), (User.email, email)) if value is not None]
        if self.db.scalar(select(User.id).where(or_(*conditions)).limit(1)) is not None:
            raise RefusedError("identifier_taken")

    def _write_site_permissions(self, user_id: UUID, site_id: UUID, permissions: list[Permission]) -> None:
        """
        Add a Site Assignment with one row per Permission.

        Args:
            user_id (UUID): User assigned.
            site_id (UUID): Site given.
            permissions (list[Permission]): Permissions held there.
        """
        assignment = SiteAssignment(user_id=user_id, site_id=site_id, created_by_id=self.current_user.id)
        self.db.add(assignment)
        self.db.flush()
        for permission in dict.fromkeys(permissions):
            self.db.add(SiteAssignmentPermission(site_assignment_id=assignment.id, permission=permission, created_by_id=self.current_user.id))

    def _delete_site_assignment(self, user_id: UUID, site_id: UUID) -> None:
        """
        Remove a User's assignment to a Site with its Permissions.

        Args:
            user_id (UUID): User concerned.
            site_id (UUID): Site taken away.
        """
        assignment_ids = select(SiteAssignment.id).where(SiteAssignment.user_id == user_id, SiteAssignment.site_id == site_id)
        self.db.execute(delete(SiteAssignmentPermission).where(SiteAssignmentPermission.site_assignment_id.in_(assignment_ids)))
        self.db.execute(delete(SiteAssignment).where(SiteAssignment.user_id == user_id, SiteAssignment.site_id == site_id))
        self.db.flush()

    def _has_credential(self, user_id: UUID) -> bool:
        """
        Tell whether a User already has a PIN or password.

        Args:
            user_id (UUID): User to check.

        Returns:
            bool: True when a Credential exists.
        """
        return self.db.scalar(select(Credential.id).where(Credential.user_id == user_id).limit(1)) is not None

    def _build_staff_user(self, user: User) -> StaffUserOut:
        """
        Shape a staff User for the Users page; a manager who is not the Owner sees only the Sites they manage.

        Args:
            user (User): User to show.

        Returns:
            StaffUserOut: The User as the front reads it.
        """
        return build_staff_user(self.db, user, None if self.current_user.is_owner else self._get_manageable_site_ids())


def get_user_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> UserService:
    """
    Build the user service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        UserService: Service bound to the session and actor.
    """
    return UserService(db, current_user)
