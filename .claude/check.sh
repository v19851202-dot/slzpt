#!/usr/bin/env bash
# slzpt 品質閘門：靜態頁檢查（含 CSP、連結、快取雜湊、線上預約開關）。
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/check-static.py
