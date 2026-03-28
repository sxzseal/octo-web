/** @type {import('stylelint').Config} */
// 本地开发：只对硬编码颜色发出 warning，不阻断工作流
export default {
  rules: {
    'color-no-hex': [true, { severity: 'warning' }],
    'color-named': ['never', { severity: 'warning' }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla'],
      { severity: 'warning' },
    ],
  },
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.storybook/**',
  ],
}
