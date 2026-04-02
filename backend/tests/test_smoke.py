from httpx import AsyncClient
from app.models.user import User


async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200


async def test_auth_headers_required(client: AsyncClient):
    response = await client.get("/api/v1/transactions")
    assert response.status_code == 401


async def test_authenticated_request(client: AsyncClient, auth_headers: dict, test_user: User):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
