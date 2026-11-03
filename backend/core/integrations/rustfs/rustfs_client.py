from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from typing import BinaryIO
from urllib.parse import quote

import boto3
from boto3.exceptions import Boto3Error
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from core.config import get_settings
from core.exceptions import StorageError


@dataclass(frozen=True)
class RustFSConfig:
    """
    Connection settings of RustFS: the internal endpoint the API talks to, and the public one browsers reach.
    """

    internal_endpoint_url: str
    public_endpoint_url: str
    access_key: str
    secret_key: str
    region: str
    private_bucket: str
    public_bucket: str
    signed_url_expiry_in_seconds: int


class RustFSClient:
    def __init__(self, config: RustFSConfig) -> None:
        """
        Build one S3 client per endpoint: the internal one moves bytes, the public one signs URLs browsers can open.

        Args:
            config (RustFSConfig): RustFS connection settings.
        """
        self.config = config
        self.internal_s3 = build_s3_client(config, config.internal_endpoint_url)
        self.public_s3 = build_s3_client(config, config.public_endpoint_url)

    def upload_object(self, key: str, content: BinaryIO, content_type: str, is_private: bool) -> None:
        """
        Store an object, replacing any object already stored under the same key.

        Args:
            key (str): Object key, the File's storage_key.
            content (BinaryIO): Readable stream of the object's bytes.
            content_type (str): MIME type served back with the object.
            is_private (bool): True for the private bucket, False for the public one.

        Raises:
            StorageError: If RustFS rejects or fails the upload.
        """
        with translate_storage_errors():
            self.internal_s3.upload_fileobj(
                content,
                self._get_bucket(is_private),
                key,
                ExtraArgs={"ContentType": content_type},
            )

    def delete_object(self, key: str, is_private: bool) -> None:
        """
        Remove an object; removing one that does not exist succeeds.

        Args:
            key (str): Object key, the File's storage_key.
            is_private (bool): True for the private bucket, False for the public one.

        Raises:
            StorageError: If RustFS rejects or fails the deletion.
        """
        with translate_storage_errors():
            self.internal_s3.delete_object(Bucket=self._get_bucket(is_private), Key=key)

    def build_signed_url(self, key: str) -> str:
        """
        Build a time-limited URL a browser can use to read a private object.

        Args:
            key (str): Object key in the private bucket.

        Returns:
            str: Signed URL on the public endpoint, valid for signed_url_expiry_in_seconds.

        Raises:
            StorageError: If the URL cannot be signed.
        """
        with translate_storage_errors():
            return self.public_s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.config.private_bucket, "Key": key},
                ExpiresIn=self.config.signed_url_expiry_in_seconds,
            )

    def build_public_url(self, key: str) -> str:
        """
        Build the permanent URL of a public object.

        Args:
            key (str): Object key in the public bucket.

        Returns:
            str: Path-style URL on the public endpoint.
        """
        return f"{self.config.public_endpoint_url}/{self.config.public_bucket}/{quote(key)}"

    def _get_bucket(self, is_private: bool) -> str:
        """
        Pick the bucket matching a File's visibility.

        Args:
            is_private (bool): The File's is_private flag.

        Returns:
            str: Private or public bucket name.
        """
        return self.config.private_bucket if is_private else self.config.public_bucket


def build_s3_client(config: RustFSConfig, endpoint_url: str) -> BaseClient:
    """
    Build a boto3 S3 client using path-style addressing, which RustFS requires.

    Args:
        config (RustFSConfig): RustFS credentials and region.
        endpoint_url (str): Endpoint the client talks to or signs for.

    Returns:
        BaseClient: boto3 S3 client.
    """
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=config.access_key,
        aws_secret_access_key=config.secret_key,
        region_name=config.region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


@contextmanager
def translate_storage_errors() -> Iterator[None]:
    """
    Turn boto3 and botocore failures into the domain StorageError.

    Raises:
        StorageError: Wrapping the original library error.
    """
    try:
        yield
    except (Boto3Error, BotoCoreError, ClientError) as error:
        raise StorageError(str(error)) from error


@lru_cache
def get_rustfs_client() -> RustFSClient:
    """
    Build the RustFS client once from the settings.

    Returns:
        RustFSClient: Shared client.
    """
    settings = get_settings()
    return RustFSClient(
        RustFSConfig(
            internal_endpoint_url=settings.RUSTFS_INTERNAL_ENDPOINT_URL,
            public_endpoint_url=settings.RUSTFS_PUBLIC_ENDPOINT_URL,
            access_key=settings.RUSTFS_ACCESS_KEY,
            secret_key=settings.RUSTFS_SECRET_KEY,
            region=settings.RUSTFS_REGION,
            private_bucket=settings.RUSTFS_PRIVATE_BUCKET,
            public_bucket=settings.RUSTFS_PUBLIC_BUCKET,
            signed_url_expiry_in_seconds=settings.RUSTFS_SIGNED_URL_EXPIRY_IN_SECONDS,
        )
    )
