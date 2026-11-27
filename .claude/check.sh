#!/usr/bin/env bash
# slzpt 品質閘門：靜態頁檢查（含 CSP、連結、快取雜湊、線上預約開關、首頁像素小人）。
# 失敗 exit 2，讓 Claude Code hook 把錯誤回給代理。
cd "$(dirname "$0")/.." || exit 2
if ! out="$(python3 scripts/check-static.py 2>&1)"; then
  printf '%s\n' "$out" >&2
  echo "check-static.py 未通過，請修正後再結束。" >&2
  exit 2
fi
printf '%s\n' "$out"
exit 0
