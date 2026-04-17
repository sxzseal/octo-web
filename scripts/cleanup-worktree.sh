#!/usr/bin/env bash
set -euo pipefail

# cleanup:worktree — 清理已合并的 worktree
#
# 用法：
#   pnpm cleanup:worktree feat/sosoclaw/add-login
#   pnpm cleanup:worktree feat/sosoclaw/add-login --keep-remote
#   pnpm cleanup:worktree feat/sosoclaw/add-login --yes

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 读配置（安全传参）──
read_json() {
  local file="$1" key="$2" default="$3"
  if [ -f "$file" ]; then
    local val
    val=$(python3 -c "
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    for k in sys.argv[2].split('.'):
        d = d[k]
    print(d)
except:
    print(sys.argv[3])
" "$file" "$key" "$default" 2>/dev/null)
    echo "${val:-$default}"
  else
    echo "$default"
  fi
}

LOCAL_CONFIG="$REPO_ROOT/AGENTS.config.local.json"
WORKTREE_PARENT=$(read_json "$LOCAL_CONFIG" "worktree.parent" "$(dirname "$REPO_ROOT")")
REMOTE=$(read_json "$LOCAL_CONFIG" "remote" "origin")

# ── 解析参数 ──
YES=false
KEEP_REMOTE=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=true ;;
    --keep-remote) KEEP_REMOTE=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

if [ ${#POSITIONAL[@]} -lt 1 ]; then
  echo "❌ 用法: pnpm cleanup:worktree <branch-name> [--keep-remote] [--yes]"
  echo ""
  echo "  清理 worktree + 本地分支 + 远端分支"
  echo "  --keep-remote  不删远端分支"
  echo "  --yes          跳过交互确认"
  echo "  Worktree 路径: $WORKTREE_PARENT/<branch-name>/"
  exit 1
fi

BRANCH="${POSITIONAL[0]}"
WORKTREE_DIR="$WORKTREE_PARENT/$BRANCH"

echo ""
echo "🧹 清理 Worktree"
echo "   分支: $BRANCH"
echo "   路径: $WORKTREE_DIR"
echo ""

cd "$REPO_ROOT"

# 删除 worktree
if [ -d "$WORKTREE_DIR" ]; then
  echo "🗂  移除 worktree..."
  git worktree remove "$WORKTREE_DIR" --force
else
  echo "⚠️  Worktree 目录不存在，跳过"
  git worktree prune 2>/dev/null || true
fi

# 删除本地分支
if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
  echo "🌿 删除本地分支..."
  git branch -d "$BRANCH" 2>/dev/null || {
    echo "⚠️  分支未完全合并，使用 -D 强制删除"
    if [ "$YES" = true ]; then
      git branch -D "$BRANCH"
    else
      read -rp "确认强制删除 '$BRANCH'？[y/N] " confirm
      if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        git branch -D "$BRANCH"
      else
        echo "跳过本地分支删除"
      fi
    fi
  }
else
  echo "⚠️  本地分支不存在，跳过"
fi

# 删除远端分支
if [ "$KEEP_REMOTE" = false ]; then
  if git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" &>/dev/null; then
    echo "🌐 删除远端分支 $REMOTE/$BRANCH..."
    if [ "$YES" = true ]; then
      git push "$REMOTE" --delete "$BRANCH"
    else
      read -rp "确认删除远端分支？[y/N] " confirm
      if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        git push "$REMOTE" --delete "$BRANCH"
      else
        echo "跳过远端分支删除"
      fi
    fi
  else
    echo "ℹ️  远端分支不存在，跳过"
  fi
else
  echo "ℹ️  --keep-remote: 跳过远端分支删除"
fi

echo ""
echo "✅ 清理完成！"
echo ""
