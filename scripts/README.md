# scripts/

开发工具脚本，配合 `AGENTS.config.json` 使用。

## 命令

| 命令 | 说明 |
|---|---|
| `pnpm gen:component <Name>` | 生成 ui/ + bridge/ 脚手架 |
| `pnpm lint:architecture` | 检查架构硬性规则 |
| `pnpm new:worktree <branch> [base] [--yes]` | 建 worktree |
| `pnpm cleanup:worktree <branch> [--keep-remote] [--yes]` | 清理 worktree |

## pre-commit hook

项目使用 `.git/hooks/pre-commit` 在提交时自动运行 `lint:architecture --staged`。

由于 `.git/hooks/` 不被 Git 跟踪，新 clone 或新 worktree 需要手动安装：

```bash
cp scripts/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

或直接创建（内容见 `scripts/pre-commit.sample`）。
