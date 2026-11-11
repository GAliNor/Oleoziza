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
