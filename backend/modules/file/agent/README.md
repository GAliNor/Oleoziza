# File

## Business
A stored file (Season banner, [Payment Proof](../../../../GLOSSARY.md), [Expense Document](../../../../GLOSSARY.md), Lot photo): its bucket, key, type and size. The bytes live in RustFS behind the backend; the front never stores images itself.

## Exposes
- Endpoints: none: each module stores and signs its own files.
- Business: `store_private_file` (checks, shrinks and stores a data URL), `shrink_image` (upright, 1600 px JPEG, HEIC read through pillow-heif). Model: File.

## Refusal codes
`document_invalid` (422): unreadable bytes, an unknown type, or too large to open.

## Rules and gotchas
- Private files (Payment Proofs, Expense Documents) sit in `oleoziza-private` and are served through signed URLs; public ones (Season banners) in `oleoziza-public`.
- Uploads go through `core/integrations/rustfs/rustfs_client.py`, never boto3 directly.
