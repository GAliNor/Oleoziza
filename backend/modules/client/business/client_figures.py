from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import APP_TIME_ZONE
from modules.client.types.client_types import ClientFollowUp, ClientLotLineOut
from modules.configuration.models.configuration_models import OliveVariety
from modules.lot.models.lot_models import Lot
from modules.site.models.site_models import Season, Site


def list_lot_lines(db: Session, client_ids: Iterable[UUID] | None = None, site_id: UUID | None = None) -> dict[UUID, list[ClientLotLineOut]]:
    """
    Read the Lots of many Clients in one query, newest first, grouped by Client.

    Args:
        db (Session): Session to read with.
        client_ids (Iterable[UUID] | None): Clients to read, every Client when None.
        site_id (UUID | None): Only the Lots of one Site.

    Returns:
        dict[UUID, list[ClientLotLineOut]]: Each Client's Lot lines.
    """
    query = (
        select(Lot, Site.name, OliveVariety.name, Season.code)
        .join(Site, Site.id == Lot.site_id)
        .join(OliveVariety, OliveVariety.id == Lot.olive_variety_id)
        .join(Season, Season.id == Lot.season_id)
        .order_by(Lot.entered_at.desc())
    )
    if client_ids is not None:
        query = query.where(Lot.client_id.in_(list(client_ids)))
    if site_id is not None:
        query = query.where(Lot.site_id == site_id)
    lines: dict[UUID, list[ClientLotLineOut]] = {}
    for lot, site_name, variety_name, season_code in db.execute(query):
        lines.setdefault(lot.client_id, []).append(
            ClientLotLineOut(
                code=lot.code or "",
                site_id=lot.site_id,
                site_name=site_name,
                status=lot.status,
                kg=float(lot.net_weight_in_kg),
                oil_litres=float(lot.oil_in_litres or 0),
                milling_rate_per_kg=float(lot.milling_rate_per_kg or 0),
                variety=variety_name,
                season=season_code,
                received_on=lot.entered_at.astimezone(APP_TIME_ZONE).date(),
            )
        )
    return lines


def get_follow_up(lines: list[ClientLotLineOut], open_season_code: str | None, balance: float) -> ClientFollowUp:
    """
    Tag a Client for Management: owes money, came this Season, or hasn't come this Season.

    Args:
        lines (list[ClientLotLineOut]): The Client's Lots.
        open_season_code (str | None): Code of the Season under way.
        balance (float): What the Client owes, in dirhams.

    Returns:
        ClientFollowUp: The tag.
    """
    if balance > 0:
        return ClientFollowUp.AT_RISK
    if open_season_code and any(line.season == open_season_code for line in lines):
        return ClientFollowUp.ACTIVE
    return ClientFollowUp.INACTIVE
