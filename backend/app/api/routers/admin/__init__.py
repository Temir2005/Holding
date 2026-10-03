"""Admin API (stage 8).

Will hold CRUD routers for every entity behind a `require_admin` JWT dependency,
following the same router → service → repository layering as the public API,
plus `POST /admin/media/upload-url` for presigned uploads. See docs/architecture.md.
"""
