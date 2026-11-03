import io
from collections.abc import Iterator
from urllib.parse import parse_qs, urlparse

import boto3
import pytest
from moto import mock_aws

from core.exceptions import StorageError
from core.integrations.rustfs.rustfs_client import RustFSClient, RustFSConfig


INTERNAL_ENDPOINT_URL = "http://oleoziza-rustfs:9000"
PUBLIC_ENDPOINT_URL = "http://localhost:32590"
PRIVATE_BUCKET = "oleoziza-private"
PUBLIC_BUCKET = "oleoziza-public"


@pytest.fixture
def config() -> RustFSConfig:
    """
    Build a RustFS config whose internal and public endpoints differ, as in docker.

    Returns:
        RustFSConfig: Test configuration.
    """
    return RustFSConfig(
        internal_endpoint_url=INTERNAL_ENDPOINT_URL,
        public_endpoint_url=PUBLIC_ENDPOINT_URL,
        access_key="test-access-key",
        secret_key="test-secret-key",
        region="us-east-1",
        private_bucket=PRIVATE_BUCKET,
        public_bucket=PUBLIC_BUCKET,
        signed_url_expiry_in_seconds=900,
    )


@pytest.fixture
def s3_server(monkeypatch: pytest.MonkeyPatch, config: RustFSConfig) -> Iterator[object]:
    """
    Start an in-memory S3 answering on the internal endpoint, with both buckets created.

    Args:
        monkeypatch (pytest.MonkeyPatch): Sets the moto custom endpoint.
        config (RustFSConfig): Test configuration.

    Returns:
        Iterator[object]: A boto3 client reading the in-memory S3 directly.
    """
    monkeypatch.setenv("MOTO_S3_CUSTOM_ENDPOINTS", INTERNAL_ENDPOINT_URL)
    with mock_aws():
        s3 = boto3.client(
            "s3",
            endpoint_url=INTERNAL_ENDPOINT_URL,
            aws_access_key_id=config.access_key,
            aws_secret_access_key=config.secret_key,
            region_name=config.region,
        )
        s3.create_bucket(Bucket=PRIVATE_BUCKET)
        s3.create_bucket(Bucket=PUBLIC_BUCKET)
        yield s3


@pytest.fixture
def client(config: RustFSConfig, s3_server: object) -> RustFSClient:
    """
    Build the RustFS client under test against the in-memory S3.

    Args:
        config (RustFSConfig): Test configuration.
        s3_server (object): Ensures the in-memory S3 is running.

    Returns:
        RustFSClient: Client under test.
    """
    return RustFSClient(config)


def read_object(s3: object, bucket: str, key: str) -> tuple[bytes, str]:
    """
    Read an object's bytes and content type straight from S3.

    Args:
        s3 (object): boto3 S3 client.
        bucket (str): Bucket name.
        key (str): Object key.

    Returns:
        tuple[bytes, str]: Body and content type.
    """
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read(), response["ContentType"]


def list_keys(s3: object, bucket: str) -> list[str]:
    """
    List every object key in a bucket.

    Args:
        s3 (object): boto3 S3 client.
        bucket (str): Bucket name.

    Returns:
        list[str]: Keys present in the bucket.
    """
    return [item["Key"] for item in s3.list_objects_v2(Bucket=bucket).get("Contents", [])]


def test_private_upload_lands_in_private_bucket_only(client: RustFSClient, s3_server: object) -> None:
    client.upload_object("passports/1.pdf", io.BytesIO(b"passport"), "application/pdf", is_private=True)

    assert read_object(s3_server, PRIVATE_BUCKET, "passports/1.pdf") == (b"passport", "application/pdf")
    assert list_keys(s3_server, PUBLIC_BUCKET) == []


def test_public_upload_lands_in_public_bucket_only(client: RustFSClient, s3_server: object) -> None:
    client.upload_object("library/fes.png", io.BytesIO(b"image"), "image/png", is_private=False)

    assert read_object(s3_server, PUBLIC_BUCKET, "library/fes.png") == (b"image", "image/png")
    assert list_keys(s3_server, PRIVATE_BUCKET) == []


def test_uploading_twice_keeps_the_latest_content(client: RustFSClient, s3_server: object) -> None:
    client.upload_object("proofs/7.jpg", io.BytesIO(b"first"), "image/jpeg", is_private=True)
    client.upload_object("proofs/7.jpg", io.BytesIO(b"second"), "image/jpeg", is_private=True)

    assert read_object(s3_server, PRIVATE_BUCKET, "proofs/7.jpg") == (b"second", "image/jpeg")


def test_delete_removes_the_object(client: RustFSClient, s3_server: object) -> None:
    client.upload_object("passports/2.pdf", io.BytesIO(b"passport"), "application/pdf", is_private=True)

    client.delete_object("passports/2.pdf", is_private=True)

    assert list_keys(s3_server, PRIVATE_BUCKET) == []


def test_deleting_a_missing_object_succeeds(client: RustFSClient) -> None:
    client.delete_object("never/uploaded.pdf", is_private=False)


def test_signed_url_points_at_public_host_and_expires(client: RustFSClient) -> None:
    signed_url = urlparse(client.build_signed_url("passports/1.pdf"))
    query = parse_qs(signed_url.query)

    assert f"{signed_url.scheme}://{signed_url.netloc}" == PUBLIC_ENDPOINT_URL
    assert signed_url.path == f"/{PRIVATE_BUCKET}/passports/1.pdf"
    assert query["X-Amz-Expires"] == ["900"]
    assert "X-Amz-Signature" in query


def test_public_url_points_at_public_bucket(client: RustFSClient) -> None:
    assert client.build_public_url("library/fes.png") == f"{PUBLIC_ENDPOINT_URL}/{PUBLIC_BUCKET}/library/fes.png"


def test_upload_to_missing_bucket_raises_storage_error(config: RustFSConfig, s3_server: object) -> None:
    s3_server.delete_bucket(Bucket=PUBLIC_BUCKET)
    client = RustFSClient(config)

    with pytest.raises(StorageError):
        client.upload_object("library/fes.png", io.BytesIO(b"image"), "image/png", is_private=False)
