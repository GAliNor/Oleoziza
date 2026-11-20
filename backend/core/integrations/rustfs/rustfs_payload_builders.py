def build_public_read_policy(bucket: str) -> dict[str, object]:
    """
    Build the bucket policy letting anyone read, but not list or write, the objects of a bucket.

    Args:
        bucket (str): Bucket name.

    Returns:
        dict[str, object]: S3 bucket policy document.
    """
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }
        ],
    }
