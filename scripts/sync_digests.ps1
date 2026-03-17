param(
  [string]$Bucket = $env:DIGEST_S3_BUCKET,
  [string]$Prefix = "digests"
)

if (-not $Bucket) {
  Write-Error "DIGEST_S3_BUCKET env var not set."
  exit 1
}

$source = Join-Path $PSScriptRoot "..\\public\\Current_news"
if (-not (Test-Path $source)) {
  Write-Error "Source folder not found: $source"
  exit 1
}

aws s3 sync $source "s3://$Bucket/$Prefix" --exclude "*" --include "*.json"
