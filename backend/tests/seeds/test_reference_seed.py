from seeds.constants.reference_seed_constants import PROVINCES
from seeds.services.reference_seed_services import read_province_boundaries


def test_every_province_has_a_polygon_outline() -> None:
    """
    The fixture holds an outline for each of the eight Provinces, as a GeoJSON polygon.
    """
    boundaries = read_province_boundaries()

    assert set(boundaries) >= {province.id for province in PROVINCES}
    assert {boundary["type"] for boundary in boundaries.values()} <= {"Polygon", "MultiPolygon"}
