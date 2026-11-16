from seeds.types.seed_types import ProvinceSeed


PROVINCES: tuple[ProvinceSeed, ...] = (
    ProvinceSeed("oujda-angad", "Oujda-Angad", True, "-1.42", "34.72", ("Oujda", "Bni Drar", "Naïma", "Aïn Sfa", "Isly")),
    ProvinceSeed("nador", "Nador", False, "-2.98", "35.12", ("Nador", "Beni Ensar", "Selouane", "Zeghanghane", "Al Aaroui")),
    ProvinceSeed("berkane", "Berkane", False, "-2.6", "34.92", ("Berkane", "Ahfir", "Saïdia", "Aklim", "Madagh", "Zegzel")),
    ProvinceSeed("taourirt", "Taourirt", False, "-2.92", "33.95", ("Taourirt", "El Aioun Sidi Mellouk", "Debdou")),
    ProvinceSeed("jerada", "Jerada", False, "-2.12", "34.08", ("Jerada", "Aïn Bni Mathar", "Touissit", "Sidi Boubker")),
    ProvinceSeed("driouch", "Driouch", False, "-3.5", "34.93", ("Driouch", "Midar", "Ben Taieb")),
    ProvinceSeed("guercif", "Guercif", False, "-3.62", "34.12", ("Guercif", "Saka")),
    ProvinceSeed("figuig", "Figuig", False, "-2.5", "32.75", ("Figuig", "Bouarfa", "Bni Tadjite", "Talsint", "Tendrara")),
)

OLIVE_VARIETIES: tuple[tuple[str, str], ...] = (
    ("moroccan-picholine", "Picholine marocaine"),
    ("haouzia", "Haouzia"),
    ("menara", "Menara"),
    ("arbequina", "Arbequina"),
    ("picual", "Picual"),
    ("other", "Autre"),
)


EXPENSE_CATEGORY_TREE: tuple[tuple[str, tuple[tuple[str, str | None, str, bool], ...]], ...] = (
    (
        "staff",
        (
            ("salaries", "61711", "none", False),
            ("cnss", "61741", "none", False),
            ("bonuses", "61712", "none", False),
            ("overtime", "61711", "none", False),
            ("seasonal_workers", "61711", "none", False),
            ("staff_meals", "61768", "good", False),
            ("staff_other", "6171", "none", False),
        ),
    ),
    (
        "energy",
        (
            ("electricity", "61251", "good", False),
            ("water", "61251", "good", False),
            ("generator_diesel", "61223", "good", False),
            ("site_fuel", "61223", "good", False),
            ("energy_other", "6125", "good", False),
        ),
    ),
    (
        "maintenance",
        (
            ("machine_upkeep", "61332", "service", False),
            ("spare_parts", "61225", "good", False),
            ("greasing", "61225", "good", False),
            ("cleaning_products", "61224", "good", False),
            ("gloves", "61225", "good", False),
            ("bags", "61225", "good", False),
            ("paper", "61254", "good", False),
            ("small_tools", "61253", "good", False),
            ("maintenance_other", "6133", "service", False),
        ),
    ),
    (
        "premises",
        (
            ("rent", "61312", "service", False),
            ("gardening", "61331", "service", False),
            ("outdoor_upkeep", "61331", "service", False),
            ("plumbing", "61331", "service", False),
            ("building_electrics", "61331", "service", False),
            ("painting", "61331", "service", False),
            ("small_repairs", "61331", "service", False),
            ("site_cleaning", "61331", "service", False),
            ("premises_other", "6131", "service", False),
        ),
    ),
    (
        "transport",
        (
            ("goods_transport", "61425", "service", False),
            ("deliveries", "61426", "service", False),
            ("vehicle_fuel", "6122", "good", False),
            ("vehicle_upkeep", "61332", "service", False),
            ("vehicle_insurance", "61345", "none", False),
            ("transport_other", "6142", "service", False),
        ),
    ),
    (
        "administration",
        (
            ("fire_insurance", "61341", "none", False),
            ("liability_insurance", "61343", "none", False),
            ("accountant", "61365", "service", False),
            ("lawyer", "61367", "service", False),
            ("bank_fees", "61473", "service", False),
            ("phone", "61455", "service", False),
            ("internet", "61455", "service", False),
            ("taxes_and_fees", "6167", "none", False),
            ("administration_other", "6136", "service", False),
        ),
    ),
    (
        "compliance",
        (
            ("lab_analyses", "61263", "service", False),
            ("onssa", "61678", "none", False),
            ("weighbridge_check", "61263", "service", False),
            ("extinguishers", "61332", "service", False),
            ("civil_protection", "61678", "none", False),
            ("pest_control", "61263", "service", False),
            ("ppe", "61764", "good", False),
            ("periodic_checks", "61263", "service", False),
            ("compliance_other", "6126", "service", False),
        ),
    ),
    (
        "commercial",
        (
            ("advertising", "61441", "service", False),
            ("social_media", "61441", "service", False),
            ("website", "61263", "service", False),
            ("amana_app", "61263", "service", False),
            ("server_cloud", "61263", "service", False),
            ("printing", "61442", "service", False),
            ("trade_fairs", "61443", "service", False),
            ("commercial_spending", "6143", "service", True),
            ("commercial_other", "6144", "service", False),
        ),
    ),
    (
        "miscellaneous",
        (
            ("miscellaneous_other", None, "none", False),
        ),
    ),
    (
        "stock_purchase",
        (
            ("olives", "61211", "good", False),
            ("oil", "6111", "good", False),
            ("bottles", "61231", "good", False),
            ("jerrycans", "61231", "good", False),
            ("caps", "61231", "good", False),
            ("cartons", "61231", "good", False),
            ("pallets", "61232", "good", False),
            ("stock_purchase_other", "612", "good", False),
        ),
    ),
    (
        "investment",
        (
            ("machines", "23321", "fixed_asset", False),
            ("tanks", "2331", "fixed_asset", False),
            ("vehicles", "2340", "fixed_asset", False),
            ("building", "23211", "fixed_asset", False),
            ("heavy_equipment", "23321", "fixed_asset", False),
            ("investment_other", "23", "fixed_asset", False),
        ),
    ),
)
