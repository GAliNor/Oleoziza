from seeds.constants.reference_seed_constants import EXPENSE_CATEGORY_TREE, PROVINCES
from seeds.services.reference_seed_services import read_province_boundaries


def test_every_province_has_a_polygon_outline() -> None:
    """
    The fixture holds an outline for each of the eight Provinces, as a GeoJSON polygon.
    """
    boundaries = read_province_boundaries()

    assert set(boundaries) >= {province.id for province in PROVINCES}
    assert {boundary["type"] for boundary in boundaries.values()} <= {"Polygon", "MultiPolygon"}


def test_expense_categories_are_unique_and_each_closes_on_an_other() -> None:
    """
    The 11 Expense Categories and their sub-categories share one slug space, and every category offers a « <category>_other ».
    """
    category_ids = [category_id for category_id, _ in EXPENSE_CATEGORY_TREE]
    subcategory_ids = [subcategory[0] for _, subcategories in EXPENSE_CATEGORY_TREE for subcategory in subcategories]

    assert len(category_ids) == 11
    assert len(set(category_ids + subcategory_ids)) == len(category_ids) + len(subcategory_ids) == 90
    assert all(subcategories[-1][0] == f"{category_id}_other" for category_id, subcategories in EXPENSE_CATEGORY_TREE)
