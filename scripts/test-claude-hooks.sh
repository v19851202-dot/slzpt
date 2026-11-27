#!/usr/bin/env bash
# 把一組指令餵給 .claude/hooks/block-dangerous.sh，確認該擋的擋、該放的放。失敗 exit 1。
cd "$(dirname "$0")/.." || exit 1
hook=.claude/hooks/block-dangerous.sh
pass=0; fail=0
run() {
  local expect="$1" cmd="$2" out got
  out="$(python3 -c 'import json,sys;print(json.dumps({"tool_input":{"command":sys.argv[1]}}))' "$cmd" | CLAUDE_PROJECT_DIR="$PWD" bash "$hook")"
  case "$out" in *'"deny"'*) got=deny ;; *) got=allow ;; esac
  if [ "$got" = "$expect" ]; then pass=$((pass+1)); echo "PASS $expect: $cmd"; else fail=$((fail+1)); echo "FAIL want $expect got $got: $cmd"; fi
}
run deny  'git push origin main'
run deny  'git push origin HEAD:main'
run deny  'git -C . push origin main'
run deny  'cd repo && git push -u origin main'
run deny  'git push -f origin feat/x'
run deny  'git push --force origin feat/x'
run deny  'git push --force-with-lease origin feat/x'
run deny  'git push origin +feat/x'
run deny  'npx wrangler pages deploy .'
run deny  'wrangler deploy'
run deny  'npx wrangler pages project create slzpt'
run deny  'wrangler secret put X'
run deny  'npx wrangler d1 execute slzpt-comments --remote --command "select 1"'
run deny  'cat .env'
run deny  'cat .dev.vars'
run deny  'cat key.pem'
run allow 'git push -u origin feat/pixel-family'
run allow 'npx wrangler d1 execute slzpt-comments --local --command "select 1"'
run allow 'python3 scripts/check-static.py'
run allow 'git status'
echo "$pass/$((pass+fail))"
[ "$fail" -eq 0 ]
