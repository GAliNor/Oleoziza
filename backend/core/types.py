from uuid import UUID

from pydantic import BaseModel


class CurrentUser(BaseModel):
    """
    The signed-in User as carried by a verified access token, without a database lookup.
    """

    id: UUID
    role: str
    is_owner: bool
    permissions_by_site: dict[str, list[str]]

    def has_permission(self, site_id: UUID, permission: str) -> bool:
        """
        Tell whether the User holds a Permission on a Site; the Owner holds every Permission everywhere.

        Args:
            site_id (UUID): Site the action happens on.
            permission (str): Permission key, such as payment.confirm.

        Returns:
            bool: True when the action is allowed.
        """
        return self.is_owner or permission in self.permissions_by_site.get(str(site_id), [])
