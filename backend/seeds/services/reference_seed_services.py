import json
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy.orm import Session

from modules.ai.models.ai_models import AiFeatureSetting, AiModel, AiProvider
from modules.ai.types.ai_types import DEFAULT_PAYLOAD_RETENTION_DAYS, AiApiStyle, AiFeature, AiProviderKind
from modules.configuration.models.configuration_models import OliveVariety
from modules.expense.models.expense_models import ExpenseCategory
from modules.expense.types.expense_types import ExpenseCategoryType, ExpenseVatNature
from modules.territory.models.territory_models import City, Province
from modules.territory.types.territory_types import ProvinceKind
from seeds.constants.reference_seed_constants import AI_MODELS, AI_PROVIDER, EXPENSE_CATEGORY_TREE, OLIVE_VARIETIES, PROVINCES, RETIRED_EXPENSE_CATEGORY_IDS


PROVINCE_BOUNDARIES_FILE = Path(__file__).resolve().parent.parent / "fixtures" / "oriental-provinces.json"


class ReferenceSeedService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session the reference data is written with.

        Args:
            db (Session): Seed database session.
        """
        self.db = db

    def run(self) -> None:
        """
        Load or refresh the eight Provinces of the Oriental with their outlines and towns, the olive varieties, the Expense Categories and the AI provider, models and AI Feature settings.
        """
        boundaries = read_province_boundaries()
        for province_position, province in enumerate(PROVINCES, start=1):
            kind = ProvinceKind.PREFECTURE if province.is_prefecture else ProvinceKind.PROVINCE
            self.db.merge(
                Province(
                    id=province.id,
                    name=province.name,
                    kind=kind,
                    position=province_position,
                    latitude=Decimal(province.latitude),
                    longitude=Decimal(province.longitude),
                    boundary=boundaries[province.id],
                )
            )
        self.db.flush()
        for province in PROVINCES:
            for city_position, city_name in enumerate(province.cities, start=1):
                self.db.merge(City(id=build_city_id(province.id, city_name), province_id=province.id, name=city_name, position=city_position))
        for variety_id, variety_name in OLIVE_VARIETIES:
            self.db.merge(OliveVariety(id=variety_id, name=variety_name, is_active=True))
        self._seed_expense_categories()
        self._seed_ai()
        self.db.commit()

    def _seed_expense_categories(self) -> None:
        """
        Write the 11 Expense Categories in the owner's order, then their sub-categories with the suggested CGNC account and TVA nature; a retired sub-category stays for the Expenses filed under it but is no longer offered.
        """
        for category_position, (category_id, _) in enumerate(EXPENSE_CATEGORY_TREE, start=1):
            self.db.merge(ExpenseCategory(id=category_id, type=ExpenseCategoryType.CATEGORY, parent_id=None, position=category_position, account_code=None, vat_nature=ExpenseVatNature.NONE, is_vat_never_deductible=False, is_active=True))
        self.db.flush()
        for category_id, subcategories in EXPENSE_CATEGORY_TREE:
            for position, (subcategory_id, account_code, vat_nature, is_vat_never_deductible) in enumerate(subcategories, start=1):
                self.db.merge(ExpenseCategory(id=subcategory_id, type=ExpenseCategoryType.SUBCATEGORY, parent_id=category_id, position=position, account_code=account_code, vat_nature=ExpenseVatNature(vat_nature), is_vat_never_deductible=is_vat_never_deductible, is_active=subcategory_id not in RETIRED_EXPENSE_CATEGORY_IDS))

    def _seed_ai(self) -> None:
        """
        Add the OpenAI provider, its two priced models and the model of each AI Feature when missing; an Owner's key, prices and choices are never overwritten.
        """
        provider_id = build_reference_id("ai-provider", AI_PROVIDER.label)
        if self.db.get(AiProvider, provider_id) is None:
            self.db.add(AiProvider(id=provider_id, kind=AiProviderKind.OPENAI, label=AI_PROVIDER.label, base_url=AI_PROVIDER.base_url, api_style=AiApiStyle.OPENAI_CHAT))
            self.db.flush()
        for model in AI_MODELS:
            model_id = build_reference_id("ai-model", model.name)
            if self.db.get(AiModel, model_id) is None:
                self.db.add(AiModel(id=model_id, provider_id=provider_id, name=model.name, input_price_per_million=Decimal(model.input_price), cached_input_price_per_million=Decimal(model.cached_input_price), output_price_per_million=Decimal(model.output_price), supports_structured_output=model.supports_structured_output))
        self.db.flush()
        for model in AI_MODELS:
            feature = AiFeature(model.feature)
            if self.db.get(AiFeatureSetting, feature) is None:
                self.db.add(AiFeatureSetting(feature=feature, model_id=build_reference_id("ai-model", model.name), payload_retention_days=DEFAULT_PAYLOAD_RETENTION_DAYS))


def build_reference_id(kind: str, name: str) -> UUID:
    """
    Derive a stable id for a reference row, so re-running the seed finds it instead of adding a copy.

    Args:
        kind (str): Kind of row, such as ai-model.
        name (str): Its natural name.

    Returns:
        UUID: The same UUID on every run.
    """
    return uuid5(NAMESPACE_URL, f"oleoziza:{kind}:{name}")


def build_city_id(province_id: str, city_name: str) -> UUID:
    """
    Derive a stable id for a town, so re-running the seed updates it instead of adding a copy.

    Args:
        province_id (str): Province slug.
        city_name (str): Town name.

    Returns:
        UUID: The same UUID for the same town on every run.
    """
    return uuid5(NAMESPACE_URL, f"oleoziza:city:{province_id}:{city_name}")


def read_province_boundaries() -> dict[str, dict[str, Any]]:
    """
    Read the simplified Province outlines the front draws (geoBoundaries ADM2, OpenStreetMap, ODbL), keyed by Province slug.

    Returns:
        dict[str, dict[str, Any]]: GeoJSON geometry of each Province.

    Raises:
        KeyError: If a Province of the seed has no outline in the file.
    """
    collection = json.loads(PROVINCE_BOUNDARIES_FILE.read_text(encoding="utf-8"))
    boundaries = {feature["properties"]["id"]: feature["geometry"] for feature in collection["features"]}
    missing_ids = [province.id for province in PROVINCES if province.id not in boundaries]
    if missing_ids:
        raise KeyError(f"No outline for {', '.join(missing_ids)} in {PROVINCE_BOUNDARIES_FILE.name}")
    return boundaries
