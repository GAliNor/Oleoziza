from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from modules.territory.models.territory_models import City, Province
from modules.territory.types.territory_types import ProvinceKind
from tests.factories import build_auth_header, create_staff_user


API_URL = "/api/territory/provinces"


def test_provinces_come_in_order_with_their_towns_and_outline(client: TestClient, db: Session) -> None:
    """
    Each Province comes with its label position as [longitude, latitude], its outline and its towns in the owner's order.
    """
    db.merge(Province(id="zz-test", name="Zz Test", kind=ProvinceKind.PROVINCE, position=99, latitude=34.5, longitude=-2.5, boundary={"type": "Polygon", "coordinates": []}))
    db.flush()
    db.add_all([City(province_id="zz-test", name="Second", position=2), City(province_id="zz-test", name="First", position=1)])
    user = create_staff_user(db, "+212669990401")
    db.commit()

    body = client.get(API_URL, headers=build_auth_header(user)).json()
    province = next(item for item in body if item["id"] == "zz-test")

    assert body[-1]["id"] == "zz-test"
    assert province["labelAt"] == [-2.5, 34.5]
    assert province["cities"] == ["First", "Second"]
    assert province["boundary"]["type"] == "Polygon"


def test_provinces_are_cached_by_the_browser_for_a_day(client: TestClient, db: Session) -> None:
    """
    Reference data is kept by the browser for a day, so the next screens read it without a request.
    """
    user = create_staff_user(db, "+212669990402")
    db.commit()

    response = client.get(API_URL, headers=build_auth_header(user))

    assert response.headers["cache-control"] == "private, max-age=86400"
    assert response.headers["etag"]


def test_provinces_need_a_signed_in_user(client: TestClient) -> None:
    """
    The territory is read by signed-in Users only.
    """
    assert client.get(API_URL).status_code == 401
