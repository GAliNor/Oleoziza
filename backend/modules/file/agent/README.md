# File

## Business
A stored file (Season banner, [Payment Proof](../../../../GLOSSARY.md), [Expense Document](../../../../GLOSSARY.md), Lot photo): its bucket, key, type and size. The bytes live in RustFS behind the backend; the front never stores images itself.

## Exposes
- Endpoints: none yet (the upload and signed-URL routes come with the first plug that needs them: finance or expense).
- Model only: File.

## Refusal codes
None yet.

## Rules and gotchas
- Private files (Payment Proofs, Expense Documents) sit in `oleoziza-private` and are served through signed URLs; public ones (Season banners) in `oleoziza-public`.
- Uploads go through `core/integrations/rustfs/rustfs_client.py`, never boto3 directly.
