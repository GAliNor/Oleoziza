from fastapi.testclient import TestClient

from main import app


def test_an_unparsable_request_answers_a_code_and_its_fields() -> None:
    """
    A body FastAPI cannot parse answers like a refusal, with the code the front translates and the fields at fault.
    """
    response = TestClient(app).post("/api/auth/login-options", json={})

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_request", "fields": ["identifier"]}
