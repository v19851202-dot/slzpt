#!/usr/bin/env bash
# PreToolUse：擋推 main、強制推送、部署、Cloudflare 專案與密鑰、遠端 D1、讀密鑰檔。
input="$(cat)"
cmd="$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"
deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}
has() { printf '%s' "$cmd" | grep -Eq -- "$1"; }
if has 'git[[:space:]]+push'; then
  has '(^|[[:space:]:+/])main([[:space:]]|$)' && deny "不准推 main；推送由人來做。"
  has '[[:space:]](-f|--force|--force-with-lease|--force-if-includes|--mirror)([[:space:]=]|$)|[[:space:]]-[a-zA-Z]*f|[[:space:]]\+' && deny "不准強制推送。"
fi
has 'wrangler.*[[:space:]]deploy|pages[[:space:]]+deploy' && deny "不准部署。"
has 'pages[[:space:]]+project' && deny "不准建立或修改 Cloudflare Pages 專案。"
has 'wrangler.*[[:space:]]secret' && deny "不准寫入或讀取密鑰。"
has 'wrangler.*[[:space:]]d1[[:space:]].*--remote' && deny "不准動遠端 D1。"
has '(^|[[:space:]/"'\''=<])\.env([.[:space:]"'\'']|$)|\.dev\.vars|\.pem([[:space:]"'\'']|$)|\.key([[:space:]"'\'']|$)' && deny "不准讀或建立 .env、.dev.vars 與金鑰檔。"
exit 0
