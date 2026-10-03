#!/bin/sh
# Creates the media bucket and makes it publicly readable. Safe to run repeatedly.
set -e
mc alias set local http://minio:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY"
mc mb --ignore-existing "local/$S3_BUCKET"
mc anonymous set download "local/$S3_BUCKET"
echo "bucket $S3_BUCKET ready"
