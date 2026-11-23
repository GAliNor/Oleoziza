from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.models.auth_models import Credential
from modules.auth.services.auth_services import AuthService
from modules.auth.types.auth_types import CredentialKind
from modules.site.models.site_models import Site
from modules.site.types.site_types import SiteStatus
from modules.user.constants.user_constants import ROLE_DEFAULT_PERMISSIONS
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from modules.user.services.user_services import PHONE_METHODS, UserService
from modules.user.types.user_secret_types import SecretIn
from modules.user.types.user_types import ContactCheckOut, LoginMethod, OwnershipIn, Role, RoleIn, StaffProfileIn, StaffUserOut, UserStatus


LOGIN_METHOD_BY_KIND = {CredentialKind.PIN: LoginMethod.PHONE_PIN, CredentialKind.PASSWORD: LoginMethod.EMAIL_PASSWORD}


class UserProfileService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the Management User changing who a staff User is.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user
        self.users = UserService(db, current_user)

    def update_profile(self, user_id: UUID, payload: StaffProfileIn) -> StaffUserOut:
        """
        Change a staff User's civility, names, phone and email. An Owner also changes their own and another Owner's.

        Args:
            user_id (UUID): User changed.
            payload (StaffProfileIn): The profile.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: user_not_found, user_locked, site_forbidden, names_required, contact_invalid, contact_required, phone_taken, email_taken, method_needs_identifier.
        """
        user = self._get_profile_user(user_id)
        first_name, last_name = payload.first_name.strip(), payload.last_name.strip()
        if not first_name or not last_name:
            raise RefusedError("names_required", 422)
        phone, email = self.users.normalize_contact(payload.phone), self.users.normalize_contact(payload.email)
        if phone is None and email is None:
            raise RefusedError("contact_required", 422)
        self._check_methods_keep_identifier(user, phone, email)
        self.users.check_contacts_free(phone, email, user.id)
        before = build_profile_snapshot(user)
        user.title, user.first_name, user.last_name, user.phone, user.email = payload.title, first_name, last_name, phone, email
        user.updated_by_id = self.current_user.id
        self._flush_contact()
        record_audit_event(self.db, self.current_user.id, "user.profile_changed", entity_type="user", entity_id=user.id, before=before, after=build_profile_snapshot(user))
        self.db.commit()
        return self.users.build_view(user)

    def set_role(self, user_id: UUID, payload: RoleIn) -> StaffUserOut:
        """
        Give a staff User another Role, Owner only: its Permissions go back to the Role's defaults on every Site, and they are signed out.

        Args:
            user_id (UUID): User changed.
            payload (RoleIn): The Role.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: owner_only, user_not_found, user_locked.
        """
        user = self._get_owned_user(user_id)
        role = Role(payload.role.value)
        if user.role == role:
            return self.users.build_view(user)
        before = {"role": user.role.value}
        user.role = role
        user.token_version += 1
        user.updated_by_id = self.current_user.id
        for site_id in list(self.db.scalars(select(SiteAssignment.site_id).where(SiteAssignment.user_id == user.id))):
            self.users.delete_site_assignment(user.id, site_id)
            self.users.write_site_permissions(user.id, site_id, list(ROLE_DEFAULT_PERMISSIONS[role]))
        record_audit_event(self.db, self.current_user.id, "user.role_set", entity_type="user", entity_id=user.id, before=before, after={"role": role.value})
        self.db.commit()
        return self.users.build_view(user)

    def set_secret(self, user_id: UUID, payload: SecretIn) -> StaffUserOut:
        """
        Set a staff User's PIN or password, Owner only: they are signed out everywhere and must change it at their next login.

        Args:
            user_id (UUID): User changed.
            payload (SecretIn): PIN or password.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: owner_only, user_not_found, user_locked, method_needs_identifier, invalid_first_secret.
        """
        user = self._get_owned_user(user_id)
        method = LOGIN_METHOD_BY_KIND[payload.kind]
        if (method in PHONE_METHODS and not user.phone) or (method == LoginMethod.EMAIL_PASSWORD and not user.email):
            raise RefusedError("method_needs_identifier", 422)
        if not AuthService(self.db).is_secret_strong_enough(payload.kind, payload.secret):
            raise RefusedError("invalid_first_secret", 422)
        credential = self.db.scalar(select(Credential).where(Credential.user_id == user.id, Credential.kind == payload.kind)) or Credential(user_id=user.id, kind=payload.kind, created_by_id=self.current_user.id)
        credential.hash = hash_secret(payload.secret)
        credential.updated_by_id = self.current_user.id
        self.db.add(credential)
        if self.db.scalar(select(UserLoginMethod.id).where(UserLoginMethod.user_id == user.id, UserLoginMethod.method == method)) is None:
            self.db.add(UserLoginMethod(user_id=user.id, method=method, created_by_id=self.current_user.id))
        user.must_change_credential = True
        user.token_version += 1
        user.failed_login_attempts = 0
        user.locked_until = None
        if user.status == UserStatus.INVITED:
            user.status = UserStatus.ACTIVE
        user.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "user.secret_set", entity_type="user", entity_id=user.id, after={"kind": payload.kind.value})
        self.db.commit()
        return self.users.build_view(user)

    def set_ownership(self, user_id: UUID, payload: OwnershipIn) -> StaffUserOut:
        """
        Make an active Management User an Owner, or withdraw it, Owner only; one active Owner always remains. Either way they are signed out, so their rights are read again.

        Args:
            user_id (UUID): User changed.
            payload (OwnershipIn): Owner or not.

        Returns:
            StaffUserOut: The User after the change.

        Raises:
            RefusedError: owner_only, user_not_found, owner_needs_management, last_owner.
        """
        self._check_owner()
        owners = list(self.db.scalars(select(User).where(User.is_owner.is_(True)).order_by(User.id).with_for_update().execution_options(populate_existing=True)))
        user = self.db.get(User, user_id)
        if user is None or user.role == Role.CLIENT:
            raise RefusedError("user_not_found", 404)
        if user.is_owner == payload.is_owner:
            return self.users.build_view(user)
        if payload.is_owner:
            self._promote(user)
        else:
            if not any(owner.id != user.id and owner.status == UserStatus.ACTIVE for owner in owners):
                raise RefusedError("last_owner")
            self._withdraw(user)
        user.token_version += 1
        user.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "user.ownership_set", entity_type="user", entity_id=user.id, before={"isOwner": not payload.is_owner}, after={"isOwner": payload.is_owner})
        self.db.commit()
        return self.users.build_view(user)

    def check_contacts(self, phone: str | None, email: str | None, except_user_id: UUID | None) -> ContactCheckOut:
        """
        Tell who already logs in with a phone or an email, while it is typed; the name shows only for staff the caller may see.

        Args:
            phone (str | None): Phone typed.
            email (str | None): Email typed.
            except_user_id (UUID | None): User being edited.

        Returns:
            ContactCheckOut: Name per contact taken, empty when the holder may not be named, null when free.

        Raises:
            RefusedError: users_forbidden, contact_invalid.
        """
        site_ids = self.users.get_manageable_site_ids()
        if not site_ids:
            raise RefusedError("users_forbidden", 403)
        return ContactCheckOut(
            phone_taken_by=self._name_holder(self.users.find_holder(User.phone, self.users.normalize_contact(phone), except_user_id), site_ids),
            email_taken_by=self._name_holder(self.users.find_holder(User.email, self.users.normalize_contact(email), except_user_id), site_ids),
        )

    def _name_holder(self, holder: User | None, site_ids: set[str]) -> str | None:
        """
        Name who holds a contact, when the caller may see them.

        Args:
            holder (User | None): User holding it.
            site_ids (set[str]): Sites the caller manages.

        Returns:
            str | None: The name, empty when hidden, None when nobody holds it.
        """
        if holder is None:
            return None
        is_visible = self.current_user.is_owner or self.db.scalar(select(SiteAssignment.id).where(SiteAssignment.user_id == holder.id, SiteAssignment.site_id.in_([UUID(site_id) for site_id in site_ids])).limit(1)) is not None
        return f"{holder.first_name} {holder.last_name}" if is_visible else ""

    def _promote(self, user: User) -> None:
        """
        Make a User an Owner: every right on every Site, so no Site Assignment.

        Args:
            user (User): Management User.

        Raises:
            RefusedError: owner_needs_management.
        """
        if user.role != Role.MANAGEMENT or user.status != UserStatus.ACTIVE:
            raise RefusedError("owner_needs_management")
        user.is_owner = True
        assignment_ids = select(SiteAssignment.id).where(SiteAssignment.user_id == user.id)
        self.db.execute(delete(SiteAssignmentPermission).where(SiteAssignmentPermission.site_assignment_id.in_(assignment_ids)))
        self.db.execute(delete(SiteAssignment).where(SiteAssignment.user_id == user.id))
        self.db.flush()

    def _withdraw(self, user: User) -> None:
        """
        Make an Owner a Management User again, with its default rights on every active Site.

        Args:
            user (User): Owner.
        """
        user.is_owner = False
        self.db.flush()
        for site_id in list(self.db.scalars(select(Site.id).where(Site.status == SiteStatus.ACTIVE))):
            self.users.write_site_permissions(user.id, site_id, list(ROLE_DEFAULT_PERMISSIONS[Role.MANAGEMENT]))

    def _get_profile_user(self, user_id: UUID) -> User:
        """
        Load the User whose profile changes: an Owner also reaches themselves and other Owners.

        Args:
            user_id (UUID): User.

        Returns:
            User: The User.

        Raises:
            RefusedError: user_not_found, user_locked, site_forbidden.
        """
        user = self.db.get(User, user_id)
        if self.current_user.is_owner and user is not None and (user.is_owner or user.id == self.current_user.id):
            return user
        return self.users.get_managed_user(user_id)

    def _get_owned_user(self, user_id: UUID) -> User:
        """
        Load a staff User only an Owner may change this way: never another Owner, never themselves.

        Args:
            user_id (UUID): User.

        Returns:
            User: The User.

        Raises:
            RefusedError: owner_only, user_not_found, user_locked.
        """
        self._check_owner()
        return self.users.get_managed_user(user_id)

    def _check_owner(self) -> None:
        """
        Refuse anyone but an Owner, read from the database: a token may outlive a withdrawal by a few minutes.

        Raises:
            RefusedError: owner_only.
        """
        actor = self.db.get(User, self.current_user.id)
        if not self.current_user.is_owner or actor is None or not actor.is_owner:
            raise RefusedError("owner_only", 403)

    def _check_methods_keep_identifier(self, user: User, phone: str | None, email: str | None) -> None:
        """
        Refuse to remove the phone or email a User logs in with.

        Args:
            user (User): User changed.
            phone (str | None): New phone.
            email (str | None): New email.

        Raises:
            RefusedError: method_needs_identifier.
        """
        methods = set(self.db.scalars(select(UserLoginMethod.method).where(UserLoginMethod.user_id == user.id)))
        if (phone is None and methods & set(PHONE_METHODS)) or (email is None and LoginMethod.EMAIL_PASSWORD in methods):
            raise RefusedError("method_needs_identifier", 422)

    def _flush_contact(self) -> None:
        """
        Write the new contact, refusing it when another request took it meanwhile.

        Raises:
            RefusedError: contact_taken.
        """
        try:
            self.db.flush()
        except IntegrityError as error:
            self.db.rollback()
            raise RefusedError("contact_taken") from error


def build_profile_snapshot(user: User) -> dict:
    """
    Keep what the Audit Trail compares of a User's profile.

    Args:
        user (User): User.

    Returns:
        dict: Civility, names and contact.
    """
    return {"title": user.title.value if user.title else None, "firstName": user.first_name, "lastName": user.last_name, "phone": user.phone, "email": user.email}


def get_user_profile_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> UserProfileService:
    """
    Build the user profile service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        UserProfileService: Service bound to the session and actor.
    """
    return UserProfileService(db, current_user)
