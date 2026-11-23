from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.audit.models.audit_models import AuditEvent
from modules.user.models.user_models import SiteAssignment, User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, Permission, Role, UserStatus
from tests.factories import build_auth_header, create_site, create_staff_user


API_URL = "/api/user"


def build_profile(**overrides: Any) -> dict[str, Any]:
    """
    Build a profile as the User's page sends it.

    Args:
        **overrides (Any): Fields to change.

    Returns:
        dict[str, Any]: Request body.
    """
    return {"title": "mr", "firstName": "Hamid", "lastName": "Zerrouki", "phone": "0669990399", "email": None, **overrides}


def test_a_manager_changes_the_names_and_contact_of_their_staff(client: TestClient, db: Session) -> None:
    """
    Q5: civility, names, phone and email change after creation, and the Audit Trail keeps the old ones.
    """
    site = create_site(db)
    rights = {site.id: [Permission.USER_MANAGE]}
    manager = create_staff_user(db, "+212669990301", permissions_by_site=rights)
    operator = create_staff_user(db, "+212669990302", Role.OPERATOR, {site.id: []})

    body = client.put(f"{API_URL}/{operator.id}/profile", json=build_profile(email="Hamid@Mill.MA"), headers=build_auth_header(manager, rights)).json()
    event = db.scalar(select(AuditEvent).where(AuditEvent.entity_id == operator.id, AuditEvent.action == "user.profile_changed"))

    assert (body["title"], body["firstName"], body["phone"], body["email"]) == ("mr", "Hamid", "+212669990399", "hamid@mill.ma")
    assert event.before["phone"] == "+212669990302"


def test_a_manager_never_changes_an_owner_nor_themselves(client: TestClient, db: Session) -> None:
    """
    Rule A5: an Owner is changed by an Owner only.
    """
    site = create_site(db)
    rights = {site.id: [Permission.USER_MANAGE]}
    owner = create_staff_user(db, "+212669990303", is_owner=True)
    manager = create_staff_user(db, "+212669990304", permissions_by_site=rights)
    headers = build_auth_header(manager, rights)

    assert [client.put(f"{API_URL}/{user.id}/profile", json=build_profile(), headers=headers).json() for user in (owner, manager)] == [{"code": "user_locked"}] * 2


def test_an_owner_changes_their_own_contact(client: TestClient, db: Session) -> None:
    """
    Q5: the Owner edits their own details.
    """
    owner = create_staff_user(db, "+212669990305", is_owner=True)

    assert client.put(f"{API_URL}/{owner.id}/profile", json=build_profile(phone="0669990398"), headers=build_auth_header(owner)).json()["phone"] == "+212669990398"


def test_a_contact_of_someone_else_is_refused_whatever_its_case(client: TestClient, db: Session) -> None:
    """
    Q28: two Users never share a phone or an email.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990306", is_owner=True, email="Owner@Mill.ma")
    operator = create_staff_user(db, "+212669990307", Role.OPERATOR, {site.id: []})
    headers = build_auth_header(owner)

    def change(**contact: Any) -> dict:
        return client.put(f"{API_URL}/{operator.id}/profile", json=build_profile(**contact), headers=headers).json()

    assert change(phone="0669990306") == {"code": "phone_taken"}
    assert change(email="owner@mill.MA") == {"code": "email_taken"}
    assert change(phone="0669990307")["phone"] == "+212669990307"


def test_the_contact_someone_logs_in_with_cannot_be_removed(client: TestClient, db: Session) -> None:
    """
    Removing the phone of a phone + PIN User would lock them out.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990308", is_owner=True)
    operator = create_staff_user(db, "+212669990309", Role.OPERATOR, {site.id: []})
    db.add(UserLoginMethod(user_id=operator.id, method=LoginMethod.PHONE_PIN))
    db.flush()
    headers = build_auth_header(owner)

    assert client.put(f"{API_URL}/{operator.id}/profile", json=build_profile(phone=None, email="h@mill.ma"), headers=headers).json() == {"code": "method_needs_identifier"}
    assert client.put(f"{API_URL}/{operator.id}/profile", json=build_profile(phone=None, email=None), headers=headers).json() == {"code": "contact_required"}


def test_a_contact_already_used_is_told_while_typing(client: TestClient, db: Session) -> None:
    """
    Q28: who holds it is named when the caller may see them, hidden otherwise.
    """
    site, other_site = create_site(db), create_site(db, "TO")
    rights = {site.id: [Permission.USER_MANAGE]}
    manager = create_staff_user(db, "+212669990310", permissions_by_site=rights)
    colleague = create_staff_user(db, "+212669990311", Role.OPERATOR, {site.id: []})
    create_staff_user(db, "+212669990312", Role.OPERATOR, {other_site.id: []})
    headers = build_auth_header(manager, rights)

    def check(phone: str, **params: Any) -> str | None:
        return client.get(f"{API_URL}/contact-check", params={"phone": phone, **params}, headers=headers).json()["phoneTakenBy"]

    assert check("0669990311") == "Test 0311"
    assert check("0669990312") == ""
    assert check("0669990313") is None
    assert check("0669990311", exceptUserId=str(colleague.id)) is None


def test_only_staff_managers_may_check_contacts(client: TestClient, db: Session) -> None:
    """
    An Operator can't probe who works at the mill.
    """
    site = create_site(db)
    operator = create_staff_user(db, "+212669990314", Role.OPERATOR, {site.id: [Permission.RECEPTION_CREATE]})

    assert client.get(f"{API_URL}/contact-check", params={"phone": "0669990314"}, headers=build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]})).json() == {"code": "users_forbidden"}


def test_a_new_role_brings_its_default_rights_and_signs_out(client: TestClient, db: Session) -> None:
    """
    Q5: an Operator made Accountant gets the Accountant's rights on each Site, not the old ones.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990315", is_owner=True)
    operator = create_staff_user(db, "+212669990316", Role.OPERATOR, {site.id: [Permission.RECEPTION_CREATE]})

    body = client.put(f"{API_URL}/{operator.id}/role", json={"role": "accountant"}, headers=build_auth_header(owner)).json()

    assert body["role"] == "accountant"
    assert "payment.confirm" in body["sites"][str(site.id)] and "reception.create" not in body["sites"][str(site.id)]
    assert db.get(User, operator.id).token_version == 1


def test_role_and_password_are_the_owners(client: TestClient, db: Session) -> None:
    """
    Q5: « Gérer les utilisateurs » is not enough for these two.
    """
    site = create_site(db)
    rights = {site.id: [Permission.USER_MANAGE]}
    manager = create_staff_user(db, "+212669990317", permissions_by_site=rights)
    operator = create_staff_user(db, "+212669990318", Role.OPERATOR, {site.id: []})
    headers = build_auth_header(manager, rights)

    assert client.put(f"{API_URL}/{operator.id}/role", json={"role": "management"}, headers=headers).json() == {"code": "owner_only"}
    assert client.put(f"{API_URL}/{operator.id}/secret", json={"kind": "pin", "secret": "4826"}, headers=headers).json() == {"code": "owner_only"}


def test_a_password_set_by_the_owner_signs_out_and_must_be_changed(client: TestClient, db: Session) -> None:
    """
    Q5: the new password works at once, every session ends, and the User must choose theirs at login.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990319", is_owner=True)
    user = create_staff_user(db, "+212669990320", Role.ACCOUNTANT, {site.id: []}, password="Ancien2026!", email="compta@mill.ma")
    user.failed_login_attempts = 4
    db.commit()

    client.put(f"{API_URL}/{user.id}/secret", json={"kind": "password", "secret": "Nouveau2026!"}, headers=build_auth_header(owner))
    old = client.post("/api/auth/login", json={"identifier": "compta@mill.ma", "method": "email_password", "secret": "Ancien2026!"})
    new = client.post("/api/auth/login", json={"identifier": "compta@mill.ma", "method": "email_password", "secret": "Nouveau2026!"}).json()

    assert old.status_code != 200
    assert new["mustChangeCredential"] is True
    assert db.get(User, user.id).token_version == 1


def test_a_weak_password_or_one_without_its_contact_is_refused(client: TestClient, db: Session) -> None:
    """
    A password needs an email to log in with, and enough characters.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990321", is_owner=True)
    operator = create_staff_user(db, "+212669990322", Role.OPERATOR, {site.id: []})
    headers = build_auth_header(owner)

    assert client.put(f"{API_URL}/{operator.id}/secret", json={"kind": "password", "secret": "Nouveau2026!"}, headers=headers).json() == {"code": "method_needs_identifier"}
    assert client.put(f"{API_URL}/{operator.id}/secret", json={"kind": "pin", "secret": "12"}, headers=headers).json() == {"code": "invalid_first_secret"}


def test_an_owner_makes_another_owner(client: TestClient, db: Session) -> None:
    """
    Q5, Q27: a family business has several Owners; each holds every Site.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990323", is_owner=True)
    brother = create_staff_user(db, "+212669990324", Role.MANAGEMENT, {site.id: []})

    body = client.put(f"{API_URL}/{brother.id}/ownership", json={"isOwner": True}, headers=build_auth_header(owner)).json()

    assert body["isOwner"] is True and len(body["sites"][str(site.id)]) == len(Permission)


def test_only_an_active_management_user_becomes_owner(client: TestClient, db: Session) -> None:
    """
    Q27: never an Operator, nor someone blocked.
    """
    site = create_site(db)
    headers = build_auth_header(create_staff_user(db, "+212669990325", is_owner=True))
    operator = create_staff_user(db, "+212669990326", Role.OPERATOR, {site.id: []})
    blocked = create_staff_user(db, "+212669990327", Role.MANAGEMENT, {site.id: []})
    blocked.status = UserStatus.DISABLED
    db.commit()

    assert [client.put(f"{API_URL}/{user.id}/ownership", json={"isOwner": True}, headers=headers).json() for user in (operator, blocked)] == [{"code": "owner_needs_management"}] * 2


def make_only_owner(db: Session, owner: User) -> None:
    """
    Leave one Owner in the database, whatever the dev data holds.

    Args:
        db (Session): Test session.
        owner (User): The Owner kept.
    """
    for other in db.scalars(select(User).where(User.is_owner.is_(True), User.id != owner.id)):
        other.is_owner = False
    db.commit()


def test_a_withdrawn_owner_keeps_management_rights_on_every_site(client: TestClient, db: Session) -> None:
    """
    Q27: an Owner withdraws another, who is signed out and stays Management everywhere.
    """
    site = create_site(db)
    owner, brother = create_staff_user(db, "+212669990328", is_owner=True), create_staff_user(db, "+212669990329", is_owner=True)

    body = client.put(f"{API_URL}/{brother.id}/ownership", json={"isOwner": False}, headers=build_auth_header(owner)).json()

    assert body["isOwner"] is False and "configuration.manage" in body["sites"][str(site.id)]
    assert db.scalar(select(SiteAssignment.id).where(SiteAssignment.user_id == brother.id, SiteAssignment.site_id == site.id)) is not None
    assert db.get(User, brother.id).token_version == 1


def test_the_last_active_owner_stays(client: TestClient, db: Session) -> None:
    """
    Q27: there is always someone who can do everything; a blocked Owner doesn't count.
    """
    create_site(db)
    owner, blocked = create_staff_user(db, "+212669990330", is_owner=True), create_staff_user(db, "+212669990331", is_owner=True)
    make_only_owner(db, owner)
    blocked.is_owner, blocked.status = True, UserStatus.DISABLED
    db.commit()

    assert client.put(f"{API_URL}/{owner.id}/ownership", json={"isOwner": False}, headers=build_auth_header(owner)).json() == {"code": "last_owner"}


def test_an_owner_withdrawn_a_moment_ago_withdraws_nobody(client: TestClient, db: Session) -> None:
    """
    Q27: two Owners withdrawing each other at once never leave none: the one withdrawn first, whose token still says Owner, is refused.
    """
    create_site(db)
    first, second = create_staff_user(db, "+212669990332", is_owner=True), create_staff_user(db, "+212669990333", is_owner=True)
    make_only_owner(db, first)
    second.is_owner = True
    db.commit()
    second_headers = build_auth_header(second)

    client.put(f"{API_URL}/{second.id}/ownership", json={"isOwner": False}, headers=build_auth_header(first))
    answer = client.put(f"{API_URL}/{first.id}/ownership", json={"isOwner": False}, headers=second_headers).json()

    assert answer == {"code": "owner_only"}
    assert db.get(User, first.id).is_owner is True
