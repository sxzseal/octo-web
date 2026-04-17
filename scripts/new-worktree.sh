#!/usr/bin/env bash
set -euo pipefail

# new:worktree — 按规范建 worktree
#
# 用法：
#   pnpm new:worktree feat/sosoclaw/add-login
#   pnpm new:worktree feat/sosoclaw/add-login origin/main  # 覆盖 base
#   pnpm new:worktree feat/sosoclaw/add-login -- --yes      # 跳过确认

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 读配置（安全传参，不拼字符串）──
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

CONFIG="$REPO_ROOT/AGENTS.config.json"
LOCAL_CONFIG="$REPO_ROOT/AGENTS.config.local.json"

DEFAULT_BASE=$(read_json "$CONFIG" "branch.defaultBase" "origin/develop")
WORKTREE_PARENT=$(read_json "$LOCAL_CONFIG" "worktree.parent" "$(dirname "$REPO_ROOT")")
REMOTE=$(read_json "$LOCAL_CONFIG" "remote" "origin")

# 读 symlinks 数组
SYMLINKS=()
if [ -f "$LOCAL_CONFIG" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && SYMLINKS+=("$line")
  done < <(python3 -c "
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    for s in d.get('worktree', {}).get('symlinks', []):
        print(s)
except:
    pass
" "$LOCAL_CONFIG" 2>/dev/null)
fi

# ── 解析参数 ──
YES=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

if [ ${#POSITIONAL[@]} -lt 1 ]; then
  echo "❌ 用法: pnpm new:worktree <branch-name> [base-branch] [--yes]"
  echo ""
  echo "  branch-name   分支名，例如 feat/sosoclaw/add-login"
  echo "  base-branch   基础分支（默认: $DEFAULT_BASE）"
  echo "  --yes         跳过交互确认"
  echo ""
  echo "  Worktree 路径: $WORKTREE_PARENT/<branch-name>/"
  exit 1
fi

BRANCH="${POSITIONAL[0]}"
BASE="${POSITIONAL[1]:-$DEFAULT_BASE}"
WORKTREE_DIR="$WORKTREE_PARENT/$BRANCH"

# 分支类型校验
PREFIX="${BRANCH%%/*}"
VALID=$(python3 -c "
import json, sys
try:
    types = json.load(open(sys.argv[1])).get('branch', {}).get('types', [])
    print('yes' if sys.argv[2] in types else 'no')
except:
    print('yes')
" "$CONFIG" "$PREFIX" 2>/dev/null || echo "yes")

if [ "$VALID" = "no" ]; then
  echo "⚠️  分支前缀 '$PREFIX' 不在允许列表中"
  echo "   允许的类型: $(read_json "$CONFIG" "branch.types" "")"
  echo ""
  if [ "$YES" = false ]; then
    read -rp "继续使用 '$BRANCH' 吗？[y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "已取消"
      exit 0
    fi
  fi
fi

# 检查 worktree 是否已存在
if [ -d "$WORKTREE_DIR" ]; then
  echo "❌ Worktree 已存在: $WORKTREE_DIR"
  exit 1
fi

echo ""
echo "🌳 创建 Worktree"
echo "   分支: $BRANCH"
echo "   基于: $BASE"
echo "   路径: $WORKTREE_DIR"
echo ""

# Fetch
cd "$REPO_ROOT"
echo "📥 git fetch --all..."
git fetch --all --quiet

# 创建 worktree
echo "🔧 git worktree add..."
git worktree add "$WORKTREE_DIR" -b "$BRANCH" "$BASE"

# 处理 symlinks
for symlink in "${SYMLINKS[@]}"; do
  SRC="$REPO_ROOT/$symlink"
  DST="$WORKTREE_DIR/$symlink"
  if [ -f "$SRC" ]; then
    mkdir -p "$(dirname "$DST")"
    ln -sf "$SRC" "$DST"
    echo "🔗 已链接: $symlink"
  else
    echo "⚠️  源文件不存在，跳过链接: $symlink"
  fi
done

# pnpm install
echo "📦 pnpm install..."
cd "$WORKTREE_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo ""
echo "✅ Worktree 就绪！"
echo ""
echo "   cd $WORKTREE_DIR"
echo "   pnpm dev"
echo ""
