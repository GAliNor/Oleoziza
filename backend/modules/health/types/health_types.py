from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    is_database_reachable: bool
