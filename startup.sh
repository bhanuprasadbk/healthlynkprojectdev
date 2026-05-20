#!/usr/bin/env bash
# Azure App Service runs the "Startup Command" from /home/site/wwwroot (often the repo root).
# If your artifact is the whole monorepo, this script forwards to backend/startup.sh.
# If you publish only the backend folder as wwwroot, use backend/startup.sh there and
# Startup Command: bash startup.sh (no repo-root file in that layout).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [[ -f "$ROOT/backend/startup.sh" ]]; then
  exec bash "$ROOT/backend/startup.sh"
fi
echo "startup.sh: no backend/startup.sh under $ROOT. Deploy the backend folder or set Startup Command to: bash backend/startup.sh" >&2
exit 1
