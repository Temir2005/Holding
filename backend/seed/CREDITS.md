# Seed images

All seed images are generated procedurally by `seed/images.py` (gradients and simple
shapes in the site palette). No third-party photos are used, so there is nothing to credit.
Replace them with real photos through the admin once they are available.

For a local demo only, `make demo-photos` downloads free stock photos into `seed/photos/`
(ignored by git and docker), which the seeds then take instead; their authors and licenses
are listed in `seed/photos/CREDITS.md`.
