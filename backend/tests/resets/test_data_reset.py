import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.app_init import init_models
from core.database import Base
from core.helpers import get_local_today
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.models.configuration_models import Box, PressLine, SiteSetting, Tank
from modules.configuration.types.configuration_types import SettingKey
from modules.expense.models.expense_models import Expense, ExpenseCategory, ExpenseDocument
from modules.expense.types.expense_types import ExpenseCategoryType, ExpensePaidBy, ExpenseVatNature
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.lot.models.lot_models import BoxOccupancy, Lot
from modules.oil.models.oil_models import Storage
from modules.oil.types.oil_types import StorageOwner
from modules.site.business.code_sequences import give_next_code
from modules.site.models.site_models import CodeSequence, Season, Site
from modules.site.types.site_types import CodeKind
from modules.user.models.user_models import User
from modules.user.types.user_types import Permission, Role
from resets.business.data_reset import reset_modules
from resets.business.reset_plan import expand_modules, list_tables
from resets.constants.reset_constants import KEPT_TABLES, PARTLY_RESET_TABLES
from resets.types.reset_types import ResetModule
from tests.factories import create_lot, create_site, create_staff_user, open_fresh_season


@pytest.fixture
def mill(db: Session) -> Site:
    """
    A Site with a bit of everything: staff, a Configuration, a Lot in a Box and a Tank, a Charge with its invoice, an Audit Event.

    Args:
        db (Session): Test session.

    Returns:
        Site: The Site.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    operator = create_staff_user(db, "+212669993301", Role.OPERATOR, {site.id: [Permission.RECEPTION_CREATE]}, password="Secret2026!", email="op@mill.ma")
    create_staff_user(db, "+212669993302", is_owner=True)
    line, tank, box = PressLine(site_id=site.id, number=1), Tank(site_id=site.id, number=1, capacity_in_litres=1000), Box(site_id=site.id, number=1, capacity_in_kg=1000)
    db.add_all([line, tank, box, SiteSetting(site_id=site.id, season_id=season.id, key=SettingKey.OIL_PRICE_PER_LITRE, value=Decimal(45), effective_from=datetime.now(timezone.utc))])
    db.flush()
    lot = create_lot(db, site, line.id)
    lot.code, lot.created_by_id = give_next_code(db, site, season, CodeKind.LOT), operator.id
    now = datetime.now(timezone.utc)
    db.add_all([BoxOccupancy(lot_id=lot.id, box_id=box.id, occupied_from=now), Storage(lot_id=lot.id, tank_id=tank.id, owner=StorageOwner.MILL, oil_in_litres=10, stored_from=now, entered_at=now)])
    if db.get(ExpenseCategory, "electricity") is None:
        db.add(ExpenseCategory(id="energy", type=ExpenseCategoryType.CATEGORY, position=1, vat_nature=ExpenseVatNature.NONE))
        db.flush()
        db.add(ExpenseCategory(id="electricity", type=ExpenseCategoryType.SUBCATEGORY, parent_id="energy", position=1, vat_nature=ExpenseVatNature.GOOD))
        db.flush()
    expense = Expense(id=uuid.uuid4(), site_id=site.id, season_id=season.id, date=get_local_today(), category_id="electricity", amount=100, paid_by=ExpensePaidBy.CASH, code=give_next_code(db, site, season, CodeKind.EXPENSE), created_by_id=operator.id)
    file = File(bucket=FileBucket.PRIVATE, storage_key=f"documents/{uuid.uuid4()}", original_name="facture.jpg", content_type="image/jpeg", size_in_bytes=10)
    db.add_all([expense, file])
    db.flush()
    db.add(ExpenseDocument(expense_id=expense.id, file_id=file.id))
    record_audit_event(db, operator.id, "lot.received", site_id=site.id, entity_type="lot", entity_id=lot.id)
    db.commit()
    return site


def count(db: Session, table: str) -> int:
    """
    Count a table's rows.

    Args:
        db (Session): Test session.
        table (str): Table name.

    Returns:
        int: Its rows.
    """
    return db.scalar(select(func.count()).select_from(Base.metadata.tables[table])) or 0


def test_every_table_is_reset_by_a_module_or_kept_on_purpose() -> None:
    """
    Q26: a table added later can't be forgotten: it must join a module, or the kept ones.
    """
    init_models()

    assert set(Base.metadata.tables) == list_tables(list(ResetModule)) | KEPT_TABLES | PARTLY_RESET_TABLES


@pytest.mark.parametrize("module", list(ResetModule))
def test_each_module_is_emptied_alone(db: Session, mill: Site, module: ResetModule) -> None:
    """
    Q26: any module can be reset by itself, with those pointing at it, and nothing is left pointing at nothing.
    """
    reset_modules(db, [module])
    db.commit()

    assert all(count(db, table) == 0 for table in list_tables(expand_modules([module])[0]))
    assert count(db, "sites") > 0 and count(db, "expense_categories") > 0


def test_everything_can_be_reset_at_once_keeping_owners_and_sites(db: Session, mill: Site) -> None:
    """
    Q26: a whole new start: only Owners, Sites and reference data are left.
    """
    reset_modules(db, list(ResetModule))
    db.commit()

    assert all(count(db, table) == 0 for table in list_tables(list(ResetModule)))
    assert all(user.is_owner for user in db.scalars(select(User)))
    assert db.get(Site, mill.id) is not None


def test_a_module_brings_those_whose_records_point_at_it() -> None:
    """
    Q26: Clients can't go while their Lots and Payments stay.
    """
    modules, added = expand_modules([ResetModule.CLIENTS])

    assert (modules, added) == ([ResetModule.LOTS, ResetModule.FINANCES, ResetModule.CLIENTS], [ResetModule.LOTS, ResetModule.FINANCES])


def test_resetting_charges_leaves_lots_and_their_codes(db: Session, mill: Site) -> None:
    """
    Q26: only what was chosen goes; its numbering starts again, the others go on.
    """
    reset_modules(db, [ResetModule.CHARGES])
    db.commit()

    assert count(db, "lots") > 0
    assert CodeKind.EXPENSE not in set(db.scalars(select(CodeSequence.kind)))
    assert CodeKind.LOT in set(db.scalars(select(CodeSequence.kind)))


def test_the_files_of_deleted_records_are_listed_for_the_storage(db: Session, mill: Site) -> None:
    """
    Q26: invoices leave the storage with their Charges; Season Illustrations stay.
    """
    keys = list(db.scalars(select(File.storage_key).join(ExpenseDocument, ExpenseDocument.file_id == File.id)))

    report = reset_modules(db, [ResetModule.CHARGES])

    assert sorted(key for key, _ in report.storage_keys) == sorted(keys)
    assert db.scalar(select(func.count()).select_from(File).where(File.storage_key.in_(keys))) == 0


def test_staff_go_and_what_they_recorded_stays(db: Session, mill: Site) -> None:
    """
    Q26: a Lot received by an Operator who goes is still there, without its author.
    """
    reset_modules(db, [ResetModule.STAFF])
    db.commit()

    lot = db.scalar(select(Lot).where(Lot.site_id == mill.id))
    assert lot is not None and lot.created_by_id is None
    assert db.scalar(select(User.id).where(User.phone == "+212669993301")) is None
    assert db.scalar(select(User.id).where(User.phone == "+212669993302")) is not None


def test_a_reset_mill_receives_again_from_number_one(db: Session, mill: Site) -> None:
    """
    Q26: after resetting Seasons, a new one opens and codes start again.
    """
    reset_modules(db, [ResetModule.SEASONS])
    db.commit()
    season = Season(code="9898", label="Saison test", starts_on=date(2026, 11, 1))
    db.add(season)
    db.flush()

    assert give_next_code(db, mill, season, CodeKind.LOT) == "TS-9898-0001"
