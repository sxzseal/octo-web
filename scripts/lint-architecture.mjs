#!/usr/bin/env node

/**
 * lint:architecture — 检查分层架构硬性规则
 *
 * 规则（从 AGENTS.config.json 读取）：
 *   1. ui/ 下禁止 import SDK（sdk_imports 配置）
 *   2. ui/ 下新组件必须有 .stories.tsx
 *   3. legacy_dirs 下不新增文件（只改不增）
 *
 * 用法：
 *   pnpm lint:architecture          # 检查所有
 *   pnpm lint:architecture --staged  # 只检查 git staged 文件（pre-commit 用）
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'
import { config, ROOT_DIR } from './config.mjs'

const stagedOnly = process.argv.includes('--staged')

// ── 从配置构建 SDK 匹配模式 ──
const SDK_PATTERNS = config.sdkImports.flatMap(pattern => [
  new RegExp(`from\\s+['"]${escapeRegex(pattern)}`),
  new RegExp(`from\\s+['"].*/${escapeRegex(pattern)}`),
  new RegExp(`require\\s*\\(\\s*['"]${escapeRegex(pattern)}`),
  new RegExp(`require\\s*\\(\\s*['"].*/${escapeRegex(pattern)}`),
])

let errors = []
let warnings = []

// ── 规则 1 & 2：扫描 ui/ 目录 ──

if (existsSync(config.uiDir)) {
  const components = readdirSync(config.uiDir).filter(f =>
    statSync(join(config.uiDir, f)).isDirectory()
  )

  for (const comp of components) {
    const compDir = join(config.uiDir, comp)
    const relDir = relative(ROOT_DIR, compDir)
    const files = getAllFiles(compDir)

    // 规则 1：检查 SDK import
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
      if (file.endsWith('.stories.tsx') || file.endsWith('.stories.ts')) continue

      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const matched = SDK_PATTERNS.some(p => p.test(lines[i]))
        if (matched) {
          errors.push(`🚫 SDK import 禁止: ${relative(ROOT_DIR, file)}:${i + 1}`)
          errors.push(`   ${lines[i].trim()}`)
        }
      }
    }

    // 规则 2：检查 Story 存在（只对含 .tsx 组件文件的目录生效）
    const hasTsx = files.some(f => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))
    const hasStory = files.some(f => f.endsWith('.stories.tsx') || f.endsWith('.stories.ts'))
    if (hasTsx && !hasStory) {
      errors.push(`📖 缺少 Story: ${relDir}/ 下没有 .stories.tsx`)
    }
  }
}

// ── 规则 3：legacy 目录不新增文件 ──

const legacyRelPaths = config.legacyDirs.map(d => {
  // 如果是绝对路径就转相对，否则直接用
  return d.startsWith('/') ? relative(ROOT_DIR, d) : d.replace(/\/$/, '')
})

if (stagedOnly) {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=A', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim()

    if (staged) {
      for (const file of staged.split('\n')) {
        if (legacyRelPaths.some(legacy => file.startsWith(legacy + '/'))) {
          errors.push(`🚫 旧目录禁止新增: ${file}`)
          errors.push(`   新组件请放到 ui/ 目录下，用 pnpm gen:component`)
        }
      }
    }
  } catch {
    warnings.push('⚠️  无法执行 git diff，跳过旧目录新增检查')
  }
} else {
  try {
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim()

    if (untracked) {
      for (const file of untracked.split('\n')) {
        if (legacyRelPaths.some(legacy => file.startsWith(legacy + '/'))) {
          warnings.push(`⚠️  旧目录有未跟踪新文件: ${file}`)
          warnings.push(`   新组件请放到 ui/ 目录下`)
        }
      }
    }
  } catch {
    // git 不可用
  }
}

// ── 输出结果 ──

console.log('\n🏗  Architecture Lint\n')

if (warnings.length > 0) {
  console.log('⚠️  Warnings:')
  for (const w of warnings) console.log(`  ${w}`)
  console.log('')
}

if (errors.length > 0) {
  console.log('❌ Errors:')
  for (const e of errors) console.log(`  ${e}`)
  console.log(`\n共 ${errors.length} 个错误\n`)
  process.exit(1)
} else {
  let uiCount = 0
  if (existsSync(config.uiDir)) {
    uiCount = readdirSync(config.uiDir).filter(f =>
      statSync(join(config.uiDir, f)).isDirectory()
    ).length
  }
  console.log(`✅ 通过！扫描了 ${uiCount} 个 ui/ 组件，无违规。\n`)
}

// ── Helpers ──

function getAllFiles(dir) {
  const result = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...getAllFiles(full))
    } else {
      result.push(full)
    }
  }
  return result
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
