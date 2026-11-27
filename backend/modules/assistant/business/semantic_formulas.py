LOCAL_TODAY_SQL = "(now() AT TIME ZONE 'Africa/Casablanca')::date"


def build_local_day_sql(column: str) -> str:
    """
    Turn a timestamp column into its calendar day in Morocco, as every page counts days.

    Args:
        column (str): Trusted SQL column of a timestamp with time zone.

    Returns:
        str: SQL date expression.
    """
    return f"({column} AT TIME ZONE 'Africa/Casablanca')::date"


def build_client_name_sql(alias: str) -> str:
    """
    Name a Client as the app shows it: a Company's legal name, else the Individual's first and last names.

    Args:
        alias (str): Trusted alias of the clients table.

    Returns:
        str: SQL text expression.
    """
    return f"COALESCE(NULLIF({alias}.legal_name, ''), TRIM(CONCAT_WS(' ', {alias}.first_name, {alias}.last_name)))"


def build_fee_sql(alias: str) -> str:
    """
    A Lot's Milling Fee as `get_fees` computes it: net weight × rate minus an applied or approved Discount (a pending one counts at full price), never below zero; 0 for a Purchase.

    Args:
        alias (str): Trusted alias of the lots table.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    discount = f"COALESCE((SELECT SUM(d.amount) FROM discounts d WHERE d.lot_id = {alias}.id AND d.state::text IN ('applied', 'approved')), 0)"
    return f"(CASE WHEN {alias}.mode::text = 'service_milling' THEN GREATEST({alias}.net_weight_in_kg * COALESCE({alias}.milling_rate_per_kg, 0) - {discount}, 0) ELSE 0 END)"


def build_allocated_sql(alias: str, status: str) -> str:
    """
    What Payments of one status allocate to a Lot.

    Args:
        alias (str): Trusted alias of the lots table.
        status (str): confirmed or pending.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    return f"COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments p ON p.id = a.payment_id WHERE a.lot_id = {alias}.id AND p.status::text = '{status}'), 0)"


def build_credits_sql(alias: str) -> str:
    """
    The Credit Note Uses taken off a Lot's fee.

    Args:
        alias (str): Trusted alias of the lots table.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    return f"COALESCE((SELECT SUM(u.amount) FROM credit_note_uses u WHERE u.lot_id = {alias}.id), 0)"


def build_pending_sql(alias: str) -> str:
    """
    A Lot's share of « À confirmer » as `get_sales` clamps it: pending Allocations, never more than what confirmed money and credits leave due (D13).

    Args:
        alias (str): Trusted alias of the lots table.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    return f"LEAST({build_allocated_sql(alias, 'pending')}, GREATEST({build_fee_sql(alias)} - {build_allocated_sql(alias, 'confirmed')} - {build_credits_sql(alias)}, 0))"


def build_outstanding_sql(alias: str) -> str:
    """
    A Lot's Outstanding: its fee minus confirmed and pending Allocations and Credit Note Uses, never below zero.

    Args:
        alias (str): Trusted alias of the lots table.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    return f"GREATEST({build_fee_sql(alias)} - {build_allocated_sql(alias, 'confirmed')} - {build_allocated_sql(alias, 'pending')} - {build_credits_sql(alias)}, 0)"


def build_collected_sql(alias: str) -> str:
    """
    A Lot's Collected: its fee minus its pending share and its Outstanding, so Revenue = Collected + pending + Outstanding (D2, D14).

    Args:
        alias (str): Trusted alias of the lots table.

    Returns:
        str: SQL numeric expression for one Lot.
    """
    return f"({build_fee_sql(alias)} - {build_pending_sql(alias)} - {build_outstanding_sql(alias)})"


def build_storage_remaining_sql(alias: str) -> str:
    """
    The litres still in a Storage: what was poured minus every draw not reversed.

    Args:
        alias (str): Trusted alias of the storages table.

    Returns:
        str: SQL numeric expression for one Storage.
    """
    return f"({alias}.oil_in_litres - COALESCE((SELECT SUM(dr.oil_in_litres) FROM storage_draws dr WHERE dr.storage_id = {alias}.id AND NOT dr.is_reversed), 0))"
