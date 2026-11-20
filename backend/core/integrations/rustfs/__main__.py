from core.integrations.rustfs.rustfs_client import get_rustfs_client


if __name__ == "__main__":
    get_rustfs_client().ensure_buckets()
    print("rustfs: private and public buckets ready")
